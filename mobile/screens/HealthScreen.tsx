import React, { useState, useEffect, useRef, useCallback } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Modal, TextInput, FlatList, Platform,
} from 'react-native';
import Lumi from '../components/Lumi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE = '#3B82F6';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const GREEN = '#3BA559';
const GREEN_DK = '#1F7A3A';
const GREEN_BG = '#E6F4E2';
const ORANGE = '#F58A4D';
const ORANGE_BG = '#FFE4CC';
const RED = '#E5453C';
const RED_BG = '#FFE6DC';
const WARN = '#A8770F';
const WARN_BG = '#FFF3D6';

const STATUS = {
  normal: { label: '정상', fg: GREEN_DK, bg: GREEN_BG },
  caution: { label: '주의', fg: WARN, bg: WARN_BG },
  danger: { label: '위험', fg: RED, bg: RED_BG },
};

const bpStatus = (sys: number, dia: number) => {
  if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) return 'normal';
  if (sys > 140 || dia > 90) return 'danger';
  return 'caution';
};

const glucoseStatus = (val: number) => {
  if (val >= 70 && val <= 140) return 'normal';
  if (val > 168) return 'danger';
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

const API = 'https://silverlieai.onrender.com';

const tempStatus = (v: number) => {
  if (v >= 36.0 && v <= 37.5) return 'normal';
  if (v > 38.5) return 'danger';
  return 'caution';
};

const lumiInterpretBp = (sys: number, dia: number): string => {
  const st = bpStatus(sys, dia);
  if (st === 'normal')  return '혈압이 정상이에요. 안심하세요 😊';
  if (st === 'danger')  return '혈압이 높아요. 병원에 가보시는 게 좋아요';
  return '혈압이 조금 높네요. 오늘은 편히 쉬세요';
};
const lumiInterpretSg = (v: number): string => {
  const st = glucoseStatus(v);
  if (st === 'normal')  return '혈당이 정상 범위예요. 잘 챙기고 계세요 💙';
  if (st === 'danger')  return '혈당이 높아요. 병원에 꼭 가보세요';
  return '혈당이 조금 높네요. 식사에 신경 써보세요';
};
const lumiInterpretTemp = (v: number): string => {
  const st = tempStatus(v);
  if (st === 'normal')  return '체온이 정상이에요. 건강하시네요 😊';
  if (st === 'danger')  return '열이 많이 나요. 병원에 가보세요';
  return '체온이 조금 높아요. 충분히 쉬세요';
};

interface HealthRecord {
  date: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  blood_sugar: number;
  temperature?: number;
  heart_rate: number;
  weight: number;
  steps: number;
  sleep_hours: number;
}

export default function HealthScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<HealthRecord | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [liveSteps, setLiveSteps] = useState<number | null>(null);
  const stepsSaveTimer = useRef<any>(null);

  // 기기 건강 연동 상태
  const [healthConnected, setHealthConnected] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [heartRateMin, setHeartRateMin] = useState<number | null>(null);
  const [heartRateMax, setHeartRateMax] = useState<number | null>(null);
  const [sleepHoursAuto, setSleepHoursAuto] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);

  const todayKey = localDate();

  useEffect(() => {
    loadRecords();
  }, []);

  // Pedometer: 오늘 0시부터 누적 걸음수 실시간 구독
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: any;
    (async () => {
      try {
        const { Pedometer } = await import('expo-sensors');
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== 'granted') return;
        const ok = await Pedometer.isAvailableAsync().catch(() => false);
        if (!ok) return;
        if (Platform.OS === 'ios') {
          // iOS: 자정부터 현재까지 누적 걸음수
          const start = new Date(); start.setHours(0, 0, 0, 0);
          try {
            const past = await Pedometer.getStepCountAsync(start, new Date());
            if (past?.steps) setLiveSteps(past.steps);
          } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
          sub = Pedometer.watchStepCount(r => {
            setLiveSteps(prev => (prev ?? 0) + r.steps);
          });
        } else {
          // Android: App.tsx가 steps_today_android를 누적 관리
          // watchStepCount의 r.steps는 부팅 이후 누적값이라 직접 사용 불가
          // → 이벤트 발생 시 App.tsx가 업데이트한 steps_today_android를 다시 읽음
          const readSteps = async () => {
            const raw = await AsyncStorage.getItem('steps_today_android');
            setLiveSteps(raw ? parseInt(raw) : 0);
          };
          await readSteps();
          sub = Pedometer.watchStepCount(async () => { await readSteps(); });
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    })();
    return () => { if (sub) sub.remove(); };
  }, []);

  const loadRecords = async () => {
    try {
      const raw = await AsyncStorage.getItem(`health_records.${userId}`);
      const list = raw ? JSON.parse(raw) : [];
      const sorted = list.sort((a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Android 걸음수 병합 (App.tsx에서 steps_today_android로 저장)
      const stepsRaw = await AsyncStorage.getItem('steps_today_android');
      const todaySteps = stepsRaw ? parseInt(stepsRaw) : 0;
      if (todaySteps > 0) {
        const idx = sorted.findIndex((r: any) => r.date === todayKey);
        if (idx >= 0) {
          sorted[idx] = { ...sorted[idx], steps: todaySteps };
        } else {
          sorted.unshift({ date: todayKey, steps: todaySteps,
            blood_pressure_systolic: 0, blood_pressure_diastolic: 0,
            blood_sugar: 0, heart_rate: 0, weight: 0, sleep_hours: 0 });
        }
      }

      setRecords(sorted);
      const today = sorted.find((r: any) => r.date === todayKey);
      setTodayRecord(today || null);
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const loadHealthNative = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const { readHealthData } = await import('../utils/healthNative');
      const data = await readHealthData();
      setHealthConnected(data.connected);
      if (data.heartRate) setHeartRate(data.heartRate);
      if (data.heartRateMin) setHeartRateMin(data.heartRateMin);
      if (data.heartRateMax) setHeartRateMax(data.heartRateMax);
      if (data.sleepHours) setSleepHoursAuto(data.sleepHours);
      if (data.spo2) setSpo2(data.spo2);
      // HRV는 화면 미표시 — 백엔드 전송 (추후 AI 컨텍스트 반영)
      if (data.hrv && userId) {
        fetch(`${API}/health/hrv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, hrv: data.hrv, date: todayKey }),
        }).catch(() => {});
      }
    } catch (e: any) { if (__DEV__) console.warn('[healthNative]', e); }
  }, [userId, todayKey]);

  const handleConnectHealth = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { requestHealthPermissions } = await import('../utils/healthNative');
      const granted = await requestHealthPermissions();
      if (granted) await loadHealthNative();
    } catch (e: any) { if (__DEV__) console.warn('[healthConnect]', e); }
  };

  useEffect(() => { loadHealthNative(); }, []);

  const saveStepsToRecord = useCallback(async (steps: number) => {
    if (!userId || steps <= 0) return;
    try {
      const raw = await AsyncStorage.getItem(`health_records.${userId}`);
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((r: any) => r.date === todayKey);
      if (idx >= 0) {
        list[idx] = { ...list[idx], steps };
      } else {
        list.push({ date: todayKey, steps,
          blood_pressure_systolic: 0, blood_pressure_diastolic: 0,
          blood_sugar: 0, heart_rate: 0, weight: 0, sleep_hours: 0 });
      }
      await AsyncStorage.setItem(`health_records.${userId}`, JSON.stringify(list));
      loadRecords();
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  }, [userId, todayKey]);

  // liveSteps 변경 시 3초 후 자동 저장
  useEffect(() => {
    if (!liveSteps || liveSteps <= 0) return;
    if (stepsSaveTimer.current) clearTimeout(stepsSaveTimer.current);
    stepsSaveTimer.current = setTimeout(() => saveStepsToRecord(liveSteps), 3000);
    return () => { if (stepsSaveTimer.current) clearTimeout(stepsSaveTimer.current); };
  }, [liveSteps]);

  const handleSaveMeasurement = async () => {
    if (modalType === 'bp') {
      const sys = Number(bpSys);
      const dia = Number(bpDia);
      if (!bpSys || !bpDia || isNaN(sys) || isNaN(dia)) {
        Alert.alert('', '수축기와 이완기를 모두 입력해주세요');
        return;
      }
      if (sys < 60 || sys > 250 || dia < 40 || dia > 150) {
        Alert.alert('', '혈압 범위를 확인해주세요\n수축기 60~250, 이완기 40~150');
        return;
      }
    } else if (modalType === 'steps') {
      const v = Number(inputValue);
      if (!inputValue.trim() || isNaN(v) || v < 0) {
        Alert.alert('', '걸음수를 입력해주세요');
        return;
      }
    } else if (!inputValue.trim()) {
      Alert.alert('', '값을 입력해주세요');
      return;
    }

    try {
      let updated: HealthRecord;

      if (todayRecord) {
        updated = { ...todayRecord };
      } else {
        updated = {
          date: todayKey,
          blood_pressure_systolic: 0,
          blood_pressure_diastolic: 0,
          blood_sugar: 0,
          heart_rate: 0,
          weight: 0,
          steps: 0,
          sleep_hours: 0,
        };
      }

      if (modalType === 'bp') {
        updated.blood_pressure_systolic = Number(bpSys);
        updated.blood_pressure_diastolic = Number(bpDia);
      } else if (modalType === 'sg') {
        updated.blood_sugar = Number(inputValue);
      } else if (modalType === 'sl') {
        updated.sleep_hours = Number(inputValue);
      } else if (modalType === 'temp') {
        (updated as any).temperature = Number(inputValue);
      } else if (modalType === 'steps') {
        updated.steps = Number(inputValue);
        // liveSteps는 건드리지 않음 — 만보기가 항상 실제값으로 덮어씀
      }

      const raw = await AsyncStorage.getItem(`health_records.${userId}`);
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((r: any) => r.date === todayKey);

      if (idx >= 0) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }

      await AsyncStorage.setItem(`health_records.${userId}`, JSON.stringify(list));
      await fetch(`${API}/health/records/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});

      setTodayRecord(updated);
      setModalType(null);
      setInputValue('');
      setBpSys('');
      setBpDia('');
      Alert.alert('', '저장되었습니다');
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다');
    }
  };

  const hasWarning = todayRecord ?
    [
      bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic),
      glucoseStatus(todayRecord.blood_sugar),
      stepsStatus(todayRecord.steps),
      sleepStatus(todayRecord.sleep_hours),
    ].some(s => s !== 'normal') : false;


  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>건강 기록</Text>
        </View>

        {/* Lumi Greeting */}
        <View style={s.lumiGreeting}>
          <Lumi mood={hasWarning ? 'worried' : 'content'} size={90} bob />
          <View>
            <View style={s.statusBadge}>
              <Text style={s.statusBadgeText}>{hasWarning ? '주의' : '좋음'}</Text>
            </View>
            <Text style={s.greetingText}>{name}님, 오늘도{'\n'}잘 챙기고 계세요 💜</Text>
          </View>
        </View>

        {/* AI Weekly Report */}
        <TouchableOpacity
          style={s.reportCard}
          onPress={() => navigation.navigate('WeeklyReport', { userId, name })}
        >
          <LinearGradient colors={['#E8F1FC', '#D6E7F8']} style={s.reportGradient}>
            <View style={s.reportContent}>
              <Text style={s.reportIcon}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.reportTitle}>AI 주간 리포트</Text>
                <Text style={s.reportDesc}>이번 주 분석 준비됐어요</Text>
              </View>
              <Text style={s.reportChevron}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── 그룹 1: 📱 자동으로 기록돼요 ── */}
        <View style={s.groupHeader}>
          <Text style={s.groupHeaderEmoji}>📱</Text>
          <Text style={s.groupHeaderTitle}>자동으로 기록돼요</Text>
        </View>

        {/* 걸음수 카드 (Pedometer 작동) */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: GREEN_BG }]}>
              <Text style={s.metricIcon}>🚶</Text>
            </View>
            <View style={s.metricContent}>
              <View style={s.stepsLabelRow}>
                <Text style={s.metricLabel}>걸음수</Text>
                <View style={s.autoBadge}>
                  <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                </View>
              </View>
              {(() => {
                const displaySteps = liveSteps ?? todayRecord?.steps ?? null;
                if (displaySteps != null && displaySteps > 0) {
                  const st = stepsStatus(displaySteps);
                  return (
                    <>
                      <Text style={s.metricValue}>
                        {displaySteps.toLocaleString()}
                        <Text style={s.metricUnit}> 보</Text>
                      </Text>
                      <View style={s.stepsProgress}>
                        <View style={[s.progressBar, { width: `${Math.min(displaySteps / 8000 * 100, 100)}%` as any }]} />
                      </View>
                      <Text style={s.progressText}>목표까지 {Math.max(0, 8000 - displaySteps).toLocaleString()}보 남았어요</Text>
                      <Text style={s.lumiHint}>
                        {st === 'normal' ? '오늘 목표 달성! 대단해요 🎉' :
                         st === 'caution' ? '조금만 더 걸으면 목표예요!' :
                         '오늘 걸음을 늘려보세요. 응원해요 💙'}
                      </Text>
                    </>
                  );
                }
                return <Text style={s.emptyValue}>👟 걸을 때마다 자동으로 세고 있어요</Text>;
              })()}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => {
            setInputValue(liveSteps != null ? String(liveSteps) : '');
            setModalType('steps');
          }}>
            <Text style={s.measureBtnText}>수동 입력</Text>
          </TouchableOpacity>
        </View>

        {healthConnected ? (
          <>
            {/* 연결 상태 바 */}
            <View style={s.connectedBar}>
              <Text style={s.connectedBarText}>
                🟢 {Platform.OS === 'ios' ? '애플 건강' : '삼성 헬스'}과 연결됨 · 자동 기록 중
              </Text>
            </View>

            {/* 심박수 카드 */}
            {heartRate != null && (
              <View style={s.metricCard}>
                <View style={s.metricTopRow}>
                  <View style={[s.metricIconBox, { backgroundColor: '#FFE4E4' }]}>
                    <Text style={s.metricIcon}>💓</Text>
                  </View>
                  <View style={s.metricContent}>
                    <View style={s.stepsLabelRow}>
                      <Text style={s.metricLabel}>심박수</Text>
                      <View style={s.autoBadge}>
                        <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                      </View>
                    </View>
                    <Text style={s.metricValue}>
                      {heartRate}<Text style={s.metricUnit}> bpm</Text>
                    </Text>
                    {heartRateMin != null && heartRateMax != null && (
                      <Text style={s.metricSubValue}>
                        오늘 최저 {heartRateMin} / 최고 {heartRateMax} bpm
                      </Text>
                    )}
                    <Text style={s.lumiHint}>
                      {heartRate >= 60 && heartRate <= 100
                        ? '심박수가 정상이에요. 심장이 건강해요 💙'
                        : heartRate > 100
                        ? '심박수가 높아요. 잠시 쉬어보세요'
                        : '심박수가 낮아요. 이상하면 병원에 가보세요'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 수면 카드 */}
            {sleepHoursAuto != null && (
              <View style={s.metricCard}>
                <View style={s.metricTopRow}>
                  <View style={[s.metricIconBox, { backgroundColor: '#EAE4F6' }]}>
                    <Text style={s.metricIcon}>😴</Text>
                  </View>
                  <View style={s.metricContent}>
                    <View style={s.stepsLabelRow}>
                      <Text style={s.metricLabel}>수면</Text>
                      <View style={s.autoBadge}>
                        <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                      </View>
                    </View>
                    <Text style={s.metricValue}>
                      {sleepHoursAuto}<Text style={s.metricUnit}> 시간</Text>
                    </Text>
                    <View style={s.statusRow}>
                      <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[sleepStatus(sleepHoursAuto)].bg }]}>
                        <Text style={[s.statusBadgeSmallText, { color: STATUS[sleepStatus(sleepHoursAuto)].fg }]}>
                          {STATUS[sleepStatus(sleepHoursAuto)].label}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.lumiHint}>
                      {sleepStatus(sleepHoursAuto) === 'normal'
                        ? '충분히 주무셨어요. 오늘도 활기차게! 🌟'
                        : sleepStatus(sleepHoursAuto) === 'caution'
                        ? '조금 더 주무시면 좋겠어요'
                        : '수면이 부족해요. 오늘 일찍 주무세요'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* SpO2 산소포화도 카드 */}
            {spo2 != null && (
              <View style={s.metricCard}>
                <View style={s.metricTopRow}>
                  <View style={[s.metricIconBox, { backgroundColor: '#E4F0FF' }]}>
                    <Text style={s.metricIcon}>🫁</Text>
                  </View>
                  <View style={s.metricContent}>
                    <View style={s.stepsLabelRow}>
                      <Text style={s.metricLabel}>산소포화도</Text>
                      <View style={s.autoBadge}>
                        <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                      </View>
                    </View>
                    {/* 게이지 */}
                    <View style={s.spo2GaugeRow}>
                      <Text style={s.metricValue}>
                        {spo2}<Text style={s.metricUnit}> %</Text>
                      </Text>
                      <View style={s.spo2GaugeBar}>
                        <View style={[s.spo2GaugeFill, {
                          width: `${Math.min(Math.max((spo2 - 90) / 10 * 100, 0), 100)}%` as any,
                          backgroundColor: spo2 >= 95 ? GREEN : spo2 >= 90 ? ORANGE : RED,
                        }]} />
                      </View>
                    </View>
                    <View style={s.statusRow}>
                      <View style={[s.statusBadgeSmall, {
                        backgroundColor: spo2 >= 95 ? GREEN_BG : spo2 >= 90 ? ORANGE_BG : RED_BG,
                      }]}>
                        <Text style={[s.statusBadgeSmallText, {
                          color: spo2 >= 95 ? GREEN_DK : spo2 >= 90 ? WARN : RED,
                        }]}>
                          {spo2 >= 95 ? '정상' : spo2 >= 90 ? '주의' : '위험'}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.lumiHint}>
                      {spo2 >= 95
                        ? '산소 수치 안정적이에요. 호흡이 편안해요 😊'
                        : spo2 >= 90
                        ? '산소 수치가 약간 낮아요. 환기를 시켜보세요'
                        : '산소 수치가 낮아요. 병원에 가보세요'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          /* 연결 안 됨 안내 */
          <View style={s.autoNotConnected}>
            <View style={s.autoNotConnectedIcons}>
              <Text style={s.autoIcon}>💓 심박수</Text>
              <Text style={s.autoIcon}>😴 수면</Text>
              <Text style={s.autoIcon}>🫁 산소</Text>
            </View>
            <Text style={s.autoNotConnectedTitle}>폰을 연결하면 저절로 쌓여요</Text>
            <Text style={s.autoNotConnectedDesc}>연결 안 해도 아래에서 직접 기록 가능해요</Text>
            <TouchableOpacity style={s.connectBtn} activeOpacity={0.8} onPress={handleConnectHealth}>
              <Text style={s.connectBtnTxt}>폰 건강 연결하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 그룹 2: ✍️ 직접 재서 기록해요 ── */}
        <View style={[s.groupHeader, { marginTop: 8 }]}>
          <Text style={s.groupHeaderEmoji}>✍️</Text>
          <Text style={s.groupHeaderTitle}>직접 재서 기록해요</Text>
        </View>

        {/* 혈압 */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: ORANGE_BG }]}>
              <Text style={s.metricIcon}>❤️</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>혈압</Text>
              {todayRecord?.blood_pressure_systolic ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.blood_pressure_systolic} / {todayRecord.blood_pressure_diastolic}
                    <Text style={s.metricUnit}> mmHg</Text>
                  </Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)].bg }]}>
                      <Text style={[s.statusBadgeSmallText, { color: STATUS[bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)].fg }]}>
                        {STATUS[bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)].label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.lumiHint}>{lumiInterpretBp(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)}</Text>
                </>
              ) : (
                <Text style={s.emptyValue}>측정 안 함</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('bp')}>
            <Text style={s.measureBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>

        {/* 혈당 */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: RED_BG }]}>
              <Text style={s.metricIcon}>🩸</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>혈당</Text>
              {todayRecord?.blood_sugar ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.blood_sugar}
                    <Text style={s.metricUnit}> mg/dL</Text>
                  </Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[glucoseStatus(todayRecord.blood_sugar)].bg }]}>
                      <Text style={[s.statusBadgeSmallText, { color: STATUS[glucoseStatus(todayRecord.blood_sugar)].fg }]}>
                        {STATUS[glucoseStatus(todayRecord.blood_sugar)].label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.lumiHint}>{lumiInterpretSg(todayRecord.blood_sugar)}</Text>
                </>
              ) : (
                <Text style={s.emptyValue}>측정 안 함</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('sg')}>
            <Text style={s.measureBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>

        {/* 체온 */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: WARN_BG }]}>
              <Text style={s.metricIcon}>🌡️</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>체온</Text>
              {todayRecord?.temperature ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.temperature.toFixed(1)}
                    <Text style={s.metricUnit}> °C</Text>
                  </Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[tempStatus(todayRecord.temperature)].bg }]}>
                      <Text style={[s.statusBadgeSmallText, { color: STATUS[tempStatus(todayRecord.temperature)].fg }]}>
                        {STATUS[tempStatus(todayRecord.temperature)].label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.lumiHint}>{lumiInterpretTemp(todayRecord.temperature)}</Text>
                </>
              ) : (
                <Text style={s.emptyValue}>측정 안 함</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('temp')}>
            <Text style={s.measureBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Records */}
        <Text style={s.recentTitle}>최근 기록</Text>
        <View style={s.recordsTable}>
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, { flex: 1 }]}>날짜</Text>
            <Text style={[s.tableCell, { flex: 1.2 }]}>혈압</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>혈당</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>걸음</Text>
            <Text style={[s.tableCell, { flex: 0.8 }]}>수면</Text>
          </View>
          {records.slice(0, 4).map((r) => (
            <View key={r.date} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 1, fontWeight: '600' }]}>
                {r.date.slice(5).replace('-', '/')}
              </Text>
              <Text style={[s.tableCell, { flex: 1.2 }]}>
                {r.blood_pressure_systolic ? `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}` : '—'}
              </Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{r.blood_sugar || '—'}</Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{r.steps || '—'}</Text>
              <Text style={[s.tableCell, { flex: 0.8 }]}>{r.sleep_hours || '—'}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity>
          <Text style={s.moreLink}>전체 기록 보기 →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Input Modal */}
      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {modalType === 'bp' ? '혈압 측정값' :
               modalType === 'sg' ? '혈당 측정값' :
               modalType === 'temp' ? '체온 측정값' :
               modalType === 'steps' ? '오늘 걸음수 수정' : '수면 시간'}
            </Text>

            {modalType === 'bp' ? (
              <>
                <Text style={s.modalHint}>수축기(위)와 이완기(아래)를 따로 입력해주세요</Text>
                <View style={s.bpRow}>
                  <View style={s.bpField}>
                    <Text style={s.bpFieldLabel}>수축기</Text>
                    <TextInput
                      style={s.bpInput}
                      placeholder="120"
                      keyboardType="numeric"
                      maxLength={3}
                      value={bpSys}
                      onChangeText={setBpSys}
                      autoFocus
                    />
                    <Text style={s.bpFieldUnit}>mmHg</Text>
                  </View>
                  <Text style={s.bpSlash}>/</Text>
                  <View style={s.bpField}>
                    <Text style={s.bpFieldLabel}>이완기</Text>
                    <TextInput
                      style={s.bpInput}
                      placeholder="80"
                      keyboardType="numeric"
                      maxLength={3}
                      value={bpDia}
                      onChangeText={setBpDia}
                    />
                    <Text style={s.bpFieldUnit}>mmHg</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={s.modalHint}>
                  {modalType === 'sg' ? '혈당 수치 (예: 120)' :
                   modalType === 'temp' ? '체온 (예: 36.5)' :
                   modalType === 'steps' ? '걸음수 (예: 6500)' : '수면 시간 (예: 7.5)'}
                </Text>
                <TextInput
                  style={s.modalInput}
                  placeholder={modalType === 'sg' ? '120' : modalType === 'temp' ? '36.5' : modalType === 'steps' ? '6500' : '7.5'}
                  keyboardType={modalType === 'steps' ? 'number-pad' : 'decimal-pad'}

                  value={inputValue}
                  onChangeText={setInputValue}
                  autoFocus
                />
              </>
            )}

            <View style={s.modalButtons}>
              <TouchableOpacity style={s.btnCancel} onPress={() => {
                setModalType(null); setInputValue(''); setBpSys(''); setBpDia('');
              }}>
                <Text style={s.btnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSaveMeasurement}>
                <Text style={s.btnSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SeniorTabBar navigation={navigation} activeTab="health" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: INK,
  },

  lumiGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 24,
    gap: 12,
  },
  lumiImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    resizeMode: 'contain',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: GREEN_BG,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN_DK,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    lineHeight: 30,
  },

  reportCard: {
    marginHorizontal: 18,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reportGradient: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  reportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIcon: {
    fontSize: 28,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BLUE,
    marginBottom: 2,
  },
  reportDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: INK_SOFT,
  },
  reportChevron: {
    fontSize: 18,
    color: BLUE,
  },

  metricCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 14,
    shadowColor: '#1C3C6E',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricIconBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricIcon: {
    fontSize: 32,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: INK_MUTE,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '900',
    color: INK,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: INK_SOFT,
  },
  emptyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: INK_MUTE,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTime: {
    fontSize: 11,
    fontWeight: '600',
    color: INK_MUTE,
  },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 18, marginBottom: 12, marginTop: 4,
  },
  groupHeaderEmoji: { fontSize: 22 },
  groupHeaderTitle: { fontSize: 20, fontWeight: '900', color: INK },

  lumiHint: {
    fontSize: 14, fontWeight: '600', color: INK_SOFT,
    marginTop: 6, lineHeight: 20,
  },

  autoNotConnected: {
    marginHorizontal: 18, marginBottom: 12, padding: 20,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: 'rgba(15,27,45,0.06)',
    alignItems: 'center',
    shadowColor: '#1C3C6E', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  autoNotConnectedIcons: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  autoIcon: { fontSize: 16, fontWeight: '700', color: INK_SOFT },
  autoNotConnectedTitle: { fontSize: 18, fontWeight: '800', color: INK, marginBottom: 6 },
  autoNotConnectedDesc:  { fontSize: 14, fontWeight: '600', color: INK_MUTE, marginBottom: 14, textAlign: 'center' },
  connectBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99,
    backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: BLUE,
  },
  connectBtnTxt: { fontSize: 14, fontWeight: '800', color: BLUE },

  connectedBar: {
    marginHorizontal: 18, marginBottom: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: '#E6F4E2',
  },
  connectedBarText: { fontSize: 13, fontWeight: '700', color: GREEN_DK },
  metricSubValue: { fontSize: 13, fontWeight: '600', color: INK_MUTE, marginTop: 2, marginBottom: 4 },
  spo2GaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  spo2GaugeBar: {
    flex: 1, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(15,27,45,0.08)', overflow: 'hidden',
  },
  spo2GaugeFill: { height: '100%', borderRadius: 5 },

  stepsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  autoBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: '#E6F4E2',
  },
  autoBadgeText: { fontSize: 11, fontWeight: '700', color: '#1F7A3A' },

  bpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, width: '100%' },
  bpField: { flex: 1, alignItems: 'center' },
  bpFieldLabel: { fontSize: 14, fontWeight: '700', color: INK_SOFT, marginBottom: 6 },
  bpInput: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db',
    fontSize: 26, fontWeight: '800', color: INK, textAlign: 'center',
  },
  bpFieldUnit: { fontSize: 12, fontWeight: '600', color: INK_MUTE, marginTop: 4 },
  bpSlash: { fontSize: 32, fontWeight: '300', color: INK_MUTE, marginTop: 8 },

  stepsProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: BLUE,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: INK_SOFT,
  },

  measureBtn: {
    width: '100%',
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },

  recentTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    marginHorizontal: 18,
    marginTop: 24,
    marginBottom: 12,
  },

  recordsTable: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 12,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
  },

  moreLink: {
    marginHorizontal: 18,
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    fontWeight: '600',
    color: INK_SOFT,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: INK_SOFT,
  },
  btnSave: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});
