import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Platform, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width, height } = Dimensions.get('window');

const webBgSource = Platform.OS === 'web'
  ? { uri: 'https://raw.githubusercontent.com/leemike09-dev/SilverlieAI/main/mobile/assets/lumi.png' }
  : require('../assets/lumi.png');

export default function IntroScreen({ navigation }: any) {
  const insets      = useSafeAreaInsets();
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const vid1Opacity = useRef(new Animated.Value(1)).current;
  const vid2Opacity = useRef(new Animated.Value(0)).current;

  const player1 = useVideoPlayer(
    Platform.OS !== 'web' ? require('../assets/lumi3.mp4') : null,
    p => { p.muted = true; p.loop = false; }
  );
  const player2 = useVideoPlayer(
    Platform.OS !== 'web' ? require('../assets/lumi4.mp4') : null,
    p => { p.muted = true; p.loop = true; }
  );

  const handleLogin = async () => {
    await AsyncStorage.setItem('onboarding_seen', '1');
    navigation.replace('Login');
  };
  const handleStart = () => navigation.replace('Onboarding');
  const handleGuest = () => navigation.replace('SeniorHome', { userId: 'guest', name: '게스트' });

  useEffect(() => {
    // 콘텐츠 페이드인
    Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();

    if (Platform.OS === 'web') return;

    // 영상 1 재생
    player1.play();

    // 영상 1 종료 → 크로스페이드 → 영상 2
    const sub = player1.addListener('playToEnd', () => {
      player2.play();
      Animated.parallel([
        Animated.timing(vid1Opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        Animated.timing(vid2Opacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]).start();
    });

    return () => sub.remove();
  }, []);

  return (
    <View style={s.root}>

      {/* ── 배경 ── */}
      {Platform.OS !== 'web' ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: vid1Opacity }]}>
            <VideoView
              player={player1}
              style={s.video}
              contentFit="cover"
              nativeControls={false}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: vid2Opacity }]}>
            <VideoView
              player={player2}
              style={s.video}
              contentFit="cover"
              nativeControls={false}
            />
          </Animated.View>
        </>
      ) : (
        <Image source={webBgSource} style={s.webBg} resizeMode="cover" />
      )}

      {/* 어두운 오버레이 */}
      <View style={s.overlay} />

      {/* ── 상단: 앱 이름 ── */}
      <Animated.View style={[s.topContent, { paddingTop: Math.max(insets.top + 24, 48), opacity: fadeAnim }]}>
        <Text style={s.appName}>Silver Life AI</Text>
        <Text style={s.appSub}>어르신의 건강한 삶을 함께합니다</Text>
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
  root: { flex: 1, backgroundColor: '#000' },

  video:  { width, height },
  webBg:  { ...StyleSheet.absoluteFillObject, width: '100%' as any, height: '100%' as any },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  topContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  appSub: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

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
  guestBtn: { alignItems: 'center', paddingVertical: 10 },
  guestBtnTxt: { fontSize: 18, color: 'rgba(255,255,255,0.65)' },
});
