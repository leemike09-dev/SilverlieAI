import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Image, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

const LUMI_IMG = require('../assets/lumi10.png');

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const [userId,   setUserId]   = useState<string>(route?.params?.userId || '');
  const [name,     setName]     = useState<string>(route?.params?.name   || '');
  const [steps,    setSteps]    = useState<number | null>(null);
  const [hospital, setHospital] = useState<{ time: string; clinic: string } | null>(null);
  const ttsDoneRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);

      // 오늘 병원 일정 확인
      const today    = new Date().toISOString().slice(0, 10);
      const raw      = await AsyncStorage.getItem('hospital_schedule');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) setHospital({ time: parsed.time, clinic: parsed.clinic });
      }

      if (storedId) fetchLatest(storedId);
    };
    init();
    return () => stopSpeech();
  }, []);

  const fetchLatest = async (uid: string) => {
    try {
      const r = await fetch(`${API}/health/records/${uid}`);
      if (!r.ok) return;
      const d = await r.json();
      const recs: any[] = d.records || [];
      if (recs.length > 0 && recs[0].steps) setSteps(recs[0].steps);

      const today         = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const h     = new Date().getHours();
        const g     = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

        // 병원 일정이 있으면 TTS에 포함
        const raw = await AsyncStorage.getItem('hospital_schedule');
        let ttsMsg = `${g}, ${uname}님! 오늘도 건강한 하루 되세요.`;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === today) {
            ttsMsg += ` 오늘 ${parsed.time}에 병원 가시는 날이에요.`;
          }
        }
        setTimeout(() => speak(ttsMsg, 0.85), 800);
      } else {
        ttsDoneRef.current = true;
      }
    } catch {}
  };

  const now     = new Date();
  const hour    = now.getHours();
  const days    = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일(${days[now.getDay()]})`;
  const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm    = hour < 12 ? '오전' : '오후';
  const timeStr = `${ampm} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const weather = hour >= 6 && hour < 19 ? '☀️' : '🌙';

  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const greetSub = '루미와 함께 건강하고\n행복한 하루 보내세요! 💛';
  const isGuest  = !userId || userId === 'guest';

  return (
    <LinearGradient
      colors={['#6BB8E0', '#9DD0EE', '#C8E8F7', '#EAF5FC']}
      locations={[0, 0.25, 0.6, 1]}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#6BB8E0" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* ══ 상단 바 ══ */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View>
            <Text style={s.topTitle}>Lumi</Text>
            <Text style={s.topSub}>65+ 건강·안심·친구</Text>
          </View>
          <View style={s.topRight}>
            <View style={s.topWeatherRow}>
              <Text style={s.topWeather}>{weather}</Text>
              <Text style={s.topDate}>{dateStr}</Text>
            </View>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* ══ 히어로: 인사 + 캐릭터 ══ */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroGreet}>{greeting}</Text>
            <Text style={s.heroSub}>{greetSub}</Text>

            {/* 병원 일정 (있을 때만) */}
            {hospital && (
              <View style={s.hospitalBadge}>
                <Text style={s.hospitalIcon}>🏥</Text>
                <Text style={s.hospitalTxt}>
                  오늘 {hospital.time} {hospital.clinic}
                </Text>
              </View>
            )}

            {/* 걸음 수 */}
            {steps !== null && (
              <Text style={s.stepsTxt}>👟 {steps.toLocaleString()} 걸음</Text>
            )}
          </View>

          <Image
            source={LUMI_IMG}
            style={s.lumiImg}
            resizeMode="contain"
          />
        </View>

        {/* ══ 게스트 배너 ══ */}
        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}

        {/* ══ 4개 카드 그리드 ══ */}
        <View style={s.cardGrid}>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 })} activeOpacity={0.85}>
            <View style={[s.cardIconWrap, { backgroundColor: '#D0EEF5' }]}>
              <Text style={s.cardIconTxt}>📍</Text>
            </View>
            <Text style={s.cardLabel}>내 위치</Text>
            <Text style={s.cardDesc}>내 위치를 확인해요</Text>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.85}>
            <View style={[s.cardIconWrap, { backgroundColor: '#FFE0E0' }]}>
              <Text style={s.cardIconTxt}>❤️</Text>
            </View>
            <Text style={s.cardLabel}>건강 체크</Text>
            <Text style={s.cardDesc}>혈압·혈당·체온 확인</Text>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.85}>
            <View style={[s.cardIconWrap, { backgroundColor: '#E8E0FF' }]}>
              <Text style={s.cardIconTxt}>💬</Text>
            </View>
            <Text style={s.cardLabel}>루미와 대화</Text>
            <Text style={s.cardDesc}>궁금한 걸 물어보세요</Text>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ImportantContacts', { userId })} activeOpacity={0.85}>
            <View style={[s.cardIconWrap, { backgroundColor: '#D8EEFF' }]}>
              <Text style={s.cardIconTxt}>👨‍👩‍👧</Text>
            </View>
            <Text style={s.cardLabel}>보호자</Text>
            <Text style={s.cardDesc}>가족에게 알려드려요</Text>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>

        </View>

        {/* ══ SOS 긴급 도움 ══ */}
        <TouchableOpacity style={s.sosBtn} onPress={() => navigation.navigate('SOS', { userId, name })} activeOpacity={0.85}>
          <Text style={s.sosEmoji}>🚨</Text>
          <View style={s.sosTxt}>
            <Text style={s.sosLabel}>SOS 긴급 도움</Text>
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
  root: { flex: 1 },

  /* ── 상단 바 ── */
  topBar: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  topTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,50,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  topSub:   { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 1 },
  topRight: { alignItems: 'flex-end', gap: 2 },
  topWeatherRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topWeather: { fontSize: 18 },
  topDate:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  topTime:  { fontSize: 24, fontWeight: '900', color: '#fff',
    textShadowColor: 'rgba(0,0,50,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  /* ── 히어로 ── */
  hero: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    minHeight: 160,
  },
  heroLeft:  { flex: 1, gap: 8, paddingRight: 8 },
  heroGreet: { fontSize: 30, fontWeight: '900', color: '#fff', lineHeight: 36,
    textShadowColor: 'rgba(0,0,50,0.12)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroSub:   { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.92)', lineHeight: 22 },
  lumiImg:   { width: 150, height: 160 },

  /* 병원 배지 */
  hospitalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  hospitalIcon: { fontSize: 16 },
  hospitalTxt:  { fontSize: 13, fontWeight: '700', color: '#1A5276' },

  stepsTxt: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 16, paddingVertical: 9,
    marginHorizontal: 16, borderRadius: 12, marginBottom: 8,
  },
  guestTxt: { fontSize: 14, fontWeight: '600', color: '#1A5276', flex: 1 },
  guestBtn: { fontSize: 14, fontWeight: '800', color: '#0D47A1' },

  /* ── 4개 카드 그리드 ── */
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: CARD_GAP, paddingHorizontal: 16, marginBottom: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18, paddingHorizontal: 16,
    gap: 6,
    shadowColor: '#0D47A1', shadowOpacity: 0.10,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  cardIconTxt: { fontSize: 26 },
  cardLabel:   { fontSize: 20, fontWeight: '900', color: '#0D2B5E' },
  cardDesc:    { fontSize: 13, color: '#607D8B', fontWeight: '500', lineHeight: 18 },
  cardArrow:   { fontSize: 22, color: '#90A4AE', fontWeight: '700', marginTop: 2 },

  /* ── SOS ── */
  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 20, marginHorizontal: 16,
    paddingVertical: 18, paddingHorizontal: 20,
    gap: 14,
    shadowColor: '#C62828', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  sosEmoji: { fontSize: 34 },
  sosTxt:   { flex: 1 },
  sosLabel: { fontSize: 22, fontWeight: '900', color: '#fff' },
  sosSub:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '500' },
  sosPhone: { fontSize: 28 },
});
