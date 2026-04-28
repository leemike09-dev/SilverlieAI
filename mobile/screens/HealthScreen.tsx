import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
const tempStatus = (val: number) => {
  if (val >= 36.0 && val <= 37.2) return 'normal';
  if (val > 38.0) return 'danger';
  return 'caution';
};
const stepsStatus = (val: number) => {
  if (val >= 8000) return 'normal';
  if (val >= 5000) return 'caution';
  return 'danger';
};
const STATUS_LABEL: Record<string, string> = { normal: '정상', caution: '주의', danger: '위험' };
const STATUS_COLOR: Record<string, string> = { normal: GREEN, caution: ORANGE, danger: RED };
const STATUS_BG:    Record<string, string> = { normal: LGREEN, caution: LORANGE, danger: LRED };

const todayKey = () => new Date().toISOString().slice(0, 10);

function fmtTime(h: number, m: number) {
  const ap = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ap} ${h12}시${m > 0 ? ` ${m}분` : ''}`;
}

export default function HealthScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [uname,  setUname]  = useState('');
  const [tab,    setTab]    = useState<'input' | 'history'>('input');

  // 건강 수치 입력
  const [bpSys,        setBpSys]        = useState('');
  const [bpDia,        setBpDia]        = useState('');
  const [glucose,      setGlucose]      = useState('');
  const [glucoseType,  setGlucoseType]  = useState('공복');
  const [temp,         setTemp]         = useState('');
  const [weight,       setWeight]       = useState('');
  const [steps,        setSteps]        = useState('');
  const [stepsAuto,    setStepsAuto]    = useState(false);
  const [stepsLoading, setStepsLoading] = useState(false);

  // 병원 일정
  const [hospDate,   setHospDate]   = useState('');
  const [hospTime,   setHospTime]   = useState('');
  const [hospClinic, setHospClinic] = useState('');
  const [savedHosp,  setSavedHosp]  = useState<{ date: string; time: string; clinic: string } | null>(null);
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

  // ── 병원 일정 ──────────────────────────────────────────────
  const loadHospital = async () => {
    const raw = await AsyncStorage.getItem('hospital_schedule');
    if (!raw) return;
    const p = JSON.parse(raw);
    setSavedHosp(p);
    setHospDate(p.date || '');
    setHospTime(p.time || '');
    setHospClinic(p.clinic || '');
  };

  const saveHospital = async () => {
    if (!hospDate || !hospTime || !hospClinic) {
      Alert.alert('입력 확인', '날짜, 시간, 병원명을 모두 입력해 주세요.');
      return;
    }
    // 날짜 형식 간단 검증 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hospDate)) {
      Alert.alert('날짜 형식', '날짜를 2026-05-15 형식으로 입력해 주세요.');
      return;
    }
    // 시간 형식 검증 (HH:MM)
    if (!/^\d{1,2}:\d{2}$/.test(hospTime)) {
      Alert.alert('시간 형식', '시간을 14:30 형식으로 입력해 주세요.');
      return;
    }
    setHospSaving(true);
    try {
      const schedule = { date: hospDate, time: hospTime, clinic: hospClinic };
      await AsyncStorage.setItem('hospital_schedule', JSON.stringify(schedule));
      setSavedHosp(schedule);
      if (Platform.OS !== 'web') {
        await scheduleHospitalNotifs(hospDate, hospTime, hospClinic);
      }
      const [hh, mm] = hospTime.split(':').map(Number);
      Alert.alert(
        '저장 완료 🏥',
        `${hospDate} ${fmtTime(hh, mm)} ${hospClinic}\n\n` +
        `루미가 전날 저녁 7시와\n당일 4시간 전에 알려드릴게요 🔔`
      );
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
    setHospSaving(false);
  };

  const deleteHospital = async () => {
    Alert.alert('일정 삭제', '병원 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('hospital_schedule');
          setSavedHosp(null);
          setHospDate('');
          setHospTime('');
          setHospClinic('');
          if (Platform.OS !== 'web') {
            try {
              const Notifs = await import('expo-notifications');
              const all = await Notifs.getAllScheduledNotificationsAsync();
              for (const n of all) {
                if ((n.content.data as any)?.type === 'hospital') {
                  await Notifs.cancelScheduledNotificationAsync(n.identifier);
                }
              }
            } catch {}
          }
        },
      },
    ]);
  };

  const scheduleHospitalNotifs = async (date: string, time: string, clinic: string) => {
    try {
      const Notifs = await import('expo-notifications');
      const { status } = await Notifs.requestPermissionsAsync();
      if (status !== 'granted') return;

      // 기존 병원 알림 전부 취소
      const all = await Notifs.getAllScheduledNotificationsAsync();
      for (const n of all) {
        if ((n.content.data as any)?.type === 'hospital') {
          await Notifs.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm]  = time.split(':').map(Number);
      if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return;

      const now    = Date.now();
      const dispTime = fmtTime(hh, mm);

      // ① 전날 오후 7시
      const dayBeforeMs = new Date(y, m - 1, d - 1, 19, 0, 0).getTime();
      if (dayBeforeMs > now) {
        await Notifs.scheduleNotificationAsync({
          content: {
            title: '루미 🏥',
            body: `내일 ${dispTime} ${clinic} 진료 예약이 있어요`,
            data: { type: 'hospital' },
            sound: true,
          },
          trigger: { type: 'timeInterval' as any, seconds: Math.floor((dayBeforeMs - now) / 1000), repeats: false },
        });
      }

      // ② 당일 4시간 전
      const apptMs      = new Date(y, m - 1, d, hh, mm, 0).getTime();
      const fourBeforeMs = apptMs - 4 * 60 * 60 * 1000;
      if (fourBeforeMs > now) {
        await Notifs.scheduleNotificationAsync({
          content: {
            title: '루미 🏥',
            body: `오늘 ${dispTime} ${clinic} 가시는 날이에요`,
            data: { type: 'hospital' },
            sound: true,
          },
          trigger: { type: 'timeInterval' as any, seconds: Math.floor((fourBeforeMs - now) / 1000), repeats: false },
        });
      }
    } catch {}
  };
  // ────────────────────────────────────────────────────────────

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
        ...(r.weight != null && { weight: r.weight }),
        ...(r.steps != null && { steps: r.steps }),
        ...(r.heart_rate != null && { heartRate: r.heart_rate }),
      }));
      setRecords(serverRecords);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverRecords));
    } catch {}
  };

  const save = async () => {
    if (!bpSys && !bpDia && !glucose && !temp && !weight && !steps) {
      Alert.alert('입력 없음', '하나 이상의 수치를 입력해 주세요.');
      return;
    }
    setSaving(true);
    const record: any = {
      id:   Date.now().toString(),
      date: todayKey(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    if (bpSys || bpDia) record.bp      = { sys: Number(bpSys) || 0, dia: Number(bpDia) || 0 };
    if (glucose)        record.glucose = { val: Number(glucose), type: glucoseType };
    if (temp)           record.temp    = Number(temp);
    if (weight)         record.weight  = Number(weight);
    if (steps)          record.steps   = Number(steps);

    try {
      if (userId) {
        const apiBody: any = { user_id: userId, date: record.date, source: 'manual' };
        if (record.bp)      { apiBody.blood_pressure_systolic = record.bp.sys; apiBody.blood_pressure_diastolic = record.bp.dia; }
        if (record.glucose) apiBody.blood_sugar = record.glucose.val;
        if (record.weight)  apiBody.weight      = record.weight;
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
      Alert.alert('저장 완료', '건강 기록이 저장되었습니다.');
      setBpSys(''); setBpDia(''); setGlucose(''); setTemp(''); setWeight('');
      if (!stepsAuto) setSteps('');
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
    setSaving(false);
  };

  const stepsGoal = 8000;
  const stepsPct  = steps ? Math.min(Number(steps) / stepsGoal, 1) : 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── 헤더 ── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 14, 28) }]}>
        <View style={s.headerTopRow}>
          <View>
            <Text style={s.headerTitle}>📊 건강 기록</Text>
            <Text style={s.headerSub}>오늘 수치를 입력해주세요</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn}
            onPress={() => navigation.navigate('Settings', { userId, name: uname })}>
            <Text style={s.settingsBtnTxt}>⚙️</Text>
            <Text style={s.settingsBtnLabel}>설정</Text>
          </TouchableOpacity>
        </View>
        {Platform.OS === 'web' ? (
          <View style={s.waveWrap}>
            {/* @ts-ignore */}
            <svg width="100%" height="20" viewBox="0 0 100 20"
              preserveAspectRatio="none"
              style={{ width: '100%', display: 'block', marginBottom: '-1px' }}>
              <path d="M0 20 Q25 0 50 12 Q75 24 100 5 L100 20 L0 20 Z" fill={BG} />
            </svg>
          </View>
        ) : (
          <View style={s.waveNative} />
        )}
      </View>

      {/* ── 탭 ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={tab === 'input' ? [s.tabBtn, s.tabBtnOn] : s.tabBtn}
          onPress={() => setTab('input')}
        >
          <Text style={tab === 'input' ? [s.tabTxt, s.tabTxtOn] : s.tabTxt}>오늘 입력</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tab === 'history' ? [s.tabBtn, s.tabBtnOn] : s.tabBtn}
          onPress={() => setTab('history')}
        >
          <Text style={tab === 'history' ? [s.tabTxt, s.tabTxtOn] : s.tabTxt}>기록 조회</Text>
        </TouchableOpacity>
      </View>

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

          {/* 체온 / 체중 */}
          <View style={s.rowCards}>
            <View style={[s.card, s.halfCard]}>
              <Text style={s.cardTitle}>🌡️ 체온</Text>
              <View style={s.midInputRow}>
                <TextInput style={s.midInput} value={temp} onChangeText={setTemp}
                  keyboardType="decimal-pad" placeholder="36.5" placeholderTextColor="#B0BEC5"
                  maxLength={4} autoComplete="off" />
                <Text style={s.midUnit}>°C</Text>
              </View>
              {temp ? (() => {
                const st = tempStatus(Number(temp));
                return <View style={[s.statusBadgeSm, { backgroundColor: STATUS_BG[st] }]}>
                  <Text style={[s.statusTxtSm, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
                </View>;
              })() : null}
            </View>
            <View style={[s.card, s.halfCard]}>
              <Text style={s.cardTitle}>⚖️ 체중</Text>
              <View style={s.midInputRow}>
                <TextInput style={s.midInput} value={weight} onChangeText={setWeight}
                  keyboardType="decimal-pad" placeholder="68.0" placeholderTextColor="#B0BEC5"
                  maxLength={5} autoComplete="off" />
                <Text style={s.midUnit}>kg</Text>
              </View>
            </View>
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

          {/* ── 병원 일정 ── */}
          <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#E53935' }]}>
            <Text style={s.cardTitle}>🏥 병원 일정</Text>
            <Text style={s.cardHint}>저장하면 루미가 전날 저녁과 당일 4시간 전에 알려드려요</Text>

            {savedHosp && (
              <View style={hs.savedBox}>
                <Text style={hs.savedTitle}>📅 저장된 일정</Text>
                <Text style={hs.savedInfo}>
                  {savedHosp.date}  {(() => {
                    const [hh, mm] = savedHosp.time.split(':').map(Number);
                    return fmtTime(hh, mm);
                  })()}
                </Text>
                <Text style={hs.savedClinic}>🏥 {savedHosp.clinic}</Text>
                <Text style={hs.savedNote}>🔔 전날 저녁 7시 · 당일 4시간 전 알림 예약됨</Text>
              </View>
            )}

            <Text style={hs.label}>날짜 (예: 2026-05-15)</Text>
            <TextInput
              style={hs.input}
              value={hospDate}
              onChangeText={setHospDate}
              placeholder="2026-05-15"
              placeholderTextColor="#B0BEC5"
              autoComplete="off"
              autoCorrect={false}
              maxLength={10}
            />

            <Text style={hs.label}>시간 (예: 14:30)</Text>
            <TextInput
              style={hs.input}
              value={hospTime}
              onChangeText={setHospTime}
              placeholder="14:30"
              placeholderTextColor="#B0BEC5"
              keyboardType="numbers-and-punctuation"
              autoComplete="off"
              maxLength={5}
            />

            <Text style={hs.label}>병원명</Text>
            <TextInput
              style={hs.input}
              value={hospClinic}
              onChangeText={setHospClinic}
              placeholder="서울름틴내과"
              placeholderTextColor="#B0BEC5"
              autoComplete="off"
            />

            <View style={hs.btnRow}>
              <TouchableOpacity
                style={[hs.saveBtn, hospSaving && { backgroundColor: '#90A4AE' }]}
                onPress={saveHospital}
                disabled={hospSaving}
              >
                {hospSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={hs.saveBtnTxt}>💾 일정 저장</Text>}
              </TouchableOpacity>
              {savedHosp && (
                <TouchableOpacity style={hs.delBtn} onPress={deleteHospital}>
                  <Text style={hs.delBtnTxt}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 건강기록 저장 버튼 */}
          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnOff]} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>저장하기</Text>}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

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
                {rec.temp != null && <RecRow icon="🌡️" label="체온" value={`${rec.temp} °C`} status={tempStatus(rec.temp)} />}
                {rec.weight != null && <RecRow icon="⚖️" label="체중" value={`${rec.weight} kg`} status="normal" />}
                {rec.steps != null && <RecRow icon="🚶" label="걸음수" value={`${rec.steps.toLocaleString()} 보`} status={stepsStatus(rec.steps)} />}
              </View>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <SeniorTabBar activeTab="health" userId={userId} name={uname} navigation={navigation} />
    </View>
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

// 병원 일정 전용 스타일
const hs = StyleSheet.create({
  savedBox:    { backgroundColor: '#FFF8F8', borderRadius: 14, padding: 14, marginBottom: 16,
                 borderWidth: 1, borderColor: '#FFCDD2' },
  savedTitle:  { fontSize: 16, fontWeight: '800', color: '#C62828', marginBottom: 6 },
  savedInfo:   { fontSize: 22, fontWeight: '900', color: '#B71C1C', marginBottom: 4 },
  savedClinic: { fontSize: 20, fontWeight: '700', color: '#1A2C4E', marginBottom: 6 },
  savedNote:   { fontSize: 14, color: '#E53935', fontWeight: '600' },

  label:  { fontSize: 18, fontWeight: '700', color: '#546E7A', marginTop: 14, marginBottom: 6 },
  input:  { fontSize: 22, fontWeight: '700', color: BLUE,
            borderBottomWidth: 2, borderBottomColor: BLUE,
            paddingVertical: 8, marginBottom: 2 },

  btnRow:     { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn:    { flex: 1, backgroundColor: '#E53935', borderRadius: 16,
                paddingVertical: 18, alignItems: 'center' },
  saveBtnTxt: { fontSize: 20, fontWeight: '900', color: '#fff' },
  delBtn:     { flex: 0, backgroundColor: '#FFEBEE', borderRadius: 16,
                paddingVertical: 18, paddingHorizontal: 22, alignItems: 'center' },
  delBtnTxt:  { fontSize: 20, fontWeight: '700', color: '#C62828' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header:       { backgroundColor: BLUE, paddingHorizontal: 20, paddingBottom: 0 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  settingsBtn:  { padding: 8, marginTop: 4 },
  settingsBtnTxt:   { fontSize: 28, textAlign: 'center' },
  settingsBtnLabel: { fontSize: 18, color: 'rgba(255,255,255,0.9)', fontWeight: '700', textAlign: 'center', marginTop: -2 },
  headerTitle:  { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:    { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  waveWrap:     { height: 20, overflow: 'hidden' },
  waveNative:   { height: 22, backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22 },

  tabBar:   { flexDirection: 'row', backgroundColor: '#fff',
              borderBottomWidth: 1, borderBottomColor: '#E0E8F0' },
  tabBtn:   { flex: 1, paddingVertical: 16, alignItems: 'center',
              borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: BLUE },
  tabTxt:   { fontSize: 20, fontWeight: '700', color: '#90A4AE' },
  tabTxtOn: { color: BLUE, fontWeight: '900' },

  scroll:  { flex: 1 },
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

  rowCards:    { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfCard:    { flex: 1, marginBottom: 14 },
  midInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  midInput:    { fontSize: 34, fontWeight: '900', color: BLUE, borderBottomWidth: 2, borderBottomColor: BLUE,
                 flex: 1, paddingVertical: 4 },
  midUnit:     { fontSize: 18, color: '#90A4AE', marginBottom: 6 },

  statusBadge:   { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  statusTxt:     { fontSize: 18, fontWeight: '800' },
  statusBadgeSm: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusTxtSm:   { fontSize: 16, fontWeight: '800' },

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

  emptyBox:   { alignItems: 'center', paddingVertical: 60, gap: 14 },
  emptyIcon:  { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#2C2C2C' },
  emptySub:   { fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 },

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
