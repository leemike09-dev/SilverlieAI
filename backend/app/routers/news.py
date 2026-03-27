import feedparser
import requests
import re
from fastapi import APIRouter, Query

router = APIRouter()

RSS_FEEDS = {
    'ko': {
        'url': 'https://news.google.com/rss/search?q=시니어+건강&hl=ko&gl=KR&ceid=KR:ko',
        'flag': '🇰🇷',
        'country': '한국',
    },
    'en': {
        'url': 'https://news.google.com/rss/search?q=senior+health+wellness&hl=en&gl=US&ceid=US:en',
        'flag': '🇺🇸',
        'country': 'USA',
    },
    'ja': {
        'url': 'https://news.google.com/rss/search?q=高齢者+健康&hl=ja&gl=JP&ceid=JP:ja',
        'flag': '🇯🇵',
        'country': '日本',
    },
    'zh': {
        'url': 'https://news.google.com/rss/search?q=老年人+健康&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
        'flag': '🇨🇳',
        'country': '中国',
    },
}

FALLBACKS = {
    'ko': [
        {"title": "규칙적인 걷기 운동, 심혈관 질환 예방에 효과적", "summary": "하루 30분 이상 걷기 운동이 심혈관 질환 예방에 효과적입니다. 특히 60세 이상 시니어에게 꾸준한 걷기 운동은 혈압 조절과 체중 관리에 도움이 됩니다.", "source": "질병관리청", "link": "https://www.kdca.go.kr"},
        {"title": "겨울철 폐렴구균 예방접종 안내", "summary": "65세 이상 어르신에게 폐렴구균 예방접종을 권고합니다. 보건소에서 무료로 접종받을 수 있습니다.", "source": "질병관리청", "link": "https://www.kdca.go.kr"},
        {"title": "시니어 낙상 예방 생활 수칙", "summary": "집 안 미끄럼 방지 매트 설치, 충분한 조명 확보, 규칙적인 근력 운동이 낙상 예방에 효과적입니다.", "source": "보건복지부", "link": "https://www.mohw.go.kr"},
        {"title": "고혈압 관리, 식단 조절이 핵심", "summary": "나트륨 섭취를 줄이고 채소와 과일을 충분히 섭취하면 혈압 관리에 도움이 됩니다.", "source": "대한심장학회", "link": "https://www.k-society.org"},
    ],
    'en': [
        {"title": "Walking Daily Reduces Cardiovascular Risk in Seniors", "summary": "A new study confirms that seniors aged 60+ who walk regularly for 30 minutes can significantly reduce cardiovascular disease risk.", "source": "CDC", "link": "https://www.cdc.gov"},
        {"title": "Flu Vaccination Strongly Recommended for Seniors", "summary": "The CDC urges all adults 65 and older to receive an annual flu vaccine to reduce hospitalizations.", "source": "CDC", "link": "https://www.cdc.gov"},
        {"title": "New Guidelines for Bone Health in Older Adults", "summary": "Updated guidelines recommend adults over 65 get regular bone density screenings to detect osteoporosis early.", "source": "CDC", "link": "https://www.cdc.gov"},
        {"title": "Mediterranean Diet Linked to Better Brain Health", "summary": "Following a Mediterranean diet rich in fruits, vegetables, and healthy fats can reduce cognitive decline risk in adults over 60.", "source": "American Heart Association", "link": "https://www.heart.org"},
    ],
    'ja': [
        {"title": "高齢者の定期的なウォーキングが心血管疾患を予防", "summary": "毎日30分以上のウォーキングが60歳以上の高齢者の心血管疾患リスクを大幅に低下させます。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp"},
        {"title": "高齢者の骨粗鬆症検診の重要性", "summary": "60歳以上の高齢者に骨粗鬆症検診の定期受診を推奨しています。早期発見と予防が重要です。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp"},
        {"title": "インフルエンザ予防接種のすすめ", "summary": "高齢者はインフルエンザ重症化リスクが高いため、毎年予防接種が推奨されています。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp"},
        {"title": "睡眠の質が健康寿命に与える影響", "summary": "質の高い睡眠が高齢者の健康寿命延伸に重要であることが示されました。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp"},
    ],
    'zh': [
        {"title": "规律步行有效预防老年人心血管疾病", "summary": "每天步行30分钟以上可显著降低60岁以上老年人患心血管疾病的风险。", "source": "国家卫生健康委员会", "link": "http://www.nhc.gov.cn"},
        {"title": "60岁以上老年人应定期检查血压和血糖", "summary": "建议60岁以上老年人定期检查血压和血糖水平，以预防高血压和糖尿病等慢性疾病。", "source": "国家卫生健康委员会", "link": "http://www.nhc.gov.cn"},
        {"title": "太极拳有助于改善老年人平衡能力", "summary": "坚持练习太极拳的老年人跌倒风险降低了40%，同时有助于缓解关节疼痛。", "source": "国家卫生健康委员会", "link": "http://www.nhc.gov.cn"},
        {"title": "老年人冬季健康防护指南", "summary": "冬季需特别注意防寒保暖，建议接种流感和肺炎疫苗，适量补充维生素D。", "source": "国家卫生健康委员会", "link": "http://www.nhc.gov.cn"},
    ],
}


@router.get("/health-news")
def get_health_news(language: str = Query(default='ko')):
    feed_info = RSS_FEEDS.get(language, RSS_FEEDS['ko'])

    try:
        feed = feedparser.parse(feed_info['url'])
        entries = feed.entries[:4]

        if not entries:
            return _fallback(language, feed_info)

        news = []
        for entry in entries:
            source = entry.get('source', {}).get('title', '') or (entry.get('tags', [{}])[0].get('term', '') if entry.get('tags') else '')
            raw_link = entry.get('link', '')
            # Google News 리다이렉트 URL → 실제 기사 URL 추출
            actual_url = _resolve_url(raw_link)
            news.append({
                "flag": feed_info['flag'],
                "country": feed_info['country'],
                "language": language,
                "title": entry.get('title', '').split(' - ')[0],  # 출처명 제거
                "summary": re.sub(r'<[^>]+>', '', entry.get('summary', ''))[:200] if entry.get('summary') else '',
                "source": source or feed_info['country'],
                "source_url": actual_url or raw_link,
            })

        return {"news": news}

    except Exception:
        return _fallback(language, feed_info)


def _resolve_url(url: str) -> str:
    try:
        r = requests.get(url, allow_redirects=True, timeout=5, headers={'User-Agent': 'Mozilla/5.0'})
        return r.url
    except Exception:
        return url


def _fallback(language, feed_info):
    items = FALLBACKS.get(language, FALLBACKS['ko'])
    return {
        "news": [
            {
                "flag": feed_info['flag'],
                "country": feed_info['country'],
                "language": language,
                "title": item['title'],
                "summary": item['summary'],
                "source": item['source'],
                "source_url": item['link'],
            }
            for item in items
        ]
    }
