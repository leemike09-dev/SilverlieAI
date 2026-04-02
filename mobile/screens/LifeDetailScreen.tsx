import React, { useState } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';

type Props = { route: any; navigation: any };

const CONTENT: Record<string, any> = {
  recipe: {
    icon: '🥗', title: '오늘의 건강 레시피',
    sub: '혈압에 좋은 저염 비빔밥',
    tag: '심혈관 건강',
    tagColor: '#e3f2fd', tagText: '#1565c0',
    sections: [
      {
        heading: '재료 (2인분)',
        items: ['현미밥 2공기', '시금치 100g', '당근 ½개', '애호박 ½개',
                '달걀 2개', '참기름 1작은술', '저염 간장 1작은술', '통깨 약간'],
      },
      {
        heading: '만드는 법',
        items: [
          '시금치·당근·애호박을 각각 데쳐 물기를 꼭 짠다',
          '저염 간장과 참기름으로 나물을 살짝 무친다',
          '달걀을 반숙으로 익힌다',
          '따뜻한 현미밥 위에 나물과 달걀을 올린다',
          '기호에 따라 통깨를 뿌린다',
        ],
      },
    ],
    tip: '🩺 저염식은 혈압 관리에 효과적입니다. 국물보다 건더기 위주로 드세요.',
  },
  exercise: {
    icon: '🧘', title: '오늘의 운동',
    sub: '거실에서 하는 관절 스트레칭',
    tag: '관절·유연성',
    tagColor: '#e8f5e9', tagText: '#2e7d32',
    sections: [
      {
        heading: '준비물',
        items: ['의자 1개', '편안한 복장', '물 한 잔'],
      },
      {
        heading: '5가지 동작 (각 30초)',
        items: [
          '① 목 옆으로 기울이기 — 천천히 좌우 각 5회',
          '② 어깨 돌리기 — 앞·뒤로 각 10회',
          '③ 의자 잡고 무릎 올리기 — 좌우 각 10회',
          '④ 발목 돌리기 — 앉아서 좌우 각 10회',
          '⑤ 등 기지개 — 양팔 위로 뻗고 5초 유지, 3회',
        ],
      },
    ],
    tip: '🩺 운동 전 5분 워밍업, 후 5분 쿨다운을 꼭 하세요. 무릎 통증 시 즉시 중단.',
  },
  brain: {
    icon: '🧩', title: '두뇌 트레이닝',
    sub: '숫자 기억력 게임',
    tag: '치매 예방',
    tagColor: '#f3e5f5', tagText: '#7b1fa2',
    sections: [
      {
        heading: '오늘의 게임: 숫자 외우기',
        items: [
          '아래 숫자를 10초간 보세요',
          '눈을 감고 순서대로 떠올려 보세요',
          '맞히면 한 자리씩 늘려가세요',
        ],
      },
      {
        heading: '문제 (10초 후 가려보세요)',
        items: ['⬛ 3 - 7 - 2 - 9', '⬛ 5 - 1 - 8 - 4 - 6', '⬛ 9 - 3 - 7 - 1 - 5 - 2'],
      },
      {
        heading: '추가 두뇌 운동',
        items: ['하루 일기 3줄 쓰기', '어제 먹은 음식 순서대로 말하기', '가족 생일 외우기'],
      },
    ],
    tip: '🧠 매일 10분 두뇌 운동은 인지 기능 유지에 도움이 됩니다.',
  },
  travel: {
    icon: '✈️', title: 'AI 맞춤 여행',
    sub: '',
    tag: 'AI 추천',
    tagColor: '#e3f2fd', tagText: '#1565c0',
    sections: [
      {
        heading: '✈️ 추천 여행지',
        items: [''],
      },
      {
        heading: '🏥 시니어 건강 여행 팁',
        items: [
          '출발 전 주치의와 여행 가능 여부 상담',
          '복용 중인 약은 2배수로 챙기기',
          '여행자 보험 필수 가입 (시니어 특화 상품)',
          '무리한 일정보다 여유 있는 반일 코스 추천',
          '현지 병원 위치 미리 확인',
        ],
      },
      {
        heading: '🎒 짐 꾸리기',
        items: [
          '편한 걷기 신발 (굽 낮고 미끄럼 방지)',
          '무릎 보호대 / 지팡이 (필요 시)',
          '혈압계·혈당계 (지병 있는 경우)',
          '상비약: 소화제·두통약·파스',
          '선크림 SPF 50+ (야외 활동 필수)',
        ],
      },
    ],
    tip: '💡 시니어 할인: 경로 우대 (만 65세 이상) — 기차·버스·입장료 최대 50% 할인',
  },
  culture: {
    icon: '🎭', title: '이번 주 문화 행사',
    sub: '서울 시니어 추천 행사',
    tag: '문화·공연',
    tagColor: '#fff8e1', tagText: '#f57f17',
    sections: [
      {
        heading: '🎵 공연',
        items: [
          '국립국악원 — 정기 공연 (토·일 오후 3시)',
          '세종문화회관 — 클래식 오케스트라 (무료 입장)',
          '서울시립교향악단 — 시니어 할인 50%',
        ],
      },
      {
        heading: '🏛 전시',
        items: [
          '국립중앙박물관 — 상설 전시 무료',
          '덕수궁 — 65세 이상 무료 입장',
          '서울역사박물관 — 서울 70년 특별전',
        ],
      },
      {
        heading: '🌳 야외 활동',
        items: [
          '서울숲 — 봄꽃 나들이 (입장 무료)',
          '북서울꿈의숲 — 산책로 5km',
          '한강공원 — 시니어 요가 클래스 (토 오전 10시)',
        ],
      },
    ],
    tip: '📞 각 행사 예약은 문화포털(culture.go.kr) 또는 전화로 문의하세요.',
  },
};

export default function LifeDetailScreen({ route, navigation }: Props) {
  const { type, name = '회원', userId = 'demo-user', travelTitle, travelSub, travelTags } = route?.params ?? {};
  const [aiDetail, setAiDetail] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchTravelDetail = () => {
    if (!travelTitle || aiLoading) return;
    setAiLoading(true);
    fetch(`${API_URL}/ai/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `시니어 여행지 "${travelTitle}" 에 대해 알려주세요. 교통편, 숙소 추천, 주요 관광지, 맛집을 각 2가지씩 간단히 알려주세요.` }),
    })
      .then(r => r.json())
      .then(d => setAiDetail(d.reply || '정보를 가져오지 못했습니다.'))
      .catch(() => setAiDetail('연결에 실패했습니다. 잠시 후 다시 시도해주세요.'))
      .finally(() => setAiLoading(false));
  };
  const data = CONTENT[type];
  if (!data) return null;

  // travel 타입이면 AI가 생성한 실제 데이터 사용
  const displayTitle = type === 'travel' && travelTitle ? travelTitle : data.title;
  const displaySub   = type === 'travel' && travelSub   ? travelSub   : data.sub;

  if (type === 'travel' && travelTitle) {
    data.sections[0].items = [travelTitle + (travelSub ? ' — ' + travelSub : '')];
    if (travelTags) data.sections[0].items.push('키워드: ' + travelTags);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={[s.tag, { backgroundColor: data.tagColor }]}>
          <Text style={[s.tagText, { color: data.tagText }]}>{data.tag}</Text>
        </View>
        <Text style={s.title}>{data.icon} {displayTitle}</Text>
        <Text style={s.sub}>{displaySub}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {data.sections.map((sec: any, i: number) => (
          <View key={i} style={s.section}>
            <Text style={s.heading}>{sec.heading}</Text>
            {sec.items.map((item: string, j: number) => (
              <View key={j} style={s.itemRow}>
                <View style={s.dot} />
                <Text style={s.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.tipBox}>
          <Text style={s.tipText}>{data.tip}</Text>
        </View>

        {type === 'travel' && (
          <View style={s.aiDetailWrap}>
            {!aiDetail ? (
              <TouchableOpacity style={s.aiDetailBtn} onPress={fetchTravelDetail} disabled={aiLoading}>
                {aiLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.aiDetailBtnText}>🤖 AI에게 상세 정보 물어보기</Text>}
              </TouchableOpacity>
            ) : (
              <View style={s.aiDetailCard}>
                <Text style={s.aiDetailTitle}>🤖 AI 상세 안내</Text>
                <Text style={s.aiDetailText}>{aiDetail}</Text>
                <TouchableOpacity onPress={() => setAiDetail('')} style={s.aiDetailReset}>
                  <Text style={{ fontSize: 12, color: '#90a4ae' }}>↩ 다시 물어보기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={s.backBtn}
          onPress={() => navigation.navigate('Life', { name, userId })}>
          <Text style={s.backBtnText}>← 라이프로 돌아가기</Text>
        </TouchableOpacity>
      </ScrollView>
    
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f1f8e9' },
  header:  { backgroundColor: '#558b2f', padding: 20, paddingTop: 18 },
  tag:     { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10,
             paddingVertical: 4, marginBottom: 10 },
  tagText: { fontSize: 11, fontWeight: '700' },
  title:   { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  sub:     { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
             shadowColor: '#2e7d32', shadowOpacity: 0.06, shadowOffset: { width:0, height:2 }, shadowRadius:6, elevation:2 },
  heading: { fontSize: 14, fontWeight: '800', color: '#2e7d32', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7cb342', marginTop: 6, flexShrink: 0 },
  itemText:{ flex: 1, fontSize: 13, color: '#37474f', lineHeight: 20 },

  tipBox:  { backgroundColor: '#e8f5e9', borderRadius: 14, padding: 14, marginBottom: 14,
             borderLeftWidth: 3, borderLeftColor: '#558b2f' },
  tipText: { fontSize: 13, color: '#2e7d32', lineHeight: 20 },

  backBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15,
             alignItems: 'center', borderWidth: 1.5, borderColor: '#c8e6c9' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: '#558b2f' },

  aiDetailWrap:    { marginBottom: 12 },
  aiDetailBtn:     { backgroundColor: '#1565c0', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  aiDetailBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  aiDetailCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 16,
                     borderLeftWidth: 3, borderLeftColor: '#1565c0',
                     shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width:0, height:2 }, shadowRadius:6, elevation:2 },
  aiDetailTitle:   { fontSize: 13, fontWeight: '800', color: '#1565c0', marginBottom: 10 },
  aiDetailText:    { fontSize: 13, color: '#37474f', lineHeight: 22 },
  aiDetailReset:   { marginTop: 10, alignItems: 'flex-end' },
});
