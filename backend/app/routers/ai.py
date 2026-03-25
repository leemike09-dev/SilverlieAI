import os
import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """당신은 Silver Life AI의 건강 도우미입니다.
60세 이상 시니어를 위한 건강 모니터링과 생활 조언을 제공합니다.
답변은 쉽고 친근한 언어로, 간결하게 작성하세요.
의학적 진단은 하지 않으며, 이상 증상이 있으면 반드시 의사 상담을 권유하세요."""


class ChatRequest(BaseModel):
    message: str
    language: str = "ko"  # ko, zh, en


@router.post("/chat")
def chat(request: ChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": request.message}],
    )

    return {"reply": response.content[0].text}
