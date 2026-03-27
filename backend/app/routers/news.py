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
        import json
        text = response.content[0].text.strip()
        data = json.loads(text)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"뉴스 생성 오류: {str(e)}")
