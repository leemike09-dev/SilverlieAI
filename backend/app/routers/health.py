from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date

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
