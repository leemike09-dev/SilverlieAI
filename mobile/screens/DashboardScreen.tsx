import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

type Props = { route: any; navigation: any };

const METRICS = [
  { icon: '🚶', label: '걸음수', key: 'steps',       unit: '',    normal: '8,000+' },
  { icon: '💗', label: '혈압',   key: 'blood_pressure', unit: '',  normal: '120/80' },
  { icon: '💓', label: '맥박',   key: 'heart_rate',   unit: 'bpm', normal: '60–100' },
  { icon: '🩸', label: '혈당',   key: 'blood_sugar',  unit: 'mg',  normal: '<100'   },
];

export default function DashboardScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user', record } = route?.params ?? {};
  const r = record ?? { steps: 6240, blood_pressure: '118/78', heart_rate: 72, blood_sugar: 98 };

  const getValue = (key: string) => {
    const v = r[key];
    if (!v) return '—';
    if (key === 'steps') return Number(v).toLocaleString();
    return String(v);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← 건강</Text>
        </TouchableOpacity>
        <Text style={styles.title}>오늘의 건강 분석</Text>
        <Text style={styles.sub}>AI 종합 리포트</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 건강점수 */}
        <View style={styles.scoreRow}>
          <View style={styles.ring}>
            <Text style={styles.ringN}>82</Text>
            <Text style={styles.ringL}>건강점수</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.siTitle}>전반적으로 양호한 상태입니다</Text>
            <View style={styles.progBar}><View style={[styles.progFill, { width: '82%' }]} /></View>
            <Text style={styles.siSub}>지난주 대비 +3점 · 상위 28%</Text>
          </View>
        </View>

        {/* 지표 4개 */}
        <View style={styles.metricsRow}>
          {METRICS.map(m => (
            <View key={m.key} style={styles.metCard}>
              <Text style={styles.metIcon}>{m.icon}</Text>
              <Text style={styles.metVal}>{getValue(m.key)}</Text>
              <Text style={styles.metLbl}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* AI 분석 */}
        <View style={styles.aiBox}>
          <View style={styles.aiTag}><Text style={styles.aiTagTxt}>AI ANALYSIS</Text></View>
          <Text style={styles.aiText}>
            혈압이 안정적이며 걸음수가 목표치의 78%입니다.{'\n'}
            8,000보 달성 시 심혈관 건강이 크게 개선됩니다.
          </Text>
          <View style={styles.advRow}>
            {[
              { icon: '🚶', title: '+1,760보', sub: '더 걷기' },
              { icon: '💧', title: '수분 보충', sub: '1.5L 이상' },
              { icon: '😴', title: '수면 유지', sub: '7시간' },
            ].map((a, i) => (
              <View key={i} style={styles.advCard}>
                <Text style={styles.advIcon}>{a.icon}</Text>
                <Text style={styles.advTitle}>{a.title}</Text>
                <Text style={styles.advSub}>{a.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI 상담 버튼 */}
        <TouchableOpacity style={styles.chatBtn}
          onPress={() => navigation.navigate('AIChat', { name, userId })}>
          <Text style={styles.chatBtnTxt}>🤖 AI 상담 바로가기</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar navigation={navigation} activeTab="health" userId={userId} name={name} />
    </SafeAreaView>
  );
}

const BG = '#0a1628'; const CARD = '#0e1e35'; const BORDER = '#1a2a3a';
const BLUE = '#1565c0'; const ACCENT = '#4fc3f7';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, padding: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  back:   { fontSize: 12, color: ACCENT, marginBottom: 8 },
  title:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 11, color: '#607d8b', marginTop: 3 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: CARD,
              padding: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  ring:     { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: BLUE,
              backgroundColor: 'rgba(21,101,192,0.15)', justifyContent: 'center',
              alignItems: 'center', flexShrink: 0 },
  ringN:    { color: ACCENT, fontSize: 26, fontWeight: '900', lineHeight: 28 },
  ringL:    { color: '#546e7a', fontSize: 9, marginTop: 2 },
  scoreInfo:{ flex: 1 },
  siTitle:  { color: '#e3f2fd', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  progBar:  { backgroundColor: '#1e2d40', borderRadius: 4, height: 6, marginBottom: 6, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 4, backgroundColor: BLUE },
  siSub:    { color: '#546e7a', fontSize: 11 },

  metricsRow: { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  metCard:    { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: BORDER },
  metIcon:    { fontSize: 16, marginBottom: 4 },
  metVal:     { fontSize: 13, fontWeight: '800', color: ACCENT },
  metLbl:     { fontSize: 9, color: '#546e7a', marginTop: 2 },

  aiBox:    { backgroundColor: BG, padding: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  aiTag:    { backgroundColor: '#0d3b66', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
              alignSelf: 'flex-start', marginBottom: 10 },
  aiTagTxt: { color: ACCENT, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  aiText:   { color: '#b0bec5', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  advRow:   { flexDirection: 'row', gap: 8 },
  advCard:  { flex: 1, backgroundColor: CARD, borderRadius: 10, padding: 10, alignItems: 'center',
              borderWidth: 1, borderColor: BORDER },
  advIcon:  { fontSize: 18, marginBottom: 4 },
  advTitle: { fontSize: 11, color: '#e3f2fd', fontWeight: '700' },
  advSub:   { fontSize: 9, color: '#546e7a', marginTop: 2 },

  chatBtn:    { margin: 18, backgroundColor: BLUE, borderRadius: 14, padding: 16, alignItems: 'center' },
  chatBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
