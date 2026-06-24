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

# Lumi 상담창 지식베이스 로드
_KB_ENTRIES: List[dict] = []
try:
    _kb_path = os.path.join(os.path.dirname(__file__), '..', 'lumi-chat-kb.json')
    with open(_kb_path, 'r', encoding='utf-8') as _f:
        _kb_data = json.load(_f)
        _KB_ENTRIES = _kb_data.get('entries', [])
    print(f'[Lumi KB] {len(_KB_ENTRIES)}개 항목 로드 완료')
except Exception as _e:
    print(f'[WARNING] Lumi KB 로드 실패: {_e}')


def build_kb_context() -> str:
    """지식베이스 항목을 시스템 프롬프트 grounding 블록으로 변환."""
    if not _KB_ENTRIES:
        return ""
    risk_ko = {'info': '정보', 'caution': '주의', 'urgent': '긴급'}
    lines = ["\n[Lumi 상담 지식베이스 — 도메인별 답변 가이드]",
             "아래 항목의 answerTemplate은 답변 방향 가이드다. {슬롯}은 사용자 실제 데이터로 채워라.",
             "guardrails(금지)와 riskLevel(위험도)을 반드시 따를 것.\n"]
    for e in _KB_ENTRIES:
        risk = risk_ko.get(e.get('riskLevel', 'info'), '정보')
        lines.append(f"[{e['id']} | {risk}] {e['intent']}")
        tmpl = e.get('answerTemplate', '')
        if tmpl:
            # 너무 길면 첫 150자만
            lines.append(f"  답변방향: {tmpl[:150]}{'...' if len(tmpl) > 150 else ''}")
        guards = e.get('guardrails', [])
        if guards:
            lines.append(f"  금지: {' / '.join(guards)}")
        lines.append("")
    return "\n".join(lines)

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

# LLM 우회 즉시 응급 라우팅 — KB urgent entries의 keywords에서 단일 생성 (이원화 방지)
def _build_urgent_bypass_words() -> list:
    kws = [
        kw for e in _KB_ENTRIES
        if e.get('riskLevel') == 'urgent'
        for kw in e.get('keywords', [])
    ]
    if kws:
        return kws
    # KB 로드 실패 시 최소 보호망
    return ['가슴이 아파', '가슴이 답답', '숨이 차', '호흡곤란',
            '넘어졌', '뇌졸중', '심정지', '팔에 힘이 없', '말이 어눌']

URGENT_BYPASS_WORDS: list = _build_urgent_bypass_words()

# 응급 게이트 정밀화 상수 — "지금·본인/눈앞 사람"일 때만 응급
_URGENT_NOW_KW = ['지금', '방금', '갑자기', '지금 당장', '이 순간', '지금 막', '막 시작']
_URGENT_PAST_ANCHOR_RE = re.compile(
    r'\d+\s*(?:개월|달|년|주일?)\s*전'          # 6개월 전, 2년 전, 3일 전
    r'|예전에?|과거에?|어렸을\s*때'
    r'|작년|재작년|지난\s*해|지난\s*달|지난번에?'
)
_URGENT_HISTORY_KW = [
    '병력', '가족력', '수술했었', '쓰러진 적', '진단받았었',
    '앓으셨', '돌아가셨', '세상을 떠나', '기왕력',
]

def is_urgent_bypass(message: str) -> bool:
    """응급 게이트 — '지금·본인/눈앞 사람에게 벌어지는 일'일 때만 bypass.
    1) 현재성 신호(지금/갑자기 등) → 주어 불문 즉시 응급
    2) 명백한 과거·이력 서술 → 응급 제외 (일반 대화로)
    3) 애매하면 응급 유지 (놓치는 것보다 거짓경보가 안전)
    """
    if not any(w in message for w in URGENT_BYPASS_WORDS):
        return False
    # 1) 현재성 신호 → 무조건 응급
    if any(kw in message for kw in _URGENT_NOW_KW):
        return True
    # 2) 과거 시점 고정 또는 이력/병력 서술 → 응급 아님
    if _URGENT_PAST_ANCHOR_RE.search(message) or any(k in message for k in _URGENT_HISTORY_KW):
        return False
    # 3) 의심스러우면 응급 유지
    return True

URGENT_HARDCODED_REPLY = (
    "[RISK:CRITICAL] 지금 증상은 한시가 급할 수 있어요. "
    "무리하게 움직이지 마시고, 바로 **119**에 전화해 주세요. "
    "가족분께도 알려주세요."
)

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
                        weather_str: Optional[str] = None,
                        session_facts: Optional[list] = None,
                        confirmed_observations: Optional[list] = None) -> str:
    p   = health_ctx.get('profile', {}) or {}
    meds_raw = health_ctx.get('medications', []) or []
    rec = health_ctx.get('today_record', {}) or {}

    name   = user.get('name') or p.get('name', '어르신')
    age    = user.get('age') or p.get('age', '')
    gender = user.get('gender') or p.get('gender', '')

    # 현재 만성질환: conditions(신규 배열) → diseases(구 배열/문자열) 순으로 폴백
    conditions_raw = p.get('conditions') or p.get('diseases') or p.get('chronic_diseases') or user.get('chronic_diseases') or []
    if isinstance(conditions_raw, list):
        diseases_list = conditions_raw
    else:
        diseases_list = [c.strip() for c in str(conditions_raw).split(',') if c.strip()]
    diseases = ', '.join(diseases_list) if diseases_list else '없음'

    # 과거 병력: PastEvent[] (신규) → history string[] (구) 순으로 폴백
    past_raw = p.get('pastHistory') or p.get('history') or []
    past_lines = []
    for ev in past_raw:
        if isinstance(ev, dict):
            label   = ev.get('label', '')
            status  = ev.get('status', '')
            year    = ev.get('year', '')
            status_ko = '완치됨' if status == 'resolved' else ('치료 중' if status == 'ongoing' else '')
            parts_ev = [label]
            if year:       parts_ev.append(f"{year}년")
            if status_ko:  parts_ev.append(status_ko)
            past_lines.append(' '.join(parts_ev))
        elif isinstance(ev, str) and ev.strip():
            past_lines.append(ev.strip())
    past_history = ', '.join(past_lines) if past_lines else '없음'

    # 가족력
    family_raw = p.get('familyHistory') or []
    family_history = ', '.join(family_raw) if family_raw else '없음'

    surg_list = p.get('surgeries', []) or []
    surgeries = ', '.join(
        [f"{s.get('name','')}({s.get('year','')})" for s in surg_list if s.get('name')]
    ) if surg_list else '없음'

    allergy_parts = []
    if p.get('drugAllergies'):  allergy_parts.append(', '.join(p['drugAllergies']))
    if p.get('foodAllergies'):  allergy_parts.append(', '.join(p['foodAllergies']))
    if p.get('allergyNote'):    allergy_parts.append(p['allergyNote'])
    # 신형 단일 allergies 문자열 폴백 (Supabase JSONB 직접 경로 포함)
    if not allergy_parts and p.get('allergies'):
        allergy_parts.append(str(p['allergies']))
    allergies = ' / '.join(allergy_parts) or '없음'

    # 복용 로그 맵 (맥락 신호 계산에도 사용하므로 if 블록 밖에서 빌드)
    logs_today = health_ctx.get('today_med_logs', []) or []
    log_map: dict = {}
    for lg in logs_today:
        _mid = lg.get('medication_id', '')
        if _mid not in log_map:
            log_map[_mid] = {}
        log_map[_mid][lg.get('scheduled_time', '')] = lg.get('taken', False)

    if meds_raw:
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

    # 오늘 기분 (AsyncStorage mood.uid.date → 클라이언트 전송)
    today_mood = health_ctx.get('mood') or ''
    mood_negative = today_mood in ('걱정돼요', '힘들어요')
    mood_neutral  = today_mood == '그저그래요'

    # 최근 7일 건강 기록 트렌드 (오늘 포함)
    records_7d = health_ctx.get('health_records', [])

    # ── 오늘 맥락 신호: 평소값 대비 비교 (LLM이 직접 계산하게 하지 않음) ──
    h_now = datetime.now().hour
    past_recs = [r for r in records_7d[1:] if r]  # 오늘 제외 과거 최대 6일

    def _avg(field: str) -> float | None:
        vals = [float(r[field]) for r in past_recs if r.get(field)]
        return sum(vals) / len(vals) if vals else None

    def _cmp(today_v, avg_v, unit='', pos_thr=5, neg_thr=None) -> str:
        """오늘 vs 평소 비교 문자열."""
        neg_thr = neg_thr if neg_thr is not None else pos_thr
        diff = float(today_v) - avg_v
        if diff > pos_thr:   return f"평소 {avg_v:.0f}{unit}보다 높음"
        if diff < -neg_thr:  return f"평소 {avg_v:.0f}{unit}보다 낮음"
        return f"평소 {avg_v:.0f}{unit}와 비슷"

    ctx_signals: list = []

    # 혈압
    if bp_s and bp_d:
        avg_s, avg_d = _avg('blood_pressure_systolic'), _avg('blood_pressure_diastolic')
        if avg_s and avg_d:
            ctx_signals.append(f"혈압: {bp_s}/{bp_d} ({_cmp(bp_s, avg_s, pos_thr=8)} — 수축기 평소 {avg_s:.0f})")
        else:
            ctx_signals.append(f"혈압: {bp_s}/{bp_d} (평소 데이터 없음)")

    # 혈당
    if sugar_val:
        avg_g = _avg('blood_sugar')
        if avg_g:
            ctx_signals.append(f"혈당: {sugar_val} mg/dL ({_cmp(sugar_val, avg_g, pos_thr=10)})")
        else:
            ctx_signals.append(f"혈당: {sugar_val} mg/dL")

    # 걸음 — 시간대가 결정적
    steps_val = rec.get('steps')
    if steps_val:
        if h_now < 12:
            ctx_signals.append(f"걸음: {int(steps_val):,}보 — 오전 {h_now}시 기준 (하루 진행 중, 종일 목표 비교 절대 금지)")
        else:
            avg_st = _avg('steps')
            if avg_st:
                diff_pct = (float(steps_val) - avg_st) / avg_st * 100
                cmp_st = f"평소 {avg_st:.0f}보보다 {'많음' if diff_pct > 15 else '적음' if diff_pct < -15 else '비슷'}"
                ctx_signals.append(f"걸음: {int(steps_val):,}보 ({cmp_st})")
            else:
                ctx_signals.append(f"걸음: {int(steps_val):,}보")

    # 수면
    sl_val = rec.get('sleep_hours')
    if sl_val:
        avg_sl = _avg('sleep_hours')
        if avg_sl:
            ctx_signals.append(f"수면: {sl_val}h ({_cmp(sl_val, avg_sl, unit='h', pos_thr=0.5)})")
        else:
            ctx_signals.append(f"수면: {sl_val}h")

    # 심박수
    if rec.get('heart_rate'):
        ctx_signals.append(f"심박수: {rec['heart_rate']}bpm")

    # 체중
    if rec.get('weight'):
        ctx_signals.append(f"체중: {rec['weight']}kg")

    # 기분 — 이미 알고 있음, 재확인 금지
    if today_mood:
        mood_hint = " (공감 먼저, 수치 나중)" if mood_negative else ""
        ctx_signals.append(f"기분: {today_mood} — 홈에서 이미 선택됨. 루미는 알고 있음. 다시 묻지 말 것{mood_hint}")

    # 미복용 약 감지 → 슬롯4 확인 행동 지정
    missed_meds: list = []
    for m in meds_raw:
        m_id = m.get('id', '')
        for t in (m.get('times') or []):
            if log_map.get(m_id, {}).get(t) is False:
                missed_meds.append(f"{m.get('name','')}({t})")
    if missed_meds:
        ctx_signals.append(f"미복용 감지: {', '.join(missed_meds)} → 슬롯4: '{missed_meds[0].split('(')[0]} 오늘 챙기셨어요?' 한 마디 확인")

    ctx_signals_str = "\n".join(f"  • {s}" for s in ctx_signals) if ctx_signals else "  • 오늘 측정값 없음 (일상·감정 대화 모드로)"
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

    # DeepProfile 신규 필드
    blood_type   = p.get('bloodType', '')
    blood_rh     = p.get('bloodRh', '')
    blood_str    = f"{blood_type}{blood_rh}" if blood_type else ''
    living       = p.get('living', '')
    routine      = p.get('routine') or {}
    wake_at      = routine.get('wakeAt', '')
    sleep_at     = routine.get('sleepAt', '')
    address      = p.get('address', '')      # 호칭 (루미가 부르는 이름)
    speech_style = p.get('speechStyle', '')  # '정중하게' | '친근하게'
    interests    = p.get('interests', []) or []
    worries      = p.get('worries',   []) or []

    # 호칭: address 설정 시 사용, 아니면 name+'님'
    call_name = address if address else (f"{name}님" if name else '어르신')

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
        + (
            "· 이 사용자는 '정중하게' 말투를 선호합니다. 격식 있는 존댓말을 유지하세요.\n"
            if speech_style == '정중하게' else
            "· 이 사용자는 '친근하게' 말투를 선호합니다. 따뜻하고 편안하게 대화하세요.\n"
            if speech_style == '친근하게' else ""
        )
        + "· 정돈되고 우아한 한국어 사용 — 직접적보다 부드럽고 따뜻하게\n"
        "· 놀람·걱정·안타까움 표현 시 한국 여성 특유의 추임새 자연스럽게 사용: '어머', '어머나', '저런', '어떡해요', '세상에', '아이고' 등 — 억지스럽지 않게 상황에 맞게\n"
        "· 걱정은 수줍게: '마음이 쓰이는걸요', '조금 걱정이 되어서요'\n"
        "· 기쁨은 품위 있게: '참 다행이에요', '마음이 따뜻해지는 소식이네요'\n"
        "· 권유는 부드럽게: '~해 보시겠어요?', '~하시면 어떨까요' — 명령형 금지\n"
        "· 의학 정보는 정확하되 온기 있게 전달 — 딱딱하거나 사무적인 표현 금지\n"
        "· 쉬운 한국어 (의학 용어 최소화, 필요 시 풀어서 설명)\n"
        f"· 이 사용자를 부를 때는 반드시 '{call_name}'으로 호칭할 것\n"
        "· 답변은 3~5문장, 마크다운(*, #, **) 사용 금지\n\n"
        "[환자 정보]\n"
        f"이름: {name}" + (f" ({age_gender})" if age_gender else "") + "\n"
        f"호칭: {call_name}\n"
        + (f"혈액형: {blood_str}\n" if blood_str else "")
        + f"현재 만성질환: {diseases}\n"
        f"과거 병력: {past_history}\n"
        f"가족력: {family_history}\n"
        f"수술 경력: {surgeries}\n"
        f"알레르기: {allergies}\n"
        f"현재 복용약: {meds_str}\n"
        f"생활습관: {habits}\n"
        + (f"생활형태: {living}\n" if living else "")
        + (f"기상시간: {wake_at} / 취침: {sleep_at}\n" if (wake_at or sleep_at) else "")
        + (f"관심사: {', '.join(interests)}\n" if interests else "")
        + (f"걱정거리: {', '.join(worries)}\n" if worries else "")
        + f"최근 7일 건강 기록:\n{trend_str}\n"
        + (f"[실시간 날씨 데이터] {weather_str} (GPS 기반 실시간 수집 완료)\n" if weather_str else "")
        + "\n"
        f"[오늘 맥락 신호 — 답변 생성 전 가장 먼저 확인할 것]\n"
        f"{ctx_signals_str}\n\n"
        + (_fmt_confirmed_observations(confirmed_observations) if confirmed_observations else "")
        + (
            "[오늘 파악한 사실 — 사용자가 직접 말한 내용(원문 인용)]\n"
            + _fmt_session_facts(session_facts) + "\n"
            "⚠️ 언급 시 '아까 말씀하신 것처럼' 형태로 인용. 사용자가 부정하면 즉시 무시.\n"
            "⚠️ 현재 발화·응급 라우팅을 이 사실이 덮어쓰지 않는다.\n\n"
            if session_facts else ""
        )
        + "[건강 평가·답변 가이드 — 반드시 준수]\n"
        "답변을 만들기 전에 아래 맥락 신호를 먼저 확인하고, 신호에 따라 말이 달라져야 한다.\n\n"
        "▶ 맥락 신호 우선순위\n"
        "① 복용약 — '혈압약 복용 중'이면 이미 진료 중. '병원 가보세요' 금지. 복약 확인 + 다음 진료 기록 활용.\n"
        "② 과거 병력 — 완치됐어도 민감도 달라짐. 암 이력+하락 추세→worried 분기. 뇌졸중 이력+혈압 급등→즉각 주의.\n"
        "③ 시간대 — 아침에 걸음수 부족은 '하루 막 시작'. 목표 안내만, 비교·질책 금지.\n"
        "④ 추세 — 단발 수치로 경보 금지. 며칠 이어질 때만 언급.\n"
        "⑤ 측정 시점 — 식후 혈당이 높은 건 자연스러움. 맥락 없이 '위험' 금지.\n\n"
        "▶ 4슬롯 답변 틀 (건강 평가 시 적용)\n"
        "  슬롯1 인사·시점: 시간대 반영해 짧게 (좋은 아침 / 오늘 하루 어떠셨어요)\n"
        + ("  → 오늘 기분이 '걱정돼요' 또는 '힘들어요': 인사 앞에 한 마디 공감 먼저 ('많이 무거우셨겠어요', '마음이 쓰이는걸요'). 건강 수치는 두 번째.\n" if mood_negative else
           "  → 오늘 기분이 '그저그래요': 격려보다 중립 인사. 수치 나열 금지.\n" if mood_neutral else "")
        + "  슬롯2 오늘의 관찰: 가장 의미 있는 지표 1~2개만. 정상 지표 줄줄이 나열 금지.\n"
        + ("  → 기분이 부정적인 날: 주의 지표가 없어도 먼저 기분에 공감하고 수치는 간단히.\n" if mood_negative else "")
        + "  슬롯3 맥락 해석: 왜 이 수치인지 — 약·프로필·추세·시점을 엮어 한 줄. 인구 평균이 아닌 그 사람 평소와 비교.\n"
        + "  슬롯4 한 가지 행동: 지금·여기서 가능한 것 하나. 질책·과제 금지.\n"
        + (f"  → 미복용 감지 시: 슬롯4를 '{missed_meds[0].split('(')[0]} 오늘 챙기셨어요?' 한 마디로 끝낼 것. 다른 행동 불필요.\n" if missed_meds else "")
        + "  하단 고정: '의학적 진단이 아니라, 기록을 보고 드리는 도움말이에요.'\n\n"
        "▶ 절대 금지 가드레일\n"
        "  ✗ 오전에 부분-누적 걸음을 종일 목표와 비교\n"
        "  ✗ 이미 복약 중인 질환에 '병원 가보세요' (복약=이미 진료 중)\n"
        "  ✗ 단발 수치로 경보 (며칠 이어질 때만)\n"
        "  ✗ 정상 지표를 장황히 칭찬·나열\n"
        "  ✗ 진단·처방 표현 ('고혈압입니다', '~를 드세요')\n"
        "  ✗ 식후 혈당을 공복 기준으로 판정\n"
        + ("  ✗ 기분이 '걱정돼요/힘들어요'인데 수치 나열로 시작하기 — 공감 먼저\n" if mood_negative else "")
        + "\n"
        "▶ 케이스 예시 (같은 수치, 맥락이 다르면 답이 달라야 한다)\n"
        "  CASE A: 아침 걸음 1200보 → '오늘 목표 8000보예요. 천천히 시작해 볼까요?' (질책 금지)\n"
        "  CASE B: 혈압 145/92 + 혈압약 복용 중 → '혈압약 잊지 않고 드셨어요? 며칠 이어지면 다음 진료 때 보여드려요.' ('병원 가세요' 금지)\n"
        "  CASE C: 혈압 150/95 + 복약 없음 → '한 번 더 재보시고, 며칠 이어지면 병원에서 봐드리는 게 좋아요.'\n"
        "  CASE D: 수면 5h + 평소 6.5h → '평소보다 조금 짧았어요. 낮엔 무리 마시고 잠깐 쉬어가세요.' (7시간 기준 질책 금지)\n"
        "  CASE E: 전 지표 정상 → '오늘 컨디션 좋아 보여요. 어제처럼만 지내시면 충분해요.' (지표 나열 금지)\n"
        "  CASE F: 암 이력 + 최근 활동 감소 추세 → '요 며칠 활동이 줄어든 것 같아 같이 살펴보고 싶어요. 다음 진료 때 이 기록을 보여드리면 좋아요.' (겁주지 않기)\n"
        "  CASE G: 뇌졸중 이력 + 혈압 급등 → 민감도↑, '뇌졸중 겪으셨던 만큼 조심하는 게 좋아요. 편히 쉬시고 며칠 이어지면 알려드릴게요.'\n"
        "  CASE H: 혈당 165 + 당뇨약 복용 중 → '식사 후라 조금 높을 수 있어요. 약 챙겨 드셨으면 너무 걱정 마세요.'\n\n"
        + build_kb_context()
        + "[답변 원칙]\n"
        + (f"1. 첫 번째 답변이므로 반드시 '{call_name}'으로 시작할 것\n" if turn_count == 0 else
           f"1. 두 번째 이후 답변: '{call_name}'으로 시작하지 말 것. 자연스럽게 대화를 이어갈 것\n")
        +
        "2. 질문 의도를 먼저 파악 (건강/여가/감정/일상)\n"
        "3. 건강 질문: 위 건강 정보 참고, 복용약·알레르기 반드시 고려. 트렌드·기록 문의 시 [최근 7일 건강 기록]의 수치를 그대로 인용할 것 (예: '5월 14일 혈압 120/80이셨어요')\n"
        "4. 여가·문화 질문: 시니어 친화 활동을 품위 있게 추천 (접근성·체력 고려)\n"
        "5. 감정·외로움: 공감 먼저, 판단 금지, 가족·커뮤니티는 자연스럽게만\n"
        "6. 일상·잡담: 벗처럼 가볍고 품위 있게, 억지로 건강과 연결하지 말 것\n"
        f"7. 알레르기 안전 필터 — 위 [환자 정보]의 알레르기({allergies})를 모든 권유 전 먼저 확인:\n"
        "   · 해당 약물 절대 추천 금지\n"
        "   · 해당 식품 절대 권유 금지 (예: 견과류 알레르기 → 아몬드·땅콩·호두 등 모두 금지)\n"
        "   · '없음'으로 명시된 경우에만 일반 식이·약물 권유 허용\n"
        "   · 알레르기 정보가 '없음'이 아니고 불확실할 때는 권유 전 '혹시 [식품/약물] 괜찮으세요?' 먼저 확인\n"
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
    if not allergy_parts and p.get('allergies'):
        allergy_parts.append(str(p['allergies']))
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


# ── ③ 핵심 사실 메모리 (session_facts) ──────────────────────────────────────

_FACT_TYPES       = {'병원예약', '약변경', '증상지속', '감정상태', '생활변화', '가족력'}
# Phase 2: 프로필 승격이 의미 있는 타입만 (시간 한정·의료 판단 제외)
_PROMOTABLE_TYPES = {'감정상태', '생활변화', '가족력'}

_FACT_EXTRACT_PROMPT = """\
사용자 발언을 보고 '현재 저장된 사실' 목록을 갱신하세요.

[규칙 — 엄수]
1. 정의된 6가지 type 외 저장 금지. 진단·의료적 추론·결론 저장 절대 금지.
   예) "무릎 3일째 아파요" → 증상지속 ✓  /  "관절염인 것 같아요" → 추론이므로 ✗
       "어머니가 6개월 전 뇌출혈로 쓰러지셨어요" → 가족력{subject:'어머니',detail:'뇌출혈'} ✓
2. verbatim: 사용자 원문 그대로. 해석·요약·재표현 금지.
3. confidence=high: 사용자가 명확히 말한 것만. 애매하면 해당 항목 제외.
4. 반환값 = 기존 목록 전체(모순 제거) + 이번 발언의 신규 사실.
   ⚠ 이번 발언에 새 사실·모순 없으면 기존 목록을 그대로 반환(지우지 말 것).
   ⚠ 모순 시 해당 기존 사실만 제거, 나머지 유지.
5. 추출 불확실 → 해당 항목 제외(빈 값이 틀린 값보다 낫다).

[타입 스키마]
- 병원예약: when(오늘/어제/내일/날짜), hospital(기관명 or null), specialty(과 or null)
- 약변경:   detail(원문 그대로), since(시점 or null)
- 증상지속: symptom(증상명), days(일수 int or null), severity(심함/보통/가벼움 or null)
- 감정상태: emotion(원문), since(시점 or null)
- 생활변화: detail(원문 그대로), since(시점 or null)
- 가족력:   subject(어머니/아버지/가족 등), detail(병명·사건), when(시점 or null)

[현재 저장된 사실]:
{existing}

[사용자 발언]:
{user_msg}

JSON 배열만 반환 (설명 금지). 각 항목: type, verbatim, confidence(high), + 타입별 필드.
변화 없으면 기존 목록 그대로 반환."""


def _load_session_facts(user_id: str, db) -> list:
    """오늘 session_facts 로드. 테이블 없거나 오류 시 빈 리스트(묵음)."""
    try:
        today = date.today().isoformat()
        r = db.table("session_facts").select("facts").eq("user_id", user_id).eq("session_date", today).execute()
        if r.data:
            return r.data[0].get("facts") or []
    except Exception as e:
        print(f"[session_facts/load] {e}")
    return []


def _save_session_facts(user_id: str, facts: list, db) -> None:
    """오늘 session_facts upsert."""
    try:
        today = date.today().isoformat()
        db.table("session_facts").upsert({
            "user_id":      user_id,
            "session_date": today,
            "facts":        facts,
            "updated_at":   datetime.now(timezone.utc).isoformat(),
        }, on_conflict="user_id,session_date").execute()
    except Exception as e:
        print(f"[session_facts/save] {e}")


def _extract_and_save_facts_background(user_id: str, user_msg: str, api_key: str) -> None:
    """백그라운드: Haiku로 구조화 추출 → 스키마 검증 → upsert."""
    try:
        db       = get_supabase()
        existing = _load_session_facts(user_id, db)
        client   = anthropic.Anthropic(api_key=api_key)
        prompt   = _FACT_EXTRACT_PROMPT.format(
            existing=json.dumps(existing, ensure_ascii=False) if existing else "[]",
            user_msg=user_msg,
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        m = re.search(r'\[.*\]', raw, re.DOTALL)
        if not m:
            return  # 파싱 불가 → 기존 유지
        parsed: list = json.loads(m.group(0))
        # 스키마 검증: type ∈ _FACT_TYPES + confidence=high + verbatim 존재
        valid = [
            f for f in parsed
            if isinstance(f, dict)
            and f.get('type') in _FACT_TYPES
            and f.get('confidence') == 'high'
            and f.get('verbatim', '').strip()
        ]
        # 안전장치: 추출 결과가 빈 배열 + 기존 사실이 있을 때
        # → 사용자 발언에 부정·정정 표현이 없으면 Haiku 오작동으로 보고 기존 유지
        # → 부정 표현이 있으면 정정으로 간주, 기존 삭제 허용
        _NEGATION_KW = ['아니요', '아니에요', '아닌데', '안 했', '안했', '그게 아니', '틀렸', '잘못', '안 바꿨', '안 아파', '없어졌', '다 나았', '취소']
        if not valid and existing:
            if not any(kw in user_msg for kw in _NEGATION_KW):
                return  # 무관한 발언 → 기존 유지
        if valid != existing:
            _save_session_facts(user_id, valid, db)
            print(f"[session_facts] {user_id} → {len(valid)}개 저장")
        # Phase 2: 승격 가능 타입만 관찰 누적
        if valid:
            _merge_facts_to_observations(user_id, valid, db)
    except Exception as e:
        print(f"[session_facts/bg] {e}")


# ── Phase 2: 관찰 후보 지속화 (session_observations) ─────────────────────────

def _merge_facts_to_observations(user_id: str, facts: list, db) -> None:
    """session_facts → session_observations 누적 (count++, cross-session).
    승격 가능 타입(_PROMOTABLE_TYPES)만 저장."""
    today = date.today().isoformat()
    for f in facts:
        fact_type = f.get('type', '')
        verbatim  = f.get('verbatim', '').strip()
        if not verbatim or fact_type not in _PROMOTABLE_TYPES:
            continue
        try:
            r = (db.table("session_observations")
                   .select("id,count")
                   .eq("user_id", user_id)
                   .eq("fact_type", fact_type)
                   .eq("verbatim", verbatim)
                   .limit(1)
                   .execute())
            value_data = {k: v for k, v in f.items() if k not in ('type', 'verbatim', 'confidence')}
            if r.data:
                obs = r.data[0]
                db.table("session_observations").update({
                    "count":     obs["count"] + 1,
                    "last_seen": today,
                    "value":     value_data,
                }).eq("id", obs["id"]).execute()
            else:
                db.table("session_observations").insert({
                    "user_id":    user_id,
                    "fact_type":  fact_type,
                    "verbatim":   verbatim,
                    "value":      value_data,
                    "first_seen": today,
                    "last_seen":  today,
                    "count":      1,
                    "source":     "self",
                    "confirmed":  False,
                    "promoted":   False,
                }).execute()
        except Exception as e:
            print(f"[obs/merge:{fact_type}] {e}")


def _get_promotion_candidates(user_id: str, db) -> list:
    """count>=2이고 미승격·미확인 관찰 중 가장 빈도 높은 1개 반환."""
    try:
        r = (db.table("session_observations")
               .select("id,fact_type,verbatim,count,first_seen")
               .eq("user_id", user_id)
               .eq("confirmed", False)
               .eq("promoted", False)
               .gte("count", 2)
               .order("count", desc=True)
               .limit(1)
               .execute())
        return r.data or []
    except Exception as e:
        print(f"[obs/candidates] {e}")
        return []


def _fmt_confirmed_observations(obs_list: list) -> str:
    """확인된 관찰 → 시스템 프롬프트 삽입용 텍스트."""
    if not obs_list:
        return ""
    lines = []
    for o in obs_list:
        dt = (o.get('confirmed_at') or '')[:10]
        tag = o.get('fact_type', '')
        v   = o.get('verbatim', '')
        lines.append(f"  • [{tag}] \"{v}\"" + (f" ({dt})" if dt else ""))
    return (
        "[루미가 기억하는 것 — 이전 대화에서 사용자가 직접 확인한 내용]\n"
        + "\n".join(lines) + "\n"
        "⚠️ 자연스러운 틈에만 한 세션 최대 1회 언급. 집요하게 반복 금지.\n\n"
    )


def _fmt_session_facts(facts: list) -> str:
    """session_facts → 시스템 프롬프트 삽입용 텍스트."""
    lines = []
    for f in facts:
        t = f.get('type', '')
        v = f.get('verbatim', '')
        extra_parts = []
        if t == '증상지속':
            if f.get('symptom'): extra_parts.append(f.get('symptom'))
            if f.get('days'):    extra_parts.append(f"{f['days']}일 지속")
        elif t == '병원예약':
            if f.get('when'):    extra_parts.append(f.get('when'))
            if f.get('hospital'): extra_parts.append(f.get('hospital'))
        elif t in ('약변경', '생활변화', '감정상태'):
            if f.get('since'):   extra_parts.append(f.get('since'))
        extra = f" ({', '.join(extra_parts)})" if extra_parts else ''
        lines.append(f"  • [{t}] \"{v}\"{extra}")
    return "\n".join(lines)


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
    client_mood:        Optional[str]  = None
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
        'mood':         request.client_mood,
    }
    # 클라이언트가 7일 기록을 보내면 먼저 채워둠 (클라이언트 데이터 우선)
    print(f"[chat/records] client_records_7d count={len(request.client_records_7d) if request.client_records_7d else 0}")
    if request.client_records_7d:
        health_ctx['health_records'] = request.client_records_7d
        if not health_ctx['today_record'] and request.client_records_7d:
            health_ctx['today_record'] = request.client_records_7d[0]

    chat_ctx = None
    session_facts: list = []
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
            session_facts = _load_session_facts(request.user_id, db)
            # Phase 2: 확인된 관찰 (profile.confirmedObservations 에서 읽음)
            _p = health_ctx.get('profile') or {}
            confirmed_obs: list = _p.get('confirmedObservations') or []
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
                                        weather_str=request.client_weather,
                                        session_facts=session_facts or None,
                                        confirmed_observations=confirmed_obs or None)
    history_msgs = [{"role": m.role, "content": m.content} for m in (request.history or [])[-10:]]
    model        = choose_model(history_msgs, request.message)
    ai_messages  = history_msgs + [{"role": "user", "content": request.message}]

    async def event_gen():
        import re as _re

        # ── 응급 우선 라우팅 — LLM 호출 없이 즉시 119 안내 ──────────────────
        if is_urgent_bypass(request.message):
            yield f"data: {json.dumps({'token': URGENT_HARDCODED_REPLY}, ensure_ascii=False)}\n\n"
            sos_sent = False
            if request.user_id and request.user_id not in ("demo-user", "guest"):
                uname = user_row.get('name', '사용자')
                background_tasks.add_task(_send_family_alert, request.user_id, uname)
                background_tasks.add_task(
                    _save_chat_turn, request.user_id, request.message,
                    URGENT_HARDCODED_REPLY, 'critical', 'bypass'
                )
                sos_sent = True
            yield f"data: {json.dumps({'done': True, 'risk_level': 'critical', 'doctor_memo_needed': False, 'doctor_memo': None, 'is_final': False, 'sos_sent': sos_sent, 'profile_updates': []}, ensure_ascii=False)}\n\n"
            return

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
            # ③ 핵심 사실 메모리: 응급·일상 대화 제외하고 추출
            if request.intent not in ("daily",) and not is_urgent_bypass(request.message):
                background_tasks.add_task(
                    _extract_and_save_facts_background,
                    request.user_id, request.message, api_key
                )

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

        # Phase 2: 승격 후보 조회 (background task가 이전 턴 관찰을 이미 저장한 경우에 반환)
        promotion_candidates: list = []
        if request.user_id and request.user_id not in ("demo-user", "guest") and db:
            try:
                promotion_candidates = _get_promotion_candidates(request.user_id, db)
            except Exception:
                pass

        yield f"data: {json.dumps({'done': True, 'risk_level': risk, 'doctor_memo_needed': doctor_memo_needed, 'doctor_memo': doctor_memo, 'is_final': is_final_flag, 'sos_sent': sos_sent, 'profile_updates': profile_updates, 'promotion_candidates': promotion_candidates}, ensure_ascii=False)}\n\n"

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

    # 응급 키워드 — 스트리밍과 동일한 우선순위 처리
    if is_urgent_bypass(request.message):
        if request.user_id and request.user_id not in ("demo-user", "guest"):
            background_tasks.add_task(_send_family_alert, request.user_id, "사용자")
            background_tasks.add_task(_save_chat_turn, request.user_id, request.message,
                                      URGENT_HARDCODED_REPLY, 'critical', 'bypass')
        return {
            "reply": URGENT_HARDCODED_REPLY,
            "risk_level": "critical",
            "doctor_memo_needed": False,
            "doctor_memo": None,
            "is_final": False,
            "sos_sent": True,
            "profile_updates": [],
        }

    relevant_qa = find_relevant_qa_vector(request.message)
    user_row: dict = {}
    health_ctx: dict = {
        'profile':      request.client_profile or {},
        'medications':  request.client_meds    or [],
        'today_record': request.client_record  or {},
        'mood':         request.client_mood,
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


# ── Phase 2: 관찰 승격 엔드포인트 ─────────────────────────────────────────────

class PromoteRequest(BaseModel):
    user_id:        str
    observation_id: str
    action:         str            # 'accept' | 'reject' | 'snooze'
    fact_type:      Optional[str] = None
    verbatim:       Optional[str] = None


@router.post("/promote")
def promote_observation(req: PromoteRequest):
    """관찰 후보 승격 처리.
    accept → session_observations 확인 + health_profile.confirmedObservations 추가.
    reject → promoted=True 로 마킹 (다시 제안 안 함).
    snooze → DB 변경 없음 (프론트에서만 닫기).
    4제약 안전선: 자동 승격 없음 — 반드시 사용자 action 필요."""
    if not req.user_id or req.user_id in ("demo-user", "guest"):
        return {"ok": False, "reason": "no_user"}

    if req.action == 'snooze':
        return {"ok": True}

    try:
        db  = get_supabase()
        now = datetime.now(timezone.utc).isoformat()

        if req.action == 'reject':
            db.table("session_observations").update({"promoted": True}).eq("id", req.observation_id).execute()
            return {"ok": True}

        if req.action == 'accept':
            # 1. session_observations 승격 처리
            db.table("session_observations").update({
                "confirmed":    True,
                "confirmed_at": now,
                "promoted":     True,
                "promoted_at":  now,
            }).eq("id", req.observation_id).execute()

            # 2. health_profile.confirmedObservations 추가 (중복 방지)
            res  = db.table("users").select("health_profile").eq("id", req.user_id).execute()
            prof: dict = (res.data[0].get("health_profile") or {}) if res.data else {}

            confirmed_obs: list = prof.get("confirmedObservations") or []
            already = any(o.get("id") == req.observation_id for o in confirmed_obs)
            if not already:
                confirmed_obs.append({
                    "id":           req.observation_id,
                    "fact_type":    req.fact_type  or "",
                    "verbatim":     req.verbatim   or "",
                    "confirmed_at": now,
                    "source":       "self-confirmed",
                })
                prof["confirmedObservations"] = confirmed_obs

                # 가족력이면 familyHistory에도 원문 추가
                if req.fact_type == '가족력' and req.verbatim:
                    fh = prof.get("familyHistory") or []
                    if req.verbatim not in fh:
                        fh.append(req.verbatim)
                        prof["familyHistory"] = fh

                fs = prof.get("fieldSources") or {}
                fs["confirmedObservations"] = "self-confirmed"
                prof["fieldSources"] = fs

                db.table("users").update({"health_profile": prof}).eq("id", req.user_id).execute()
                print(f"[promote/accept] {req.user_id}: {req.fact_type} → confirmedObservations")

            return {"ok": True, "confirmed_observations": confirmed_obs}

    except Exception as e:
        print(f"[promote] {e}")
        return {"ok": False, "reason": str(e)}
