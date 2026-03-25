from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase

router = APIRouter()


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_by: Optional[str] = None


class MembershipCreate(BaseModel):
    group_id: str
    user_id: str


@router.post("/")
def create_group(group: GroupCreate):
    db = get_supabase()
    result = db.table("community_groups").insert(group.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="그룹 생성 실패")
    return result.data[0]


@router.get("/")
def list_groups():
    db = get_supabase()
    result = db.table("community_groups").select("*").execute()
    return result.data


@router.get("/{group_id}")
def get_group(group_id: str):
    db = get_supabase()
    result = db.table("community_groups").select("*").eq("id", group_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    return result.data[0]


@router.post("/join")
def join_group(membership: MembershipCreate):
    db = get_supabase()
    result = db.table("group_memberships").insert(membership.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="그룹 가입 실패")
    return result.data[0]


@router.get("/{group_id}/members")
def get_members(group_id: str):
    db = get_supabase()
    result = db.table("group_memberships").select("*").eq("group_id", group_id).execute()
    return result.data
