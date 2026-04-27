from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase

router = APIRouter()


class SOSPushRequest(BaseModel):
    user_id: str
    name: Optional[str] = ''


@router.post("/sos-push")
def sos_push(req: SOSPushRequest):
    """SOS 발생 시 연결된 가족 전원의 알림함에 긴급 알림 기록."""
    db = get_supabase()
    try:
        links = db.table("family_links").select("family_id").eq("senior_id", req.user_id).eq("status", "connected").execute()
        family_ids = [r["family_id"] for r in (links.data or []) if r.get("family_id")]
    except Exception:
        family_ids = []

    inserted = 0
    for fid in family_ids:
        try:
            db.table("notifications").insert({
                "user_id": fid,
                "title":   f"🚨 {req.name or '사용자'}님 SOS 발생",
                "body":    "앱에서 동선과 상태를 확인해주세요.",
                "is_read": False,
            }).execute()
            inserted += 1
        except Exception:
            pass

    return {"ok": True, "notified": inserted}


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    body: Optional[str] = None


@router.post("/")
def create_notification(notification: NotificationCreate):
    db = get_supabase()
    result = db.table("notifications").insert(notification.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="알림 생성 실패")
    return result.data[0]


@router.get("/{user_id}")
def get_notifications(user_id: str):
    db = get_supabase()
    result = db.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data


@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: str):
    db = get_supabase()
    result = db.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다")
    return result.data[0]
