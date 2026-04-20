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
    source: Optional[str] = 'manual'  # 'manual' | 'wearable'


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
    # 실제 health_records 테이블에 존재하는 컬럼만 포함
    ALLOWED = {"user_id", "date", "blood_pressure_systolic", "blood_pressure_diastolic",
               "heart_rate", "blood_sugar", "weight", "steps", "notes"}
    try:
        db = get_supabase()
        raw = record.model_dump()
        raw["date"] = str(raw["date"])
        # 허용된 컬럼 + None 제외
        data = {k: v for k, v in raw.items() if k in ALLOWED and v is not None}
        result = db.table("health_records").insert(data).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="건강 기록 저장 실패")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB 오류: {str(e)}")


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


class RecommendRequest(BaseModel):
    user_id: str
    user_name: str
    age: int
    interests: Optional[List[str]] = []
    steps: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    weight_kg: Optional[float] = None
    heart_rate: Optional[int] = None


@router.post("/recommendations")
def get_recommendations(request: RecommendRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY 없음")

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""
{request.user_name}({request.age}세) 시니어의 건강 데이터:
- 관심사: {', '.join(request.interests) if request.interests else '없음'}
- 걸음수: {request.steps or 'N/A'}보
- 혈압: {request.blood_pressure_systolic or 'N/A'}/{request.blood_pressure_diastolic or 'N/A'} mmHg
- 체중: {request.weight_kg or 'N/A'}kg
- 심박수: {request.heart_rate or 'N/A'}bpm

이 시니어에게 맞는 활동 6가지를 추천해주세요.
관심사를 고려하여 개인화된 추천을 해주세요.
카테고리는 운동/문화/사교/두뇌 중에서 선택하세요.
매칭 점수는 건강 데이터와 관심사 기반으로 70~99 사이로 설정하세요.

반드시 다음 JSON 형식으로만 답변하세요:
{{
  "recommendations": [
    {{
      "category": "운동",
      "emoji": "🚶",
      "title": "활동명",
      "desc": "설명 (2문장 이내)",
      "tags": ["태그1", "태그2", "태그3"],
      "match": 92
    }}
  ]
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        text = response.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        result = json.loads(text[start:end])
    except Exception:
        result = {"recommendations": []}

    return {"data": result}


class UpdateHealthRecord(BaseModel):
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    blood_sugar: Optional[float] = None
    weight: Optional[float] = None
    steps: Optional[int] = None
    notes: Optional[str] = None


@router.put("/records/{record_id}")
def update_health_record(record_id: str, record: UpdateHealthRecord):
    from app.database import get_supabase
    db = get_supabase()
    updates = {k: v for k, v in record.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")
    result = db.table("health_records").update(updates).eq("id", record_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다")
    return result.data[0]


@router.delete("/records/{record_id}")
def delete_health_record(record_id: str):
    from app.database import get_supabase
    db = get_supabase()
    result = db.table("health_records").delete().eq("id", record_id).execute()
    return {"success": True}


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


class ExerciseRequest(BaseModel):
    user_id: str
    user_name: str
    age: int
    steps: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    weight_kg: Optional[float] = None
    blood_sugar: Optional[float] = None
    language: Optional[str] = 'ko'


@router.post("/exercise-recommendation")
def exercise_recommendation(request: ExerciseRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY 없음")

    client = anthropic.Anthropic(api_key=api_key)

    lang_map = {
        'ko': '한국어',
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
    }
    lang_label = lang_map.get(request.language or 'ko', '한국어')

    bp_status = ''
    if request.blood_pressure_systolic:
        if request.blood_pressure_systolic >= 140:
            bp_status = '고혈압 (격렬한 운동 주의)'
        elif request.blood_pressure_systolic >= 120:
            bp_status = '혈압 주의 범위'
        else:
            bp_status = '정상 혈압'

    hr_status = ''
    if request.heart_rate:
        if request.heart_rate > 100:
            hr_status = '심박수 높음 (운동 강도 조절 필요)'
        elif request.heart_rate < 60:
            hr_status = '서맥 (의사 확인 권장)'
        else:
            hr_status = '정상 심박수'

    prompt = f"""
당신은 시니어 운동 전문가입니다. 아래 {request.age}세 시니어의 오늘 건강 수치를 바탕으로 
오늘 할 수 있는 운동 3가지를 처방해주세요.

[오늘의 건강 수치]
- 걸음수: {request.steps or 'N/A'}보
- 혈압: {request.blood_pressure_systolic or 'N/A'}/{request.blood_pressure_diastolic or 'N/A'} mmHg {bp_status}
- 심박수: {request.heart_rate or 'N/A'} bpm {hr_status}
- 체중: {request.weight_kg or 'N/A'} kg
- 혈당: {request.blood_sugar or 'N/A'} mg/dL

건강 수치에 맞는 안전하고 효과적인 운동을 추천하세요.
고혈압이나 심박수가 높으면 저강도 운동 위주로 추천하세요.

반드시 {lang_label}로 답변하고, 다음 JSON 형식으로만 답변하세요:
{{
  "exercises": [
    {{
      "emoji": "🚶",
      "name": "운동 이름",
      "duration": "20분",
      "method": "방법 설명 (2-3문장)",
      "caution": "주의사항 (건강 수치 기반)",
      "intensity": "저강도"
    }}
  ]
}}
intensity는 저강도/중강도/고강도 중 하나.
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        text = response.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        result = json.loads(text[start:end])
    except Exception:
        result = {"exercises": []}

    return {"data": result}
