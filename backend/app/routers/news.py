import os
import anthropic
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

NEWS_PROMPT = """오늘의 건강 뉴스를 4개국(한국, 미국, 일본, 중국)별로 각 1개씩 생성해주세요.
각 나라의 뉴스는 해당 나라 언어로 작성하세요.
60세 이상 시니어에게 관련된 건강 정보여야 합니다.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "news": [
    {
      "country": "한국",
      "flag": "🇰🇷",
      "language": "ko",
      "title": "뉴스 제목 (한국어)",
      "summary": "2~3문장 요약 (한국어)",
      "source": "출처 (예: 질병관리청)"
    },
    {
      "country": "미국",
      "flag": "🇺🇸",
      "language": "en",
      "title": "News title (English)",
      "summary": "2-3 sentence summary (English)",
      "source": "Source (e.g., CDC)"
    },
    {
      "country": "일본",
      "flag": "🇯🇵",
      "language": "ja",
      "title": "ニュースタイトル（日本語）",
      "summary": "2〜3文の要約（日本語）",
      "source": "出典（例：厚生労働省）"
    },
    {
      "country": "중국",
      "flag": "🇨🇳",
      "language": "zh",
      "title": "新闻标题（中文）",
      "summary": "2-3句摘要（中文）",
      "source": "来源（例：国家卫生健康委员会）"
    }
  ]
}"""


@router.get("/health-news")
def get_health_news():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": NEWS_PROMPT}],
        )
        import json, re
        text = response.content[0].text.strip()
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        text = text.strip()
        data = json.loads(text)
        return data
    except Exception:
        # 폴백: 정적 뉴스 데이터
        return {
            "news": [
                {
                    "country": "한국",
                    "flag": "🇰🇷",
                    "language": "ko",
                    "title": "규칙적인 걷기 운동, 심혈관 질환 예방에 효과적",
                    "summary": "하루 30분 이상 걷기 운동이 심혈관 질환 예방에 효과적이라는 연구 결과가 발표됐습니다. 특히 60세 이상 시니어에게 꾸준한 걷기 운동은 혈압 조절과 체중 관리에 도움이 됩니다.",
                    "source": "질병관리청"
                },
                {
                    "country": "미국",
                    "flag": "🇺🇸",
                    "language": "en",
                    "title": "Mediterranean Diet Linked to Better Brain Health in Seniors",
                    "summary": "A new study shows that following a Mediterranean diet rich in fruits, vegetables, and healthy fats can significantly reduce the risk of cognitive decline in adults over 60. Experts recommend incorporating olive oil, fish, and nuts into daily meals.",
                    "source": "CDC"
                },
                {
                    "country": "일본",
                    "flag": "🇯🇵",
                    "language": "ja",
                    "title": "高齢者の睡眠改善が健康寿命を延ばす",
                    "summary": "質の高い睡眠が高齢者の健康寿命延伸に重要であることが最新研究で示されました。毎日同じ時間に就寝・起床することや、寝室の温度管理が睡眠の質を向上させます。",
                    "source": "厚生労働省"
                },
                {
                    "country": "중국",
                    "flag": "🇨🇳",
                    "language": "zh",
                    "title": "太极拳有助于改善老年人平衡能力",
                    "summary": "最新研究表明，坚持练习太极拳的老年人跌倒风险降低了40%。每周进行3次以上太极拳练习，不仅能改善平衡能力，还有助于缓解关节疼痛和提高心肺功能。",
                    "source": "国家卫生健康委员会"
                }
            ]
        }
