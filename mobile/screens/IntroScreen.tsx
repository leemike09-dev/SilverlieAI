import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = async () => {
    const userId   = await AsyncStorage.getItem('userId');
    const userName = await AsyncStorage.getItem('userName');
    if (userId && userName) {
      navigation.replace('Home', { name: userName, userId, isGuest: false });
    } else {
      navigation.replace('Home', { name: '게스트', userId: '', isGuest: true });
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1f3c" />

      {/* 배경 레이어 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a1f3c' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a6b5c', opacity: 0.3, height: height * 0.45 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a5fbc', opacity: 0.2 }]} />

      {/* 태양 */}
      <View style={s.sunOuter} />
      <View style={s.sunInner} />

      {/* 산 실루엣 (단순 삼각형) */}
      <View style={s.mountainWrap}>
        <View style={s.mtn1} />
        <View style={s.mtn2} />
        <View style={s.mtn3} />
      </View>

      {/* 나무 이모지 */}
      <Text style={[s.tree, { left: 22, bottom: height * 0.27 }]}>🌲</Text>
      <Text style={[s.tree, { right: 18, bottom: height * 0.27, fontSize: 38 }]}>🌳</Text>
      <Text style={[s.tree, { left: 70, bottom: height * 0.265, fontSize: 28, opacity: 0.6 }]}>🌲</Text>

      {/* 콘텐츠 */}
      <SafeAreaView style={s.safeArea}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>

          {/* 상단 */}
          <View style={s.topSection}>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>🌿 Silver Life AI</Text>
            </View>
            <Text style={s.appName}>건강한 하루,{'\n'}행복한 내일</Text>
            <Text style={s.appSub}>시니어를 위한 AI 건강 파트너</Text>
          </View>

          {/* 하단 */}
          <Animated.View style={[s.bottomSection, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.quoteCard}>
              <Text style={s.quoteIcon}>💬</Text>
              <Text style={s.quoteTxt}>{'"건강이 전부는 아니지만,\n건강 없이는 전부가 없다."'}</Text>
              <Text style={s.quoteAuthor}>— 아르투어 쇼펜하우어</Text>
            </View>
            <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <Text style={s.startBtnTxt}>시작하기</Text>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  safeArea:   { flex: 1 },
  sunOuter:   { position: 'absolute', top: height * 0.08, alignSelf: 'center', left: width / 2 - 52, width: 104, height: 104, borderRadius: 52, backgroundColor: '#ffe082', opacity: 0.18 },
  sunInner:   { position: 'absolute', top: height * 0.08 + 16, alignSelf: 'center', left: width / 2 - 36, width: 72, height: 72, borderRadius: 36, backgroundColor: '#fffde7' },
  mountainWrap: { position: 'absolute', bottom: height * 0.24, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', height: 120 },
  mtn1: { width: 0, height: 0, borderLeftWidth: width * 0.38, borderRightWidth: width * 0.38, borderBottomWidth: 110, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0d3320', marginLeft: -width * 0.06 },
  mtn2: { width: 0, height: 0, borderLeftWidth: width * 0.32, borderRightWidth: width * 0.32, borderBottomWidth: 90, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#152b1a', marginLeft: -width * 0.12 },
  mtn3: { width: 0, height: 0, borderLeftWidth: width * 0.3, borderRightWidth: width * 0.3, borderBottomWidth: 120, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0a1f10', marginLeft: -width * 0.08 },
  tree:       { position: 'absolute', fontSize: 44, opacity: 0.8 },
  content:    { flex: 1, justifyContent: 'space-between', paddingTop: height * 0.06 },
  topSection: { alignItems: 'center', paddingHorizontal: 24 },
  badge:      { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16, marginBottom: 14 },
  badgeTxt:   { fontSize: 13, color: '#fff' },
  appName:    { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 42, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  appSub:     { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  bottomSection: { paddingHorizontal: 24, paddingBottom: 48 },
  quoteCard:  { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 20, padding: 20, marginBottom: 22 },
  quoteIcon:  { fontSize: 22, marginBottom: 8 },
  quoteTxt:   { fontSize: 16, color: '#fff', lineHeight: 26, fontWeight: '500' },
  quoteAuthor:{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, textAlign: 'right' },
  startBtn:   { backgroundColor: '#1a5fbc', borderRadius: 18, paddingVertical: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  startBtnTxt:{ fontSize: 18, fontWeight: '800', color: '#fff' },
});
