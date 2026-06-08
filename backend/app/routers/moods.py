from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.database import get_supabase

router = APIRouter()

class MoodEntry(BaseModel):
    date: str
    mood_index: int

class MoodSyncRequest(BaseModel):
    logs: List[MoodEntry]

@router.get("/{user_id}")
def get_moods(user_id: str):
    db = get_supabase()
    res = db.table("mood_logs").select("date,mood_index").eq("user_id", user_id).order("date", desc=True).limit(90).execute()
    return res.data or []

@router.post("/sync/{user_id}")
def sync_moods(user_id: str, req: MoodSyncRequest):
    """기분 로그 전체를 upsert."""
    db = get_supabase()
    if not req.logs:
        return {"ok": True, "count": 0}
    rows = [{"user_id": user_id, "date": e.date, "mood_index": e.mood_index} for e in req.logs]
    db.table("mood_logs").upsert(rows, on_conflict="user_id,date").execute()
    return {"ok": True, "count": len(rows)}
