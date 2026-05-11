import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Alert, Platform, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import * as Location from 'expo-location';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

const LANG_FLAGS: { lang: Language; flag: string }[] = [
  { lang: 'ko', flag: '🇰🇷' },
  { lang: 'zh', flag: '🇨🇳' },
  { lang: 'en', flag: '🇺🇸' },
];

function getLumiGreeting(hour: number, name: string, lang: Language): string {
  const n = name || '';
  if (lang === 'zh') {
    if (hour >= 6  && hour < 10) return `早上好，${n}！祝您今天健康愉快 🌅`;
    if (hour >= 10 && hour < 12) return `上午好！您量血压了吗？💙`;
    if (hour >= 12 && hour < 15) return `午饭吃好了吗？别忘了餐后服药 🤍`;
    if (hour >= 15 && hour < 18) return `下午加油！今天的步数看看吧 🚶`;
    if (hour >= 18 && hour < 21) return `今天辛苦了。是晚餐后的服药时间了 💊`;
    return `今天也注意健康了。好好休息吧 🌙`;
  }
  if (lang === 'en') {
    if (hour >= 6  && hour < 10) return `Good morning, ${n}! Have a healthy day 🌅`;
    if (hour >= 10 && hour < 12) return `Good morning! Have you checked your blood pressure? 💙`;
    if (hour >= 12 && hour < 15) return `Hope lunch was good! Don't forget your after-meal meds 🤍`;
    if (hour >= 15 && hour < 18) return `Keep it up this afternoon! Check today's steps? 🚶`;
    if (hour >= 18 && hour < 21) return `Great work today! Time for your evening medication 💊`;
    return `You took care of your health today. Rest well 🌙`;
  }
  // 한국어 (기본)
  const sfx = n ? `, ${n}님` : '';
  if (hour >= 6  && hour < 10) return `좋은 아침이에요${sfx}!\n오늘도 건강한 하루 시작해요 🌅`;
  if (hour >= 10 && hour < 12) return `오전 잘 보내고 계세요?\n혈압 재셨나요? 💙`;
  if (hour >= 12 && hour < 15) return `점심 맛있게 드셨어요?\n식후 약 잊지 마세요 🤍`;
  if (hour >= 15 && hour < 18) return `오후도 힘내세요!\n오늘 걸음 수 확인해볼까요? 🚶`;
  if (hour >= 18 && hour < 21) return `오늘 하루도 수고하셨어요.\n저녁 약 시간이에요 💊`;
  return `오늘도 건강 잘 지키셨어요.\n푹 쉬세요 🌙`;
}

const API = 'https://silverlieai.onrender.com';
const { width, height } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

// 하단 영역 높이 추정: 카드 2행 + SOS + 탭바
// 카드 1행 높이 ≈ 90px, 2행 = 180 + gap 10 = 190
// SOS ≈ 58px, marginBottom 10
// 탭바 ≈ 60px
// → bottom 고정 높이 = 190 + 68 + 60 = 318
const BOTTOM_H = 318;

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const [userId,       setUserId]       = useState<string>(route?.params?.userId || '');
  const [name,         setName]         = useState<string>(route?.params?.name   || '');
  const ttsDoneRef  = useRef(false);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = async (uid: string) => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await fetch(`${API}/location/update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      const paramId    = route?.params?.userId || '';
      const guestMode  = paramId === 'guest';
      const storedId   = guestMode ? 'guest' : (await AsyncStorage.getItem('userId')   || paramId);
      const storedName = guestMode ? (route?.params?.name || '게스트') : (await AsyncStorage.getItem('userName') || route?.params?.name || '');
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId && storedId !== 'guest') fetchLatest(storedId);
      startLocationTracking(storedId);
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
    return () => { stopSpeech(); if (locationRef.current) clearInterval(locationRef.current); };
  }, []);

  const fetchLatest = async (uid: string) => {
    try {
      const r = await fetch(`${API}/health/records/${uid}`);
      if (!r.ok) return;
      const today         = new Date().toISOString().slice(0, 10);
      const h     = new Date().getHours();
      const slot  = h < 12 ? 'am' : h < 18 ? 'pm' : 'eve';
      const greetKey = `tts_greeting_${today}_${slot}`;
      const alreadyGreeted = await AsyncStorage.getItem(greetKey);
      if (!ttsDoneRef.current && !alreadyGreeted) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem(greetKey, '1');
        const uname = await AsyncStorage.getItem('userName') || '';
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
  const lumiGreeting = getLumiGreeting(hour, name, language);
  const isGuest  = !userId || userId === 'guest';

  return (
    <View style={s.root}>
      <Image source={require('../assets/lumi16.png')} style={s.bg} resizeMode="cover" />
      <View style={s.bgBlur} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── 상단 바 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <View style={s.topLeft}>
          <Text style={s.topGreeting}>{lumiGreeting}</Text>
          <Text style={s.topDate}>{weather} {dateStr} · {timeStr}</Text>
        </View>
        <View style={s.langRow}>
          {LANG_FLAGS.map(({ lang, flag }) => (
            <TouchableOpacity
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[s.flagBtn, language === lang && s.flagBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={s.flagTxt}>{flag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── 히어로 (배경 이미지 노출 영역) ── */}
      <View style={s.hero} />

      {/* ── 하단: 카드 + SOS ── */}
      <View style={s.bottom}>

        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 {t.guestBannerTxt}</Text>
            <Text style={s.guestBtn}>{t.guestBannerBtn}</Text>
          </TouchableOpacity>
        )}

        <View style={s.cardGrid}>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0, userId })}
            activeOpacity={0.88}>
            <LinearGradient colors={['rgba(235,248,255,0.30)', 'rgba(200,235,255,0.30)']} style={s.card}>
              <Text style={s.iconEmoji}>🗺️</Text>
              <Text style={s.cardLabel}>{t.myLocation}</Text>
              <Text style={s.cardDesc}>{t.myLocationDesc}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('Health', { userId, name })}
            activeOpacity={0.88}>
            <LinearGradient colors={['rgba(255,245,248,0.30)', 'rgba(255,220,230,0.30)']} style={s.card}>
              <Text style={s.iconEmoji}>❤️</Text>
              <Text style={s.cardLabel}>{t.healthCheck}</Text>
              <Text style={s.cardDesc}>{t.healthCheckDesc}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.88}>
            <LinearGradient colors={['rgba(247,242,255,0.30)', 'rgba(228,216,255,0.30)']} style={s.card}>
              <Text style={s.iconEmoji}>💬</Text>
              <Text style={s.cardLabel}>{t.lumiChat}</Text>
              <Text style={s.cardDesc}>{t.lumiChatDesc}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardWrap}
            onPress={() => navigation.navigate('Guardian', { userId, name })}
            activeOpacity={0.88}>
            <LinearGradient colors={['rgba(240,255,248,0.30)', 'rgba(210,245,230,0.30)']} style={s.card}>
              <Text style={s.iconEmoji}>👨‍👩‍👧</Text>
              <Text style={s.cardLabel}>{t.guardianMenu}</Text>
              <Text style={s.cardDesc}>{t.guardianMenuDesc}</Text>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('SOS', { userId, name })}
          activeOpacity={0.85}
        >
          <View style={s.sosBtn}>
            <Text style={s.sosEmoji}>🚨</Text>
            <View style={s.sosTxtWrap}>
              <Text style={s.sosLabel}>{t.sosBtnLabel}</Text>
              <Text style={s.sosSub}>{t.sosBtnSub}</Text>
            </View>
            <Text style={s.sosPhone}>📞</Text>
          </View>
        </TouchableOpacity>

      </View>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const CARD_H = Math.min(Math.floor((height - BOTTOM_H - 160) * 0.48), 110);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#87CEEB' },
  bg:   { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgBlur: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.22)' },

  /* 상단 바 */
  topBar: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 6,
  },
  topLeft:     { flex: 1, paddingRight: 12 },
  topGreeting: {
    fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 22,
    textShadowColor: 'rgba(0,30,80,0.30)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  topName: {
    fontSize: 15, color: '#fff', fontWeight: '700', marginTop: 3,
    textShadowColor: 'rgba(0,30,80,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  topRight:  { alignItems: 'flex-end', gap: 3 },
  topDate:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.90)', marginTop: 4 },
  topTime:   { fontSize: 13, fontWeight: '800', color: '#fff' },
  langBar:   { flexDirection: 'row', justifyContent: 'center', gap: 10,
               paddingVertical: 6, paddingHorizontal: 18 },
  langRow:   { flexDirection: 'row', gap: 6, alignItems: 'center' },
  flagBtn:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)' },
  flagBtnActive: { backgroundColor: 'rgba(255,255,255,0.70)' },
  flagTxt:   { fontSize: 20 },

  /* 루미 */
  hero:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 16 },
  lumiImg: { width: width * 0.75, height: '100%' },
  lumiBubble: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 14,
    marginHorizontal: 24, maxWidth: width - 48,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  lumiMsg: { fontSize: 16, fontWeight: '700', color: '#1A3A5C', lineHeight: 24, textAlign: 'center' },

  /* 하단 */
  bottom: { paddingHorizontal: 14, paddingBottom: 10 },

  /* 게스트 */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8,
  },
  guestTxt: { fontSize: 13, fontWeight: '600', color: '#1A4A8A', flex: 1 },
  guestBtn: { fontSize: 13, fontWeight: '800', color: '#1A4A8A' },

  /* 4개 카드 */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 10 },
  cardWrap: { width: CARD_W, borderRadius: 18, overflow: 'hidden' },
  card:     { height: CARD_H, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center', gap: 4 },
  iconEmoji:{ fontSize: 26 },
  cardLabel:{ fontSize: 16, fontWeight: '900', color: '#0D2B5E' },
  cardDesc: { fontSize: 11, color: '#3A5070', fontWeight: '500' },

  /* SOS */
  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(210, 30, 55, 0.45)',
    borderRadius: 18, paddingVertical: 13, paddingHorizontal: 18, gap: 12,
  },
  sosEmoji:   { fontSize: 26 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 19, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 11, color: 'rgba(255,255,255,0.80)', marginTop: 2 },
  sosPhone:   { fontSize: 24 },
});
