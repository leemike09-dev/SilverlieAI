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
        {"title": "당뇨병 예방을 위한 생활습관 개선", "summary": "규칙적인 운동과 균형 잡힌 식단, 적정 체중 유지가 당뇨병 예방의 핵심입니다. 공복혈당을 정기적으로 확인하세요.", "source": "대한당뇨병학회", "link": "https://www.diabetes.or.kr"},
        {"title": "시니어 근감소증 예방을 위한 단백질 섭취", "summary": "65세 이상 어르신은 하루 체중 1kg당 1.2g 이상의 단백질 섭취가 필요합니다. 닭가슴살, 두부, 계란이 좋은 공급원입니다.", "source": "대한노인의학회", "link": "https://www.koreangeriatrics.org"},
        {"title": "치매 예방을 위한 두뇌 활동의 중요성", "summary": "독서, 퍼즐, 사회 활동 등 두뇌를 자극하는 활동이 치매 발병 위험을 줄이는 데 도움이 됩니다.", "source": "중앙치매센터", "link": "https://www.nid.or.kr"},
        {"title": "골다공증 예방, 칼슘과 비타민D 섭취 필수", "summary": "50세 이상은 하루 1,200mg의 칼슘과 충분한 비타민D를 섭취해야 합니다. 햇볕을 하루 15~20분 쬐는 것도 도움이 됩니다.", "source": "대한골대사학회", "link": "https://www.ksbmr.org"},
        {"title": "수면의 질 개선으로 건강 지키기", "summary": "충분한 수면은 면역력 강화와 심혈관 건강에 필수적입니다. 취침 전 스마트폰 사용을 줄이고 규칙적인 수면 습관을 유지하세요.", "source": "대한수면학회", "link": "https://www.sleepmed.or.kr"},
    ],
    'en': [
        {"title": "Walking Daily Reduces Cardiovascular Risk in Seniors", "summary": "A new study confirms that seniors aged 60+ who walk regularly for 30 minutes can significantly reduce cardiovascular disease risk.", "source": "CDC", "link": "https://www.cdc.gov/aging/features/senior-wellness.html"},
        {"title": "Flu Vaccination Strongly Recommended for Seniors", "summary": "The CDC urges all adults 65 and older to receive an annual flu vaccine to reduce hospitalizations.", "source": "CDC", "link": "https://www.cdc.gov/flu/highrisk/65over.htm"},
        {"title": "New Guidelines for Bone Health in Older Adults", "summary": "Updated guidelines recommend adults over 65 get regular bone density screenings to detect osteoporosis early.", "source": "NIH", "link": "https://www.niams.nih.gov/health-topics/osteoporosis"},
        {"title": "Mediterranean Diet Linked to Better Brain Health", "summary": "Following a Mediterranean diet rich in fruits, vegetables, and healthy fats can reduce cognitive decline risk in adults over 60.", "source": "American Heart Association", "link": "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/mediterranean-diet"},
        {"title": "Strength Training Benefits Seniors Over 60", "summary": "Resistance exercise twice a week helps seniors maintain muscle mass, improve balance, and reduce fall risk significantly.", "source": "NIH", "link": "https://www.nia.nih.gov/health/exercise-physical-activity"},
        {"title": "Managing Diabetes in Older Adults", "summary": "New research shows that lifestyle changes including diet and exercise can help older adults manage Type 2 diabetes as effectively as medication.", "source": "American Diabetes Association", "link": "https://www.diabetes.org/aging"},
        {"title": "Social Connection Key to Senior Mental Health", "summary": "Loneliness and social isolation significantly increase risk of depression and cognitive decline in older adults. Regular social activities are vital.", "source": "NIMH", "link": "https://www.nimh.nih.gov/health/topics/older-adults-and-mental-health"},
        {"title": "Sleep Quality Affects Dementia Risk", "summary": "Poor sleep quality is linked to increased risk of Alzheimer's disease. Adults over 60 should aim for 7-8 hours of quality sleep nightly.", "source": "Alzheimer's Association", "link": "https://www.alz.org/alzheimers-dementia/what-is-dementia/related_conditions/sleep-issues-and-sundowning"},
        {"title": "Hydration Tips for Older Adults", "summary": "Seniors are at higher risk of dehydration due to decreased thirst sensation. Drinking 6-8 glasses of water daily is essential for kidney health.", "source": "National Council on Aging", "link": "https://www.ncoa.org/article/hydration-tips-for-older-adults"},
    ],
    'ja': [
        {"title": "高齢者の定期的なウォーキングが心血管疾患を予防", "summary": "毎日30分以上のウォーキングが60歳以上の高齢者の心血管疾患リスクを大幅に低下させます。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html"},
        {"title": "高齢者の骨粗鬆症検診の重要性", "summary": "60歳以上の高齢者に骨粗鬆症検診の定期受診を推奨しています。早期発見と予防が重要です。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/seikatsu/hone.html"},
        {"title": "インフルエンザ予防接種のすすめ", "summary": "高齢者はインフルエンザ重症化リスクが高いため、毎年予防接種が推奨されています。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kekkaku-kansenshou01/index.html"},
        {"title": "睡眠の質が健康寿命に与える影響", "summary": "質の高い睡眠が高齢者の健康寿命延伸に重要であることが示されました。", "source": "厚生労働省", "link": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/suimin/index.html"},
        {"title": "高齢者の筋力低下を防ぐ運動習慣", "summary": "週2回以上の筋力トレーニングが高齢者の筋肉量維持と転倒予防に効果的です。スクワットや軽いダンベル運動から始めましょう。", "source": "日本整形外科学会", "link": "https://www.joa.or.jp"},
        {"title": "認知症予防のための生活習慣", "summary": "社会的なつながりを保ち、趣味活動を続けることが認知症リスクを下げることが研究で示されています。", "source": "認知症予防財団", "link": "https://www.mainichi-kaigo.com"},
        {"title": "高齢者の熱中症予防対策", "summary": "高齢者は体温調節機能が低下しているため、こまめな水分補給とエアコンの適切な使用が重要です。", "source": "環境省", "link": "https://www.wbgt.env.go.jp"},
        {"title": "糖尿病と高血圧の同時管理について", "summary": "生活習慣病を複数抱える高齢者は、食事療法と運動療法を組み合わせることで合併症リスクを大幅に減らせます。", "source": "日本糖尿病学会", "link": "https://www.jds.or.jp"},
        {"title": "老眼・白内障の早期発見と治療", "summary": "定期的な眼科検診により白内障や緑内障を早期発見できます。視力低下は転倒リスクにも関係するため注意が必要です。", "source": "日本眼科学会", "link": "https://www.nichigan.or.jp"},
    ],
    'zh': [
        {"title": "规律步行有效预防老年人心血管疾病", "summary": "每天步行30分钟以上可显著降低60岁以上老年人患心血管疾病的风险，同时有助于控制血压和血糖。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "60岁以上老年人应定期检查血压和血糖", "summary": "建议60岁以上老年人定期检查血压和血糖水平，以预防高血压和糖尿病等慢性疾病。早期发现早期治疗效果更佳。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "太极拳有助于改善老年人平衡能力", "summary": "坚持练习太极拳的老年人跌倒风险降低了40%，同时有助于缓解关节疼痛，增强心肺功能。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "老年人冬季健康防护指南", "summary": "冬季需特别注意防寒保暖，建议接种流感和肺炎疫苗，适量补充维生素D，保持室内适宜温度和湿度。", "source": "国家卫生健康委员会", "link": "https://www.nhc.gov.cn/jkj/s5879/list.shtml"},
        {"title": "老年人肌少症预防与营养管理", "summary": "65岁以上老年人需增加优质蛋白质摄入，每日每公斤体重摄入1.2克蛋白质，配合适当抗阻运动预防肌肉流失。", "source": "中国营养学会", "link": "https://www.cnsoc.org"},
        {"title": "老年痴呆症的早期识别与预防", "summary": "记忆力减退、语言障碍是老年痴呆早期症状，应及时就医。保持社交活动和脑力锻炼有助于延缓发病。", "source": "中国老年医学学会", "link": "https://www.cgss.com.cn"},
        {"title": "老年人骨质疏松的预防与治疗", "summary": "补充钙和维生素D、适量户外运动是预防骨质疏松的有效方法。建议每年进行骨密度检测。", "source": "中华医学会骨质疏松学分会", "link": "https://www.nhc.gov.cn"},
        {"title": "糖尿病老年患者的血糖管理", "summary": "老年糖尿病患者应注意低血糖风险，合理饮食、适度运动、规律监测血糖是管理关键。", "source": "中华糖尿病学会", "link": "https://www.diab.net.cn"},
        {"title": "老年人心理健康的维护", "summary": "保持积极乐观的心态、参与社区活动、维持家庭联系对老年人心理健康至关重要，可有效预防抑郁症。", "source": "中国心理卫生协会", "link": "https://www.camh.org.cn"},
    ],
}


@router.get("/health-news")
def get_health_news(language: str = Query(default='ko')):
    feed_info = RSS_FEEDS.get(language, RSS_FEEDS['ko'])

    if not feed_info['url']:
        return _fallback(language, feed_info)

    try:
        feed = feedparser.parse(feed_info['url'], request_headers={'User-Agent': UA})
        entries = feed.entries[:9]

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

        # If RSS returned fewer than 9, supplement with fallback items
        if len(news) < 9:
            fallback_items = FALLBACKS.get(language, FALLBACKS['ko'])
            existing_titles = {n['title'] for n in news}
            for item in fallback_items:
                if len(news) >= 9:
                    break
                if item['title'] not in existing_titles:
                    news.append({
                        "flag": feed_info['flag'],
                        "country": feed_info['country'],
                        "language": language,
                        "title": item['title'],
                        "summary": item['summary'],
                        "source": item['source'],
                        "source_url": item['link'],
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
            for item in items[:9]
        ]
    }
