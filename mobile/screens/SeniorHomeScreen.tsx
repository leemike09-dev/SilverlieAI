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
const CARD_W = (width - 32 - 12) / 2;

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
          setTimeout(() => {
            Alert.alert('🚶 걸음수 자동 측정', '스마트폰으로 오늘 걸음수를 자동으로 측정할 수 있어요.', [
              { text: '나중에', style: 'cancel' },
              { text: '허용하기', onPress: async () => {
                try { const { Pedometer } = await import('expo-sensors'); await Pedometer.requestPermissionsAsync(); } catch {}
              }},
            ]);
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
        const g    = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        const wish = h < 12 ? '오늘도 건강한 하루 되세요' : h < 18 ? '편안한 오후 되세요' : '편안한 밤 되세요';
        setTimeout(() => speak(`${g}, ${uname}님! ${wish}.`, 0.85), 800);
      } else { ttsDoneRef.current = true; }
    } catch {}
  };

  const now     = new Date();
  const hour    = now.getHours();
  const days    = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
  const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const weatherEmoji = hour >= 6 && hour < 19 ? '☀️' : '🌙';
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#8EC8E8', '#B8DCEE', '#DFF2FA']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── 상단: 날짜 + 시간 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <Text style={s.topDate}>📅 {dateStr}</Text>
        <Text style={s.topTime}>{weatherEmoji} {timeStr}</Text>
      </View>

      {/* ── 메인 영역: flex 1 ── */}
      <View style={s.body}>

        {/* 게스트 배너 */}
        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}

        {/* ── 상단 히어로: 좌(인사+병원) / 우(루미) ── */}
        <View style={s.heroRow}>

          {/* 좌: 인사 + 병원 카드 */}
          <View style={s.heroLeft}>
            <Text style={s.greetMain}>{greeting}</Text>
            <Text style={s.greetSub}>
              {name ? `${name}님,\n루미가 함께할게요 💛` : '루미가\n오늘도 함께할게요 💛'}
            </Text>

            {/* 병원 일정 카드 */}
            <TouchableOpacity
              style={s.hospCard}
              onPress={() => navigation.navigate('Guardian', { userId, name })}
              activeOpacity={0.88}
            >
              <View style={s.hospTop}>
                <Text style={s.hospIcon}>🏥</Text>
                <Text style={s.hospTitle}>병원 일정</Text>
              </View>
              {hospSchedule ? (
                <>
                  <Text style={s.hospTime}>{hospSchedule.time || ''}</Text>
                  <Text style={s.hospName} numberOfLines={1}>
                    {hospSchedule.hospital || hospSchedule.clinic || ''}
                  </Text>
                </>
              ) : (
                <Text style={s.hospEmpty}>오늘 일정 없음</Text>
              )}
              <Text style={s.hospLink}>일정 보기 →</Text>
            </TouchableOpacity>
          </View>

          {/* 우: 루미 캐릭터 */}
          <Image
            source={require('../assets/lumi8.png')}
            style={s.lumiImg}
            resizeMode="contain"
          />
        </View>

        {/* ── 기능 카드 2x2 ── */}
        <View style={s.cardGrid}>
          <TouchableOpacity style={[s.card, { backgroundColor: '#E8F5E9' }]}
            onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0, userId })}
            activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#4CAF50' }]}><Text style={s.iconTxt}>🗺️</Text></View>
            <View style={s.cardTexts}>
              <Text style={s.cardLabel}>내 위치</Text>
              <Text style={s.cardDesc}>현재 위치 확인</Text>
            </View>
            <View style={[s.arrowCircle, { backgroundColor: '#4CAF50' }]}><Text style={s.arrowTxt}>›</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.card, { backgroundColor: '#FFF3E0' }]}
            onPress={() => navigation.navigate('Health', { userId, name })}
            activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#FF9800' }]}><Text style={s.iconTxt}>❤️</Text></View>
            <View style={s.cardTexts}>
              <Text style={s.cardLabel}>건강 체크</Text>
              <Text style={s.cardDesc}>혈압·혈당·체온</Text>
            </View>
            <View style={[s.arrowCircle, { backgroundColor: '#FF9800' }]}><Text style={s.arrowTxt}>›</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.card, { backgroundColor: '#F3E5F5' }]}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#9C27B0' }]}><Text style={s.iconTxt}>💬</Text></View>
            <View style={s.cardTexts}>
              <Text style={s.cardLabel}>루미와 대화</Text>
              <Text style={s.cardDesc}>궁금한 것 물어보기</Text>
            </View>
            <View style={[s.arrowCircle, { backgroundColor: '#9C27B0' }]}><Text style={s.arrowTxt}>›</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.card, { backgroundColor: '#E3F2FD' }]}
            onPress={() => navigation.navigate('Guardian', { userId, name })}
            activeOpacity={0.88}>
            <View style={[s.iconCircle, { backgroundColor: '#2196F3' }]}><Text style={s.iconTxt}>👨‍👩‍👧</Text></View>
            <View style={s.cardTexts}>
              <Text style={s.cardLabel}>보호자</Text>
              <Text style={s.cardDesc}>가족에게 알리기</Text>
            </View>
            <View style={[s.arrowCircle, { backgroundColor: '#2196F3' }]}><Text style={s.arrowTxt}>›</Text></View>
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
          <View style={s.sosCircle}><Text style={s.sosArrow}>›</Text></View>
        </TouchableOpacity>

      </View>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  /* 상단 날짜/시간 */
  topBar:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
             paddingHorizontal: 18, paddingBottom: 6 },
  topDate: { fontSize: 14, fontWeight: '700', color: '#2C5F8A' },
  topTime: { fontSize: 20, fontWeight: '900', color: '#1565C0' },

  /* 메인 body */
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 8, justifyContent: 'space-between' },

  /* 게스트 배너 */
  guestBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 backgroundColor: 'rgba(21,101,192,0.12)', borderRadius: 12,
                 paddingHorizontal: 14, paddingVertical: 8, marginBottom: 6 },
  guestTxt:    { fontSize: 13, fontWeight: '600', color: '#1565C0', flex: 1 },
  guestBtn:    { fontSize: 13, fontWeight: '800', color: '#1565C0' },

  /* 히어로 행: 좌 + 우 */
  heroRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  heroLeft: { flex: 1, gap: 8 },

  greetMain: { fontSize: 26, fontWeight: '900', color: '#0D2B5E', lineHeight: 32 },
  greetSub:  { fontSize: 13, color: '#3A6B9A', fontWeight: '600', lineHeight: 20 },

  /* 병원 카드 (히어로 좌측 하단) */
  hospCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 12,
               shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
               shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  hospTop:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  hospIcon:  { fontSize: 18 },
  hospTitle: { fontSize: 12, fontWeight: '700', color: '#5C85C0' },
  hospTime:  { fontSize: 20, fontWeight: '900', color: '#1565C0' },
  hospName:  { fontSize: 15, fontWeight: '700', color: '#0D2B5E', marginTop: 2 },
  hospEmpty: { fontSize: 14, color: '#90A4AE', fontWeight: '600', paddingVertical: 4 },
  hospLink:  { fontSize: 12, color: '#5C85C0', fontWeight: '700', marginTop: 6 },

  /* 루미 이미지 */
  lumiImg: { width: 160, height: 160, backgroundColor: 'transparent' },

  /* 2x2 카드 */
  cardGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:       { width: CARD_W, borderRadius: 14, padding: 12, flexDirection: 'row',
                alignItems: 'center', gap: 10,
                shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
                shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconTxt:    { fontSize: 22 },
  cardTexts:  { flex: 1 },
  cardLabel:  { fontSize: 15, fontWeight: '900', color: '#0D2B5E' },
  cardDesc:   { fontSize: 10, color: '#5C85A8', marginTop: 1 },
  arrowCircle:{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arrowTxt:   { fontSize: 16, fontWeight: '900', color: '#fff', lineHeight: 18 },

  /* SOS */
  sosBtn:    { flexDirection: 'row', alignItems: 'center',
               backgroundColor: '#E53935', borderRadius: 18,
               paddingVertical: 14, paddingHorizontal: 20, gap: 12,
               shadowColor: '#B71C1C', shadowOpacity: 0.3, shadowRadius: 8,
               shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  sosEmoji:  { fontSize: 28 },
  sosTxtWrap:{ flex: 1 },
  sosLabel:  { fontSize: 20, fontWeight: '900', color: '#fff' },
  sosSub:    { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  sosCircle: { width: 34, height: 34, borderRadius: 17,
               backgroundColor: 'rgba(255,255,255,0.25)',
               alignItems: 'center', justifyContent: 'center' },
  sosArrow:  { fontSize: 20, fontWeight: '900', color: '#fff' },
});
