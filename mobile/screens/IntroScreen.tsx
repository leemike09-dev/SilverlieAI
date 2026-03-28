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

const IP_LANG_MAP: Record<string, string> = {
  KR: 'ko', JP: 'ja', CN: 'zh', TW: 'zh', HK: 'zh',
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en',
};

const GREETINGS: Record<string, { greeting: string; tagline: string }> = {
  ko: { greeting: '안녕하세요!',   tagline: '당신의 건강을 함께 돌봅니다' },
  zh: { greeting: '您好！',        tagline: '一起守护您的健康' },
  en: { greeting: 'Hello!',       tagline: 'We care for your health together' },
  ja: { greeting: 'こんにちは！',  tagline: 'あなたの健康を一緒に守ります' },
};

export default function IntroScreen({ navigation }: any) {
  const bgAnim   = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const langRef  = useRef<string>('ko');
  const [displayLang, setDisplayLang] = useState<string>('ko');

  const navigateAway = async () => {
    const userId   = await AsyncStorage.getItem('userId');
    const userName = await AsyncStorage.getItem('userName');
    if (userId && userName) {
      navigation.replace('Home', { name: userName, userId });
    } else {
      navigation.replace('HealthNews');
    }
  };

  useEffect(() => {
    const run = async () => {
      // 1) IP 감지 먼저 (배경 페이드인과 병렬)
      Animated.timing(bgAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();

      try {
        const res = await Promise.race([
          fetch('https://ipapi.co/json/'),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
        ]) as Response;
        const data = await res.json();
        const detected = IP_LANG_MAP[data.country_code] || 'ko';
        langRef.current = detected;
        setDisplayLang(detected);
      } catch {
        // 기본 ko 유지
      }

      // 2) 배경이 충분히 보인 뒤 인사말 표시 (총 0.8s 기다림)
      await new Promise(r => setTimeout(r, 800));

      // 3) 인사말 페이드인 → 1.5s 유지 → 페이드아웃 → 이동
      Animated.timing(textAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(textAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            Animated.timing(bgAnim,   { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start(() => navigateAway());
        }, 1500);
      });
    };

    run();
  }, []);

  const g = GREETINGS[displayLang] || GREETINGS['ko'];

  return (
    <Animated.View style={[styles.container, { opacity: bgAnim }]}>
      <Image
        source={require('../assets/intro-bg.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <Animated.View style={[styles.textContainer, { opacity: textAnim }]}>
        <Text style={styles.greeting}>{g.greeting}</Text>
        <Text style={styles.tagline}>{g.tagline}</Text>
        <Text style={styles.appName}>Silver Life AI</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width, height },
  bgImage:   { position: 'absolute', width, height },
  overlay: {
    position: 'absolute', width, height,
    backgroundColor: 'rgba(0, 60, 90, 0.45)',
  },
  textContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  tagline: {
    fontSize: 22, color: '#e8f4f8', textAlign: 'center', marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  appName: { fontSize: 16, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 },
});
