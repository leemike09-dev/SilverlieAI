from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase
from datetime import datetime, date, timezone
import math, json

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

@router.get("/map/{user_id}", response_class=HTMLResponse)
def get_map_page(user_id: str):
    try:
        db = get_supabase()
        today = date.today().isoformat()
        rows = db.table("location_logs")\
            .select("lat,lng,activity,created_at,address")\
            .eq("user_id", user_id)\
            .gte("created_at", f"{today}T00:00:00")\
            .order("created_at")\
            .execute()
        logs = rows.data or []
    except Exception as e:
        return HTMLResponse(content=f"<pre>DB Error: {e}</pre>", status_code=200)
    logs_json = json.dumps(logs, ensure_ascii=False)
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1.0,user-scalable=yes">
  <style>*{{margin:0;padding:0;box-sizing:border-box}}html,body,#map{{width:100%;height:100%}}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var LOGS = {logs_json};
    function initMap() {{
      var center = LOGS.length > 0
        ? new kakao.maps.LatLng(LOGS[0].lat, LOGS[0].lng)
        : new kakao.maps.LatLng(37.5665, 126.9780);
      var map = new kakao.maps.Map(document.getElementById('map'), {{center: center, level: 4}});
      if (LOGS.length === 0) return;
      var bounds = new kakao.maps.LatLngBounds();
      var path = [];
      LOGS.forEach(function(log, i) {{
        var pos = new kakao.maps.LatLng(log.lat, log.lng);
        path.push(pos);
        bounds.extend(pos);
        var emoji = i === 0 ? '🏡' : i === LOGS.length - 1 ? '📍' : '🚶';
        var marker = new kakao.maps.Marker({{position: pos, map: map}});
        var t = new Date(log.created_at);
        var ts = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
        var content = '<div style="padding:6px 10px;font-size:14px;white-space:nowrap">' + emoji + ' ' + ts
          + (log.address ? '<br><span style="color:#666;font-size:12px">' + log.address + '</span>' : '') + '</div>';
        var iw = new kakao.maps.InfoWindow({{content: content}});
        kakao.maps.event.addListener(marker, 'click', function() {{ iw.open(map, marker); }});
      }});
      if (path.length > 1) {{
        new kakao.maps.Polyline({{map:map, path:path, strokeWeight:5, strokeColor:'#6BAE8F', strokeOpacity:0.85, strokeStyle:'dashed'}});
        map.setBounds(bounds, {{paddingTop:40,paddingBottom:40,paddingLeft:40,paddingRight:40}});
      }} else {{
        map.setCenter(path[0]);
        map.setLevel(3);
      }}
    }}
  </script>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=ad583612ca60b68929dc66eeb5615287&onload=initMap"></script>
</body>
</html>"""
    return HTMLResponse(content=html)


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
