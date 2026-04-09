import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Platform,
  Image, TouchableOpacity, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// ── 이미지 ───────────────────────────────────────────────
const IMAGES = {
  cherry:  require('../assets/E33CBD24-E194-4E83-AEA9-1302D041CD8C_1_105_c.jpeg'),
  grandpa: require('../assets/317F4D3D-D1AB-4AF4-A73A-3F265C3C19AE_1_105_c.jpeg'),
  flowers: require('../assets/A7B70A66-5183-4E34-AF96-D64BEC59818D.png'),
  bicycle: require('../assets/5518E617-52CF-461C-8004-28FF3A32125C_1_105_c.jpeg'),
};

// ── 4가지 디자인 설정 ────────────────────────────────────
const DESIGNS = [
  {
    id: 'A',
    label: 'A 벚꽃',
    image: IMAGES.cherry,
    overlayColors: ['rgba(255,240,245,0.45)', 'rgba(255,220,235,0.82)', 'rgba(200,80,120,0.55)'],
    badgeBg: 'rgba(220,80,120,0.85)',
    titleColor: '#5a1a2a',
    subColor: '#8a3050',
    dotColor: '#c05070',
    bgColor: '#fce8f0',
    textShadow: 'rgba(255,200,220,0.8)',
    position: 'bottom',  // 텍스트 위치
  },
  {
    id: 'B',
    label: 'B 가족',
    image: IMAGES.grandpa,
    overlayColors: ['rgba(0,0,0,0)', 'rgba(10,30,15,0.55)', 'rgba(10,40,20,0.88)'],
    badgeBg: 'rgba(255,255,255,0.22)',
    titleColor: '#ffffff',
    subColor: 'rgba(255,255,255,0.82)',
    dotColor: 'rgba(255,255,255,0.9)',
    bgColor: '#1a2a1a',
    textShadow: 'rgba(0,0,0,0.5)',
    position: 'bottom',
  },
  {
    id: 'C',
    label: 'C 꽃밭',
    image: IMAGES.flowers,
    overlayColors: ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.62)'],
    badgeBg: 'rgba(255,255,255,0.25)',
    titleColor: '#ffffff',
    subColor: 'rgba(255,255,255,0.88)',
    dotColor: '#ffdd44',
    bgColor: '#111111',
    textShadow: 'rgba(0,0,0,0.7)',
    position: 'center',
  },
  {
    id: 'D',
    label: 'D 자전거',
    image: IMAGES.bicycle,
    overlayColors: ['rgba(10,60,120,0.52)', 'rgba(10,50,100,0.38)', 'rgba(5,30,70,0.72)'],
    badgeBg: 'rgba(255,255,255,0.22)',
    titleColor: '#ffffff',
    subColor: 'rgba(255,255,255,0.85)',
    dotColor: '#7fd8ff',
    bgColor: '#05183a',
    textShadow: 'rgba(0,20,60,0.6)',
    position: 'bottom',
  },
];

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [design, setDesign] = useState(0);  // 0~3
  const [autoGo, setAutoGo] = useState(false);
  const d = DESIGNS[design];

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
      const kakaoCode = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('kakao_auth_code') : null;
      if (kakaoCode) {
        sessionStorage.removeItem('kakao_auth_code');
        const ok = await handleKakaoCallback(kakaoCode);
        if (ok) return;
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
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('kakao_auth_code')) {
      goHome(); return;
    }
    AsyncStorage.getItem('intro_seen').then(seen => {
      if (seen) { goHome(); return; }
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(() => {
        setAutoGo(true);
      });
    });
  }, []);

  // 디자인 선택 후 2초 뒤 자동이동
  useEffect(() => {
    if (!autoGo) return;
    const t = setTimeout(goHome, 2500);
    return () => clearTimeout(t);
  }, [autoGo, design]);

  const webOverlay: any = Platform.OS === 'web'
    ? { background: `linear-gradient(180deg, ${d.overlayColors[0]} 0%, ${d.overlayColors[1]} 55%, ${d.overlayColors[2]} 100%)` }
    : {};

  const isCenter = d.position === 'center';

  return (
    <Animated.View style={[s.root, { backgroundColor: d.bgColor, opacity: fadeAnim }]}>
      {/* 배경 이미지 */}
      <Image source={d.image} style={s.bgImg} resizeMode="cover" />

      {/* 오버레이 (웹) */}
      {Platform.OS === 'web' && <View style={[StyleSheet.absoluteFill, webOverlay]} />}

      {/* 오버레이 (네이티브) */}
      {Platform.OS !== 'web' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: d.overlayColors[2] }]} />
      )}

      {/* 텍스트 영역 */}
      <View style={[s.textArea, isCenter ? s.textCenter : s.textBottom]}>
        <View style={[s.badge, { backgroundColor: d.badgeBg }]}>
          <Text style={[s.badgeTxt, { color: d.titleColor }]}>✦ Silver Life AI</Text>
        </View>
        <Text style={[s.title, { color: d.titleColor,
          textShadowColor: d.textShadow, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }]}>
          {'건강한 나,\n안심한 가족'}
        </Text>
        <Text style={[s.sub, { color: d.subColor }]}>AI 건강 동반자</Text>
        <View style={s.dotsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, i === 1 && s.dotActive,
              { backgroundColor: i === 1 ? d.dotColor : d.dotColor + '44' }]} />
          ))}
        </View>
      </View>

      {/* 디자인 선택 버튼 (테스트용) */}
      <View style={s.selector}>
        {DESIGNS.map((dz, idx) => (
          <TouchableOpacity key={dz.id} onPress={() => setDesign(idx)}
            style={[s.selBtn, design === idx && s.selBtnActive]}>
            <Text style={[s.selTxt, design === idx && s.selTxtActive]}>{dz.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  bgImg:      { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  textArea:   { position: 'absolute', left: 0, right: 0, paddingHorizontal: 32, alignItems: 'center' },
  textBottom: { bottom: 110 },
  textCenter: { top: '35%' as any },
  badge: {
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeTxt:   { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    fontSize: 38, fontWeight: '800', textAlign: 'center', lineHeight: 52, marginBottom: 12,
  },
  sub: { fontSize: 16, textAlign: 'center', fontWeight: '500', letterSpacing: 1.5, marginBottom: 28 },
  dotsRow:   { flexDirection: 'row', gap: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22, height: 8, borderRadius: 4 },

  // 선택 버튼
  selector: {
    position: 'absolute', bottom: 28, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16,
  },
  selBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  selBtnActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
  selTxt:       { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  selTxtActive: { color: '#1a3a5c' },
});
