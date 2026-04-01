import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = async () => {
    try {
      const userId   = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      if (userId && userName) {
        navigation.replace('Home', { name: userName, userId, isGuest: false });
      } else {
        navigation.replace('Home', { name: '게스트', userId: '', isGuest: true });
      }
    } catch {
      navigation.replace('Home', { name: '게스트', userId: '', isGuest: true });
    }
  };

  // 웹: CSS linear-gradient + position fixed (브라우저 주소창 가림)
  const rootWebStyle: any = Platform.OS === 'web' ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(180deg, #a2c8a8 0%, #80b4a0 18%, #5e9898 35%, #3e7890 52%, #2a5878 68%, #1e3e64 82%, #162e50 100%)',
  } : { backgroundColor: '#162e50' };

  return (
    <View style={[s.root, rootWebStyle]}>

      {/* 네이티브용 그라디언트 레이어 */}
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

      {/* 태양 글로우 */}
      <View style={s.sunGlow} />
      <View style={s.sunCore} />

      {/* 산 실루엣 */}
      <View style={s.mtnWrap}>
        <View style={s.mtnL} />
        <View style={s.mtnR} />
        <View style={s.mtnC} />
        <View style={s.mtnFloor} />
      </View>

      {/* 콘텐츠 */}
      <Animated.View style={[s.content, { opacity: fadeAnim }]}>
        <View style={s.top}>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>🌿 Silver Life AI</Text>
          </View>
          <Text style={s.title}>{'건강한 하루,\n행복한 내일'}</Text>
          <Text style={s.subtitle}>시니어를 위한 AI 건강 파트너</Text>
        </View>

        <Animated.View style={[s.bottom, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.quoteCard}>
            <Text style={s.quoteIcon}>💬</Text>
            <Text style={s.quoteTxt}>{'"건강이 전부는 아니지만,\n건강 없이는 전부가 없다."'}</Text>
            <Text style={s.quoteAuthor}>— 아르투어 쇼펜하우어</Text>
          </View>
          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.82}>
            <Text style={s.startBtnTxt}>시작하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  sunGlow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f5d060',
    opacity: 0.22,
  },
  sunCore: {
    position: 'absolute',
    top: '23%',
    left: '50%',
    marginLeft: -55,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffe080',
    opacity: 0.32,
  },
  mtnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  mtnL: {
    position: 'absolute',
    bottom: 0, left: -60,
    width: 0, height: 0,
    borderLeftWidth: 240, borderRightWidth: 240, borderBottomWidth: 210,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#0d1e38',
  },
  mtnR: {
    position: 'absolute',
    bottom: 0, right: -60,
    width: 0, height: 0,
    borderLeftWidth: 240, borderRightWidth: 240, borderBottomWidth: 175,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#0f2242',
  },
  mtnC: {
    position: 'absolute',
    bottom: 0, left: '50%', marginLeft: -150,
    width: 0, height: 0,
    borderLeftWidth: 150, borderRightWidth: 150, borderBottomWidth: 130,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#11264c',
  },
  mtnFloor: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0, height: 40,
    backgroundColor: '#0d1e38',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  top: { alignItems: 'center' },
  bottom: { gap: 14 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 8,
    marginBottom: 24,
  },
  badgeTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: {
    color: '#fff',
    fontSize: 40, fontWeight: '800',
    textAlign: 'center', lineHeight: 54,
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center' },
  quoteCard: {
    backgroundColor: 'rgba(15,28,55,0.42)',
    borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  quoteIcon: { fontSize: 22, marginBottom: 10 },
  quoteTxt: { color: '#fff', fontSize: 18, lineHeight: 28, fontWeight: '500', marginBottom: 10 },
  quoteAuthor: { color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'right' },
  startBtn: {
    backgroundColor: '#4e8a5e',
    borderRadius: 18, paddingVertical: 20, alignItems: 'center',
  },
  startBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
});
