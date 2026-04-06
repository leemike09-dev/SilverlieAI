import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet,
  Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrSilverCharacter from '../components/DrSilverCharacter';

export default function IntroScreen({ navigation }: any) {
  const bgAnim   = useRef(new Animated.Value(0)).current;
  const charAnim = useRef(new Animated.Value(0)).current;
  const charY    = useRef(new Animated.Value(30)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardY    = useRef(new Animated.Value(20)).current;

  const goHome = async () => {
    try {
      await AsyncStorage.setItem('intro_seen', '1');
      const userId   = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      if (userId && userName) {
        navigation.replace('SeniorHome', { name: userName, userId, isGuest: false });
      } else {
        navigation.replace('SeniorHome', { name: '홍길동', userId: 'demo-user', isGuest: false });
      }
    } catch {
      navigation.replace('SeniorHome', { name: '홍길동', userId: 'demo-user', isGuest: false });
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('intro_seen').then(seen => {
      if (seen) { goHome(); return; }

      Animated.sequence([
        // 1) 배경 페이드인
        Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        // 2) 캐릭터 슬라이드업
        Animated.parallel([
          Animated.timing(charAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(charY,    { toValue: 0, duration: 450, useNativeDriver: true }),
        ]),
        // 3) 타이틀
        Animated.timing(textAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        // 4) 피처 카드
        Animated.parallel([
          Animated.timing(cardAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(cardY,    { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(goHome, 800));
    });
  }, []);

  const webBg: any = Platform.OS === 'web' ? {
    background: 'linear-gradient(175deg, #1A4A8A 0%, #1e5499 20%, #2272B8 55%, #2a84cc 80%, #1a6aaa 100%)',
  } : { backgroundColor: '#1A4A8A' };

  const FEATURES = [
    { icon: '💊', label: '약복용 관리' },
    { icon: '🏡', label: '가족 실시간 안심' },
    { icon: '💬', label: 'AI 건강 상담' },
  ];

  return (
    <Animated.View style={[s.root, webBg, { opacity: bgAnim }]}>

      {/* 상단 배경 원형 장식 */}
      <View style={s.circleBig} />
      <View style={s.circleSmall} />

      <View style={s.inner}>

        {/* 앱 배지 */}
        <View style={s.appBadge}>
          <Text style={s.appBadgeTxt}>✦ Silver Life AI</Text>
        </View>

        {/* 닥터 실버 캐릭터 */}
        <Animated.View style={{
          opacity: charAnim,
          transform: [{ translateY: charY }],
          alignItems: 'center',
          marginBottom: 4,
        }}>
          <DrSilverCharacter size={180} />
          {/* 캐릭터 말풍선 */}
          <View style={s.bubble}>
            <Text style={s.bubbleTxt}>안녕하세요! 저는 닥터 실버예요 👋</Text>
          </View>
        </Animated.View>

        {/* 타이틀 */}
        <Animated.View style={{ opacity: textAnim, alignItems: 'center', marginBottom: 28 }}>
          <Text style={s.title}>{'건강한 나,\n안심한 가족'}</Text>
          <Text style={s.subtitle}>AI 주치의가 건강을 함께 지킵니다</Text>
        </Animated.View>

        {/* 피처 카드 3개 */}
        <Animated.View style={[s.features, {
          opacity: cardAnim,
          transform: [{ translateY: cardY }],
        }]}>
          {FEATURES.map(f => (
            <View key={f.label} style={s.featureCard}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* 로딩 점 */}
        <View style={s.dotsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, i === 1 && s.dotActive]} />
          ))}
        </View>

      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' as any },

  circleBig: {
    position: 'absolute', top: -120, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleSmall: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 32 : 48,
    paddingBottom: 32,
    gap: 0,
  },

  appBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7,
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  appBadgeTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  bubble: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 9,
    marginTop: -4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8,
    elevation: 3,
  },
  bubbleTxt: { color: '#1a4a8a', fontSize: 14, fontWeight: '600' },

  title: {
    color: '#ffffff',
    fontSize: 36, fontWeight: '800',
    textAlign: 'center', lineHeight: 48,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,20,0.25)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16, textAlign: 'center', fontWeight: '500',
  },

  features: {
    flexDirection: 'row', gap: 10,
    marginBottom: 28,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  featureIcon:  { fontSize: 22 },
  featureLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17 },

  dotsRow:  { flexDirection: 'row', gap: 8 },
  dot:      { width: 8,  height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)' },
  dotActive:{ width: 22, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.85)' },
});
