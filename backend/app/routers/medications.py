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
    total_quantity: Optional[int] = None
    med_type: Optional[str] = "처방약"

class MedicationLog(BaseModel):
    user_id: str
    medication_id: str
    medication_name: str
    scheduled_time: str
    date: str
    taken: bool = True
    status: Optional[str] = "taken"

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
    existing = db.table("medication_logs") \
        .select("id") \
        .eq("user_id", log.user_id) \
        .eq("medication_id", log.medication_id) \
        .eq("scheduled_time", log.scheduled_time) \
        .eq("date", log.date) \
        .execute()
    if existing.data:
        db.table("medication_logs") \
            .update({"taken": log.taken, "status": log.status}) \
            .eq("id", existing.data[0]["id"]) \
            .execute()
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

@router.get("/log/{user_id}/{log_date}")
def get_logs(user_id: str, log_date: str):
    db = get_supabase()
    res = db.table("medication_logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("date", log_date) \
        .execute()
    return res.data or []

@router.get("/taken-count/{user_id}/{med_id}")
def get_taken_count(user_id: str, med_id: str):
    db = get_supabase()
    res = db.table("medication_logs") \
        .select("id") \
        .eq("user_id", user_id) \
        .eq("medication_id", med_id) \
        .eq("taken", True) \
        .execute()
    return {"count": len(res.data or [])}

@router.get("/low-stock/{user_id}")
def get_low_stock(user_id: str):
    """잔여량이 7일치 이하인 약 목록 반환 — 가족/시니어 알림용"""
    db = get_supabase()
    meds = db.table("medications").select("*").eq("user_id", user_id).execute().data or []

    low = []
    for med in meds:
        total_qty = med.get("total_quantity")
        if not total_qty:
            continue
        taken_res = db.table("medication_logs") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("medication_id", med["id"]) \
            .eq("taken", True) \
            .execute()
        taken = len(taken_res.data or [])
        remaining = max(0, total_qty - taken)
        doses_per_day = len(med.get("times") or [])
        days_left = (remaining // doses_per_day) if doses_per_day > 0 else 0

        if days_left <= 7:
            low.append({
                "id": med["id"],
                "name": med["name"],
                "med_type": med.get("med_type", "처방약"),
                "remaining_qty": remaining,
                "days_left": days_left,
                "color": med.get("color", "#4CAF50"),
            })

    # 긴급순 정렬 (days_left 적은 순)
    low.sort(key=lambda x: x["days_left"])
    return low
