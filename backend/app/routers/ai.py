import asyncio
import os, re, json, httpx
from concurrent.futures import ThreadPoolExecutor, as_completed
import anthropic
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
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

_OTHER_KW = [
    '친구', '이웃', '지인', '남편', '아내', '아들', '딸', '부모님',
    '형제', '어머니', '아버지', '누나', '오빠', '언니', '동생',
    '손녀', '손자', '그분', '그 분', '그 사람', '그사람',
]
_SELF_KW = ['저는', '저도', '제가', '나는', '내가', '저한테', '저한', '본인', '제 증상']

def _is_about_self(msg: str) -> bool:
    """타인 언급 있고 본인 언급 없으면 False (타인 이야기)."""
    if any(k in msg for k in _OTHER_KW) and not any(k in msg for k in _SELF_KW):
        return False
    return True
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


# ── pgvector 의미 검색 ────────────────────────────────────────────────────────

_embed_model = None

def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        try:
            from fastembed import TextEmbedding
            _embed_model = TextEmbedding(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )
            print("[embedding] fastembed 모델 로드 완료")
        except Exception as e:
            print(f"[embedding] 모델 로드 실패: {e}")
    return _embed_model


def get_query_embedding(text: str) -> list | None:
    """fastembed ONNX 임베딩 (384차원). 실패 시 None."""
    model = _get_embed_model()
    if model is None:
        return None
    try:
        vecs = list(model.embed([text[:500]]))
        return vecs[0].tolist()
    except Exception as e:
        print(f"[embedding] {e}")
        return None


def find_relevant_qa_vector(message: str, top_k: int = 2) -> list:
    """벡터 검색 우선, 실패 시 키워드 검색으로 폴백."""
    embedding = get_query_embedding(message)
    if embedding is not None:
        try:
            db = get_supabase()
            result = db.rpc("match_qa_embeddings", {
                "query_embedding": embedding,
                "match_threshold": 0.25,
                "match_count": top_k,
            }).execute()
            if result.data:
                return result.data
        except Exception as e:
            print(f"[vector_search] fallback: {e}")
    return find_relevant_qa(message, top_k)


# ── 만성질환 자동 추출 ────────────────────────────────────────────────────────

_COND_WORDS = [
    '고혈압', '당뇨', '관절염', '심장', '심부전', '협심증', '부정맥',
    '골다공증', '고지혈', '파킨슨', '치매', '알츠하이머', '뇌졸중',
    '백내장', '녹내장', '천식', '류마티스', '통풍', '빈혈', '갑상선',
    '신장', '간경화', '위염', '역류성', '디스크', '척추관', '우울증',
    '공황', '불안장애', '폐기종', '만성기관지',
]
_SELF_WORDS = [
    '제가', '저는', '저한테', '나는', '내가', '저도', '본인이',
    '있어요', '있어', '있습니다', '앓고', '오래됐', '진단', '판정',
]


def extract_user_conditions_sync(
    client: anthropic.Anthropic,
    user_msg: str,
    existing: list,
) -> list:
    """
    사용자 발화에서 본인의 만성질환만 추출 (Haiku, ~300 ms).
    키워드 pre-filter → 통과 시에만 LLM 호출.
    """
    has_cond = any(w in user_msg for w in _COND_WORDS)
    has_self = any(w in user_msg for w in _SELF_WORDS)
    if not (has_cond and has_self):
        return []

    existing_set = set(existing)
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{"role": "user", "content": (
                f"다음 문장에서 이 사람 \"본인\"의 만성질환·지속 건강 상태만 추출하세요.\n"
                f"규칙: 타인 언급 제외 / 일시 증상(두통·감기 등) 제외 / 만성·지속 질환만.\n"
                f"이미 알고 있음(제외): {list(existing_set)}\n"
                f"문장: \"{user_msg}\"\n"
                f"JSON만 반환: {{\"conditions\": [\"질환명\"]}}"
            )}],
        )
        text = resp.content[0].text.strip()
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            data = json.loads(m.group())
            return [c for c in (data.get("conditions") or [])
                    if c and c not in existing_set][:3]
    except Exception as e:
        print(f"[extract_conditions] {e}")
    return []


def _update_conditions_background(user_id: str, new_conditions: list):
    """감지된 만성질환을 users.health_profile.diseases 에 병합 (백그라운드)."""
    if not new_conditions:
        return
    try:
        db = get_supabase()
        res = db.table("users").select("health_profile").eq("id", user_id).execute()
        profile: dict = {}
        if res.data and res.data[0].get("health_profile"):
            profile = res.data[0]["health_profile"] or {}

        existing = set(profile.get("diseases") or profile.get("chronic_diseases") or [])
        truly_new = [c for c in new_conditions if c not in existing]
        if truly_new:
            profile["diseases"] = list(existing | set(truly_new))
            db.table("users").update({"health_profile": profile}).eq("id", user_id).execute()
            print(f"[profile_update] {user_id}: +{truly_new}")
    except Exception as e:
        print(f"[profile_update] 오류: {e}")


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
    """medications + medication_logs(오늘) + health_records 최근 7일 — 병렬 로드."""
    ctx: dict = {}
    today_str = date.today().isoformat()

    def _meds():
        r = db.table("medications").select("id,name,dosage,times,med_type").eq("user_id", user_id).execute()
        return 'medications', r.data or []

    def _med_logs():
        r = db.table("medication_logs").select("medication_id,medication_name,scheduled_time,taken,status")\
            .eq("user_id", user_id).eq("date", today_str).execute()
        return 'today_med_logs', r.data or []

    def _health_records():
        r = db.table("health_records").select("*").eq("user_id", user_id).order("date", desc=True).limit(7).execute()
        return 'health_records', r.data or []

    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = [ex.submit(_meds), ex.submit(_med_logs), ex.submit(_health_records)]
        for f in as_completed(futures):
            try:
                k, v = f.result()
                if v:
                    ctx[k] = v
            except Exception as e:
                print(f"[load_health_context] {e}")

    if ctx.get('health_records'):
        ctx['today_record'] = ctx['health_records'][0]
    return ctx


def load_chat_context(user_id: str, db) -> dict:
    """오늘 대화 전체 + 최근 30일 요약을 로드해 맥락 구성."""
    ctx: dict = {'today_messages': [], 'weekly_summaries': []}
    today_str = date.today().isoformat()
    # 오늘 대화 (최대 20턴 — 앱 재시작 시 문맥 복원용)
    try:
        r = db.table("ai_chat_logs").select("role,message,created_at").eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00").order("created_at", desc=False).limit(20).execute()
        ctx['today_messages'] = r.data or []
    except Exception as e:
        print(f"[chat_context/today] {e}")
    # 최근 7일 요약 (오늘 제외)
    try:
        month_ago = (date.today() - timedelta(days=30)).isoformat()
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        r = db.table("ai_chat_summaries").select("date,summary,has_risk").eq("user_id", user_id).gte("date", month_ago).lte("date", yesterday).order("date", desc=True).execute()
        ctx['weekly_summaries'] = r.data or []
    except Exception as e:
        print(f"[chat_context/summaries] {e}")
    return ctx


def build_system_prompt(user: dict, health_ctx: dict, relevant_qa: List[dict],
                        chat_ctx: Optional[dict] = None,
                        turn_count: int = 0, force_summary: bool = False,
                        intent: str = "health", language: str = "ko",
                        weather_str: Optional[str] = None) -> str:
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
        # 오늘 복용 로그로 각 약의 복용 현황 매핑
        logs_today = health_ctx.get('today_med_logs', []) or []
        log_map: dict = {}  # medication_id → {time: status}
        for lg in logs_today:
            mid = lg.get('medication_id', '')
            if mid not in log_map:
                log_map[mid] = {}
            log_map[mid][lg.get('scheduled_time', '')] = lg.get('taken', False)

        med_lines = []
        for m in meds_raw:
            times_list = m.get('times') or []
            mid = m.get('id', '')
            time_status = []
            for t in times_list:
                taken = log_map.get(mid, {}).get(t)
                if taken is True:
                    time_status.append(f"{t}✅")
                elif taken is False:
                    time_status.append(f"{t}❌미복용")
                else:
                    time_status.append(f"{t}⬜미기록")
            status_str = ', '.join(time_status) if time_status else '시간 미설정'
            med_lines.append(f"{m.get('name','')} {m.get('dosage','')} [{m.get('med_type','')}] — {status_str}")
        meds_str = '\n    '.join(med_lines)
    elif user.get('taking_medication') and user.get('medication_list'):
        meds_str = user['medication_list']
    else:
        meds_str = '없음'

    bp_s  = rec.get('blood_pressure_systolic')
    bp_d  = rec.get('blood_pressure_diastolic')
    bp    = f"{bp_s}/{bp_d} mmHg" if (bp_s and bp_d) else '미측정'
    sugar_val = rec.get('blood_sugar')
    sugar = f"{sugar_val} mg/dL" if sugar_val else '미측정'
    steps = f"{rec.get('steps','')} 보" if rec.get('steps') else '미측정'
    hr    = f"{rec.get('heart_rate','')} bpm" if rec.get('heart_rate') else '미측정'
    wt    = f"{rec.get('weight','')} kg" if rec.get('weight') else '미측정'

    # 최근 7일 건강 기록 트렌드 (오늘 포함)
    records_7d = health_ctx.get('health_records', [])
    trend_lines = []
    for r in records_7d[:7]:
        parts = [str(r.get('date',''))]
        bs2 = r.get('blood_pressure_systolic'); bd2 = r.get('blood_pressure_diastolic')
        if bs2 and bd2: parts.append(f"혈압 {bs2}/{bd2}")
        if r.get('blood_sugar'): parts.append(f"혈당 {r['blood_sugar']}")
        if r.get('steps'): parts.append(f"걸음 {r['steps']}")
        if r.get('sleep_hours'): parts.append(f"수면 {r['sleep_hours']}h")
        if r.get('weight'): parts.append(f"체중 {r['weight']}kg")
        if r.get('heart_rate'): parts.append(f"심박 {r['heart_rate']}")
        trend_lines.append("  " + " / ".join(parts))
    if trend_lines:
        trend_str = "아래 데이터는 사용자가 앱에 직접 입력한 건강 기록입니다. 실제 측정값이므로 반드시 참조하세요.\n" + "\n".join(trend_lines)
    else:
        trend_str = "사용자가 앱에 아직 건강 수치를 입력하지 않았습니다."

    habits_parts = []
    for key, label in [('smoking','흡연'), ('drinking','음주'), ('exercise','운동'), ('meal','식사')]:
        val = p.get(key) or user.get(key)
        if val:
            habits_parts.append(f"{label}: {val}")
    habits = ', '.join(habits_parts) if habits_parts else '정보 없음'

    age_gender = f"{age}세 {gender}" if (age or gender) else ''

    today_str = date.today().isoformat()
    prompt = (
        f"오늘 날짜: {today_str}\n\n"
        "당신은 Silver Life AI의 루미입니다.\n\n"
        "[루미 페르소나]\n"
        "루미는 품격 있는 온기를 지닌 건강 동반자입니다.\n"
        "삶의 아름다움과 건강의 소중함을 잘 아는, 지혜롭고 우아한 벗 같은 존재입니다.\n"
        "수줍게 그러나 진심으로 마음을 전합니다 — 마치 오랜 벗이 살며시 곁에서 걱정해 주듯.\n"
        "건강 상담뿐 아니라 여가·문화·감정·일상 등 삶의 모든 결에 품위 있게 함께합니다.\n\n"
        "[말투 원칙]\n"
        "· 정돈되고 우아한 한국어 사용 — 직접적보다 부드럽고 따뜻하게\n"
        "· 놀람·걱정·안타까움 표현 시 한국 여성 특유의 추임새 자연스럽게 사용: '어머', '어머나', '저런', '어떡해요', '세상에', '아이고' 등 — 억지스럽지 않게 상황에 맞게\n"
        "· 걱정은 수줍게: '마음이 쓰이는걸요', '조금 걱정이 되어서요'\n"
        "· 기쁨은 품위 있게: '참 다행이에요', '마음이 따뜻해지는 소식이네요'\n"
        "· 권유는 부드럽게: '~해 보시겠어요?', '~하시면 어떨까요' — 명령형 금지\n"
        "· 의학 정보는 정확하되 온기 있게 전달 — 딱딱하거나 사무적인 표현 금지\n"
        "· 쉬운 한국어 (의학 용어 최소화, 필요 시 풀어서 설명)\n"
        "· 답변은 3~5문장, 마크다운(*, #, **) 사용 금지\n\n"
        "[환자 정보]\n"
        f"이름: {name}" + (f" ({age_gender})" if age_gender else "") + "\n"
        f"만성질환: {diseases}\n"
        f"수술 경력: {surgeries}\n"
        f"알레르기: {allergies}\n"
        f"현재 복용약: {meds_str}\n"
        f"최근 기록 혈압: {bp}\n"
        f"최근 기록 혈당: {sugar}\n"
        f"최근 기록 심박수: {hr}\n"
        f"최근 기록 체중: {wt}\n"
        f"최근 기록 걸음수: {steps}\n"
        f"최근 7일 건강 기록:\n{trend_str}\n"
        f"생활습관: {habits}\n"
        + (f"[실시간 날씨 데이터] {weather_str} (GPS 기반 실시간 수집 완료)\n" if weather_str else "")
        + "\n"
        "[답변 원칙]\n"
        + (f"1. 첫 번째 답변이므로 반드시 '{name}님'으로 시작할 것\n" if turn_count == 0 else
           f"1. 두 번째 이후 답변: '{name}님'으로 시작하지 말 것. 자연스럽게 대화를 이어갈 것\n")
        +
        "2. 질문 의도를 먼저 파악 (건강/여가/감정/일상)\n"
        "3. 건강 질문: 위 건강 정보 참고, 복용약·알레르기 반드시 고려. 트렌드·기록 문의 시 [최근 7일 건강 기록]의 수치를 그대로 인용할 것 (예: '5월 14일 혈압 120/80이셨어요')\n"
        "4. 여가·문화 질문: 시니어 친화 활동을 품위 있게 추천 (접근성·체력 고려)\n"
        "5. 감정·외로움: 공감 먼저, 판단 금지, 가족·커뮤니티는 자연스럽게만\n"
        "6. 일상·잡담: 벗처럼 가볍고 품위 있게, 억지로 건강과 연결하지 말 것\n"
        "7. 알레르기 약물 절대 추천 금지\n"
        "8. 응급 증상 시 [RISK:CRITICAL] 태그 필수\n"
        "9. 의료 답변 끝에: '이 내용은 참고용이며, 정확한 진단은 의사 선생님께 꼭 여쭤보세요'\n"
        "10. 타인(친구·가족·지인) 건강 이야기 시: [RISK:] 태그 금지, 이용자 본인에게 병원 방문 권유 금지\n"
        "11. [실시간 날씨 데이터]가 위에 제공된 경우: 사용자가 날씨를 물으면 그 데이터를 그대로 알려줄 것. '실시간 날씨를 확인할 수 없다'는 답변 절대 금지. 날씨가 건강에 미치는 영향도 자연스럽게 안내.\n"
        "12. 건강 기록 관련 절대 금지 표현: '기록을 가져오는 데 실패', '데이터 조회 불가', '기록에 접근할 수 없다', '실시간 조회 불가' — 이 시스템은 루미가 직접 DB를 조회하는 구조가 아님. 위 [환자 정보]에 포함된 건강 기록이 이미 사전에 제공된 실제 데이터임. 기록이 있으면 그대로 참조하고, '아직 입력된 수치가 없습니다'라고만 안내하면 됨.\n\n"
        "[위험도 판단]\n"
        "[RISK:LOW]      - 경미하거나 만성적, 일상 지장 없음\n"
        "[RISK:MEDIUM]   - 지속 시 병원 필요, 당장 응급 아님\n"
        "[RISK:HIGH]     - 오늘 내 병원 방문 필요\n"
        "[RISK:CRITICAL] - 즉시 119 또는 응급실 (의식저하/마비/심한 흉통/호흡곤란)\n"
    )

    if language == "zh":
        prompt += (
            "\n[언어 설정]\n"
            "반드시 중국어(简体中文)로만 답변하세요. "
            "따뜻하고 품위 있는 중국어를 사용하고, "
            "사용자 이름은 그대로 사용하세요. "
            "응급 연락처는 중국 현지(120) 기준으로 안내하세요.\n"
        )
    elif language == "en":
        prompt += (
            "\n[Language Setting]\n"
            "Respond ONLY in English. Use warm, respectful English. "
            "Keep the user's name as-is. "
            "For emergency guidance, refer to 911.\n"
        )
    elif language == "ja":
        prompt += (
            "\n[言語設定]\n"
            "必ず日本語のみで回答してください。"
            "温かく上品な日本語を使ってください。"
            "緊急時は119番を案内してください。\n"
        )

    # 장기 대화 맥락 삽입
    if chat_ctx:
        weekly = chat_ctx.get('weekly_summaries', [])
        today_msgs = chat_ctx.get('today_messages', [])

        if weekly:
            prompt += "\n\n=== 최근 30일 대화 요약 ==="
            for s in reversed(weekly):  # 오래된 것부터
                risk_flag = " ⚠️위험" if s.get('has_risk') else ""
                prompt += f"\n[{s.get('date','')}]{risk_flag} {s.get('summary','')}"

        if today_msgs:
            prompt += "\n\n=== 오늘 이전 대화 기록 ==="
            for m in today_msgs:
                role_label = "이용자" if m.get('role') == 'user' else "루미"
                msg_text = (m.get('message') or '')[:200]  # 너무 길면 잘라냄
                prompt += f"\n[{role_label}] {msg_text}"

    prompt += build_qa_context(relevant_qa)

    # ── Intent 맞춤 응답 지시 ──
    if intent == "emotional":
        prompt += (
            "\n\n[감정 지원 모드]\n"
            "이용자가 외로움·슬픔·불안·그리움 등 감정을 표현했습니다.\n"
            "1. 건강 조언은 꺼내지 말 것 — 이용자가 직접 요청할 때만\n"
            "2. 먼저 품위 있게 공감: '많이 외로우셨겠어요', '그 마음 충분히 이해해요'\n"
            "3. '저 루미가 늘 여기 있어요' — 따뜻하고 수줍은 동반자 느낌으로\n"
            "4. 가족 연결이나 활동은 강요 없이 아주 자연스럽게만\n"
            "5. 짧고 온기 있는 문장 2~3개, 마크다운 금지, [RISK:] 태그 금지\n"
        )
    elif intent == "crisis":
        prompt += (
            "\n\n[위기 지원 모드]\n"
            "이용자가 깊은 고통이나 자해 관련 표현을 했을 수 있습니다.\n"
            "1. 판단 절대 금지, 오직 공감과 수용\n"
            "2. '많이 힘드셨겠어요. 저 루미가 곁에 있어요' — 조용하고 진심 어리게\n"
            "3. 혼자가 아님을 부드럽게 전달\n"
            "4. 품위 있게 안내: 정신건강 위기상담 1393 (24시간 무료)\n"
            "5. 해결책·조언·설교 절대 금지\n"
            "6. 2~3문장, 쉽고 따뜻하게, [RISK:] 태그 금지\n"
        )
    elif intent == "cognitive":
        prompt += (
            "\n\n[인지 배려 모드]\n"
            "이용자가 반복 질문이나 혼란·망각을 표현하고 있습니다.\n"
            "1. 첫 문장: '괜찮아요, 언제든 몇 번이든 여쭤보세요' — 안심을 먼저\n"
            "2. '다시 말씀드릴게요' 로 시작\n"
            "3. 핵심 한 가지만, 최대 3문장, 아주 짧고 쉽게\n"
            "4. '아까 말씀드렸는데요' 등 지적하는 표현 절대 금지\n"
        )
    elif intent == "daily":
        prompt += (
            "\n\n[일상 대화 모드]\n"
            "건강과 무관한 일상 이야기입니다.\n"
            "1. 오랜 벗처럼 가볍고 품위 있게 대화\n"
            "2. 억지로 건강과 연결하지 말 것\n"
            "3. 이용자의 기분과 관심사에 집중\n"
            "4. [RISK:] 태그 금지\n"
        )

    # 대화형 상담 진행 방식
    turn_label = turn_count + 1
    if force_summary:
        prompt += (
            "\n\n[상담 마무리 요청]\n"
            "사용자가 지금 요약을 요청했습니다.\n"
            "지금까지 대화에서 파악한 모든 증상과 정보를 바탕으로:\n"
            "1) 증상 요약\n2) 위험도 판단\n3) 권고사항(병원 방문 여부)을 말씀드리세요.\n"
            "답변 마지막에 반드시 [FINAL] 태그를 붙이세요.\n"
        )
    elif turn_count == 0:
        prompt += (
            "\n\n[상담 진행 방식 — 1턴]\n"
            "상황에 따라 다르게 대응하세요:\n"
            "① 증상·통증·불편함 호소 시: 핵심 파악을 위한 질문 1개만. 답변·설명 금지.\n"
            "   예: '언제부터 그러셨나요?' / '어느 부위가 아프신가요?'\n"
            "② 건강 기록·수치·트렌드 문의 시 (예: '내 혈압', '기록', '최근 건강'): "
            "위 [환자 정보]와 [최근 7일 건강 기록]의 수치를 직접 인용하여 바로 답변할 것. 역질문 금지.\n"
            "③ 일상·감정·잡담: 자연스럽게 답변.\n"
        )
    elif turn_count == 1:
        prompt += (
            "\n\n[상담 진행 방식 — 2턴]\n"
            "대화 정보가 쌓이고 있습니다. 아직 파악이 부족하면 질문 1개만 더 하세요.\n"
            "충분하다면 지금 요약으로 넘어가도 됩니다.\n"
            "질문을 한다면 절대 1개만. 복수 질문 금지.\n"
        )
    elif turn_count >= 2:
        prompt += (
            f"\n\n[상담 진행 방식 — {turn_label}턴, 마무리 단계]\n"
            "충분한 정보가 수집됐습니다. 이제 다음 순서로 답변하세요:\n"
            "1) 지금까지 언급된 모든 증상 간략 요약\n"
            "2) 위험도 판단 및 권고사항 (병원 방문 시기 포함)\n"
            "3) 추가 주의사항\n"
            f"{'4) 아직 파악이 부족하면 질문 1개만 추가 가능 (최대 5턴까지)' if turn_count < 4 else '반드시 최종 답변을 제공하세요.'}\n"
            "최종 요약 시 답변 마지막에 [FINAL] 태그를 붙이세요.\n"
        )
    return prompt



def check_doctor_visit(reply: str, user_msg: str = '') -> bool:
    if user_msg and not _is_about_self(user_msg):
        return False
    return any(kw in reply for kw in DOCTOR_KEYWORDS)


def build_doctor_memo(user: dict, health_ctx: dict, current_msg: str) -> str:
    from datetime import datetime as _dt
    p        = health_ctx.get('profile', {}) or {}
    meds_raw = health_ctx.get('medications', []) or []
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
        "■ 의사 소견",
        "(직접 입력해 주세요)",
        "",
        "* Silver Life AI 루미 상담 내용을 기반으로 자동 생성된 메모입니다.",
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


# ── 건강기록 조회 Tool ──────────────────────────────────────────────────────
HEALTH_QUERY_TOOL = {
    "name": "query_health_records",
    "description": (
        "사용자의 과거 건강 기록을 날짜 범위로 조회합니다. "
        "최근 7일 데이터는 시스템 프롬프트 [최근 7일 건강 기록]에 이미 포함되어 있으므로 이 도구를 사용하지 마세요. "
        "7일 이전의 과거 데이터가 필요할 때만 사용하세요. "
        "예: '한달 전 걸음수', '3월 혈압', '작년 체중 변화'"
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "date_from": {"type": "string", "description": "조회 시작 날짜 (YYYY-MM-DD)"},
            "date_to":   {"type": "string", "description": "조회 종료 날짜 (YYYY-MM-DD)"},
        },
        "required": ["date_from", "date_to"],
    },
}


def execute_health_query(user_id: str, tool_input: dict, db) -> str:
    """query_health_records tool 실행 — Supabase에서 날짜 범위 조회."""
    date_from = tool_input.get("date_from", "")
    date_to   = tool_input.get("date_to",   "")
    try:
        result = (
            db.table("health_records")
            .select("date,blood_pressure_systolic,blood_pressure_diastolic,blood_sugar,weight,steps,sleep_hours,heart_rate")
            .eq("user_id", user_id)
            .gte("date", date_from)
            .lte("date", date_to)
            .order("date", desc=False)
            .execute()
        )
        if not result.data:
            return f"{date_from} ~ {date_to} 기간에 건강 기록이 없습니다."
        return json.dumps(result.data, ensure_ascii=False)
    except Exception as e:
        return f"조회 오류: {e}"


def call_claude_with_health_tool(
    client: anthropic.Anthropic, model: str, system: str,
    messages: list, user_id: str, db
) -> str:
    """health_query tool을 포함한 Claude 호출 (tool use 루프 최대 1회)."""
    resp = client.messages.create(
        model=model, max_tokens=1500, system=system,
        messages=messages, tools=[HEALTH_QUERY_TOOL],
    )
    # tool_use 응답이면 실행 후 재호출
    if resp.stop_reason == "tool_use":
        tool_block = next((b for b in resp.content if b.type == "tool_use"), None)
        if tool_block and tool_block.name == "query_health_records" and db:
            tool_result = execute_health_query(user_id, tool_block.input, db)
            print(f"[health_tool] {tool_block.input} → {tool_result[:80]}")
            cont_messages = messages + [
                {"role": "assistant", "content": resp.content},
                {"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": tool_block.id, "content": tool_result}
                ]},
            ]
            resp = client.messages.create(
                model=model, max_tokens=1500, system=system,
                messages=cont_messages, tools=[HEALTH_QUERY_TOOL],
            )
    for block in resp.content:
        if hasattr(block, "text") and block.text:
            return block.text
    return ""


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
    """3단계 모델 선택:
    - Opus   : 응급/위험 키워드 포함 시
    - Sonnet : 건강·의료 관련 질문
    - Haiku  : 일상·안부·잡담 등 가벼운 대화
    """
    combined = current_msg + ' '.join(m.get('content', '') for m in history_msgs[-4:])

    # 1단계: 응급 → Opus
    opus_kw = EMERGENCY_WORDS + ['응급', '위험', '119', '즉시', '마비', '의식']
    if any(kw in combined for kw in opus_kw):
        return "claude-opus-4-6"

    # 2단계: 건강/의료 → Sonnet
    sonnet_kw = [
        '혈압', '혈당', '심박', '체중', '약', '복용', '처방', '병원', '진료', '의사',
        '증상', '통증', '두통', '어지', '기침', '열', '당뇨', '고혈압', '콜레스테롤',
        '수면', '불면', '관절', '허리', '소화', '변비', '설사', '치매', '기억',
        '우울', '불안', '스트레스', '검사', '수치', '건강', '칼로리', '운동',
    ]
    if any(kw in combined for kw in sonnet_kw):
        return "claude-sonnet-4-6"

    # 3단계: 일상/잡담 → Haiku
    return "claude-haiku-4-5-20251001"


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    language: str = "ko"
    history: Optional[List[HistoryMessage]] = []
    client_profile:     Optional[dict] = None
    client_meds:        Optional[list] = None
    client_record:      Optional[dict] = None
    client_records_7d:  Optional[list] = None
    client_weather:     Optional[str]  = None
    turn_count:     int = 0
    force_summary:  bool = False
    intent:         str  = "health"   # health|emotional|cognitive|crisis|daily


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, background_tasks: BackgroundTasks):
    """스트리밍 채팅 — SSE로 토큰 단위 전송, 마지막에 메타데이터 이벤트."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        async def _err():
            yield f"data: {json.dumps({'error': 'API key missing', 'done': True, 'risk_level': 'normal', 'doctor_memo_needed': False, 'is_final': False})}\n\n"
        return StreamingResponse(_err(), media_type="text/event-stream")

    relevant_qa = find_relevant_qa_vector(request.message)
    user_row: dict = {}
    health_ctx: dict = {
        'profile':      request.client_profile or {},
        'medications':  request.client_meds    or [],
        'today_record': request.client_record  or {},
    }
    # 클라이언트가 7일 기록을 보내면 먼저 채워둠 (클라이언트 데이터 우선)
    print(f"[chat/records] client_records_7d count={len(request.client_records_7d) if request.client_records_7d else 0}")
    if request.client_records_7d:
        health_ctx['health_records'] = request.client_records_7d
        if not health_ctx['today_record'] and request.client_records_7d:
            health_ctx['today_record'] = request.client_records_7d[0]

    chat_ctx = None
    db = None

    if request.user_id and request.user_id not in ("demo-user", "guest"):
        try:
            db = get_supabase()
            u = db.table("users").select("*").eq("id", request.user_id).execute()
            if u.data:
                user_row = u.data[0]
            server_ctx = load_health_context(request.user_id, db)
            for k, v in server_ctx.items():
                if v:
                    # 클라이언트가 이미 보낸 건강기록은 덮어쓰지 않음 (클라이언트 우선)
                    if k in ('health_records', 'today_record') and health_ctx.get(k):
                        continue
                    health_ctx[k] = v
            if user_row.get("health_profile") and not health_ctx.get("profile"):
                health_ctx["profile"] = user_row["health_profile"]
            chat_ctx = load_chat_context(request.user_id, db)
        except Exception as ex:
            print(f"[stream/user_load] {ex}")

    print(f"[chat/records] final health_records count={len(health_ctx.get('health_records') or [])}")
    _sample = (health_ctx.get('health_records') or [{}])[0]
    print(f"[chat/records] sample={_sample}")
    system_prompt = build_system_prompt(user_row, health_ctx, relevant_qa, chat_ctx,
                                        turn_count=request.turn_count,
                                        force_summary=request.force_summary,
                                        intent=request.intent,
                                        language=request.language,
                                        weather_str=request.client_weather)
    history_msgs = [{"role": m.role, "content": m.content} for m in (request.history or [])[-10:]]
    model        = choose_model(history_msgs, request.message)
    ai_messages  = history_msgs + [{"role": "user", "content": request.message}]

    async def event_gen():
        import re as _re
        full_text = ""
        try:
            client_ai = anthropic.Anthropic(api_key=api_key)
            with client_ai.messages.stream(
                model=model,
                max_tokens=1200,
                system=system_prompt,
                messages=ai_messages,
            ) as stream:
                for text in stream.text_stream:
                    full_text += text
                    yield f"data: {json.dumps({'token': text}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True, 'risk_level': 'normal', 'doctor_memo_needed': False, 'is_final': False})}\n\n"
            return

        is_final_flag = bool(_re.search(r'\[FINAL\]', full_text, _re.IGNORECASE)) or request.force_summary
        full_text2 = _re.sub(r'\[FINAL\]', '', full_text, flags=_re.IGNORECASE).strip()
        risk       = detect_risk(full_text2)
        reply_text = strip_risk_token(full_text2)

        sos_sent = False
        if risk == 'critical' and request.user_id and request.user_id not in ("demo-user", "guest"):
            uname = user_row.get('name', '사용자')
            background_tasks.add_task(_send_family_alert, request.user_id, uname)
            sos_sent = True

        if request.user_id and request.user_id not in ("demo-user", "guest"):
            background_tasks.add_task(_save_chat_turn, request.user_id, request.message, reply_text, risk, model)

        about_self = _is_about_self(request.message)
        doctor_memo_needed = about_self and (is_final_flag or check_doctor_visit(reply_text, request.message))
        doctor_memo = None
        if doctor_memo_needed:
            all_syms = [m.content for m in (request.history or []) if m.role == 'user'] + [request.message]
            doctor_memo = build_doctor_memo(user_row, health_ctx, ' / '.join(all_syms))

        # ── 만성질환 자동 추출 (스레드 풀 — 이벤트 루프 블로킹 방지) ─────────
        profile_updates: list = []
        if (request.user_id and request.user_id not in ("demo-user", "guest")
                and request.intent != "daily"):
            existing_diseases = list(
                (health_ctx.get('profile') or {}).get('diseases') or
                (health_ctx.get('profile') or {}).get('chronic_diseases') or []
            )
            profile_updates = await asyncio.to_thread(
                extract_user_conditions_sync,
                client_ai, request.message, existing_diseases
            )
            if profile_updates:
                background_tasks.add_task(
                    _update_conditions_background, request.user_id, profile_updates
                )

        yield f"data: {json.dumps({'done': True, 'risk_level': risk, 'doctor_memo_needed': doctor_memo_needed, 'doctor_memo': doctor_memo, 'is_final': is_final_flag, 'sos_sent': sos_sent, 'profile_updates': profile_updates}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/chat")
def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    relevant_qa = find_relevant_qa_vector(request.message)
    user_row: dict = {}
    health_ctx: dict = {
        'profile':      request.client_profile or {},
        'medications':  request.client_meds    or [],
        'today_record': request.client_record  or {},
    }
    # 클라이언트가 7일 기록을 보내면 먼저 채워둠 (스트리밍 엔드포인트와 동일 처리)
    if request.client_records_7d:
        health_ctx['health_records'] = request.client_records_7d
        if not health_ctx['today_record'] and request.client_records_7d:
            health_ctx['today_record'] = request.client_records_7d[0]
    chat_ctx: Optional[dict] = None

    db = None
    if request.user_id and request.user_id not in ("demo-user", "guest"):
        try:
            db = get_supabase()
            u = db.table("users").select("*").eq("id", request.user_id).execute()
            if u.data:
                user_row = u.data[0]
            server_ctx = load_health_context(request.user_id, db)
            for k, v in server_ctx.items():
                if v:
                    if k in ('health_records', 'today_record') and health_ctx.get(k):
                        continue
                    health_ctx[k] = v
            # Supabase에 저장된 health_profile JSONB → client_profile 미전송 시 폴백
            if user_row.get("health_profile") and not health_ctx.get("profile"):
                health_ctx["profile"] = user_row["health_profile"]
            chat_ctx = load_chat_context(request.user_id, db)
        except Exception as ex:
            print(f"[user_load] {ex}")

    system_prompt = build_system_prompt(user_row, health_ctx, relevant_qa, chat_ctx,
                                          turn_count=request.turn_count, force_summary=request.force_summary,
                                          intent=request.intent, language=request.language,
                                          weather_str=request.client_weather)
    history_msgs  = [{"role": m.role, "content": m.content} for m in (request.history or [])[-10:]]
    model         = choose_model(history_msgs, request.message)
    messages      = history_msgs + [{"role": "user", "content": request.message}]

    try:
        client = anthropic.Anthropic(api_key=api_key)
        reply_raw = call_claude(client, model, system_prompt, messages)
        risk      = detect_risk(reply_raw)
        if risk == 'critical' and model != "claude-opus-4-6":
            reply_raw = call_claude(client, "claude-opus-4-6", system_prompt, messages)
            risk = detect_risk(reply_raw)
        import re as _re
        is_final_flag = bool(_re.search(r'\[FINAL\]', reply_raw, _re.IGNORECASE)) or request.force_summary
        reply_raw2  = _re.sub(r'\[FINAL\]', '', reply_raw, flags=_re.IGNORECASE).strip()
        reply_text  = strip_risk_token(reply_raw2)
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

    doctor_memo_needed = _is_about_self(request.message) and (is_final_flag or check_doctor_visit(reply_text, request.message))
    if doctor_memo_needed:
        # 대화 전체 증상 수집해서 메모 생성
        all_symptoms = []
        for m in (request.history or []):
            if m.role == 'user' and m.content:
                all_symptoms.append(m.content)
        all_symptoms.append(request.message)
        combined_symptoms = ' / '.join(all_symptoms)
        doctor_memo = build_doctor_memo(user_row, health_ctx, combined_symptoms)
    else:
        doctor_memo = None

    return {
        "reply":               reply_text,
        "risk_level":          risk,
        "model_used":          model,
        "suggested_questions": suggestions,
        "sos_sent":            sos_sent,
        "doctor_memo_needed":  doctor_memo_needed,
        "doctor_memo":         doctor_memo,
        "is_final":            is_final_flag,
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


@router.get("/proactive-greeting/{user_id}")
def proactive_greeting(user_id: str):
    """화면 진입 시 루미의 선제적 맞춤 인사 메시지 생성."""
    hour = (datetime.now(timezone.utc).hour + 9) % 24
    time_label = "아침" if hour < 12 else "오후" if hour < 18 else "저녁"

    def fallback_msg(name: str = "") -> str:
        n = f"{name}님, " if name else ""
        if hour < 12:   return f"{n}좋은 아침이에요! 오늘도 건강하고 행복하게 시작해요. 궁금한 것이 있으면 언제든 물어보세요."
        elif hour < 18: return f"{n}안녕하세요! 오늘 하루 잘 보내고 계신가요? 무엇이든 편하게 이야기해요."
        else:           return f"{n}좋은 저녁이에요! 오늘 하루도 수고하셨어요. 무엇이든 편하게 이야기해 주세요."

    if not user_id or user_id in ("demo-user", "guest"):
        return {"message": fallback_msg()}

    try:
        db = get_supabase()
        user_res = db.table("users").select("name").eq("id", user_id).execute()
        name = (user_res.data[0].get("name") if user_res.data else "") or ""

        health_ctx = load_health_context(user_id, db)
        chat_ctx   = load_chat_context(user_id, db)

        context_notes = []

        today_logs = health_ctx.get("today_med_logs", [])
        untaken = [l for l in today_logs if not l.get("taken") and l.get("status") != "skipped"]
        if untaken:
            med_name = untaken[0].get("medication_name") or "약"
            context_notes.append(f"오늘 {med_name} 아직 복용하지 않으셨습니다")

        records = health_ctx.get("health_records", [])
        if len(records) >= 3:
            bp_vals = [r.get("blood_pressure_systolic") for r in records[:3] if r.get("blood_pressure_systolic")]
            if len(bp_vals) >= 3 and all(v >= 140 for v in bp_vals):
                context_notes.append(f"최근 3일 혈압이 높게 측정되고 있습니다")

        if len(records) >= 2:
            sg_vals = [r.get("blood_sugar") for r in records[:2] if r.get("blood_sugar")]
            if len(sg_vals) >= 2 and all(v >= 126 for v in sg_vals):
                context_notes.append(f"최근 혈당이 다소 높게 나오고 있습니다")

        if chat_ctx.get("weekly_summaries"):
            last = chat_ctx["weekly_summaries"][0]
            if last.get("summary"):
                context_notes.append(f"지난 상담 메모: {last['summary'][:60]}")

        context_str = "\n".join(f"- {c}" for c in context_notes) if context_notes else "특별한 이슈 없음"
        name_str = f"{name}님" if name else "어르신"

        api_key = os.getenv("ANTHROPIC_API_KEY")
        client  = anthropic.Anthropic(api_key=api_key)

        prompt = (
            f"당신은 루미입니다. {name_str}이 지금 AI 상담 화면을 열었습니다.\n"
            f"현재 시간대: {time_label}\n"
            f"파악된 상황:\n{context_str}\n\n"
            "역할: 건강하고 친근하며 전문적인 친구이자 보호자.\n"
            "인사 작성 규칙:\n"
            f"1. '{name_str}'으로 부르며 시작\n"
            "2. 2~3문장 이내\n"
            "3. 특이사항이 있으면 걱정하는 친구처럼 자연스럽게 언급 (의학 용어 금지)\n"
            "4. 특이사항 없으면 시간대별 따뜻한 인사\n"
            "5. 마지막은 대화를 유도하는 부드러운 질문으로 마무리\n"
            "6. 이모지 사용 금지, 마크다운 사용 금지\n"
            "7. 시니어에게 편안한 존댓말"
        )

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"message": resp.content[0].text.strip()}
    except Exception as e:
        print(f"[proactive_greeting] {e}")
        try:
            name_fb = (get_supabase().table("users").select("name").eq("id", user_id).execute().data or [{}])[0].get("name","")
        except Exception:
            name_fb = ""
        return {"message": fallback_msg(name_fb)}
