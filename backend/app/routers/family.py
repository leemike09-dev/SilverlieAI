from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase
import random, string
from datetime import datetime, date, timezone

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
    existing = db.table("family_links")\
        .select("*")\
        .eq("senior_id", req.senior_id)\
        .eq("status", "pending")\
        .execute()
    if existing.data:
        return {"code": existing.data[0]["link_code"]}
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
    as_senior = db.table("family_links")\
        .select("*")\
        .eq("senior_id", user_id)\
        .eq("status", "linked")\
        .execute()
    as_family = db.table("family_links")\
        .select("*")\
        .eq("family_id", user_id)\
        .eq("status", "linked")\
        .execute()
    return {
        "as_senior": as_senior.data or [],
        "as_family": as_family.data or [],
    }

# 시니어 오늘 현황 (가족용) — alert_level / missed / skipped 포함
@router.get("/status/{senior_id}")
def get_senior_status(senior_id: str):
    db = get_supabase()
    today = date.today().isoformat()
    now   = datetime.now(timezone.utc)

    logs_resp = db.table("medication_logs")\
        .select("*")\
        .eq("user_id", senior_id)\
        .eq("date", today)\
        .execute()
    meds_resp = db.table("medications")\
        .select("*")\
        .eq("user_id", senior_id)\
        .execute()

    logs = logs_resp.data or []
    meds = meds_resp.data or []

    total   = 0
    taken   = 0
    skipped = 0
    missed  = []

    for med in meds:
        times = med.get("times") or []
        for t in times:
            total += 1
            # 해당 약+시간 로그 검색
            log = next((l for l in logs
                        if l.get("medication_id") == med["id"]
                        and l.get("scheduled_time","")[:5] == t[:5]), None)
            if log:
                if log.get("status") == "skipped":
                    skipped += 1
                elif log.get("taken"):
                    taken += 1
                # else: 로그 있으나 status 불명 → neutral
            else:
                # 스케줄 시간이 30분 이상 지났으면 missed
                try:
                    sched_h, sched_m = map(int, t[:5].split(":"))
                    sched_dt = datetime(now.year, now.month, now.day,
                                        sched_h, sched_m,
                                        tzinfo=timezone.utc)
                    if (now - sched_dt).total_seconds() > 1800:
                        missed.append({"med_name": med["name"], "time": t[:5]})
                except Exception:
                    pass

    pct = round(taken / total * 100) if total > 0 else 100

    if missed or skipped >= 2:
        alert_level = "danger"
    elif skipped >= 1 or (total > 0 and taken / max(total, 1) < 0.5):
        alert_level = "warn"
    else:
        alert_level = "good"

    return {
        "medications": meds,
        "today_logs":  logs,
        "summary": {
            "total":       total,
            "taken":       taken,
            "skipped":     skipped,
            "missed":      missed,
            "alert_level": alert_level,
            "pct":         pct,
        },
    }
