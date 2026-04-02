from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_supabase
from datetime import date

router = APIRouter()

class Medication(BaseModel):
    user_id: str
    name: str
    dosage: Optional[str] = ""
    times: List[str] = []   # ["08:00", "12:00", "19:00"]
    color: Optional[str] = "#4CAF50"

class MedicationLog(BaseModel):
    user_id: str
    medication_id: str
    medication_name: str
    scheduled_time: str
    date: str
    taken: bool = True

# 약 목록 조회
@router.get("/{user_id}")
def get_medications(user_id: str):
    db = get_supabase()
    res = db.table("medications").select("*").eq("user_id", user_id).execute()
    return res.data or []

# 약 추가
@router.post("/add")
def add_medication(med: Medication):
    db = get_supabase()
    res = db.table("medications").insert({
        "user_id": med.user_id,
        "name": med.name,
        "dosage": med.dosage,
        "times": med.times,
        "color": med.color,
    }).execute()
    return res.data[0] if res.data else {}

# 약 삭제
@router.delete("/{med_id}")
def delete_medication(med_id: str):
    db = get_supabase()
    db.table("medications").delete().eq("id", med_id).execute()
    return {"ok": True}

# 복용 기록 저장
@router.post("/log")
def log_medication(log: MedicationLog):
    db = get_supabase()
    # 기존 기록 있으면 업데이트
    existing = db.table("medication_logs")\
        .select("id")\
        .eq("user_id", log.user_id)\
        .eq("medication_id", log.medication_id)\
        .eq("scheduled_time", log.scheduled_time)\
        .eq("date", log.date)\
        .execute()
    if existing.data:
        res = db.table("medication_logs")\
            .update({"taken": log.taken})\
            .eq("id", existing.data[0]["id"])\
            .execute()
    else:
        res = db.table("medication_logs").insert({
            "user_id": log.user_id,
            "medication_id": log.medication_id,
            "medication_name": log.medication_name,
            "scheduled_time": log.scheduled_time,
            "date": log.date,
            "taken": log.taken,
        }).execute()
    return {"ok": True}

# 날짜별 복용 기록 조회
@router.get("/log/{user_id}/{date}")
def get_logs(user_id: str, date: str):
    db = get_supabase()
    res = db.table("medication_logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .eq("date", date)\
        .execute()
    return res.data or []
