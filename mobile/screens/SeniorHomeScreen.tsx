import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated, Image, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';
const { width, height } = Dimensions.get('window');

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || (DEMO_MODE ? '홍길동' : '');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(titleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    sendLocation();
  }, []);

  const [locationStatus, setLocationStatus] = useState<'sharing' | 'off' | 'loading'>('off');

  const sendLocation = async () => {
    if (!userId) return;
    try {
      setLocationStatus('loading');
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      let address = '';
      try {
        const gr = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
          { headers: { 'User-Agent': 'SilverLifeAI/1.0' } }
        );
        const gd = await gr.json();
        const r = gd.address || {};
        address = r.road || r.suburb || r.neighbourhood || r.county || '';
      } catch {}
      await fetch(`${API}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lat, lng, address, activity: 'unknown' }),
      });
      setLocationStatus('sharing');
    } catch {
      setLocationStatus('off');
    }
  };

  const goFamily = () => {
    if (DEMO_MODE) {
      navigation.navigate('FamilyDashboard', {
        seniorId: 'demo-senior', seniorName: '홍길동', userId, name,
      });
    } else {
      navigation.navigate('FamilyConnect', { userId, name });
    }
  };

  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(175deg, #0d2a4a 0%, #1A4A8A 40%, #2272B8 100%)' }
    : { backgroundColor: '#0d2a4a' };

  const CARDS = [
    { icon: '💊', title: '약 복용 관리',    sub: '오늘 복용 일정을 확인해요',  onPress: () => navigation.navigate('Medication', { userId, name }) },
    { icon: '🏡', title: '가족 실시간 안심', sub: '가족이 안전한지 확인해요',   onPress: goFamily },
    { icon: '💬', title: 'AI 건강 상담',    sub: '궁금한 건강 질문을 해요',    onPress: () => navigation.navigate('AIChat', { userId, name }) },
    { icon: '🫀', title: '건강 기록',       sub: '혈압·걸음수·AI 분석 확인',  onPress: () => navigation.navigate('Health', { userId, name }) },
  ];

  const beeSource = Platform.OS === 'web'
    ? { uri: 'https://raw.githubusercontent.com/leemike09-dev/SilverlieAI/main/mobile/assets/bee_nobg.png' }
    : require('../assets/bee_nobg.png');

  return (
    <View style={[s.root, webBg]}>

      {/* ── 꿀비 배경 (상단 좌측, 페이드 아웃) ── */}
      <Animated.View style={[s.beeWrap, { opacity: fadeAnim }]}>
        <Image source={beeSource} style={s.beeImg} resizeMode="contain" />
        {/* 하단 페이드 오버레이 */}

      </Animated.View>

      {/* ── 본문 ── */}
      <View style={[s.inner, { paddingTop: insets.top + (Platform.OS === 'web' ? 16 : 12) }]}>

        {/* 타이틀 */}
        <Animated.View style={[s.titleWrap, { opacity: titleAnim }]}>
          <Text style={s.mainTitle}>{'건강한 나,\n안심한 가족'}</Text>
          <Text style={s.subtitle}>AI 건강 동반자</Text>
        </Animated.View>

        {/* 카드 */}
        <View style={s.cards}>
          {CARDS.map(c => (
            <TouchableOpacity key={c.title} style={s.card} onPress={c.onPress} activeOpacity={0.82}>
              <Text style={s.cardIcon}>{c.icon}</Text>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>{c.title}</Text>
                <Text style={s.cardSub}>{c.sub}</Text>
              </View>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 위치 공유 배지 */}
        {locationStatus === 'sharing' && (
          <View style={s.locBadge}>
            <Text style={s.locTxt}>🟢 위치 공유 중</Text>
          </View>
        )}
      </View>

      {/* 탭바 */}
      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // 꿀비 배경
  beeWrap: {
    position: 'absolute',
    top: 0,
    right: -width * 0.05,
    width: Platform.OS === 'web' ? 180 : width * 0.58,
    height: Platform.OS === 'web' ? 180 : width * 0.58,
    opacity: 0.88,
  },
  beeImg: {
    width: '100%',
    height: '100%',
  },
  beeFadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '65%',
    ...(Platform.OS === 'web'
      ? { background: 'linear-gradient(to bottom, transparent 0%, #0d2a4a 100%)' } as any
      : { backgroundColor: 'rgba(13,42,74,0.92)' }),
  },
  beeFadeRight: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: '52%',
    ...(Platform.OS === 'web'
      ? { background: 'linear-gradient(to right, transparent 0%, #0d2a4a 100%)' } as any
      : { backgroundColor: 'rgba(13,42,74,0.88)' }),
  },
  beeFadeTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '22%',
    ...(Platform.OS === 'web'
      ? { background: 'linear-gradient(to top, transparent 0%, #0d2a4a 100%)' } as any
      : { backgroundColor: 'rgba(13,42,74,0.7)' }),
  },
  beeFadeLeft: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: '12%',
    ...(Platform.OS === 'web'
      ? { background: 'linear-gradient(to left, transparent 0%, #0d2a4a 100%)' } as any
      : { backgroundColor: 'rgba(13,42,74,0.6)' }),
  },

  inner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 24,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 16,
  },

  // 타이틀
  titleWrap: { alignItems: 'flex-start', marginBottom: 0 },
  mainTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 46,
    marginBottom: 8,
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,20,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1.5,
    textAlign: 'left',
  },

  // 카드
  cards:     { gap: 10, width: '100%', alignSelf: 'stretch' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20,
    gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  cardIcon:  { fontSize: 34 },
  cardText:  { flex: 1 },
  cardTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  cardSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 15 },
  cardArrow: { color: 'rgba(255,255,255,0.5)', fontSize: 28 },

  // 위치 배지
  locBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
  },
  locTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
});
