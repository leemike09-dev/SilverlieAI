import os
import requests as http_requests
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
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    region: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_type: Optional[str] = None
    chronic_diseases: Optional[List[str]] = None
    taking_medication: Optional[bool] = None
    medication_list: Optional[str] = None
    exercise_frequency: Optional[str] = None
    sleep_hours: Optional[float] = None
    smoking: Optional[bool] = None
    drinking: Optional[str] = None
    chat_style: Optional[str] = None
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



class KakaoLoginRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/kakao-login")
def kakao_login(req: KakaoLoginRequest):
    client_id = os.getenv("KAKAO_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=500, detail="카카오 설정이 되지 않았습니다.")

    # 1) 인가 코드 → 액세스 토큰 교환
    token_res = http_requests.post(
        "https://kauth.kakao.com/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "redirect_uri": req.redirect_uri,
            "code": req.code,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if token_res.status_code != 200:
        raise HTTPException(status_code=401, detail="카카오 토큰 발급 실패")
    access_token = token_res.json().get("access_token")

    # 2) 사용자 정보 조회
    user_res = http_requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if user_res.status_code != 200:
        raise HTTPException(status_code=401, detail="카카오 사용자 정보 조회 실패")
    kakao_data = user_res.json()

    kakao_id   = str(kakao_data.get("id", ""))
    account    = kakao_data.get("kakao_account", {})
    profile    = account.get("profile", {})
    kakao_name  = profile.get("nickname") or "카카오사용자"
    kakao_email = account.get("email") or f"kakao_{kakao_id}@kakao.local"

    # 3) DB에서 사용자 찾기 또는 생성
    db = get_supabase()
    existing = db.table("users").select("*").eq("email", kakao_email).execute()
    if existing.data:
        user = existing.data[0]
    else:
        result = db.table("users").insert({
            "email": kakao_email,
            "name": kakao_name,
            "language": "ko",
        }).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="사용자 생성 실패")
        user = result.data[0]

    return {"id": user["id"], "name": user["name"], "email": user["email"]}
