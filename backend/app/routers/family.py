from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase
import random, string, os
import anthropic
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

@router.post("/generate-code")
def generate_code(req: LinkRequest):
    db = get_supabase()
    existing = db.table("family_links") \
        .select("*") \
        .eq("senior_id", req.senior_id) \
        .eq("status", "pending") \
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

@router.post("/join")
def join_family(req: JoinRequest):
    db = get_supabase()
    link = db.table("family_links") \
        .select("*") \
        .eq("link_code", req.link_code) \
        .execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="유효하지 않은 코드입니다")
    if link.data[0]["status"] == "linked":
        raise HTTPException(status_code=400, detail="이미 연결된 코드입니다")
    db.table("family_links") \
        .update({"family_id": req.family_id, "family_name": req.family_name, "status": "linked"}) \
        .eq("link_code", req.link_code) \
        .execute()
    return {"ok": True, "senior_name": link.data[0]["senior_name"], "senior_id": link.data[0]["senior_id"]}

@router.get("/links/{user_id}")
def get_links(user_id: str):
    db = get_supabase()
    as_senior = db.table("family_links") \
        .select("*").eq("senior_id", user_id).eq("status", "linked").execute()
    as_family = db.table("family_links") \
        .select("*").eq("family_id", user_id).eq("status", "linked").execute()
    return {
        "as_senior": as_senior.data or [],
        "as_family": as_family.data or [],
    }


@router.get("/members/{user_id}")
def get_members(user_id: str):
    """가족 앱 사용자가 연결한 시니어 목록 반환 (FamilyDashboard용)"""
    db = get_supabase()
    # 이 user_id가 family로 연결된 시니어 목록
    links = db.table("family_links") \
        .select("senior_id, senior_name, link_code") \
        .eq("family_id", user_id).eq("status", "linked").execute()
    members = []
    for lk in (links.data or []):
        sid = lk.get("senior_id", "")
        # users 테이블에서 상세 정보 조회
        u = db.table("users").select("id,name,phone").eq("id", sid).execute()
        if u.data:
            members.append({
                "id":    u.data[0].get("id", sid),
                "name":  u.data[0].get("name") or lk.get("senior_name", ""),
                "phone": u.data[0].get("phone", ""),
            })
        else:
            members.append({"id": sid, "name": lk.get("senior_name", ""), "phone": ""})
    return {"members": members}

@router.get("/status/{senior_id}")
def get_senior_status(senior_id: str):
    db = get_supabase()
    today = date.today().isoformat()
    now   = datetime.now(timezone.utc)

    logs_resp = db.table("medication_logs") \
        .select("*").eq("user_id", senior_id).eq("date", today).execute()
    meds_resp = db.table("medications") \
        .select("*").eq("user_id", senior_id).execute()

    logs = logs_resp.data or []
    meds = meds_resp.data or []

    total = taken = skipped = 0
    missed = []

    for med in meds:
        times = med.get("times") or []
        for t in times:
            total += 1
            log = next((l for l in logs
                        if l.get("medication_id") == med["id"]
                        and l.get("scheduled_time", "")[:5] == t[:5]), None)
            if log:
                if log.get("status") == "skipped":
                    skipped += 1
                elif log.get("taken"):
                    taken += 1
            else:
                try:
                    sched_h, sched_m = map(int, t[:5].split(":"))
                    sched_dt = datetime(now.year, now.month, now.day,
                                        sched_h, sched_m, tzinfo=timezone.utc)
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

    # 재고 부족 약 계산
    low_stock = []
    for med in meds:
        total_qty = med.get("total_quantity")
        if not total_qty:
            continue
        taken_res = db.table("medication_logs") \
            .select("id") \
            .eq("user_id", senior_id) \
            .eq("medication_id", med["id"]) \
            .eq("taken", True) \
            .execute()
        taken_count = len(taken_res.data or [])
        remaining = max(0, total_qty - taken_count)
        doses_per_day = len(med.get("times") or [])
        days_left = (remaining // doses_per_day) if doses_per_day > 0 else 0
        if days_left <= 7:
            low_stock.append({
                "name": med["name"],
                "med_type": med.get("med_type", "처방약"),
                "remaining_qty": remaining,
                "days_left": days_left,
                "color": med.get("color", "#4CAF50"),
            })
    low_stock.sort(key=lambda x: x["days_left"])

    return {
        "medications": meds,
        "today_logs": logs,
        "low_stock": low_stock,
        "summary": {
            "total": total,
            "taken": taken,
            "skipped": skipped,
            "missed": missed,
            "alert_level": alert_level,
            "pct": pct,
        },
    }

@router.get("/dashboard/{senior_id}")
def get_dashboard(senior_id: str):
    """FamilyDashboardScreen이 기대하는 형식으로 복용약 현황 반환"""
    db = get_supabase()
    today = date.today().isoformat()
    now   = datetime.now(timezone.utc)

    meds_resp = db.table("medications").select("*").eq("user_id", senior_id).execute()
    logs_resp  = db.table("medication_logs").select("*").eq("user_id", senior_id).eq("date", today).execute()
    meds = meds_resp.data or []
    logs = logs_resp.data or []

    rows = []
    for med in meds:
        times = med.get("times") or []
        for t in times:
            log = next((l for l in logs
                        if l.get("medication_id") == med["id"]
                        and str(l.get("scheduled_time", ""))[:5] == str(t)[:5]), None)
            if log:
                taken = bool(log.get("taken"))
            else:
                taken = False

            # 잔여량 계산
            taken_res = db.table("medication_logs").select("id") \
                .eq("user_id", senior_id).eq("medication_id", med["id"]).eq("taken", True).execute()
            taken_count = len(taken_res.data or [])
            total_qty = med.get("total_quantity")
            if total_qty:
                remaining = max(0, total_qty - taken_count)
                dpd = len(times)
                days_left = (remaining // dpd) if dpd > 0 else 0
            else:
                days_left = None

            rows.append({
                "name":    med.get("name", ""),
                "time":    str(t)[:5],
                "taken":   taken,
                "med_type": med.get("med_type", "처방약"),
                "stock":   days_left,
                "color":   med.get("color", "#4CAF50"),
            })

    # 요약
    total   = len(rows)
    taken_n = sum(1 for r in rows if r["taken"])
    pct     = round(taken_n / total * 100) if total > 0 else 100

    return {"medications": rows, "summary": {"total": total, "taken": taken_n, "pct": pct}}


@router.get("/anomaly-check/{senior_id}")
def anomaly_check(senior_id: str):
    """Claude AI가 걸음수+약복용+위치 데이터를 종합 분석해 이상징후 판단"""
    db = get_supabase()
    today = date.today().isoformat()

    # 최근 7일 건강 기록
    health = db.table("health_records") \
        .select("*").eq("user_id", senior_id) \
        .order("date", desc=True).limit(7).execute().data or []

    # 오늘 약복용 현황
    logs = db.table("medication_logs") \
        .select("*").eq("user_id", senior_id).eq("date", today).execute().data or []
    meds = db.table("medications") \
        .select("*").eq("user_id", senior_id).execute().data or []

    # 오늘 위치/활동
    location = db.table("location_logs") \
        .select("*").eq("user_id", senior_id) \
        .gte("recorded_at", today + "T00:00:00") \
        .order("recorded_at", desc=True).limit(20).execute().data or []

    # 약복용 요약
    total_doses = sum(len(m.get("times", [])) for m in meds)
    taken_doses = sum(1 for l in logs if l.get("taken"))
    missed_doses = []
    now = datetime.now(timezone.utc)
    for med in meds:
        for t in (med.get("times") or []):
            log = next((l for l in logs
                        if l.get("medication_id") == med["id"]
                        and l.get("scheduled_time", "")[:5] == t[:5]), None)
            if not log:
                try:
                    h, m_min = map(int, t[:5].split(":"))
                    sched = datetime(now.year, now.month, now.day, h, m_min, tzinfo=timezone.utc)
                    if (now - sched).total_seconds() > 1800:
                        missed_doses.append(f"{med['name']} {t[:5]}")
                except Exception:
                    pass

    # 걸음수 평균 (최근 7일)
    steps_list = [r.get("steps") for r in health if r.get("steps")]
    avg_steps = int(sum(steps_list) / len(steps_list)) if steps_list else None
    today_steps = next((r.get("steps") for r in health if r.get("date") == today), None)

    # Claude에게 종합 판단 요청
    prompt = f"""오늘 날짜: {today}
시니어 ID: {senior_id}

[약복용 현황]
- 오늘 총 복용 예정: {total_doses}회
- 복용 완료: {taken_doses}회
- 미복용(30분 초과): {', '.join(missed_doses) if missed_doses else '없음'}

[걸음수]
- 오늘: {today_steps if today_steps else '미기록'}보
- 최근 7일 평균: {avg_steps if avg_steps else '데이터 없음'}보

[혈압 (최근)]
{chr(10).join([f"- {r['date']}: {r.get('bp_systolic','?')}/{r.get('bp_diastolic','?')} mmHg" for r in health[:3] if r.get('bp_systolic')]) or '- 데이터 없음'}

[오늘 외출 활동]
- 활동 기록 수: {len(location)}개
- 현재 상태: {'외출 중' if any(l.get('is_outdoor') for l in location[:1]) else '귀가/실내'}

위 데이터를 종합하여 이상징후 여부를 판단하세요.

응답 형식 (JSON):
{{
  "risk_level": "normal" | "caution" | "alert",
  "summary": "한 줄 요약 (가족이 볼 메시지, 20자 이내)",
  "detail": "구체적 근거 (2~3줄)",
  "action": "권장 조치 (1줄)"
}}"""

    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system="당신은 시니어 건강 모니터링 AI입니다. 데이터를 객관적으로 분석하고 반드시 JSON 형식으로만 응답하세요.",
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text = response.content[0].text.strip()
        # JSON 블록 추출
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        result = json.loads(text)
        return {"ok": True, "analysis": result, "raw_data": {
            "total_doses": total_doses,
            "taken_doses": taken_doses,
            "missed_doses": missed_doses,
            "today_steps": today_steps,
            "avg_steps": avg_steps,
        }}
    except Exception as e:
        return {"ok": False, "error": str(e)}
