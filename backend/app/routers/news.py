import os
import anthropic
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SOURCE_URLS = {
    'ko': 'https://www.kdca.go.kr',
    'en': 'https://www.cdc.gov',
    'ja': 'https://www.mhlw.go.jp',
    'zh': 'http://www.nhc.gov.cn',
}

SOURCE_NAMES = {
    'ko': '질병관리청',
    'en': 'CDC',
    'ja': '厚生労働省',
    'zh': '国家卫生健康委员会',
}

FLAGS = {
    'ko': '🇰🇷',
    'en': '🇺🇸',
    'ja': '🇯🇵',
    'zh': '🇨🇳',
}

COUNTRY_NAMES = {
    'ko': '한국',
    'en': '미국',
    'ja': '일본',
    'zh': '중국',
}

def make_prompt(language: str) -> str:
    lang_instructions = {
        'ko': '한국어로 작성하세요. 한국 시니어 건강 관련 뉴스.',
        'en': 'Write in English. Senior health news from the USA.',
        'ja': '日本語で書いてください。日本の高齢者健康ニュース。',
        'zh': '用中文写。中国老年人健康新闻。',
    }
    instruction = lang_instructions.get(language, lang_instructions['ko'])

    return f"""60세 이상 시니어를 위한 건강 뉴스 4개를 생성해주세요.
{instruction}

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{{
  "news": [
    {{
      "title": "뉴스 제목",
      "summary": "3~4문장 요약",
      "source": "출처 기관명"
    }},
    {{
      "title": "뉴스 제목2",
      "summary": "3~4문장 요약",
      "source": "출처 기관명"
    }},
    {{
      "title": "뉴스 제목3",
      "summary": "3~4문장 요약",
      "source": "출처 기관명"
    }},
    {{
      "title": "뉴스 제목4",
      "summary": "3~4문장 요약",
      "source": "출처 기관명"
    }}
  ]
}}"""


FALLBACKS = {
    'ko': [
        {"title": "규칙적인 걷기 운동, 심혈관 질환 예방에 효과적", "summary": "하루 30분 이상 걷기 운동이 심혈관 질환 예방에 효과적이라는 연구 결과가 발표됐습니다. 특히 60세 이상 시니어에게 꾸준한 걷기 운동은 혈압 조절과 체중 관리에 도움이 됩니다. 주 5회 이상 실천을 권고합니다.", "source": "질병관리청"},
        {"title": "겨울철 폐렴구균 예방접종 안내", "summary": "질병관리청은 65세 이상 어르신에게 폐렴구균 예방접종을 권고합니다. 폐렴은 고령자에게 치명적일 수 있으며, 예방접종으로 중증 합병증을 예방할 수 있습니다. 보건소에서 무료로 접종받을 수 있습니다.", "source": "질병관리청"},
        {"title": "시니어 낙상 예방을 위한 생활 수칙", "summary": "낙상은 65세 이상 어르신의 주요 사망 원인 중 하나입니다. 집 안 미끄럼 방지 매트 설치, 충분한 조명 확보, 규칙적인 근력 운동이 낙상 예방에 효과적입니다. 연간 낙상 예방 검진을 받는 것을 권장합니다.", "source": "질병관리청"},
        {"title": "고혈압 관리, 식단 조절이 핵심", "summary": "나트륨 섭취를 줄이고 채소와 과일을 충분히 섭취하면 혈압 관리에 도움이 됩니다. 하루 소금 섭취량을 5g 이하로 줄이는 것이 권장됩니다. 정기적인 혈압 측정과 의사 상담을 통한 관리가 중요합니다.", "source": "질병관리청"},
    ],
    'en': [
        {"title": "Walking 30 Minutes Daily Reduces Cardiovascular Risk", "summary": "A new CDC study confirms that seniors aged 60+ who walk regularly for 30 minutes can significantly reduce their cardiovascular disease risk. The research emphasizes that even moderate physical activity provides substantial health benefits for older adults. Starting with short walks and gradually increasing duration is recommended.", "source": "CDC"},
        {"title": "Flu Vaccination Strongly Recommended for Seniors", "summary": "The CDC urges all adults 65 and older to receive an annual flu vaccine. High-dose flu vaccines are available specifically for seniors and provide stronger protection. Getting vaccinated before flu season peaks helps reduce hospitalizations and complications.", "source": "CDC"},
        {"title": "New Guidelines for Bone Health in Older Adults", "summary": "Updated guidelines recommend that adults over 65 get regular bone density screenings to detect osteoporosis early. Adequate calcium and vitamin D intake, along with weight-bearing exercise, are key to maintaining bone health. Falls remain the leading cause of injury-related deaths among seniors.", "source": "CDC"},
        {"title": "Mediterranean Diet Linked to Better Brain Health", "summary": "Following a Mediterranean diet rich in fruits, vegetables, and healthy fats can significantly reduce the risk of cognitive decline in adults over 60. Experts recommend incorporating olive oil, fish, and nuts into daily meals. This diet has also been associated with reduced risk of heart disease and diabetes.", "source": "CDC"},
    ],
    'ja': [
        {"title": "高齢者の定期的なウォーキングが心血管疾患を予防", "summary": "最新の研究によると、毎日30分以上のウォーキングが60歳以上の高齢者の心血管疾患リスクを大幅に低下させることが示されました。適度な運動は血圧管理や体重維持にも効果的です。無理のない範囲で毎日続けることが重要です。", "source": "厚生労働省"},
        {"title": "高齢者の骨粗鬆症検診の重要性", "summary": "厚生労働省は60歳以上の高齢者に対して骨粗鬆症検診の定期的な受診を推奨しています。転倒による骨折は寝たきりの原因となるため、早期発見と予防が重要です。カルシウムとビタミンDの積極的な摂取を心がけましょう。", "source": "厚生労働省"},
        {"title": "インフルエンザ予防接種のすすめ", "summary": "高齢者はインフルエンザに罹患した場合、重症化するリスクが高いため、毎年予防接種を受けることが推奨されています。接種は10月から11月に行うことが最も効果的です。かかりつけ医や地域の医療機関でご相談ください。", "source": "厚生労働省"},
        {"title": "睡眠の質が健康寿命に与える影響", "summary": "質の高い睡眠が高齢者の健康寿命延伸に重要であることが最新研究で示されました。毎日同じ時間に就寝・起床することや、寝室の温度管理が睡眠の質を向上させます。睡眠障害が疑われる場合は専門医への相談をお勧めします。", "source": "厚生労働省"},
    ],
    'zh': [
        {"title": "规律步行有效预防老年人心血管疾病", "summary": "最新研究表明，每天步行30分钟以上可显著降低60岁以上老年人患心血管疾病的风险。适度运动对控制血压和维持健康体重也有积极作用。建议从短距离步行开始，逐步增加运动量。", "source": "国家卫生健康委员会"},
        {"title": "60岁以上老年人应定期检查血压和血糖", "summary": "国家卫生健康委员会建议60岁以上老年人定期检查血压和血糖水平，以预防高血压和糖尿病等慢性疾病。早期发现和控制这些疾病可显著降低心脑血管事件的风险，提高生活质量。建议每3个月进行一次检查。", "source": "国家卫生健康委员会"},
        {"title": "太极拳有助于改善老年人平衡能力", "summary": "研究表明，坚持练习太极拳的老年人跌倒风险降低了40%。每周进行3次以上太极拳练习，不仅能改善平衡能力，还有助于缓解关节疼痛和提高心肺功能。这项运动老少皆宜，适合长期坚持。", "source": "国家卫生健康委员会"},
        {"title": "老年人冬季健康防护指南", "summary": "冬季是老年人健康风险较高的季节，需特别注意防寒保暖。建议接种流感和肺炎疫苗，减少人群密集场所的活动。室内保持适当温度和湿度，同时注意适量补充维生素D以维持骨骼健康。", "source": "国家卫生健康委员会"},
    ],
}


@router.get("/health-news")
def get_health_news(language: str = Query(default='ko')):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    source_url = SOURCE_URLS.get(language, SOURCE_URLS['ko'])
    flag = FLAGS.get(language, '🌏')
    country = COUNTRY_NAMES.get(language, '')

    if not api_key:
        return _fallback(language, flag, country, source_url)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": make_prompt(language)}],
        )
        import json, re
        text = response.content[0].text.strip()
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text).strip()
        data = json.loads(text)
        items = data.get('news', [])
        return {
            "news": [
                {
                    "flag": flag,
                    "country": country,
                    "language": language,
                    "title": item.get('title', ''),
                    "summary": item.get('summary', ''),
                    "source": item.get('source', SOURCE_NAMES.get(language, '')),
                    "source_url": source_url,
                }
                for item in items
            ]
        }
    except Exception:
        return _fallback(language, flag, country, source_url)


def _fallback(language, flag, country, source_url):
    items = FALLBACKS.get(language, FALLBACKS['ko'])
    return {
        "news": [
            {
                "flag": flag,
                "country": country,
                "language": language,
                "title": item['title'],
                "summary": item['summary'],
                "source": item['source'],
                "source_url": source_url,
            }
            for item in items
        ]
    }
