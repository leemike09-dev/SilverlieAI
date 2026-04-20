import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const BG = '#F0F5FB'; const CARD = '#FFFFFF'; const BORDER = '#DDE8F4'; const ACCENT = '#2272B8';
const BAR_H = 80;

// 건강 기록 1개로 간이 점수 계산 (0~100)
function calcScore(r: any): number {
  if (!r) return 0;
  let score = 50; // 기본
  const sys = r.blood_pressure_systolic;
  const dia = r.blood_pressure_diastolic;
  if (sys && dia) {
    if (sys < 120 && dia < 80)       score += 20;
    else if (sys < 130 && dia < 85)  score += 12;
    else if (sys < 140 && dia < 90)  score += 5;
    else                              score -= 10;
  }
  const bs = r.blood_sugar;
  if (bs) {
    if (bs < 100)        score += 15;
    else if (bs < 126)   score += 8;
    else                 score -= 8;
  }
  const steps = r.steps;
  if (steps) {
    if (steps >= 8000)       score += 15;
    else if (steps >= 5000)  score += 8;
    else if (steps >= 3000)  score += 3;
  }
  const hr = r.heart_rate;
  if (hr) {
    if (hr >= 60 && hr <= 80) score += 10;
    else if (hr > 80 && hr <= 100) score += 4;
    else score -= 5;
  }
  return Math.max(10, Math.min(100, score));
}

function avg(arr: number[]): number {
  const valid = arr.filter(v => v > 0);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
}

function trendArrow(vals: number[]): { arrow: string; color: string } {
  const valid = vals.filter(v => v > 0);
  if (valid.length < 2) return { arrow: '→ 데이터 부족', color: '#90A4AE' };
  const first = valid.slice(0, Math.floor(valid.length / 2));
  const last  = valid.slice(Math.floor(valid.length / 2));
  const avgFirst = avg(first); const avgLast = avg(last);
  const diff = avgLast - avgFirst;
  if (diff > 3)  return { arrow: '↑ 상승 중', color: '#E53935' };
  if (diff < -3) return { arrow: '↓ 하락 중', color: '#3DAB7B' };
  return { arrow: '→ 안정적', color: '#2272B8' };
}

// 혈압은 낮을수록 좋음 (반대 방향)
function bpTrend(vals: number[]): { arrow: string; color: string } {
  const t = trendArrow(vals);
  if (t.arrow.startsWith('↑')) return { arrow: '↑ 상승 주의', color: '#E53935' };
  if (t.arrow.startsWith('↓')) return { arrow: '↓ 개선 중',   color: '#3DAB7B' };
  return t;
}

export default function WeeklyReportScreen({ route, navigation }: any) {
  const { name = '', userId: paramId = '' } = route?.params ?? {};
  const [userId, setUserId] = useState(paramId);
  const [records, setRecords]   = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [dateRange, setDateRange] = useState('');

  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem('userId') || paramId;
      setUserId(storedId);
      if (storedId && storedId !== 'demo-user') {
        await loadData(storedId);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/health/history/${uid}?days=7`);
      if (r.ok) {
        const d = await r.json();
        const recs: any[] = d.records || [];
        // 날짜 오름차순 정렬 (오래된 것이 왼쪽)
        recs.sort((a, b) => a.date.localeCompare(b.date));
        setRecords(recs);
        if (recs.length > 0) {
          const first = recs[0].date.slice(5);   // MM-DD
          const last  = recs[recs.length - 1].date.slice(5);
          setDateRange(`${first} — ${last}`);
          fetchAiReport(uid, recs);
        }
      }
    } catch (e) {
      console.log('health history error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiReport = async (uid: string, recs: any[]) => {
    setAiLoading(true);
    try {
      const userName = (await AsyncStorage.getItem('userName')) || name || '회원';
      const userAge  = 70; // TODO: 프로필에서 가져오기
      const weeklyData = recs.map(r => ({
        date: r.date,
        steps: r.steps || null,
        blood_pressure_systolic:  r.blood_pressure_systolic  || null,
        blood_pressure_diastolic: r.blood_pressure_diastolic || null,
        sleep_hours: r.sleep_hours || null,
        weight_kg: r.weight || null,
      }));
      const res = await fetch(`${API}/health/weekly-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, user_name: userName, age: userAge, weekly_data: weeklyData }),
      });
      if (res.ok) {
        const d = await res.json();
        setAiReport(d.data);
      }
    } catch (e) {
      console.log('weekly report ai error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  // 7일 슬롯 구성 (기록 없는 날은 0점)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayKo   = DAYS_KO[d.getDay()];
    const label   = `${d.getMonth() + 1}/${d.getDate()}`;
    const rec = records.find(r => r.date === dateStr);
    return { dateStr, dayKo, label, rec, score: rec ? calcScore(rec) : 0 };
  });

  const scores    = last7.map(d => d.score);
  const maxScore  = Math.max(...scores.filter(s => s > 0), 60);
  const avgScore  = avg(scores);

  // 수치 평균
  const sysList  = records.map(r => r.blood_pressure_systolic).filter(Boolean);
  const diaList  = records.map(r => r.blood_pressure_diastolic).filter(Boolean);
  const hrList   = records.map(r => r.heart_rate).filter(Boolean);
  const bsList   = records.map(r => r.blood_sugar).filter(Boolean);
  const stepList = records.map(r => r.steps).filter(Boolean);
  const wtList   = records.map(r => r.weight).filter(Boolean);

  const avgSys  = avg(sysList);  const avgDia = avg(diaList);
  const avgHr   = avg(hrList);   const avgBs  = avg(bsList);
  const avgStep = avg(stepList); const avgWt  = avg(wtList);

  const BAR_COLORS = ['#93B8DC','#6DA0D0','#4A88C4','#6DA0D0','#2272B8','#1A5FA0','#1A4A8A'];

  if (loading) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ marginTop: 16, fontSize: 18, color: '#90A4AE' }}>건강 기록 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { flex: 1 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />
      <View style={styles.header}>
        <Text style={styles.title}>7일 건강 리포트</Text>
        <Text style={styles.sub}>
          {dateRange || '기록 없음'}{avgScore > 0 ? ` · 평균 ${avgScore}점` : ''}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {records.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A4A8A', marginBottom: 8 }}>아직 기록이 없어요</Text>
            <Text style={{ fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 }}>
              건강 탭에서 혈압·혈당 등을{'\n'}기록하면 여기서 분석해드려요
            </Text>
          </View>
        ) : (
          <>
            {/* ── 막대 차트 ── */}
            <View style={styles.chartBox}>
              <Text style={styles.chartLabel}>WEEKLY HEALTH SCORE</Text>
              <View style={styles.barsRow}>
                {last7.map((day, i) => {
                  const h = day.score > 0 ? Math.round((day.score / maxScore) * BAR_H) : 4;
                  return (
                    <View key={i} style={styles.barWrap}>
                      {day.score > 0
                        ? <Text style={styles.barVal}>{day.score}</Text>
                        : <Text style={[styles.barVal, { color: '#B0BEC5' }]}>-</Text>}
                      <View style={[
                        styles.bar,
                        { height: h, backgroundColor: day.score > 0 ? BAR_COLORS[i] : '#DDE8F4' }
                      ]} />
                      <Text style={styles.barLbl}>{day.dayKo}</Text>
                      <Text style={styles.barDate}>{day.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── 주간 평균 수치 ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 주간 평균 수치</Text>
              <View style={styles.statsGrid}>
                {avgSys && avgDia ? (
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{avgSys}/{avgDia}</Text>
                    <Text style={styles.statLbl}>평균 혈압 (mmHg)</Text>
                  </View>
                ) : null}
                {avgBs ? (
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{avgBs}</Text>
                    <Text style={styles.statLbl}>평균 혈당 (mg/dL)</Text>
                  </View>
                ) : null}
                {avgHr ? (
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{avgHr}</Text>
                    <Text style={styles.statLbl}>평균 심박수 (bpm)</Text>
                  </View>
                ) : null}
                {avgStep ? (
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{avgStep.toLocaleString()}</Text>
                    <Text style={styles.statLbl}>평균 걸음수 (보)</Text>
                  </View>
                ) : null}
                {avgWt ? (
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{avgWt}</Text>
                    <Text style={styles.statLbl}>평균 체중 (kg)</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── 항목별 트렌드 ── */}
            <View style={styles.card}>
              <View style={styles.tagWrap}><Text style={styles.tagTxt}>TREND ANALYSIS</Text></View>
              {sysList.length >= 2 && (() => {
                const t = bpTrend(sysList);
                return (
                  <View style={styles.trendItem}>
                    <Text style={styles.trendIcon}>💗</Text>
                    <Text style={styles.trendLabel}>혈압</Text>
                    <Text style={[styles.trendVal, { color: t.color }]}>{t.arrow}</Text>
                  </View>
                );
              })()}
              {bsList.length >= 2 && (() => {
                const t = bpTrend(bsList); // 혈당도 낮을수록 좋음
                return (
                  <View style={styles.trendItem}>
                    <Text style={styles.trendIcon}>🩸</Text>
                    <Text style={styles.trendLabel}>혈당</Text>
                    <Text style={[styles.trendVal, { color: t.color }]}>{t.arrow}</Text>
                  </View>
                );
              })()}
              {hrList.length >= 2 && (() => {
                const t = trendArrow(hrList);
                return (
                  <View style={styles.trendItem}>
                    <Text style={styles.trendIcon}>💓</Text>
                    <Text style={styles.trendLabel}>심박수</Text>
                    <Text style={[styles.trendVal, { color: t.color }]}>{t.arrow}</Text>
                  </View>
                );
              })()}
              {stepList.length >= 2 && (() => {
                const t = trendArrow(stepList);
                return (
                  <View style={styles.trendItem}>
                    <Text style={styles.trendIcon}>🚶</Text>
                    <Text style={styles.trendLabel}>걸음수</Text>
                    <Text style={[styles.trendVal, { color: t.color }]}>{t.arrow}</Text>
                  </View>
                );
              })()}
              {wtList.length >= 2 && (() => {
                const t = bpTrend(wtList);
                return (
                  <View style={styles.trendItem}>
                    <Text style={styles.trendIcon}>⚖️</Text>
                    <Text style={styles.trendLabel}>체중</Text>
                    <Text style={[styles.trendVal, { color: t.color }]}>{t.arrow}</Text>
                  </View>
                );
              })()}
            </View>

            {/* ── AI 주간 총평 ── */}
            <View style={[styles.card, styles.aiCard]}>
              <View style={styles.tagWrap}><Text style={styles.tagTxt}>AI WEEKLY SUMMARY</Text></View>
              {aiLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={{ fontSize: 18, color: '#90A4AE' }}>AI 분석 중...</Text>
                </View>
              ) : aiReport ? (
                <>
                  <Text style={styles.aiSummary}>{aiReport.summary}</Text>
                  {aiReport.achievements?.length > 0 && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>✅ 잘한 점</Text>
                      {aiReport.achievements.map((a: string, i: number) => (
                        <Text key={i} style={styles.aiBullet}>• {a}</Text>
                      ))}
                    </View>
                  )}
                  {aiReport.improvements?.length > 0 && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>💡 개선할 점</Text>
                      {aiReport.improvements.map((imp: string, i: number) => (
                        <Text key={i} style={styles.aiBullet}>• {imp}</Text>
                      ))}
                    </View>
                  )}
                  {aiReport.recommendation && (
                    <View style={styles.recBox}>
                      <Text style={styles.recTxt}>🎯 {aiReport.recommendation}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ fontSize: 18, color: '#90A4AE', paddingVertical: 8 }}>
                  AI 총평을 불러오지 못했어요
                </Text>
              )}
            </View>

            {/* ── 일별 상세 기록 ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 일별 상세 기록</Text>
              {last7.filter(d => d.rec).map((day, i) => (
                <View key={i} style={[styles.dayRow, i > 0 && styles.dayRowBorder]}>
                  <View style={styles.dayLabel}>
                    <Text style={styles.dayKo}>{day.dayKo}</Text>
                    <Text style={styles.dayDate}>{day.label}</Text>
                  </View>
                  <View style={styles.dayData}>
                    {day.rec.blood_pressure_systolic && (
                      <Text style={styles.dayItem}>
                        💗 {day.rec.blood_pressure_systolic}/{day.rec.blood_pressure_diastolic}
                      </Text>
                    )}
                    {day.rec.blood_sugar && (
                      <Text style={styles.dayItem}>🩸 {day.rec.blood_sugar}</Text>
                    )}
                    {day.rec.heart_rate && (
                      <Text style={styles.dayItem}>💓 {day.rec.heart_rate}bpm</Text>
                    )}
                    {day.rec.steps && (
                      <Text style={styles.dayItem}>🚶 {day.rec.steps.toLocaleString()}보</Text>
                    )}
                    {day.rec.weight && (
                      <Text style={styles.dayItem}>⚖️ {day.rec.weight}kg</Text>
                    )}
                  </View>
                  <View style={styles.dayScore}>
                    <Text style={[styles.dayScoreVal, { color: day.score >= 70 ? '#3DAB7B' : day.score >= 50 ? ACCENT : '#E53935' }]}>
                      {day.score}
                    </Text>
                    <Text style={styles.dayScoreLbl}>점</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: BG },
  header:     { backgroundColor: '#1A4A8A', padding: 18,
                paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
                paddingBottom: 16 },
  title:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  sub:        { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  chartBox:   { backgroundColor: CARD, padding: 18, margin: 14, borderRadius: 18,
                borderWidth: 1, borderColor: BORDER },
  chartLabel: { fontSize: 14, color: '#7A90A8', fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  barsRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_H + 56 },
  barWrap:    { flex: 1, alignItems: 'center', gap: 3, justifyContent: 'flex-end' },
  bar:        { width: '100%', borderRadius: 4 },
  barVal:     { fontSize: 14, fontWeight: '700', color: ACCENT },
  barLbl:     { fontSize: 14, color: '#7A90A8', fontWeight: '600' },
  barDate:    { fontSize: 11, color: '#B0BEC5' },

  card:       { backgroundColor: CARD, padding: 20, marginHorizontal: 14, borderRadius: 18,
                marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  cardTitle:  { fontSize: 20, fontWeight: '800', color: '#1A4A8A', marginBottom: 16 },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statItem:   { flex: 1, minWidth: '45%', backgroundColor: '#EBF3FB', borderRadius: 14,
                padding: 14, alignItems: 'center' },
  statVal:    { fontSize: 22, fontWeight: '900', color: '#1A4A8A', marginBottom: 4 },
  statLbl:    { fontSize: 14, color: '#7A90A8', textAlign: 'center' },

  tagWrap:    { backgroundColor: '#EBF3FB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                alignSelf: 'flex-start', marginBottom: 14 },
  tagTxt:     { color: ACCENT, fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  trendItem:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: BORDER },
  trendIcon:  { fontSize: 22, width: 28 },
  trendLabel: { flex: 1, fontSize: 18, fontWeight: '600', color: '#16273E' },
  trendVal:   { fontSize: 18, fontWeight: '700' },

  aiCard:     { borderLeftWidth: 5, borderLeftColor: '#1A4A8A' },
  aiSummary:  { fontSize: 18, color: '#16273E', lineHeight: 28, marginBottom: 14 },
  aiSection:  { marginBottom: 12 },
  aiSectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A4A8A', marginBottom: 6 },
  aiBullet:   { fontSize: 17, color: '#37474F', lineHeight: 26, marginLeft: 4 },
  recBox:     { backgroundColor: '#EBF3FB', borderRadius: 12, padding: 14, marginTop: 8 },
  recTxt:     { fontSize: 17, color: '#1A4A8A', fontWeight: '600', lineHeight: 26 },

  dayRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  dayRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  dayLabel:   { width: 44, alignItems: 'center' },
  dayKo:      { fontSize: 18, fontWeight: '800', color: '#1A4A8A' },
  dayDate:    { fontSize: 13, color: '#90A4AE' },
  dayData:    { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10 },
  dayItem:    { fontSize: 15, color: '#37474F', backgroundColor: '#F0F5FB',
                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dayScore:   { width: 44, alignItems: 'center' },
  dayScoreVal:{ fontSize: 22, fontWeight: '900' },
  dayScoreLbl:{ fontSize: 13, color: '#90A4AE' },
});
