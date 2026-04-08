import React, { useState, useEffect, useRef } from 'react';

import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, StatusBar, Modal, Dimensions, Platform, Image,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

// ── 수치 정의 ──────────────────────────────────────────
const METRICS = [
  { key: 'steps',       icon: '🚶', label: '걸음수',  unit: '보',    auto: true,
    normal: '5,000보 이상', quick: [6000, 5000, 4000, 3000] },
  { key: 'heart_rate',  icon: '💓', label: '맥박',    unit: 'bpm',   auto: true,
    normal: '60~100 bpm', quick: [72, 75, 68, 80] },
  { key: 'bp',          icon: '💗', label: '혈압',    unit: 'mmHg',  auto: false,
    normal: '90~120 / 60~80 mmHg', quick: [120, 125, 130, 136] },
  { key: 'blood_sugar', icon: '🩸', label: '혈당',    unit: 'mg/dL', auto: false,
    normal: '70~100 mg/dL', quick: [95, 100, 104, 110] },
];

function stepsStatus(v: number | null) {
  if (!v) return null;
  return v >= 5000 ? { text: '목표 달성', color: '#4caf50' }
       : v >= 3000 ? { text: '조금 더',   color: '#ff9800' }
                   : { text: '부족',      color: '#f44336' };
}
function hrStatus(v: number | null) {
  if (!v) return null;
  return (v >= 60 && v <= 100) ? { text: '정상', color: '#4caf50' } : { text: '주의', color: '#ff9800' };
}
function bpStatus(sys: number | null) {
  if (!sys) return null;
  return sys < 120 ? { text: '정상', color: '#4caf50' }
       : sys < 140 ? { text: '주의', color: '#ff9800' }
                   : { text: '높음', color: '#f44336' };
}
function bsStatus(v: number | null) {
  if (!v) return null;
  return v < 100 ? { text: '정상', color: '#4caf50' }
       : v < 126 ? { text: '주의', color: '#ff9800' }
                 : { text: '높음', color: '#f44336' };
}

function calcScore(rec: any): number {
  if (!rec) return 0;
  let s = 0, c = 0;
  if (rec.steps)                   { c++; s += rec.steps >= 5000 ? 100 : rec.steps >= 3000 ? 70 : 40; }
  if (rec.blood_pressure_systolic) { c++; const v = rec.blood_pressure_systolic; s += v < 120 ? 100 : v < 130 ? 85 : v < 140 ? 65 : 40; }
  if (rec.heart_rate)              { c++; const v = rec.heart_rate; s += (v >= 60 && v <= 100) ? 100 : 60; }
  if (rec.blood_sugar)             { c++; const v = rec.blood_sugar; s += v < 100 ? 100 : v < 125 ? 75 : 45; }
  return c > 0 ? Math.round(s / c) : 72;
}

// ── 키패드 ─────────────────────────────────────────────
function Keypad({ metric, onConfirm, onClose }: {
  metric: typeof METRICS[0];
  onConfirm: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState('');
  const press = (k: string) => {
    if (k === '지우기') { setVal(v => v.slice(0, -1)); return; }
    if (k === '확인')   { onConfirm(val); return; }
    if (val.length >= 6) return;
    setVal(v => v + k);
  };
  const KEYS = ['1','2','3','4','5','6','7','8','9','지우기','0','확인'];
  return (
    <View style={kp.wrap}>
      <Text style={kp.title}>{metric.icon} {metric.label} 입력</Text>
      <View style={kp.displayRow}>
        <Text style={kp.bigNum}>{val || '—'}</Text>
        <Text style={kp.unit}> {metric.unit}</Text>
      </View>
      <View style={kp.infoBox}>
        <Text style={kp.infoText}>AI 정상 범위: {metric.normal}</Text>
        <Text style={kp.infoText}>내 평균: {metric.quick[0]}</Text>
      </View>
      <View style={kp.quickRow}>
        {metric.quick.map((q, i) => (
          <TouchableOpacity key={i} style={[kp.quickBtn, i === 0 && kp.quickBtnStar]}
            onPress={() => setVal(String(q))}>
            <Text style={[kp.quickTxt, i === 0 && kp.quickTxtStar]}>
              {i === 0 ? `${q} ★ 평소` : String(q)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={kp.grid}>
        {KEYS.map(k => (
          <TouchableOpacity key={k}
            style={[kp.key, k === '확인' && kp.keyConfirm, k === '지우기' && kp.keyDel]}
            onPress={() => press(k)}>
            <Text style={[kp.keyTxt, k === '확인' && kp.keyTxtConfirm]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onClose} style={kp.cancelBtn}>
        <Text style={kp.cancelTxt}>취소</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 메인 ──────────────────────────────────────────────
export default function HealthScreen({ route, navigation }: any) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'today'|'record'>('today');
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  // 기록 입력 상태
  const [values, setValues] = useState({ steps:'', heart_rate:'', bp_sys:'', bp_dia:'', blood_sugar:'' });
  const [keypadMetric, setKeypadMetric] = useState<typeof METRICS[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [pedometerSteps, setPedometerSteps] = useState<number | null>(null);
  const [pedometerAvail, setPedometerAvail] = useState(false);

  useEffect(() => {
    if (!userId || userId === 'demo-user') { setLoadingToday(false); return; }
    fetch(`${API_URL}/health/history/${userId}?days=1`)
      .then(r => r.json())
      .then(d => { if (d.records?.length > 0) setTodayRecord(d.records[0]); })
      .catch(() => {})
      .finally(() => setLoadingToday(false));
  }, [userId]);

  // 만보계 자동 측정
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: any = null;
    try {
      const { Pedometer } = require('expo-sensors');
      Pedometer.isAvailableAsync().then((avail: boolean) => {
        setPedometerAvail(avail);
        if (!avail) return;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        Pedometer.getStepCountAsync(start, now).then((res: any) => {
          setPedometerSteps(res.steps);
          setValues(v => ({ ...v, steps: String(res.steps) }));
        }).catch(() => {});
        sub = Pedometer.watchStepCount((res: any) => {
          setPedometerSteps(res.steps);
          setValues(v => ({ ...v, steps: String(res.steps) }));
        });
      }).catch(() => {});
    } catch (e) {}
    return () => { if (sub) sub.remove(); };
  }, []);

  const score = calcScore(todayRecord);
  const scoreStatus = score >= 85 ? { text: '건강 상태 양호', color: '#a5d6a7' }
                    : score >= 65 ? { text: '⚠️ 주의 필요',  color: '#ffd700' }
                                  : { text: '관리 필요',      color: '#ef9a9a' };
  const bpHighAlert = todayRecord?.blood_pressure_systolic >= 135;
  const allFilled = values.steps && values.heart_rate && values.bp_sys && values.bp_dia && values.blood_sugar;

  const bpDiaMetric = { key: 'bp_dia', icon: '💙', label: '혈압 이완기 (낮은 수치)', unit: 'mmHg',
    auto: false, normal: '60~80 mmHg', quick: [80, 78, 75, 72] };

  const handleConfirm = (key: string, val: string) => {
    if (key === 'bp') {
      setValues(v => ({ ...v, bp_sys: val }));
      setKeypadMetric(bpDiaMetric as any); // 이완기 키패드로 전환
    } else if (key === 'bp_dia') {
      setValues(v => ({ ...v, bp_dia: val }));
      setKeypadMetric(null);
    } else {
      setValues(v => ({ ...v, [key]: val }));
      setKeypadMetric(null);
    }
  };

  const displayVal = (key: string) => {
    if (key === 'steps')       return values.steps      ? parseInt(values.steps).toLocaleString() : null;
    if (key === 'heart_rate')  return values.heart_rate || null;
    if (key === 'bp')          return (values.bp_sys && values.bp_dia) ? `${values.bp_sys}/${values.bp_dia}` : values.bp_sys || null;
    if (key === 'blood_sugar') return values.blood_sugar || null;
    return null;
  };
  const getStatus = (key: string) => {
    if (key === 'steps')       return stepsStatus(values.steps ? parseInt(values.steps) : null);
    if (key === 'heart_rate')  return hrStatus(values.heart_rate ? parseInt(values.heart_rate) : null);
    if (key === 'bp')          return bpStatus(values.bp_sys ? parseInt(values.bp_sys) : null);
    if (key === 'blood_sugar') return bsStatus(values.blood_sugar ? parseInt(values.blood_sugar) : null);
    return null;
  };

  const saveRecord = async () => {
    if (!allFilled) { Alert.alert('알림', '모든 수치를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/health/records`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date: today,
          steps: parseInt(values.steps),
          heart_rate: parseInt(values.heart_rate),
          blood_pressure_systolic: parseInt(values.bp_sys),
          blood_pressure_diastolic: parseInt(values.bp_dia),
          blood_sugar: parseInt(values.blood_sugar),
          source: 'manual',
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setTodayRecord(saved);
        setValues({ steps:'', heart_rate:'', bp_sys:'', bp_dia:'', blood_sugar:'' });
        Alert.alert('저장 완료 ✓', '오늘 건강 기록이 저장됐습니다.', [
          { text: '확인', onPress: () => setActiveTab('today') }
        ]);
      } else {
        Alert.alert('오류', '저장에 실패했습니다.');
      }
    } catch { Alert.alert('오류', '네트워크 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { key: 'today',  label: '오늘' },
    { key: 'record', label: '기록' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3a5c" />

      {/* 헤더 */}
      <View style={s.header}>
        <View style={s.headerTitleRow}>
          <Image
            source={require('../assets/EDFA500D-1920-4E9B-A3CA-5C105D320158_1_105_c.jpeg')}
            style={s.headerBeeImg}
            resizeMode="cover"
          />
          <Text style={s.headerTitle}>건강</Text>
        </View>
        <View style={s.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}>
              <Text style={[s.tabTxt, activeTab === tab.key && s.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ══ 오늘 탭 ══ */}
      {activeTab === 'today' && (
        <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>

          {/* AI 건강점수 배너 → 클릭시 대시보드 */}
          <TouchableOpacity style={s.scoreBanner} onPress={() => navigation.navigate('Dashboard', { userId, name })} activeOpacity={0.9}>
            <View style={s.scoreTop}>
              <View style={s.scoreRing}>
                {loadingToday
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Text style={s.scoreNum}>{todayRecord ? score : '—'}</Text>
                      <Text style={s.scoreUnit}>점</Text>
                    </>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.scoreLabel}>🤖 AI 건강 점수 (오늘)</Text>
                <Text style={[s.scoreStatus, { color: scoreStatus.color }]}>
                  {todayRecord ? `${scoreStatus.text}` : '기록이 없어요'}
                </Text>
                <Text style={s.scoreMsg}>
                  {bpHighAlert ? '혈압이 높습니다. 오늘 오후 산책을 권장합니다.'
                               : todayRecord ? '오늘도 건강하게!' : '기록 탭에서 오늘 수치를 입력하세요.'}
                </Text>
              </View>
            </View>
            <View style={s.trendRow}>
              {['어제', '이번주', '지난주'].map((l, i) => (
                <View key={i} style={s.trendItem}>
                  <Text style={s.trendLabel}>{l}</Text>
                  <Text style={s.trendVal}>{todayRecord ? [score-3, score-1, score-4][i] : '—'}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* AI 이상 감지 */}
          {bpHighAlert && (
            <View style={s.alertCard}>
              <Text style={s.alertIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.alertTitle}>🤖 AI 이상 감지</Text>
                <Text style={s.alertMsg}>
                  혈압이 {todayRecord.blood_pressure_systolic} 이상입니다. 의사 상담을 고려해 보세요.
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('AIChat', { userId, name })}>
                  <Text style={s.alertAction}>→ AI에게 물어보기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 수치 그리드 — 걸음수 맨 앞 */}
          <View style={s.metricsGrid}>
            {[
              { icon:'🚶', label:'걸음수', val: todayRecord?.steps ? todayRecord.steps.toLocaleString() : null, unit:'보', st: stepsStatus(todayRecord?.steps) },
              { icon:'💓', label:'맥박',   val: todayRecord?.heart_rate ? `${todayRecord.heart_rate}` : null,   unit:'bpm', st: hrStatus(todayRecord?.heart_rate) },
              { icon:'💗', label:'혈압',   val: todayRecord?.blood_pressure_systolic ? `${todayRecord.blood_pressure_systolic}/${todayRecord.blood_pressure_diastolic}` : null, unit:'mmHg', st: bpStatus(todayRecord?.blood_pressure_systolic) },
              { icon:'🩸', label:'혈당',   val: todayRecord?.blood_sugar ? `${todayRecord.blood_sugar}` : null, unit:'mg', st: bsStatus(todayRecord?.blood_sugar) },
            ].map((m, i) => (
              <View key={i} style={s.metricCard}>
                <View style={s.metricHeader}>
                  <Text style={s.metricIcon}>{m.icon}</Text>
                  <Text style={s.metricLabel}>{m.label}</Text>
                  <Text style={s.metricAI}>AI</Text>
                </View>
                <Text style={s.metricVal}>
                  {m.val ? <>{m.val} <Text style={s.metricUnit}>{m.unit}</Text></>
                         : <Text style={s.metricEmpty}>—</Text>}
                </Text>
                {m.st && <Text style={[s.metricStatus, { color: m.st.color }]}>{m.st.text}</Text>}
              </View>
            ))}
          </View>

          {/* 기록하기 버튼 */}
          <TouchableOpacity style={s.recordBtn} onPress={() => setActiveTab('record')}>
            <Text style={s.recordBtnTxt}>📝 오늘 건강 기록하기</Text>
          </TouchableOpacity>

          {/* 홈으로 */}
          <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('SeniorHome')}>
            <Text style={s.homeBtnTxt}>← 홈으로</Text>
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* ══ 기록 탭 ══ */}
      {activeTab === 'record' && (
        <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>

          {allFilled && (
            <View style={s.completeRow}>
              <Text style={{ color: '#4caf50', fontSize: 14 }}>●</Text>
              <Text style={s.completeTxt}>모든 수치 입력 완료 ✓</Text>
              <Text style={s.completeTime}>지금</Text>
            </View>
          )}

          {/* 수치 입력 리스트 */}
          <View style={s.inputList}>
            {METRICS.map((m, idx) => {
              const dv = displayVal(m.key);
              const st = getStatus(m.key);
              return (
                <TouchableOpacity key={m.key} style={[s.inputRow, idx === METRICS.length - 1 && { borderBottomWidth: 0 }]} onPress={() => setKeypadMetric(m)} activeOpacity={0.75}>
                  <Text style={s.inputIcon}>{m.icon}</Text>
                  <View style={s.inputLabelWrap}>
                    <Text style={s.inputLabel}>{m.label}</Text>
                    {st && <Text style={[s.inputStatus, { color: st.color }]}>{st.text}</Text>}
                  </View>
                  <Text style={[s.inputVal, !dv && s.inputValEmpty]}>
                    {dv ? `${dv} ${m.unit}` : '탭하여 입력'}
                  </Text>
                  <Text style={s.inputArrow}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AI 즉시 분석 */}
          {(values.bp_sys || values.blood_sugar) && (
            <View style={s.aiBox}>
              <Text style={{ fontSize: 22 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.aiTitle}>AI 즉시 분석</Text>
                <Text style={s.aiMsg}>
                  {values.bp_sys && parseInt(values.bp_sys) >= 130
                    ? `혈압 ${values.bp_sys}이 높습니다. 오후 산책과 저염식을 권장합니다.`
                    : '혈압과 혈당이 정상 범위입니다. 오늘도 건강하게!'}
                </Text>
              </View>
            </View>
          )}

          {/* 웨어러블 연결 박스 2개 */}
          <View style={s.wearRow}>
            <View style={s.wearBox}>
              <Text style={s.wearBoxIcon}>⌚</Text>
              <Text style={s.wearBoxTitle}>Apple Watch</Text>
              <Text style={s.wearBoxSub}>{'걸음수·심박수\n자동 동기화'}</Text>
              <TouchableOpacity style={s.wearBoxBtn}>
                <Text style={s.wearBoxBtnTxt}>연결하기</Text>
              </TouchableOpacity>
            </View>
            <View style={s.wearBox}>
              <Text style={s.wearBoxIcon}>📱</Text>
              <Text style={s.wearBoxTitle}>Galaxy Watch</Text>
              <Text style={s.wearBoxSub}>{'Samsung Health\n데이터 연동'}</Text>
              <TouchableOpacity style={s.wearBoxBtn}>
                <Text style={s.wearBoxBtnTxt}>연결하기</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity style={[s.saveBtn, !allFilled && s.saveBtnDim]} onPress={saveRecord} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>💾 오늘 기록 저장하기</Text>}
          </TouchableOpacity>

          {/* 홈으로 */}
          <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('SeniorHome')}>
            <Text style={s.homeBtnTxt}>← 홈으로</Text>
          </TouchableOpacity>

        </ScrollView>
      )}



      {/* 키패드 모달 */}
      <Modal visible={!!keypadMetric} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setKeypadMetric(null)}>
          <TouchableOpacity activeOpacity={1} style={s.modalSheet}>
            {keypadMetric && (
              <Keypad
                metric={keypadMetric}
                onConfirm={(v) => handleConfirm(keypadMetric.key, v)}
                onClose={() => setKeypadMetric(null)}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F5FB', ...(Platform.OS === 'web' ? { flex: 1 } : {}) },

  header:       { paddingTop: Platform.OS === 'web' ? 14 : (StatusBar.currentHeight ?? 28) + 8, paddingHorizontal: 18, paddingBottom: 0, backgroundColor: '#1A4A8A' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  headerBeeImg:   { width: 36, height: 36, borderRadius: 18 },
  headerTitle:    { fontSize: 20, fontWeight: '800', color: '#fff' },
  tabRow:       { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.25)' },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 9 },
  tabActive:    { borderBottomWidth: 2.5, borderBottomColor: '#fff', marginBottom: -2 },
  tabTxt:       { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  tabTxtActive: { color: '#fff' },

  body:        { flex: 1 },
  bodyContent: { padding: 14, gap: 10, paddingBottom: 20 },

  // AI 점수 배너
  scoreBanner: { borderRadius: 18, padding: 16, backgroundColor: '#1a3a5c',
                 background: 'linear-gradient(135deg,#1a3a5c,#1976d2)' },
  scoreTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  scoreRing:   { width: 58, height: 58, borderRadius: 29, borderWidth: 4,
                 borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)',
                 alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum:    { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 24 },
  scoreUnit:   { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  scoreLabel:  { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  scoreStatus: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scoreMsg:    { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  trendRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 10 },
  trendItem:   { flex: 1, alignItems: 'center' },
  trendLabel:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  trendVal:    { fontSize: 16, fontWeight: '700', color: '#fff' },

  // AI 이상 감지
  alertCard:   { backgroundColor: '#fff3cd', borderRadius: 14, padding: 12,
                 borderLeftWidth: 4, borderLeftColor: '#ffc107', flexDirection: 'row', gap: 10 },
  alertIcon:   { fontSize: 20 },
  alertTitle:  { fontSize: 15, fontWeight: '700', color: '#7d5a00', marginBottom: 3 },
  alertMsg:    { fontSize: 14, color: '#8a6914', lineHeight: 20, marginBottom: 5 },
  alertAction: { fontSize: 14, color: '#1565c0', fontWeight: '600' },

  // 수치 카드 (오늘 탭용)
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard:  { width: (width - 28 - 10) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 12,
                 shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width:0, height:2 }, shadowRadius:6, elevation:2 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metricIcon:  { fontSize: 22 },
  metricLabel: { flex: 1, fontSize: 16, color: '#546e7a', fontWeight: '600' },
  metricAI:    { fontSize: 12, color: '#2196f3', fontWeight: '600' },
  metricVal:   { fontSize: 26, fontWeight: '800', color: '#1A4A8A', marginBottom: 2 },
  metricUnit:  { fontSize: 14, color: '#9aabb8', fontWeight: '400' },
  metricEmpty: { fontSize: 16, color: '#b0bec5' },
  metricStatus: { fontSize: 15, fontWeight: '600' },

  // 기록 탭 - 리스트형 입력
  inputList:      { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE8F4' },
  inputRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20,
                    borderBottomWidth: 1, borderBottomColor: '#EEF4FB', gap: 14 },
  inputIcon:      { fontSize: 28, width: 36, textAlign: 'center' },
  inputLabelWrap: { flex: 1 },
  inputLabel:     { fontSize: 18, fontWeight: '700', color: '#16273E' },
  inputStatus:    { fontSize: 15, fontWeight: '600', marginTop: 2 },
  inputVal:       { fontSize: 17, fontWeight: '700', color: '#1A4A8A' },
  inputValEmpty:  { color: '#B8CCE0', fontWeight: '400' },
  inputArrow:     { fontSize: 22, color: '#B8CCE0' },



  // 기록하기 버튼
  recordBtn:    { backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#1565c0',
                  padding: 13, alignItems: 'center' },
  recordBtnTxt: { fontSize: 16, fontWeight: '700', color: '#1565c0' },

  // 웨어러블 박스 2개
  wearRow:       { flexDirection: 'row', gap: 10 },
  wearBox:       { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 18, alignItems: 'center',
                   borderWidth: 1, borderColor: '#DDE8F4', gap: 6 },
  wearBoxIcon:   { fontSize: 32 },
  wearBoxTitle:  { fontSize: 16, fontWeight: '800', color: '#16273E' },
  wearBoxSub:    { fontSize: 14, color: '#7A90A8', textAlign: 'center', lineHeight: 22 },
  wearBoxBtn:    { marginTop: 6, backgroundColor: '#EBF3FB', borderRadius: 12,
                   paddingVertical: 10, paddingHorizontal: 18 },
  wearBoxBtnTxt: { fontSize: 16, fontWeight: '700', color: '#1A4A8A' },

  // 완료 상태
  completeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  completeTxt: { flex: 1, fontSize: 16, color: '#4caf50', fontWeight: '700' },
  completeTime: { fontSize: 14, color: '#90a4ae' },

  // 수치 카드 배지


  // AI 즉시 분석
  aiBox:   { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, borderLeftWidth: 3, borderLeftColor: '#1565c0' },
  aiTitle: { fontSize: 16, fontWeight: '700', color: '#1A4A8A', marginBottom: 4 },
  aiMsg:   { fontSize: 15, color: '#546e7a', lineHeight: 22 },



  // 저장 버튼
  saveBtn:    { backgroundColor: '#1a3a5c', borderRadius: 18, padding: 18, alignItems: 'center' },
  saveBtnDim: { opacity: 0.5 },
  saveBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  homeBtn:    { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#dde3ee' },
  homeBtnTxt: { fontSize: 17, fontWeight: '700', color: '#546e7a' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});

const kp = StyleSheet.create({
  wrap:       { padding: 20, paddingBottom: 34 },
  title:      { fontSize: 19, fontWeight: '700', color: '#1a2a3a', marginBottom: 12 },
  displayRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  bigNum:     { fontSize: 52, fontWeight: '900', color: '#1a2a3a', lineHeight: 58 },
  unit:       { fontSize: 18, color: '#90a4ae', marginBottom: 8 },
  infoBox:    { backgroundColor: '#e8f4fd', borderRadius: 12, padding: 10, marginBottom: 12 },
  infoText:   { fontSize: 14, color: '#1565c0' },
  quickRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn:   { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  quickBtnStar: { backgroundColor: '#1565c0' },
  quickTxt:   { fontSize: 14, fontWeight: '600', color: '#546e7a' },
  quickTxtStar: { color: '#fff' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  key:        { width: '33.33%', paddingVertical: 18, alignItems: 'center', borderTopWidth: 1, borderRightWidth: 1, borderColor: '#f0f4f8' },
  keyConfirm: { backgroundColor: '#1565c0' },
  keyDel:     { backgroundColor: '#f8fafc' },
  keyTxt:     { fontSize: 22, fontWeight: '500', color: '#1a2a3a' },
  keyTxtConfirm: { color: '#fff', fontWeight: '700' },
  cancelBtn:  { alignItems: 'center', paddingTop: 14 },
  cancelTxt:  { fontSize: 14, color: '#90a4ae' },
});
