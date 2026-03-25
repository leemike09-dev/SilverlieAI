from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


class HealthRecord(BaseModel):
    user_id: str
    date: date
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    blood_sugar: Optional[float] = None
    weight: Optional[float] = None
    steps: Optional[int] = None
    notes: Optional[str] = None


class HealthData(BaseModel):
    user_id: str
    user_name: str
    age: int
    steps: int
    blood_pressure_systolic: int
    blood_pressure_diastolic: int
    sleep_hours: float
    weight_kg: float
    blood_sugar: Optional[float] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    condition: str = "보통"
    interests: Optional[List[str]] = []


class WeeklyDataItem(BaseModel):
    date: str
    steps: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    sleep_hours: Optional[float] = None
    weight_kg: Optional[float] = None


class ReportRequest(BaseModel):
    user_id: str
    user_name: str
    age: int
    weekly_data: List[WeeklyDataItem]


@router.get("/ping")
def ping():
    return {"status": "ok"}


@router.post("/records")
def create_health_record(record: HealthRecord):
    from app.database import get_supabase
    db = get_supabase()
    result = db.table("health_records").insert(record.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="건강 기록 저장 실패")
    return result.data[0]


@router.get("/records/{user_id}")
def get_health_records(user_id: str):
    from app.database import get_supabase
    db = get_supabase()
    result = db.table("health_records").select("*").eq("user_id", user_id).order("date", desc=True).execute()
    return {"user_id": user_id, "records": result.data}


@router.get("/history/{user_id}")
def get_health_history(user_id: str, days: int = 7):
    from app.database import get_supabase
    db = get_supabase()
    result = db.table("health_records").select("*").eq("user_id", user_id).order("date", desc=True).limit(days).execute()
    return {"user_id": user_id, "records": result.data}


@router.post("/analyze")
def analyze_health(data: HealthData):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY 없음")

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""
시니어 건강 데이터를 분석해주세요:
- 이름: {data.user_name}, 나이: {data.age}세
- 걸음수: {data.steps}보
- 혈압: {data.blood_pressure_systolic}/{data.blood_pressure_diastolic} mmHg
- 수면: {data.sleep_hours}시간
- 체중: {data.weight_kg}kg
- 오늘 컨디션: {data.condition}
- 관심사: {', '.join(data.interests) if data.interests else '없음'}

다음 형식으로 답변하세요:
1. 한 줄 종합 평가 (summary)
2. 개선 포인트 3가지 (insights)

JSON 형식: {{"summary": "...", "insights": ["...", "...", "..."]}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        text = response.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        result = json.loads(text[start:end])
    except Exception:
        result = {"summary": response.content[0].text, "insights": []}

    return {"data": result}


@router.post("/weekly-report")
def weekly_report(request: ReportRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY 없음")

    client = anthropic.Anthropic(api_key=api_key)

    weekly_summary = "\n".join([
        f"- {item.date}: 걸음수 {item.steps or 'N/A'}, 수면 {item.sleep_hours or 'N/A'}시간, 혈압 {item.blood_pressure_systolic or 'N/A'}/{item.blood_pressure_diastolic or 'N/A'}"
        for item in request.weekly_data
    ])

    prompt = f"""
{request.user_name}({request.age}세)의 주간 건강 데이터:
{weekly_summary}

주간 리포트를 작성해주세요. JSON 형식:
{{
  "health_score": 0-100 숫자,
  "summary": "한 줄 요약",
  "achievements": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선할 점 1", "개선할 점 2"],
  "recommendation": "이번 주 핵심 권고사항"
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        text = response.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        result = json.loads(text[start:end])
    except Exception:
        result = {"health_score": 70, "summary": response.content[0].text, "achievements": [], "improvements": [], "recommendation": ""}

    return {"data": result}
