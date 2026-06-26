import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Platform, useWindowDimensions,
} from 'react-native';
import Lumi from '../components/Lumi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { useFocusEffect } from '@react-navigation/native';

const BLUE = '#3B82F6';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const GREEN = '#3BA559';
const ORANGE = '#F58A4D';
const RED = '#E5453C';
const PURPLE = '#7C5BE3';
const WARN = '#F5A623';

const MOOD_BG = ['#FCEACB', '#DCEFE2', '#EAE7E1', '#F7DECF', '#F6D2D2'];
const MOOD_EMOJI = ['😊', '😌', '😐', '😟', '😢'];
const MOOD_LABEL = ['좋아요', '평온해요', '그저그래요', '걱정돼요', '힘들어요'];

// 칩 파스텔 — 카드 배경은 모두 흰색, 칩에만 색 사용
const CHIP_MOOD     = '#F1E3D4';
const CHIP_HOSPITAL = '#E6EDF7';
const CHIP_CHAT     = '#ECE6F6';
const CHIP_FAMILY   = '#F5E3EA';
const CHIP_HEALTH   = '#F6E5DD';
const CHIP_MED      = '#F5EAD6';
const CHIP_LOCATION = '#E6F4E2';

const API = 'https://silverlieai.onrender.com';

// ── 타입 정의 ──────────────────────────────────────────────────
type AppointmentType = 'hospital' | 'memo' | 'travel';

interface Appointment {
  id: string;
  type: AppointmentType;
  date: string;
  time: string;
  hospital?: string;
  clinic?: string;
  title?: string;
  name?: string;
  dept?: string;
  address?: string;
  memo?: string;
}

interface NextMed {
  name: string;
  dosage: string;
  time: string;
  timeMin: number;
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  timeSlot?: string;
  time?: string;
  taken?: boolean;
  skipped?: boolean;
}

interface HealthRecord {
  date: string;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  blood_sugar?: number | null;
  steps?: number | null;
  sleep_hours?: number | null;
  heart_rate?: number | null;
  weight?: number | null;
  temperature?: number | null;
}

interface WeatherData {
  summary?: string;
  temp?: number;
  high?: number;
  low?: number;
  code?: number;
  condition?: string;
  cond_type?: string;
  forecast?: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    condition: string;
    cond_type: string;
    rain_prob?: number;
  }>;
}

interface MoodLogEntry {
  date: string;
  moodIndex: number;
}

interface ScreenProps {
  route: { params?: { userId?: string; name?: string } };
  navigation: any;
}

export default function SeniorHomeScreen({ route, navigation }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name, setName] = useState<string>(route?.params?.name || '');
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<Appointment | null>(null);
  const [nextMedication, setNextMedication] = useState<NextMed | null>(null);
  const [nextMedTimeStr, setNextMedTimeStr] = useState<string>('');
  const [medsEmpty, setMedsEmpty] = useState<boolean>(false);
  const [healthToday, setHealthToday] = useState<HealthRecord | null>(null);
  const [familyMessage, setFamilyMessage] = useState<string>('');
  const [locationAddr, setLocationAddr] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [nowTime, setNowTime] = useState(new Date());

  const [unreadCount, setUnreadCount] = useState(0);

  const ttsDoneRef = useRef(false);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const moodCardY = useRef<number>(0);
  const shouldScrollToMood = useRef<boolean>(false);

  // 시계 1분마다 업데이트
  useEffect(() => {
    const id = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // 화면 포커스될 때마다 맨 위로 + 안 읽은 알림 카운트 갱신
  useFocusEffect(useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    if (userId && userId !== 'guest') {
      loadTodayData(userId);
      fetch(`${API}/notifications/${userId}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any) => {
          if (Array.isArray(data)) {
            setUnreadCount(data.filter((n: any) => !n.is_read).length);
          }
        })
        .catch(() => {});
    }
  }, [userId]));
  const todayKey = useMemo(() => localDate(), []);

  const sendLocation = async (uid: string) => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await fetch(`${API}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, lat: pos.coords.latitude, lng: pos.coords.longitude, activity: 'unknown' }),
      });
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const startLocationTracking = async (uid: string) => {
    if (!uid || uid === 'guest') return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    sendLocation(uid);
    locationRef.current = setInterval(() => sendLocation(uid), 2 * 60 * 1000);
  };

  useEffect(() => {
    const init = async () => {
      const paramId = route?.params?.userId || '';
      const guestMode = paramId === 'guest';
      const storedId = guestMode ? 'guest' : (await AsyncStorage.getItem('userId') || paramId);
      const storedName = guestMode ? (route?.params?.name || '게스트') : (await AsyncStorage.getItem('userName') || route?.params?.name || '');

      if (storedId) setUserId(storedId);
      if (storedName) setName(storedName);

      if (storedId && storedId !== 'guest') {
        startLocationTracking(storedId);
        loadTodayData(storedId);
      }

      if (Platform.OS !== 'web') {
        const asked = await AsyncStorage.getItem('pedometer_asked');
        if (!asked) {
          await AsyncStorage.setItem('pedometer_asked', '1');
          setTimeout(() => Alert.alert('🚶 걸음수 자동 측정',
            '스마트폰으로 오늘 걸음수를 자동으로 측정할 수 있어요.',
            [{ text: '나중에', style: 'cancel' },
             { text: '허용하기', onPress: async () => {
               try { const { Pedometer } = await import('expo-sensors'); await Pedometer.requestPermissionsAsync(); } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
             }}]), 1500);
        }
      }
    };
    init();
    return () => {
      if (locationRef.current) clearInterval(locationRef.current);
    };
  }, []);

  const loadTodayData = async (uid: string) => {
    try {
      // Load mood (로컬 우선, 서버에서 병합)
      const mood = await AsyncStorage.getItem(`mood.${uid}.${todayKey}`);
      if (mood) setTodayMood(parseInt(mood));
      // 서버 기분 로그 동기화 (백그라운드)
      fetch(`${API}/moods/${uid}`)
        .then(r => r.ok ? r.json() : null)
        .then(async (serverLogs: Array<{ date: string; mood_index: number }> | null) => {
          if (!serverLogs || serverLogs.length === 0) return;
          const localRaw = await AsyncStorage.getItem(`mood_log.${uid}`).catch(() => null);
          const local: MoodLogEntry[] = localRaw ? JSON.parse(localRaw) : [];
          const localDates = new Set(local.map(e => e.date));
          const merged = [...local, ...serverLogs.filter(s => !localDates.has(s.date)).map(s => ({ date: s.date, moodIndex: s.mood_index }))];
          await AsyncStorage.setItem(`mood_log.${uid}`, JSON.stringify(merged));
          // 오늘 기분 서버에서 복원
          const todayServer = serverLogs.find(s => s.date === todayKey);
          if (todayServer && !mood) {
            setTodayMood(todayServer.mood_index);
            await AsyncStorage.setItem(`mood.${uid}.${todayKey}`, String(todayServer.mood_index));
          }
        }).catch(() => {});

      // Load next hospital schedule (show any upcoming, not just today)
      const schedule = await AsyncStorage.getItem(`hospital_schedule.${uid}`);
      if (schedule) {
        const parsed = JSON.parse(schedule);
        if (parsed.date >= todayKey) setTodaySchedule(parsed);
      }

      // Load next medication — 현재 시각 기준 다음 복용 계산
      try {
        const medsRaw = await AsyncStorage.getItem(`medications.${uid}`);
        const logRaw  = await AsyncStorage.getItem(`medication-log.${uid}.${todayKey}`);
        if (!medsRaw || JSON.parse(medsRaw).length === 0) {
          setMedsEmpty(true);
        } else if (medsRaw) {
          const medList: Medication[] = JSON.parse(medsRaw);
          const log: Record<string, boolean> = logRaw ? JSON.parse(logRaw) : {};
          const toMin = (t: string) => {
            const [h, m] = t.split(':').map(Number); return h * 60 + m;
          };
          const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
          // 시간대 기본 시간 매핑
          const SLOT_TIME: Record<string, string> = {
            morning: '08:00', lunch: '12:00', evening: '18:00', bedtime: '21:00',
          };
          const candidates = medList.flatMap(med => {
            const scheduleTime = med.time || SLOT_TIME[med.timeSlot ?? ''] || '08:00';
            const key = `${med.id ?? ''}-${scheduleTime}`;
            if (log[key]) return []; // 이미 복용
            return [{ name: med.name, dosage: med.dosage || '1정', time: scheduleTime, timeMin: toMin(scheduleTime) }];
          }).sort((a, b) => a.timeMin - b.timeMin);

          const next = candidates.find(c => c.timeMin >= nowMin) || candidates[0] || null;
          if (next) {
            setNextMedication(next);
            const diffMin = next.timeMin >= nowMin
              ? next.timeMin - nowMin
              : next.timeMin + 24 * 60 - nowMin;
            const diffH = Math.floor(diffMin / 60);
            const diffM = diffMin % 60;
            setNextMedTimeStr(
              diffH > 0 ? `${diffH}시간 ${diffM}분 후` : `${diffM}분 후`
            );
          }
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

      // 위치 주소 + 날씨 로드
      try {
        const locRaw = await AsyncStorage.getItem(`location.${uid}.current`);
        let lat: number | null = null;
        let lng: number | null = null;
        if (locRaw) {
          const loc = JSON.parse(locRaw);
          if (loc?.address) setLocationAddr(loc.address);
          lat = loc?.lat ?? null;
          lng = loc?.lng ?? null;
        }
        // 저장된 위치 없으면 현재 위치로 날씨 조회
        if (!lat || !lng) {
          try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
              const pos = await Location.getLastKnownPositionAsync();
              if (pos) { lat = pos.coords.latitude; lng = pos.coords.longitude; }
            }
          } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
        }
        if (!lat || !lng) { lat = 37.5665; lng = 126.9780; }  // 서울 폴백
        // Open-Meteo 직접 호출 (Render.com IP rate limit 우회)
        const fetchWeather = async () => {
          try {
            const WMO_KO: Record<number,string> = {
              0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',
              45:'안개',51:'가벼운 이슬비',61:'약한 비',63:'비',65:'강한 비',
              71:'약한 눈',73:'눈',80:'소나기',95:'뇌우',
            };
            const condType = (c:number) => c<=1?'clear':c<=3||c===45?'cloud':'rain';
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
              `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m` +
              `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
              `&forecast_days=6&timezone=auto`
            );
            if (!res.ok) return;
            const d = await res.json();
            const cur = d.current ?? {};
            const daily = d.daily ?? {};
            const temp = cur.temperature_2m;
            const code = cur.weather_code ?? 0;
            const condition = WMO_KO[code] ?? '알 수 없음';
            const dates: string[] = daily.time ?? [];
            const forecast = dates.slice(0,6).map((date:string, i:number) => {
              const c = (daily.weather_code?.[i] ?? 0) as number;
              return {
                date, condition: WMO_KO[c]??'알 수 없음', cond_type: condType(c),
                temp_max: daily.temperature_2m_max?.[i] != null ? Math.round(daily.temperature_2m_max[i]) : 0,
                temp_min: daily.temperature_2m_min?.[i] != null ? Math.round(daily.temperature_2m_min[i]) : 0,
                rain_prob: daily.precipitation_probability_max?.[i] ?? null,
              };
            });
            setWeather({ temp, code, condition, cond_type: condType(code),
              summary: `${temp}°C ${condition}`, forecast });
          } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
        };
        fetchWeather();
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

      // Load today's health
      const records = await AsyncStorage.getItem(`health_records.${uid}`);
      if (records) {
        const recList = (JSON.parse(records) as HealthRecord[])
          .filter(r => (r.blood_pressure_systolic ?? 0) > 0 || (r.blood_sugar ?? 0) > 0)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (recList.length > 0) setHealthToday(recList[0]);
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const handleMoodSelect = async (moodIndex: number) => {
    shouldScrollToMood.current = true;
    setTodayMood(moodIndex);
    await AsyncStorage.setItem(`mood.${userId}.${todayKey}`, String(moodIndex));
    // mood_log 누적 저장 (하루 1개 갱신)
    const logRaw = await AsyncStorage.getItem(`mood_log.${userId}`).catch(() => null);
    const log: MoodLogEntry[] = logRaw ? JSON.parse(logRaw) : [];
    const idx = log.findIndex(e => e.date === todayKey);
    if (idx >= 0) log[idx] = { date: todayKey, moodIndex };
    else log.push({ date: todayKey, moodIndex });
    await AsyncStorage.setItem(`mood_log.${userId}`, JSON.stringify(log));
    // 서버 동기화
    fetch(`${API}/moods/sync/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: log }),
    }).catch(() => {});
  };

const MOOD_REACTIONS = [
  { lumiMood: 'happy'   as const, msg: '좋네요! 이 기운으로\n가볍게 한 바퀴 어때요?',      btnLabel: '산책하고 걸음 수 보기', btnColor: GREEN,   screen: 'Health' },
  { lumiMood: 'content' as const, msg: '평온한 하루 되시길.\n오늘 일정 함께 볼까요?',        btnLabel: '오늘 일정 확인하기',    btnColor: BLUE,    screen: 'HospitalSchedule' },
  { lumiMood: 'content' as const, msg: '그런 날도 있죠.\n가족 목소리 한번 들어볼까요?',      btnLabel: '가족에게 안부 전하기',  btnColor: PURPLE,  screen: 'Guardian' },
  { lumiMood: 'worried' as const, msg: '왜 그런 기분이 드는지\n말해 주실래요?',             btnLabel: '루미와 이야기하기',     btnColor: PURPLE,  screen: 'AIChat' },
  { lumiMood: 'worried' as const, msg: '함께 이야기해요.\n루미가 들을게요.',                btnLabel: '루미와 이야기하기',     btnColor: PURPLE,  screen: 'AIChat' },
];

  const hour = nowTime.getHours();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${nowTime.getMonth() + 1}월 ${nowTime.getDate()}일 ${days[nowTime.getDay()]}요일`;
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(nowTime.getMinutes()).padStart(2, '0')}`;
  const isGuest = !userId || userId === 'guest';

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* TOP BAR */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 4, 16) }]}>
          <Text style={s.wordmark}>Lumi <Text style={{ color: '#E9A23B' }}>♥</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View>
              <Text style={s.topDate}>{dateStr}</Text>
              <Text style={s.topTime}>{timeStr}</Text>
            </View>
            <TouchableOpacity
              style={s.bellBtn}
              onPress={() => navigation.navigate('Notifications', { userId, name })}
              activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={26} color={INK} />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* HERO — 루미 크게 + 인사 텍스트 */}
        <View style={[s.heroSection, { paddingTop: 16 }]}>
          <Lumi mood="happy" size={300} bob style={s.lumiHero} />
          <Text style={s.heroName}>
            {hour < 12 ? '좋은 아침이에요' : hour < 18 ? '안녕하세요' : '좋은 저녁이에요'}, {name}님!
          </Text>
          <Text style={s.heroSub}>오늘도 함께해요 ☀️</Text>
        </View>

        {/* 기분 체크인 */}
        <View style={[s.card, { backgroundColor: '#fff' }]}
          onLayout={e => { moodCardY.current = e.nativeEvent.layout.y; }}>
          <Text style={s.cardTitle}>💭 오늘 기분</Text>
          <Text style={s.moodSubLabel}>오늘 마음은 어떠세요?</Text>
          <View style={s.moodRow}>
            {MOOD_EMOJI.map((emoji, idx) => {
              const active = todayMood === idx;
              return (
                <TouchableOpacity key={idx}
                  style={[s.moodBtn,
                    { backgroundColor: MOOD_BG[idx] },
                    active && s.moodBtnActive,
                    !active && todayMood !== null && s.moodBtnDim,
                  ]}
                  onPress={() => handleMoodSelect(idx)}
                  activeOpacity={0.8}>
                  <Text style={s.moodEmoji}>{emoji}</Text>
                  <Text style={s.moodText}>{MOOD_LABEL[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 기분 선택 시 루미 반응 (5개 모두) */}
          {todayMood !== null && (
            <View style={s.moodChatBox}
              onLayout={e => {
                if (!shouldScrollToMood.current) return;
                shouldScrollToMood.current = false;
                const absY = moodCardY.current + e.nativeEvent.layout.y;
                scrollViewRef.current?.scrollTo({ y: Math.max(0, absY - 80), animated: true });
              }}>
              <Lumi mood={MOOD_REACTIONS[todayMood].lumiMood} size={56} bob={false} />
              <View style={{ flex: 1 }}>
                <Text style={s.moodChatText}>{MOOD_REACTIONS[todayMood].msg}</Text>
                <TouchableOpacity
                  style={[s.moodChatBtn, { backgroundColor: MOOD_REACTIONS[todayMood].btnColor }]}
                  onPress={() => navigation.navigate(MOOD_REACTIONS[todayMood!].screen as any, { userId, name, seedMood: MOOD_LABEL[todayMood!] })}>
                  <Text style={s.moodChatBtnText}>{MOOD_REACTIONS[todayMood].btnLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 2. 약 알림 — 흰 카드 + 앰버 칩 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#fff', overflow: 'hidden' }]}
          onPress={() => navigation.navigate('Medication', { userId, name })}
        >
          {/* 워터마크 */}
          <Text style={s.medWatermark}>💊</Text>
          <View style={s.scheduleTop}>
            <View style={[s.iconChip, { backgroundColor: CHIP_MED }]}>
              <Text style={s.iconChipEmoji}>💊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>다음 약</Text>
              <Text style={s.cardSubtitle}>
                {medsEmpty ? '약을 등록해보세요' : nextMedication ? nextMedTimeStr : '오늘 약 모두 완료'}
              </Text>
            </View>
            <Text style={s.scheduleArrow}>›</Text>
          </View>
          {medsEmpty ? (
            <Text style={s.medicationText}>복용 중인 약을 등록하면 알려드려요 💊</Text>
          ) : nextMedication ? (
            <Text style={s.medicationText}>
              {nextMedication.time} · {nextMedication.name} {nextMedication.dosage || '1정'}
            </Text>
          ) : (
            <Text style={s.medicationText}>잘하셨어요 💙</Text>
          )}
        </TouchableOpacity>

        {/* 3. 오늘 일정 — 흰 카드 + sky 칩 */}
        {todaySchedule && (
          <TouchableOpacity
            style={[s.card, { backgroundColor: '#fff' }]}
            onPress={() => navigation.navigate('HospitalSchedule', { userId, name })}
            activeOpacity={0.85}
          >
            <View style={s.scheduleTop}>
              <View style={[s.iconChip, { backgroundColor: CHIP_HOSPITAL }]}>
                <Text style={s.iconChipEmoji}>🏥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.scheduleBadge}>
                  {todaySchedule.date === todayKey ? '오늘 일정' : '다가오는 일정'}
                </Text>
                <Text style={s.scheduleClinic}>{todaySchedule.clinic || todaySchedule.hospital}</Text>
              </View>
              <Text style={s.scheduleArrow}>›</Text>
            </View>
            <View style={s.scheduleInfo}>
              <View style={s.scheduleChip}>
                <Text style={s.scheduleChipTxt}>📅 {todaySchedule.date}</Text>
              </View>
              {todaySchedule.time ? (
                <View style={s.scheduleChip}>
                  <Text style={s.scheduleChipTxt}>🕐 {todaySchedule.time}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* 4. 날씨 카드 — 조언 중심 + 워터마크 */}
        {(() => {
          const hasRain = weather?.summary?.includes('비');
          const hasCloudy = weather?.summary?.includes('흐') || weather?.summary?.includes('구름');
          const weatherIcon = hasRain ? '🌧️' : hasCloudy ? '☁️' : '☀️';
          const adviceColor = hasRain ? BLUE : hasCloudy ? INK_MUTE : GREEN;
          const adviceAction = hasRain ? '우산 꼭 챙기세요 ☔' : hasCloudy ? '나들이 무난한 날이에요' : '산책하기 좋은 날이에요 🚶';
          return (
            <View style={[s.card, { backgroundColor: '#fff', overflow: 'hidden' }]}>
              {/* 날씨 워터마크 */}
              <Text style={s.weatherWatermark}>{weatherIcon}</Text>
              <View style={s.scheduleTop}>
                <View style={[s.iconChip, { backgroundColor: '#E8F4FC' }]}>
                  <Text style={s.iconChipEmoji}>{weatherIcon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>오늘 날씨</Text>
                  {weather?.high != null ? (
                    <Text style={{ fontSize: 16, color: INK_SOFT, fontWeight: '600' }}>
                      최고 {weather.high}° / 최저 {weather.low ?? '--'}°
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 34, fontWeight: '900', color: INK }}>
                  {weather?.temp != null ? `${weather.temp}°` : '--'}
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: INK, marginTop: 4 }}>
                {weather?.summary || '날씨 정보를 불러오는 중이에요'}
              </Text>
              {weather?.summary ? (
                <Text style={{ fontSize: 18, fontWeight: '700', color: adviceColor, marginTop: 6 }}>
                  {adviceAction}
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={() => navigation.navigate('Weather', { userId, name })}
                style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: INK_MUTE }}>
                  내일·모레 예보 보기 ›
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* 5. 건강 상태 — 흰 카드 + 코랄 칩 */}
        {healthToday && (
          <TouchableOpacity
            style={[s.card, { backgroundColor: '#fff' }]}
            onPress={() => navigation.navigate('Health', { userId, name })}
          >
            <View style={s.scheduleTop}>
              <View style={[s.iconChip, { backgroundColor: CHIP_HEALTH }]}>
                <Text style={s.iconChipEmoji}>❤️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>건강 상태</Text>
                <Text style={s.healthValue}>
                  혈압 {healthToday.blood_pressure_systolic}/{healthToday.blood_pressure_diastolic}
                </Text>
              </View>
              <Text style={s.scheduleArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 6. 루미 대화 — 흰 카드 + 라벤더 칩 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#fff', overflow: 'hidden' }]}
          onPress={() => navigation.navigate('AIChat', { userId, name, k: Date.now() })}
        >
          {/* 워터마크 */}
          <Lumi mood="happy" size={200} bob={false}
            style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.28 }} />
          <View style={s.chatCardTop}>
            <View style={[s.iconChip, { backgroundColor: CHIP_CHAT }]}>
              <Lumi mood="happy" size={30} bob={false} />
            </View>
            <Text style={s.cardTitle}>루미와 대화</Text>
          </View>
          <Text style={s.cardSubtitle}>무엇이든 물어보세요</Text>
          <View style={s.micButton}>
            <Text style={s.micIcon}>🎤</Text>
          </View>
        </TouchableOpacity>

        {/* 7. 보호자 카드 — 흰 카드 + 로즈 칩 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#fff' }]}
          onPress={() => navigation.navigate('Guardian', { userId, name })}
          activeOpacity={0.85}
        >
          <View style={s.guardianRow}>
            <View style={[s.iconChip, { backgroundColor: CHIP_FAMILY }]}>
              <Text style={s.iconChipEmoji}>👨‍👩‍👧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.guardianTitle}>보호자 연락처</Text>
              <Text style={s.guardianSub}>가족에게 바로 연락할 수 있어요</Text>
            </View>
            <Text style={s.scheduleArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 8. 내 위치 — 흰 카드 + 초록 칩 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#fff' }]}
          onPress={() => navigation.navigate('LocationMap', { userId, name })}
          activeOpacity={0.85}
        >
          <View style={s.guardianRow}>
            <View style={[s.iconChip, { backgroundColor: CHIP_LOCATION }]}>
              <Text style={s.iconChipEmoji}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.guardianTitle}>내 위치</Text>
              <Text style={s.guardianSub} numberOfLines={1}>
                {locationAddr || '가족에게 위치 알리기 · 집 가는 길'}
              </Text>
            </View>
            <Text style={s.scheduleArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 9. SOS 버튼 */}
        <TouchableOpacity
          style={s.sosButton}
          onPress={() => navigation.navigate('SOS', { userId, name })}
        >
          <Text style={s.sosEmoji}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.sosLabel}>긴급 상황</Text>
            <Text style={s.sosSub}>위급할 때 눌러주세요</Text>
          </View>
          <Text style={s.sosPhone}>📞</Text>
        </TouchableOpacity>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BG_BOT,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  bellBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: 5, right: 5,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: RED,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#fff',
  },
  bellBadgeText: {
    fontSize: 9, fontWeight: '900', color: '#fff',
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '900',
    color: INK,
  },
  topDate: {
    fontSize: 14,
    fontWeight: '700',
    color: INK_SOFT,
    textAlign: 'right',
  },
  topTime: {
    fontSize: 16,
    fontWeight: '900',
    color: BLUE,
    textAlign: 'right',
    marginTop: 4,
  },

  heroSection: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
    paddingHorizontal: 18,
  },
  lumiHero: {
    width: 300,
    height: 240,
    resizeMode: 'contain',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 17,
    fontWeight: '600',
    color: INK_SOFT,
    textAlign: 'center',
    marginBottom: 8,
  },
  weatherWatermark: {
    position: 'absolute', right: -8, top: -10,
    fontSize: 120, opacity: 0.18,
    pointerEvents: 'none',
  },

  weatherAdvice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D4B62',
    marginTop: 10,
    lineHeight: 22,
  },

  card: {
    marginHorizontal: 18,
    marginBottom: 16,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: INK,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: INK_SOFT,
    marginBottom: 16,
  },

  moodSubLabel: {
    fontSize: 16, fontWeight: '600', color: INK_MUTE, marginBottom: 14,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moodChatBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F3EEF8', borderRadius: 16, padding: 14, marginTop: 16,
  },
  moodLumi:    { width: 52, height: 52, resizeMode: 'contain' },
  moodChatText:{ fontSize: 15, fontWeight: '600', color: INK, lineHeight: 22, marginBottom: 10 },
  moodChatBtn: {
    backgroundColor: '#7C5BE3', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start',
  },
  moodChatBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  moodBtn: {
    flex: 1,
    minWidth: 0,
    height: 88,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  moodBtnActive: {
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  moodBtnDim: {
    opacity: 0.35,
  },
  moodEmoji: {
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 4,
  },
  moodText: {
    fontSize: 10,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 13,
  },

  // 아이콘 칩 (48×48 파스텔 + 옅은 그림자)
  iconChip: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: '#1C2846', shadowOpacity: 0.10, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  iconChipEmoji: { fontSize: 26 },
  lumiChip: { width: 30, height: 30, resizeMode: 'contain' },

  scheduleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  scheduleIcon: { fontSize: 32 },
  scheduleBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scheduleClinic: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
  },
  scheduleArrow: { fontSize: 28, color: INK_MUTE },
  scheduleInfo: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  scheduleChip: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scheduleChipTxt: { fontSize: 15, fontWeight: '700', color: BLUE },
  scheduleMemo: {
    fontSize: 14,
    fontWeight: '600',
    color: INK_SOFT,
    marginTop: 10,
  },
  scheduleText: {
    fontSize: 24,
    fontWeight: '900',
    color: BLUE,
    marginBottom: 16,
  },

  chatCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  lumiSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: 'contain',
  },

  micButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  micIcon: {
    fontSize: 56,
  },

  healthValue: {
    fontSize: 32,
    fontWeight: '900',
    color: RED,
    marginBottom: 8,
  },
  healthMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: BLUE,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: INK_MUTE,
    marginTop: 4,
  },

  medWatermark: {
    position: 'absolute', right: -10, bottom: -20,
    fontSize: 150, opacity: 0.13,
    transform: [{ rotate: '-12deg' }],
    pointerEvents: 'none',
  },

  medicationText: {
    fontSize: 20,
    fontWeight: '700',
    color: WARN,
  },

  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guardianIcon:  { fontSize: 32 },
  guardianTitle: { fontSize: 20, fontWeight: '900', color: INK, marginBottom: 4 },
  guardianSub:   { fontSize: 14, fontWeight: '600', color: INK_SOFT },

  sosButton: {
    marginHorizontal: 18,
    marginBottom: 24,
    marginTop: 12,
    backgroundColor: RED,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: RED,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sosEmoji: {
    fontSize: 28,
  },
  sosLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  sosSub: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  sosPhone: {
    fontSize: 24,
  },

  btnSecondary: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE,
  },
});
