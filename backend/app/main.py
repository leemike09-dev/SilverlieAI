from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.routers import health, ai, users, community, notifications, news, medications, family, anomaly, location

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
app.include_router(location.router, prefix="/location", tags=["location"])

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
    return {"status": "ok", "message": "Silver Life AI API", "db": db_status}
