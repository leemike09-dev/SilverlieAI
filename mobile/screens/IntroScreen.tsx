import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }),
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

  const cardW = width - 40;
  const cardH = height * 0.80;

  return (
    <View style={s.root}>
      {Platform.OS !== 'web' && <StatusBar barStyle="light-content" backgroundColor="#0d1428" />}

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>

        {/* 메인 카드 */}
        <View style={[s.card, { width: cardW, height: cardH }]}>

          {/* 그라디언트 레이어 (세이지그린→틸→스틸블루→다크네이비) */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a3560', borderRadius: 32 }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2a6070', opacity: 0.80, borderRadius: 32, top: 0, bottom: '35%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#4a8878', opacity: 0.75, borderRadius: 32, top: 0, bottom: '55%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6aaa88', opacity: 0.70, borderRadius: 32, top: 0, bottom: '68%' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#8aba98', opacity: 0.60, borderRadius: 32, top: 0, bottom: '76%' }]} />

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

          {/* 배지 + 타이틀 */}
          <View style={s.cardTop}>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>🌿 Silver Life AI</Text>
            </View>
            <Text style={s.title}>{'건강한 하루,\n행복한 내일'}</Text>
            <Text style={s.subtitle}>시니어를 위한 AI 건강 파트너</Text>
          </View>

          {/* 명언 카드 */}
          <Animated.View style={[s.quoteCard, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.quoteIcon}>💬</Text>
            <Text style={s.quoteTxt}>{'"건강이 전부는 아니지만,\n건강 없이는 전부가 없다."'}</Text>
            <Text style={s.quoteAuthor}>— 아르투어 쇼펜하우어</Text>
          </Animated.View>

        </View>

        {/* 시작하기 버튼 (카드 바깥) */}
        <TouchableOpacity
          style={[s.startBtn, { width: cardW }]}
          onPress={handleStart}
          activeOpacity={0.82}
        >
          <Text style={s.startBtnTxt}>시작하기</Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1428',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  sunGlow: {
    position: 'absolute',
    top: '18%',
    left: '50%',
    marginLeft: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#f5c030',
    opacity: 0.18,
  },
  sunCore: {
    position: 'absolute',
    top: '21%',
    left: '50%',
    marginLeft: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fde878',
    opacity: 0.30,
  },
  mtnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  mtnL: {
    position: 'absolute',
    bottom: 0,
    left: -40,
    width: 0, height: 0,
    borderLeftWidth: 200,
    borderRightWidth: 200,
    borderBottomWidth: 180,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#071020',
  },
  mtnR: {
    position: 'absolute',
    bottom: 0,
    right: -40,
    width: 0, height: 0,
    borderLeftWidth: 200,
    borderRightWidth: 200,
    borderBottomWidth: 155,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#091528',
  },
  mtnC: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -130,
    width: 0, height: 0,
    borderLeftWidth: 130,
    borderRightWidth: 130,
    borderBottomWidth: 110,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0b1830',
  },
  mtnFloor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#071020',
  },
  cardTop: {
    paddingTop: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginBottom: 22,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  quoteCard: {
    position: 'absolute',
    bottom: 22,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(8,20,45,0.70)',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  quoteIcon: {
    fontSize: 22,
    marginBottom: 10,
  },
  quoteTxt: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '500',
    marginBottom: 10,
  },
  quoteAuthor: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 14,
    textAlign: 'right',
  },
  startBtn: {
    marginTop: 14,
    backgroundColor: '#4e8a5e',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  startBtnTxt: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
