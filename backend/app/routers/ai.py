import os
import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from ..database import get_supabase

load_dotenv()

router = APIRouter()

BASE_SYSTEM = """당신은 Silver Life AI의 건강 도우미 '꿀비'입니다.
60세 이상 시니어를 위한 건강 모니터링과 생활 조언을 제공합니다.

답변 규칙 (반드시 준수):
1. 반드시 4줄 이내로 짧게 답변하세요. 절대 그 이상 쓰지 마세요.
2. 인사말에는 한 줄로만 반갑게 답하고 바로 끝내세요.
3. 건강 질문 구조: 공감 한 줄 → 핵심 조언 한 줄 → 실천 방법 한 줄 → "더 궁금한 점 있으시면 말씀해주세요 😊"
4. 쉽고 친근한 언어, 어려운 의학 용어 사용 금지.
5. 자기소개, 장황한 설명 절대 금지.

💬 공감 표현 원칙:
- 사용자가 말한 내용에 직접 반응하는 공감을 쓰세요. (예: "혈압이 높다" → "혈압이 신경 쓰이시겠네요")
- 미리 정해진 표현을 끼워 넣지 말고, 그 상황에만 맞는 한 줄로 자연스럽게 공감하세요.
- 같은 공감 표현을 대화 중 반복하지 마세요.
- 칭찬하거나 평가하는 말투는 금지입니다. (예: "잘하셨어요", "좋아요" 등)

⚠️ 의료 안전 규칙 (최우선):
- 흉통, 호흡곤란, 갑작스러운 마비/저림, 심한 두통, 의식 저하 → 즉시 "119에 전화하세요!" 안내
- 진단, 처방, 약물 용량 변경은 절대 하지 말 것
- 증상이 2일 이상 지속되거나 악화되면 반드시 병원 방문 권유
- 모든 의료 조언 끝에: "⚕️ 정확한 진단은 의사 선생님께 꼭 확인하세요"
- AI의 답변은 참고용이며 의료 행위를 대체할 수 없음을 항상 인지"""


def build_system_prompt(user: dict) -> str:
    lines = [BASE_SYSTEM, "\n=== 사용자 개인 정보 (반드시 참고) ==="]

    name = user.get("name")
    age  = user.get("age")
    gender = user.get("gender")
    region = user.get("region")

    phone = user.get("phone")
    if name:  lines.append(f"이름: {name} (대화 시 이름으로 불러주세요)")
    if phone: lines.append(f"전화번호: {phone}")
    if age:   lines.append(f"나이: {age}세")
    if gender: lines.append(f"성별: {gender}")
    if region: lines.append(f"거주지역: {region}")

    h = user.get("height")
    w = user.get("weight")
    if h and w:
        bmi = round(w / ((h/100)**2), 1)
        lines.append(f"키: {h}cm / 몸무게: {w}kg / BMI: {bmi}")

    diseases = user.get("chronic_diseases")
    if diseases:
        lines.append(f"만성질환: {', '.join(diseases)} — 이 질환에 맞지 않는 조언은 제외하세요")

    if user.get("taking_medication"):
        meds = user.get("medication_list", "")
        lines.append(f"복용 중인 약: {meds if meds else '있음'} — 약 상호작용 주의")

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

    chat_style = user.get("chat_style", "짧고 핵심만")
    if chat_style == "자세하게":
        lines.append("\n답변 스타일: 사용자가 자세한 설명을 원합니다. 조금 더 풍부하게 설명하되 6줄을 넘기지 마세요.")
    else:
        lines.append("\n답변 스타일: 핵심만 4줄 이내로 짧게 답변하세요.")

    return "\n".join(lines)


class HistoryMessage(BaseModel):
    role: str   # "user" or "assistant"
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

    # 프로필 조회
    system_prompt = BASE_SYSTEM
    if request.user_id and request.user_id != "demo-user":
        try:
            db = get_supabase()
            result = db.table("users").select("*").eq("id", request.user_id).execute()
            if result.data:
                system_prompt = build_system_prompt(result.data[0])
        except Exception:
            pass

    # 대화 히스토리 구성 (최대 10개)
    history = request.history or []
    messages = [{"role": m.role, "content": m.content} for m in history[-10:]]
    messages.append({"role": "user", "content": request.message})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
        return {"reply": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 오류: {str(e)}")
