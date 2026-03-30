import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, StatusBar, Animated,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

type HealthRecord = {
  id: string; date: string;
  blood_pressure_systolic: number | null; blood_pressure_diastolic: number | null;
  heart_rate: number | null; weight: number | null;
  blood_sugar: number | null; steps: number | null;
  notes: string | null; source: string | null;
};

function calcScore(r: any): number {
  if (!r) return 0;
  let s = 0; let c = 0;
  if (r.steps)                    { c++; s += r.steps >= 5000 ? 100 : r.steps >= 3000 ? 70 : 40; }
  if (r.blood_pressure_systolic)  { c++; const v = r.blood_pressure_systolic; s += v < 120 ? 100 : v < 130 ? 85 : v < 140 ? 65 : 40; }
  if (r.heart_rate)               { c++; const v = r.heart_rate; s += (v >= 60 && v <= 100) ? 100 : 60; }
  if (r.blood_sugar)              { c++; const v = r.blood_sugar; s += v < 100 ? 100 : v < 125 ? 75 : 45; }
  return c > 0 ? Math.round(s / c) : 72;
}

function scoreStatus(score: number, lang: string) {
  if (score >= 85) return { text: lang === 'ko' ? '양호' : 'Good',      color: '#4caf50' };
  if (score >= 65) return { text: lang === 'ko' ? '주의 필요' : 'Caution', color: '#ff9800' };
  return             { text: lang === 'ko' ? '관리 필요' : 'Warning',    color: '#f44336' };
}

function bpStatus(sys: number | null, lang: string) {
  if (!sys) return null;
  if (sys < 120) return { text: lang === 'ko' ? '✓ 정상' : '✓ Normal',   color: '#4caf50' };
  if (sys < 140) return { text: lang === 'ko' ? '⬆ 주의' : '⬆ Caution', color: '#ff9800' };
  return           { text: lang === 'ko' ? '⬆ 높음' : '⬆ High',        color: '#f44336' };
}

export default function HealthScreen({ navigation, route }: any) {
  const { userId, name = '' } = route.params;
  const { t, language } = useLanguage();
  const lang = language || 'ko';

  const [activeTab, setActiveTab] = useState<'today' | 'trend' | 'ai' | 'record'>('today');

  // 오늘 데이터
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  // 히스토리 데이터
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 기록 입력 상태
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [steps, setSteps] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // 키패드 모달
  const [keypadField, setKeypadField] = useState<string | null>(null);
  const [keypadVal, setKeypadVal] = useState('');
  const [keypadVal2, setKeypadVal2] = useState(''); // 혈압 이완기
  const [keypadPhase, setKeypadPhase] = useState<1 | 2>(1); // 혈압 2단계
  const slideAnim = useRef(new Animated.Value(300)).current;

  // 수정 모달
  const [editRecord, setEditRecord] = useState<HealthRecord | null>(null);
  const [editSystolic, setEditSystolic] = useState('');
  const [editDiastolic, setEditDiastolic] = useState('');
  const [editHeartRate, setEditHeartRate] = useState('');
  const [editBloodSugar, setEditBloodSugar] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchToday();
  }, []);

  useEffect(() => {
    if (activeTab === 'trend') fetchHistory();
  }, [activeTab]);

  const fetchToday = async () => {
    setLoadingToday(true);
    try {
      const res = await fetch(`${API_URL}/health/history/${userId}?days=1`);
      const data = await res.json();
      if (data.records?.length > 0) setTodayRecord(data.records[0]);
    } catch {} finally { setLoadingToday(false); }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/health/history/${userId}?days=30`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch {} finally { setHistoryLoading(false); }
  };

  // 키패드 열기
  const openKeypad = (field: string) => {
    setKeypadField(field);
    setKeypadVal(field === 'bp' ? systolic : field === 'hr' ? heartRate : field === 'bs' ? bloodSugar : field === 'steps' ? steps : weight);
    setKeypadVal2(field === 'bp' ? diastolic : '');
    setKeypadPhase(1);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  const closeKeypad = () => {
    Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => setKeypadField(null));
  };

  const keypadPress = (k: string) => {
    const phase = keypadPhase;
    const val   = phase === 1 ? keypadVal : keypadVal2;
    const setVal = phase === 1 ? setKeypadVal : setKeypadVal2;
    if (k === '⌫') { setVal(val.slice(0, -1)); return; }
    if (val.length >= 4) return;
    setVal(val + k);
  };

  const keypadConfirm = () => {
    if (keypadField === 'bp') {
      if (keypadPhase === 1) { setKeypadPhase(2); setKeypadVal2(''); return; }
      setSystolic(keypadVal); setDiastolic(keypadVal2);
    } else if (keypadField === 'hr')    { setHeartRate(keypadVal); }
    else if (keypadField === 'bs')      { setBloodSugar(keypadVal); }
    else if (keypadField === 'steps')   { setSteps(keypadVal); }
    else if (keypadField === 'weight')  { setWeight(keypadVal); }
    closeKeypad();
  };

  const handleSave = async () => {
    if (!systolic && !heartRate && !bloodSugar && !steps && !weight) {
      Alert.alert('', t.fillOne); return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/health/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, date: today,
          blood_pressure_systolic: systolic ? parseInt(systolic) : null,
          blood_pressure_diastolic: diastolic ? parseInt(diastolic) : null,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          blood_sugar: bloodSugar ? parseFloat(bloodSugar) : null,
          steps: steps ? parseInt(steps) : null,
          weight: weight ? parseFloat(weight) : null,
          notes: notes || null,
        }),
      });
      setSystolic(''); setDiastolic(''); setHeartRate('');
      setBloodSugar(''); setSteps(''); setWeight(''); setNotes('');
      await fetchToday();
      setActiveTab('today');
      Alert.alert('', t.saveSuccess);
    } catch { Alert.alert('', t.saveError);
    } finally { setSaving(false); }
  };

  const openEdit = (r: HealthRecord) => {
    setEditRecord(r);
    setEditSystolic(r.blood_pressure_systolic ? String(r.blood_pressure_systolic) : '');
    setEditDiastolic(r.blood_pressure_diastolic ? String(r.blood_pressure_diastolic) : '');
    setEditHeartRate(r.heart_rate ? String(r.heart_rate) : '');
    setEditBloodSugar(r.blood_sugar ? String(r.blood_sugar) : '');
    setEditSteps(r.steps ? String(r.steps) : '');
    setEditWeight(r.weight ? String(r.weight) : '');
    setEditNotes(r.notes || '');
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      const updates: any = {};
      if (editSystolic)  updates.blood_pressure_systolic = parseInt(editSystolic);
      if (editDiastolic) updates.blood_pressure_diastolic = parseInt(editDiastolic);
      if (editHeartRate) updates.heart_rate = parseInt(editHeartRate);
      if (editBloodSugar) updates.blood_sugar = parseFloat(editBloodSugar);
      if (editSteps)     updates.steps = parseInt(editSteps);
      if (editWeight)    updates.weight = parseFloat(editWeight);
      if (editNotes)     updates.notes = editNotes;
      await fetch(`${API_URL}/health/records/${editRecord.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      setEditRecord(null);
      Alert.alert('', t.updateSuccess);
      fetchHistory();
    } catch { Alert.alert('', t.saveError);
    } finally { setEditLoading(false); }
  };

  const handleDelete = (r: HealthRecord) => {
    Alert.alert(t.deleteConfirmTitle, t.deleteConfirmMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: async () => {
        try { await fetch(`${API_URL}/health/records/${r.id}`, { method: 'DELETE' }); fetchHistory(); Alert.alert('', t.deleteSuccess); } catch {}
      }},
    ]);
  };

  const score = calcScore(todayRecord);
  const status = scoreStatus(score, lang);
  const bpStat = bpStatus(todayRecord?.blood_pressure_systolic ?? null, lang);
  const hasAlert = todayRecord?.blood_pressure_systolic && todayRecord.blood_pressure_systolic >= 135;

  const TABS = [
    { key: 'today', label: lang === 'ko' ? '오늘' : 'Today' },
    { key: 'trend', label: lang === 'ko' ? '트렌드' : 'Trend' },
    { key: 'ai',    label: 'AI 리포트' },
    { key: 'record', label: lang === 'ko' ? '기록' : 'Record' },
  ];

  // 키패드 필드 이름
  const keypadTitle: Record<string, string> = {
    bp: lang === 'ko' ? '💗 혈압' : '💗 Blood Pressure',
    hr: lang === 'ko' ? '💓 맥박' : '💓 Heart Rate',
    bs: lang === 'ko' ? '🩸 혈당' : '🩸 Blood Sugar',
    steps: lang === 'ko' ? '🚶 걸음수' : '🚶 Steps',
    weight: lang === 'ko' ? '⚖️ 체중' : '⚖️ Weight',
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── 헤더 + 탭 ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{t.back}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🫀 {lang === 'ko' ? '건강' : 'Health'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ══════════ 오늘 탭 ══════════ */}
      {activeTab === 'today' && (
        <ScrollView contentContainerStyle={styles.body}>
          {/* AI 건강 점수 배너 */}
          <View style={styles.scoreBanner}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreRing}>
                {loadingToday ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.scoreNum}>{todayRecord ? score : '—'}</Text>
                    <Text style={styles.scoreUnitText}>{lang === 'ko' ? '점' : 'pts'}</Text>
                  </>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreTagLine}>{lang === 'ko' ? '🤖 AI 건강 점수 (오늘)' : '🤖 AI Health Score'}</Text>
                <Text style={[styles.scoreStatusText, { color: status.color }]}>{todayRecord ? `${status.text} ${score}점` : (lang === 'ko' ? '기록이 없어요' : 'No record')}</Text>
                <Text style={styles.scoreMsg}>
                  {hasAlert
                    ? (lang === 'ko' ? '혈압이 높습니다. 오후 산책 권장' : 'BP high. Recommend a walk.')
                    : (lang === 'ko' ? '오늘도 건강하게!' : 'Stay healthy today!')}
                </Text>
              </View>
            </View>
            <View style={styles.scoreTrend}>
              {['어제', '이번주', '지난주'].map((l, i) => (
                <View key={i} style={styles.trendItem}>
                  <Text style={styles.trendLabel}>{lang === 'ko' ? l : ['Yesterday','This wk','Last wk'][i]}</Text>
                  <Text style={styles.trendVal}>{[score - 3, score - 1, score - 4][i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* AI 이상 감지 (딥 블루) */}
          {hasAlert && (
            <View style={styles.alertCard}>
              <Text style={styles.alertIcon}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{lang === 'ko' ? 'AI 이상 감지' : 'AI Alert'}</Text>
                <Text style={styles.alertMsg}>
                  {lang === 'ko' ? '혈압이 135 이상입니다. 의사 상담을 고려해 보세요.' : 'BP ≥135. Consider consulting a doctor.'}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('AIChat')}>
                  <Text style={styles.alertAction}>{lang === 'ko' ? '→ AI에게 물어보기' : '→ Ask AI'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 수치 그리드 — 걸음수 1번 */}
          <View style={styles.metricsGrid}>
            {[
              { icon: '🚶', label: lang === 'ko' ? '걸음수' : 'Steps', val: todayRecord?.steps ? `${todayRecord.steps.toLocaleString()}` : '—', unit: lang === 'ko' ? '보' : 'steps', statusText: todayRecord?.steps ? (todayRecord.steps >= 5000 ? '✓ 목표 달성' : '⬆ 더 걸어요') : '' },
              { icon: '💓', label: lang === 'ko' ? '맥박' : 'Pulse', val: todayRecord?.heart_rate ? `${todayRecord.heart_rate}` : '—', unit: 'bpm', statusText: todayRecord?.heart_rate ? (todayRecord.heart_rate >= 60 && todayRecord.heart_rate <= 100 ? '✓ 정상' : '⚠ 확인') : '' },
              { icon: '💗', label: lang === 'ko' ? '혈압' : 'BP', val: todayRecord?.blood_pressure_systolic ? `${todayRecord.blood_pressure_systolic}` : '—', unit: todayRecord?.blood_pressure_diastolic ? `/${todayRecord.blood_pressure_diastolic}` : '', statusText: bpStat?.text || '' },
              { icon: '🩸', label: lang === 'ko' ? '혈당' : 'Sugar', val: todayRecord?.blood_sugar ? `${todayRecord.blood_sugar}` : '—', unit: 'mg', statusText: todayRecord?.blood_sugar ? (todayRecord.blood_sugar < 100 ? '✓ 정상' : '⚠ 주의') : '' },
            ].map((m, i) => (
              <View key={i} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>{m.icon}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricAI}>AI</Text>
                </View>
                <Text style={styles.metricVal}>{m.val}<Text style={styles.metricUnit}>{m.unit}</Text></Text>
                <Text style={[styles.metricStatus, { color: m.statusText.startsWith('✓') ? '#4caf50' : m.statusText.startsWith('⬆') || m.statusText.startsWith('⚠') ? '#ff9800' : '#9aabb8' }]}>{m.statusText}</Text>
              </View>
            ))}
          </View>

          {/* AI 상담 + 주간 리포트 버튼 */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#1a3a5c' }]} onPress={() => navigation.navigate('AIChat')}>
              <Text style={styles.ctaIcon}>💬</Text>
              <Text style={styles.ctaTitle}>{lang === 'ko' ? 'AI 상담' : 'AI Chat'}</Text>
              <Text style={styles.ctaSub}>{lang === 'ko' ? '건강 질문하기' : 'Ask health Q'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#1565c0' }]} onPress={() => navigation.navigate('WeeklyReport', { userId, name })}>
              <Text style={styles.ctaIcon}>📊</Text>
              <Text style={styles.ctaTitle}>{lang === 'ko' ? 'AI 주간 리포트' : 'AI Weekly'}</Text>
              <Text style={styles.ctaSub}>{lang === 'ko' ? '7일 분석 보기' : '7-day analysis'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.recordShortBtn} onPress={() => setActiveTab('record')}>
            <Text style={styles.recordShortText}>📝 {lang === 'ko' ? '오늘 건강 기록하기' : 'Record today'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ══════════ 트렌드 탭 ══════════ */}
      {activeTab === 'trend' && (
        <ScrollView contentContainerStyle={styles.body}>
          {historyLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#1565c0" /></View>
          ) : records.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
              <Text style={styles.emptyText}>{t.noHistory}</Text>
            </View>
          ) : (
            <View>
              {records.map((r, i) => (
                <View key={i} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{new Date(r.date).toLocaleDateString()}</Text>
                    <View style={styles.historyBtns}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(r)}><Text style={styles.editBtnText}>{t.edit}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r)}><Text style={styles.deleteBtnText}>{t.delete}</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.historyChips}>
                    {r.steps              && <View style={styles.chip}><Text style={styles.chipText}>🚶 {r.steps.toLocaleString()}보</Text></View>}
                    {r.heart_rate         && <View style={styles.chip}><Text style={styles.chipText}>💓 {r.heart_rate} bpm</Text></View>}
                    {r.blood_pressure_systolic && <View style={styles.chip}><Text style={styles.chipText}>💗 {r.blood_pressure_systolic}/{r.blood_pressure_diastolic}</Text></View>}
                    {r.blood_sugar        && <View style={styles.chip}><Text style={styles.chipText}>🩸 {r.blood_sugar} mg</Text></View>}
                    {r.weight             && <View style={styles.chip}><Text style={styles.chipText}>⚖️ {r.weight} kg</Text></View>}
                  </View>
                  {r.notes && <Text style={styles.historyNotes}>{r.notes}</Text>}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════ AI 리포트 탭 ══════════ */}
      {activeTab === 'ai' && (
        <ScrollView contentContainerStyle={styles.body}>
          <TouchableOpacity style={styles.aiReportBtn} onPress={() => navigation.navigate('WeeklyReport', { userId, name })}>
            <Text style={styles.aiReportIcon}>📊</Text>
            <Text style={styles.aiReportText}>{lang === 'ko' ? 'AI 주간 건강 리포트 보기 →' : 'View AI Weekly Report →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.aiReportBtn, { backgroundColor: '#1a3a5c' }]} onPress={() => navigation.navigate('Dashboard', { userId, name })}>
            <Text style={styles.aiReportIcon}>🧠</Text>
            <Text style={styles.aiReportText}>{lang === 'ko' ? 'AI 대시보드 & 분석 →' : 'AI Dashboard & Analysis →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.aiReportBtn, { backgroundColor: '#0d47a1' }]} onPress={() => navigation.navigate('AIRecommend', { userId, name })}>
            <Text style={styles.aiReportIcon}>🎯</Text>
            <Text style={styles.aiReportText}>{lang === 'ko' ? 'AI 맞춤 활동 추천 →' : 'AI Activity Recommendations →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.aiReportBtn, { backgroundColor: '#1565c0' }]} onPress={() => navigation.navigate('AIChat')}>
            <Text style={styles.aiReportIcon}>💬</Text>
            <Text style={styles.aiReportText}>{lang === 'ko' ? 'AI 건강 상담하기 →' : 'AI Health Chat →'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ══════════ 기록 탭 (안 A: 자동 동기화형) ══════════ */}
      {activeTab === 'record' && (
        <ScrollView contentContainerStyle={styles.body}>
          {/* 디바이스 연결 배너 */}
          <View style={styles.deviceBanner}>
            <Text style={styles.deviceIcon}>⌚</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceTitle}>{lang === 'ko' ? 'Apple Watch / 갤럭시 워치' : 'Apple Watch / Galaxy Watch'}</Text>
              <Text style={styles.deviceSub}>{lang === 'ko' ? '연동 시 수치 자동 입력' : 'Auto-fill when connected'}</Text>
            </View>
            <TouchableOpacity style={styles.connectBtn}>
              <Text style={styles.connectBtnText}>{lang === 'ko' ? '연결' : 'Connect'}</Text>
            </TouchableOpacity>
          </View>

          {/* 수치 카드 그리드 — 걸음수 1번 */}
          <Text style={styles.inputSectionLabel}>{lang === 'ko' ? '오늘 수치 입력' : 'Enter Today\'s Data'}</Text>
          <View style={styles.inputGrid}>
            {[
              { field: 'steps',  icon: '🚶', label: lang === 'ko' ? '걸음수' : 'Steps',     val: steps,     unit: lang === 'ko' ? '보' : 'steps' },
              { field: 'hr',     icon: '💓', label: lang === 'ko' ? '맥박' : 'Pulse',       val: heartRate, unit: 'bpm' },
              { field: 'bp',     icon: '💗', label: lang === 'ko' ? '혈압' : 'BP',          val: systolic ? `${systolic}/${diastolic || '?'}` : '', unit: 'mmHg' },
              { field: 'bs',     icon: '🩸', label: lang === 'ko' ? '혈당' : 'Blood Sugar', val: bloodSugar, unit: 'mg' },
              { field: 'weight', icon: '⚖️', label: lang === 'ko' ? '체중' : 'Weight',      val: weight,    unit: 'kg' },
            ].map(m => (
              <TouchableOpacity key={m.field} style={[styles.inputCard, m.val ? styles.inputCardFilled : styles.inputCardEmpty]} onPress={() => openKeypad(m.field)}>
                <View style={styles.inputCardHeader}>
                  <Text style={styles.inputCardIcon}>{m.icon}</Text>
                  <Text style={styles.inputCardLabel}>{m.label}</Text>
                </View>
                {m.val ? (
                  <Text style={styles.inputCardValue}>{m.val}<Text style={styles.inputCardUnit}> {m.unit}</Text></Text>
                ) : (
                  <Text style={styles.inputCardEmpty2}>{lang === 'ko' ? '탭하여 입력 ›' : 'Tap to enter ›'}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 메모 */}
          <View style={styles.memoBox}>
            <Text style={styles.inputSectionLabel}>📝 {lang === 'ko' ? '메모 (선택)' : 'Notes (optional)'}</Text>
            <TextInput
              style={styles.memoInput}
              placeholder={lang === 'ko' ? '오늘 컨디션이나 특이사항을 적어주세요...' : 'Any notes about today...'}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Samsung Health 연결 옵션 */}
          <View style={styles.samsungBanner}>
            <Text style={styles.deviceIcon}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceTitle}>Samsung Health (Android)</Text>
              <Text style={styles.deviceSub}>{lang === 'ko' ? '안드로이드 건강 데이터 가져오기' : 'Import Android health data'}</Text>
            </View>
            <TouchableOpacity style={styles.connectBtn}>
              <Text style={styles.connectBtnText}>{lang === 'ko' ? '연결' : 'Connect'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 {lang === 'ko' ? '오늘 기록 저장하기' : 'Save Record'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ══ 숫자 키패드 모달 ══ */}
      <Modal visible={!!keypadField} transparent animationType="none">
        <TouchableOpacity style={styles.keypadOverlay} activeOpacity={1} onPress={closeKeypad}>
          <Animated.View style={[styles.keypadSheet, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.keypadHandle} />

              <View style={styles.keypadHeader}>
                <Text style={styles.keypadTitle}>{keypadField ? keypadTitle[keypadField] : ''} {lang === 'ko' ? '입력' : 'Input'}</Text>
                {keypadField === 'bp' && (
                  <Text style={styles.keypadPhaseText}>{keypadPhase === 1 ? (lang === 'ko' ? '수축기' : 'Systolic') : (lang === 'ko' ? '이완기' : 'Diastolic')}</Text>
                )}
                <View style={styles.keypadDisplay}>
                  <Text style={styles.keypadBigNum}>{keypadPhase === 1 ? (keypadVal || '—') : (keypadVal2 || '—')}</Text>
                  {keypadField === 'bp' && keypadPhase === 2 && <Text style={styles.keypadSep}>/</Text>}
                </View>
                {keypadField === 'bp' && (
                  <Text style={styles.keypadAIRef}>{lang === 'ko' ? '🤖 정상: 수축기 90~120 / 이완기 60~80 mmHg' : '🤖 Normal: Sys 90–120 / Dia 60–80 mmHg'}</Text>
                )}
                {keypadField === 'hr' && (
                  <Text style={styles.keypadAIRef}>{lang === 'ko' ? '🤖 정상: 60~100 bpm' : '🤖 Normal: 60–100 bpm'}</Text>
                )}
                {keypadField === 'bs' && (
                  <Text style={styles.keypadAIRef}>{lang === 'ko' ? '🤖 정상: 70~99 mg/dL (공복)' : '🤖 Normal: 70–99 mg/dL (fasting)'}</Text>
                )}
              </View>

              <View style={styles.keypad}>
                {['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.key, k === '✓' && styles.keyConfirm, k === '⌫' && styles.keyDel]}
                    onPress={() => k === '✓' ? keypadConfirm() : keypadPress(k)}
                  >
                    <Text style={[styles.keyText, k === '✓' && styles.keyTextConfirm]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ══ 수정 모달 ══ */}
      <Modal visible={!!editRecord} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t.editModalTitle}</Text>
            <ScrollView>
              <View style={styles.modalRow}>
                <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder={lang === 'ko' ? '수축기' : 'Systolic'} value={editSystolic} onChangeText={setEditSystolic} keyboardType="numeric" />
                <TextInput style={[styles.modalInput, { flex: 1, marginLeft: 8 }]} placeholder={lang === 'ko' ? '이완기' : 'Diastolic'} value={editDiastolic} onChangeText={setEditDiastolic} keyboardType="numeric" />
              </View>
              <TextInput style={styles.modalInput} placeholder={lang === 'ko' ? '맥박 (bpm)' : 'Heart Rate (bpm)'} value={editHeartRate} onChangeText={setEditHeartRate} keyboardType="numeric" />
              <TextInput style={styles.modalInput} placeholder={lang === 'ko' ? '혈당 (mg)' : 'Blood Sugar (mg)'} value={editBloodSugar} onChangeText={setEditBloodSugar} keyboardType="numeric" />
              <TextInput style={styles.modalInput} placeholder={lang === 'ko' ? '걸음수' : 'Steps'} value={editSteps} onChangeText={setEditSteps} keyboardType="numeric" />
              <TextInput style={styles.modalInput} placeholder={lang === 'ko' ? '체중 (kg)' : 'Weight (kg)'} value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" />
              <TextInput style={[styles.modalInput, { height: 70 }]} placeholder={lang === 'ko' ? '메모' : 'Notes'} value={editNotes} onChangeText={setEditNotes} multiline />
            </ScrollView>
            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={editLoading}>
              {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>{t.updateButton}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditRecord(null)}>
              <Text style={styles.cancelBtnText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomTabBar navigation={navigation} activeTab="health" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f8fc' },
  body: { padding: 14, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#666' },

  /* 헤더 */
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f7', paddingTop: HEADER_PADDING_TOP },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 40 },
  backText: { color: '#1565c0', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a3a5c' },

  /* 탭 */
  tabRow: { flexDirection: 'row' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1565c0' },
  tabText: { fontSize: 12, color: '#9aabb8', fontWeight: '600' },
  tabTextActive: { color: '#1565c0' },

  /* AI 점수 배너 */
  scoreBanner: { backgroundColor: '#1a3a5c', borderRadius: 18, padding: 16, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  scoreRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 22 },
  scoreUnitText: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  scoreTagLine: { fontSize: 10, color: '#7dd3fc', fontWeight: '600', marginBottom: 3 },
  scoreStatusText: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  scoreMsg: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  scoreTrend: { flexDirection: 'row', gap: 8 },
  trendItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, alignItems: 'center' },
  trendLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  trendVal: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* AI 이상 감지 (딥 블루) */
  alertCard: { backgroundColor: '#e3f2fd', borderLeftWidth: 4, borderLeftColor: '#1565c0', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertIcon: { fontSize: 20 },
  alertTitle: { fontSize: 12, fontWeight: '700', color: '#0d47a1', marginBottom: 3 },
  alertMsg: { fontSize: 11, color: '#1565c0', lineHeight: 16 },
  alertAction: { fontSize: 11, color: '#1976d2', fontWeight: '700', marginTop: 5 },

  /* 수치 그리드 */
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metricCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  metricIcon: { fontSize: 14 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#1a3a5c', flex: 1 },
  metricAI: { fontSize: 9, color: '#2196f3', fontWeight: '700' },
  metricVal: { fontSize: 20, fontWeight: '800', color: '#1a3a5c' },
  metricUnit: { fontSize: 10, color: '#9aabb8', fontWeight: '400' },
  metricStatus: { fontSize: 10, fontWeight: '600', marginTop: 3 },

  /* CTA 버튼 */
  ctaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ctaBtn: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  ctaIcon: { fontSize: 20, marginBottom: 4 },
  ctaTitle: { fontSize: 12, fontWeight: '700', color: '#fff' },
  ctaSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  recordShortBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#1565c0', borderRadius: 14, padding: 13, alignItems: 'center' },
  recordShortText: { color: '#1565c0', fontSize: 14, fontWeight: '700' },

  /* 기록 탭 */
  deviceBanner: { backgroundColor: '#1a3a5c', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  deviceIcon: { fontSize: 22 },
  deviceTitle: { fontSize: 12, fontWeight: '700', color: '#fff' },
  deviceSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  connectBtn: { backgroundColor: '#4fc3f7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  connectBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  samsungBanner: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#90caf9', borderStyle: 'dashed', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputSectionLabel: { fontSize: 12, fontWeight: '700', color: '#1a3a5c', marginBottom: 10 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  inputCard: { width: '47%', borderRadius: 14, padding: 12, borderWidth: 1.5 },
  inputCardFilled: { backgroundColor: '#f0f7ff', borderColor: '#90caf9' },
  inputCardEmpty: { backgroundColor: '#fff', borderColor: '#e3eaf2', borderStyle: 'dashed' },
  inputCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  inputCardIcon: { fontSize: 14 },
  inputCardLabel: { fontSize: 11, fontWeight: '600', color: '#7b8fa6' },
  inputCardValue: { fontSize: 20, fontWeight: '800', color: '#1a3a5c' },
  inputCardUnit: { fontSize: 11, color: '#9aabb8', fontWeight: '400' },
  inputCardEmpty2: { fontSize: 11, color: '#c5d0da' },
  memoBox: { marginBottom: 12 },
  memoInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 13, color: '#333', borderWidth: 1, borderColor: '#e3eaf2', height: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#1a3a5c', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* AI 리포트 탭 */
  aiReportBtn: { backgroundColor: '#1565c0', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  aiReportIcon: { fontSize: 28 },
  aiReportText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },

  /* 트렌드 탭 */
  historyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#1565c0' },
  historyBtns: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#e3f2fd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText: { color: '#1565c0', fontSize: 12, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fdecea', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  deleteBtnText: { color: '#c62828', fontSize: 12, fontWeight: '600' },
  historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#f0f4f8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, color: '#1a3a5c', fontWeight: '600' },
  historyNotes: { marginTop: 8, fontSize: 12, color: '#666', fontStyle: 'italic' },

  /* 키패드 */
  keypadOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  keypadSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  keypadHandle: { width: 40, height: 4, backgroundColor: '#dde4ec', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  keypadHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
  keypadTitle: { fontSize: 14, fontWeight: '700', color: '#1a3a5c', marginBottom: 4 },
  keypadPhaseText: { fontSize: 11, color: '#1565c0', fontWeight: '600', marginBottom: 4 },
  keypadDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  keypadBigNum: { fontSize: 42, fontWeight: '800', color: '#1a3a5c', lineHeight: 46 },
  keypadSep: { fontSize: 28, color: '#dde4ec' },
  keypadAIRef: { fontSize: 11, color: '#1565c0', backgroundColor: '#e3f2fd', padding: 6, borderRadius: 8, marginTop: 4 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap' },
  key: { width: '33.33%', padding: 18, alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderRightWidth: 1, borderColor: '#f0f4f8' },
  keyConfirm: { backgroundColor: '#1565c0' },
  keyDel: { backgroundColor: '#f4f7fa' },
  keyText: { fontSize: 22, fontWeight: '600', color: '#1a3a5c' },
  keyTextConfirm: { color: '#fff', fontSize: 16 },

  /* 수정 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a3a5c', marginBottom: 16 },
  modalRow: { flexDirection: 'row', gap: 8 },
  modalInput: { backgroundColor: '#f4f8fc', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 10, color: '#333' },
  updateBtn: { backgroundColor: '#1a3a5c', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#9aabb8', fontSize: 15 },
});
