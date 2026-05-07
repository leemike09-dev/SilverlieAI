from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from datetime import date
import math, json, os, requests as req

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def sb_get(table: str, params: dict) -> list:
    r = req.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params, timeout=10)
    r.raise_for_status()
    return r.json() or []

def sb_post(table: str, body: dict):
    r = req.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=body, timeout=10)
    r.raise_for_status()

def get_user_home(user_id: str):
    """사용자의 고정 집 좌표 반환 (없으면 None, None)"""
    try:
        rows = req.get(
            f"{SUPABASE_URL}/rest/v1/users",
            headers=HEADERS,
            params={"select": "home_lat,home_lng", "id": f"eq.{user_id}"},
            timeout=10,
        ).json()
        if rows and rows[0].get("home_lat") and rows[0].get("home_lng"):
            return float(rows[0]["home_lat"]), float(rows[0]["home_lng"])
    except Exception:
        pass
    return None, None

class LocationUpdate(BaseModel):
    user_id: str
    lat: float
    lng: float
    address: Optional[str] = None
    activity: Optional[str] = "unknown"

class SetHomeRequest(BaseModel):
    user_id: str
    lat: float
    lng: float

def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@router.post("/set-home")
def set_home(body: SetHomeRequest):
    """사용자의 집 위치를 영구 저장"""
    try:
        r = req.patch(
            f"{SUPABASE_URL}/rest/v1/users",
            headers=HEADERS,
            params={"id": f"eq.{body.user_id}"},
            json={"home_lat": body.lat, "home_lng": body.lng},
            timeout=10,
        )
        r.raise_for_status()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/update")
def update_location(body: LocationUpdate):
    try:
        last_rows = sb_get("location_logs", {
            "select": "lat,lng", "user_id": f"eq.{body.user_id}",
            "order": "created_at.desc", "limit": 1
        })

        if last_rows:
            p = last_rows[0]
            if haversine(p["lat"], p["lng"], body.lat, body.lng) < 50:
                return {"ok": True, "skipped": True, "reason": "50m 이내 중복"}

        activity = body.activity
        if activity == "unknown":
            home_lat, home_lng = get_user_home(body.user_id)
            if home_lat and home_lng:
                # 고정 집 좌표 기준으로 outdoor/home 판단
                dist = haversine(home_lat, home_lng, body.lat, body.lng)
                activity = "outdoor" if dist > 200 else "home"
            else:
                # 집 미설정 시: 오늘 첫 기록 기준 (기존 방식)
                today = date.today().isoformat()
                first_rows = sb_get("location_logs", {
                    "select": "lat,lng", "user_id": f"eq.{body.user_id}",
                    "created_at": f"gte.{today}T00:00:00", "order": "created_at", "limit": 1
                })
                if first_rows:
                    h = first_rows[0]
                    activity = "outdoor" if haversine(h["lat"], h["lng"], body.lat, body.lng) > 200 else "home"
                else:
                    activity = "home"

        sb_post("location_logs", {
            "user_id": body.user_id, "lat": body.lat, "lng": body.lng,
            "address": body.address or "", "activity": activity,
        })
        return {"ok": True, "activity": activity}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/map/{user_id}", response_class=HTMLResponse)
def get_map_page(user_id: str):
    try:
        today = date.today().isoformat()
        logs = sb_get("location_logs", {
            "select": "lat,lng,activity,created_at,address",
            "user_id": f"eq.{user_id}",
            "created_at": f"gte.{today}T00:00:00",
            "order": "created_at",
        })
    except Exception:
        logs = []

    home_lat, home_lng = get_user_home(user_id)
    home_json = json.dumps({"lat": home_lat, "lng": home_lng} if home_lat else None)
    logs_json = json.dumps(logs, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1.0,user-scalable=yes">
  <style>
    *{{margin:0;padding:0}}html,body{{width:100%;height:100%}}
    #map{{width:100%;height:100vh}}
    #refreshBtn{{position:fixed;top:12px;right:12px;z-index:999;
      background:rgba(0,0,0,0.55);color:#fff;border:none;border-radius:20px;
      padding:7px 14px;font-size:13px;cursor:pointer}}
  </style>
</head>
<body>
  <div id="map"></div>
  <button id="refreshBtn" onclick="doRefresh()">↻ 새로고침</button>
  <script>var LOGS = {logs_json}; var HOME = {home_json};</script>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=ad583612ca60b68929dc66eeb5615287"></script>
  <script>
    var markers = [], polyline = null;
    var last = LOGS.length > 0 ? LOGS[LOGS.length - 1] : null;
    var initCenter = HOME
      ? new kakao.maps.LatLng(HOME.lat, HOME.lng)
      : last
        ? new kakao.maps.LatLng(last.lat, last.lng)
        : new kakao.maps.LatLng(37.5665, 126.9780);
    var map = new kakao.maps.Map(document.getElementById('map'), {{center: initCenter, level: 3}});

    function clearMap() {{
      markers.forEach(function(m) {{ m.setMap(null); }});
      markers = [];
      if (polyline) {{ polyline.setMap(null); polyline = null; }}
    }}

    function makeIcon(color) {{
      var svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="11" fill="' + color + '" stroke="white" stroke-width="2.5"/></svg>');
      return new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,' + svg, new kakao.maps.Size(26, 26), {{offset: new kakao.maps.Point(13, 13)}});
    }}

    function renderLogs(logs) {{
      clearMap();

      // 고정 집 마커
      if (HOME) {{
        var homePos = new kakao.maps.LatLng(HOME.lat, HOME.lng);
        var homeMarker = new kakao.maps.Marker({{position: homePos, map: map, image: makeIcon('#6BAE8F')}});
        markers.push(homeMarker);
        var homeIw = new kakao.maps.InfoWindow({{content: '<div style="padding:6px 10px;font-size:14px">🏡 우리 집</div>'}});
        kakao.maps.event.addListener(homeMarker, 'click', function() {{ homeIw.open(map, homeMarker); }});
      }}

      if (!logs || logs.length === 0) return;

      // 외출 경로만 표시 (home activity 제외)
      var outdoorLogs = logs.filter(function(l) {{ return l.activity === 'outdoor'; }});
      var path = [];

      outdoorLogs.forEach(function(log, i) {{
        var lat = parseFloat(log.lat), lng = parseFloat(log.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        var pos = new kakao.maps.LatLng(lat, lng);
        path.push(pos);
        var isLast = i === outdoorLogs.length - 1;
        var color = isLast ? '#E05C5C' : '#F4956A';
        var emoji = isLast ? '📍' : '🚶';
        var marker = new kakao.maps.Marker({{position: pos, map: map, image: makeIcon(color)}});
        markers.push(marker);
        var t = new Date(log.created_at);
        var ts = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
        var content = '<div style="padding:6px 10px;font-size:14px;white-space:nowrap">' + emoji + ' ' + ts
          + (log.address ? '<br><span style="color:#666;font-size:12px">' + log.address + '</span>' : '') + '</div>';
        var iw = new kakao.maps.InfoWindow({{content: content}});
        (function(m, w) {{ kakao.maps.event.addListener(m, 'click', function() {{ w.open(map, m); }}); }})(marker, iw);
      }});

      if (path.length > 1) {{
        polyline = new kakao.maps.Polyline({{map:map,path:path,strokeWeight:5,strokeColor:'#F4956A',strokeOpacity:0.85,strokeStyle:'dashed'}});
        var bounds = new kakao.maps.LatLngBounds();
        if (HOME) bounds.extend(new kakao.maps.LatLng(HOME.lat, HOME.lng));
        path.forEach(function(p) {{ bounds.extend(p); }});
        var sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
        var span = Math.abs(ne.getLat()-sw.getLat()) + Math.abs(ne.getLng()-sw.getLng());
        if (span < 0.001) {{
          map.setCenter(path[path.length-1]); map.setLevel(4);
        }} else {{
          map.setBounds(bounds, 60, 40, 60, 40);
          if (isNaN(map.getLevel()) || map.getLevel() < 3) map.setLevel(3);
        }}
      }}
    }}

    function doRefresh() {{
      fetch('/location/today/{user_id}')
        .then(function(r) {{ return r.json(); }})
        .then(function(d) {{ renderLogs(d.logs); }})
        .catch(function() {{}});
    }}

    renderLogs(LOGS);
    setInterval(doRefresh, 30000);
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.get("/today/{user_id}")
def get_today_location(user_id: str):
    try:
        today = date.today().isoformat()
        logs = sb_get("location_logs", {
            "select": "lat,lng,activity,created_at,address",
            "user_id": f"eq.{user_id}",
            "created_at": f"gte.{today}T00:00:00",
            "order": "created_at",
        })
    except Exception as e:
        return {"logs": [], "total_distance_m": 0, "current_activity": "unknown", "point_count": 0, "error": str(e)}

    outdoor_logs = [l for l in logs if l["activity"] == "outdoor"]
    total_dist = 0
    for i in range(1, len(outdoor_logs)):
        total_dist += haversine(outdoor_logs[i-1]["lat"], outdoor_logs[i-1]["lng"],
                                outdoor_logs[i]["lat"], outdoor_logs[i]["lng"])

    return {
        "logs": logs,
        "total_distance_m": round(total_dist),
        "current_activity": logs[-1]["activity"] if logs else "unknown",
        "point_count": len(outdoor_logs),
    }
