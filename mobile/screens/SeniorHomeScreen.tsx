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
const SKY_FROM = '#CDE3F4';
const SKY_TO = '#F1F7FC';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const GREEN = '#3BA559';
const ORANGE = '#F58A4D';
const RED = '#E5453C';
const PURPLE = '#7C5BE3';
const WARN = '#F5A623';

const MOOD_BG = ['#FFE9B8', '#D7EFE0', '#E5E5EA', '#FFD9E0', '#FFCFCF'];
const MOOD_EMOJI = ['😊', '😌', '😐', '😟', '😢'];
const MOOD_LABEL = ['좋아요', '평온해요', '그저 그래요', '걱정돼요', '힘들어요'];

const CARD_HOSPITAL = '#E8F1FC';
const CARD_CHAT = '#ECE3FB';
const CARD_HEALTH = '#FFE6DC';
const CARD_LOCATION = '#E6F4E2';
const CARD_SCHEDULE = '#FFF3D6';

const API = 'https://silverlieai.onrender.com';

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name, setName] = useState<string>(route?.params?.name || '');
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [nextMedication, setNextMedication] = useState<any>(null);
  const [healthToday, setHealthToday] = useState<any>(null);
  const [familyMessage, setFamilyMessage] = useState<string>('');

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

      // Load next medication
      const meds = await AsyncStorage.getItem('medications');
      if (meds) {
        const medList = JSON.parse(meds);
        if (medList.length > 0) setNextMedication(medList[0]);
      }

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
    Alert.alert('', MOOD_LABEL[moodIndex] + '는 공감합니다 ❤️', [{ text: '닫기' }]);
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
    <LinearGradient colors={[SKY_FROM, SKY_TO]} style={s.root}>
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

        {/* HERO — 큰 루미 + 말풍선 */}
        <View style={s.heroSection}>
          <Image source={lumiImage} style={s.lumiHero} />
          <View style={s.heroBubble}>
            <Text style={s.heroBubbleText}>좋은 아침이에요, {name}님!{'\n'}오늘도 함께해요 ☀️</Text>
          </View>
        </View>

        {/* 기분 체크인 */}
        <View style={[s.card, { backgroundColor: '#fff' }]}>
          <View style={s.moodHeader}>
            <Text style={s.cardTitle}>💭 오늘 기분</Text>
            {todayMood !== null && (
              <View style={[s.moodSelected, { backgroundColor: MOOD_BG[todayMood] }]}>
                <Text style={s.moodSelectedTxt}>{MOOD_LABEL[todayMood]}</Text>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.moodRow}>
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
          </ScrollView>
        </View>

        {/* 병원 일정 카드 */}
        {todaySchedule && (
          <TouchableOpacity
            style={[s.card, { backgroundColor: CARD_HOSPITAL }]}
            onPress={() => navigation.navigate('HospitalSchedule', { userId, name })}
            activeOpacity={0.85}
          >
            <View style={s.scheduleTop}>
              <Text style={s.scheduleIcon}>🏥</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.scheduleBadge}>
                  {todaySchedule.date === todayKey ? '오늘 일정' : '다가오는 일정'}
                </Text>
                <Text style={s.scheduleClinic}>{todaySchedule.clinic}</Text>
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
            {todaySchedule.memo ? (
              <Text style={s.scheduleMemo} numberOfLines={1}>{todaySchedule.memo}</Text>
            ) : null}
          </TouchableOpacity>
        )}

        {/* 루미 대화 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: CARD_CHAT }]}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
        >
          <View style={s.chatCardTop}>
            <Image source={lumiImage} style={s.lumiSmall} />
            <Text style={s.cardTitle}>루미와 대화</Text>
          </View>
          <Text style={s.cardSubtitle}>오늘 컨디션 어떠세요?</Text>
          <TouchableOpacity style={s.micButton}>
            <Text style={s.micIcon}>🎤</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 건강 상태 */}
        {healthToday && (
          <TouchableOpacity
            style={[s.card, { backgroundColor: CARD_HEALTH }]}
            onPress={() => navigation.navigate('Health', { userId, name })}
          >
            <Text style={s.cardTitle}>❤️ 건강 상태</Text>
            <Text style={s.healthValue}>혈압 {healthToday.blood_pressure_systolic}/{healthToday.blood_pressure_diastolic}</Text>
            <Text style={s.cardSubtitle}>오늘도 모두 정상이에요</Text>
            <View style={s.healthMetrics}>
              <View style={s.metric}>
                <Text style={s.metricValue}>{healthToday.blood_pressure_systolic}</Text>
                <Text style={s.metricLabel}>혈압</Text>
              </View>
              <View style={s.metric}>
                <Text style={s.metricValue}>{healthToday.blood_sugar}</Text>
                <Text style={s.metricLabel}>혈당</Text>
              </View>
              <View style={s.metric}>
                <Text style={s.metricValue}>{healthToday.heart_rate}</Text>
                <Text style={s.metricLabel}>심박</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 약 알림 */}
        {nextMedication && (
          <TouchableOpacity
            style={[s.card, { backgroundColor: CARD_SCHEDULE }]}
            onPress={() => navigation.navigate('Medication', { userId, name })}
          >
            <Text style={s.cardTitle}>💊 다음 약</Text>
            <Text style={s.cardSubtitle}>2시간 후</Text>
            <Text style={s.medicationText}>점심 12:30, {nextMedication.name} 1정</Text>
          </TouchableOpacity>
        )}

        {/* 보호자 카드 */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: CARD_LOCATION }]}
          onPress={() => navigation.navigate('Guardian', { userId, name })}
          activeOpacity={0.85}
        >
          <View style={s.guardianRow}>
            <Text style={s.guardianIcon}>👨‍👩‍👧</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.guardianTitle}>보호자 연락처</Text>
              <Text style={s.guardianSub}>가족에게 바로 연락할 수 있어요</Text>
            </View>
            <Text style={s.scheduleArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* SOS 버튼 */}
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
    backgroundColor: SKY_TO,
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
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 18,
  },
  lumiHero: {
    width: 210,
    height: 210,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  heroBubble: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    maxWidth: '90%',
  },
  heroBubbleText: {
    fontSize: 22,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
    lineHeight: 32,
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

  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moodSelected: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moodSelectedTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
  },
  moodRow: {
    gap: 10,
    paddingRight: 4,
    paddingBottom: 4,
  },
  moodBtn: {
    width: 76,
    height: 88,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodBtnActive: {
    borderColor: INK,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  moodBtnDim: {
    opacity: 0.35,
  },
  moodEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
  },

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
