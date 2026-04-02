import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

const SAMPLE = {
  score: 82, scoreChange: +3, scoreRank: 28,
  aiAnalysis: '혈압이 다소 높은 편입니다. 나트륨 섭취를 줄이고 오늘 오후 20분 걷기를 권장합니다. 맥박과 혈당은 정상 범위로 유지되고 있습니다.',
  points: [
    { icon: '⚠️', label: '혈압', value: '138/88', status: '주의', color: '#ff9800' },
    { icon: '✅', label: '맥박', value: '72 bpm', status: '정상', color: '#4caf50' },
    { icon: '⚠️', label: '걸음수', value: '4,230보', status: '목표 84%', color: '#ff9800' },
    { icon: '✅', label: '혈당', value: '104 mg', status: '정상', color: '#4caf50' },
  ],
  recs: [
    { icon: '🚶', title: '1,770보 더 걷기', desc: '오후 20분 산책으로 목표 달성', color: '#1a5fbc' },
    { icon: '🥗', title: '저염식 권장', desc: '혈압 관리를 위해 나트륨 줄이기', color: '#388e3c' },
    { icon: '😴', title: '7시간 수면', desc: '규칙적인 수면이 혈압 안정에 도움', color: '#6a1b9a' },
    { icon: '💧', title: '수분 보충', desc: '하루 1.5L 이상 물 마시기', color: '#0288d1' },
  ],
};

export default function DashboardScreen({ route, navigation }: any) {
  const { name = '홍길동', userId = 'demo-user' } = route?.params ?? {};
  const d = SAMPLE;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🤖 AI 건강 분석</Text>
        <Text style={s.headerSub}>{name}님의 오늘 리포트</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 종합 점수 */}
        <View style={s.scoreCard}>
          <View style={s.scoreRing}>
            <Text style={s.scoreNum}>{d.score}</Text>
            <Text style={s.scoreUnit}>점</Text>
          </View>
          <View style={s.scoreRight}>
            <Text style={s.scoreChange}>지난주 대비 +{d.scoreChange}점 ↑</Text>
            <Text style={s.scoreRank}>상위 {d.scoreRank}%</Text>
            <View style={s.progBarWrap}>
              <View style={[s.progBarFill, { width: `${d.score}%` as any }]} />
            </View>
          </View>
        </View>

        {/* AI 분석 (한 박스) */}
        <View style={s.aiBox}>
          <Text style={s.aiBoxLabel}>🤖 AI 분석</Text>
          <Text style={s.aiBoxText}>{d.aiAnalysis}</Text>
          {/* 건강 포인트 인라인 */}
          <View style={s.pointsRow}>
            {d.points.map((p, i) => (
              <View key={i} style={s.pointItem}>
                <Text style={s.pointIcon}>{p.icon}</Text>
                <Text style={s.pointLabel}>{p.label}</Text>
                <Text style={[s.pointStatus, { color: p.color }]}>{p.status}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI 맞춤 추천 */}
        <Text style={s.sectionTitle}>✨ 오늘의 AI 맞춤 추천</Text>
        <View style={s.recList}>
          {d.recs.map((r, i) => (
            <View key={i} style={[s.recCard, { borderLeftColor: r.color }]}>
              <Text style={s.recIcon}>{r.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.recTitle}>{r.title}</Text>
                <Text style={s.recDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 하단 이동 버튼 2개 */}
        <TouchableOpacity style={s.healthBtn} onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.85}>
          <Text style={s.healthBtnTxt}>🫀 건강 화면으로</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
          <Text style={s.homeBtnTxt}>← 홈으로</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      <BottomTabBar navigation={navigation} activeTab="Home" userId={userId} name={name} />
    </View>
  );
}

const BG   = '#0d1b2a';
const CARD = '#13243a';

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: BG,
    ...(Platform.OS === 'web' ? { flex: 1 } : {}),
  },
  header: {
    backgroundColor: BG,
    paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a2a3a',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // 점수 카드
  scoreCard:   { backgroundColor: CARD, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing:   { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#4fc3f7', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(79,195,247,0.1)', flexShrink: 0 },
  scoreNum:    { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 26 },
  scoreUnit:   { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  scoreRight:  { flex: 1 },
  scoreChange: { fontSize: 13, color: '#4fc3f7', fontWeight: '700', marginBottom: 2 },
  scoreRank:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  progBarWrap: { height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3 },
  progBarFill: { height: 5, backgroundColor: '#4fc3f7', borderRadius: 3 },

  // AI 분석 박스
  aiBox:      { backgroundColor: CARD, borderRadius: 18, padding: 16, borderLeftWidth: 3, borderLeftColor: '#4fc3f7' },
  aiBoxLabel: { fontSize: 12, color: '#4fc3f7', fontWeight: '700', marginBottom: 8 },
  aiBoxText:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, marginBottom: 14 },
  pointsRow:  { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12 },
  pointItem:  { alignItems: 'center', flex: 1 },
  pointIcon:  { fontSize: 16, marginBottom: 3 },
  pointLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  pointStatus: { fontSize: 11, fontWeight: '700' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // 추천 리스트
  recList: { gap: 8 },
  recCard: { backgroundColor: CARD, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4 },
  recIcon:  { fontSize: 24 },
  recTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  recDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },

  // 홈으로
  healthBtn:    { backgroundColor: '#1a3a5c', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  healthBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  homeBtn:    { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  homeBtnTxt: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
});
