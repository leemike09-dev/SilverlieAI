import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Header, HTTPException
from .database import get_supabase

SESSION_DAYS = 60  # 시니어 친화: 60일 만료


def create_session(user_id: str) -> str:
    """로그인 성공 시 세션 토큰 발급 및 Supabase 저장."""
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat()
    db = get_supabase()
    res = db.table("sessions").insert({
        "user_id": user_id,
        "token": token,
        "expires_at": expires_at,
    }).execute()
    if not res.data:
        # 저장 실패 시 서버 오류 — 토큰 없이 내려보내면 안 됨
        raise HTTPException(status_code=500, detail="세션 저장 실패. 잠시 후 다시 시도해주세요.")
    return token


def _resolve_token(authorization: str | None) -> str | None:
    """Authorization 헤더 → user_id. 무효/만료면 None, 게스트면 'guest'."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    if not token or token in ("guest", "demo-user"):
        return "guest"
    db = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()
    res = db.table("sessions").select("user_id, expires_at").eq("token", token).execute()
    if not res.data:
        return None
    row = res.data[0]
    if row["expires_at"] < now_iso:
        return None
    return str(row["user_id"])


def verify_token(authorization: str = Header(None)) -> str:
    """개인 데이터 엔드포인트용 — 유효 토큰 없으면 401."""
    uid = _resolve_token(authorization)
    if uid is None or uid == "guest":
        raise HTTPException(status_code=401, detail="로그인이 필요합니다. 다시 로그인해주세요.")
    return uid


def verify_token_or_guest(authorization: str = Header(None)) -> str:
    """AI 대화용 — 게스트 허용. 토큰 없으면 'guest' 반환."""
    uid = _resolve_token(authorization)
    return uid if uid else "guest"
