import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CHART_W = width - 48;

// ── 막대 차트 (걸음수) ──
function BarChart({ data, max, color, unit }: { data: { label: string; value: number | null }[]; max: number; color: string; unit: string }) {
  return (
    <View style={chart.wrap}>
      {data.map((d, i) => {
        const ratio = d.value && max > 0 ? d.value / max : 0;
        const barH = Math.max(ratio * 120, d.value ? 4 : 2);
        return (
          <View key={i} style={chart.col}>
            <Text style={chart.val}>{d.value ? (d.value >= 1000 ? `${(d.value/1000).toFixed(1)}k` : d.value) : '-'}</Text>
            <View style={chart.barWrap}>
              <View style={[chart.bar, { height: barH, backgroundColor: d.value ? color : '#E0E0E0' }]} />
            </View>
            <Text style={chart.dayLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── 라인 차트 (혈압/체중/심박) ──
function LineChart({ data, color, min, max }: { data: (number | null)[]; color: string; min: number; max: number }) {
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (CHART_W - 32),
    y: v !== null ? 60 - ((v - min) / range) * 50 : null,
    v,
  }));
  const valid = pts.filter(p => p.y !== null);

  return (
    <View style={{ height: 70, marginTop: 4 }}>
      {/* 라인 연결 */}
      {valid.map((pt, i) => {
        if (i === 0) return null;
        const prev = valid[i - 1];
        const dx = pt.x - prev.x;
        const dy = (pt.y as number) - (prev.y as number);
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: prev.x + 16,
            top: (prev.y as number) + 4,
            width: len,
            height: 2,
            backgroundColor: color,
            opacity: 0.5,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: '0 0',
          }} />
        );
      })}
      {/* 점 */}
      {pts.map((pt, i) => pt.y !== null ? (
        <View key={i} style={{
          position: 'absolute',
          left: pt.x + 10,
          top: (pt.y as number) - 1,
          width: 10, height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }} />
      ) : null)}
      {/* 값 라벨 */}
      {pts.map((pt, i) => pt.v !== null ? (
        <Text key={`l${i}`} style={{
          position: 'absolute',
          left: pt.x + 4,
          top: (pt.y as number) - 16,
          fontSize: 9, color: '#555', width: 30, textAlign: 'center',
        }}>{pt.v}</Text>
      ) : null)}
    </View>
  );
}

export default function DashboardScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { t } = useLanguage();

  const [records, setRecords]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res  = await fetch(`${API_URL}/health/history/${userId}?days=7`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch {}
    finally { setLoading(false); }
  };

  // 7일 날짜 배열 생성 (오늘 기준)
  const get7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateKey: d.toISOString().slice(0, 10),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
      };
    });
  };

  const days = get7Days();

  const getVal = (dateKey: string, field: string) => {
    const rec = records.find(r => (r.date || r.recorded_at || '').slice(0, 10) === dateKey);
    return rec ? rec[field] ?? null : null;
  };

  const stepsData  = days.map(d => ({ label: d.label, value: getVal(d.dateKey, 'steps') }));
  const bpSys      = days.map(d => getVal(d.dateKey, 'blood_pressure_systolic'));
  const bpDia      = days.map(d => getVal(d.dateKey, 'blood_pressure_diastolic'));
  const weightData = days.map(d => getVal(d.dateKey, 'weight'));
  const hrData     = days.map(d => getVal(d.dateKey, 'heart_rate'));

  const avg = (arr: (number|null)[]) => {
    const vals = arr.filter(v => v !== null) as number[];
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const avgSteps  = avg(stepsData.map(d => d.value));
  const avgBpSys  = avg(bpSys);
  const avgWeight = avg(weightData);
  const avgHr     = avg(hrData);

  const bpMin = Math.min(...(bpSys.filter(v => v !== null) as number[]), 80) - 5;
  const bpMax = Math.max(...(bpSys.filter(v => v !== null) as number[]), 140) + 5;
  const wMin  = Math.min(...(weightData.filter(v => v !== null) as number[]), 50) - 2;
  const wMax  = Math.max(...(weightData.filter(v => v !== null) as number[]), 100) + 2;
  const hrMin = Math.min(...(hrData.filter(v => v !== null) as number[]), 50) - 5;
  const hrMax = Math.max(...(hrData.filter(v => v !== null) as number[]), 100) + 5;

  const getAISummary = async () => {
    if (records.length === 0) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/health/weekly-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_name: name,
          age: 65,
          weekly_data: days.map(d => ({
            date: d.dateKey,
            steps: getVal(d.dateKey, 'steps'),
            blood_pressure_systolic: getVal(d.dateKey, 'blood_pressure_systolic'),
            blood_pressure_diastolic: getVal(d.dateKey, 'blood_pressure_diastolic'),
            sleep_hours: null,
            weight_kg: getVal(d.dateKey, 'weight'),
          })),
        }),
      });
      const data = await res.json();
      setAiSummary(data.data?.summary || '');
    } catch {}
    finally { setAiLoading(false); }
  };

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const AvgBadge = ({ label, value, unit, color }: any) => (
    <View style={[styles.avgBadge, { borderColor: color }]}>
      <Text style={[styles.avgVal, { color }]}>{value ?? '--'}</Text>
      <Text style={styles.avgUnit}>{unit}</Text>
      <Text style={styles.avgLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 {t.dashboardTitle}</Text>
        <Text style={styles.subtitle}>7일 건강 트렌드</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>데이터 불러오는 중...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>건강 기록이 없습니다{'\n'}건강기록 화면에서 수치를 입력해주세요</Text>
          <TouchableOpacity style={styles.goRecordBtn} onPress={() => navigation.navigate('Health', { userId })}>
            <Text style={styles.goRecordText}>건강 기록 입력하러 가기 →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 주간 평균 배지 */}
          <View style={styles.avgRow}>
            <AvgBadge label="평균 걸음" value={avgSteps ? avgSteps.toLocaleString() : null} unit="보" color="#2D6A4F" />
            <AvgBadge label="평균 혈압" value={avgBpSys ? `${avgBpSys}` : null} unit="mmHg" color="#3B82F6" />
            <AvgBadge label="평균 심박" value={avgHr} unit="bpm" color="#EF4444" />
            <AvgBadge label="평균 체중" value={avgWeight} unit="kg" color="#F59E0B" />
          </View>

          {/* 걸음수 막대그래프 */}
          <Section title="🚶 걸음수 (7일)">
            <BarChart
              data={stepsData}
              max={Math.max(...stepsData.map(d => d.value || 0), 1)}
              color="#52B788"
              unit="보"
            />
            <View style={styles.goalRow}>
              <Text style={styles.goalText}>목표 5,000보</Text>
              <Text style={[styles.goalText, { color: (avgSteps ?? 0) >= 5000 ? '#2D6A4F' : '#F59E0B' }]}>
                주평균 {avgSteps ? avgSteps.toLocaleString() : '--'}보  {(avgSteps ?? 0) >= 5000 ? '✅' : '⚠️'}
              </Text>
            </View>
          </Section>

          {/* 혈압 트렌드 */}
          {bpSys.some(v => v !== null) && (
            <Section title="❤️ 혈압 트렌드 (수축기 mmHg)">
              <View style={styles.dayLabels}>
                {days.map((d, i) => <Text key={i} style={styles.dayLabel}>{d.label}</Text>)}
              </View>
              <LineChart data={bpSys} color="#3B82F6" min={bpMin} max={bpMax} />
              <View style={styles.refRow}>
                <Text style={styles.refText}>🟢 정상 &lt;120  🟡 주의 120-139  🔴 고혈압 ≥140</Text>
              </View>
            </Section>
          )}

          {/* 심박수 트렌드 */}
          {hrData.some(v => v !== null) && (
            <Section title="💓 심박수 트렌드 (bpm)">
              <View style={styles.dayLabels}>
                {days.map((d, i) => <Text key={i} style={styles.dayLabel}>{d.label}</Text>)}
              </View>
              <LineChart data={hrData} color="#EF4444" min={hrMin} max={hrMax} />
              <View style={styles.refRow}>
                <Text style={styles.refText}>🟢 정상 60-100 bpm</Text>
              </View>
            </Section>
          )}

          {/* 체중 트렌드 */}
          {weightData.some(v => v !== null) && (
            <Section title="⚖️ 체중 트렌드 (kg)">
              <View style={styles.dayLabels}>
                {days.map((d, i) => <Text key={i} style={styles.dayLabel}>{d.label}</Text>)}
              </View>
              <LineChart data={weightData} color="#F59E0B" min={wMin} max={wMax} />
            </Section>
          )}

          {/* AI 분석 */}
          <View style={styles.aiSection}>
            {aiSummary ? (
              <View style={styles.aiCard}>
                <Text style={styles.aiTitle}>🤖 AI 주간 분석</Text>
                <Text style={styles.aiText}>{aiSummary}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.aiBtn} onPress={getAISummary} disabled={aiLoading}>
                {aiLoading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.aiBtnIcon}>🤖</Text><Text style={styles.aiBtnText}>AI 주간 분석 받기</Text></>
                }
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const chart = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20 },
  col:      { flex: 1, alignItems: 'center' },
  val:      { fontSize: 8, color: '#555', marginBottom: 2 },
  barWrap:  { width: '60%', height: 120, justifyContent: 'flex-end' },
  bar:      { width: '100%', borderRadius: 4, minHeight: 2 },
  dayLabel: { fontSize: 9, color: '#888', marginTop: 4 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 24,
  },
  backBtn:  { marginBottom: 8 },
  backText: { color: '#52B788', fontSize: 16 },
  title:    { fontSize: 26, fontWeight: 'bold', color: '#1B4332' },
  subtitle: { fontSize: 14, color: '#52B788', marginTop: 4 },

  loadingBox:  { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  emptyBox:    { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyEmoji:  { fontSize: 56, marginBottom: 16 },
  emptyText:   { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 26 },
  goRecordBtn: { marginTop: 20, backgroundColor: '#2D6A4F', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  goRecordText:{ color: '#fff', fontSize: 16, fontWeight: 'bold' },

  avgRow:   { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  avgBadge: { alignItems: 'center', borderWidth: 2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#fff', minWidth: 72 },
  avgVal:   { fontSize: 18, fontWeight: 'bold' },
  avgUnit:  { fontSize: 10, color: '#888' },
  avgLabel: { fontSize: 9, color: '#666', marginTop: 2 },

  section:      { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B4332', marginBottom: 10 },

  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  dayLabel:  { fontSize: 9, color: '#888', width: 30, textAlign: 'center' },

  goalRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  goalText: { fontSize: 12, color: '#888' },

  refRow:  { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  refText: { fontSize: 10, color: '#888' },

  aiSection: { marginHorizontal: 16, marginBottom: 8 },
  aiBtn: { backgroundColor: '#2D6A4F', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  aiBtnIcon: { fontSize: 24 },
  aiBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  aiCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  aiTitle: { fontSize: 17, fontWeight: 'bold', color: '#2D6A4F', marginBottom: 10 },
  aiText:  { fontSize: 15, color: '#444', lineHeight: 24 },
});
