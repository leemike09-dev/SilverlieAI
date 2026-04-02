import os
import anthropic
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

class AnomalyRequest(BaseModel):
    senior_name: str
    med_taken: int
    med_total: int
    steps: int
    mood: Optional[str] = None
    last_active_hour: Optional[int] = None   # 마지막 활동 시각 (0-23)
    location_safe: bool = True
    wake_time: Optional[str] = None          # e.g. "07:45"
    usual_wake: Optional[str] = "07:30"     # 평소 기상 시각

ANOMALY_SYSTEM = """당신은 시니어 안전 모니터링 AI입니다.
가족에게 부모님의 오늘 활동 데이터를 분석해 이상 여부를 짧고 명확하게 알려주세요.
출력 형식: JSON 없이 순수 텍스트로 3문장 이내.
첫 줄: 종합 평가 (✅ 정상 / ⚠️ 주의 / 🚨 이상감지)
둘째 줄: 구체적 이상 항목 또는 "특이사항 없음"
셋째 줄: 가족에게 권장 행동 (없으면 생략)"""

@router.post("/analyze")
def analyze_anomaly(req: AnomalyRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        # API 키 없을 때 규칙 기반 응답
        return rule_based_analysis(req)

    med_pct = int((req.med_taken / req.med_total * 100)) if req.med_total > 0 else 100
    prompt = f"""{req.senior_name}님 오늘 현황:
- 약 복용: {req.med_taken}/{req.med_total}회 ({med_pct}%)
- 걸음수: {req.steps}보
- 기분: {req.mood or "미확인"}
- 위치 안전: {"예" if req.location_safe else "아니오 — 이상 위치"}
- 마지막 활동: {f"{req.last_active_hour}시" if req.last_active_hour else "미확인"}
- 기상 시각: {req.wake_time or "미확인"} (평소: {req.usual_wake})

위 데이터를 바탕으로 이상 여부를 분석해주세요."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        res = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=ANOMALY_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = res.content[0].text
    except Exception:
        return rule_based_analysis(req)

    level = "danger" if "🚨" in text else "warn" if "⚠️" in text else "good"
    return {"level": level, "message": text}


def rule_based_analysis(req: AnomalyRequest):
    issues = []
    if req.med_total > 0 and req.med_taken / req.med_total < 0.5:
        issues.append(f"약 복용 {req.med_taken}/{req.med_total}회만 완료")
    if not req.location_safe:
        issues.append("안전 구역 이탈 감지")
    if req.steps < 500:
        issues.append(f"활동량 매우 적음 ({req.steps}보)")

    if not issues:
        msg = f"✅ 정상\n특이사항 없음\n오늘도 건강하게 지내고 계세요!"
        level = "good"
    elif not req.location_safe:
        msg = f"🚨 이상감지\n{', '.join(issues)}\n즉시 연락해 위치를 확인하세요."
        level = "danger"
    else:
        msg = f"⚠️ 주의\n{', '.join(issues)}\n{req.senior_name}님께 연락해 확인해보세요."
        level = "warn"

    return {"level": level, "message": msg}
