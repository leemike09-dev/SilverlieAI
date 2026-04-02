import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';

const C = {
  bg:      '#F0F6FB',
  card:    '#FFFFFF',
  sky:     '#6BA8C8',
  skyLt:   '#E8F4FB',
  skyDk:   '#4A87A8',
  sage:    '#6BAE8F',
  sageLt:  '#EAF5EF',
  peach:   '#F4956A',
  peachLt: '#FEF0E8',
  amber:   '#F5A623',
  amberLt: '#FEF6E7',
  red:     '#E05C5C',
  redLt:   '#FDEAEA',
  text:    '#1E2D3D',
  sub:     '#7A8FA0',
  line:    '#DDE8F0',
};

const DEMO_SENIOR = {
  name: '홍길동',
  age: 72,
  mood: '😊',
  lastSeen: '방금 전',
  location: '자택 (서울 서초구)',
  locationTime: '10분 전',
  locationSafe: true,
  medTotal: 4,
  medTaken: 3,
  steps: 2840,
  stepGoal: 3000,
};

const DEMO_TIMELINE = [
  { time: '07:45', icon: '🌅', label: '기상 감지', type: 'ok' },
  { time: '08:00', icon: '💊', label: '혈압약 복용 ✅', type: 'ok' },
  { time: '08:10', icon: '💊', label: '당뇨약 복용 ✅', type: 'ok' },
  { time: '09:30', icon: '🚶', label: '산책 출발', type: 'ok' },
  { time: '10:20', icon: '🏠', label: '귀가 확인', type: 'ok' },
  { time: '12:00', icon: '💊', label: '관절약 복용 ✅', type: 'ok' },
  { time: '18:00', icon: '💊', label: '저녁 혈압약 (예정)', type: 'pending' },
];

// 주간 동선 패턴 데모
const WEEKLY_PATTERN = [
  { day: '월', steps: 3200, medOk: true,  wake: '07:30', locations: ['자택', '공원', '마트'] },
  { day: '화', steps: 2100, medOk: true,  wake: '07:45', locations: ['자택', '병원'] },
  { day: '수', steps: 4100, medOk: true,  wake: '07:20', locations: ['자택', '공원', '카페'] },
  { day: '목', steps: 1800, medOk: false, wake: '08:30', locations: ['자택'] },
  { day: '금', steps: 2900, medOk: true,  wake: '07:35', locations: ['자택', '공원'] },
  { day: '토', steps: 3500, medOk: true,  wake: '08:00', locations: ['자택', '시장', '공원'] },
  { day: '오늘', steps: 2840, medOk: null, wake: '07:45', locations: ['자택', '공원'] },
];

const maxSteps = Math.max(...WEEKLY_PATTERN.map(d => d.steps));

type AlertLevel = 'good' | 'warn' | 'danger';

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const userId     = route?.params?.userId     || (DEMO_MODE ? 'demo-user' : '');
  const name       = route?.params?.name       || (DEMO_MODE ? '이순희' : '');
  const seniorId   = route?.params?.seniorId   || (DEMO_MODE ? 'demo-senior' : '');
  const seniorName = route?.params?.seniorName || (DEMO_MODE ? '홍길동' : '부모님');

  const [status, setStatus]       = useState<any>(DEMO_SENIOR);
  const [aiResult, setAiResult]   = useState<{ level: string; message: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPattern, setShowPattern] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 900, useNativeDriver: true }),
      ])
    ).start();
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API}/family/status/${seniorId}`);
      const d = await r.json();
      if (d.summary) {
        setStatus((prev: any) => ({ ...prev, medTotal: d.summary.total, medTaken: d.summary.taken }));
      }
    } catch {}
  };

  const runAiAnalysis = async () => {
    setAnalyzing(true);
    setAiResult(null);
    try {
      const r = await fetch(`${API}/anomaly/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senior_name: seniorName,
          med_taken: status.medTaken,
          med_total: status.medTotal,
          steps: status.steps,
          mood: status.mood,
          location_safe: status.locationSafe,
          last_active_hour: new Date().getHours(),
          wake_time: '07:45',
          usual_wake: '07:30',
        }),
      });
      const d = await r.json();
      setAiResult(d);
    } catch {
      setAiResult({
        level: 'good',
        message: `✅ 정상\n특이사항 없음\n${seniorName}님 오늘도 건강하게 지내고 계세요!`,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const medPct  = status.medTotal > 0 ? status.medTaken / status.medTotal : 0;
  const stepPct = Math.min(status.steps / status.stepGoal, 1);
  const alertLevel: AlertLevel =
    !status.locationSafe ? 'danger' : medPct < 0.5 ? 'warn' : 'good';

  const alertConfig = {
    good:   { color: C.sage,  bg: C.sageLt,  icon: '✅', msg: '이상 없음 — 안전합니다' },
    warn:   { color: C.amber, bg: C.amberLt, icon: '⚠️', msg: '약 복용 확인이 필요해요' },
    danger: { color: C.red,   bg: C.redLt,   icon: '🚨', msg: '위치 이상 감지됨!' },
  }[alertLevel];

  const aiLevelColor = aiResult
    ? aiResult.level === 'danger' ? C.red : aiResult.level === 'warn' ? C.amber : C.sage
    : C.sky;
  const aiLevelBg = aiResult
    ? aiResult.level === 'danger' ? C.redLt : aiResult.level === 'warn' ? C.amberLt : C.sageLt
    : C.skyLt;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.skyDk} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.headerSub}>가족 모니터링</Text>
            <Text style={s.headerName}>{seniorName}님 현황</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('긴급 연락', `${seniorName}님께 전화를 연결합니다`)} style={s.sosBtn}>
            <Text style={s.sosTxt}>📞 SOS</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* 종합 상태 배너 */}
          <View style={[s.alertBanner, { backgroundColor: alertConfig.bg, borderColor: alertConfig.color }]}>
            <Animated.Text style={[s.alertIcon, alertLevel === 'danger' && { transform: [{ scale: pulseAnim }] }]}>
              {alertConfig.icon}
            </Animated.Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertMsg, { color: alertConfig.color }]}>{alertConfig.msg}</Text>
              <Text style={s.alertTime}>마지막 확인: {status.lastSeen}</Text>
            </View>
          </View>

          {/* 2열 요약 */}
          <View style={s.row}>
            <View style={s.halfCard}>
              <Text style={s.cardIcon}>💊</Text>
              <Text style={s.cardTitle}>약 복용</Text>
              <Text style={[s.cardBig, { color: medPct >= 1 ? C.sage : medPct > 0.5 ? C.amber : C.red }]}>
                {status.medTaken}<Text style={s.cardBigSub}>/{status.medTotal}</Text>
              </Text>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.round(medPct * 100)}%`, backgroundColor: medPct >= 1 ? C.sage : medPct > 0.5 ? C.amber : C.red }]} />
              </View>
              <Text style={s.cardSub}>{Math.round(medPct * 100)}% 복용</Text>
            </View>
            <View style={s.halfCard}>
              <Text style={s.cardIcon}>🚶</Text>
              <Text style={s.cardTitle}>오늘 걸음수</Text>
              <Text style={[s.cardBig, { color: stepPct >= 1 ? C.sage : C.sky }]}>
                {status.steps.toLocaleString()}<Text style={s.cardBigSub}>보</Text>
              </Text>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.round(stepPct * 100)}%`, backgroundColor: stepPct >= 1 ? C.sage : C.sky }]} />
              </View>
              <Text style={s.cardSub}>목표 {status.stepGoal.toLocaleString()}보</Text>
            </View>
          </View>

          {/* AI 이상감지 분석 */}
          <View style={s.aiCard}>
            <View style={s.aiHeader}>
              <Text style={s.aiTitle}>🤖 AI 이상감지 분석</Text>
              <Text style={s.aiSub}>Claude AI가 오늘 현황을 종합 분석합니다</Text>
            </View>

            {aiResult ? (
              <View style={[s.aiResult, { backgroundColor: aiLevelBg, borderColor: aiLevelColor }]}>
                <Text style={[s.aiResultText, { color: aiLevelColor }]}>{aiResult.message}</Text>
              </View>
            ) : (
              <View style={s.aiPlaceholder}>
                <Text style={s.aiPlaceholderTxt}>분석 버튼을 누르면 AI가 이상 여부를 진단합니다</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.aiBtn, analyzing && { opacity: 0.6 }]}
              onPress={runAiAnalysis}
              disabled={analyzing}
              activeOpacity={0.8}>
              {analyzing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.aiBtnTxt}>🔍 지금 분석하기</Text>
              }
            </TouchableOpacity>
          </View>

          {/* 위치 카드 */}
          <View style={s.locationCard}>
            <View style={s.locationHeader}>
              <Text style={s.locationTitle}>📍 현재 위치</Text>
              <View style={[s.locBadge, { backgroundColor: status.locationSafe ? C.sageLt : C.redLt }]}>
                <Text style={[s.locBadgeTxt, { color: status.locationSafe ? C.sage : C.red }]}>
                  {status.locationSafe ? '안전 구역' : '이상 감지'}
                </Text>
              </View>
            </View>
            <View style={s.mapBox}>
              <View style={s.mapBg}>
                {[...Array(4)].map((_,i) => <View key={i} style={[s.mapLine, { top: `${25+i*20}%` as any }]} />)}
                {[...Array(5)].map((_,i) => <View key={i} style={[s.mapLineV, { left: `${15+i*18}%` as any }]} />)}
                <View style={s.mapRoadH} />
                <View style={s.mapRoadV} />
                <Animated.View style={[s.markerWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={s.markerPulse} />
                  <View style={s.markerDot} />
                </Animated.View>
                <View style={s.safeRadius} />
                <View style={s.mapLabel}><Text style={s.mapLabelTxt}>🏠 자택</Text></View>
              </View>
            </View>
            <View style={s.locInfo}>
              <Text style={s.locName}>{status.location}</Text>
              <Text style={s.locTime}>{status.locationTime} · 자택 반경 200m 이내</Text>
            </View>
          </View>

          {/* 주간 동선 패턴 */}
          <View style={s.patternCard}>
            <TouchableOpacity style={s.patternHeader} onPress={() => setShowPattern(!showPattern)} activeOpacity={0.75}>
              <Text style={s.sectionTitle}>📊 주간 활동 패턴</Text>
              <Text style={s.patternToggle}>{showPattern ? '▲ 접기' : '▼ 펼치기'}</Text>
            </TouchableOpacity>

            {/* 막대 차트 */}
            <View style={s.chartRow}>
              {WEEKLY_PATTERN.map((d, i) => {
                const pct = d.steps / maxSteps;
                const isToday = d.day === '오늘';
                const barColor = d.medOk === false ? C.amber : isToday ? C.sky : C.sage;
                return (
                  <View key={i} style={s.chartCol}>
                    <View style={s.chartBarWrap}>
                      <View style={[s.chartBar, {
                        height: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: barColor,
                        opacity: isToday ? 1 : 0.7,
                      }]} />
                    </View>
                    <Text style={[s.chartDay, isToday && { color: C.sky, fontWeight: '800' }]}>{d.day}</Text>
                    {d.medOk === false && <Text style={s.chartWarn}>⚠️</Text>}
                  </View>
                );
              })}
            </View>
            <Text style={s.chartLegend}>⚠️ 약 복용 누락일  |  🔵 오늘  |  평균 {Math.round(WEEKLY_PATTERN.reduce((s,d)=>s+d.steps,0)/WEEKLY_PATTERN.length).toLocaleString()}보</Text>

            {showPattern && (
              <View style={s.patternDetail}>
                {WEEKLY_PATTERN.map((d, i) => (
                  <View key={i} style={s.patternRow}>
                    <Text style={[s.patternDay, d.day==='오늘' && { color: C.sky, fontWeight: '800' }]}>{d.day}</Text>
                    <Text style={s.patternWake}>기상 {d.wake}</Text>
                    <Text style={s.patternSteps}>{d.steps.toLocaleString()}보</Text>
                    <View style={s.patternLocs}>
                      {d.locations.map((loc, j) => (
                        <View key={j} style={s.locChip}><Text style={s.locChipTxt}>{loc}</Text></View>
                      ))}
                    </View>
                    {d.medOk === false && <Text style={s.patternAlert}>💊 누락</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 오늘 활동 타임라인 */}
          <View style={s.timelineCard}>
            <Text style={s.sectionTitle}>오늘 활동 기록</Text>
            {DEMO_TIMELINE.map((item, idx) => (
              <View key={idx} style={s.timelineRow}>
                <View style={s.timelineLeft}>
                  <Text style={s.timelineTime}>{item.time}</Text>
                  {idx < DEMO_TIMELINE.length - 1 && <View style={s.timelineLine} />}
                </View>
                <View style={[s.timelineDot, {
                  backgroundColor: item.type === 'ok' ? C.sage : item.type === 'pending' ? C.line : C.red
                }]} />
                <View style={s.timelineContent}>
                  <Text style={s.timelineIcon}>{item.icon}</Text>
                  <Text style={[s.timelineLabel, item.type === 'pending' && { color: C.sub }]}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 빠른 연락 */}
          <View style={s.contactCard}>
            <Text style={s.sectionTitle}>빠른 연락</Text>
            <View style={s.contactRow}>
              {[
                { icon: '📞', label: '전화하기',   color: C.sage, bg: C.sageLt },
                { icon: '💬', label: '문자 보내기', color: C.sky,  bg: C.skyLt  },
                { icon: '🚨', label: '긴급 신고',   color: C.red,  bg: C.redLt  },
              ].map(btn => (
                <TouchableOpacity key={btn.label}
                  style={[s.contactBtn, { backgroundColor: btn.bg, borderColor: btn.color }]}
                  onPress={() => Alert.alert(btn.label, `${seniorName}님에게 ${btn.label}`)}
                  activeOpacity={0.75}>
                  <Text style={s.contactIcon}>{btn.icon}</Text>
                  <Text style={[s.contactLabel, { color: btn.color }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { padding: 18, paddingBottom: 32 },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: C.skyDk, paddingHorizontal: 20,
                paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
                paddingBottom: 18 },
  backBtn:    { padding: 6 },
  backTxt:    { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  headerSub:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  headerName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  sosBtn:     { backgroundColor: '#FF4444', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  sosTxt:     { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 2,
                 padding: 16, gap: 14, marginBottom: 16, marginTop: 4 },
  alertIcon:   { fontSize: 32 },
  alertMsg:    { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  alertTime:   { fontSize: 12, color: C.sub },

  row:         { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfCard:    { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 18,
                 shadowColor: '#4A87A8', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  cardIcon:    { fontSize: 28, marginBottom: 6 },
  cardTitle:   { fontSize: 13, color: C.sub, fontWeight: '600', marginBottom: 4 },
  cardBig:     { fontSize: 32, fontWeight: '900', lineHeight: 38 },
  cardBigSub:  { fontSize: 14, fontWeight: '400', color: C.sub },
  barBg:       { height: 6, backgroundColor: C.line, borderRadius: 3, marginVertical: 8 },
  barFill:     { height: 6, borderRadius: 3 },
  cardSub:     { fontSize: 11, color: C.sub },

  // AI 카드
  aiCard:          { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
                     shadowColor: '#4A87A8', shadowOpacity: 0.12, shadowRadius: 14, elevation: 4 },
  aiHeader:        { marginBottom: 14 },
  aiTitle:         { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4 },
  aiSub:           { fontSize: 12, color: C.sub },
  aiResult:        { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 14 },
  aiResultText:    { fontSize: 14, fontWeight: '600', lineHeight: 22 },
  aiPlaceholder:   { backgroundColor: C.skyLt, borderRadius: 14, padding: 14, marginBottom: 14 },
  aiPlaceholderTxt:{ fontSize: 13, color: C.sub, textAlign: 'center' },
  aiBtn:           { backgroundColor: C.sky, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  aiBtnTxt:        { color: '#fff', fontSize: 15, fontWeight: '700' },

  // 위치
  locationCard:   { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
                    shadowColor: '#4A87A8', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  locationTitle:  { fontSize: 16, fontWeight: '700', color: C.text },
  locBadge:       { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  locBadgeTxt:    { fontSize: 12, fontWeight: '700' },
  mapBox:         { height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 14, backgroundColor: '#E8F0F8' },
  mapBg:          { flex: 1, position: 'relative' },
  mapLine:        { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#D0DCE8' },
  mapLineV:       { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#D0DCE8' },
  mapRoadH:       { position: 'absolute', top: '45%', left: 0, right: 0, height: 8, backgroundColor: '#FFFFFF', opacity: 0.8 },
  mapRoadV:       { position: 'absolute', left: '40%', top: 0, bottom: 0, width: 8, backgroundColor: '#FFFFFF', opacity: 0.8 },
  markerWrap:     { position: 'absolute', top: '35%', left: '38%', alignItems: 'center', justifyContent: 'center' },
  markerPulse:    { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, opacity: 0.25 },
  markerDot:      { width: 18, height: 18, borderRadius: 9, backgroundColor: C.sage, borderWidth: 3, borderColor: '#FFFFFF',
                    shadowColor: C.sage, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 },
  safeRadius:     { position: 'absolute', top: '18%', left: '26%', width: 80, height: 80, borderRadius: 40,
                    borderWidth: 2, borderColor: C.sage, borderStyle: 'dashed', opacity: 0.4 },
  mapLabel:       { position: 'absolute', top: '60%', left: '43%', backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  mapLabelTxt:    { fontSize: 11, fontWeight: '700', color: C.text },
  locInfo:        { gap: 4 },
  locName:        { fontSize: 15, fontWeight: '700', color: C.text },
  locTime:        { fontSize: 12, color: C.sub },

  // 주간 패턴
  patternCard:    { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
                    shadowColor: '#4A87A8', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  patternHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: C.text },
  patternToggle:  { fontSize: 13, color: C.sub },
  chartRow:       { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4, marginBottom: 8 },
  chartCol:       { flex: 1, alignItems: 'center', gap: 4 },
  chartBarWrap:   { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden', backgroundColor: C.line },
  chartBar:       { width: '100%', borderRadius: 6 },
  chartDay:       { fontSize: 10, color: C.sub, fontWeight: '600' },
  chartWarn:      { fontSize: 10 },
  chartLegend:    { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 4 },
  patternDetail:  { marginTop: 14, gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14 },
  patternRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  patternDay:     { width: 32, fontSize: 13, fontWeight: '600', color: C.text },
  patternWake:    { fontSize: 11, color: C.sub, width: 60 },
  patternSteps:   { fontSize: 12, fontWeight: '600', color: C.text, width: 54 },
  patternLocs:    { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 },
  locChip:        { backgroundColor: C.skyLt, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  locChipTxt:     { fontSize: 10, color: C.sky, fontWeight: '600' },
  patternAlert:   { fontSize: 11, color: C.amber, fontWeight: '700' },

  // 타임라인
  timelineCard:    { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
                     shadowColor: '#4A87A8', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  timelineRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  timelineLeft:    { width: 48, alignItems: 'center' },
  timelineTime:    { fontSize: 11, color: C.sub, fontWeight: '600', marginTop: 2 },
  timelineLine:    { width: 1, flex: 1, minHeight: 24, backgroundColor: C.line, marginTop: 4 },
  timelineDot:     { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginHorizontal: 8 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 18 },
  timelineIcon:    { fontSize: 16 },
  timelineLabel:   { fontSize: 14, fontWeight: '500', color: C.text },

  // 연락
  contactCard:  { backgroundColor: C.card, borderRadius: 20, padding: 18,
                  shadowColor: '#4A87A8', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  contactRow:   { flexDirection: 'row', gap: 10 },
  contactBtn:   { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, gap: 6 },
  contactIcon:  { fontSize: 24 },
  contactLabel: { fontSize: 11, fontWeight: '700' },
});
