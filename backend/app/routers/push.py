import os
import httpx
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_supabase

router = APIRouter()
PUSH_SECRET = os.environ.get("PUSH_SECRET", "silverlife2026")


class ReminderRequest(BaseModel):
    type: str   # "medication" | "health"
    secret: str


async def _send_expo_push(messages: list):
    if not messages:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
    except Exception as e:
        print(f"[push] Expo send error: {e}")


@router.post("/daily-reminders")
async def daily_reminders(req: ReminderRequest):
    """
    매일 특정 시간에 cron-job.org 등에서 호출.
    type=medication  → 오후 8시 KST (11:00 UTC)  미복약 사용자에게 알림
    type=health      → 오후 6시 KST (09:00 UTC)  혈압/혈당 미입력 사용자에게 알림
    """
    if req.secret != PUSH_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db = get_supabase()
    today = date.today().isoformat()

    # 모든 사용자 푸시 토큰 수집
    tokens_res = db.table("push_tokens").select("user_id, token").execute()
    token_map: dict[str, list[str]] = {}
    for row in (tokens_res.data or []):
        uid = row["user_id"]
        token_map.setdefault(uid, []).append(row["token"])

    if not token_map:
        return {"sent": 0, "reason": "토큰 없음"}

    messages = []

    if req.type == "medication":
        for user_id, tokens in token_map.items():
            meds = db.table("medications").select("id, name") \
                .eq("user_id", user_id).execute().data or []
            if not meds:
                continue

            logs = db.table("medication_logs").select("medication_id") \
                .eq("user_id", user_id).eq("date", today).eq("taken", True) \
                .execute().data or []
            taken_ids = {l["medication_id"] for l in logs}

            missed = [m for m in meds if m["id"] not in taken_ids]
            if not missed:
                continue

            names = ", ".join(m["name"] for m in missed[:2])
            if len(missed) > 2:
                names += f" 외 {len(missed) - 2}개"

            for token in tokens:
                messages.append({
                    "to": token,
                    "title": "💊 복약 알림",
                    "body": f"{names} 아직 드시지 않으셨어요",
                    "sound": "default",
                    "priority": "high",
                })

    elif req.type == "health":
        for user_id, tokens in token_map.items():
            records = db.table("health_records") \
                .select("blood_pressure_systolic, blood_sugar") \
                .eq("user_id", user_id).eq("date", today) \
                .execute().data or []

            has_bp    = any(r.get("blood_pressure_systolic") for r in records)
            has_sugar = any(r.get("blood_sugar") for r in records)

            missing = []
            if not has_bp:    missing.append("혈압")
            if not has_sugar: missing.append("혈당")
            if not missing:
                continue

            for token in tokens:
                messages.append({
                    "to": token,
                    "title": "📊 건강 기록 알림",
                    "body": f"오늘 {', '.join(missing)} 수치를 아직 기록하지 않으셨어요",
                    "sound": "default",
                    "priority": "normal",
                })

    else:
        raise HTTPException(status_code=400, detail="type은 medication 또는 health")

    await _send_expo_push(messages)
    print(f"[push] type={req.type} sent={len(messages)} date={today}")
    return {"sent": len(messages)}
