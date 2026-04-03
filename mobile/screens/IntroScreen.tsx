import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet,
  Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IntroScreen({ navigation }: any) {
  const bgAnim     = useRef(new Animated.Value(0)).current;
  const sunAnim    = useRef(new Animated.Value(0)).current;
  const topAnim    = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(24)).current;

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
    // 이미 본 적 있으면 인트로 스킵
    AsyncStorage.getItem('intro_seen').then(seen => {
      if (seen) { goHome(); return; }

      // 총 1.5초 애니메이션 후 자동 이동
      Animated.sequence([
        Animated.timing(bgAnim,     { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(sunAnim,    { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(topAnim,    { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(bottomAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(slideAnim,  { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ]).start(() => {
        // 애니메이션 완료 후 0.15초 잠깐 보여주고 이동
        setTimeout(goHome, 150);
      });
    });
  }, []);

  const rootWebStyle: any = Platform.OS === 'web' ? {
    flex: 1 as any,
    background: 'linear-gradient(180deg, #a2c8a8 0%, #80b4a0 18%, #5e9898 35%, #3e7890 52%, #2a5878 68%, #1e3e64 82%, #162e50 100%)',
  } : { backgroundColor: '#162e50' };

  return (
    <Animated.View style={[s.root, rootWebStyle, { opacity: bgAnim }]}>

      {Platform.OS !== 'web' && (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#a2c8a8', opacity: 0.58, bottom: '72%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#80b4a0', opacity: 0.52, bottom: '60%', top: '10%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#5e9898', opacity: 0.48, bottom: '48%', top: '22%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#3e7890', opacity: 0.44, bottom: '36%', top: '34%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2a5878', opacity: 0.40, bottom: '24%', top: '46%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e3e64', opacity: 0.36, bottom: '10%', top: '58%' }]} />
        </>
      )}

      <Animated.View style={[s.sunGlow, { opacity: Animated.multiply(sunAnim, 0.22) }]} />
      <Animated.View style={[s.sunCore, { opacity: Animated.multiply(sunAnim, 0.32) }]} />

      <Animated.View style={[s.mtnWrap, { opacity: sunAnim }]}>
        <View style={s.mtnL} />
        <View style={s.mtnR} />
        <View style={s.mtnC} />
        <View style={s.mtnFloor} />
      </Animated.View>

      <Animated.View style={[s.content, { justifyContent: 'space-between' }]}>
        <Animated.View style={[s.top, { opacity: topAnim }]}>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>🌿 Silver Life AI</Text>
          </View>
          <Text style={s.title}>{'건강한 하루,\n행복한 내일'}</Text>
          <Text style={s.subtitle}>시니어를 위한 AI 건강 파트너</Text>
        </Animated.View>

        <Animated.View style={[s.bottom, { opacity: bottomAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.quoteCard}>
            <Text style={s.quoteIcon}>💬</Text>
            <Text style={s.quoteTxt}>{'"건강이 전부는 아니지만,\n건강 없이는 전부가 없다."'}</Text>
            <Text style={s.quoteAuthor}>— 아르투어 쇼펜하우어</Text>
          </View>
          {/* 로딩 점 (버튼 대체) */}
          <View style={s.dotsRow}>
            {[0,1,2].map(i => (
              <View key={i} style={[s.dot, i === 1 && s.dotActive]} />
            ))}
          </View>
        </Animated.View>
      </Animated.View>

    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  sunGlow: {
    position: 'absolute', top: '20%', left: '50%', marginLeft: -100,
    width: 200, height: 200, borderRadius: 100, backgroundColor: '#f5d060',
  },
  sunCore: {
    position: 'absolute', top: '23%', left: '50%', marginLeft: -55,
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#ffe080',
  },
  mtnWrap:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  mtnL: {
    position: 'absolute', bottom: 0, left: -60,
    width: 0, height: 0,
    borderLeftWidth: 240, borderRightWidth: 240, borderBottomWidth: 210,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0d1e38',
  },
  mtnR: {
    position: 'absolute', bottom: 0, right: -60,
    width: 0, height: 0,
    borderLeftWidth: 240, borderRightWidth: 240, borderBottomWidth: 175,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0f2242',
  },
  mtnC: {
    position: 'absolute', bottom: 0, left: '50%', marginLeft: -150,
    width: 0, height: 0,
    borderLeftWidth: 150, borderRightWidth: 150, borderBottomWidth: 130,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#11264c',
  },
  mtnFloor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: '#0d1e38' },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingBottom: 48, paddingHorizontal: 24,
  },
  top:    { alignItems: 'center' },
  bottom: { gap: 16, alignItems: 'center' },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 24,
  },
  badgeTxt:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: {
    color: '#fff', fontSize: 40, fontWeight: '800',
    textAlign: 'center', lineHeight: 54, marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center' },
  quoteCard: {
    backgroundColor: 'rgba(15,28,55,0.42)',
    borderRadius: 14, padding: 16, alignSelf: 'stretch',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  quoteIcon:   { fontSize: 18, marginBottom: 6 },
  quoteTxt:    { color: '#fff', fontSize: 15, lineHeight: 23, fontWeight: '500', marginBottom: 6 },
  quoteAuthor: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'right' },
  dotsRow:     { flexDirection: 'row', gap: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.30)' },
  dotActive:   { backgroundColor: 'rgba(255,255,255,0.85)', width: 20 },
});
