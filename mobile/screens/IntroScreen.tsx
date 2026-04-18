import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Platform, StatusBar, Dimensions,
} from 'react-native';
import * as Speech from 'expo-speech';

const { height } = Dimensions.get('window');

const beeSource = Platform.OS === 'web'
  ? { uri: 'https://raw.githubusercontent.com/leemike09-dev/SilverlieAI/main/mobile/assets/kkulbi_1.png' }
  : require('../assets/kkulbi_1.png');

const GREETINGS = [
  '안녕하세요! 저는 꿀비예요 🐝',
  '오늘도 건강한 하루 보내세요!',
  '함께라면 더 건강해질 수 있어요 💪',
];

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const ring1     = useRef(new Animated.Value(0)).current;
  const ring2     = useRef(new Animated.Value(0)).current;
  const ring3     = useRef(new Animated.Value(0)).current;

  const [greetIdx] = useState(0);
  const [dotIdx]   = useState(0);

const TTS_SCRIPT = '안녕하세요! 저는 꿀비예요. 건강을 함께 지켜드릴게요!';

  const handleLogin  = () => navigation.replace('Login');
  const handleStart  = () => navigation.replace('Onboarding');

  // 꿀비 부유 애니메이션
  useEffect(() => {
    // 카카오 인증 코드는 App.tsx에서 처리
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    const makeRing = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      );

    makeRing(ring1, 0).start();
    makeRing(ring2, 600).start();
    makeRing(ring3, 1200).start();
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    opacity:   anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.25, 0] }),
  });

  return (
    <View style={s.root}>

      {/* ══ 상단 블루 섹션 (44%) ══ */}
      <View style={[s.topSection, Platform.OS !== 'web' && s.topSectionNative]}>
        <Animated.View style={[s.topContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.ringWrap}>
            <Animated.View style={[s.ring, ringStyle(ring1)]} />
            <Animated.View style={[s.ring, ringStyle(ring2)]} />
            <Animated.View style={[s.ring, ringStyle(ring3)]} />
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
              <Image source={beeSource} style={s.beeImg} resizeMode="contain" />
            </Animated.View>
          </View>
          <Text style={s.appName}>Silver Life AI</Text>
          <Text style={s.appSub}>어르신의 건강한 삶을 함께합니다</Text>
        </Animated.View>

        {/* 웹 전용 SVG 웨이브 */}
        {Platform.OS === 'web' && (
          // @ts-ignore
          <svg viewBox="0 0 375 60" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, width: '100%', display: 'block' }}>
            {/* @ts-ignore */}
            <path d="M0 60 Q94 0 188 30 Q282 60 375 10 L375 60 Z" fill="white" />
          </svg>
        )}
      </View>

      {/* ══ 하단 흰 섹션 ══ */}
      <View style={s.bottomSection}>

        {/* 시니어 케어 이미지 — 하단 전체 배경 */}
        <Image
          source={require('../assets/kkulbi.png')}
          style={s.elderlyBg}
          resizeMode="cover"
        />

        <Animated.View style={[s.bottomContent, { opacity: fadeAnim }]}>
          {/* 꿀비 말풍선 */}
          <View style={s.bubble}>
            <Text style={s.bubbleMsg}>{GREETINGS[greetIdx]}</Text>
          </View>

          {/* 여백 → 버튼을 하단으로 */}
          <View style={{ flex: 1 }} />

          {/* 버튼 2개 */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={s.loginBtnTxt}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <Text style={s.startBtnTxt}>시작하기</Text>
            </TouchableOpacity>
          </View>

          {/* 인디케이터 점 */}
          <View style={s.dots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.dot, dotIdx === i && s.dotActive]} />
            ))}
          </View>
        </Animated.View>
      </View>

    </View>
  );
}

const RING_SIZE = 160;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  /* 상단 (44%) */
  topSection: {
    height: height * 0.44,
    backgroundColor: '#0D3470',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  /* 네이티브 전용: 하단 border radius로 웨이브 */
  topSectionNative: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topContent: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 16 : 6,
  },

  /* 파동 링 */
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  beeImg: { width: 160, height: 160 },  // already correct

  /* 앱 이름 */
  appName: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  appSub: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 32,
    alignSelf: 'center',
  },


  /* 하단 */
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  elderlyBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.12,
  },
  bottomContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 36,
  },

  /* 말풍선 */
  bubble: {
    backgroundColor: '#F0F5FF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#C8D8F8',
    padding: 24,
    alignSelf: 'center',
    width: '90%',
  },
  bubbleMsg:  { fontSize: 26, fontWeight: '800', color: '#1A4A8A', textAlign: 'center', lineHeight: 36 },
  bubbleTail: {
    position: 'absolute',
    bottom: -10, left: 20,
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#C8D8F8',
  },

  /* 버튼 */
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  loginBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#1A4A8A',
  },
  loginBtnTxt: { color: '#1A4A8A', fontSize: 20, fontWeight: '900' },
  startBtn: {
    flex: 1, backgroundColor: '#0D3470', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#1A4A8A', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '900' },

  /* 점 인디케이터 */
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D8E8' },
  dotActive: { backgroundColor: '#0D3470', width: 24, borderRadius: 4 },
});
