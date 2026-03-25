from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
from app.database import get_supabase
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

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


class CommunityMatchRequest(BaseModel):
    user_id: str
    health_data: dict
    available_groups: List[Any]


@router.post("/match")
def community_match(request: CommunityMatchRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY 없음")

    client = anthropic.Anthropic(api_key=api_key)

    groups_text = "\n".join([
        f"- {g.get('name', '')}: {g.get('category', '')} ({g.get('description', '')})"
        for g in request.available_groups[:10]
    ])

    prompt = f"""
사용자 건강 데이터: {request.health_data}

추천 가능한 커뮤니티 그룹:
{groups_text}

각 그룹에 대해 이 사용자와의 적합도(0-100)와 추천 이유를 분석해주세요.
JSON 형식: [{{"group_name": "...", "match_score": 85, "reason": "..."}}]
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        text = response.content[0].text
        start = text.find('[')
        end = text.rfind(']') + 1
        result = json.loads(text[start:end])
    except Exception:
        result = []

    return {"matches": result}
