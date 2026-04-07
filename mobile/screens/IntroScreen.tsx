import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IntroScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    } catch (e) {
      console.error('Kakao callback error', e);
    }
    return false;
  };

  const goHome = async () => {
    try {
      // 카카오 OAuth 콜백 감지
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          window.history.replaceState({}, '', window.location.pathname);
          const ok = await handleKakaoCallback(code);
          if (ok) return;
        }
      }
      await AsyncStorage.setItem('intro_seen', '1');
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
    // 카카오 콜백이면 intro_seen 무시하고 바로 처리
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code')) { goHome(); return; }
    }
    AsyncStorage.getItem('intro_seen').then(seen => {
      if (seen) { goHome(); return; }
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
        setTimeout(goHome, 1500);
      });
    });
  }, []);

  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(175deg, #1A4A8A 0%, #2272B8 65%, #2a84cc 100%)' }
    : { backgroundColor: '#1A4A8A' };

  return (
    <Animated.View style={[s.root, webBg, { opacity: fadeAnim }]}>
      <View style={s.circleBig} />
      <View style={s.circleSmall} />
      <View style={s.inner}>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>✦ Silver Life AI</Text>
        </View>
        <Text style={s.title}>{'건강한 나,\n안심한 가족'}</Text>
        <Text style={s.sub}>AI 건강 동반자</Text>
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
  root:  { flex: 1, overflow: 'hidden' as any },
  circleBig: {
    position: 'absolute', top: -100, right: -70,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleSmall: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 0,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
    marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: '#ffffff', fontSize: 38, fontWeight: '800',
    textAlign: 'center', lineHeight: 52, marginBottom: 12,
    textShadowColor: 'rgba(0,0,20,0.25)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  sub: {
    color: 'rgba(255,255,255,0.78)', fontSize: 16,
    textAlign: 'center', fontWeight: '500',
    letterSpacing: 1.5, marginBottom: 40,
  },
  dotsRow:   { flexDirection: 'row', gap: 8 },
  dot:       { width: 8,  height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)' },
  dotActive: { width: 22, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.85)' },
});
