import os
import json
import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
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

# Claude 답변 내용 기반 판단 — 맥락 이해가 되므로 오판 최소화
EMERGENCY_REPLY_SIGNALS = ['119', '즉시 응급', '지금 바로 응급', '응급실로']
WARNING_REPLY_SIGNALS   = ['병원 방문', '진료를 받', '의사에게 확인', '검사를 받', '빨리 병원']


def detect_risk(message: str, reply: str) -> str:
    if any(w in reply for w in EMERGENCY_REPLY_SIGNALS):
        return "emergency"
    if any(w in reply for w in WARNING_REPLY_SIGNALS):
        return "warning"
    return "normal"


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

응급 최우선 규칙:
- 흉통, 호흡곤란, 갑작스러운 마비/저림, 심한 두통, 의식 저하 -> 즉시 "119에 전화하세요!" 첫 줄에 표시
- 진단, 처방, 약물 용량 변경은 절대 금지

답변 형식 (6가지 항목으로 구성):
1. 한 줄 요약: 지금 상황을 한 줄로
2. 지금 할 일: 2~3가지 (짧게)
3. 이럴 때 병원: 위험 신호 1~2가지
4. 의사에게: 진료 시 꼭 말할 한 문장
5. 물어볼 질문: 의사에게 물어볼 1~2가지
6. 가족에게: 가족이 알아야 할 한 줄

규칙:
- 각 항목은 1~3줄로 짧게
- 쉽고 친근한 말투, 어려운 의학 용어 금지
- 단순 안부/일상 질문은 형식 없이 친근하게 2~3줄만 답변
- 모든 의료 답변 끝에: "이 내용은 참고용이며 정확한 진단은 의사 선생님께 확인하세요"
- 칭찬/평가 금지"""


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
        reply_text = response.content[0].text
        risk = detect_risk(request.message, reply_text)
        suggestions = get_suggested_questions(relevant_qa)
        return {
            "reply": reply_text,
            "risk_level": risk,
            "suggested_questions": suggestions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 오류: {str(e)}")
