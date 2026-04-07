import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Animated, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';

// ── 청진기 SVG 오버레이 (web only) ──
const STETHOSCOPE_SVG = `
<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 18 Q12 32 14 46 Q16 60 30 64 Q44 68 48 54"
        stroke="#0d1a3a" stroke-width="5.5" fill="none" stroke-linecap="round"/>
  <circle cx="48" cy="54" r="14" fill="#1a2e6e"/>
  <circle cx="48" cy="54" r="9"  fill="#2a52c0"/>
  <circle cx="48" cy="54" r="4"  fill="rgba(255,255,255,0.35)"/>
  <circle cx="20" cy="15" r="4.5" fill="#1a2e6e"/>
  <circle cx="20" cy="15" r="2.5" fill="rgba(255,255,255,0.4)"/>
</svg>
`;

export default function SeniorHomeScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || (DEMO_MODE ? '홍길동' : '');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const charAnim = useRef(new Animated.Value(0)).current;
  const charY    = useRef(new Animated.Value(24)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(charAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(charY,    { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.timing(titleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
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

  // 가족 대시보드 이동용
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
    ? { background: 'linear-gradient(175deg, #1A4A8A 0%, #1e5499 25%, #2272B8 65%, #2a84cc 100%)' }
    : { backgroundColor: '#1A4A8A' };

  const CARDS = [
    {
      icon: '💊',
      title: '약 복용 관리',
      sub: '오늘 복용 일정을 확인해요',
      onPress: () => navigation.navigate('Medication', { userId, name }),
    },
    {
      icon: '🏡',
      title: '가족 실시간 안심',
      sub: '가족이 안전한지 확인해요',
      onPress: goFamily,
    },
    {
      icon: '💬',
      title: 'AI 건강 상담',
      sub: '궁금한 건강 질문을 해요',
      onPress: () => navigation.navigate('AIChat', { userId, name }),
    },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* 배경 */}
      <View style={[StyleSheet.absoluteFill, webBg]} />

      {/* 배경 원형 장식 */}
      <View style={s.circleBig} />
      <View style={s.circleSmall} />

      <Animated.View style={[s.inner, { opacity: fadeAnim }]}>

        {/* 꿀비 캐릭터 */}
        <Animated.View style={[s.charWrap, {
          opacity: charAnim,
          transform: [{ translateY: charY }],
        }]}>
          <Image
            source={require('../assets/EDFA500D-1920-4E9B-A3CA-5C105D320158_1_105_c.jpeg')}
            style={s.beeImg}
            resizeMode="contain"
          />
          {/* 청진기 SVG 오버레이 (web only) */}
          {Platform.OS === 'web' && (
            <View style={s.stethoscopeWrap}>
              <div
                dangerouslySetInnerHTML={{ __html: STETHOSCOPE_SVG }}
                style={{ width: 80, height: 80 }}
              />
            </View>
          )}
        </Animated.View>

        {/* 타이틀 */}
        <Animated.View style={[s.titleWrap, { opacity: titleAnim }]}>
          <Text style={s.mainTitle}>{'건강한 나,\n안심한 가족'}</Text>
          <Text style={s.subtitle}>AI 건강 동반자</Text>
        </Animated.View>

        {/* 피처 카드 3개 */}
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

      </Animated.View>

      {/* 탭바 */}
      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  circleBig: {
    position: 'absolute', top: -100, right: -70,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleSmall: {
    position: 'absolute', bottom: 80, left: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 40,
    paddingBottom: 16,
    gap: 0,
  },

  // 캐릭터
  charWrap: {
    width: 160,
    height: 160,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  beeImg: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  stethoscopeWrap: {
    position: 'absolute',
    right: -4,
    bottom: 4,
    width: 80,
    height: 80,
  },

  // 타이틀
  titleWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,20,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 1.5,
  },

  // 카드
  cards: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cardIcon:  { fontSize: 32 },
  cardText:  { flex: 1 },
  cardTitle: { color: '#ffffff', fontSize: 19, fontWeight: '700', marginBottom: 3 },
  cardSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '400' },
  cardArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 24, fontWeight: '300' },

  // 위치 배지
  locBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  locTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
});
