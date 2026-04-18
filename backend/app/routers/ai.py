import os, re, json, httpx
import anthropic
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta, timezone
from dotenv import load_dotenv
from ..database import get_supabase

load_dotenv()
router = APIRouter()

# QA 지식베이스 로드
_QA_DB: List[dict] = []
try:
    _qa_path = os.path.join(os.path.dirname(__file__), '..', 'lumina_health_500.json')
    with open(_qa_path, 'r', encoding='utf-8') as _f:
        _QA_DB = json.load(_f)
    print(f'[QA DB] {len(_QA_DB)}개 로드 완료')
except Exception as _e:
    print(f'[WARNING] QA DB 로드 실패: {_e}')

CAT_KEYWORDS = {
    '약물':        ['약','복용','먹','처방','부작용','약물'],
    '당뇨':        ['혈당','당뇨','인슐린'],
    '심혈관':      ['혈압','심장','맥박','콜레스테롤','흉통','가슴'],
    '관절/근골격': ['관절','무릎','허리','뼈','근육','통증'],
    '수면':        ['수면','잠','불면','피로','졸림'],
    '소화기':      ['소화','위','장','변비','설사','속쓰림'],
    '신경/기억력': ['기억','치매','두통','어지럼','어지럽'],
    '정신건강':    ['우울','불안','스트레스','기분','외로'],
    '생활습관':    ['운동','식단','체중','금연','음주','걷기'],
    '병원준비':    ['병원','검사','진료','의사','예약'],
}
EMERGENCY_WORDS  = ['흉통','가슴통증','호흡곤란','숨막','마비','의식','쓰러','졸도','심정지']
DOCTOR_KEYWORDS  = ['병원', '진료', '의사', '내원', '검사받']
DEFAULT_FOLLOWUP = [
    "이 증상이 생긴 정확한 시점을 의사에게 말씀드리세요.",
    "병원 방문 전 증상 기록을 적어두면 도움이 돼요.",
    "복용 중인 약이 있다면 이름과 용량을 미리 메모하세요.",
]
_RISK_PAT = re.compile(r'\[RISK:(LOW|MEDIUM|HIGH|CRITICAL)\]', re.IGNORECASE)
_RISK_MAP  = {'LOW': 'low', 'MEDIUM': 'medium', 'HIGH': 'high', 'CRITICAL': 'critical'}


def detect_risk(reply: str) -> str:
    m = _RISK_PAT.search(reply)
    return _RISK_MAP.get(m.group(1).upper(), 'normal') if m else 'normal'


def strip_risk_token(reply: str) -> str:
    return _RISK_PAT.sub('', reply).strip()


def find_relevant_qa(message: str, top_k: int = 2) -> List[dict]:
    if not _QA_DB:
        return []
    scored = []
    for item in _QA_DB:
        score = 0
        if item.get('emergency_flag') and any(w in message for w in EMERGENCY_WORDS):
            score += 100
        for tag in item.get('tags', []):
            if tag in message:
                score += 10
        cat = item.get('category_ko', '')
        for kw in CAT_KEYWORDS.get(cat, []):
            if kw in message:
                score += 5; break
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: -x[0])
    return [item for _, item in scored[:top_k]]


def get_suggested_questions(relevant_qa: List[dict]) -> List[str]:
    questions: List[str] = []
    for qa in relevant_qa:
        for q in qa.get('answer_template', {}).get('doctor_questions', []):
            if q not in questions:
                questions.append(q)
            if len(questions) >= 3:
                return questions
    while len(questions) < 3:
        questions.append(DEFAULT_FOLLOWUP[len(questions) % len(DEFAULT_FOLLOWUP)])
    return questions[:3]


def build_qa_context(relevant_qa: List[dict]) -> str:
    if not relevant_qa:
        return ""
    lines = ["\n=== 관련 의료 지식 (참고) ==="]
    for qa in relevant_qa:
        lines.append(f"\n[{qa.get('category_ko','')} | 위험도: {qa.get('risk_level','')}]")
        lines.append(f"유사 질문: {qa.get('question','')}")
        tmpl = qa.get('answer_template', {})
        if tmpl.get('what_to_do_now'):
            lines.append("권장 행동: " + " / ".join(tmpl['what_to_do_now'][:2]))
        if tmpl.get('danger_signs'):
            lines.append("위험 신호: " + " / ".join(tmpl['danger_signs'][:2]))
        if qa.get('doctor_visit_needed'):
            lines.append("-> 의사 방문 필요")
    return "\n".join(lines)


def load_health_context(user_id: str, db) -> dict:
    """health_profiles / medications / health_records 로드."""
    ctx: dict = {}
    try:
        r = db.table("health_profiles").select("*").eq("user_id", user_id).execute()
        if r.data:
            ctx['profile'] = r.data[0]
    except Exception as e:
        print(f"[health_profiles] {e}")
    try:
        r = db.table("medications").select("name,dosage,time_slot,method").eq("user_id", user_id).eq("active", True).execute()
        if r.data:
            ctx['medications'] = r.data
    except Exception as e:
        print(f"[medications] {e}")
    try:
        today = date.today().isoformat()
        r = db.table("health_records").select("*").eq("user_id", user_id).gte("recorded_at", f"{today}T00:00:00").order("recorded_at", desc=True).limit(1).execute()
        if r.data:
            ctx['today_record'] = r.data[0]
    except Exception as e:
        print(f"[health_records] {e}")
    return ctx


def load_chat_context(user_id: str, db) -> dict:
    """오늘 대화 전체 + 최근 7일 요약을 로드해 맥락 구성."""
    ctx: dict = {'today_messages': [], 'weekly_summaries': []}
    today_str = date.today().isoformat()
    # 오늘 대화 전체 (최대 40턴)
    try:
        r = db.table("ai_chat_logs").select("role,message,created_at").eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00").order("created_at", desc=False).limit(40).execute()
        ctx['today_messages'] = r.data or []
    except Exception as e:
        print(f"[chat_context/today] {e}")
    # 최근 7일 요약 (오늘 제외)
    try:
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        r = db.table("ai_chat_summaries").select("date,summary,has_risk").eq("user_id", user_id).gte("date", week_ago).lte("date", yesterday).order("date", desc=True).execute()
        ctx['weekly_summaries'] = r.data or []
    except Exception as e:
        print(f"[chat_context/summaries] {e}")
    return ctx


def build_system_prompt(user: dict, health_ctx: dict, relevant_qa: List[dict],
                        chat_ctx: Optional[dict] = None) -> str:
    p   = health_ctx.get('profile', {}) or {}
    meds_raw = health_ctx.get('medications', []) or []
    rec = health_ctx.get('today_record', {}) or {}

    name   = user.get('name') or p.get('name', '어르신')
    age    = user.get('age') or p.get('age', '')
    gender = user.get('gender') or p.get('gender', '')

    diseases_list = p.get('diseases') or p.get('chronic_diseases') or user.get('chronic_diseases') or []
    diseases      = ', '.join(diseases_list) if diseases_list else '없음'

    surg_list = p.get('surgeries', []) or []
    surgeries = ', '.join(
        [f"{s.get('name','')}({s.get('year','')})" for s in surg_list if s.get('name')]
    ) if surg_list else '없음'

    allergy_parts = []
    if p.get('drugAllergies'):  allergy_parts.append(', '.join(p['drugAllergies']))
    if p.get('foodAllergies'):  allergy_parts.append(', '.join(p['foodAllergies']))
    if p.get('allergyNote'):    allergy_parts.append(p['allergyNote'])
    allergies = ' / '.join(allergy_parts) or '없음'

    if meds_raw:
        meds_str = ', '.join([f"{m.get('name','')} {m.get('dosage','')}({m.get('time_slot','')})" for m in meds_raw])
    elif user.get('taking_medication') and user.get('medication_list'):
        meds_str = user['medication_list']
    else:
        meds_str = '없음'

    bp    = f"{rec.get('bp_sys','')}/{rec.get('bp_dia','')} mmHg" if rec.get('bp_sys') else '미측정'
    sugar = f"{rec.get('glucose','')} mg/dL" if rec.get('glucose') else '미측정'
    steps = f"{rec.get('steps','')} 보" if rec.get('steps') else '미측정'

    habits_parts = []
    for key, label in [('smoking','흡연'), ('drinking','음주'), ('exercise','운동'), ('meal','식사')]:
        val = p.get(key) or user.get(key)
        if val:
            habits_parts.append(f"{label}: {val}")
    habits = ', '.join(habits_parts) if habits_parts else '정보 없음'

    age_gender = f"{age}세 {gender}" if (age or gender) else ''

    prompt = (
        "당신은 Silver Life AI의 꿀비입니다.\n"
        "한국 시니어 전문 건강 상담 AI입니다.\n\n"
        "[환자 정보]\n"
        f"이름: {name}" + (f" ({age_gender})" if age_gender else "") + "\n"
        f"만성질환: {diseases}\n"
        f"수술 경력: {surgeries}\n"
        f"알레르기: {allergies}\n"
        f"현재 복용약: {meds_str}\n"
        f"오늘 혈압: {bp}\n"
        f"오늘 혈당: {sugar}\n"
        f"오늘 걸음수: {steps}\n"
        f"생활습관: {habits}\n\n"
        "[답변 원칙]\n"
        f"1. 반드시 환자 이름({name})으로 친근하게 부를 것\n"
        "2. 위 건강 정보를 반드시 참고하여 맞춤 답변\n"
        "3. 복용약과의 관계 항상 고려\n"
        "4. 알레르기 약물 절대 추천 금지\n"
        "5. 쉬운 한국어 사용 (의학 용어 최소화)\n"
        "6. 답변 구조:\n"
        "   - 공감 한 줄\n"
        "   - 맞춤 분석 (건강 정보 참고)\n"
        "   - 구체적 행동 조언 2~3가지\n"
        "   - 병원 방문 필요 시점 명시\n"
        "7. 응급 증상 시 [RISK:CRITICAL] 태그 필수\n"
        "8. 답변은 3~5문장으로 간결하게\n"
        "9. 모든 의료 답변 끝에: '이 내용은 참고용이며 정확한 진단은 의사 선생님께 확인하세요'\n\n"
        "[위험도 판단]\n"
        "[RISK:LOW]      - 경미하거나 만성적, 일상 지장 없음\n"
        "[RISK:MEDIUM]   - 지속 시 병원 필요, 당장 응급 아님\n"
        "[RISK:HIGH]     - 오늘 내 병원 방문 필요\n"
        "[RISK:CRITICAL] - 즉시 119 또는 응급실 (의식저하/마비/심한 흉통/호흡곤란)\n"
    )

    # 장기 대화 맥락 삽입
    if chat_ctx:
        weekly = chat_ctx.get('weekly_summaries', [])
        today_msgs = chat_ctx.get('today_messages', [])

        if weekly:
            prompt += "\n\n=== 최근 7일 대화 요약 ==="
            for s in reversed(weekly):  # 오래된 것부터
                risk_flag = " ⚠️위험" if s.get('has_risk') else ""
                prompt += f"\n[{s.get('date','')}]{risk_flag} {s.get('summary','')}"

        if today_msgs:
            prompt += "\n\n=== 오늘 이전 대화 기록 ==="
            for m in today_msgs:
                role_label = "이용자" if m.get('role') == 'user' else "꿀비"
                msg_text = (m.get('message') or '')[:200]  # 너무 길면 잘라냄
                prompt += f"\n[{role_label}] {msg_text}"

    prompt += build_qa_context(relevant_qa)
    return prompt



def check_doctor_visit(reply: str) -> bool:
    return any(kw in reply for kw in DOCTOR_KEYWORDS)


def build_doctor_memo(user: dict, health_ctx: dict, current_msg: str) -> str:
    from datetime import datetime as _dt
    p        = health_ctx.get('profile', {}) or {}
    meds_raw = health_ctx.get('medications', []) or []
    rec      = health_ctx.get('today_record', {}) or {}
    name     = user.get('name') or p.get('name', '')
    age      = user.get('age')  or p.get('age', '')
    gender   = user.get('gender') or p.get('gender', '')
    diseases = ', '.join(p.get('diseases') or p.get('chronic_diseases') or []) or ''
    allergy_parts = []
    if p.get('drugAllergies'): allergy_parts.extend(p['drugAllergies'])
    if p.get('foodAllergies'): allergy_parts.extend(p['foodAllergies'])
    allergies = ', '.join(allergy_parts) or ''
    meds_str  = ', '.join([
        f"{m.get('name','')} {m.get('dosage','')}({m.get('time_slot','')})"
        for m in meds_raw
    ]) if meds_raw else ''
    bp    = f"{rec.get('bp_sys','')}/{rec.get('bp_dia','')} mmHg" if rec.get('bp_sys') else ''
    sugar = f"{rec.get('glucose','')} mg/dL" if rec.get('glucose') else ''
    steps = f"{rec.get('steps','')} 백" if rec.get('steps') else ''
    age_gender = f"{age}세 {gender}" if (age or gender) else ''
    now = _dt.now().strftime('%Y년 %m월 %d일 %H:%M')
    lines = [
        "[의사 전달 메모]",
        f"작성일시: {now}",
        "",
        "■ 환자 정보",
        f"이름: {name}" + (f" ({age_gender})" if age_gender else ""),
        f"기저질환: {diseases or '없음'}",
        f"알레르기: {allergies or '없음'}",
        "",
        "■ 현재 증상",
        current_msg,
        "",
        "■ 복용 중인 약",
        meds_str or '없음',
        "",
        "■ 최근 건강 수치",
        f"혁압: {bp or '미측정'}",
        f"혁당: {sugar or '미측정'}",
        f"걸음수: {steps or '미측정'}",
        "",
        "* Silver Life AI 꿼비 상담 내용을 기반으로 자동 생성된 메모입니다.",
    ]
    return '\n'.join(lines)


def call_claude(client: anthropic.Anthropic, model: str, system: str, messages: list) -> str:
    """Claude 호출 -- 웹검색 도구 우선, 실패 시 일반 호출."""
    try:
        resp = client.beta.messages.create(
            model=model,
            max_tokens=1600,
            system=system,
            messages=messages,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            betas=["web_search_2025_03_05"],
        )
        for block in reversed(resp.content):
            if hasattr(block, 'text') and block.text:
                return block.text
        raise ValueError("No text block in response")
    except Exception as e:
        print(f"[web_search] fallback ({e.__class__.__name__}): {e}")

    resp = client.messages.create(
        model=model, max_tokens=1500, system=system, messages=messages,
    )
    for block in resp.content:
        if hasattr(block, 'text') and block.text:
            return block.text
    return resp.content[0].text


def _send_family_alert(user_id: str, user_name: str):
    """CRITICAL 감지 시 가족 Expo Push 알림 발송."""
    try:
        db = get_supabase()
        family_res = db.table("family_connections").select("family_user_id").eq("senior_user_id", user_id).execute()
        if not (family_res.data):
            family_res = db.table("family_members").select("*").eq("senior_id", user_id).execute()
        push_tokens = []
        for row in (family_res.data or []):
            fid = row.get("family_user_id") or row.get("id")
            if not fid:
                continue
            tok = db.table("push_tokens").select("token").eq("user_id", fid).execute()
            push_tokens += [t["token"] for t in (tok.data or []) if t.get("token")]
        if push_tokens:
            payload = [
                {"to": tok, "title": "\U0001F6A8 응급 상황 알림",
                 "body": f"{user_name}님이 AI 상담 중 응급 증상을 보이고 있습니다.",
                 "data": {"type": "sos_alert", "userId": user_id},
                 "sound": "default", "priority": "high"}
                for tok in push_tokens
            ]
            httpx.post("https://exp.host/--/api/v2/push/send", json=payload, timeout=8)
            print(f"[family_alert] {len(push_tokens)}명 전송 완료")
    except Exception as e:
        print(f"[family_alert] 오류: {e}")


def _save_chat_turn(user_id: str, user_msg: str, ai_reply: str, risk: str, model: str):
    """대화 한 턴(user + assistant)을 ai_chat_logs에 저장."""
    try:
        db = get_supabase()
        db.table("ai_chat_logs").insert([
            {"user_id": user_id, "role": "user",      "message": user_msg,  "risk_level": "normal"},
            {"user_id": user_id, "role": "assistant", "message": ai_reply,  "risk_level": risk, "model_used": model},
        ]).execute()
    except Exception as se:
        print(f"[ai_chat_logs] {se}")


def choose_model(history_msgs: list, current_msg: str) -> str:
    """CRITICAL/HIGH 징후면 Opus, 아니면 Sonnet."""
    high_kw  = EMERGENCY_WORDS + ['응급', '위험', '119', '즉시']
    combined = current_msg + ' '.join(m.get('content', '') for m in history_msgs[-4:])
    return "claude-opus-4-6" if any(kw in combined for kw in high_kw) else "claude-sonnet-4-6"


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    language: str = "ko"
    history: Optional[List[HistoryMessage]] = []
    client_profile: Optional[dict] = None
    client_meds:    Optional[list] = None
    client_record:  Optional[dict] = None


@router.post("/chat")
def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    relevant_qa = find_relevant_qa(request.message)
    user_row: dict = {}
    health_ctx: dict = {
        'profile':      request.client_profile or {},
        'medications':  request.client_meds    or [],
        'today_record': request.client_record  or {},
    }
    chat_ctx: Optional[dict] = None

    if request.user_id and request.user_id not in ("demo-user", "guest"):
        try:
            db = get_supabase()
            u = db.table("users").select("*").eq("id", request.user_id).execute()
            if u.data:
                user_row = u.data[0]
            server_ctx = load_health_context(request.user_id, db)
            for k, v in server_ctx.items():
                if v:
                    health_ctx[k] = v
            chat_ctx = load_chat_context(request.user_id, db)
        except Exception as ex:
            print(f"[user_load] {ex}")

    system_prompt = build_system_prompt(user_row, health_ctx, relevant_qa, chat_ctx)
    history_msgs  = [{"role": m.role, "content": m.content} for m in (request.history or [])[-10:]]
    model         = choose_model(history_msgs, request.message)
    messages      = history_msgs + [{"role": "user", "content": request.message}]

    try:
        client    = anthropic.Anthropic(api_key=api_key)
        reply_raw = call_claude(client, model, system_prompt, messages)
        risk      = detect_risk(reply_raw)
        if risk == 'critical' and model != "claude-opus-4-6":
            reply_raw = call_claude(client, "claude-opus-4-6", system_prompt, messages)
            risk = detect_risk(reply_raw)
        reply_text  = strip_risk_token(reply_raw)
        suggestions = get_suggested_questions(relevant_qa)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 오류: {str(e)}")

    sos_sent = False
    if risk == 'critical' and request.user_id and request.user_id not in ("demo-user", "guest"):
        uname = user_row.get('name') or (health_ctx.get('profile') or {}).get('name', '사용자')
        background_tasks.add_task(_send_family_alert, request.user_id, uname)
        sos_sent = True

    # 대화 저장 (백그라운드)
    if request.user_id and request.user_id not in ("demo-user", "guest"):
        background_tasks.add_task(
            _save_chat_turn, request.user_id, request.message, reply_text, risk, model
        )

    doctor_memo_needed = check_doctor_visit(reply_text)
    doctor_memo = build_doctor_memo(user_row, health_ctx, request.message) if doctor_memo_needed else None

    return {
        "reply":               reply_text,
        "risk_level":          risk,
        "model_used":          model,
        "suggested_questions": suggestions,
        "sos_sent":            sos_sent,
        "doctor_memo_needed":  doctor_memo_needed,
        "doctor_memo":         doctor_memo,
    }


@router.get("/history/{user_id}")
def get_chat_history(user_id: str, limit: int = 20):
    db = get_supabase()
    result = (
        db.table("ai_chat_logs")
        .select("id,role,message,risk_level,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return result.data


@router.post("/summary/{user_id}")
def generate_summary(user_id: str):
    """오늘 대화를 Claude로 요약해 ai_chat_summaries에 저장."""
    db        = get_supabase()
    today_str = date.today().isoformat()
    result = (
        db.table("ai_chat_logs").select("role,message,risk_level")
        .eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00").execute()
    )
    logs = result.data
    if not logs:
        raise HTTPException(status_code=404, detail="오늘 상담 기록이 없습니다")
    conv_text = "\n".join([f"[{'이용자' if l['role']=='user' else 'AI'}] {l['message']}" for l in logs])
    has_risk  = any(l.get("risk_level") in ("high", "critical") for l in logs)
    api_key   = os.getenv("ANTHROPIC_API_KEY")
    client    = anthropic.Anthropic(api_key=api_key)
    summary_res = client.messages.create(
        model="claude-haiku-4-5-20251001", max_tokens=400,
        messages=[{"role": "user", "content":
            "아래 건강 상담 대화를 가족이 볼 수 있도록 3줄 이내로 한국어로 요약하세요.\n"
            "핵심 증상/질문, AI 권고사항, 위험 여부를 포함하세요.\n\n" + conv_text}],
    )
    summary_text = summary_res.content[0].text
    existing = db.table("ai_chat_summaries").select("id").eq("user_id", user_id).eq("date", today_str).execute()
    if existing.data:
        db.table("ai_chat_summaries").update({"summary": summary_text, "has_risk": has_risk}).eq("id", existing.data[0]["id"]).execute()
    else:
        db.table("ai_chat_summaries").insert({"user_id": user_id, "summary": summary_text, "date": today_str, "has_risk": has_risk}).execute()
    return {"summary": summary_text, "date": today_str, "has_risk": has_risk}


@router.post("/daily-summary")
def trigger_daily_summaries():
    """자정 배치용 -- 오늘 대화가 있는 모든 유저의 요약 생성 (cron 또는 수동 호출)."""
    db        = get_supabase()
    today_str = date.today().isoformat()
    try:
        # 오늘 대화한 고유 user_id 목록
        logs_res = db.table("ai_chat_logs").select("user_id").eq("role", "user").gte("created_at", f"{today_str}T00:00:00").execute()
        user_ids = list({row["user_id"] for row in (logs_res.data or []) if row.get("user_id")})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"유저 목록 조회 실패: {e}")

    results = []
    for uid in user_ids:
        try:
            result = generate_summary(uid)
            results.append({"user_id": uid, "status": "ok", **result})
        except HTTPException as he:
            results.append({"user_id": uid, "status": "skip", "reason": he.detail})
        except Exception as ex:
            results.append({"user_id": uid, "status": "error", "reason": str(ex)})
    return {"processed": len(user_ids), "results": results}


@router.get("/summaries/{user_id}")
def get_summaries(user_id: str, limit: int = 7):
    db = get_supabase()
    result = (
        db.table("ai_chat_summaries").select("id,summary,date,has_risk,created_at")
        .eq("user_id", user_id).order("date", desc=True).limit(limit).execute()
    )
    return result.data


@router.get("/context/{user_id}")
def get_chat_context(user_id: str):
    """프론트엔드에서 현재 맥락 확인용 (옵션)."""
    db = get_supabase()
    ctx = load_chat_context(user_id, db)
    return {
        "today_message_count": len(ctx.get('today_messages', [])),
        "weekly_summary_count": len(ctx.get('weekly_summaries', [])),
        "weekly_summaries": ctx.get('weekly_summaries', []),
    }
