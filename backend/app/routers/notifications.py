from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase

router = APIRouter()


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
