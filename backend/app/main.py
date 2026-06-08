import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.routers import health, ai, users, community, notifications, news, medications, family, anomaly, location, appointments, moods

app = FastAPI(
    title="Silver Life AI API",
    version="0.1.0",
    docs_url=None,      # /docs 비활성화
    redoc_url=None,     # /redoc 비활성화
    openapi_url=None,   # /openapi.json 비활성화
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중 — 배포 시 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(community.router, prefix="/community", tags=["community"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(news.router, prefix="/news", tags=["news"])


app.include_router(medications.router, prefix="/medications", tags=["medications"])
app.include_router(family.router, prefix="/family", tags=["family"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["anomaly"])
app.include_router(location.router,     prefix="/location",     tags=["location"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
app.include_router(moods.router,        prefix="/moods",        tags=["moods"])

_WMO_KO = {
    0: "맑음", 1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
    45: "안개", 48: "결빙 안개",
    51: "가벼운 이슬비", 53: "이슬비", 55: "짙은 이슬비",
    61: "약한 비", 63: "비", 65: "강한 비",
    71: "약한 눈", 73: "눈", 75: "강한 눈",
    80: "소나기", 81: "소나기", 82: "강한 소나기",
    95: "뇌우", 99: "우박 동반 뇌우",
}

def _cond_type(code: int) -> str:
    if code in (0, 1): return "clear"
    if code in (2, 3, 45, 48): return "cloud"
    return "rain"

@app.get("/weather")
def get_weather(lat: float, lon: float):
    """Open-Meteo 날씨 — API 키 불필요, 전 세계 지원 (중국 포함)"""
    try:
        r = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat, "longitude": lon,
                "current": "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
                "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
                "forecast_days": 6,
                "timezone": "auto",
            },
            timeout=8,
        )
        r.raise_for_status()
        d   = r.json()
        cur = d.get("current", {})
        daily = d.get("daily", {})
        temp  = cur.get("temperature_2m")
        code  = cur.get("weather_code", 0)
        humid = cur.get("relative_humidity_2m")
        wind  = cur.get("wind_speed_10m")
        tz    = d.get("timezone", "")
        condition = _WMO_KO.get(code, "알 수 없음")
        parts = [f"{temp}°C {condition}"]
        if humid is not None: parts.append(f"습도 {humid}%")
        if wind  is not None: parts.append(f"풍속 {wind:.1f}km/h")

        # 일별 예보 (오늘 포함 3일)
        dates    = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        day_codes = daily.get("weather_code", [])
        rain_prob = daily.get("precipitation_probability_max", [])
        forecast = []
        for i, dt in enumerate(dates[:3]):
            c = day_codes[i] if i < len(day_codes) else 0
            forecast.append({
                "date": dt,
                "temp_max": round(max_temps[i]) if i < len(max_temps) else None,
                "temp_min": round(min_temps[i]) if i < len(min_temps) else None,
                "code": c,
                "condition": _WMO_KO.get(c, "알 수 없음"),
                "cond_type": _cond_type(c),
                "rain_prob": rain_prob[i] if i < len(rain_prob) else None,
            })

        return {
            "summary": " / ".join(parts),
            "timezone": tz,
            "temp": temp,
            "code": code,
            "condition": condition,
            "cond_type": _cond_type(code),
            "forecast": forecast,
        }
    except Exception:
        return {"summary": None}


@app.get("/kakao/callback")
def kakao_callback(code: str = None, state: str = None, error: str = None):
    if error or not code:
        return RedirectResponse(url=f"silverlifeai://oauth?error={error or 'unknown'}", status_code=302)
    url = f"silverlifeai://oauth?code={code}"
    if state:
        url += f"&state={state}"
    return RedirectResponse(url=url, status_code=302)

@app.get("/")
def root():
    # Supabase 자동 일시정지 방지 — 앱 시작 ping 시 DB도 함께 깨움
    try:
        from app.database import get_supabase
        get_supabase().table("users").select("id").limit(1).execute()
        db_status = "ok"
    except Exception:
        db_status = "unavailable"
    return {"status": "ok", "message": "Silver Life AI API", "db": db_status, "v": "2.1"}
