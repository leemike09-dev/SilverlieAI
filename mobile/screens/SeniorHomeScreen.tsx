import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Image, Alert, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import * as Location from 'expo-location';

const API      = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name,   setName]   = useState<string>(route?.params?.name   || '');
  const ttsDoneRef  = useRef(false);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = async (uid: string) => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await fetch(`${API}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:  uid,
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          activity: 'unknown',
        }),
      });
    } catch {}
  };

  const startLocationTracking = async (uid: string) => {
    if (!uid || uid === 'guest') return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    sendLocation(uid);
    locationRef.current = setInterval(() => sendLocation(uid), 5 * 60 * 1000);
  };

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId) fetchLatest(storedId);
      startLocationTracking(storedId);
      // 만보계 안내 팝업 — 최초 1회만
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
                {
                  text: '허용하기', onPress: async () => {
                    try {
                      const { Pedometer } = await import('expo-sensors');
                      await Pedometer.requestPermissionsAsync();
                    } catch {}
                  }
                },
              ]
            );
          }, 1500);
        }
      }
    };
    init();
    return () => {
      stopSpeech();
      if (locationRef.current) clearInterval(locationRef.current);
    };
  }, []);

  const fetchLatest = async (uid: string) => {
    try {
      const r = await fetch(`${API}/health/records/${uid}`);
      if (!r.ok) return;
      const today         = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const h     = new Date().getHours();
        const g     = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        const wish  = h < 12 ? '오늘도 건강한 하루 되세요' : h < 18 ? '편안한 오후 되세요' : '편안한 밤 되세요';
        const raw2  = await AsyncStorage.getItem('hospital_schedule');
        let msg = `${g}, ${uname}님! ${wish}.`;
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
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
  const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const weather  = hour >= 6 && hour < 19 ? '☀️' : '🌙';
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <View style={s.root}>
      <Image source={require('../assets/lumi16.png')} style={s.bg} resizeMode="cover" />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── 상단 바 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <View style={s.topLeft}>
          <Text style={s.topGreeting}>{greeting}</Text>
          {name ? <Text style={s.topName}>{name}님, 반가워요 👋</Text> : null}
        </View>
        <View style={s.topRight}>
          <Text style={s.topDate}>{weather} {dateStr}</Text>
          <Text style={s.topTime}>{timeStr}</Text>
        </View>
      </View>

      <View style={s.hero} />

      {/* ── 하단 고정 영역 ── */}
      <View style={s.bottom}>

        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}

        <View style={s.cardGrid}>
          <TouchableOpacity style={s.cardWrap} onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0, userId })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(245,251,255,0.45)', 'rgba(214,238,250,0.45)']} style={s.card}>
              <Text style={s.iconEmoji}>🗺️</Text>
              <Text style={s.cardLabel}>내 위치</Text>
              <Text style={s.cardDesc}>내 위치를 확인해요</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap} onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(255,248,250,0.45)', 'rgba(255,224,234,0.45)']} style={s.card}>
              <Text style={s.iconEmoji}>❤️</Text>
              <Text style={s.cardLabel}>건강 체크</Text>
              <Text style={s.cardDesc}>혈압·혈당·체온 확인</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap} onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(247,244,255,0.45)', 'rgba(232,222,255,0.45)']} style={s.card}>
              <Text style={s.iconEmoji}>💬</Text>
              <Text style={s.cardLabel}>루미와 대화</Text>
              <Text style={s.cardDesc}>궁금한 걸 물어보세요</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap} onPress={() => navigation.navigate('Guardian', { userId, name })} activeOpacity={0.88}>
            <LinearGradient colors={['rgba(242,252,248,0.45)', 'rgba(212,245,236,0.45)']} style={s.card}>
              <Text style={s.iconEmoji}>👨‍👩‍👧</Text>
              <Text style={s.cardLabel}>보호자</Text>
              <Text style={s.cardDesc}>가족에게 알려드려요</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

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

      </View>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#87CEEB' },
  bg:   { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  /* ── 상단 바 ── */
  topBar:      {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 6,
  },
  topLeft:     { flexShrink: 1, paddingRight: 10 },
  topGreeting: {
    fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,30,80,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  topName: {
    fontSize: 18, color: '#fff', fontWeight: '700', marginTop: 4,
    textShadowColor: 'rgba(0,30,80,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  topRight:  { alignItems: 'flex-end', gap: 4 },
  topDate:   { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },
  topTime:   { fontSize: 16, fontWeight: '800', color: '#fff' },

  /* ── 루미 캐릭터 ── */
  hero:    { flex: 1 },

  /* ── 하단 고정 ── */
  bottom: { paddingHorizontal: 14, paddingBottom: 10 },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 10,
  },
  guestTxt: { fontSize: 13, fontWeight: '600', color: '#1A4A8A', flex: 1 },
  guestBtn: { fontSize: 13, fontWeight: '800', color: '#1A4A8A' },

  /* ── 4개 카드 (반투명) ── */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 10 },
  cardWrap: { width: CARD_W, borderRadius: 20, overflow: 'hidden' },
  card:     { paddingVertical: 16, paddingHorizontal: 14, gap: 6 },
  iconEmoji:{ fontSize: 28 },
  cardLabel:{ fontSize: 18, fontWeight: '900', color: '#0D2B5E' },
  cardDesc: { fontSize: 12, color: '#3A5070', fontWeight: '500', lineHeight: 17 },

  /* ── SOS ── */
  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18, gap: 12,
    shadowColor: '#B71C1C', shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  sosEmoji:   { fontSize: 28 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 20, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosPhone:   { fontSize: 26 },
});
