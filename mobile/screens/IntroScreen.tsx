import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Platform,
  Image, Dimensions, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function IntroScreen({ navigation }: any) {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(30)).current;

  const handleKakaoCallback = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch('https://silverlieai.onrender.com/users/kakao-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: 'https://leemike09-dev.github.io/SilverlieAI/' }),
      });
      const data = await res.json();
      if (data?.id) {
        await AsyncStorage.setItem('userId', data.id);
        await AsyncStorage.setItem('userName', data.name);
        navigation.replace('SeniorHome', { name: data.name, userId: data.id, isGuest: false });
        return true;
      }
    } catch (e) {}
    return false;
  };

  const goHome = async () => {
    try {
      const userId   = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      if (userId && userId !== 'demo-user' && userName) {
        navigation.replace('SeniorHome', { name: userName, userId, isGuest: false });
      } else {
        navigation.replace('SeniorHome', { name: '홍길동', userId: 'demo-user', isGuest: false });
      }
    } catch {
      navigation.replace('SeniorHome', { name: '홍길동', userId: 'demo-user', isGuest: false });
    }
  };

  useEffect(() => {
    // 카카오 콜백 감지
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('kakao_auth_code')) {
      const code = sessionStorage.getItem('kakao_auth_code')!;
      sessionStorage.removeItem('kakao_auth_code');
      handleKakaoCallback(code);
      return;
    }
    // 페이드 + 슬라이드 인 애니메이션
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const webOverlay: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,30,15,0.55) 50%, rgba(10,40,20,0.92) 100%)' }
    : {};

  return (
    <View style={s.root}>
      {/* 배경 이미지 */}
      <Image
        source={require('../assets/317F4D3D-D1AB-4AF4-A73A-3F265C3C19AE_1_105_c.jpeg')}
        style={s.bgImg}
        resizeMode="cover"
      />

      {/* 오버레이 */}
      {Platform.OS === 'web'
        ? <View style={[StyleSheet.absoluteFill, webOverlay]} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,40,20,0.52)' }]} />
      }

      {/* 텍스트 + 버튼 */}
      <Animated.View style={[s.textArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>✦ Silver Life AI</Text>
        </View>
        <Text style={s.title}>{'건강한 나,\n안심한 가족'}</Text>
        <Text style={s.sub}>AI 건강 동반자</Text>

        {/* 시작하기 버튼 */}
        <TouchableOpacity style={s.startBtn} onPress={goHome} activeOpacity={0.85}>
          <Text style={s.startBtnTxt}>시작하기</Text>
          <Text style={s.startArrow}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#1a2a1a' },
  bgImg:  { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  textArea: {
    position: 'absolute', left: 0, right: 0, bottom: 80,
    paddingHorizontal: 32, alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeTxt: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: '#ffffff', fontSize: 40, fontWeight: '800',
    textAlign: 'center', lineHeight: 54, marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  sub: {
    color: 'rgba(255,255,255,0.82)', fontSize: 17,
    textAlign: 'center', fontWeight: '500',
    letterSpacing: 1.5, marginBottom: 40,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 30, paddingVertical: 16, paddingHorizontal: 48,
    gap: 8, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  startBtnTxt: { color: '#1a3a2a', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  startArrow:  { color: '#1a3a2a', fontSize: 26, fontWeight: '700' },
});
