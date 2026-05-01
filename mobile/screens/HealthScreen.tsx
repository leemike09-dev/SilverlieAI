import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE    = '#1A4A8A';
const LBLUE   = '#EBF3FB';
const BG      = '#F4F7FC';
const GREEN   = '#2E7D32';
const LGREEN  = '#E8F5E9';
const RED     = '#C62828';
const LRED    = '#FFEBEE';
const ORANGE  = '#E65100';
const LORANGE = '#FFF3E0';
const PURPLE  = '#6A1B9A';

const STORAGE_KEY = 'health_records';
const GLUCOSE_TYPES = ['공복', '식전', '식후'];

const bpStatus = (sys: number, dia: number) => {
  if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) return 'normal';
  if (sys > 140 || dia > 90) return 'danger';
  return 'caution';
};
const glucoseStatus = (val: number, type: string) => {
  const range = type === '공복' ? [70, 100] : type === '식전' ? [70, 110] : [70, 140];
  if (val >= range[0] && val <= range[1]) return 'normal';
  if (val > range[1] * 1.2) return 'danger';
  return 'caution';
};
const stepsStatus = (val: number) => {
  if (val >= 8000) return 'normal';
  if (val >= 5000) return 'caution';
  return 'danger';
};
const sleepStatus = (hours: number) => {
  if (hours >= 7 && hours <= 9) return 'normal';
  if (hours >= 5) return 'caution';
  return 'danger';
};
const STATUS_LABEL: Record<string, string> = { normal: '정상', caution: '주의', danger: '위험' };
const STATUS_COLOR: Record<string, string> = { normal: GREEN, caution: ORANGE, danger: RED };
const STATUS_BG:    Record<string, string> = { normal: LGREEN, caution: LORANGE, danger: LRED };

const todayKey = () => new Date().toISOString().slice(0, 10);


function calcSleepHours(start: string, end: string): number | null {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let startMin = sh * 60 + sm;
  let endMin   = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60; // 자정 넘기는 경우
  const diff = endMin - startMin;
  return Math.round(diff / 6) / 10; // 소수점 1자리
}

function fmtSleepHours(h: number) {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return min > 0 ? `${hrs}시간 ${min}분` : `${hrs}시간`;
}

export default function HealthScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [uname,  setUname]  = useState('');
  const [tab,    setTab]    = useState<'input' | 'history'>('history');

  // 건강 수치 입력
  const [bpSys,        setBpSys]        = useState('');
  const [bpDia,        setBpDia]        = useState('');
  const [glucose,      setGlucose]      = useState('');
  const [glucoseType,  setGlucoseType]  = useState('공복');
  const [sleepStart,   setSleepStart]   = useState('');
  const [sleepEnd,     setSleepEnd]     = useState('');
  const [steps,        setSteps]        = useState('');
  const [stepsAuto,    setStepsAuto]    = useState(false);
  const [stepsLoading, setStepsLoading] = useState(false);

  // 병원 예약
  const [hospDate,   setHospDate]   = useState('');
  const [hospTime,   setHospTime]   = useState('');
  const [hospClinic, setHospClinic] = useState('');
  const [hospMemo,   setHospMemo]   = useState('');
  const [hospSaving, setHospSaving] = useState(false);

  // 기록
  const [records, setRecords] = useState<any[]>([]);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const init = async () => {
      const uid  = (await AsyncStorage.getItem('userId'))   || '';
      const name = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUname(name);
      await loadRecords(uid);
      tryPedometer();
      loadHospital();
    };
    init();
  }, []);

  const tryPedometer = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { Pedometer } = await import('expo-sensors');
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) return;
      const available = await Pedometer.isAvailableAsync();
      if (!available) return;
      setStepsLoading(true);
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(midnight, new Date());
      if (result?.steps != null) {
        setSteps(String(result.steps));
        setStepsAuto(true);
      }
    } catch {}
    setStepsLoading(false);
  };

  const loadRecords = async (uid?: string) => {
    const id = uid || userId;
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) setRecords(JSON.parse(cached));
    } catch {}
    if (!id) return;
    try {
      const res = await fetch('https://silverlieai.onrender.com/health/records/' + id);
      if (!res.ok) return;
      const data = await res.json();
      const serverRecords = (data.records || []).map((r: any) => ({
        id: r.id,
        date: r.date,
        time: '',
        ...(r.blood_pressure_systolic && { bp: { sys: r.blood_pressure_systolic, dia: r.blood_pressure_diastolic } }),
        ...(r.blood_sugar != null && { glucose: { val: r.blood_sugar, type: '공복' } }),
        ...(r.steps != null && { steps: r.steps }),
        ...(r.heart_rate != null && { heartRate: r.heart_rate }),
      }));
      setRecords(serverRecords);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverRecords));
    } catch {}
  };

  const loadHospital = async () => {
    const raw = await AsyncStorage.getItem('hospital_schedule');
    if (!raw) return;
    const p = JSON.parse(raw);
    setHospDate(p.date || '');
    setHospTime(p.time || '');
    setHospClinic(p.clinic || '');
    setHospMemo(p.memo || '');
  };

  const saveHospital = async () => {
    if (!hospDate || !hospTime || !hospClinic) {
      Alert.alert('입력 확인', '날짜, 시간, 병원명을 모두 입력해 주세요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hospDate)) {
      Alert.alert('날짜 형식', '2026-05-15 형식으로 입력해 주세요.');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(hospTime)) {
      Alert.alert('시간 형식', '14:30 형식으로 입력해 주세요.');
      return;
    }
    setHospSaving(true);
    try {
      const schedule = { date: hospDate, time: hospTime, clinic: hospClinic, memo: hospMemo };
      await AsyncStorage.setItem('hospital_schedule', JSON.stringify(schedule));
      Alert.alert('저장 완료 🏥', '병원 예약이 저장되었습니다.\n가족 탭에서 확인할 수 있어요.', [
        { text: '확인', onPress: () => navigation.navigate('FamilyDashboard', { userId, name: uname, initialTab: 'hosp' }) },
      ]);
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
    setHospSaving(false);
  };

  const sleepHours = sleepStart && sleepEnd ? calcSleepHours(sleepStart, sleepEnd) : null;

  const save = async () => {
    if (!bpSys && !bpDia && !glucose && !sleepStart && !steps) {
      Alert.alert('입력 없음', '하나 이상의 수치를 입력해 주세요.');
      return;
    }
    if ((sleepStart && !sleepEnd) || (!sleepStart && sleepEnd)) {
      Alert.alert('수면 입력', '시작 시간과 종료 시간을 모두 입력해 주세요.');
      return;
    }
    setSaving(true);
    const record: any = {
      id:   Date.now().toString(),
      date: todayKey(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    if (bpSys || bpDia)           record.bp      = { sys: Number(bpSys) || 0, dia: Number(bpDia) || 0 };
    if (glucose)                   record.glucose = { val: Number(glucose), type: glucoseType };
    if (sleepStart && sleepEnd)    record.sleep   = { start: sleepStart, end: sleepEnd, hours: sleepHours };
    if (steps)                     record.steps   = Number(steps);

    try {
      if (userId) {
        const apiBody: any = { user_id: userId, date: record.date, source: 'manual' };
        if (record.bp)      { apiBody.blood_pressure_systolic = record.bp.sys; apiBody.blood_pressure_diastolic = record.bp.dia; }
        if (record.glucose) apiBody.blood_sugar = record.glucose.val;
        if (record.steps)   apiBody.steps       = record.steps;
        await fetch('https://silverlieai.onrender.com/health/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiBody),
        }).catch(() => {});
      }
      const stored  = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: any[] = stored ? JSON.parse(stored) : [];
      const updated = [record, ...existing].slice(0, 90);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecords(updated);
      Alert.alert('저장 완료 ✅', '건강 기록이 저장되었습니다.', [
        { text: '확인', onPress: () => setTab('history') }
      ]);
      setBpSys(''); setBpDia(''); setGlucose('');
      setSleepStart(''); setSleepEnd('');
      if (!stepsAuto) setSteps('');
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
    setSaving(false);
  };

  const stepsGoal = 8000;
  const stepsPct  = steps ? Math.min(Number(steps) / stepsGoal, 1) : 0;

  return (
    <LinearGradient
      colors={['#FFF8FA', '#FFE6EE', '#FFD5E4']}
      locations={[0, 0.55, 1]}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8FA" />

      {/* ── 상단 바 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View>
          <Text style={s.topTitle}>❤️ 건강 기록</Text>
          <Text style={s.topSub}>{tab === 'input' ? '오늘 수치를 입력해주세요' : '내 건강 기록 조회'}</Text>
        </View>
      </View>

      {/* ── 탭 ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={tab === 'history' ? [s.tabBtn, s.tabBtnOn] : s.tabBtn}
          onPress={() => setTab('history')}
        >
          <Text style={tab === 'history' ? [s.tabTxt, s.tabTxtOn] : s.tabTxt}>기록 조회</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tab === 'input' ? [s.tabBtn, s.tabBtnOn] : s.tabBtn}
          onPress={() => setTab('input')}
        >
          <Text style={tab === 'input' ? [s.tabTxt, s.tabTxtOn] : s.tabTxt}>오늘 입력</Text>
        </TouchableOpacity>
      </View>

      {/* ── 기록 조회 탭 ── */}
      {tab === 'history' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={s.weeklyBtn}
            onPress={() => navigation.navigate('WeeklyReport', { userId, name: uname })}
            activeOpacity={0.8}>
            <Text style={s.weeklyBtnIcon}>📊</Text>
            <Text style={s.weeklyBtnTxt}>7일 주간 건강 리포트 보기</Text>
            <Text style={s.weeklyBtnArr}>›</Text>
          </TouchableOpacity>

          {records.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📊</Text>
              <Text style={s.emptyTitle}>아직 기록이 없어요</Text>
              <Text style={s.emptySub}>오늘 건강 수치를 입력하면{'\n'}여기에 기록이 쌓입니다</Text>
              <TouchableOpacity style={s.goInputBtn} onPress={() => setTab('input')}>
                <Text style={s.goInputBtnTxt}>+ 오늘 기록 입력하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            records.map((rec) => (
              <View key={rec.id} style={s.recCard}>
                <View style={s.recHeader}>
                  <Text style={s.recDate}>{rec.date}</Text>
                  <Text style={s.recTime}>{rec.time}</Text>
                </View>
                {rec.bp && <RecRow icon="💗" label="혈압" value={`${rec.bp.sys} / ${rec.bp.dia} mmHg`} status={bpStatus(rec.bp.sys, rec.bp.dia)} />}
                {rec.glucose && <RecRow icon="🩸" label={`혈당 (${rec.glucose.type})`} value={`${rec.glucose.val} mg/dL`} status={glucoseStatus(rec.glucose.val, rec.glucose.type)} />}
                {rec.sleep && <RecRow icon="😴" label="수면" value={fmtSleepHours(rec.sleep.hours)} status={sleepStatus(rec.sleep.hours)} />}
                {rec.steps != null && <RecRow icon="🚶" label="걸음수" value={`${rec.steps.toLocaleString()} 보`} status={stepsStatus(rec.steps)} />}
              </View>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── 오늘 입력 탭 ── */}
      {tab === 'input' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* 혈압 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>💗 혈압</Text>
            <Text style={s.cardHint}>정상: 90~120 / 60~80 mmHg</Text>
            <View style={s.bpRow}>
              <View style={s.bpBox}>
                <Text style={s.bpLabel}>수축기</Text>
                <TextInput style={s.bpInput} value={bpSys} onChangeText={setBpSys}
                  keyboardType="numeric" placeholder="120" placeholderTextColor="#B0BEC5"
                  maxLength={3} autoComplete="off" />
                <Text style={s.bpUnit}>mmHg</Text>
              </View>
              <Text style={s.bpSlash}>/</Text>
              <View style={s.bpBox}>
                <Text style={s.bpLabel}>이완기</Text>
                <TextInput style={s.bpInput} value={bpDia} onChangeText={setBpDia}
                  keyboardType="numeric" placeholder="80" placeholderTextColor="#B0BEC5"
                  maxLength={3} autoComplete="off" />
                <Text style={s.bpUnit}>mmHg</Text>
              </View>
            </View>
            {bpSys && bpDia ? (() => {
              const st = bpStatus(Number(bpSys), Number(bpDia));
              return <View style={[s.statusBadge, { backgroundColor: STATUS_BG[st] }]}>
                <Text style={[s.statusTxt, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
              </View>;
            })() : null}
          </View>

          {/* 혈당 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🩸 혈당</Text>
            <View style={s.glucoseTypeRow}>
              {GLUCOSE_TYPES.map(t => (
                <TouchableOpacity key={t}
                  style={glucoseType === t ? [s.typeBtn, s.typeBtnOn] : s.typeBtn}
                  onPress={() => setGlucoseType(t)}>
                  <Text style={glucoseType === t ? [s.typeTxt, s.typeTxtOn] : s.typeTxt}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.bigInputRow}>
              <TextInput style={s.bigInput} value={glucose} onChangeText={setGlucose}
                keyboardType="numeric" placeholder="--" placeholderTextColor="#B0BEC5"
                maxLength={3} autoComplete="off" />
              <Text style={s.bigUnit}>mg/dL</Text>
            </View>
            {glucose ? (() => {
              const st = glucoseStatus(Number(glucose), glucoseType);
              return <View style={[s.statusBadge, { backgroundColor: STATUS_BG[st] }]}>
                <Text style={[s.statusTxt, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
              </View>;
            })() : null}
          </View>

          {/* 수면 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>😴 수면</Text>
            <Text style={s.cardHint}>권장: 7~9시간</Text>
            <View style={s.sleepRow}>
              <View style={s.sleepBox}>
                <Text style={s.sleepLabel}>잠든 시간</Text>
                <TextInput
                  style={s.sleepInput}
                  value={sleepStart}
                  onChangeText={setSleepStart}
                  placeholder="22:30"
                  placeholderTextColor="#B0BEC5"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  autoComplete="off"
                />
              </View>
              <Text style={s.sleepArrow}>→</Text>
              <View style={s.sleepBox}>
                <Text style={s.sleepLabel}>일어난 시간</Text>
                <TextInput
                  style={s.sleepInput}
                  value={sleepEnd}
                  onChangeText={setSleepEnd}
                  placeholder="06:30"
                  placeholderTextColor="#B0BEC5"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  autoComplete="off"
                />
              </View>
            </View>
            {sleepHours !== null && (
              <View style={s.sleepResult}>
                <Text style={s.sleepResultTxt}>총 수면: </Text>
                <Text style={[s.sleepResultHours, { color: STATUS_COLOR[sleepStatus(sleepHours)] }]}>
                  {fmtSleepHours(sleepHours)}
                </Text>
                <View style={[s.statusBadge, { backgroundColor: STATUS_BG[sleepStatus(sleepHours)], marginLeft: 8, marginTop: 0 }]}>
                  <Text style={[s.statusTxt, { color: STATUS_COLOR[sleepStatus(sleepHours)] }]}>
                    {STATUS_LABEL[sleepStatus(sleepHours)]}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 걸음수 */}
          <View style={s.card}>
            <View style={s.stepsHeader}>
              <Text style={s.cardTitle}>🚶 걸음수</Text>
              {stepsAuto && <View style={s.autoBadge}><Text style={s.autoBadgeTxt}>자동 측정 중</Text></View>}
              {stepsLoading && <ActivityIndicator color={BLUE} size="small" />}
            </View>
            <View style={s.bigInputRow}>
              <TextInput style={s.bigInput} value={steps}
                onChangeText={t => { setSteps(t); setStepsAuto(false); }}
                keyboardType="numeric" placeholder="0" placeholderTextColor="#B0BEC5"
                maxLength={6} editable={!stepsLoading} autoComplete="off" />
              <Text style={s.bigUnit}>보</Text>
            </View>
            <View style={s.stepsGoalRow}>
              <Text style={s.stepsGoalTxt}>목표 {stepsGoal.toLocaleString()}보</Text>
              {steps && <Text style={[s.stepsGoalTxt, { color: STATUS_COLOR[stepsStatus(Number(steps))] }]}>
                {Math.min(Math.round(stepsPct * 100), 100)}%
              </Text>}
            </View>
            <View style={s.stepsBar}>
              <View style={[s.stepsFill, {
                width: (Math.round(stepsPct * 100) + '%') as any,
                backgroundColor: steps ? STATUS_COLOR[stepsStatus(Number(steps))] : '#B0BEC5',
              }]} />
            </View>
            {Platform.OS === 'web' && <Text style={s.stepsNote}>* 웹에서는 수동 입력만 가능합니다</Text>}
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnOff]} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>저장하기</Text>}
          </TouchableOpacity>

          {/* 병원 예약 */}
          <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', marginTop: 8 }]}>
            <Text style={s.cardTitle}>🏥 병원 예약</Text>
            <Text style={s.cardHint}>저장하면 가족 탭에서 확인할 수 있어요</Text>

            <Text style={hs.label}>날짜 (예: 2026-05-15)</Text>
            <TextInput style={hs.input} value={hospDate} onChangeText={setHospDate}
              placeholder="2026-05-15" placeholderTextColor="#B0BEC5"
              autoComplete="off" autoCorrect={false} maxLength={10} />

            <Text style={hs.label}>시간 (예: 14:30)</Text>
            <TextInput style={hs.input} value={hospTime} onChangeText={setHospTime}
              placeholder="14:30" placeholderTextColor="#B0BEC5"
              keyboardType="numbers-and-punctuation" maxLength={5} />

            <Text style={hs.label}>병원명</Text>
            <TextInput style={hs.input} value={hospClinic} onChangeText={setHospClinic}
              placeholder="서울내과" placeholderTextColor="#B0BEC5" autoComplete="off" />

            <Text style={hs.label}>메모 (증상, 전달사항 등)</Text>
            <TextInput style={hs.memoInput} value={hospMemo} onChangeText={setHospMemo}
              placeholder={'예) 최근 두통이 심해요\n혈압약 부작용 문의'} placeholderTextColor="#B0BEC5"
              multiline numberOfLines={3} textAlignVertical="top" />

            <TouchableOpacity
              style={[hs.saveBtn, hospSaving && { backgroundColor: '#90A4AE' }]}
              onPress={saveHospital} disabled={hospSaving}>
              {hospSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={hs.saveBtnTxt}>💾 예약 저장 → 가족 탭에서 확인</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <SeniorTabBar activeTab="health" userId={userId} name={uname} navigation={navigation} />
    </LinearGradient>
  );
}

function RecRow({ icon, label, value, status }: { icon: string; label: string; value: string; status: string }) {
  return (
    <View style={sr.row}>
      <Text style={sr.icon}>{icon}</Text>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
      <View style={[sr.badge, { backgroundColor: STATUS_BG[status] }]}>
        <Text style={[sr.badgeTxt, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
      </View>
    </View>
  );
}

const sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8,
              borderBottomWidth: 1, borderBottomColor: '#EEF2F8' },
  icon:     { fontSize: 22, width: 32 },
  label:    { fontSize: 18, color: '#546E7A', flex: 1 },
  value:    { fontSize: 20, fontWeight: '700', color: '#1A2C4E' },
  badge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 6 },
  badgeTxt: { fontSize: 16, fontWeight: '800' },
});

const s = StyleSheet.create({
  root: { flex: 1 },

  topBar:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
             paddingHorizontal: 20, paddingBottom: 12 },
  topTitle:{ fontSize: 26, fontWeight: '900', color: '#1A2C4E', letterSpacing: 0.3 },
  topSub:  { fontSize: 13, color: '#8A6070', fontWeight: '600', marginTop: 2 },
  gearBtn: { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14,
             paddingHorizontal: 9, paddingVertical: 4,
             borderWidth: 1, borderColor: 'rgba(200,140,160,0.4)', alignItems: 'center' },
  gearEmoji: { fontSize: 20 },
  gearLabel: { fontSize: 10, color: '#6A3050', fontWeight: '700', textAlign: 'center', marginTop: 1 },

  tabBar:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)',
              borderBottomWidth: 1, borderBottomColor: 'rgba(255,200,215,0.6)' },
  tabBtn:   { flex: 1, paddingVertical: 16, alignItems: 'center',
              borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: '#C2185B' },
  tabTxt:   { fontSize: 20, fontWeight: '700', color: '#90A4AE' },
  tabTxtOn: { color: '#C2185B', fontWeight: '900' },

  scroll:  { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 120 },

  card:      { backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 14,
               shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: BLUE, marginBottom: 6 },
  cardHint:  { fontSize: 16, color: '#90A4AE', marginBottom: 14 },

  bpRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  bpBox:   { flex: 1, alignItems: 'center' },
  bpLabel: { fontSize: 18, color: '#546E7A', marginBottom: 6 },
  bpInput: { fontSize: 38, fontWeight: '900', color: BLUE, textAlign: 'center',
             borderBottomWidth: 2.5, borderBottomColor: BLUE, width: '100%', paddingVertical: 4 },
  bpUnit:  { fontSize: 16, color: '#90A4AE', marginTop: 4 },
  bpSlash: { fontSize: 38, color: '#B0BEC5', fontWeight: '300', marginTop: 20 },

  glucoseTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn:   { flex: 1, paddingVertical: 12, alignItems: 'center',
               backgroundColor: BG, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0' },
  typeBtnOn: { backgroundColor: LBLUE, borderColor: BLUE },
  typeTxt:   { fontSize: 18, fontWeight: '700', color: '#78909C' },
  typeTxtOn: { color: BLUE },

  bigInputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bigInput:    { fontSize: 52, fontWeight: '900', color: BLUE, textAlign: 'center',
                 borderBottomWidth: 2.5, borderBottomColor: BLUE, minWidth: 120, paddingVertical: 4 },
  bigUnit:     { fontSize: 22, color: '#90A4AE', marginBottom: 10 },

  /* 수면 */
  sleepRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sleepBox:        { flex: 1, alignItems: 'center' },
  sleepLabel:      { fontSize: 17, color: '#546E7A', marginBottom: 8 },
  sleepInput:      { fontSize: 34, fontWeight: '900', color: PURPLE, textAlign: 'center',
                     borderBottomWidth: 2.5, borderBottomColor: PURPLE, width: '100%', paddingVertical: 4 },
  sleepArrow:      { fontSize: 28, color: '#B0BEC5', marginTop: 20 },
  sleepResult:     { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  sleepResultTxt:  { fontSize: 18, color: '#546E7A', fontWeight: '600' },
  sleepResultHours:{ fontSize: 26, fontWeight: '900' },

  statusBadge:   { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  statusTxt:     { fontSize: 18, fontWeight: '800' },

  stepsHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  autoBadge:    { backgroundColor: LBLUE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  autoBadgeTxt: { fontSize: 16, fontWeight: '700', color: BLUE },
  stepsGoalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  stepsGoalTxt: { fontSize: 18, color: '#90A4AE', fontWeight: '600' },
  stepsBar:     { height: 12, backgroundColor: '#E0E8F0', borderRadius: 6, overflow: 'hidden' },
  stepsFill:    { height: '100%' as any, borderRadius: 6 },
  stepsNote:    { fontSize: 16, color: '#B0BEC5', marginTop: 10 },

  saveBtn:    { backgroundColor: BLUE, borderRadius: 18, paddingVertical: 22, alignItems: 'center', marginTop: 8 },
  saveBtnOff: { backgroundColor: '#90A4AE' },
  saveBtnTxt: { fontSize: 22, fontWeight: '900', color: '#fff' },

  emptyBox:   { alignItems: 'center', paddingVertical: 40, gap: 14 },
  emptyIcon:  { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#2C2C2C' },
  emptySub:   { fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 },
  goInputBtn: { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  goInputBtnTxt: { fontSize: 20, fontWeight: '800', color: '#fff' },

  recCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
               shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
               shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F8', paddingBottom: 10 },
  recDate:   { fontSize: 20, fontWeight: '900', color: BLUE },
  recTime:   { fontSize: 18, color: '#90A4AE' },
  weeklyBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A4A8A',
                   borderRadius: 16, padding: 18, marginBottom: 16, gap: 10 },
  weeklyBtnIcon: { fontSize: 24 },
  weeklyBtnTxt:  { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  weeklyBtnArr:  { fontSize: 28, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
});

const hs = StyleSheet.create({
  label:      { fontSize: 18, fontWeight: '700', color: '#546E7A', marginTop: 14, marginBottom: 6 },
  input:      { fontSize: 22, fontWeight: '700', color: '#1A4A8A',
                borderBottomWidth: 2, borderBottomColor: '#1A4A8A', paddingVertical: 8 },
  memoInput:  { fontSize: 18, color: '#1A2C4E', lineHeight: 28,
                borderWidth: 1.5, borderColor: '#C0C0C0', borderRadius: 12,
                padding: 12, minHeight: 90, marginTop: 6, backgroundColor: '#FAFAFA' },
  saveBtn:    { backgroundColor: '#E53935', borderRadius: 16, paddingVertical: 18,
                alignItems: 'center', marginTop: 20 },
  saveBtnTxt: { fontSize: 19, fontWeight: '900', color: '#fff' },
});
