from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from datetime import date
import math, json, os, requests as req

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
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

class LocationUpdate(BaseModel):
    user_id: str
    lat: float
    lng: float
    address: Optional[str] = None
    activity: Optional[str] = "unknown"

def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@router.post("/update")
def update_location(body: LocationUpdate):
    try:
        today = date.today().isoformat()
        first_rows = sb_get("location_logs", {
            "select": "lat,lng", "user_id": f"eq.{body.user_id}",
            "created_at": f"gte.{today}T00:00:00", "order": "created_at", "limit": 1
        })
        last_rows = sb_get("location_logs", {
            "select": "lat,lng", "user_id": f"eq.{body.user_id}",
            "order": "created_at.desc", "limit": 1
        })

        if last_rows:
            p = last_rows[0]
            if haversine(p["lat"], p["lng"], body.lat, body.lng) < 50:
                return {"ok": True, "skipped": True, "reason": "50m 이내 중복"}

        activity = body.activity
        if first_rows and activity == "unknown":
            h = first_rows[0]
            activity = "outdoor" if haversine(h["lat"], h["lng"], body.lat, body.lng) > 200 else "home"
        elif not first_rows:
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
  <script>var LOGS = {logs_json};</script>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=ad583612ca60b68929dc66eeb5615287"></script>
  <script>
    var markers = [], polyline = null;
    var last = LOGS.length > 0 ? LOGS[LOGS.length - 1] : null;
    var initCenter = last
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
      if (!logs || logs.length === 0) return;
      var path = [];
      logs.forEach(function(log, i) {{
        var lat = parseFloat(log.lat), lng = parseFloat(log.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        var pos = new kakao.maps.LatLng(lat, lng);
        path.push(pos);
        var emoji = i === 0 ? '🏡' : i === logs.length - 1 ? '📍' : '🚶';
        var color = i === 0 ? '#6BAE8F' : i === logs.length - 1 ? '#E05C5C' : '#F4956A';
        var marker = new kakao.maps.Marker({{position: pos, map: map, image: makeIcon(color)}});
        markers.push(marker);
        var t = new Date(log.created_at);
        var ts = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
        var content = '<div style="padding:6px 10px;font-size:14px;white-space:nowrap">' + emoji + ' ' + ts
          + (log.address ? '<br><span style="color:#666;font-size:12px">' + log.address + '</span>' : '') + '</div>';
        var iw = new kakao.maps.InfoWindow({{content: content}});
        (function(m, w) {{ kakao.maps.event.addListener(m, 'click', function() {{ w.open(map, m); }}); }})(marker, iw);
      }});
      if (path.length === 0) return;
      var latest = path[path.length - 1];
      if (path.length > 1) {{
        polyline = new kakao.maps.Polyline({{map:map,path:path,strokeWeight:5,strokeColor:'#6BAE8F',strokeOpacity:0.85,strokeStyle:'dashed'}});
        var bounds = new kakao.maps.LatLngBounds();
        path.forEach(function(p) {{ bounds.extend(p); }});
        var sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
        var span = Math.abs(ne.getLat()-sw.getLat()) + Math.abs(ne.getLng()-sw.getLng());
        if (span < 0.001) {{
          map.setCenter(latest); map.setLevel(4);
        }} else {{
          map.setBounds(bounds, 60, 40, 60, 40);
          if (isNaN(map.getLevel()) || map.getLevel() < 3) map.setLevel(3);
        }}
      }} else {{
        map.setCenter(latest);
        map.setLevel(3);
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

    total_dist = 0
    for i in range(1, len(logs)):
        total_dist += haversine(logs[i-1]["lat"], logs[i-1]["lng"], logs[i]["lat"], logs[i]["lng"])

    return {
        "logs": logs,
        "total_distance_m": round(total_dist),
        "current_activity": logs[-1]["activity"] if logs else "unknown",
        "point_count": len(logs),
    }
