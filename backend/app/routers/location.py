from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from datetime import date
import math, json, os
import psycopg2
import psycopg2.extras

router = APIRouter()

class LocationUpdate(BaseModel):
    user_id: str
    lat: float
    lng: float
    address: Optional[str] = None
    activity: Optional[str] = "unknown"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], sslmode="require")

def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@router.post("/update")
def update_location(req: LocationUpdate):
    try:
        today = date.today().isoformat()
        with get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT lat, lng FROM location_logs WHERE user_id=%s AND created_at >= %s ORDER BY created_at LIMIT 1",
                    (req.user_id, f"{today}T00:00:00")
                )
                first = cur.fetchone()

                cur.execute(
                    "SELECT lat, lng FROM location_logs WHERE user_id=%s ORDER BY created_at DESC LIMIT 1",
                    (req.user_id,)
                )
                last = cur.fetchone()

                if last:
                    dist = haversine(last["lat"], last["lng"], req.lat, req.lng)
                    if dist < 50:
                        return {"ok": True, "skipped": True, "reason": "50m 이내 중복"}

                activity = req.activity
                if first and activity == "unknown":
                    dist_from_home = haversine(first["lat"], first["lng"], req.lat, req.lng)
                    activity = "outdoor" if dist_from_home > 200 else "home"
                elif not first:
                    activity = "home"

                cur.execute(
                    "INSERT INTO location_logs (user_id, lat, lng, address, activity) VALUES (%s, %s, %s, %s, %s)",
                    (req.user_id, req.lat, req.lng, req.address or "", activity)
                )
                conn.commit()

        return {"ok": True, "activity": activity}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/map/{user_id}", response_class=HTMLResponse)
def get_map_page(user_id: str):
    try:
        today = date.today().isoformat()
        with get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT lat, lng, activity, created_at, address FROM location_logs WHERE user_id=%s AND created_at >= %s ORDER BY created_at",
                    (user_id, f"{today}T00:00:00")
                )
                rows = cur.fetchall()
        logs = [dict(r) for r in rows]
        for l in logs:
            if l.get("created_at"):
                l["created_at"] = l["created_at"].isoformat()
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

    function renderLogs(logs) {{
      clearMap();
      if (!logs || logs.length === 0) return;
      var bounds = new kakao.maps.LatLngBounds();
      var path = [];
      logs.forEach(function(log, i) {{
        var pos = new kakao.maps.LatLng(log.lat, log.lng);
        path.push(pos); bounds.extend(pos);
        var emoji = i === 0 ? '🏡' : i === logs.length - 1 ? '📍' : '🚶';
        var marker = new kakao.maps.Marker({{position: pos, map: map}});
        markers.push(marker);
        var t = new Date(log.created_at);
        var ts = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
        var content = '<div style="padding:6px 10px;font-size:14px;white-space:nowrap">' + emoji + ' ' + ts
          + (log.address ? '<br><span style="color:#666;font-size:12px">' + log.address + '</span>' : '') + '</div>';
        var iw = new kakao.maps.InfoWindow({{content: content}});
        (function(m, w) {{ kakao.maps.event.addListener(m, 'click', function() {{ w.open(map, m); }}); }})(marker, iw);
      }});
      var latest = logs[logs.length - 1];
      if (path.length > 1) {{
        polyline = new kakao.maps.Polyline({{map:map,path:path,strokeWeight:5,strokeColor:'#6BAE8F',strokeOpacity:0.85,strokeStyle:'dashed'}});
        map.setBounds(bounds, {{paddingTop:60,paddingBottom:60,paddingLeft:40,paddingRight:40}});
      }}
      map.panTo(new kakao.maps.LatLng(latest.lat, latest.lng));
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
        with get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT lat, lng, activity, created_at, address FROM location_logs WHERE user_id=%s AND created_at >= %s ORDER BY created_at",
                    (user_id, f"{today}T00:00:00")
                )
                rows = cur.fetchall()
        logs = [dict(r) for r in rows]
        for l in logs:
            if l.get("created_at"):
                l["created_at"] = l["created_at"].isoformat()
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
