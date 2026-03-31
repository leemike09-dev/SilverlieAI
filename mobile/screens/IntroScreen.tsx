import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const QUOTE = {
  text: '"건강이 전부는 아니지만,\n건강 없이는 전부가 없다."',
  author: '\u2014 아르투어 쇼펜하우어',
};

export default function IntroScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, delay: 300, useNativeDriver: true }),
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1f3c" />

      {/* 배경 레이어 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a1f3c' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a5fbc', opacity: 0.35 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2d8a6e', opacity: 0.25, top: 0, height: height * 0.5 }]} />

      {/* 태양 */}
      <View style={styles.sun} />
      <View style={styles.sunGlow} />

      {/* 산 실루엣 */}
      <View style={styles.mountain1} />
      <View style={styles.mountain2} />
      <View style={styles.mountain3} />

      {/* 나무 */}
      <Text style={[styles.tree, { left: 28, bottom: height * 0.28 + 8 }]}>🌲</Text>
      <Text style={[styles.tree, { right: 24, bottom: height * 0.28 + 4, fontSize: 36 }]}>🌳</Text>

      {/* 콘텐츠 */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.topSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌿 Silver Life AI</Text>
          </View>
          <Text style={styles.appName}>건강한 하루,{'\n'}행복한 내일</Text>
          <Text style={styles.appSub}>시니어를 위한 AI 건강 파트너</Text>
        </View>

        <Animated.View style={[styles.bottomSection, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.quoteCard}>
            <Text style={styles.quoteIcon}>💬</Text>
            <Text style={styles.quoteText}>{QUOTE.text}</Text>
            <Text style={styles.quoteAuthor}>{QUOTE.author}</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>시작하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1f3c' },
  sun: {
    position: 'absolute', top: height * 0.1, left: width / 2 - 36,
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#fffde7',
  },
  sunGlow: {
    position: 'absolute', top: height * 0.1 - 20, left: width / 2 - 56,
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: '#ffe082', opacity: 0.2,
  },
  mountain1: {
    position: 'absolute', bottom: height * 0.28,
    left: -20, width: width * 0.55, height: height * 0.22,
    backgroundColor: '#1a3d2b', borderTopRightRadius: width * 0.3,
    transform: [{ skewX: '8deg' }],
  },
  mountain2: {
    position: 'absolute', bottom: height * 0.28,
    right: -20, width: width * 0.55, height: height * 0.18,
    backgroundColor: '#14321f', borderTopLeftRadius: width * 0.28,
    transform: [{ skewX: '-6deg' }],
  },
  mountain3: {
    position: 'absolute', bottom: height * 0.28,
    left: width * 0.2, width: width * 0.5, height: height * 0.14,
    backgroundColor: '#0f2818', borderTopLeftRadius: width * 0.2, borderTopRightRadius: width * 0.2,
  },
  tree: { position: 'absolute', fontSize: 44, opacity: 0.75 },
  content: { flex: 1, justifyContent: 'space-between', paddingTop: height * 0.07 },
  topSection: { alignItems: 'center', paddingHorizontal: 24 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16, marginBottom: 14,
  },
  badgeText: { fontSize: 13, color: '#fff' },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 42,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  appSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  bottomSection: { paddingHorizontal: 24, paddingBottom: 52 },
  quoteCard: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, padding: 20, marginBottom: 22,
  },
  quoteIcon: { fontSize: 22, marginBottom: 8 },
  quoteText: { fontSize: 16, color: '#fff', lineHeight: 26, fontWeight: '500' },
  quoteAuthor: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, textAlign: 'right' },
  startBtn: {
    backgroundColor: '#1a5fbc', borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', shadowColor: '#1a5fbc', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  startBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
