from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_supabase
from app.auth import verify_token

router = APIRouter()

def _chk(authed_uid: str, user_id: str):
    if authed_uid != user_id:
        raise HTTPException(status_code=403, detail="본인 데이터만 조회할 수 있습니다.")

class AppointmentIn(BaseModel):
    id: str
    type: str = 'hospital'
    date: str
    time: Optional[str] = None
    hospital: Optional[str] = None
    title: Optional[str] = None
    dept: Optional[str] = None
    doctor: Optional[str] = None
    address: Optional[str] = None
    schedule_note: Optional[str] = None
    hospital_note: Optional[str] = None
    memo: Optional[str] = None
    travel: bool = False
    dest: Optional[str] = None

class SyncRequest(BaseModel):
    appointments: List[AppointmentIn]

@router.get("/{user_id}")
def get_appointments(user_id: str, authed_uid: str = Depends(verify_token)):
    _chk(authed_uid, user_id)
    db = get_supabase()
    res = db.table("appointments").select("*").eq("user_id", user_id).order("date").execute()
    return res.data or []

@router.post("/sync/{user_id}")
def sync_appointments(user_id: str, req: SyncRequest, authed_uid: str = Depends(verify_token)):
    """로컬 전체 목록을 서버에 덮어씀 (upsert)."""
    _chk(authed_uid, user_id)
    db = get_supabase()
    if not req.appointments:
        return {"ok": True, "count": 0}
    rows = [
        {
            "id": a.id, "user_id": user_id,
            "type": a.type, "date": a.date, "time": a.time,
            "hospital": a.hospital, "title": a.title,
            "dept": a.dept, "doctor": a.doctor, "address": a.address,
            "schedule_note": a.schedule_note, "hospital_note": a.hospital_note,
            "memo": a.memo, "travel": a.travel, "dest": a.dest,
        }
        for a in req.appointments
    ]
    db.table("appointments").upsert(rows, on_conflict="id").execute()
    return {"ok": True, "count": len(rows)}

@router.delete("/{user_id}/{appointment_id}")
def delete_appointment(user_id: str, appointment_id: str, authed_uid: str = Depends(verify_token)):
    _chk(authed_uid, user_id)
    db = get_supabase()
    db.table("appointments").delete().eq("user_id", user_id).eq("id", appointment_id).execute()
    return {"ok": True}
