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

const API      = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

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
      const d    = await r.json();
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
        const raw2  = await AsyncStorage.getItem('hospital_schedule');
        let msg = `${g}, ${uname}님! 오늘도 건강한 하루 되세요.`;
        if (raw2) {
          const p = JSON.parse(raw2);
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
  const weather  = hour >= 6 && hour < 19 ? '☀️' : '🌙';
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <LinearGradient
      colors={['#4FA8D6', '#74BEE4', '#A8D8F0', '#D4EDF8', '#EEF7FC', '#F8FCFF']}
      locations={[0, 0.15, 0.35, 0.6, 0.82, 1]}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#4FA8D6" />

      {/* ── 구름 레이어 (배경 장식) ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View style={s.cloud1} />
        <View style={s.cloud1b} />
        <View style={s.cloud2} />
        <View style={s.cloud2b} />
        <View style={s.cloud3} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 20 }]}
      >
        {/* ── 상단 바 ── */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View>
            <Text style={s.topTitle}>Lumi</Text>
            <Text style={s.topSub}>65+ 건강·안심·친구</Text>
          </View>
          <View style={s.topRight}>
            <View style={s.topDateRow}>
              <Text style={s.topDate}>{weather}  {dateStr}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', { userId, name })}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.topGear}>⚙️</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* ── 히어로: 인사 + 루미 ── */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroGreet}>{greeting}</Text>
            <Text style={s.heroSub}>
              {name ? `${name}님, ` : ''}오늘도 건강하고{'\n'}행복한 하루 보내세요 💙
            </Text>
            {hospital && (
              <View style={s.hospBadge}>
                <Text style={s.hospTxt}>🏥 오늘 {hospital.time} {hospital.clinic}</Text>
              </View>
            )}
            {steps !== null && (
              <Text style={s.stepsTxt}>👟 {steps.toLocaleString()} 걸음</Text>
            )}
          </View>
          <Image
            source={require('../assets/lumi10.png')}
            style={s.lumiImg}
            resizeMode="contain"
          />
        </View>

        {/* ── 게스트 배너 ── */}
        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}

        {/* ── 4개 카드 ── */}
        <View style={s.cardGrid}>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 })} activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#D6EEFA' }]}>
              <Text style={s.iconEmoji}>📍</Text>
            </View>
            <Text style={s.cardLabel}>내 위치</Text>
            <Text style={s.cardDesc}>내 위치를 확인해요</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#FFE0EA' }]}>
              <Text style={s.iconEmoji}>❤️</Text>
            </View>
            <Text style={s.cardLabel}>건강 체크</Text>
            <Text style={s.cardDesc}>혈압·혈당·체온 확인</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#E8DEFF' }]}>
              <Text style={s.iconEmoji}>💬</Text>
            </View>
            <Text style={s.cardLabel}>루미와 대화</Text>
            <Text style={s.cardDesc}>궁금한 걸 물어보세요</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ImportantContacts', { userId })} activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#D4F5EC' }]}>
              <Text style={s.iconEmoji}>👨‍👩‍👧</Text>
            </View>
            <Text style={s.cardLabel}>보호자</Text>
            <Text style={s.cardDesc}>가족에게 알려드려요</Text>
          </TouchableOpacity>

        </View>

        {/* ── SOS ── */}
        <TouchableOpacity
          style={s.sosBtn}
          onPress={() => navigation.navigate('SOS', { userId, name })}
          activeOpacity={0.85}
        >
          <Text style={s.sosEmoji}>🚨</Text>
          <View style={s.sosTxtWrap}>
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
  root:   { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  /* ── 구름 ── */
  cloud1:  { position: 'absolute', top: 55,  left: -40, width: 200, height: 70,  borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.22)' },
  cloud1b: { position: 'absolute', top: 40,  left: 30,  width: 130, height: 55,  borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)' },
  cloud2:  { position: 'absolute', top: 100, right: -30, width: 180, height: 65, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.18)' },
  cloud2b: { position: 'absolute', top: 88,  right: 30,  width: 110, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.13)' },
  cloud3:  { position: 'absolute', top: 170, left: 60,   width: 140, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.10)' },

  /* ── 상단 바 ── */
  topBar:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 6 },
  topTitle:   { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  topSub:     { fontSize: 12, color: 'rgba(255,255,255,0.88)', fontWeight: '600', marginTop: 1 },
  topRight:   { alignItems: 'flex-end', gap: 2 },
  topDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topDate:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  topGear:    { fontSize: 18 },
  topTime:    { fontSize: 22, fontWeight: '900', color: '#fff' },

  /* ── 히어로 ── */
  hero: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 4,
  },
  heroLeft:  { flex: 1, gap: 8 },
  heroGreet: {
    fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28,
    textShadowColor: 'rgba(0,30,80,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroSub:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', lineHeight: 19 },
  lumiImg:  { width: 220, height: 245 },

  hospBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  hospTxt:  { fontSize: 13, fontWeight: '700', color: '#1A5276' },
  stepsTxt: { fontSize: 13, color: 'rgba(255,255,255,0.88)', fontWeight: '600' },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12,
  },
  guestTxt: { fontSize: 13, fontWeight: '600', color: '#1A4A8A', flex: 1 },
  guestBtn: { fontSize: 13, fontWeight: '800', color: '#1A4A8A' },

  /* ── 4개 카드 ── */
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: CARD_GAP, marginBottom: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 20, paddingHorizontal: 16, gap: 8,
    shadowColor: '#2A7AA8', shadowOpacity: 0.13,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  iconEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 22, fontWeight: '900', color: '#0D2B5E' },
  cardDesc:  { fontSize: 14, color: '#607D8B', fontWeight: '500', lineHeight: 19 },

  /* ── SOS ── */
  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20, gap: 14,
    shadowColor: '#B71C1C', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sosEmoji:   { fontSize: 32 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosPhone:   { fontSize: 28 },
});
