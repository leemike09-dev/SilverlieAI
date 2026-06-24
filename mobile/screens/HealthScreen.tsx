import React, { useState, useEffect, useRef, useCallback } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Modal, TextInput, FlatList, Platform, AppState,
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
const PURPLE = '#7C5BE3';

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

// ─── 맥락 기반 오늘의 건강 평가 ────────────────────────────────
interface CtxEvalInput {
  todayRecord:   HealthRecord | null;
  liveSteps:     number | null;
  heartRate:     number | null;
  sleepHoursAuto:number | null;
  records:       HealthRecord[];
  profile:       any;
  medications:   any[];
  now:           Date;
}
interface CtxEvalResult {
  mood:    'happy' | 'content' | 'worried';
  badge:   string;
  badgeBg: string;
  badgeFg: string;
  text:    string;
}

function buildContextEval({
  todayRecord, liveSteps, heartRate, sleepHoursAuto,
  records, profile, medications, now,
}: CtxEvalInput): CtxEvalResult {
  const hour      = now.getHours();
  const isMorning = hour < 12;
  const isEvening = hour >= 17;

  // 복약 중 질환 감지
  const medNames   = medications.map((m: any) => (m.name || '') + ' ' + (m.type || ''));
  const isOnBpMed  = medNames.some(n => /혈압/.test(n));
  const isOnDmMed  = medNames.some(n => /당뇨|혈당|인슐린/.test(n));

  // 과거 병력 (HealthProfileScreen에서 저장한 PastEvent[])
  const past: any[]  = profile?.pastHistory || [];
  const hasCancer    = past.some((e: any) => e.category === 'cancer');
  const hasStroke    = past.some((e: any) => e.category === 'stroke');
  const hasFracture  = past.some((e: any) => e.category === 'fracture');

  const stepGoal = profile?.goals?.steps ?? 8000;

  // 7일 추세
  const recentBp  = records.slice(0, 7).filter(r => r.blood_pressure_systolic > 0);
  const avgBpSys  = recentBp.length >= 3
    ? recentBp.reduce((s, r) => s + r.blood_pressure_systolic, 0) / recentBp.length : null;
  const recentSlp = records.slice(1, 8).filter(r => r.sleep_hours > 0);
  const avgSleep  = recentSlp.length >= 2
    ? recentSlp.reduce((s, r) => s + r.sleep_hours, 0) / recentSlp.length : null;

  // CASE 08: 암 병력 + 활동량 하락 추세
  let decliningActivity = false;
  if (hasCancer && records.length >= 6) {
    const r3 = records.slice(0, 3).map(r => r.steps).filter(s => s > 0);
    const o3 = records.slice(3, 7).map(r => r.steps).filter(s => s > 0);
    if (r3.length >= 2 && o3.length >= 2) {
      const rAvg = r3.reduce((s, v) => s + v, 0) / r3.length;
      const oAvg = o3.reduce((s, v) => s + v, 0) / o3.length;
      if (rAvg < oAvg * 0.65) decliningActivity = true;
    }
  }

  const parts: string[] = [];
  let mood: 'happy' | 'content' | 'worried' = 'happy';
  let issueCount = 0;

  // ─ 걸음수 (CASE 01, 02) ─
  if (liveSteps != null) {
    if (isMorning) {
      // CASE 01: 아침 → 목표 안내, 비교 금지
      parts.push(`오늘 걸음 목표는 ${stepGoal.toLocaleString()}보예요. 천천히 시작해 볼까요?`);
    } else if (liveSteps >= stepGoal) {
      parts.push(`오늘 ${liveSteps.toLocaleString()}보를 걸으셨어요! 목표를 달성하셨네요 🎉`);
      mood = 'content';
    } else if (isEvening) {
      // CASE 02: 저녁 + 부족 → 내일로 연결
      parts.push(hasFracture
        ? `오늘 ${liveSteps.toLocaleString()}보 걸으셨어요. 관절 생각해서 무리 안 하신 것도 잘하신 거예요. 내일 날 좋을 때 한 바퀴 어떠세요?`
        : `오늘 ${liveSteps.toLocaleString()}보 걸으셨어요. 내일 산책 한 번 어떠세요?`);
    }
  }

  // ─ 혈압 (CASE 03, 04, 뇌졸중 분기) ─
  if (todayRecord?.blood_pressure_systolic && issueCount < 2) {
    const st    = bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic);
    const bpStr = `${todayRecord.blood_pressure_systolic}/${todayRecord.blood_pressure_diastolic}`;
    const trendBad = avgBpSys != null && avgBpSys > 135;

    if (st === 'normal') {
      if (parts.length === 0) { parts.push('혈압이 정상이에요. 안심하세요 😊'); mood = 'content'; }
    } else if (isOnBpMed) {
      // CASE 03: 이미 진료 중 → 복약 확인, "병원 가세요" 금지
      parts.push(`오늘 혈압이 평소보다 조금 높네요 (${bpStr}). 혈압약은 잊지 않고 드셨어요? 며칠 이어지면 다음 진료 때 이 기록을 보여드리면 도움이 돼요.`);
      if (trendBad) mood = 'worried';
      issueCount++;
    } else if (hasStroke && st === 'danger') {
      // 뇌졸중 이력 + 위험 혈압 → 민감도↑
      parts.push(`오늘 혈압이 꽤 높게 나왔어요 (${bpStr}). 뇌졸중 겪으셨던 만큼 조심하는 게 좋아요. 편히 쉬시고, 며칠 이어지면 바로 알려드릴게요.`);
      mood = 'worried'; issueCount++;
    } else if (st === 'danger') {
      // CASE 04: 진료 기록 없음 → 부드러운 안내
      parts.push(`오늘 혈압이 높게 나왔어요 (${bpStr}). 한 번 더 재보시고, 며칠 이어지면 병원에서 한 번 봐드리는 게 좋아요.`);
      if (trendBad) mood = 'worried';
      issueCount++;
    } else {
      parts.push('혈압이 조금 높네요. 오늘은 편히 쉬세요.'); issueCount++;
    }
  }

  // ─ 혈당 (CASE 09) ─
  if (todayRecord?.blood_sugar && issueCount < 2) {
    const st = glucoseStatus(todayRecord.blood_sugar);
    if (st !== 'normal') {
      if (isOnDmMed) {
        // CASE 09: 당뇨약 복용 중 → 식후 여부 감안, 겁 주지 않기
        parts.push(`혈당이 좀 높게 나왔어요 (${todayRecord.blood_sugar}). 약 챙겨 드셨으면 너무 걱정 마세요. 식사 후라면 자연스러운 거예요.`);
      } else if (st === 'danger') {
        parts.push(`혈당이 높게 나왔어요 (${todayRecord.blood_sugar}). 식사 전후를 구분해서 재보시고, 며칠 이어지면 확인해 보세요.`);
        issueCount++;
      }
    }
  }

  // ─ 수면 (CASE 05) ─
  if (sleepHoursAuto != null && sleepHoursAuto < 7 && issueCount < 2) {
    if (avgSleep != null && sleepHoursAuto < avgSleep - 0.5) {
      // CASE 05: 인구 기준이 아닌 개인 평균 비교
      parts.push(`어젯밤은 ${sleepHoursAuto}시간 주무셨어요. 평소(${avgSleep.toFixed(1)}시간)보단 조금 짧았어요. 낮엔 무리하지 마시고, 졸리면 잠깐 쉬어가세요.`);
      issueCount++;
    } else if (sleepHoursAuto < 5) {
      parts.push(`어젯밤 수면이 ${sleepHoursAuto}시간으로 많이 부족했어요. 오늘은 좀 더 쉬어가세요.`);
      issueCount++;
    }
  }

  // ─ CASE 08: 암 병력 + 활동 하락 ─
  if (decliningActivity) {
    parts.push(`요 며칠 활동이 좀 줄어든 것 같아 같이 살펴보고 싶어요. 무리하지 마시고, 다음 진료 때 이 기록을 보여드리면 좋아요.`);
    mood = 'worried';
  }

  // ─ CASE 07: 데이터 없음 / CASE 06: 전부 정상 ─
  if (parts.length === 0) {
    const anyData = !!todayRecord || liveSteps != null || heartRate != null || sleepHoursAuto != null;
    if (!anyData) {
      parts.push('아직 오늘 기록이 없어요. 기기를 연결하거나 직접 입력하면 루미가 함께 살펴볼게요 💜');
    } else {
      // CASE 06: 전 지표 정상 → 짧고 따뜻하게
      parts.push('오늘 컨디션 좋아 보여요 💜 어제처럼만 지내시면 충분해요.');
      mood = 'content';
    }
  }

  const badge   = mood === 'worried' ? '⚠️ 살펴봐요' : mood === 'content' ? '✅ 양호해요' : '💜 함께 살펴요';
  const badgeBg = mood === 'worried' ? RED_BG : mood === 'content' ? GREEN_BG : '#F0E9FF';
  const badgeFg = mood === 'worried' ? RED    : mood === 'content' ? GREEN_DK : PURPLE;
  return { mood, badge, badgeBg, badgeFg, text: parts.join('\n\n') };
}
interface HealthRecord {
  date: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  blood_sugar: number;
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
  const [showAllRecords, setShowAllRecords] = useState(false);
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
  const [sleepStages, setSleepStages] = useState<import('../utils/healthNative').SleepStages | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [hcBp, setHcBp] = useState<{ systolic: number; diastolic: number } | null>(null);
  const manualBpRef = useRef(false); // ref: closure 안에서도 항상 최신값

  // 요약 타일 → 카드 스크롤 이동용 Y 오프셋
  const scrollViewRef = useRef<ScrollView>(null);
  const cardYRef = useRef<{steps:number; hr:number; sleep:number; spo2:number}>({
    steps: 0, hr: 0, sleep: 0, spo2: 0,
  });

  // 맥락 기반 평가용 — 프로필 + 복약
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [medications,   setMedications]   = useState<any[]>([]);

  const todayKey = localDate();

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [profRaw, medsRaw] = await Promise.all([
          AsyncStorage.getItem('health_profile'),
          AsyncStorage.getItem(`medications.${userId}`),
        ]);
        if (profRaw) setHealthProfile(JSON.parse(profRaw));
        if (medsRaw) setMedications(JSON.parse(medsRaw));
      } catch {}
    })();
  }, [userId]);

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
      // 저장된 연결 상태 먼저 복원
      const savedConnected = await AsyncStorage.getItem(`health_connected.${userId}`);
      if (savedConnected === '1') setHealthConnected(true);

      const { readHealthData } = await import('../utils/healthNative');
      const data = await readHealthData();
      setHealthConnected(data.connected);
      // 연결됐으면 AsyncStorage에 저장 (재시작해도 유지)
      if (data.connected) await AsyncStorage.setItem(`health_connected.${userId}`, '1');
      if (data.heartRate) {
        setHeartRate(data.heartRate);
        // HC 심박수를 health_records에 저장 → 주간 리포트 반영
        const hrRaw = await AsyncStorage.getItem(`health_records.${userId}`);
        const hrList = hrRaw ? JSON.parse(hrRaw) : [];
        const hrIdx = hrList.findIndex((r: any) => r.date === todayKey);
        if (hrIdx >= 0) {
          hrList[hrIdx] = { ...hrList[hrIdx], heart_rate: data.heartRate };
        } else {
          hrList.push({ date: todayKey, blood_pressure_systolic: 0, blood_pressure_diastolic: 0,
            blood_sugar: 0, heart_rate: data.heartRate, weight: 0, steps: 0, sleep_hours: 0 });
        }
        await AsyncStorage.setItem(`health_records.${userId}`, JSON.stringify(hrList));
        loadRecords();
      }
      if (data.heartRateMin) setHeartRateMin(data.heartRateMin);
      if (data.heartRateMax) setHeartRateMax(data.heartRateMax);
      if (data.sleepHours) {
        setSleepHoursAuto(data.sleepHours);
        // HC 수면 데이터를 health_records에도 저장 → 최근 기록 테이블에 표시
        const raw = await AsyncStorage.getItem(`health_records.${userId}`);
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((r: any) => r.date === todayKey);
        if (idx >= 0) {
          list[idx] = { ...list[idx], sleep_hours: data.sleepHours };
        } else {
          list.push({ date: todayKey, blood_pressure_systolic: 0, blood_pressure_diastolic: 0,
            blood_sugar: 0, heart_rate: 0, weight: 0, steps: 0, sleep_hours: data.sleepHours });
        }
        await AsyncStorage.setItem(`health_records.${userId}`, JSON.stringify(list));
        loadRecords();
      }
      if (data.steps) {
        // HC steps: healthNative에서 Samsung Health 패키지 필터링 적용 → 중복 제거됨
        // steps_today_android_date 함께 저장 → App.tsx 베이스라인이 HC 씨앗값으로 사용
        const todayStr = new Date().toDateString();
        setLiveSteps(data.steps);
        await AsyncStorage.setItem('steps_today_android', String(data.steps));
        await AsyncStorage.setItem('steps_today_android_date', todayStr);
      }
      if (data.sleepStages) setSleepStages(data.sleepStages);
      if (data.spo2) setSpo2(data.spo2);
      if (data.bloodPressure && !manualBpRef.current) {
        setHcBp(data.bloodPressure);
        // HC 혈압을 health_records에 저장 (수동 입력 후에는 덮지 않음)
        const bpRaw = await AsyncStorage.getItem(`health_records.${userId}`);
        const bpList = bpRaw ? JSON.parse(bpRaw) : [];
        const bpIdx = bpList.findIndex((r: any) => r.date === todayKey);
        if (bpIdx >= 0) {
          bpList[bpIdx].blood_pressure_systolic  = data.bloodPressure.systolic;
          bpList[bpIdx].blood_pressure_diastolic = data.bloodPressure.diastolic;
          await AsyncStorage.setItem(`health_records.${userId}`, JSON.stringify(bpList));
          loadRecords();
        } else {
          bpList.push({ date: todayKey, blood_pressure_systolic: data.bloodPressure.systolic,
            blood_pressure_diastolic: data.bloodPressure.diastolic,
            blood_sugar: 0, heart_rate: 0, weight: 0, steps: 0, sleep_hours: 0 });
          await AsyncStorage.setItem(`health_records.${userId}`, JSON.stringify(bpList));
          loadRecords();
        }
      }
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
      await requestHealthPermissions();
      // HC 설정 화면을 열었으므로 사용자가 돌아올 때 AppState active로 자동 재확인
    } catch (e: any) {
      const { logError } = await import('../utils/errorLogger');
      await logError('handleConnectHealth', e);
    }
  };

  const showDiagnostic = async () => {
    const raw = await AsyncStorage.getItem('hc_diag');
    if (!raw) {
      Alert.alert('진단 없음', '연결 버튼을 먼저 눌러주세요');
      return;
    }
    const d = JSON.parse(raw);
    // 단계별 설명
    const stepLabel: Record<string, string> = {
      trying_intent_launcher:    'HC 권한 페이지 열기 시도 중',
      manage_permissions_opened: 'HC 권한 페이지 열림 (앱 미등록)',
      fallback_settings_opened:  'HC 일반 설정 열림 (앱 미등록 — 권한 없음)',
      before_requestPermission:  '권한 요청 직전 (앱 재시작으로 중단)',
    };
    const stepTxt = d.step ? (stepLabel[d.step] || d.step) : null;

    // 결과 판정
    let resultLine: string | null = null;
    if (d.step === 'manage_permissions_opened' || d.step === 'fallback_settings_opened') {
      resultLine = '⚠️ HC 열림 — 앱이 HC에 미등록 (권한 없음)';
    } else if (d.success && d.grantedCount > 0) {
      resultLine = `✅ 성공 — ${d.grantedCount}개 권한 승인`;
    } else if (d.failAt) {
      resultLine = null; // 아래 failAt 라인에서 표시
    }

    const lines = [
      `시간: ${(d.ts || '').slice(0, 19).replace('T', ' ')}`,
      `Android API: ${d.v ?? '?'}`,
      `HC SDK: ${d.sdkStatusLabel ?? `코드 ${d.sdkStatus}`}`,
      d.existingGrants ? `기존 권한: ${d.existingGrants}` : null,
      stepTxt ? `단계: ${stepTxt}` : null,
      resultLine,
      d.intentErr ? `Intent 오류: ${d.intentErr}` : null,
      d.failAt ? `❌ 실패: ${d.failAt}` : null,
      d.initErr ? `초기화 오류: ${d.initErr}` : null,
      d.sdkStatusErr ? `SDK 오류: ${d.sdkStatusErr}` : null,
      d.fatalErr ? `치명 오류: ${d.fatalErr}` : null,
    ].filter(Boolean).join('\n');
    const bpRaw = await AsyncStorage.getItem('hc_bp_debug');
    let bpLines = '';
    if (bpRaw) {
      const bp = JSON.parse(bpRaw);
      bpLines = `\n\n[혈압 HC]\n레코드 수: ${bp.count}\n기간: 7일\n${bp.sample ? `최근: ${JSON.stringify(bp.sample).slice(0, 150)}` : '레코드 없음'}`;
    }
    Alert.alert('Health Connect 진단', lines + bpLines, [
      { text: '닫기' },
      { text: '초기화', style: 'destructive', onPress: () => AsyncStorage.removeItem('hc_diag') },
    ]);
  };

  // Health Connect 설정에서 돌아올 때 데이터 재로드
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadHealthNative();
    });
    return () => sub.remove();
  }, [loadHealthNative]);

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
      } else if (modalType === 'steps') {
        updated.steps = Number(inputValue);
        setLiveSteps(Number(inputValue)); // display + 3초 타이머가 이 값으로 저장
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
      if (modalType === 'bp') { setHcBp(null); manualBpRef.current = true; }
      setModalType(null);
      setInputValue('');
      setBpSys('');
      setBpDia('');
      loadRecords();
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

  const ctxEval = buildContextEval({
    todayRecord, liveSteps, heartRate, sleepHoursAuto,
    records, profile: healthProfile, medications, now: new Date(),
  });


  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 120 }}>
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

        {/* ── 4지표 요약 타일 ── */}
        {(() => {
          const displaySteps = liveSteps || todayRecord?.steps || null;
          const tiles = [
            { key: 'steps', icon: '🚶', label: '걸음', value: displaySteps != null ? displaySteps.toLocaleString() : '—', unit: '보' },
            { key: 'hr',    icon: '💓', label: '심박', value: heartRate != null ? String(heartRate) : '—', unit: 'bpm' },
            { key: 'sleep', icon: '😴', label: '수면', value: sleepHoursAuto != null ? String(sleepHoursAuto) : '—', unit: 'h' },
            { key: 'spo2',  icon: '🫁', label: '산소', value: spo2 != null ? String(spo2) : '—', unit: '%' },
          ];
          return (
            <View style={s.summaryTileRow}>
              {tiles.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={s.summaryTile}
                  activeOpacity={0.75}
                  onPress={() => {
                    const y = cardYRef.current[t.key as keyof typeof cardYRef.current];
                    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
                  }}
                >
                  <Text style={s.summaryTileIcon}>{t.icon}</Text>
                  <Text style={s.summaryTileValue} numberOfLines={1}>
                    {t.value}
                    {t.value !== '—' && <Text style={s.summaryTileUnit}>{t.unit}</Text>}
                  </Text>
                  <Text style={s.summaryTileLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

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
        <View style={s.metricCard} onLayout={e => { cardYRef.current.steps = e.nativeEvent.layout.y; }}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: GREEN_BG }]}>
              <Text style={s.metricIcon}>🚶</Text>
            </View>
            <View style={s.metricContent}>
              <View style={s.stepsLabelRow}>
                <Text style={s.metricLabel}>걸음수</Text>
                <View style={s.sourceChip}><Text style={s.sourceChipText}>📱 폰</Text></View>
                <View style={s.autoBadge}>
                  <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                </View>
              </View>
              {(() => {
                const displaySteps = liveSteps || todayRecord?.steps || null;
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
              <View style={s.metricCard} onLayout={e => { cardYRef.current.hr = e.nativeEvent.layout.y; }}>
                <View style={s.metricTopRow}>
                  <View style={[s.metricIconBox, { backgroundColor: '#FFE4E4' }]}>
                    <Text style={s.metricIcon}>💓</Text>
                  </View>
                  <View style={s.metricContent}>
                    <View style={s.stepsLabelRow}>
                      <Text style={s.metricLabel}>심박수</Text>
                      <View style={s.sourceChip}><Text style={s.sourceChipText}>⌚ 워치</Text></View>
                      <View style={s.autoBadge}>
                        <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                      </View>
                    </View>
                    <Text style={s.metricValue}>
                      {heartRate}<Text style={s.metricUnit}> bpm</Text>
                    </Text>

                    {/* 심박 범위 막대 */}
                    {heartRateMin != null && heartRateMax != null && (() => {
                      const barMin = 40, barMax = 160;
                      const span = barMax - barMin;
                      const safeL = (60 - barMin) / span * 100;
                      const safeW = (100 - 60) / span * 100;
                      const minPct = Math.max(0, (heartRateMin - barMin) / span * 100);
                      const maxPct = Math.min(100, (heartRateMax - barMin) / span * 100);
                      const curPct = Math.min(100, Math.max(0, (heartRate - barMin) / span * 100));
                      return (
                        <View style={s.vizWrap}>
                          <View style={s.hrBarTrack}>
                            {/* 안정 구간 배경 */}
                            <View style={[s.hrSafeZone, { left: `${safeL}%` as any, width: `${safeW}%` as any }]} />
                            {/* 최저~최고 범위 */}
                            <View style={[s.hrRangeBar, { left: `${minPct}%` as any, width: `${maxPct - minPct}%` as any }]} />
                            {/* 현재값 마커 */}
                            <View style={[s.hrMarker, { left: `${curPct}%` as any }]} />
                          </View>
                          <View style={s.hrBarLabels}>
                            <Text style={s.hrBarLabel}>최저 {heartRateMin}</Text>
                            <Text style={s.hrBarLabelSafe}>안정 60–100</Text>
                            <Text style={s.hrBarLabel}>최고 {heartRateMax}</Text>
                          </View>
                        </View>
                      );
                    })()}

                    <Text style={s.lumiHint}>
                      {heartRate >= 60 && heartRate <= 100
                        ? '심박이 안정적이에요 💙'
                        : heartRate > 100
                        ? '심박이 다소 빠른 편이에요. 잠시 쉬어보세요'
                        : '심박이 낮은 편이에요. 따뜻하게 계세요'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 수면 카드 */}
            {sleepHoursAuto != null && (
              <View style={s.metricCard} onLayout={e => { cardYRef.current.sleep = e.nativeEvent.layout.y; }}>
                <View style={s.metricTopRow}>
                  <View style={[s.metricIconBox, { backgroundColor: '#EAE4F6' }]}>
                    <Text style={s.metricIcon}>😴</Text>
                  </View>
                  <View style={s.metricContent}>
                    <View style={s.stepsLabelRow}>
                      <Text style={s.metricLabel}>수면</Text>
                      <View style={s.sourceChip}><Text style={s.sourceChipText}>⌚ 워치</Text></View>
                      <View style={s.autoBadge}>
                        <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                      </View>
                    </View>
                    <Text style={s.metricValue}>
                      {sleepHoursAuto}<Text style={s.metricUnit}> 시간</Text>
                    </Text>

                    {/* 수면 단계 막대 — 단계 데이터 있을 때만 */}
                    {sleepStages != null && (() => {
                      const total = sleepStages.deep + sleepStages.light + sleepStages.rem + sleepStages.awake;
                      if (total === 0) return null;
                      const pct = (m: number) => `${Math.round(m / total * 100)}%` as any;
                      return (
                        <View style={s.vizWrap}>
                          <View style={s.sleepStageBar}>
                            {sleepStages.deep  > 0 && <View style={[s.sleepSeg, { flex: sleepStages.deep,  backgroundColor: '#1E3A5F' }]} />}
                            {sleepStages.light > 0 && <View style={[s.sleepSeg, { flex: sleepStages.light, backgroundColor: '#8B7EC8' }]} />}
                            {sleepStages.rem   > 0 && <View style={[s.sleepSeg, { flex: sleepStages.rem,   backgroundColor: '#B8A9E8' }]} />}
                            {sleepStages.awake > 0 && <View style={[s.sleepSeg, { flex: sleepStages.awake, backgroundColor: '#F5C842' }]} />}
                          </View>
                          <View style={s.sleepLegendRow}>
                            {sleepStages.deep  > 0 && <View style={s.sleepLegendItem}><View style={[s.sleepLegendDot, { backgroundColor: '#1E3A5F' }]} /><Text style={s.sleepLegendTxt}>깊은 {pct(sleepStages.deep)}</Text></View>}
                            {sleepStages.light > 0 && <View style={s.sleepLegendItem}><View style={[s.sleepLegendDot, { backgroundColor: '#8B7EC8' }]} /><Text style={s.sleepLegendTxt}>얕은 {pct(sleepStages.light)}</Text></View>}
                            {sleepStages.rem   > 0 && <View style={s.sleepLegendItem}><View style={[s.sleepLegendDot, { backgroundColor: '#B8A9E8' }]} /><Text style={s.sleepLegendTxt}>렘 {pct(sleepStages.rem)}</Text></View>}
                            {sleepStages.awake > 0 && <View style={s.sleepLegendItem}><View style={[s.sleepLegendDot, { backgroundColor: '#F5C842' }]} /><Text style={s.sleepLegendTxt}>깬 {pct(sleepStages.awake)}</Text></View>}
                          </View>
                        </View>
                      );
                    })()}

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
              <View style={s.metricCard} onLayout={e => { cardYRef.current.spo2 = e.nativeEvent.layout.y; }}>
                <View style={s.metricTopRow}>
                  <View style={[s.metricIconBox, { backgroundColor: '#E4F0FF' }]}>
                    <Text style={s.metricIcon}>🫁</Text>
                  </View>
                  <View style={s.metricContent}>
                    <View style={s.stepsLabelRow}>
                      <Text style={s.metricLabel}>산소포화도</Text>
                      <View style={s.sourceChip}><Text style={s.sourceChipText}>⌚ 워치</Text></View>
                      <View style={s.autoBadge}>
                        <Text style={s.autoBadgeText}>🟢 자동 측정 중</Text>
                      </View>
                    </View>
                    <Text style={[s.metricValue, spo2 < 90 && { color: RED }]}>
                      {spo2}<Text style={s.metricUnit}> %</Text>
                    </Text>

                    {/* SpO2 구역 막대 — 90~100 범위, 95% 이상 초록 구역 강조 */}
                    {(() => {
                      const barMin = 90, barMax = 100, span = barMax - barMin;
                      const safeL = (95 - barMin) / span * 100;
                      const safeW = (100 - 95) / span * 100;
                      const curPct = Math.min(100, Math.max(0, (spo2 - barMin) / span * 100));
                      const markerColor = spo2 >= 95 ? GREEN : spo2 >= 90 ? ORANGE : RED;
                      return (
                        <View style={s.vizWrap}>
                          <View style={s.hrBarTrack}>
                            {/* 95%↑ 초록 구역 */}
                            <View style={[s.spo2SafeZone, { left: `${safeL}%` as any, width: `${safeW}%` as any }]} />
                            {/* 현재값 마커 */}
                            <View style={[s.hrMarker, { left: `${curPct}%` as any, backgroundColor: markerColor, borderColor: markerColor }]} />
                          </View>
                          <View style={s.hrBarLabels}>
                            <Text style={s.hrBarLabel}>90%</Text>
                            <Text style={[s.hrBarLabelSafe, { color: GREEN_DK }]}>95% 이상</Text>
                            <Text style={s.hrBarLabel}>100%</Text>
                          </View>
                        </View>
                      );
                    })()}

                    <Text style={s.lumiHint}>
                      {spo2 >= 95
                        ? '산소 수치가 안정적이에요. 호흡이 편안해요 😊'
                        : spo2 >= 90
                        ? '산소 수치가 조금 낮아요. 환기를 시켜보세요'
                        : '산소 수치가 낮아요. 환기·휴식 후 다시 측정해보세요'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          /* 연결 안 됨 — 온보딩 가이드 카드 */
          <View style={s.onboardCard}>
            <View style={s.onboardRow}>
              <Text style={s.onboardIcon}>📱</Text>
              <Text style={s.onboardText}>폰만 연결해도 걸음수가 저절로 쌓여요</Text>
            </View>
            <View style={s.onboardRow}>
              <Text style={s.onboardIcon}>⌚</Text>
              <Text style={s.onboardText}>워치까지 있으면 심박·수면·산소도 자동으로</Text>
            </View>
            <View style={[s.onboardRow, { marginBottom: 16 }]}>
              <Text style={s.onboardIcon}>🔒</Text>
              <Text style={s.onboardText}>내 건강 정보는 안전하게 보관 · 배터리 걱정 없어요</Text>
            </View>
            <TouchableOpacity style={s.connectBtn} activeOpacity={0.8} onPress={handleConnectHealth}>
              <Text style={s.connectBtnTxt}>{Platform.OS === 'ios' ? '애플 건강' : 'Health Connect'} 열기</Text>
            </TouchableOpacity>
            <Text style={s.onboardHint}>버튼을 누르면 Health Connect 권한 화면이 열립니다</Text>
            <Text style={s.onboardFamily}>가족이 대신 설정해 드릴 수도 있어요</Text>
            <TouchableOpacity onPress={showDiagnostic} style={{ paddingVertical: 8 }}>
              <Text style={s.diagLink}>🔍 연결이 안 되면 여기를 눌러주세요</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 그룹 2: ✍️ 직접 재서 기록해요 ── */}
        <View style={[s.groupHeader, { marginTop: 8 }]}>
          <Text style={s.groupHeaderEmoji}>✍️</Text>
          <Text style={s.groupHeaderTitle}>직접 재서 기록해요</Text>
        </View>

        {/* 혈압 — 3-상태: 권한없음 / 권한있고오늘0 / 데이터있음 */}
        {(() => {
          // HC 우선, 없으면 수동 폴백
          const manualBp = todayRecord?.blood_pressure_systolic
            ? { systolic: todayRecord.blood_pressure_systolic, diastolic: todayRecord.blood_pressure_diastolic }
            : null;
          const displayBp = hcBp ?? manualBp;
          const isAuto = !!hcBp;

          // Android 3-상태 안내 메시지
          const bpHint = Platform.OS === 'android'
            ? !healthConnected
              ? '건강 앱 연결 후 자동으로 불러올 수 있어요'
              : !hcBp
              ? '오늘은 아직 기록이 없어요'
              : null
            : null;

          return (
            <View style={s.metricCard}>
              <View style={s.metricTopRow}>
                <View style={[s.metricIconBox, { backgroundColor: ORANGE_BG }]}>
                  <Text style={s.metricIcon}>❤️</Text>
                </View>
                <View style={s.metricContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.metricLabel}>혈압</Text>
                    {isAuto && (
                      <View style={{ backgroundColor: '#EAF0FA', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: '#3B5FA0' }}>앱 연동</Text>
                      </View>
                    )}
                  </View>
                  {displayBp ? (
                    <>
                      <Text style={s.metricValue}>
                        {displayBp.systolic} / {displayBp.diastolic}
                        <Text style={s.metricUnit}> mmHg</Text>
                      </Text>
                      <View style={s.statusRow}>
                        <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[bpStatus(displayBp.systolic, displayBp.diastolic)].bg }]}>
                          <Text style={[s.statusBadgeSmallText, { color: STATUS[bpStatus(displayBp.systolic, displayBp.diastolic)].fg }]}>
                            {STATUS[bpStatus(displayBp.systolic, displayBp.diastolic)].label}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.lumiHint}>{lumiInterpretBp(displayBp.systolic, displayBp.diastolic)}</Text>
                    </>
                  ) : (
                    <Text style={s.emptyValue}>측정 안 함</Text>
                  )}
                  {bpHint && (
                    <Text style={{ fontSize: 12, color: INK_MUTE, marginTop: 4 }}>{bpHint}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('bp')}>
                <Text style={s.measureBtnText}>{displayBp ? '다시 측정하기' : '지금 측정하기'}</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

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

        {/* 수면 — 워치 없을 때 수동 입력 */}
        {!sleepHoursAuto && (
          <View style={s.metricCard}>
            <View style={s.metricTopRow}>
              <View style={[s.metricIconBox, { backgroundColor: '#EAE4F6' }]}>
                <Text style={s.metricIcon}>😴</Text>
              </View>
              <View style={s.metricContent}>
                <Text style={s.metricLabel}>수면</Text>
                {todayRecord?.sleep_hours ? (
                  <>
                    <Text style={s.metricValue}>
                      {todayRecord.sleep_hours}<Text style={s.metricUnit}> 시간</Text>
                    </Text>
                    <Text style={s.lumiHint}>
                      {sleepStatus(todayRecord.sleep_hours) === 'normal'
                        ? '충분히 주무셨어요. 오늘도 활기차게! 🌟'
                        : sleepStatus(todayRecord.sleep_hours) === 'caution'
                        ? '조금 더 주무시면 좋겠어요'
                        : '수면이 부족해요. 오늘 일찍 주무세요'}
                    </Text>
                  </>
                ) : (
                  <Text style={s.emptyValue}>어젯밤 수면 시간을 입력해주세요</Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={s.measureBtn} onPress={() => {
              setInputValue(todayRecord?.sleep_hours ? String(todayRecord.sleep_hours) : '');
              setModalType('sl');
            }}>
              <Text style={s.measureBtnText}>수면 기록하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 오늘의 건강 평가 ── */}
        <View style={s.evalCard}>
          <View style={s.evalHeader}>
            <Lumi mood={ctxEval.mood} size={56} bob={false} />
            <View style={{ flex: 1 }}>
              <Text style={s.evalTitle}>오늘의 건강 평가</Text>
              <View style={[s.evalBadge, { backgroundColor: ctxEval.badgeBg }]}>
                <Text style={[s.evalBadgeText, { color: ctxEval.badgeFg }]}>{ctxEval.badge}</Text>
              </View>
            </View>
          </View>
          <Text style={s.evalSummary}>{ctxEval.text}</Text>
          <Text style={s.evalDisclaimer}>의학적 진단이 아니라, 기록을 보고 드리는 도움말이에요.</Text>
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
          {records.slice(0, showAllRecords ? records.length : 4).map((r) => (
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

        {records.length > 4 && (
          <TouchableOpacity onPress={() => setShowAllRecords(prev => !prev)}>
            <Text style={s.moreLink}>{showAllRecords ? '접기 ↑' : `전체 기록 보기 (${records.length}건) →`}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Input Modal */}
      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {modalType === 'bp' ? '혈압 측정값' :
               modalType === 'sg' ? '혈당 측정값' :
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
                   modalType === 'steps' ? '걸음수 (예: 6500)' : '수면 시간 (예: 7.5)'}
                </Text>
                <TextInput
                  style={s.modalInput}
                  placeholder={modalType === 'sg' ? '120' : modalType === 'steps' ? '6500' : '7.5'}
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

  // 온보딩 카드 (미연결)
  onboardCard: {
    marginHorizontal: 18, marginBottom: 12, padding: 20,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: 'rgba(15,27,45,0.06)',
    shadowColor: '#1C3C6E', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  onboardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  onboardIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  onboardText: { flex: 1, fontSize: 17, fontWeight: '600', color: INK_SOFT, lineHeight: 24 },
  onboardHint: { fontSize: 14, color: INK_SOFT, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  onboardFamily: { fontSize: 14, color: INK_MUTE, textAlign: 'center', marginTop: 6 },
  diagLink: { fontSize: 13, color: BLUE, textAlign: 'center', textDecorationLine: 'underline' },
  connectBtn: {
    height: 52, borderRadius: 14, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  connectBtnTxt: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // 출처 칩
  sourceChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
    backgroundColor: '#F0F4FF', borderWidth: 1, borderColor: '#C7D7F8',
    marginLeft: 4,
  },
  sourceChipText: { fontSize: 11, fontWeight: '700', color: '#3B5FC0' },

  // 오늘의 건강 평가
  evalCard: {
    marginHorizontal: 18, marginBottom: 12, padding: 20,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: PURPLE,
    shadowColor: '#1C3C6E', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  evalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  evalTitle: { fontSize: 16, fontWeight: '900', color: PURPLE, marginBottom: 6 },
  evalBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  evalBadgeText: { fontSize: 13, fontWeight: '800' },
  evalSummary: { fontSize: 18, fontWeight: '600', color: INK_SOFT, lineHeight: 28, marginBottom: 12 },
  evalDisclaimer: { fontSize: 12, color: INK_MUTE, lineHeight: 18 },

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

  stepsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
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

  // ── 4지표 요약 타일 ──────────────────────────────────────────────────────
  summaryTileRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, gap: 8,
  },
  summaryTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  summaryTileIcon:  { fontSize: 22, marginBottom: 4 },
  summaryTileValue: { fontSize: 18, fontWeight: '800', color: INK, lineHeight: 22 },
  summaryTileUnit:  { fontSize: 13, fontWeight: '600', color: INK_SOFT },
  summaryTileLabel: { fontSize: 13, color: INK_MUTE, marginTop: 3 },

  // ── 시각화 공통 ───────────────────────────────────────────────────────────
  vizWrap: { marginTop: 10, marginBottom: 4 },

  // 심박 범위 막대
  hrBarTrack: {
    height: 14, backgroundColor: '#EEE', borderRadius: 7,
    marginBottom: 6, position: 'relative', overflow: 'visible',
  },
  hrSafeZone: {
    position: 'absolute', height: '100%', borderRadius: 7,
    backgroundColor: '#D4EDDA',
  },
  hrRangeBar: {
    position: 'absolute', height: '100%', borderRadius: 7,
    backgroundColor: '#E5453C', opacity: 0.75,
  },
  hrMarker: {
    position: 'absolute', width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E5453C', borderWidth: 3, borderColor: '#fff',
    top: -3, marginLeft: -10,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
  },
  hrBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  hrBarLabel:     { fontSize: 13, color: INK_MUTE, fontWeight: '600' },
  hrBarLabelSafe: { fontSize: 12, color: GREEN_DK, fontWeight: '700' },

  // SpO2 구역 막대 (hrBarTrack 재사용)
  spo2SafeZone: {
    position: 'absolute', height: '100%', borderRadius: 7,
    backgroundColor: '#BBEDD0',
  },

  // 수면 단계 막대
  sleepStageBar: {
    flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden',
    marginBottom: 8,
  },
  sleepSeg: { height: '100%' },
  sleepLegendRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  sleepLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sleepLegendDot:  { width: 10, height: 10, borderRadius: 5 },
  sleepLegendTxt:  { fontSize: 13, color: INK_SOFT, fontWeight: '600' },
});
