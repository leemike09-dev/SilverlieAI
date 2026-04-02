import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
type Props = { route: any; navigation: any };

const DAYS = ['월','화','수','목','금','토','일'];
const SCORES = [65, 72, 78, 70, 82, 88, 82];
const MAX_SCORE = 100;
const BAR_H = 80;

const BAR_COLORS = ['#1a3a5c','#1e5080','#1565c0','#1e5080','#1976d2','#4fc3f7','#29b6f6'];

export default function WeeklyReportScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const avg = Math.round(SCORES.reduce((a,b) => a+b, 0) / SCORES.length);

  return (
    <SafeAreaView style={styles.safe}>
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
            <Text style={{ color: '#4fc3f7', fontWeight: '700' }}>{avg}점</Text>
            으로 지난주 대비{' '}
            <Text style={{ color: '#69f0ae', fontWeight: '700' }}>+5점</Text>{' '}
            향상됐습니다.{'\n'}걸음수가 꾸준히 늘었고 혈압도 안정적입니다.{'\n'}다음 주는 수분 섭취를 늘려보세요 💧
          </Text>
        </View>

        {/* 항목별 트렌드 */}
        <View style={styles.trendBox}>
          <View style={styles.aiTag}><Text style={styles.aiTagTxt}>TREND ANALYSIS</Text></View>
          {[
            { icon: '🚶', label: '걸음수', trend: '↑ 꾸준히 증가 중', color: '#69f0ae' },
            { icon: '💗', label: '혈압',   trend: '→ 안정적 유지',   color: '#4fc3f7' },
            { icon: '💓', label: '맥박',   trend: '→ 정상 범위',     color: '#4fc3f7' },
            { icon: '🩸', label: '혈당',   trend: '↓ 약간 감소',     color: '#69f0ae' },
          ].map((t, i) => (
            <View key={i} style={styles.trendItem}>
              <Text style={styles.trendIcon}>{t.icon}</Text>
              <Text style={styles.trendLabel}>{t.label}</Text>
              <Text style={[styles.trendVal, { color: t.color }]}>{t.trend}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      
  {/* ── 탭바 ── */}
  <View style={{flexDirection:'row', backgroundColor:'#FFFFFF', borderTopWidth:1, borderTopColor:'#F0EDE8', paddingTop:10, paddingBottom:14}}>
    {[
      {{ icon:'🏠', lbl:'오늘',    screen:'SeniorHome', active: 'home' === 'home' }},
      {{ icon:'💊', lbl:'내 약',   screen:'Medication',  active: 'home' === 'med'  }},
      {{ icon:'🤖', lbl:'AI 상담', screen:'AIChat',      active: 'home' === 'ai'   }},
      {{ icon:'👤', lbl:'내 정보', screen:'Settings',    active: 'home' === 'info' }},
    ].map(tab => (
      <TouchableOpacity key={{tab.lbl}} style={{flex:1, alignItems:'center', gap:3}}
        onPress={() => !tab.active && tab.screen && navigation.navigate(tab.screen, {{ userId, name }})}
        activeOpacity={{0.7}}>
        <Text style={{fontSize:22, opacity: tab.active ? 1 : 0.3}}>{tab.icon}</Text>
        <Text style={{fontSize:10, color: tab.active ? '#6BAE8F' : '#8A8A8A', fontWeight: tab.active ? '700' : '500'}}>{tab.lbl}</Text>
        {tab.active && <View style={{width:4,height:4,borderRadius:2,backgroundColor:'#6BAE8F',marginTop:1}} />}
      </TouchableOpacity>
    ))}
  </View>
    </SafeAreaView>
  );
}

const BG = '#0a1628'; const CARD = '#0e1e35'; const BORDER = '#1a2a3a'; const ACCENT = '#4fc3f7';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, padding: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 11, color: '#607d8b', marginTop: 3 },

  chartBox:  { backgroundColor: CARD, padding: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  chartLabel:{ fontSize: 10, color: '#546e7a', fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  barsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_H + 36 },
  barWrap:   { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar:       { width: '100%', borderRadius: 4 },
  barVal:    { fontSize: 9, fontWeight: '700', color: ACCENT },
  barLbl:    { fontSize: 9, color: '#546e7a' },

  statsRow: { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  statBox:  { flex: 1, padding: 14, alignItems: 'center' },
  statN:    { fontSize: 15, fontWeight: '800', color: ACCENT, marginBottom: 3 },
  statL:    { fontSize: 9, color: '#546e7a' },

  aiBox:    { backgroundColor: BG, padding: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  trendBox: { backgroundColor: BG, padding: 18 },
  aiTag:    { backgroundColor: '#0d3b66', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
              alignSelf: 'flex-start', marginBottom: 12 },
  aiTagTxt: { color: ACCENT, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  aiText:   { color: '#b0bec5', fontSize: 13, lineHeight: 22 },

  trendItem:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: BORDER },
  trendIcon:  { fontSize: 18, width: 24 },
  trendLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#e3f2fd' },
  trendVal:   { fontSize: 12, fontWeight: '700' },
});
