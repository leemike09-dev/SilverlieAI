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


# ── 프론트 MedicationScreen 전용 심플 API ──────────────────────────

class SimpleMedRequest(BaseModel):
    id: str
    name: str
    dosage: str = '1정'
    method: str = '식후'
    time_slot: str = 'morning'
    stock: int = 0

class ToggleRequest(BaseModel):
    user_id: str
    med_id: str
    field: str   # 'taken' | 'skipped'
    value: bool

def _med_to_front(med: dict, log: dict) -> dict:
    """medications 행 + medication_logs 행 → 프론트 포맷."""
    times = med.get('times') or []
    time_slot = med.get('time_slot') or (times[0] if times else 'morning')
    return {
        'id':       med['id'],
        'name':     med['name'],
        'dosage':   med.get('dosage') or '1정',
        'method':   med.get('method') or '식후',
        'timeSlot': time_slot,
        'stock':    med.get('stock') or 0,
        'taken':    log.get('status') == 'taken',
        'skipped':  log.get('status') == 'skipped',
    }

@router.get("/today/{user_id}")
def get_today_meds(user_id: str):
    """오늘 복약 현황 포함 약 목록 (프론트 MedicationScreen용)."""
    db = get_supabase()
    today = date.today().isoformat()
    meds = db.table("medications").select("*").eq("user_id", user_id).order("created_at").execute().data or []
    logs_list = db.table("medication_logs").select("*").eq("user_id", user_id).eq("date", today).execute().data or []
    logs = {l['medication_id']: l for l in logs_list}
    return [_med_to_front(m, logs.get(m['id'], {})) for m in meds]

@router.post("/add-simple/{user_id}")
def add_med_simple(user_id: str, med: SimpleMedRequest):
    """약 추가 (프론트 단순 포맷)."""
    db = get_supabase()
    try:
        db.table("medications").insert({
            "id":        med.id,
            "user_id":   user_id,
            "name":      med.name,
            "dosage":    med.dosage,
            "method":    med.method,
            "time_slot": med.time_slot,
            "stock":     med.stock,
            "times":     [med.time_slot],
        }).execute()
    except Exception as e:
        print(f"[add_med_simple] {e}")
        return {"ok": False, "note": str(e)}
    return {"ok": True}

@router.put("/toggle")
def toggle_med_status(req: ToggleRequest):
    """복용/건너뜀 토글 (오늘 날짜 기준)."""
    db = get_supabase()
    today = date.today().isoformat()
    status = None
    if req.field == 'taken'   and req.value: status = 'taken'
    if req.field == 'skipped' and req.value: status = 'skipped'

    existing = db.table("medication_logs").select("id") \
        .eq("user_id", req.user_id) \
        .eq("medication_id", req.med_id) \
        .eq("date", today).execute().data

    if status is None:
        if existing:
            db.table("medication_logs").delete().eq("id", existing[0]["id"]).execute()
    elif existing:
        db.table("medication_logs").update({"taken": req.field == 'taken', "status": status}) \
            .eq("id", existing[0]["id"]).execute()
    else:
        db.table("medication_logs").insert({
            "user_id":         req.user_id,
            "medication_id":   req.med_id,
            "medication_name": "",
            "scheduled_time":  req.field,
            "date":            today,
            "taken":           req.field == 'taken',
            "status":          status,
        }).execute()
    return {"ok": True}

@router.delete("/delete/{user_id}/{med_id}")
def delete_med_v2(user_id: str, med_id: str):
    db = get_supabase()
    db.table("medications").delete().eq("id", med_id).eq("user_id", user_id).execute()
    db.table("medication_logs").delete().eq("medication_id", med_id).eq("user_id", user_id).execute()
    return {"ok": True}
