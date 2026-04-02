from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase
import random, string

router = APIRouter()

class LinkRequest(BaseModel):
    senior_id: str
    senior_name: str

class JoinRequest(BaseModel):
    family_id: str
    family_name: str
    link_code: str

class FamilyStatus(BaseModel):
    senior_id: str

# 6자리 연결 코드 생성 (시니어)
@router.post("/generate-code")
def generate_code(req: LinkRequest):
    db = get_supabase()
    # 기존 코드 있으면 반환
    existing = db.table("family_links")\
        .select("*")\
        .eq("senior_id", req.senior_id)\
        .eq("status", "pending")\
        .execute()
    if existing.data:
        return {"code": existing.data[0]["link_code"]}
    # 새 코드 생성
    code = ''.join(random.choices(string.digits, k=6))
    db.table("family_links").insert({
        "senior_id": req.senior_id,
        "senior_name": req.senior_name,
        "link_code": code,
        "status": "pending",
    }).execute()
    return {"code": code}

# 가족이 코드로 연결
@router.post("/join")
def join_family(req: JoinRequest):
    db = get_supabase()
    link = db.table("family_links")\
        .select("*")\
        .eq("link_code", req.link_code)\
        .execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="유효하지 않은 코드입니다")
    if link.data[0]["status"] == "linked":
        raise HTTPException(status_code=400, detail="이미 연결된 코드입니다")
    db.table("family_links")\
        .update({"family_id": req.family_id, "family_name": req.family_name, "status": "linked"})\
        .eq("link_code", req.link_code)\
        .execute()
    return {"ok": True, "senior_name": link.data[0]["senior_name"], "senior_id": link.data[0]["senior_id"]}

# 연결된 가족 목록 조회
@router.get("/links/{user_id}")
def get_links(user_id: str):
    db = get_supabase()
    # 시니어로서 연결된 가족
    as_senior = db.table("family_links")\
        .select("*")\
        .eq("senior_id", user_id)\
        .eq("status", "linked")\
        .execute()
    # 가족으로서 연결된 시니어
    as_family = db.table("family_links")\
        .select("*")\
        .eq("family_id", user_id)\
        .eq("status", "linked")\
        .execute()
    return {
        "as_senior": as_senior.data or [],
        "as_family": as_family.data or [],
    }

# 시니어 오늘 현황 (가족용)
@router.get("/status/{senior_id}")
def get_senior_status(senior_id: str):
    db = get_supabase()
    from datetime import date
    today = date.today().isoformat()
    # 오늘 복용 기록
    logs = db.table("medication_logs")\
        .select("*")\
        .eq("user_id", senior_id)\
        .eq("date", today)\
        .execute()
    # 약 목록
    meds = db.table("medications")\
        .select("*")\
        .eq("user_id", senior_id)\
        .execute()
    total = len(logs.data) if logs.data else 0
    taken = sum(1 for l in (logs.data or []) if l.get("taken"))
    return {
        "medications": meds.data or [],
        "today_logs": logs.data or [],
        "summary": {"total": total, "taken": taken},
    }
