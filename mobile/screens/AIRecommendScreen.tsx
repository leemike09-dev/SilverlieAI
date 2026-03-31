import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };

const CATS = ['전체','🏃 운동','🥗 식단','🧘 휴식','🧠 두뇌'];

const DEMO_RECS = [
  { icon:'🚶', title:'매일 8,000보 걷기',  sub:'혈압 개선 · 심혈관 강화',    match:96, cat:'🏃 운동' },
  { icon:'🥗', title:'저염 식단 실천',      sub:'혈압 관리 · 나트륨 줄이기',   match:88, cat:'🥗 식단' },
  { icon:'🧘', title:'오후 명상 10분',      sub:'스트레스 감소 · 수면 개선',    match:81, cat:'🧘 휴식' },
  { icon:'💪', title:'가벼운 스트레칭',     sub:'관절 유연성 · 낙상 예방',      match:79, cat:'🏃 운동' },
  { icon:'🧩', title:'두뇌 트레이닝 게임', sub:'인지 기능 유지 · 치매 예방',    match:75, cat:'🧠 두뇌' },
  { icon:'🍵', title:'녹차 하루 2잔',       sub:'항산화 · 혈당 안정',           match:71, cat:'🥗 식단' },
];

const matchColor = (m: number) => {
  if (m >= 90) return { bg:'#1a3a1a', text:'#69f0ae' };
  if (m >= 80) return { bg:'#0d3b66', text:'#4fc3f7' };
  return { bg:'#2a1a2a', text:'#ea80fc' };
};

export default function AIRecommendScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [cat, setCat] = useState('전체');
  const [recs, setRecs] = useState(DEMO_RECS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/ai/recommendations/${userId}`)
      .then(r => r.json())
      .then(data => { if (data?.recommendations?.length) setRecs(data.recommendations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = cat === '전체' ? recs : recs.filter(r => r.cat === cat);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← 라이프</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI 맞춤 추천</Text>
        <Text style={styles.sub}>건강 데이터 기반 · 정밀 분석</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}
        contentContainerStyle={styles.catContent}>
        {CATS.map(c => (
          <TouchableOpacity key={c} style={[styles.catChip, cat === c && styles.catChipOn]}
            onPress={() => setCat(c)}>
            <Text style={[styles.catTxt, cat === c && styles.catTxtOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color="#4fc3f7" size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          {filtered.map((rec, i) => {
            const mc = matchColor(rec.match);
            return (
              <TouchableOpacity key={i} style={styles.recCard} activeOpacity={0.85}>
                <View style={styles.recIcon}><Text style={{ fontSize: 22 }}>{rec.icon}</Text></View>
                <View style={styles.recInfo}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recSub}>{rec.sub}</Text>
                  <View style={[styles.matchBadge, { backgroundColor: mc.bg }]}>
                    <Text style={[styles.matchTxt, { color: mc.text }]}>일치율 {rec.match}%</Text>
                  </View>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <BottomTabBar navigation={navigation} activeTab="life" userId={userId} name={name} />
    </SafeAreaView>
  );
}

const BG = '#0a1628'; const CARD = '#0e1e35'; const BORDER = '#1a2a3a'; const ACCENT = '#4fc3f7';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, padding: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  back:   { fontSize: 12, color: ACCENT, marginBottom: 8 },
  title:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 11, color: '#607d8b', marginTop: 3 },

  catScroll:  { maxHeight: 48, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  catContent: { paddingHorizontal: 14, paddingVertical: 9, gap: 7, flexDirection: 'row' },
  catChip:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: '#1a2a3a', borderWidth: 1, borderColor: BORDER },
  catChipOn:  { backgroundColor: '#1565c0', borderColor: '#1565c0' },
  catTxt:     { fontSize: 12, fontWeight: '600', color: '#546e7a' },
  catTxtOn:   { color: '#fff' },

  loader:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  recCard:  { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 10,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderWidth: 1, borderColor: BORDER },
  recIcon:  { width: 46, height: 46, borderRadius: 12, backgroundColor: '#1a2a3a',
              justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  recInfo:  { flex: 1 },
  recTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  recSub:   { fontSize: 12, color: '#607d8b', marginBottom: 8 },
  matchBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  matchTxt:   { fontSize: 11, fontWeight: '700' },
  arrow:    { color: '#1a2a3a', fontSize: 22 },
});
