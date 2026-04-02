import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Animated, Alert,
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

function getTimeStr(d?: Date) {
  const t = d || new Date();
  return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
}

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
  { time: '09:30', icon: '🚶', label: '산책 출발 (걸음수 감지)', type: 'ok' },
  { time: '10:20', icon: '🏠', label: '귀가 확인', type: 'ok' },
  { time: '12:00', icon: '💊', label: '관절약 복용 ✅', type: 'ok' },
  { time: '14:00', icon: '💊', label: '저녁 혈압약 (18:00 예정)', type: 'pending' },
];

type AlertLevel = 'good' | 'warn' | 'danger';

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const userId   = route?.params?.userId   || (DEMO_MODE ? 'demo-user' : '');
  const name     = route?.params?.name     || (DEMO_MODE ? '이순희' : '');
  const seniorId = route?.params?.seniorId || (DEMO_MODE ? 'demo-senior' : '');
  const seniorName = route?.params?.seniorName || (DEMO_MODE ? '홍길동' : '부모님');

  const [status, setStatus] = useState<any>(DEMO_SENIOR);
  const [timeline, setTimeline] = useState(DEMO_TIMELINE);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    // 안전 펄스 애니메이션
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
        setStatus((prev: any) => ({
          ...prev,
          medTotal: d.summary.total,
          medTaken: d.summary.taken,
        }));
      }
    } catch {
      // DEMO_MODE fallback already set
    }
  };

  const medPct    = status.medTotal > 0 ? status.medTaken / status.medTotal : 0;
  const stepPct   = Math.min(status.steps / status.stepGoal, 1);
  const alertLevel: AlertLevel =
    !status.locationSafe ? 'danger' :
    medPct < 0.5          ? 'warn'   : 'good';

  const alertConfig = {
    good:   { color: C.sage,  bg: C.sageLt,  icon: '✅', msg: '이상 없음 — 안전합니다' },
    warn:   { color: C.amber, bg: C.amberLt, icon: '⚠️', msg: '약 복용 확인이 필요해요' },
    danger: { color: C.red,   bg: C.redLt,   icon: '🚨', msg: '위치 이상 감지됨!' },
  }[alertLevel];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.skyDk} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* ── 헤더 ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.headerSub}>가족 모니터링</Text>
            <Text style={s.headerName}>{seniorName}님 오늘 현황</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('긴급 연락', `${seniorName}님께 전화를 연결합니다`)} style={s.sosBtn}>
            <Text style={s.sosTxt}>📞 SOS</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 종합 상태 배너 ── */}
          <View style={[s.alertBanner, { backgroundColor: alertConfig.bg, borderColor: alertConfig.color }]}>
            <Animated.Text style={[s.alertIcon, alertLevel === 'danger' && { transform: [{ scale: pulseAnim }] }]}>
              {alertConfig.icon}
            </Animated.Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertMsg, { color: alertConfig.color }]}>{alertConfig.msg}</Text>
              <Text style={s.alertTime}>마지막 확인: {status.lastSeen}</Text>
            </View>
          </View>

          {/* ── 2열 요약 카드 ── */}
          <View style={s.row}>
            {/* 약 복용 */}
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

            {/* 걸음수 */}
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

          {/* ── 위치 카드 ── */}
          <View style={s.locationCard}>
            <View style={s.locationHeader}>
              <Text style={s.locationTitle}>📍 현재 위치</Text>
              <View style={[s.locBadge, { backgroundColor: status.locationSafe ? C.sageLt : C.redLt }]}>
                <Text style={[s.locBadgeTxt, { color: status.locationSafe ? C.sage : C.red }]}>
                  {status.locationSafe ? '안전 구역' : '이상 감지'}
                </Text>
              </View>
            </View>

            {/* 지도 자리 (데모: 시각적 표현) */}
            <View style={s.mapBox}>
              <View style={s.mapBg}>
                {/* 격자 배경 */}
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={[s.mapLine, { top: `${25 + i * 20}%` as any }]} />
                ))}
                {[...Array(5)].map((_, i) => (
                  <View key={i} style={[s.mapLineV, { left: `${15 + i * 18}%` as any }]} />
                ))}
                {/* 도로 */}
                <View style={s.mapRoadH} />
                <View style={s.mapRoadV} />
                {/* 위치 마커 */}
                <Animated.View style={[s.markerWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={s.markerPulse} />
                  <View style={s.markerDot} />
                </Animated.View>
                {/* 안전 반경 */}
                <View style={s.safeRadius} />
                {/* 레이블 */}
                <View style={s.mapLabel}>
                  <Text style={s.mapLabelTxt}>🏠 자택</Text>
                </View>
              </View>
            </View>

            <View style={s.locInfo}>
              <Text style={s.locName}>{status.location}</Text>
              <Text style={s.locTime}>{status.locationTime} 위치 확인 · 자택 반경 200m 이내</Text>
            </View>
          </View>

          {/* ── 오늘 활동 타임라인 ── */}
          <View style={s.timelineCard}>
            <Text style={s.sectionTitle}>오늘 활동 기록</Text>
            {timeline.map((item, idx) => (
              <View key={idx} style={s.timelineRow}>
                <View style={s.timelineLeft}>
                  <Text style={s.timelineTime}>{item.time}</Text>
                  {idx < timeline.length - 1 && <View style={[s.timelineLine, item.type === 'pending' && { borderStyle: 'dashed', borderColor: C.line }]} />}
                </View>
                <View style={[s.timelineDot, {
                  backgroundColor: item.type === 'ok' ? C.sage : item.type === 'pending' ? C.line : C.red
                }]} />
                <View style={s.timelineContent}>
                  <Text style={s.timelineIcon}>{item.icon}</Text>
                  <Text style={[s.timelineLabel, item.type === 'pending' && { color: C.sub }]}>
                    {item.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── 빠른 연락 ── */}
          <View style={s.contactCard}>
            <Text style={s.sectionTitle}>빠른 연락</Text>
            <View style={s.contactRow}>
              {[
                { icon: '📞', label: '전화하기',   color: C.sage,  bg: C.sageLt  },
                { icon: '💬', label: '문자 보내기', color: C.sky,   bg: C.skyLt   },
                { icon: '🚨', label: '긴급 신고',   color: C.red,   bg: C.redLt   },
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

          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { padding: 18, paddingBottom: 32 },

  // 헤더
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
             backgroundColor: C.skyDk, paddingHorizontal: 20,
             paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
             paddingBottom: 18 },
  backBtn: { padding: 6 },
  backTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  headerSub:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  headerName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  sosBtn:  { backgroundColor: '#FF4444', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  sosTxt:  { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // 알림 배너
  alertBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 2,
                 padding: 16, gap: 14, marginBottom: 16, marginTop: 4 },
  alertIcon:   { fontSize: 32 },
  alertMsg:    { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  alertTime:   { fontSize: 12, color: C.sub },

  // 2열 카드
  row:          { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfCard:     { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 18,
                  shadowColor: '#4A87A8', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  cardIcon:     { fontSize: 28, marginBottom: 6 },
  cardTitle:    { fontSize: 13, color: C.sub, fontWeight: '600', marginBottom: 4 },
  cardBig:      { fontSize: 32, fontWeight: '900', lineHeight: 38 },
  cardBigSub:   { fontSize: 14, fontWeight: '400', color: C.sub },
  barBg:        { height: 6, backgroundColor: C.line, borderRadius: 3, marginVertical: 8 },
  barFill:      { height: 6, borderRadius: 3 },
  cardSub:      { fontSize: 11, color: C.sub },

  // 위치 카드
  locationCard:   { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
                    shadowColor: '#4A87A8', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  locationTitle:  { fontSize: 16, fontWeight: '700', color: C.text },
  locBadge:       { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  locBadgeTxt:    { fontSize: 12, fontWeight: '700' },

  // 지도
  mapBox:   { height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 14, backgroundColor: '#E8F0F8' },
  mapBg:    { flex: 1, position: 'relative' },
  mapLine:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#D0DCE8' },
  mapLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#D0DCE8' },
  mapRoadH: { position: 'absolute', top: '45%', left: 0, right: 0, height: 8, backgroundColor: '#FFFFFF', opacity: 0.8 },
  mapRoadV: { position: 'absolute', left: '40%', top: 0, bottom: 0, width: 8, backgroundColor: '#FFFFFF', opacity: 0.8 },
  markerWrap:  { position: 'absolute', top: '35%', left: '38%', alignItems: 'center', justifyContent: 'center' },
  markerPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, opacity: 0.25 },
  markerDot:   { width: 18, height: 18, borderRadius: 9, backgroundColor: C.sage, borderWidth: 3, borderColor: '#FFFFFF',
                 shadowColor: C.sage, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 },
  safeRadius: { position: 'absolute', top: '18%', left: '26%', width: 80, height: 80, borderRadius: 40,
                borderWidth: 2, borderColor: C.sage, borderStyle: 'dashed', opacity: 0.4 },
  mapLabel:   { position: 'absolute', top: '60%', left: '43%', backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  mapLabelTxt:{ fontSize: 11, fontWeight: '700', color: C.text },

  locInfo:    { gap: 4 },
  locName:    { fontSize: 15, fontWeight: '700', color: C.text },
  locTime:    { fontSize: 12, color: C.sub },

  // 타임라인
  timelineCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
                  shadowColor: '#4A87A8', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 16 },
  timelineRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  timelineLeft: { width: 48, alignItems: 'center' },
  timelineTime: { fontSize: 11, color: C.sub, fontWeight: '600', marginTop: 2 },
  timelineLine: { width: 1, flex: 1, minHeight: 24, backgroundColor: C.line, marginTop: 4 },
  timelineDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginHorizontal: 8 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 18 },
  timelineIcon:    { fontSize: 16 },
  timelineLabel:   { fontSize: 14, fontWeight: '500', color: C.text },

  // 연락
  contactCard: { backgroundColor: C.card, borderRadius: 20, padding: 18,
                 shadowColor: '#4A87A8', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  contactRow:  { flexDirection: 'row', gap: 10 },
  contactBtn:  { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16,
                 borderWidth: 1.5, gap: 6 },
  contactIcon: { fontSize: 24 },
  contactLabel:{ fontSize: 11, fontWeight: '700' },
});
