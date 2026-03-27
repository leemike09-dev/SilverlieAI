from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, ai, users, community, notifications, news

app = FastAPI(
    title="Silver Life AI API",
    version="0.1.0",
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


@app.get("/")
def root():
    return {"status": "ok", "message": "Silver Life AI API"}
