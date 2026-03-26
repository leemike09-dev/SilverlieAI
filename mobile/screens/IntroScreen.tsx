import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const GREETINGS = [
  { greeting: '안녕하세요!', tagline: '당신의 건강을 함께 돌봅니다' },
  { greeting: '您好！',      tagline: '一起守护您的健康' },
  { greeting: 'Hello!',     tagline: 'We care for your health together' },
  { greeting: 'こんにちは！', tagline: 'あなたの健康を一緒に守ります' },
];

export default function IntroScreen({ navigation }: any) {
  const bgAnim   = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const navigateAway = async () => {
    const userId   = await AsyncStorage.getItem('userId');
    const userName = await AsyncStorage.getItem('userName');
    if (userId && userName) {
      navigation.replace('Home', { name: userName, userId });
    } else {
      navigation.replace('Login');
    }
  };

  const showLanguage = (i: number) => {
    if (i >= GREETINGS.length) {
      // 전부 끝나면 마지막 페이드아웃 후 이동
      Animated.timing(bgAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => navigateAway());
      return;
    }
    setIndex(i);
    Animated.sequence([
      Animated.timing(textAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(textAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => showLanguage(i + 1));
  };

  useEffect(() => {
    // 배경 먼저 페이드인
    Animated.timing(bgAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => showLanguage(0));
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgAnim }]}>
      <Image
        source={require('../assets/intro-bg.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <Animated.View style={[styles.textContainer, { opacity: textAnim }]}>
        <Text style={styles.greeting}>{GREETINGS[index].greeting}</Text>
        <Text style={styles.tagline}>{GREETINGS[index].tagline}</Text>
        <Text style={styles.appName}>Silver Life AI</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  bgImage: {
    position: 'absolute',
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    width,
    height,
    backgroundColor: 'rgba(0, 60, 90, 0.45)',
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 22,
    color: '#e8f4f8',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  appName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
  },
});
