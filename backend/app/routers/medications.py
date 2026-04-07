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
    times: List[str] = []
    color: Optional[str] = "#4CAF50"
    total_quantity: Optional[int] = None   # 총 수량 (정/캡슐)
    med_type: Optional[str] = "처방약"  # 처방약 | 영양제

class MedicationLog(BaseModel):
    user_id: str
    medication_id: str
    medication_name: str
    scheduled_time: str
    date: str
    taken: bool = True
    status: Optional[str] = "taken"   # taken | skipped | snoozed

@router.get("/{user_id}")
def get_medications(user_id: str):
    db = get_supabase()
    res = db.table("medications").select("*").eq("user_id", user_id).execute()
    return res.data or []

@router.post("/add")
def add_medication(med: Medication):
    db = get_supabase()
    payload = {
        "user_id": med.user_id,
        "name": med.name,
        "dosage": med.dosage,
        "times": med.times,
        "color": med.color,
    }
    if med.total_quantity is not None:
        payload["total_quantity"] = med.total_quantity
    if med.med_type:
        payload["med_type"] = med.med_type
    res = db.table("medications").insert(payload).execute()
    return res.data[0] if res.data else {}

@router.delete("/{med_id}")
def delete_medication(med_id: str):
    db = get_supabase()
    db.table("medications").delete().eq("id", med_id).execute()
    return {"ok": True}

@router.post("/log")
def log_medication(log: MedicationLog):
    db = get_supabase()
    existing = db.table("medication_logs")        .select("id")        .eq("user_id", log.user_id)        .eq("medication_id", log.medication_id)        .eq("scheduled_time", log.scheduled_time)        .eq("date", log.date)        .execute()
    if existing.data:
        db.table("medication_logs")            .update({"taken": log.taken, "status": log.status})            .eq("id", existing.data[0]["id"])            .execute()
    else:
        db.table("medication_logs").insert({
            "user_id": log.user_id,
            "medication_id": log.medication_id,
            "medication_name": log.medication_name,
            "scheduled_time": log.scheduled_time,
            "date": log.date,
            "taken": log.taken,
            "status": log.status or "taken",
        }).execute()
    return {"ok": True}

@router.get("/log/{user_id}/{date}")
def get_logs(user_id: str, date: str):
    db = get_supabase()
    res = db.table("medication_logs")        .select("*")        .eq("user_id", user_id)        .eq("date", date)        .execute()
    return res.data or []

# 전체 복용 기록 수 (잔여량 계산용)
@router.get("/taken-count/{user_id}/{med_id}")
def get_taken_count(user_id: str, med_id: str):
    db = get_supabase()
    res = db.table("medication_logs")        .select("id")        .eq("user_id", user_id)        .eq("medication_id", med_id)        .eq("taken", True)        .execute()
    return {"count": len(res.data or [])}
