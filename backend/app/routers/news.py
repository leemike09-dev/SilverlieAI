import feedparser
import re
from fastapi import APIRouter, Query

router = APIRouter()

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

RSS_FEEDS = {
    'ko': {
        'url': 'https://www.yna.co.kr/rss/health.xml',
        'flag': '🇰🇷',
        'country': '한국',
    },
    'en': {
        'url': 'https://www.who.int/rss-feeds/news-english.xml',
        'flag': '🇺🇸',
        'country': 'USA',
    },
    'ja': {
        'url': 'https://news.google.com/rss/search?q=高齢者+健康&hl=ja&gl=JP&ceid=JP:ja',
        'flag': '🇯🇵',
        'country': '日本',
    },
    'zh': {
        'url': None,  # Google News blocked in China — always use fallback
        'flag': '🇨🇳',
        'country': '中国',
    },
}

FALLBACKS = {
    'ko': [
        {"title": "규칙적인 걷기 운동, 심혈관 질환 예방에 효과적", "summary": "하루 30분 이상 걷기 운동이 심혈관 질환 예방에 효과적입니다. 특히 60세 이상 시니어에게 꾸준한 걷기 운동은 혈압 조절과 체중 관리에 도움이 됩니다.", "source": "질병관리청", "link": "https://www.kdca.go.kr/contents.es?mid=a20601010000"},
        {"title": "겨울철 폐렴구균 예방접종 안내", "summary": "65세 이상 어르신에게 폐렴구균 예방접종을 권고합니다. 보건소에서 무료로 접종받을 수 있습니다.", "source": "질병관리청", "link": "https://www.kdca.go.kr/contents.es?mid=a20301020000"},
        {"title": "시니어 낙상 예방 생활 수칙", "summary": "집 안 미끄럼 방지 매트 설치, 충분한 조명 확보, 규칙적인 근력 운동이 낙상 예방에 효과적입니다.", "source": "보건복지부", "link": "https://www.mohw.go.kr/react/al/sal0301vw.jsp"},
        {"title": "고혈압 관리, 식단 조절이 핵심", "summary": "나트륨 섭취를 줄이고 채소와 과일을 충분히 섭취하면 혈압 관리에 도움이 됩니다.", "source": "대한심장학회", "link": "https://www.k-heart.org"},
    ],
    'en': [
        {"title": "Walking Daily Reduces Cardiovascular Risk in Seniors", "summary": "A new study confirms that seniors aged 60+ who walk regularly for 30 minutes can significantly reduce cardiovascular disease risk.", "source": "CDC", "link": "https://www.cdc.gov/aging/features/senior-wellness.html"},
        {"title": "Flu Vaccination Strongly Recommended for Seniors", "summary": "The CDC urges all adults 65 and older to receive an annual flu vaccine to reduce hospitalizations.", "source": "CDC", "link": "https://www.cdc.gov/flu/highrisk/65over.htm"},
        {"title": "New Guidelines for Bone Health in Older Adults", "summary": "Updated guidelines recommend adults over 65 get regular bone density screenings to detect osteoporosis early.", "source": "NIH", "link": "https://www.niams.nih.gov/health-topics/osteoporosis"},
        {"title": "Mediterranean Diet Linked to Better Brain Health", "summary": "Following a Mediterranean diet rich in fruits, vegetables, and healthy fats can reduce cognitive decline risk in adults over 60.", "source": "American Heart Association", "link": "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/mediterranean-diet"},
    ],
    'ja': [
        {"title": "高齢者の定期的なウォーキングが心血管疾患を予防", "summary": "毎日30分以上のウォーキングが60歳以上の高齢者の心血管疾患リスクを大幅に低下させます。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html"},
        {"title": "高齢者の骨粗鬆症検診の重要性", "summary": "60歳以上の高齢者に骨粗鬆症検診の定期受診を推奨しています。早期発見と予防が重要です。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/seikatsu/hone.html"},
        {"title": "インフルエンザ予防接種のすすめ", "summary": "高齢者はインフルエンザ重症化リスクが高いため、毎年予防接種が推奨されています。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kekkaku-kansenshou01/index.html"},
        {"title": "睡眠の質が健康寿命に与える影響", "summary": "質の高い睡眠が高齢者の健康寿命延伸に重要であることが示されました。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/suimin/index.html"},
    ],
    'zh': [
        {"title": "规律步行有效预防老年人心血管疾病", "summary": "每天步行30分钟以上可显著降低60岁以上老年人患心血管疾病的风险，同时有助于控制血压和血糖。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "60岁以上老年人应定期检查血压和血糖", "summary": "建议60岁以上老年人定期检查血压和血糖水平，以预防高血压和糖尿病等慢性疾病。早期发现早期治疗效果更佳。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "太极拳有助于改善老年人平衡能力", "summary": "坚持练习太极拳的老年人跌倒风险降低了40%，同时有助于缓解关节疼痛，增强心肺功能。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "老年人冬季健康防护指南", "summary": "冬季需特别注意防寒保暖，建议接种流感和肺炎疫苗，适量补充维生素D，保持室内适宜温度和湿度。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
    ],
}


@router.get("/health-news")
def get_health_news(language: str = Query(default='ko')):
    feed_info = RSS_FEEDS.get(language, RSS_FEEDS['ko'])

    if not feed_info['url']:
        return _fallback(language, feed_info)

    try:
        feed = feedparser.parse(feed_info['url'], request_headers={'User-Agent': UA})
        entries = feed.entries[:4]

        if not entries:
            return _fallback(language, feed_info)

        news = []
        for entry in entries:
            source = entry.get('source', {}).get('title', '') or \
                     (entry.get('tags', [{}])[0].get('term', '') if entry.get('tags') else '')
            link = entry.get('link', '')
            raw_summary = entry.get('summary') or entry.get('description', '')
            clean_summary = re.sub(r'<[^>]+>', '', raw_summary).strip()[:300] if raw_summary else ''
            title = entry.get('title', '').split(' - ')[0].strip()

            news.append({
                "flag": feed_info['flag'],
                "country": feed_info['country'],
                "language": language,
                "title": title,
                "summary": clean_summary or title,
                "source": source or feed_info['country'],
                "source_url": link,
            })

        return {"news": news}

    except Exception:
        return _fallback(language, feed_info)


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
