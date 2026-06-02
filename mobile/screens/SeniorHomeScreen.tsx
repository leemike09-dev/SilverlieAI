import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Platform, Image, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

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

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name, setName] = useState<string>(route?.params?.name || '');
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [nextMedication, setNextMedication] = useState<any>(null);
  const [nextMedTimeStr, setNextMedTimeStr] = useState<string>('');
  const [healthToday, setHealthToday] = useState<any>(null);
  const [familyMessage, setFamilyMessage] = useState<string>('');
  const [locationAddr, setLocationAddr] = useState<string>('');
  const [weather, setWeather] = useState<any>(null);

  const ttsDoneRef = useRef(false);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const sendLocation = async (uid: string) => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await fetch(`${API}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, lat: pos.coords.latitude, lng: pos.coords.longitude, activity: 'unknown' }),
      });
    } catch {}
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
               try { const { Pedometer } = await import('expo-sensors'); await Pedometer.requestPermissionsAsync(); } catch {}
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
      // Load mood
      const mood = await AsyncStorage.getItem(`mood.${uid}.${todayKey}`);
      if (mood) setTodayMood(parseInt(mood));

      // Load next hospital schedule (show any upcoming, not just today)
      const schedule = await AsyncStorage.getItem('hospital_schedule');
      if (schedule) {
        const parsed = JSON.parse(schedule);
        if (parsed.date >= todayKey) setTodaySchedule(parsed);
      }

      // Load next medication — 현재 시각 기준 다음 복용 계산
      try {
        const medsRaw = await AsyncStorage.getItem('medications');
        const logRaw  = await AsyncStorage.getItem(`medication-log.${uid}.${todayKey}`);
        if (medsRaw) {
          const medList: any[] = JSON.parse(medsRaw);
          const log: Record<string, any> = logRaw ? JSON.parse(logRaw) : {};
          const toMin = (t: string) => {
            const [h, m] = t.split(':').map(Number); return h * 60 + m;
          };
          const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
          // 시간대 기본 시간 매핑
          const SLOT_TIME: Record<string, string> = {
            morning: '08:00', lunch: '12:00', evening: '18:00', bedtime: '21:00',
          };
          const candidates = medList.flatMap(med => {
            const scheduleTime = med.time || SLOT_TIME[med.timeSlot] || '08:00';
            const key = `${med.id}-${scheduleTime}`;
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
      } catch {}

      // 위치 주소 + 날씨 로드
      try {
        const locRaw = await AsyncStorage.getItem(`location.${uid}.current`);
        if (locRaw) {
          const loc = JSON.parse(locRaw);
          if (loc?.address) setLocationAddr(loc.address);
          if (loc?.lat && loc?.lng) {
            fetch(`${API}/weather?lat=${loc.lat}&lon=${loc.lng}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d) setWeather(d); })
              .catch(() => {});
          }
        }
      } catch {}

      // Load today's health
      const records = await AsyncStorage.getItem('health_records');
      if (records) {
        const recList = JSON.parse(records);
        const todayRec = recList.find((r: any) => r.date === todayKey);
        if (todayRec) setHealthToday(todayRec);
      }
    } catch {}
  };

  const handleMoodSelect = async (moodIndex: number) => {
    setTodayMood(moodIndex);
    await AsyncStorage.setItem(`mood.${userId}.${todayKey}`, String(moodIndex));
  };

  const now = new Date();
  const hour = now.getHours();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const lumiImage = require('../assets/lumi-happy.png');
  const isGuest = !userId || userId === 'guest';

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* TOP BAR */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.wordmark}>Lumi ♥</Text>
          <View>
            <Text style={s.topDate}>{dateStr}</Text>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* HERO — 루미 + 인사 텍스트 (말풍선 없음) */}
        <View style={s.heroSection}>
          <Image source={lumiImage} style={s.lumiHero} />
          <View style={{ flex: 1 }}>
            <Text style={s.heroGreet}>
              {hour < 12 ? '좋은 아침이에요' : hour < 18 ? '안녕하세요' : '좋은 저녁이에요'}
            </Text>
            <Text style={s.heroName}>{name}님!</Text>
            <Text style={s.heroSub}>오늘도 함께해요 ☀️</Text>
          </View>
        </View>

        {/* 기분 체크인 */}
        <View style={[s.card, { backgroundColor: '#fff' }]}>
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

          {/* 부정 기분 선택 시 AIChat 유도 */}
          {todayMood !== null && todayMood >= 3 && (
            <View style={s.moodChatBox}>
              <Image source={require('../assets/lumi-worried.png')} style={s.moodLumi} />
              <View style={{ flex: 1 }}>
                <Text style={s.moodChatText}>왜 그런 기분이 드는지{'\n'}말해 주실래요?</Text>
                <TouchableOpacity
                  style={s.moodChatBtn}
                  onPress={() => navigation.navigate('AIChat', {
                    userId, name,
                    seedMood: MOOD_LABEL[todayMood],
                  })}>
                  <Text style={s.moodChatBtnText}>루미와 이야기하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 2. 약 알림 — 흰 카드 + 앰버 칩 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#fff' }]}
          onPress={() => navigation.navigate('Medication', { userId, name })}
        >
          <View style={s.scheduleTop}>
            <View style={[s.iconChip, { backgroundColor: CHIP_MED }]}>
              <Text style={s.iconChipEmoji}>💊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>다음 약</Text>
              <Text style={s.cardSubtitle}>
                {nextMedication ? nextMedTimeStr : '오늘 약 모두 완료'}
              </Text>
            </View>
            <Text style={s.scheduleArrow}>›</Text>
          </View>
          {nextMedication ? (
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

        {/* 4. 날씨 카드 */}
        {weather && (
          <View style={[s.card, { backgroundColor: '#fff' }]}>
            <View style={s.scheduleTop}>
              <View style={[s.iconChip, { backgroundColor: '#E8F4FC' }]}>
                <Text style={s.iconChipEmoji}>
                  {weather.summary?.includes('비') ? '🌧️' :
                   weather.summary?.includes('눈') ? '❄️' :
                   weather.summary?.includes('흐') ? '☁️' :
                   weather.summary?.includes('구름') ? '⛅' : '☀️'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>오늘 날씨</Text>
                <Text style={s.cardSubtitle} numberOfLines={2}>{weather.summary || '날씨 정보 로딩 중'}</Text>
              </View>
            </View>
            {weather.advice && (
              <Text style={s.weatherAdvice}>💬 {weather.advice}</Text>
            )}
          </View>
        )}

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
          style={[s.card, { backgroundColor: '#fff' }]}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
        >
          <View style={s.chatCardTop}>
            <View style={[s.iconChip, { backgroundColor: CHIP_CHAT }]}>
              <Image source={lumiImage} style={s.lumiChip} />
            </View>
            <Text style={s.cardTitle}>루미와 대화</Text>
          </View>
          <Text style={s.cardSubtitle}>오늘 컨디션 어떠세요?</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 18,
    gap: 16,
  },
  lumiHero: {
    width: 270,
    height: 270,
    resizeMode: 'contain',
    flexShrink: 0,
    marginLeft: -20,
  },
  heroGreet: {
    fontSize: 18,
    fontWeight: '700',
    color: INK_SOFT,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '900',
    color: INK,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 18,
    fontWeight: '600',
    color: INK_SOFT,
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
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    marginHorizontal: 2,
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
    marginBottom: 4,
  },
  moodText: {
    fontSize: 10,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // 아이콘 칩 (42×42 파스텔)
  iconChip: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconChipEmoji: { fontSize: 22 },
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
