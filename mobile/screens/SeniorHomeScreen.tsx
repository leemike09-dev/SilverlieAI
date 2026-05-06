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

const API = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_W = (width - 32 - 10) / 2;

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,       setUserId]       = useState<string>(route?.params?.userId || '');
  const [name,         setName]         = useState<string>(route?.params?.name   || '');
  const [hospSchedule, setHospSchedule] = useState<any>(null);
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
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId)   fetchLatest(storedId);
      startLocationTracking(storedId);
      const hs = await AsyncStorage.getItem('hospital_schedule');
      if (hs) setHospSchedule(JSON.parse(hs));
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
      const today = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const h = new Date().getHours();
        const g    = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        const wish = h < 12 ? '오늘도 건강한 하루 되세요' : h < 18 ? '편안한 오후 되세요' : '편안한 밤 되세요';
        setTimeout(() => speak(`${g}, ${uname}님! ${wish}.`, 0.85), 800);
      } else { ttsDoneRef.current = true; }
    } catch {}
  };

  const now    = new Date();
  const hour   = now.getHours();
  const days   = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
  const h12    = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const minStr = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${minStr}`;
  const weatherEmoji = hour >= 6 && hour < 19 ? '☀️' : '🌙';
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const greetSub = hour < 12
    ? '루미와 함께 건강하고\n행복한 하루 보내세요! 😊'
    : hour < 18 ? '루미와 함께 건강하고\n활기찬 오후 되세요! 😊'
    : '루미가 오늘도 함께했어요\n푹 쉬세요! 😊';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#8EC5E8', '#BBDAF2', '#D8EEF9']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ━━ 상단: Lumi로고 | 날짜 | 시간 ━━ */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 4, 16) }]}>
        <View>
          <Text style={s.lumiLogo}>Lumi</Text>
          <Text style={s.lumiSub}>65+ 건강·일상·친구</Text>
        </View>
        <View style={s.topCenter}>
          <Text style={s.topDateTxt}>📅 {dateStr}</Text>
        </View>
        <View style={s.topTimeBox}>
          <Text style={s.topTimeEmoji}>{weatherEmoji}</Text>
          <Text style={s.topTimeTxt}>{timeStr}</Text>
        </View>
      </View>

      {/* ━━ 히어로: 인사+병원(좌) / 루미(우) ━━ */}
      <View style={s.heroRow}>
        <View style={s.heroLeft}>
          <Text style={s.greetMain}>{weatherEmoji} {greeting}</Text>
          <Text style={s.greetSub}>{greetSub}</Text>

          <TouchableOpacity
            style={s.hospCard}
            onPress={() => navigation.navigate('Guardian', { userId, name })}
            activeOpacity={0.88}
          >
            <View style={s.hospHeader}>
              <Text style={s.hospHeaderIcon}>🏥</Text>
              <Text style={s.hospHeaderTxt}>오늘 병원 일정</Text>
            </View>
            {hospSchedule ? (
              <>
                <Text style={s.hospTime}>{hospSchedule.time || ''}</Text>
                <Text style={s.hospName} numberOfLines={1}>
                  {hospSchedule.hospital || hospSchedule.clinic || ''}
                </Text>
              </>
            ) : (
              <Text style={s.hospNone}>일정 없음</Text>
            )}
            <Text style={s.hospLink}>📍 병원 위치 확인하기  ›</Text>
          </TouchableOpacity>
        </View>

        <Image
          source={require('../assets/lumi10.png')}
          style={s.lumiImg}
          resizeMode="contain"
        />
      </View>

      {/* ━━ 2x2 카드 ━━ */}
      <View style={s.cardGrid}>

        {/* 내 위치 — 다크 네이비 + 초록 아이콘 */}
        <TouchableOpacity style={[s.card, s.cardDark]}
          onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0, userId })}
          activeOpacity={0.88}>
          <View style={[s.cardIcon, { backgroundColor: '#388E3C' }]}>
            <Text style={s.cardIconTxt}>🗺️</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={[s.cardLabel, { color: '#FFFFFF' }]}>내 위치</Text>
            <Text style={[s.cardDesc,  { color: 'rgba(255,255,255,0.72)' }]}>현재 위치를{'\n'}확인하세요</Text>
          </View>
          <View style={[s.cardArrow, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 건강 체크 — 살구 */}
        <TouchableOpacity style={[s.card, s.cardSalmon]}
          onPress={() => navigation.navigate('Health', { userId, name })}
          activeOpacity={0.88}>
          <View style={[s.cardIcon, { backgroundColor: '#EF5350' }]}>
            <Text style={s.cardIconTxt}>💗</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>건강 체크</Text>
            <Text style={s.cardDesc}>혈압·혈당·체온{'\n'}측정하세요</Text>
          </View>
          <View style={[s.cardArrow, { backgroundColor: '#EF5350' }]}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 루미와 대화 — 연보라 */}
        <TouchableOpacity style={[s.card, s.cardPurple]}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
          activeOpacity={0.88}>
          <View style={[s.cardIcon, { backgroundColor: '#8E24AA' }]}>
            <Text style={s.cardIconTxt}>💬</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>루미와 대화</Text>
            <Text style={s.cardDesc}>무엇이든{'\n'}물어보세요</Text>
          </View>
          <View style={[s.cardArrow, { backgroundColor: '#8E24AA' }]}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 보호자 — 연파랑 */}
        <TouchableOpacity style={[s.card, s.cardBlue]}
          onPress={() => navigation.navigate('Guardian', { userId, name })}
          activeOpacity={0.88}>
          <View style={[s.cardIcon, { backgroundColor: '#1E88E5' }]}>
            <Text style={s.cardIconTxt}>👥</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardLabel}>보호자</Text>
            <Text style={s.cardDesc}>가족에게{'\n'}알리기</Text>
          </View>
          <View style={[s.cardArrow, { backgroundColor: '#1E88E5' }]}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </TouchableOpacity>

      </View>

      {/* ━━ SOS ━━ */}
      <TouchableOpacity
        style={s.sosBtn}
        onPress={() => navigation.navigate('SOS', { userId, name })}
        activeOpacity={0.85}
      >
        <Text style={s.sosEmoji}>🚨</Text>
        <View style={s.sosMid}>
          <Text style={s.sosLabel}>SOS 긴급 도움</Text>
          <Text style={s.sosSub}>위급할 때 눌러주세요</Text>
        </View>
        <View style={s.sosPhoneCircle}><Text style={s.sosPhoneTxt}>📞</Text></View>
      </TouchableOpacity>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── 상단 바 ── */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 4,
  },
  lumiLogo: { fontSize: 20, fontWeight: '900', color: '#1A4A8A', fontStyle: 'italic' },
  lumiSub:  { fontSize: 10, color: '#5580A0', fontWeight: '600' },
  topCenter:   { alignItems: 'center' },
  topDateTxt:  { fontSize: 13, fontWeight: '700', color: '#1A4A70' },
  topTimeBox:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  topTimeEmoji:{ fontSize: 18 },
  topTimeTxt:  { fontSize: 24, fontWeight: '900', color: '#1A4A70' },

  /* ── 히어로 행 ── */
  heroRow:  { flexDirection: 'row', alignItems: 'flex-start',
              paddingHorizontal: 16, paddingBottom: 6 },
  heroLeft: { flex: 1, paddingRight: 4 },

  greetMain: { fontSize: 19, fontWeight: '900', color: '#0D2340', lineHeight: 24, marginBottom: 4 },
  greetSub:  { fontSize: 12, color: '#2A5070', fontWeight: '500', lineHeight: 17, marginBottom: 8 },

  /* ── 병원 카드 ── */
  hospCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 11,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  hospHeader:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  hospHeaderIcon:{ fontSize: 13 },
  hospHeaderTxt: { fontSize: 11, fontWeight: '700', color: '#7A90A8', letterSpacing: 0.2 },
  hospTime:      { fontSize: 18, fontWeight: '900', color: '#1565C0', lineHeight: 22 },
  hospName:      { fontSize: 13, fontWeight: '700', color: '#1A2840', marginTop: 2 },
  hospNone:      { fontSize: 13, color: '#A0B4C8', fontWeight: '600', paddingVertical: 3 },
  hospLink:      { fontSize: 11, color: '#1565C0', fontWeight: '600', marginTop: 7 },

  /* ── 루미 ── */
  lumiImg: { width: 152, height: 192, backgroundColor: 'transparent' },

  /* ── 2x2 카드 ── */
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, marginBottom: 10,
  },
  card: {
    width: CARD_W, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardDark:   { backgroundColor: '#1E2E40' },
  cardSalmon: { backgroundColor: '#FFECE9' },
  cardPurple: { backgroundColor: '#EEE4F9' },
  cardBlue:   { backgroundColor: '#E5F0FA' },

  cardIcon:    { width: 40, height: 40, borderRadius: 20,
                 alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardIconTxt: { fontSize: 20 },
  cardBody:    { flex: 1 },
  cardLabel:   { fontSize: 13, fontWeight: '900', color: '#0D2340', marginBottom: 2 },
  cardDesc:    { fontSize: 10, color: '#4A6880', lineHeight: 14 },
  cardArrow:   { width: 22, height: 22, borderRadius: 11,
                 alignItems: 'center', justifyContent: 'center',
                 alignSelf: 'flex-end', flexShrink: 0 },
  arrowTxt:    { fontSize: 14, fontWeight: '900', color: '#fff', lineHeight: 16 },

  /* ── SOS ── */
  sosBtn: {
    marginHorizontal: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E53935', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 20, gap: 14,
    shadowColor: '#B71C1C', shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  sosEmoji:       { fontSize: 30 },
  sosMid:         { flex: 1 },
  sosLabel:       { fontSize: 20, fontWeight: '900', color: '#fff' },
  sosSub:         { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  sosPhoneCircle: { width: 40, height: 40, borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center', justifyContent: 'center' },
  sosPhoneTxt:    { fontSize: 20 },
});
