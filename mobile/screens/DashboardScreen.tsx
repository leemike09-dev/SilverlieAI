import React, { useState, useEffect, useRef } from 'react';
import { StatusBar,
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Animated, ActivityIndicator,
} from 'react-native';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';

const C = {
  bg:       '#F0F5FB',
  card:     '#FFFFFF',
  sage:     '#3DAB7B',
  sageLt:   '#E6F7EF',
  sageDk:   '#2A8A5E',
  peach:    '#F4956A',
  peachLt:  '#FEF0E8',
  sky:      '#2272B8',
  skyLt:    '#EBF3FB',
  amber:    '#F5A623',
  amberLt:  '#FEF6E7',
  red:      '#E05C5C',
  redLt:    '#FDEAEA',
  text:     '#1E2D3D',
  sub:      '#7A8FA0',
  line:     '#DDE8F4',
};

const DEMO_DATA = {
  score: 82, scoreChange: +3,
  aiAnalysis: '혈압이 다소 높은 편입니다. 나트륨 섭취를 줄이고 오늘 오후 20분 걷기를 권장합니다. 맥박과 혈당은 정상 범위로 유지되고 있어 좋습니다.',
  points: [
    { icon: '⚠️', label: '혈압',   value: '138/88', status: '주의',     color: C.amber, bg: C.amberLt },
    { icon: '✅', label: '맥박',   value: '72 bpm', status: '정상',     color: C.sage,  bg: C.sageLt  },
    { icon: '🚶', label: '걸음수', value: '4,230보', status: '목표 84%', color: C.sky,   bg: C.skyLt   },
    { icon: '✅', label: '혈당',   value: '104 mg', status: '정상',     color: C.sage,  bg: C.sageLt  },
  ],
  recs: [
    { icon: '🚶', title: '1,770보 더 걷기',  desc: '오후 20분 산책으로 목표 달성',    color: C.sky,   bg: C.skyLt   },
    { icon: '🥗', title: '저염식 권장',       desc: '혈압 관리를 위해 나트륨 줄이기',   color: C.sage,  bg: C.sageLt  },
    { icon: '😴', title: '7시간 수면',        desc: '규칙적인 수면이 혈압 안정에 도움', color: '#A78BCA', bg: '#F4EDFB' },
    { icon: '💧', title: '수분 보충',         desc: '하루 1.5L 이상 물 마시기',        color: C.peach, bg: C.peachLt },
  ],
  weeklyScores: [74, 78, 75, 80, 79, 82, 82],
  weekDays: ['월', '화', '수', '목', '금', '토', '오늘'],
};

const maxScore = Math.max(...DEMO_DATA.weeklyScores);

export default function DashboardScreen({ route, navigation }: any) {
  const { name = '홍길동', userId = 'demo-user' } = route?.params ?? {};

  const [data, setData]       = useState(DEMO_DATA);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(scoreAnim, { toValue: data.score / 100, duration: 900, useNativeDriver: false }).start();
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const [, ar] = await Promise.all([
        fetch(`${API}/health/history/${userId}?days=1`),
        fetch(`${API}/health/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        }),
      ]);
      const ad = await ar.json();
      if (ad.score) setData(prev => ({ ...prev, score: ad.score, aiAnalysis: ad.analysis || prev.aiAnalysis }));
    } catch {
      // DEMO_MODE fallback already set
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = data.score >= 80 ? C.sage : data.score >= 60 ? C.amber : C.red;

  return (
    <View style={s.root}>
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* 헤더 */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>AI 건강 분석</Text>
            <Text style={s.headerTitle}>{name}님 오늘 리포트</Text>
          </View>
          {loading && <ActivityIndicator color={C.sage} size="small" />}
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* 종합 점수 카드 */}
          <View style={s.scoreCard}>
            {/* 원형 점수 */}
            <View style={s.scoreCircleWrap}>
              <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[s.scoreNum, { color: scoreColor }]}>{data.score}</Text>
                <Text style={s.scoreUnit}>점</Text>
              </View>
              <View style={[s.scoreBadge, { backgroundColor: scoreColor + '18' }]}>
                <Text style={[s.scoreBadgeTxt, { color: scoreColor }]}>
                  {data.score >= 80 ? '건강 우수' : data.score >= 60 ? '보통' : '주의 필요'}
                </Text>
              </View>
            </View>

            {/* 주간 막대 차트 */}
            <View style={s.weekChart}>
              <Text style={s.weekChartTitle}>주간 점수 추이</Text>
              <View style={s.chartBars}>
                {data.weeklyScores.map((sc, i) => {
                  const pct = sc / maxScore;
                  const isToday = i === data.weeklyScores.length - 1;
                  return (
                    <View key={i} style={s.chartCol}>
                      <View style={s.chartBarWrap}>
                        <View style={[s.chartBar, {
                          height: `${Math.round(pct * 100)}%` as any,
                          backgroundColor: isToday ? scoreColor : C.line,
                        }]} />
                      </View>
                      <Text style={[s.chartDay, isToday && { color: scoreColor, fontWeight: '800' }]}>
                        {data.weekDays[i]}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={s.scoreChange}>
                지난주 대비 {data.scoreChange > 0 ? '+' : ''}{data.scoreChange}점 {data.scoreChange >= 0 ? '↑' : '↓'}
              </Text>
            </View>
          </View>

          {/* AI 분석 */}
          <View style={s.aiCard}>
            <View style={s.aiCardHeader}>
              <Text style={s.aiCardIcon}>🤖</Text>
              <Text style={s.aiCardTitle}>AI 분석 결과</Text>
            </View>
            <Text style={s.aiCardText}>{data.aiAnalysis}</Text>
          </View>

          {/* 4대 건강 지표 */}
          <Text style={s.sectionTitle}>오늘 건강 지표</Text>
          <View style={s.pointsGrid}>
            {data.points.map((p, i) => (
              <View key={i} style={[s.pointCard, { backgroundColor: p.bg }]}>
                <Text style={s.pointIcon}>{p.icon}</Text>
                <Text style={s.pointLabel}>{p.label}</Text>
                <Text style={[s.pointValue, { color: p.color }]}>{p.value}</Text>
                <View style={[s.pointBadge, { backgroundColor: p.color + '20' }]}>
                  <Text style={[s.pointBadgeTxt, { color: p.color }]}>{p.status}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* AI 맞춤 추천 */}
          <Text style={s.sectionTitle}>✨ 오늘의 AI 추천</Text>
          <View style={s.recList}>
            {data.recs.map((r, i) => (
              <View key={i} style={[s.recCard, { backgroundColor: r.bg, borderLeftColor: r.color }]}>
                <Text style={s.recIcon}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.recTitle, { color: r.color }]}>{r.title}</Text>
                  <Text style={s.recDesc}>{r.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* AI 상담 CTA */}
          <TouchableOpacity style={s.chatBtn}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.85}>
            <Text style={s.chatBtnTxt}>🤖 AI에게 더 물어보기</Text>
          </TouchableOpacity>

          <View style={{ height: 16 }} />
        </ScrollView>
      </Animated.View>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F5FB' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A4A8A',
    paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
    paddingHorizontal: 22, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerSub:   { fontSize: 18, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },

  scroll: { padding: 18, gap: 16, paddingBottom: 24 },

  // 점수 카드
  scoreCard:       { backgroundColor: C.card, borderRadius: 24, padding: 20,
                     flexDirection: 'row', gap: 20, alignItems: 'center',
                     shadowColor: '#B8A898', shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  scoreCircleWrap: { alignItems: 'center', gap: 8 },
  scoreCircle:     { width: 90, height: 90, borderRadius: 45, borderWidth: 4,
                     alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  scoreNum:        { fontSize: 32, fontWeight: '900', lineHeight: 34 },
  scoreUnit:       { fontSize: 15, color: C.sub },
  scoreBadge:      { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  scoreBadgeTxt:   { fontSize: 15, fontWeight: '700' },

  weekChart:      { flex: 1 },
  weekChartTitle: { fontSize: 17, color: C.sub, fontWeight: '600', marginBottom: 8 },
  chartBars:      { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 3, marginBottom: 6 },
  chartCol:       { flex: 1, alignItems: 'center', gap: 3 },
  chartBarWrap:   { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: C.line },
  chartBar:       { width: '100%', borderRadius: 4 },
  chartDay:       { fontSize: 14, color: C.sub },
  scoreChange:    { fontSize: 16, color: C.sage, fontWeight: '700' },

  // AI 카드
  aiCard:       { backgroundColor: C.sageLt, borderRadius: 20, padding: 18, borderLeftWidth: 3, borderLeftColor: C.sage },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiCardIcon:   { fontSize: 22 },
  aiCardTitle:  { fontSize: 19, fontWeight: '800', color: C.sageDk },
  aiCardText:   { fontSize: 18, color: C.text, lineHeight: 28 },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },

  // 4지표
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pointCard:  { width: '47%', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 },
  pointIcon:  { fontSize: 30 },
  pointLabel: { fontSize: 17, color: C.sub, fontWeight: '600' },
  pointValue: { fontSize: 24, fontWeight: '900' },
  pointBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  pointBadgeTxt: { fontSize: 16, fontWeight: '700' },

  // 추천
  recList: { gap: 10 },
  recCard: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderLeftWidth: 4 },
  recIcon:  { fontSize: 30 },
  recTitle: { fontSize: 19, fontWeight: '800', marginBottom: 3 },
  recDesc:  { fontSize: 17, color: C.sub, lineHeight: 24 },

  // AI 상담
  chatBtn:    { backgroundColor: C.sky, borderRadius: 18, paddingVertical: 16, alignItems: 'center',
                shadowColor: C.sky, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3 },
  chatBtnTxt: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
});
