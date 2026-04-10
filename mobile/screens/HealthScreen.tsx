import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, Dimensions, Platform,
} from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

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
  return v >= 5000 ? { text: '목표 달성 ✓', color: '#4caf50' }
       : v >= 3000 ? { text: '조금 더!',    color: '#ff9800' }
                   : { text: '부족',         color: '#f44336' };
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

export default function HealthScreen({ route, navigation }: any) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};


  const [activeTab, setActiveTab] = useState<'today'|'record'>('today');
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const [values, setValues] = useState({ steps:'', heart_rate:'', bp_sys:'', bp_dia:'', blood_sugar:'' });
  const [keypadMetric, setKeypadMetric] = useState<typeof METRICS[0] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || userId === 'demo-user') { setLoadingToday(false); return; }
    fetch(`${API_URL}/health/history/${userId}?days=1`)
      .then(r => r.json())
      .then(d => { if (d.records?.length > 0) setTodayRecord(d.records[0]); })
      .catch(() => {})
      .finally(() => setLoadingToday(false));
  }, [userId]);

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
      setKeypadMetric(bpDiaMetric as any);
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
          user_id: userId, date: today,
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

  const todayMetrics = [
    { icon:'🚶', label:'걸음수', val: todayRecord?.steps ? todayRecord.steps.toLocaleString() : null, unit:'보', st: stepsStatus(todayRecord?.steps) },
    { icon:'💓', label:'맥박',   val: todayRecord?.heart_rate ? `${todayRecord.heart_rate}` : null,   unit:'bpm', st: hrStatus(todayRecord?.heart_rate) },
    { icon:'💗', label:'혈압',   val: todayRecord?.blood_pressure_systolic ? `${todayRecord.blood_pressure_systolic}/${todayRecord.blood_pressure_diastolic}` : null, unit:'', st: bpStatus(todayRecord?.blood_pressure_systolic) },
    { icon:'🩸', label:'혈당',   val: todayRecord?.blood_sugar ? `${todayRecord.blood_sugar}` : null, unit:'mg', st: bsStatus(todayRecord?.blood_sugar) },
  ];

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={s.headerTitleRow}>
          <Text style={{fontSize:26}}>🫀</Text>
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
        <View style={s.body}>
          {/* AI 건강점수 배너 */}
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
                  {todayRecord ? scoreStatus.text : '기록이 없어요'}
                </Text>
                <Text style={s.scoreMsg}>
                  {bpHighAlert ? '혈압이 높습니다. 오늘 산책을 권장합니다.'
                               : todayRecord ? '오늘도 건강하게!' : '기록 탭에서 수치를 입력하세요.'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 수치 그리드 2x2 */}
          <View style={s.metricsGrid}>
            {todayMetrics.map((m, i) => (
              <View key={i} style={s.metricCard}>
                <View style={s.metricHeader}>
                  <Text style={s.metricIcon}>{m.icon}</Text>
                  <Text style={s.metricLabel}>{m.label}</Text>
                </View>
                <Text style={s.metricVal}>
                  {m.val
                    ? <>{m.val}{m.unit ? <Text style={s.metricUnit}> {m.unit}</Text> : null}</>
                    : <Text style={s.metricEmpty}>—</Text>}
                </Text>
                {m.st && <Text style={[s.metricStatus, { color: m.st.color }]}>{m.st.text}</Text>}
              </View>
            ))}
          </View>

          {/* 하단 버튼들 */}
          <View style={s.bottomBtns}>
            <TouchableOpacity style={s.recordBtn} onPress={() => setActiveTab('record')}>
              <Text style={s.recordBtnTxt}>📝 오늘 건강 기록하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('SeniorHome')}>
              <Text style={s.homeBtnTxt}>← 홈으로</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ 기록 탭 ══ */}
      {activeTab === 'record' && (
        <View style={s.body}>
          {allFilled && (
            <View style={s.completeRow}>
              <Text style={{ color: '#4caf50', fontSize: 18 }}>●</Text>
              <Text style={s.completeTxt}>모든 수치 입력 완료 ✓</Text>
            </View>
          )}

          {/* 수치 입력 리스트 */}
          <View style={s.inputList}>
            {METRICS.map((m, idx) => {
              const dv = displayVal(m.key);
              const st = getStatus(m.key);
              return (
                <TouchableOpacity key={m.key}
                  style={[s.inputRow, idx === METRICS.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => setKeypadMetric(m)} activeOpacity={0.75}>
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

          {/* 하단 버튼들 */}
          <View style={s.bottomBtns}>
            <TouchableOpacity style={[s.saveBtn, !allFilled && s.saveBtnDim]} onPress={saveRecord} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>💾 오늘 기록 저장하기</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('SeniorHome')}>
              <Text style={s.homeBtnTxt}>← 홈으로</Text>
            </TouchableOpacity>
          </View>
        </View>
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

const cardW = (width - 32 - 12) / 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F5FB' },

  header: {
    paddingTop: Platform.OS === 'web' ? 14 : 28,
    paddingHorizontal: 18,
    paddingBottom: 0,
    backgroundColor: '#1A4A8A',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#fff' },
  tabRow:         { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.25)' },
  tab:            { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive:      { borderBottomWidth: 3, borderBottomColor: '#fff', marginBottom: -2 },
  tabTxt:         { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  tabTxtActive:   { color: '#fff' },

  body: { flex: 1, padding: 16, gap: 12 },

  // AI 점수 배너 (compact)
  scoreBanner: {
    borderRadius: 18, padding: 16, backgroundColor: '#1a3a5c',
  },
  scoreTop:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreRing:   {
    width: 68, height: 68, borderRadius: 34, borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  scoreNum:    { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 28 },
  scoreUnit:   { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  scoreLabel:  { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  scoreStatus: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  scoreMsg:    { fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },

  // 수치 카드 2x2
  metricsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' },
  metricCard:  {
    width: cardW, backgroundColor: '#fff', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width:0, height:2 }, shadowRadius:6, elevation:2,
    justifyContent: 'center',
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricIcon:   { fontSize: 26 },
  metricLabel:  { fontSize: 18, color: '#546e7a', fontWeight: '700' },
  metricVal:    { fontSize: 30, fontWeight: '900', color: '#1A4A8A', marginBottom: 4 },
  metricUnit:   { fontSize: 16, color: '#9aabb8', fontWeight: '400' },
  metricEmpty:  { fontSize: 26, color: '#b0bec5' },
  metricStatus: { fontSize: 17, fontWeight: '700' },

  // 기록 탭 - 리스트
  inputList:      { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE8F4' },
  inputRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 22,
                    borderBottomWidth: 1, borderBottomColor: '#EEF4FB', gap: 14 },
  inputIcon:      { fontSize: 30, width: 38, textAlign: 'center' },
  inputLabelWrap: { flex: 1 },
  inputLabel:     { fontSize: 20, fontWeight: '700', color: '#16273E' },
  inputStatus:    { fontSize: 17, fontWeight: '600', marginTop: 2 },
  inputVal:       { fontSize: 19, fontWeight: '700', color: '#1A4A8A' },
  inputValEmpty:  { color: '#B8CCE0', fontWeight: '400' },
  inputArrow:     { fontSize: 24, color: '#B8CCE0' },

  // 완료 상태
  completeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  completeTxt: { fontSize: 18, color: '#4caf50', fontWeight: '700' },

  // 하단 버튼 묶음
  bottomBtns: { gap: 10, marginTop: 'auto' },
  recordBtn:  { backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#1565c0', padding: 16, alignItems: 'center' },
  recordBtnTxt: { fontSize: 19, fontWeight: '700', color: '#1565c0' },
  saveBtn:    { backgroundColor: '#1a3a5c', borderRadius: 18, padding: 18, alignItems: 'center' },
  saveBtnDim: { opacity: 0.5 },
  saveBtnTxt: { color: '#fff', fontSize: 19, fontWeight: '800' },
  homeBtn:    { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#dde3ee' },
  homeBtnTxt: { fontSize: 18, fontWeight: '700', color: '#546e7a' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});

const kp = StyleSheet.create({
  wrap:         { padding: 20, paddingBottom: 34 },
  title:        { fontSize: 20, fontWeight: '700', color: '#1a2a3a', marginBottom: 12 },
  displayRow:   { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  bigNum:       { fontSize: 52, fontWeight: '900', color: '#1a2a3a', lineHeight: 58 },
  unit:         { fontSize: 18, color: '#90a4ae', marginBottom: 8 },
  infoBox:      { backgroundColor: '#e8f4fd', borderRadius: 12, padding: 10, marginBottom: 12 },
  infoText:     { fontSize: 15, color: '#1565c0' },
  quickRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn:     { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  quickBtnStar: { backgroundColor: '#1565c0' },
  quickTxt:     { fontSize: 15, fontWeight: '600', color: '#546e7a' },
  quickTxtStar: { color: '#fff' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  key:          { width: '33.33%', paddingVertical: 20, alignItems: 'center', borderTopWidth: 1, borderRightWidth: 1, borderColor: '#f0f4f8' },
  keyConfirm:   { backgroundColor: '#1565c0' },
  keyDel:       { backgroundColor: '#f8fafc' },
  keyTxt:       { fontSize: 24, fontWeight: '500', color: '#1a2a3a' },
  keyTxtConfirm: { color: '#fff', fontWeight: '700' },
  cancelBtn:    { alignItems: 'center', paddingTop: 14 },
  cancelTxt:    { fontSize: 16, color: '#90a4ae' },
});
