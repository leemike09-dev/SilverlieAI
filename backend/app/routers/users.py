from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_supabase
import bcrypt

router = APIRouter()


class UserCreate(BaseModel):
    email: str
    name: str
    age: Optional[int] = None
    language: Optional[str] = "ko"


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    language: Optional[str] = "ko"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(req: RegisterRequest):
    db = get_supabase()
    existing = db.table("users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")
    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    result = db.table("users").insert({
        "email": req.email,
        "name": req.name,
        "language": req.language,
        "password_hash": password_hash,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="회원가입 실패")
    user = result.data[0]
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


@router.post("/login")
def login(req: LoginRequest):
    db = get_supabase()
    result = db.table("users").select("*").eq("email", req.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다.")
    user = result.data[0]
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="비밀번호가 설정되지 않은 계정입니다.")
    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다.")
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


@router.post("/")
def create_user(user: UserCreate):
    db = get_supabase()
    existing = db.table("users").select("*").eq("email", user.email).execute()
    if existing.data:
        return existing.data[0]
    result = db.table("users").insert(user.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="사용자 생성 실패")
    return result.data[0]


class UpdateUserRequest(BaseModel):
    age: Optional[int] = None
    interests: Optional[List[str]] = None
    language: Optional[str] = None
    notification_health: Optional[bool] = None
    notification_community: Optional[bool] = None
    notification_ai: Optional[bool] = None


@router.put("/{user_id}")
def update_user(user_id: str, req: UpdateUserRequest):
    db = get_supabase()
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="업데이트할 데이터가 없습니다.")
    result = db.table("users").update(update_data).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
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
