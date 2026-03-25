from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_supabase

router = APIRouter()


class UserCreate(BaseModel):
    email: str
    name: str
    age: Optional[int] = None
    language: Optional[str] = "ko"


@router.post("/")
def create_user(user: UserCreate):
    db = get_supabase()
    # 이미 존재하는 이메일이면 기존 사용자 반환
    existing = db.table("users").select("*").eq("email", user.email).execute()
    if existing.data:
        return existing.data[0]
    result = db.table("users").insert(user.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="사용자 생성 실패")
    return result.data[0]


@router.get("/{user_id}")
def get_user(user_id: str):
    db = get_supabase()
    result = db.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return result.data[0]


@router.get("/")
def list_users():
    db = get_supabase()
    result = db.table("users").select("*").execute()
    return result.data
