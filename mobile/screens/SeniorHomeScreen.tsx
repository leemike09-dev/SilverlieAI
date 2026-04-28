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

const API   = 'https://silverlieai.onrender.com';
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

      const today = new Date().toISOString().slice(0, 10);
      const raw   = await AsyncStorage.getItem('hospital_schedule');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.date === today) setHospital({ time: p.time, clinic: p.clinic });
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
        const raw   = await AsyncStorage.getItem('hospital_schedule');
        let msg = `${g}, ${uname}님! 오늘도 건강한 하루 되세요.`;
        if (raw) {
          const p = JSON.parse(raw);
          if (p.date === today) msg += ` 오늘 ${p.time} ${p.clinic} 가시는 날이에요.`;
        }
        setTimeout(() => speak(msg, 0.85), 800);
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
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const weather = hour >= 6 && hour < 19 ? '☀️' : '🌙';
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2176AE" />

      {/* ══ 파란 상단 구역 ══ */}
      <LinearGradient
        colors={['#2176AE', '#3A9BD5', '#5BB8F5']}
        locations={[0, 0.55, 1]}
        style={[s.blueZone, { paddingTop: Math.max(insets.top + 10, 22) }]}
      >
        {/* 상단 바 */}
        <View style={s.topBar}>
          <View>
            <Text style={s.topTitle}>Lumi</Text>
            <Text style={s.topSub}>65+ 건강·안심·친구</Text>
          </View>
          <View style={s.topRight}>
            <Text style={s.topDate}>{weather}  {dateStr}</Text>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* 인사 텍스트 */}
        <View style={s.greetArea}>
          <Text style={s.greetMain}>{greeting}</Text>
          <Text style={s.greetSub}>
            {name ? `${name}님, ` : ''}오늘도 건강하고 행복한 하루 보내세요 💙
          </Text>
          {hospital && (
            <View style={s.hospBadge}>
              <Text style={s.hospBadgeTxt}>🏥 오늘 {hospital.time} {hospital.clinic}</Text>
            </View>
          )}
          {steps !== null && (
            <Text style={s.stepsTxt}>👟 오늘 {steps.toLocaleString()} 걸음</Text>
          )}
        </View>
      </LinearGradient>

      {/* ══ 루미 캐릭터 — 두 구역 경계에 떠 있음 ══ */}
      <Image source={LUMI_IMG} style={s.lumiFloat} resizeMode="contain" />

      {/* ══ 화이트 하단 구역 (스크롤) ══ */}
      <View style={s.whiteZone}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scrollContent, { paddingBottom: 16 }]}
        >
          {/* 캐릭터 공간 확보 */}
          <View style={{ height: 90 }} />

          {/* 게스트 배너 */}
          {isGuest && (
            <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
              <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
              <Text style={s.guestBtn}>로그인 →</Text>
            </TouchableOpacity>
          )}

          {/* ══ 4개 카드 ══ */}
          <View style={s.cardGrid}>

            <TouchableOpacity
              style={[s.card, { backgroundColor: '#1565C0' }]}
              onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 })}
              activeOpacity={0.85}
            >
              <Text style={s.cardEmoji}>📍</Text>
              <Text style={s.cardLabel}>내 위치</Text>
              <Text style={s.cardDesc}>내 위치를 확인해요</Text>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.card, { backgroundColor: '#AD1457' }]}
              onPress={() => navigation.navigate('Health', { userId, name })}
              activeOpacity={0.85}
            >
              <Text style={s.cardEmoji}>❤️</Text>
              <Text style={s.cardLabel}>건강 체크</Text>
              <Text style={s.cardDesc}>혈압·혈당·체온 확인</Text>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.card, { backgroundColor: '#6A1B9A' }]}
              onPress={() => navigation.navigate('AIChat', { userId, name })}
              activeOpacity={0.85}
            >
              <Text style={s.cardEmoji}>💬</Text>
              <Text style={s.cardLabel}>루미와 대화</Text>
              <Text style={s.cardDesc}>궁금한 걸 물어보세요</Text>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.card, { backgroundColor: '#00695C' }]}
              onPress={() => navigation.navigate('ImportantContacts', { userId })}
              activeOpacity={0.85}
            >
              <Text style={s.cardEmoji}>👨‍👩‍👧</Text>
              <Text style={s.cardLabel}>보호자</Text>
              <Text style={s.cardDesc}>가족에게 알려드려요</Text>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>

          </View>

          {/* ══ SOS ══ */}
          <TouchableOpacity
            style={s.sosBtn}
            onPress={() => navigation.navigate('SOS', { userId, name })}
            activeOpacity={0.85}
          >
            <Text style={s.sosEmoji}>🚨</Text>
            <View style={s.sosTxt}>
              <Text style={s.sosLabel}>SOS 긴급 도움</Text>
              <Text style={s.sosSub}>위급할 때 눌러주세요</Text>
            </View>
            <Text style={s.sosPhone}>📞</Text>
          </TouchableOpacity>

          {/* ══ 루미와 대화하기 ══ */}
          <TouchableOpacity
            style={s.chatCard}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.88}
          >
            <View style={s.chatLeft}>
              <Text style={s.chatTitle}>루미와 대화하기</Text>
              <Text style={s.chatSub}>말이 필요할 때 대화해요</Text>
            </View>
            <View style={s.chatBtn}>
              <Text style={s.chatBtnTxt}>🔊 말하기</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
      </View>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const BLUE_H = 200; // 파란 구역 높이
const LUMI_W = 200;
const LUMI_H = 230;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  /* ── 파란 상단 구역 ── */
  blueZone: {
    height: BLUE_H,
    paddingHorizontal: 20,
  },

  /* ── 상단 바 ── */
  topBar: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  topTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  topSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 1 },
  topRight: { alignItems: 'flex-end', gap: 2 },
  topDate:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  topTime:  { fontSize: 22, fontWeight: '900', color: '#fff' },

  /* ── 인사 영역 ── */
  greetArea: { gap: 6 },
  greetMain: {
    fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34,
    textShadowColor: 'rgba(0,0,50,0.12)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  greetSub: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600', lineHeight: 21 },
  hospBadge: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginTop: 2,
  },
  hospBadgeTxt: { fontSize: 13, fontWeight: '700', color: '#1A5276' },
  stepsTxt:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  /* ── 루미 캐릭터 (절대 위치) ── */
  lumiFloat: {
    position: 'absolute',
    right: 10,
    top: BLUE_H - LUMI_H + 20,   // 파란 구역과 흰 구역에 걸쳐 떠 있음
    width: LUMI_W,
    height: LUMI_H,
    zIndex: 10,
  },

  /* ── 화이트 하단 구역 ── */
  whiteZone: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    overflow: 'hidden',
  },
  scrollContent: { paddingHorizontal: 16 },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EEF5FF',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 12,
  },
  guestTxt: { fontSize: 14, fontWeight: '600', color: '#1565C0', flex: 1 },
  guestBtn: { fontSize: 14, fontWeight: '800', color: '#1565C0' },

  /* ── 4개 카드 ── */
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: CARD_GAP, marginBottom: 12,
  },
  card: {
    width: CARD_W, borderRadius: 22,
    paddingVertical: 20, paddingHorizontal: 16,
    gap: 6,
    shadowColor: '#000', shadowOpacity: 0.14,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardEmoji: { fontSize: 30 },
  cardLabel: { fontSize: 20, fontWeight: '900', color: '#fff' },
  cardDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  cardArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: 4 },

  /* ── SOS ── */
  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20,
    gap: 14, marginBottom: 12,
    shadowColor: '#B71C1C', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  sosEmoji: { fontSize: 32 },
  sosTxt:   { flex: 1 },
  sosLabel: { fontSize: 22, fontWeight: '900', color: '#fff' },
  sosSub:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosPhone: { fontSize: 28 },

  /* ── 루미와 대화 ── */
  chatCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18,
    gap: 12,
    shadowColor: '#1565C0', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chatLeft:   { flex: 1 },
  chatTitle:  { fontSize: 18, fontWeight: '900', color: '#0D2B5E' },
  chatSub:    { fontSize: 13, color: '#546E7A', marginTop: 3 },
  chatBtn: {
    backgroundColor: '#1565C0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  chatBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
