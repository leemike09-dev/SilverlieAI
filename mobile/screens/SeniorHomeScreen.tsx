import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Alert, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import * as Location from 'expo-location';

const API = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

const LUMI_PROMPTS = [
  '오늘 몸 상태는 어떠세요?',
  '혈압이 걱정되시나요?',
  '약 복용 시간이 궁금하신가요?',
  '오늘 식사는 하셨나요?',
  '무엇이든 편하게 물어보세요',
];

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,  setUserId]  = useState<string>(route?.params?.userId || '');
  const [name,    setName]    = useState<string>(route?.params?.name   || '');
  const [prompt,  setPrompt]  = useState(LUMI_PROMPTS[0]);
  const ttsDoneRef  = useRef(false);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId) fetchLatest(storedId);
      startLocationTracking(storedId);

      // 오늘 날짜 기준으로 프롬프트 고정
      const dayIdx = new Date().getDay();
      setPrompt(LUMI_PROMPTS[dayIdx % LUMI_PROMPTS.length]);

      if (Platform.OS !== 'web') {
        const asked = await AsyncStorage.getItem('pedometer_asked');
        if (!asked) {
          await AsyncStorage.setItem('pedometer_asked', '1');
          setTimeout(() => {
            Alert.alert(
              '🚶 걸음수 자동 측정',
              '스마트폰으로 오늘 걸음수를 자동으로 측정할 수 있어요.\n건강 기록 화면에서 걸음수를 바로 확인하세요.',
              [
                { text: '나중에', style: 'cancel' },
                { text: '허용하기', onPress: async () => {
                    try { const { Pedometer } = await import('expo-sensors'); await Pedometer.requestPermissionsAsync(); } catch {}
                  }
                },
              ]
            );
          }, 1500);
        }
      }
    };
    init();
    return () => { stopSpeech(); if (locationRef.current) clearInterval(locationRef.current); };
  }, []);

  const fetchLatest = async (uid: string) => {
    try {
      const r = await fetch(`${API}/health/records/${uid}`);
      if (!r.ok) return;
      const today = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const h = new Date().getHours();
        const g = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        const wish = h < 12 ? '오늘도 건강한 하루 되세요' : h < 18 ? '편안한 오후 되세요' : '편안한 밤 되세요';
        const raw2 = await AsyncStorage.getItem('hospital_schedule');
        let msg = `${g}, ${uname}님! ${wish}.`;
        if (raw2) { const p = JSON.parse(raw2); if (p.date === today) msg += ` 오늘 ${p.time} ${p.clinic} 가시는 날이에요.`; }
        setTimeout(() => speak(msg, 0.85), 800);
      } else {
        ttsDoneRef.current = true;
      }
    } catch {}
  };

  const now     = new Date();
  const hour    = now.getHours();
  const days    = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
  const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#5C6BC0', '#7986CB', '#9FA8DA']} style={StyleSheet.absoluteFill} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingTop: Math.max(insets.top + 16, 28) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 상단: 인사 + 날짜 ── */}
        <View style={s.topBar}>
          <View>
            <Text style={s.topGreeting}>{greeting}</Text>
            {name ? <Text style={s.topName}>{name}님, 반가워요 👋</Text> : null}
          </View>
          <View style={s.topRight}>
            <Text style={s.topDate}>{dateStr}</Text>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* ── 게스트 배너 ── */}
        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}

        {/* ── 루미 메인 카드 ── */}
        <TouchableOpacity
          style={s.lumiCardWrap}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
          activeOpacity={0.88}
        >
          <LinearGradient colors={['#fff', '#F3F4FF']} style={s.lumiCard}>
            <View style={s.lumiTop}>
              <View style={s.lumiAvatar}>
                <Text style={s.lumiAvatarTxt}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lumiName}>루미에게 물어보세요</Text>
                <Text style={s.lumiSub}>AI 건강 상담사</Text>
              </View>
              <Text style={s.lumiArrow}>›</Text>
            </View>
            <View style={s.lumiPromptBox}>
              <Text style={s.lumiPromptQuote}>"</Text>
              <Text style={s.lumiPromptTxt}>{prompt}</Text>
            </View>
            <View style={s.lumiFooter}>
              <Text style={s.lumiFooterTxt}>탭하여 대화 시작하기</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── 기능 카드 4개 ── */}
        <View style={s.cardGrid}>
          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']} style={s.card}>
              <Text style={s.cardEmoji}>❤️</Text>
              <Text style={s.cardLabel}>건강 체크</Text>
              <Text style={s.cardDesc}>혈압·혈당·체온</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('Medications', { userId, name })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']} style={s.card}>
              <Text style={s.cardEmoji}>💊</Text>
              <Text style={s.cardLabel}>약 확인</Text>
              <Text style={s.cardDesc}>복약 일정 관리</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0, userId })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']} style={s.card}>
              <Text style={s.cardEmoji}>🗺️</Text>
              <Text style={s.cardLabel}>내 위치</Text>
              <Text style={s.cardDesc}>오늘 동선 확인</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('Guardian', { userId, name })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']} style={s.card}>
              <Text style={s.cardEmoji}>👨‍👩‍👧</Text>
              <Text style={s.cardLabel}>보호자</Text>
              <Text style={s.cardDesc}>가족 알림</Text>
            </LinearGradient>
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
          <Text style={s.sosArrow}>📞</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const CARD_W = (width - 32 - 10) / 2;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#5C6BC0' },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  /* 상단 바 */
  topBar:      { flexDirection: 'row', justifyContent: 'space-between',
                 alignItems: 'flex-start', marginBottom: 20 },
  topGreeting: { fontSize: 22, fontWeight: '900', color: '#fff' },
  topName:     { fontSize: 16, color: 'rgba(255,255,255,0.88)', fontWeight: '600', marginTop: 4 },
  topRight:    { alignItems: 'flex-end', gap: 4 },
  topDate:     { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  topTime:     { fontSize: 16, fontWeight: '800', color: '#fff' },

  /* 게스트 배너 */
  guestBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
                 paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  guestTxt:    { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  guestBtn:    { fontSize: 14, fontWeight: '800', color: '#FFD600' },

  /* 루미 메인 카드 */
  lumiCardWrap: { borderRadius: 22, overflow: 'hidden', marginBottom: 14,
                  shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  lumiCard:     { padding: 20 },
  lumiTop:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  lumiAvatar:   { width: 52, height: 52, borderRadius: 26, backgroundColor: '#5C6BC0',
                  alignItems: 'center', justifyContent: 'center' },
  lumiAvatarTxt:{ fontSize: 26 },
  lumiName:     { fontSize: 20, fontWeight: '900', color: '#16273E' },
  lumiSub:      { fontSize: 13, color: '#7A90A8', marginTop: 2 },
  lumiArrow:    { fontSize: 28, color: '#C5C9E8' },
  lumiPromptBox:{ backgroundColor: '#F3F6FF', borderRadius: 14, padding: 16,
                  flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 14 },
  lumiPromptQuote:{ fontSize: 28, color: '#5C6BC0', lineHeight: 28, fontWeight: '900' },
  lumiPromptTxt:{ fontSize: 18, color: '#16273E', fontWeight: '600', flex: 1, lineHeight: 26, paddingTop: 4 },
  lumiFooter:   { alignItems: 'center' },
  lumiFooterTxt:{ fontSize: 14, color: '#5C6BC0', fontWeight: '700' },

  /* 4개 소카드 */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  cardWrap: { width: CARD_W, borderRadius: 18, overflow: 'hidden' },
  card:     { paddingVertical: 18, paddingHorizontal: 14, gap: 6, alignItems: 'flex-start' },
  cardEmoji:{ fontSize: 30 },
  cardLabel:{ fontSize: 17, fontWeight: '800', color: '#fff' },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  /* SOS */
  sosBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C62828',
               borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, gap: 14,
               shadowColor: '#7B0000', shadowOpacity: 0.35, shadowRadius: 8,
               shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  sosEmoji:  { fontSize: 30 },
  sosTxtWrap:{ flex: 1 },
  sosLabel:  { fontSize: 20, fontWeight: '900', color: '#fff' },
  sosSub:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sosArrow:  { fontSize: 28 },
});
