import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

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
      <StatusBar barStyle="light-content" backgroundColor="#2d6e5a" />

      {/* 배경 그라디언트 레이어 (세이지그린 → 스틸블루 → 다크네이비) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a2d4a' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#3a7a8a', opacity: 0.55, top: 0, bottom: '45%' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#5a9e8a', opacity: 0.6, top: 0, bottom: '65%' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#7eb8a0', opacity: 0.5, top: 0, bottom: '75%' }]} />

      {/* 태양 글로우 */}
      <View style={s.sunGlow} />
      <View style={s.sunCore} />

      {/* 산 실루엣 */}
      <View style={s.mountains}>
        <View style={s.mtnL} />
        <View style={s.mtnR} />
        <View style={s.mtnM} />
      </View>

      {/* 나무 */}
      <Text style={s.treeL}>🌲</Text>
      <Text style={s.treeR}>🌳</Text>

      {/* 콘텐츠 */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, justifyContent: 'space-between', paddingTop: 80 }]}>

        {/* 상단 */}
        <View style={s.top}>
          <View style={s.badge}><Text style={s.badgeTxt}>🌿 Silver Life AI</Text></View>
          <Text style={s.title}>{'건강한 하루,\n행복한 내일'}</Text>
          <Text style={s.subtitle}>시니어를 위한 AI 건강 파트너</Text>
        </View>

        {/* 하단 */}
        <Animated.View style={[s.bottom, { transform: [{ translateY: slideAnim }] }]}>
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
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  sunGlow:    { position: 'absolute', top: 60, alignSelf: 'center', width: 120, height: 120, borderRadius: 60, backgroundColor: '#f5c842', opacity: 0.18, left: '50%', marginLeft: -60 },
  sunCore:    { position: 'absolute', top: 80, alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#fffde7', left: '50%', marginLeft: -40 },
  mountains:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', flexDirection: 'row', alignItems: 'flex-end' },
  mtnL:       { position: 'absolute', bottom: 0, left: -20, width: 0, height: 0, borderLeftWidth: 160, borderRightWidth: 160, borderBottomWidth: 180, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0d3320' },
  mtnR:       { position: 'absolute', bottom: 0, right: -20, width: 0, height: 0, borderLeftWidth: 150, borderRightWidth: 150, borderBottomWidth: 160, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0a2918' },
  mtnM:       { position: 'absolute', bottom: 0, left: '30%', width: 0, height: 0, borderLeftWidth: 140, borderRightWidth: 140, borderBottomWidth: 200, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#091f14' },
  treeL:      { position: 'absolute', bottom: '24%', left: 20, fontSize: 42, opacity: 0.85 },
  treeR:      { position: 'absolute', bottom: '23%', right: 16, fontSize: 38, opacity: 0.8 },
  top:        { alignItems: 'center', paddingHorizontal: 28 },
  badge:      { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 22, paddingVertical: 6, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  badgeTxt:   { fontSize: 14, color: '#fff', fontWeight: '600' },
  title:      { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 46, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  subtitle:   { fontSize: 15, color: 'rgba(255,255,255,0.82)', marginTop: 10 },
  bottom:     { paddingHorizontal: 24, paddingBottom: 52 },
  quoteCard:  { backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: 20, marginBottom: 20 },
  quoteIcon:  { fontSize: 22, marginBottom: 10 },
  quoteTxt:   { fontSize: 16, color: '#fff', lineHeight: 26, fontWeight: '500' },
  quoteAuthor:{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 10, textAlign: 'right' },
  startBtn:   { backgroundColor: '#2d6e5a', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  startBtnTxt:{ fontSize: 18, fontWeight: '800', color: '#fff' },
});
