import React from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
type Props = { route: any; navigation: any };

const DAYS = ['월','화','수','목','금','토','일'];
const SCORES = [65, 72, 78, 70, 82, 88, 82];
const MAX_SCORE = 100;
const BAR_H = 80;

const BAR_COLORS = ['#93B8DC','#6DA0D0','#4A88C4','#6DA0D0','#2272B8','#1A5FA0','#1A4A8A'];

export default function WeeklyReportScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const avg = Math.round(SCORES.reduce((a,b) => a+b, 0) / SCORES.length);

  return (
    <View style={[styles.safe, {flex:1}]}>
      <View style={styles.header}>
        <Text style={styles.title}>7일 건강 리포트</Text>
        <Text style={styles.sub}>03.25 — 03.31 · 평균 {avg}점</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 막대 차트 */}
        <View style={styles.chartBox}>
          <Text style={styles.chartLabel}>WEEKLY SCORE</Text>
          <View style={styles.barsRow}>
            {SCORES.map((score, i) => {
              const h = Math.round((score / MAX_SCORE) * BAR_H);
              return (
                <View key={i} style={styles.barWrap}>
                  <Text style={styles.barVal}>{score}</Text>
                  <View style={[styles.bar, { height: h, backgroundColor: BAR_COLORS[i] }]} />
                  <Text style={styles.barLbl}>{DAYS[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 평균 통계 */}
        <View style={styles.statsRow}>
          {[
            { n: '5,820', l: '평균걸음' },
            { n: '119/79', l: '평균혈압' },
            { n: '74', l: '평균맥박' },
          ].map((s, i) => (
            <View key={i} style={[styles.statBox, i < 2 && { borderRightWidth: 1, borderRightColor: '#1a2a3a' }]}>
              <Text style={styles.statN}>{s.n}</Text>
              <Text style={styles.statL}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* AI 주간 총평 */}
        <View style={styles.aiBox}>
          <View style={styles.aiTag}><Text style={styles.aiTagTxt}>AI WEEKLY SUMMARY</Text></View>
          <Text style={styles.aiText}>
            이번 주 건강점수 평균{' '}
            <Text style={{ color: '#2272B8', fontWeight: '700' }}>{avg}점</Text>
            으로 지난주 대비{' '}
            <Text style={{ color: '#3DAB7B', fontWeight: '700' }}>+5점</Text>{' '}
            향상됐습니다.{'\n'}걸음수가 꾸준히 늘었고 혈압도 안정적입니다.{'\n'}다음 주는 수분 섭취를 늘려보세요 💧
          </Text>
        </View>

        {/* 항목별 트렌드 */}
        <View style={styles.trendBox}>
          <View style={styles.aiTag}><Text style={styles.aiTagTxt}>TREND ANALYSIS</Text></View>
          {[
            { icon: '🚶', label: '걸음수', trend: '↑ 꾸준히 증가 중', color: '#3DAB7B' },
            { icon: '💗', label: '혈압',   trend: '→ 안정적 유지',   color: '#2272B8' },
            { icon: '💓', label: '맥박',   trend: '→ 정상 범위',     color: '#2272B8' },
            { icon: '🩸', label: '혈당',   trend: '↓ 약간 감소',     color: '#3DAB7B' },
          ].map((t, i) => (
            <View key={i} style={styles.trendItem}>
              <Text style={styles.trendIcon}>{t.icon}</Text>
              <Text style={styles.trendLabel}>{t.label}</Text>
              <Text style={[styles.trendVal, { color: t.color }]}>{t.trend}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const BG = '#F0F5FB'; const CARD = '#FFFFFF'; const BORDER = '#DDE8F4'; const ACCENT = '#2272B8';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: '#1A4A8A', padding: 18, paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  title:  { fontSize: 26, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  chartBox:  { backgroundColor: CARD, padding: 18, margin: 14, borderRadius: 18, borderWidth: 1, borderColor: BORDER },
  chartLabel:{ fontSize: 15, color: '#7A90A8', fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  barsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_H + 36 },
  barWrap:   { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar:       { width: '100%', borderRadius: 4 },
  barVal:    { fontSize: 14, fontWeight: '700', color: ACCENT },
  barLbl:    { fontSize: 14, color: '#7A90A8' },

  statsRow: { flexDirection: 'row', backgroundColor: CARD, marginHorizontal: 14, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  statBox:  { flex: 1, padding: 14, alignItems: 'center' },
  statN:    { fontSize: 20, fontWeight: '800', color: ACCENT, marginBottom: 4 },
  statL:    { fontSize: 15, color: '#7A90A8' },

  aiBox:    { backgroundColor: CARD, padding: 18, marginHorizontal: 14, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  trendBox: { backgroundColor: CARD, padding: 18, marginHorizontal: 14, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  aiTag:    { backgroundColor: '#EBF3FB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
              alignSelf: 'flex-start', marginBottom: 12 },
  aiTagTxt: { color: ACCENT, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  aiText:   { color: '#16273E', fontSize: 16, lineHeight: 26 },

  trendItem:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: BORDER },
  trendIcon:  { fontSize: 22, width: 28 },
  trendLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#16273E' },
  trendVal:   { fontSize: 15, fontWeight: '700' },
});
