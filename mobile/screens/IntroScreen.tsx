import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Platform, Dimensions, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const isNative = Platform.OS !== 'web';

export default function IntroScreen({ navigation }: any) {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const player1 = useVideoPlayer(require('../assets/lumi3.mp4'), (p: any) => {
    p.muted = true;
    p.loop  = true;
    p.play();
  });

  const handleLogin = async () => {
    await AsyncStorage.setItem('onboarding_seen', '1');
    navigation.replace('Login');
  };
  const handleStart = () => navigation.replace('Onboarding');
  const handleGuest = () => navigation.replace('Onboarding', { isGuest: true });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 900, useNativeDriver: isNative,
    }).start();
    fetch('https://silverlieai.onrender.com/').catch(() => {});
  }, []);

  // 화면 포커스 시 재생 보장 (로그아웃 후 복귀 등)
  useFocusEffect(
    React.useCallback(() => {
      player1.play();
    }, [player1])
  );

  return (
    <View style={s.root}>

      {/* ── 배경 영상 (lumi3.mp4) ── */}
      <VideoView
        player={player1}
        style={[StyleSheet.absoluteFill, s.video]}
        contentFit="cover"
        nativeControls={false}
      />

      {/* 어두운 오버레이 */}
      <View style={s.overlay} />

      {/* ── 좌상단 로고 ── */}
      <Animated.View style={[s.logo, { top: Math.max(insets.top + 18, 36), opacity: fadeAnim }]}>
        {/* 상담창과 동일한 방식: borderRadius로 원형 클립 */}
        <Image
          source={require('../assets/lumi8.png')}
          style={s.logoImg}
          resizeMode="contain"
        />
        <View>
          <Text style={s.logoName}>LUMI</Text>
          <Text style={s.logoSub}>Silver Life AI</Text>
        </View>
      </Animated.View>

      {/* ── 하단: 말풍선 + 버튼 ── */}
      <Animated.View style={[s.bottomContent, { paddingBottom: Math.max(insets.bottom + 24, 40), opacity: fadeAnim }]}>

        <View style={s.bubble}>
          <Text style={s.bubbleMsg}>안녕하세요! 건강을 함께 지켜드릴게요 💙</Text>
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={s.loginBtnTxt}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Text style={s.startBtnTxt}>시작하기</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.guestBtn} onPress={handleGuest} activeOpacity={0.75}>
          <Text style={s.guestBtnTxt}>로그인 없이 둘러보기</Text>
        </TouchableOpacity>

      </Animated.View>

    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  video:   { width, height },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // ── 좌상단 로고 ──
  logo: {
    position: 'absolute',
    left: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // 상담창 lumiAvatar와 동일한 방식 (borderRadius = 사이즈/2)
  logoImg: {
    width: 52, height: 52,
    borderRadius: 26,
    resizeMode: 'contain',
  },
  logoName: {
    fontSize: 22, fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#fff', letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  logoSub: {
    fontSize: 10, fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2, marginTop: 1,
  },

  // ── 하단 ──
  bottomContent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    gap: 12,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    padding: 18,
    marginBottom: 4,
  },
  bubbleMsg: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
  },

  btnRow: { flexDirection: 'row', gap: 12 },
  loginBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  loginBtnTxt: { color: '#fff', fontSize: 26, fontWeight: '800' },
  startBtn: {
    flex: 1,
    backgroundColor: '#1A4A8A',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnTxt: { color: '#fff', fontSize: 26, fontWeight: '800' },
  guestBtn:    { alignItems: 'center', paddingVertical: 10 },
  guestBtnTxt: { fontSize: 18, color: 'rgba(255,255,255,0.65)' },
});
