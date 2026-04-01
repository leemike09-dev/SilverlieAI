import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { DEMO_MODE } from '../App';

const SAMPLE = {
  score: 82, scoreChange: +3, scoreRank: 28,
  comment: '전반적으로 양호합니다. 혈압 관리와 걸음수를 조금 더 신경써보세요.',
  points: [
    { icon: '⚠️', label: '혈압', value: '138/88', status: '주의', color: '#ff9800' },
    { icon: '✅', label: '맥박', value: '72 bpm', status: '정상', color: '#4caf50' },
    { icon: '⚠️', label: '걸음수', value: '4,230보', status: '목표 84%', color: '#ff9800' },
    { icon: '✅', label: '혈당', value: '104 mg', status: '정상', color: '#4caf50' },
  ],
  recs: [
    { icon: '🚶', title: '1,770보 더 걷기', desc: '오후 20분 산책으로 목표 달성 가능', color: '#1a5fbc' },
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

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🤖 AI 건강 분석</Text>
        <Text style={s.headerSub}>{name}님의 오늘 리포트</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 종합 점수 카드 */}
        <View style={s.scoreCard}>
          <View style={s.scoreLeft}>
            <View style={s.scoreRing}>
              <Text style={s.scoreNum}>{d.score}</Text>
              <Text style={s.scoreUnit}>점</Text>
            </View>
          </View>
          <View style={s.scoreRight}>
            <Text style={s.scoreChange}>지난주 대비 +{d.scoreChange}점 ↑</Text>
            <Text style={s.scoreRank}>상위 {d.scoreRank}%</Text>
            <View style={s.progBarWrap}>
              <View style={[s.progBarFill, { width: `${d.score}%` as any }]} />
            </View>
            <Text style={s.scoreComment}>{d.comment}</Text>
          </View>
        </View>

        {/* 개선 포인트 */}
        <Text style={s.sectionTitle}>📋 오늘의 건강 포인트</Text>
        <View style={s.pointsGrid}>
          {d.points.map((p, i) => (
            <View key={i} style={s.pointCard}>
              <Text style={s.pointIcon}>{p.icon}</Text>
              <Text style={s.pointLabel}>{p.label}</Text>
              <Text style={s.pointValue}>{p.value}</Text>
              <Text style={[s.pointStatus, { color: p.color }]}>{p.status}</Text>
            </View>
          ))}
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

        {/* AI 상담 버튼 */}
        <TouchableOpacity style={s.chatBtn}
          onPress={() => navigation.navigate('AIChat', { name, userId })}
          activeOpacity={0.85}>
          <Text style={s.chatIcon}>💬</Text>
          <View>
            <Text style={s.chatTitle}>AI 상담 바로가기</Text>
            <Text style={s.chatSub}>건강에 대해 더 자세히 물어보세요</Text>
          </View>
        </TouchableOpacity>

        {/* 주간 리포트 버튼 */}
        <TouchableOpacity style={s.reportBtn}
          onPress={() => navigation.navigate('WeeklyReport', { name, userId })}
          activeOpacity={0.85}>
          <Text style={s.reportIcon}>📊</Text>
          <View>
            <Text style={s.reportTitle}>AI 주간 리포트</Text>
            <Text style={s.reportSub}>7일 건강 흐름 분석 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 홈으로 */}
        <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
          <Text style={s.homeBtnTxt}>← 홈으로</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const BG   = '#0d1b2a';
const CARD = '#13243a';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0 } : {}),
  },
  header: {
    backgroundColor: BG,
    paddingTop: Platform.OS === 'web' ? 20 : 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2a3a',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // 점수 카드
  scoreCard:  { backgroundColor: CARD, borderRadius: 20, padding: 18, flexDirection: 'row', gap: 16, alignItems: 'center' },
  scoreLeft:  { alignItems: 'center' },
  scoreRing:  { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#4fc3f7', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(79,195,247,0.1)' },
  scoreNum:   { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 28 },
  scoreUnit:  { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  scoreRight: { flex: 1 },
  scoreChange: { fontSize: 13, color: '#4fc3f7', fontWeight: '700', marginBottom: 2 },
  scoreRank:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  progBarWrap: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginBottom: 8 },
  progBarFill: { height: 5, backgroundColor: '#4fc3f7', borderRadius: 3 },
  scoreComment: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 4 },

  // 포인트 그리드
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pointCard:  { width: '47.5%', backgroundColor: CARD, borderRadius: 16, padding: 14, alignItems: 'center' },
  pointIcon:  { fontSize: 22, marginBottom: 4 },
  pointLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  pointValue: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  pointStatus: { fontSize: 12, fontWeight: '700' },

  // 추천 리스트
  recList: { gap: 8 },
  recCard: { backgroundColor: CARD, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4 },
  recIcon:  { fontSize: 26 },
  recTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3 },
  recDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 17 },

  // AI 상담 버튼
  chatBtn:   { backgroundColor: '#1a3a5c', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  chatIcon:  { fontSize: 28 },
  chatTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  chatSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // 주간 리포트
  reportBtn:   { backgroundColor: '#0d47a1', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  reportIcon:  { fontSize: 28 },
  reportTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  reportSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // 홈으로
  homeBtn:    { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  homeBtnTxt: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
});
