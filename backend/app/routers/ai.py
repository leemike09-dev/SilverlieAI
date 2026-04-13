import os
import re
import json
import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from dotenv import load_dotenv
from ..database import get_supabase

load_dotenv()
router = APIRouter()

# Lumina 500 Q&A 지식베이스 로드
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
    '당뇨':        ['혈당','당뇨','인슐린','혈당'],
    '심혈관':      ['혈압','심장','맥박','콜레스테롤','흉통','가슴'],
    '관절/근골격': ['관절','무릎','허리','뼈','근육','통증'],
    '수면':        ['수면','잠','불면','피로','졸림'],
    '소화기':      ['소화','위','장','변비','설사','속쓰림'],
    '신경/기억력': ['기억','치매','두통','어지럼','어지럽'],
    '정신건강':    ['우울','불안','스트레스','기분','외로'],
    '생활습관':    ['운동','식단','체중','금연','음주','걷기'],
    '병원준비':    ['병원','검사','진료','의사','예약'],
}

EMERGENCY_WORDS = ['흉통','가슴통증','호흡곤란','숨막','마비','의식','쓰러','졸도','심정지']
DEFAULT_FOLLOWUP = [
    "이 증상이 생긴 정확한 시점을 의사에게 말씀드리세요.",
    "병원 방문 전 증상 기록을 적어두면 도움이 돼요.",
    "복용 중인 약이 있다면 이름과 용량을 미리 메모하세요.",
]

# Claude 답변에 포함된 [RISK:X] 토큰을 파싱하여 단계 판단
_RISK_PATTERN = re.compile(r'\[RISK:(LOW|MEDIUM|HIGH|CRITICAL)\]', re.IGNORECASE)
_RISK_MAP = {'LOW': 'low', 'MEDIUM': 'medium', 'HIGH': 'high', 'CRITICAL': 'critical'}


def detect_risk(reply: str) -> str:
    """Claude 답변에서 [RISK:X] 토큰 추출. 없으면 'normal' 반환."""
    m = _RISK_PATTERN.search(reply)
    if m:
        return _RISK_MAP.get(m.group(1).upper(), 'normal')
    return 'normal'


def strip_risk_token(reply: str) -> str:
    """사용자에게 보여줄 답변에서 [RISK:X] 토큰 제거."""
    return _RISK_PATTERN.sub('', reply).strip()


def get_suggested_questions(relevant_qa: List[dict]) -> List[str]:
    questions: List[str] = []
    for qa in relevant_qa:
        dqs = qa.get('answer_template', {}).get('doctor_questions', [])
        for q in dqs:
            if q not in questions:
                questions.append(q)
            if len(questions) >= 3:
                return questions
    if not questions:
        return DEFAULT_FOLLOWUP
    while len(questions) < 3:
        questions.append(DEFAULT_FOLLOWUP[len(questions) % len(DEFAULT_FOLLOWUP)])
    return questions[:3]


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
                score += 5
                break
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: -x[0])
    return [item for _, item in scored[:top_k]]


BASE_SYSTEM = """당신은 Silver Life AI의 건강 도우미 '꿀비'입니다.
60세 이상 시니어를 위한 건강 상담을 제공합니다.

== 단계적 위험도 판단 규칙 ==

1단계 (증상 첫 보고):
- 바로 판단하지 말고 핵심 질문 1~2개를 먼저 한다
- 예: "언제부터 그러셨나요?", "다른 증상도 함께 있나요?", "얼마나 심한가요?"
- 이 단계에서는 [RISK] 토큰 없이 질문만 한다

2단계 (충분한 정보 수집 후):
- 답변 마지막에 반드시 아래 중 하나를 붙인다:
  [RISK:LOW]      — 경미, 만성적, 일상에 지장 없음 → 일반 생활 조언
  [RISK:MEDIUM]   — 지속 시 병원 필요, 당장 응급 아님 → 병원 권고
  [RISK:HIGH]     — 오늘 내 병원 방문 필요, 빠른 조치 필요 → 강력 권고
  [RISK:CRITICAL] — 즉시 119 또는 응급실 (의식저하·마비·심한 흉통·호흡곤란 등) → 119 안내

판단 기준:
- LOW: 가벼운 피로, 가벼운 근육통, 만성 소화불량, 일반 안부
- MEDIUM: 며칠 지속되는 두통, 혈압 약간 높음, 소화 불량 반복
- HIGH: 흉통(경미하나 새로운 증상), 1주 이상 지속 증상, 복용약 부작용 의심
- CRITICAL: 갑작스러운 심한 흉통, 호흡곤란, 팔다리 마비, 의식 저하, 심한 두통

== 답변 형식 ==
- 질문 단계: 친근하게 1~2줄 + 핵심 질문 1~2개
- 판단 단계: 한 줄 요약 → 지금 할 일 2~3가지 → 병원 가야 할 신호 → [RISK:X]
- 단순 안부/일상은 형식 없이 2~3줄, [RISK] 토큰 생략

규칙:
- 쉽고 친근한 말투, 어려운 의학 용어 금지
- 진단·처방·약물 용량 변경 절대 금지
- 모든 의료 답변 끝(토큰 앞)에: "이 내용은 참고용이며 정확한 진단은 의사 선생님께 확인하세요"
- 칭찬/평가 금지, 자기소개 금지"""


def build_qa_context(relevant_qa: List[dict]) -> str:
    if not relevant_qa:
        return ""
    lines = ["\n=== 관련 의료 지식 (참고) ==="]
    for qa in relevant_qa:
        lines.append(f"\n[{qa['category_ko']} | 위험도: {qa['risk_level']}]")
        lines.append(f"유사 질문: {qa['question']}")
        tmpl = qa.get('answer_template', {})
        if tmpl.get('what_to_do_now'):
            lines.append("권장 행동: " + " / ".join(tmpl['what_to_do_now'][:2]))
        if tmpl.get('danger_signs'):
            lines.append("위험 신호: " + " / ".join(tmpl['danger_signs'][:2]))
        if tmpl.get('doctor_questions'):
            lines.append("의사 질문: " + " / ".join(tmpl['doctor_questions'][:2]))
        if qa.get('doctor_visit_needed'):
            lines.append("-> 의사 방문 필요")
    return "\n".join(lines)


def build_system_prompt(user: dict, relevant_qa: List[dict]) -> str:
    lines = [BASE_SYSTEM]
    lines.append("\n=== 사용자 개인 정보 ===")
    name = user.get("name")
    age  = user.get("age")
    gender = user.get("gender")
    region = user.get("region")
    if name:   lines.append(f"이름: {name}")
    if age:    lines.append(f"나이: {age}세")
    if gender: lines.append(f"성별: {gender}")
    if region: lines.append(f"거주지역: {region}")
    h = user.get("height")
    w = user.get("weight")
    if h and w:
        bmi = round(w / ((h/100)**2), 1)
        lines.append(f"키: {h}cm / 몸무게: {w}kg / BMI: {bmi}")
    diseases = user.get("chronic_diseases")
    if diseases:
        lines.append(f"만성질환: {', '.join(diseases)}")
    if user.get("taking_medication"):
        meds = user.get("medication_list", "")
        lines.append(f"복용 중인 약: {meds if meds else '있음'}")
    ex = user.get("exercise_frequency")
    sleep = user.get("sleep_hours")
    smoking = user.get("smoking")
    drinking = user.get("drinking")
    if ex:      lines.append(f"운동빈도: {ex}")
    if sleep:   lines.append(f"평균수면: {sleep}시간")
    if smoking is not None: lines.append(f"흡연: {'흡연 중' if smoking else '비흡연'}")
    if drinking: lines.append(f"음주: {drinking}")
    interests = user.get("interests")
    if interests:
        lines.append(f"관심분야: {', '.join(interests)}")
    lines.append(build_qa_context(relevant_qa))
    return "\n".join(lines)


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    language: str = "ko"
    history: Optional[List[HistoryMessage]] = []


@router.post("/chat")
def chat(request: ChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    relevant_qa = find_relevant_qa(request.message)

    system_prompt = BASE_SYSTEM + build_qa_context(relevant_qa)
    if request.user_id and request.user_id != "demo-user":
        try:
            db = get_supabase()
            result = db.table("users").select("*").eq("id", request.user_id).execute()
            if result.data:
                system_prompt = build_system_prompt(result.data[0], relevant_qa)
        except Exception:
            pass

    history = request.history or []
    messages = [{"role": m.role, "content": m.content} for m in history[-10:]]
    messages.append({"role": "user", "content": request.message})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=system_prompt,
            messages=messages,
        )
        reply_raw  = response.content[0].text
        risk       = detect_risk(reply_raw)
        reply_text = strip_risk_token(reply_raw)
        suggestions = get_suggested_questions(relevant_qa)

        # AI 상담 기록 DB 저장 (게스트/데모 제외)
        if request.user_id and request.user_id not in ("demo-user", "guest"):
            try:
                db = get_supabase()
                db.table("ai_chat_logs").insert([
                    {"user_id": request.user_id, "role": "user",      "message": request.message, "risk_level": "normal"},
                    {"user_id": request.user_id, "role": "assistant", "message": reply_text,       "risk_level": risk},
                ]).execute()
            except Exception as save_err:
                print(f"[ai_chat_logs] save error: {save_err}")

        return {
            "reply": reply_text,
            "risk_level": risk,
            "suggested_questions": suggestions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 오류: {str(e)}")


# ── AI 상담 기록 조회 ──────────────────────────────────────────
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


# ── 오늘 상담 요약 생성 (AI) ──────────────────────────────────
@router.post("/summary/{user_id}")
def generate_summary(user_id: str):
    db = get_supabase()
    today_str = date.today().isoformat()

    result = (
        db.table("ai_chat_logs")
        .select("role,message,risk_level")
        .eq("user_id", user_id)
        .gte("created_at", f"{today_str}T00:00:00")
        .execute()
    )
    logs = result.data
    if not logs:
        raise HTTPException(status_code=404, detail="오늘 상담 기록이 없습니다")

    conv_text = "\n".join([f"[{'이용자' if l['role']=='user' else 'AI'}] {l['message']}" for l in logs])
    has_risk = any(l.get("risk_level") in ("warning", "emergency") for l in logs)

    api_key = os.getenv("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=api_key)
    summary_res = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": (
                "아래 건강 상담 대화를 가족이 볼 수 있도록 3줄 이내로 한국어로 요약하세요.\n"
                "핵심 증상/질문, AI 권고사항, 위험 여부를 간결하게 포함하세요.\n"
                "형식: 오늘 상담 내용 요약\n\n" + conv_text
            ),
        }],
    )
    summary_text = summary_res.content[0].text

    # 오늘 날짜 요약이 이미 있으면 업데이트, 없으면 삽입
    existing = (
        db.table("ai_chat_summaries")
        .select("id")
        .eq("user_id", user_id)
        .eq("date", today_str)
        .execute()
    )
    if existing.data:
        db.table("ai_chat_summaries").update({"summary": summary_text, "has_risk": has_risk}).eq("id", existing.data[0]["id"]).execute()
    else:
        db.table("ai_chat_summaries").insert({"user_id": user_id, "summary": summary_text, "date": today_str, "has_risk": has_risk}).execute()

    return {"summary": summary_text, "date": today_str, "has_risk": has_risk}


# ── AI 상담 요약 목록 조회 ─────────────────────────────────────
@router.get("/summaries/{user_id}")
def get_summaries(user_id: str, limit: int = 7):
    db = get_supabase()
    result = (
        db.table("ai_chat_summaries")
        .select("id,summary,date,has_risk,created_at")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data
