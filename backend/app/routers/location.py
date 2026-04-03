from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase
from datetime import datetime, date, timezone
import math

router = APIRouter()

class LocationUpdate(BaseModel):
    user_id: str
    lat: float
    lng: float
    address: Optional[str] = None
    activity: Optional[str] = "unknown"

def haversine(lat1, lng1, lat2, lng2):
    """두 좌표 간 거리 계산 (미터)"""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@router.post("/update")
def update_location(req: LocationUpdate):
    db = get_supabase()
    today = date.today().isoformat()

    # 오늘 첫 위치 (기준점 = 집)
    first = db.table("location_logs")\
        .select("*")\
        .eq("user_id", req.user_id)\
        .gte("created_at", f"{today}T00:00:00")\
        .order("created_at")\
        .limit(1)\
        .execute()

    # 직전 위치와 비교해 중복 저장 방지 (50m 이내면 스킵)
    last = db.table("location_logs")\
        .select("*")\
        .eq("user_id", req.user_id)\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    if last.data:
        prev = last.data[0]
        dist = haversine(prev["lat"], prev["lng"], req.lat, req.lng)
        if dist < 50:
            return {"ok": True, "skipped": True, "reason": "50m 이내 중복"}

    # activity 자동 판별: 첫 위치(집)에서 200m 초과 = outdoor
    activity = req.activity
    if first.data and activity == "unknown":
        home = first.data[0]
        dist_from_home = haversine(home["lat"], home["lng"], req.lat, req.lng)
        activity = "outdoor" if dist_from_home > 200 else "home"
    elif not first.data:
        activity = "home"

    db.table("location_logs").insert({
        "user_id":   req.user_id,
        "lat":       req.lat,
        "lng":       req.lng,
        "address":   req.address or "",
        "activity":  activity,
    }).execute()

    return {"ok": True, "activity": activity}

@router.get("/today/{user_id}")
def get_today_location(user_id: str):
    db = get_supabase()
    today = date.today().isoformat()

    rows = db.table("location_logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .gte("created_at", f"{today}T00:00:00")\
        .order("created_at")\
        .execute()

    logs = rows.data or []

    # 총 이동 거리 계산
    total_dist = 0
    for i in range(1, len(logs)):
        total_dist += haversine(
            logs[i-1]["lat"], logs[i-1]["lng"],
            logs[i]["lat"],   logs[i]["lng"]
        )

    # 현재 상태
    current_activity = logs[-1]["activity"] if logs else "unknown"

    return {
        "logs": logs,
        "total_distance_m": round(total_dist),
        "current_activity": current_activity,
        "point_count": len(logs),
    }
