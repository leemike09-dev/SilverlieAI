import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Platform,
  Image, Dimensions, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('kakao_auth_code')) {
      const code = sessionStorage.getItem('kakao_auth_code')!;
      sessionStorage.removeItem('kakao_auth_code');
      handleKakaoCallback(code);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.root}>

      {/* ── 상단 블루 섹션 ── */}
      <View style={s.topSection}>
        {/* 꿀비 배경 워터마크 (opacity 0.15, cover) */}
        <Image
          source={require('../assets/bee_nobg.png')}
          style={s.bgWatermark}
          resizeMode="cover"
        />

        {/* 콘텐츠 */}
        <Animated.View style={[s.topContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* 꿀비 캐릭터 */}
          <Image
            source={require('../assets/bee_nobg.png')}
            style={s.beeImg}
            resizeMode="contain"
          />

          {/* 뱃지 */}
          <View style={s.badge}>
            <Text style={s.badgeTxt}>✦ Silver Life AI</Text>
          </View>

          <Text style={s.title}>{'건강한 나,\n안심한 가족'}</Text>
          <Text style={s.sub}>AI 건강 동반자</Text>
        </Animated.View>
      </View>

      {/* ── 하단 섹션 ── */}
      <View style={s.bottomSection}>
        {/* 시니어 케어 배경 이미지 (하단 오른쪽) */}
        <Image
          source={require('../assets/kkulbi.png')}
          style={s.seniorImg}
          resizeMode="contain"
        />

        {/* 시작하기 버튼 */}
        <Animated.View style={[s.btnWrap, { opacity: fadeAnim }]}>
          <TouchableOpacity style={s.startBtn} onPress={goHome} activeOpacity={0.85}>
            <Text style={s.startBtnTxt}>시작하기</Text>
            <Text style={s.startArrow}>›</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FC' },

  /* 상단 블루 섹션 */
  topSection: {
    height: height * 0.60,
    backgroundColor: '#1A4A8A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgWatermark: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    width: '100%',
    height: '100%',
  },
  topContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
  },
  beeImg: {
    width: 110,
    height: 110,
    marginBottom: 18,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 10,
  },
  sub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 1.5,
  },

  /* 하단 섹션 */
  bottomSection: {
    flex: 1,
    backgroundColor: '#F4F7FC',
    overflow: 'hidden',
  },
  seniorImg: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 200,
    width: width * 0.60,
  },
  btnWrap: {
    position: 'absolute',
    bottom: 32,
    left: 28,
    right: 28,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A4A8A',
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 48,
    gap: 8,
    shadowColor: '#1A4A8A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  startArrow:  { color: '#fff', fontSize: 26, fontWeight: '700' },
});
