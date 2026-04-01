import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';

const HEALTH_DATA: Record<string, any> = {
  '심혈관 건강': {
    icon: '🫀',
    color: '#e53935',
    lightColor: '#ffebee',
    summary: '심혈관 건강은 혈압과 콜레스테롤 관리에서 시작됩니다.',
    tips: [
      { title: '혈압 정상 범위', desc: '수축기 120mmHg 미만, 이완기 80mmHg 미만이 정상입니다.' },
      { title: '나쁜 콜레스테롤(LDL) 낮추기', desc: '포화지방 섭취를 줄이고 등푸른 생선·견과류를 섭취하세요.' },
      { title: '매일 30분 유산소 운동', desc: '빠르게 걷기, 수영, 자전거 타기가 심장 건강에 효과적입니다.' },
      { title: '금연·절주', desc: '흡연은 심혈관 위험을 2배 높입니다. 음주는 하루 1잔 이내로 줄이세요.' },
      { title: '스트레스 관리', desc: '명상, 복식호흡, 산책으로 스트레스를 낮추면 혈압이 안정됩니다.' },
    ],
    info: '65세 이상은 1년에 1회 이상 혈압·콜레스테롤 검사를 받으세요.',
  },
  '관절·뼈 건강': {
    icon: '🦴',
    color: '#f57c00',
    lightColor: '#fff3e0',
    summary: '골밀도 유지와 근력 강화로 낙상을 예방하세요.',
    tips: [
      { title: '칼슘 충분히 섭취', desc: '우유, 치즈, 두부, 멸치 등 칼슘이 풍부한 식품을 매일 드세요.' },
      { title: '비타민 D 보충', desc: '햇빛을 하루 15~20분 쬐거나 비타민 D 보충제를 드세요.' },
      { title: '근력 운동', desc: '주 2~3회 가벼운 스쿼트·밴드 운동으로 근육과 뼈를 강화하세요.' },
      { title: '낙상 예방', desc: '미끄럼 방지 매트, 욕실 손잡이 설치 등 가정 내 환경을 개선하세요.' },
      { title: '관절 부담 줄이기', desc: '체중 감량과 수영·자전거 같은 관절에 부담이 적은 운동을 선택하세요.' },
    ],
    info: '65세 이상 여성, 70세 이상 남성은 골밀도 검사(DEXA)를 받으세요.',
  },
  '식이·혈당': {
    icon: '🥗',
    color: '#388e3c',
    lightColor: '#e8f5e9',
    summary: '저당·저염 식단으로 혈당과 혈압을 함께 관리하세요.',
    tips: [
      { title: '정제 탄수화물 줄이기', desc: '흰쌀·흰빵 대신 현미·통밀·잡곡을 드세요.' },
      { title: '식사 순서 지키기', desc: '채소 → 단백질 → 탄수화물 순서로 드시면 혈당 급상승을 막을 수 있습니다.' },
      { title: '국·찌개 염분 줄이기', desc: '국물은 절반만 드시고, 나트륨 하루 2,300mg(소금 약 1 작은술) 이내로 제한하세요.' },
      { title: '규칙적인 식사', desc: '하루 3끼를 일정한 시간에 드시면 혈당 변동을 줄일 수 있습니다.' },
      { title: '식후 가벼운 산책', desc: '식후 10~15분 산책이 혈당 조절에 효과적입니다.' },
    ],
    info: '공복 혈당 100mg/dL 이상이면 의사와 상담하세요.',
  },
  '두뇌·수면': {
    icon: '🧠',
    color: '#5c35cc',
    lightColor: '#ede7f6',
    summary: '두뇌 활동과 충분한 수면이 치매 예방의 핵심입니다.',
    tips: [
      { title: '두뇌 자극 활동', desc: '독서, 퍼즐, 바둑, 악기 연주 등 두뇌를 쓰는 활동을 매일 하세요.' },
      { title: '규칙적인 수면', desc: '매일 같은 시간에 자고 일어나며, 7~8시간 수면을 유지하세요.' },
      { title: '사회적 교류', desc: '가족·친구와의 교류, 모임 참여가 치매 예방에 큰 효과가 있습니다.' },
      { title: '지중해식 식단', desc: '올리브유, 생선, 채소, 견과류 중심의 식단이 두뇌 건강에 좋습니다.' },
      { title: '수면 환경 개선', desc: '취침 1시간 전 스마트폰을 끄고, 어둡고 서늘한 환경에서 주무세요.' },
    ],
    info: '기억력 저하, 길 잃음 등 초기 증상이 있으면 치매 검진을 받으세요.',
  },
};

export default function HealthInfoScreen({ route, navigation }: any) {
  const category = route?.params?.category || '심혈관 건강';
  const data = HEALTH_DATA[category] || HEALTH_DATA['심혈관 건강'];
  const categories = Object.keys(HEALTH_DATA);

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: data.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={s.headerIcon}>{data.icon}</Text>
        <Text style={s.headerTitle}>{category}</Text>
        <Text style={s.headerSummary}>{data.summary}</Text>
      </View>

      {/* 카테고리 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat}
            style={[s.catChip, cat === category && { backgroundColor: data.color }]}
            onPress={() => navigation.replace('HealthInfo', { ...route.params, category: cat })}>
            <Text style={[s.catChipTxt, cat === category && { color: '#fff' }]}>
              {HEALTH_DATA[cat].icon} {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 건강 팁 */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>💡 건강 관리 팁</Text>
        {data.tips.map((tip: any, i: number) => (
          <View key={i} style={[s.tipCard, { borderLeftColor: data.color }]}>
            <Text style={[s.tipNum, { color: data.color }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.tipTitle}>{tip.title}</Text>
              <Text style={s.tipDesc}>{tip.desc}</Text>
            </View>
          </View>
        ))}

        {/* 검진 안내 */}
        <View style={[s.infoBox, { backgroundColor: data.lightColor }]}>
          <Text style={s.infoIcon}>🏥</Text>
          <Text style={[s.infoTxt, { color: data.color }]}>{data.info}</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 52,
    paddingBottom: 24, paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 12 },
  backTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  headerIcon: { fontSize: 40, marginBottom: 6 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSummary: { fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },
  catScroll: { backgroundColor: '#fff', maxHeight: 56 },
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  catChip: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: '#f0f2f7', borderWidth: 1, borderColor: '#e0e4ea',
  },
  catChipTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 12 },
  tipCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tipNum: { fontSize: 22, fontWeight: '800', lineHeight: 28, minWidth: 24 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#1a2a3a', marginBottom: 4 },
  tipDesc: { fontSize: 13, color: '#555', lineHeight: 19 },
  infoBox: {
    borderRadius: 14, padding: 16, flexDirection: 'row', gap: 10,
    alignItems: 'center', marginTop: 8,
  },
  infoIcon: { fontSize: 24 },
  infoTxt: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
});
