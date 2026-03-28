import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { HEADER_PADDING_TOP } from '../utils/layout';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://silverlieai.onrender.com';

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

const MAX_NEWS = 9;

type NewsItem = {
  country: string; flag: string; language: string;
  title: string; summary: string; source: string; source_url: string;
};

export default function IntroScreen({ navigation }: any) {
  const bgAnim      = useRef(new Animated.Value(0)).current;
  const textAnim    = useRef(new Animated.Value(0)).current;
  const newsPanelY  = useRef(new Animated.Value(height)).current;

  const slideAnims = useRef(Array.from({ length: MAX_NEWS }, () => new Animated.Value(60))).current;
  const fadeAnims  = useRef(Array.from({ length: MAX_NEWS }, () => new Animated.Value(0))).current;

  const [displayLang, setDisplayLang] = useState('ko');
  const [newsLang,    setNewsLang]    = useState('ko');
  const [news,        setNews]        = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [speaking,    setSpeaking]    = useState<string | null>(null);
  const [isFemale,    setIsFemale]    = useState(true);
  const [showNews,    setShowNews]    = useState(false);

  const goLogin = async () => {
    Speech.stop();
    const userId   = await AsyncStorage.getItem('userId');
    const userName = await AsyncStorage.getItem('userName');
    if (userId && userName) {
      navigation.replace('Home', { name: userName, userId });
    } else {
      navigation.replace('Login');
    }
  };

  // 뉴스 카드 순차 슬라이드업
  const animateCards = (count: number) => {
    Array.from({ length: count }).forEach((_, i) => {
      Animated.parallel([
        Animated.timing(slideAnims[i], { toValue: 0, duration: 600, delay: i * 200, useNativeDriver: true }),
        Animated.timing(fadeAnims[i],  { toValue: 1, duration: 600, delay: i * 200, useNativeDriver: true }),
      ]).start();
    });
  };

  // 뉴스 불러오기
  const fetchNews = async (lang: string) => {
    setLoadingNews(true);
    try {
      const res  = await fetch(`${API_URL}/news/health-news?language=${lang}`);
      const data = await res.json();
      const items = data.news || [];
      setNews(items);
      setLoadingNews(false);
      setTimeout(() => animateCards(items.length), 100);
    } catch {
      setLoadingNews(false);
    }
  };

  const speak = (item: NewsItem, index: number) => {
    const key = String(index);
    if (speaking === key) { Speech.stop(); setSpeaking(null); return; }
    Speech.stop();
    const langMap: Record<string,string> = { ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN' };
    setSpeaking(key);
    Speech.speak(`${item.title}. ${item.summary}`, {
      language: langMap[item.language] || 'ko-KR',
      pitch: isFemale ? 1.2 : 0.8, rate: 0.9,
      onDone: () => setSpeaking(null), onError: () => setSpeaking(null),
    });
  };

  useEffect(() => {
    const run = async () => {
      // 배경 페이드인과 IP 감지 병렬
      Animated.timing(bgAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();

      let lang = 'ko';
      try {
        const res  = await Promise.race([
          fetch('https://ipapi.co/json/'),
          new Promise<never>((_, rej) => setTimeout(() => rej('timeout'), 2000)),
        ]) as Response;
        const data = await res.json();
        lang = IP_LANG_MAP[data.country_code] || 'ko';
      } catch {}

      setDisplayLang(lang);
      setNewsLang(lang);

      // 배경 표시 후 인사말 페이드인
      await new Promise(r => setTimeout(r, 800));
      Animated.timing(textAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
        // 1.5초 표시 후 페이드아웃
        setTimeout(() => {
          Animated.timing(textAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
            // 인트로 배경은 유지한 채 뉴스 패널을 아래에서 위로 슬라이드
            setShowNews(true);
            fetchNews(lang);
            Animated.timing(newsPanelY, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }).start();
          });
        }, 1500);
      });
    };

    run();
    return () => { Speech.stop(); };
  }, []);

  const g = GREETINGS[displayLang] || GREETINGS['ko'];

  return (
    <View style={styles.root}>
      {/* 인트로 배경 — 항상 유지 */}
      <Animated.View style={[styles.introLayer, { opacity: bgAnim }]}>
        <Image source={require('../assets/intro-bg.jpg')} style={styles.bgImage} resizeMode="cover" />
        <View style={styles.overlay} />
        <Animated.View style={[styles.textContainer, { opacity: textAnim }]}>
          <Text style={styles.greeting}>{g.greeting}</Text>
          <Text style={styles.tagline}>{g.tagline}</Text>
          <Text style={styles.appName}>Silver Life AI</Text>
        </Animated.View>
      </Animated.View>

      {/* 뉴스 패널 — 아래에서 위로 슬라이드 */}
      {showNews && (
        <Animated.View style={[styles.newsPanel, { transform: [{ translateY: newsPanelY }] }]}>
          {/* 헤더 */}
          <View style={styles.newsHeader}>
            <Text style={styles.newsTitle}>🌏 오늘의 건강 뉴스</Text>
            <Text style={styles.newsSubtitle}>Today's Health News</Text>
            <View style={styles.voiceToggle}>
              <TouchableOpacity
                style={[styles.voiceBtn, isFemale && styles.voiceBtnActive]}
                onPress={() => setIsFemale(true)}
              >
                <Text style={[styles.voiceBtnText, isFemale && styles.voiceBtnTextActive]}>👩 여성</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceBtn, !isFemale && styles.voiceBtnActive]}
                onPress={() => setIsFemale(false)}
              >
                <Text style={[styles.voiceBtnText, !isFemale && styles.voiceBtnTextActive]}>👨 남성</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 뉴스 목록 */}
          {loadingNews ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2D6A4F" />
              <Text style={styles.loadingText}>뉴스를 불러오는 중...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
              {news.map((item, index) => (
                <Animated.View
                  key={index}
                  style={{ opacity: fadeAnims[index], transform: [{ translateY: slideAnims[index] }] }}
                >
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.flag}>{item.flag}</Text>
                      <View style={styles.cardTitleBox}>
                        <Text style={styles.countryName}>{item.country}</Text>
                        <Text style={styles.newsItemTitle}>{item.title}</Text>
                      </View>
                      <TouchableOpacity style={styles.playBtn} onPress={() => speak(item, index)}>
                        <Text style={styles.playBtnText}>{speaking === String(index) ? '⏹' : '▶️'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.summary}>{item.summary}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(item.source_url)}>
                      <Text style={styles.source}>📰 {item.source} — 기사 전문 보기 ↗</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          )}

          {/* 로그인 버튼 */}
          <View style={styles.loginGuide}>
            <Text style={styles.loginGuideText}>뉴스를 다 읽으셨나요?</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={goLogin}>
              <Text style={styles.nextBtnText}>Log In →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },
  introLayer:  { position: 'absolute', width, height },
  bgImage:     { position: 'absolute', width, height },
  overlay:     { position: 'absolute', width, height, backgroundColor: 'rgba(0,60,90,0.45)' },
  textContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  greeting: {
    fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width:1, height:1 }, textShadowRadius: 4,
  },
  tagline: {
    fontSize: 22, color: '#e8f4f8', textAlign: 'center', marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width:1, height:1 }, textShadowRadius: 4,
  },
  appName: { fontSize: 16, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 },

  newsPanel: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: '#F7F4EF',
  },
  newsHeader: {
    backgroundColor: '#2D6A4F', padding: 20,
    paddingTop: HEADER_PADDING_TOP, paddingBottom: 16,
  },
  newsTitle:    { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  newsSubtitle: { fontSize: 13, color: '#B7E4C7', marginTop: 2, marginBottom: 12 },
  voiceToggle:  { flexDirection: 'row', gap: 8 },
  voiceBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  voiceBtnActive:     { backgroundColor: '#fff' },
  voiceBtnText:       { fontSize: 14, color: '#B7E4C7', fontWeight: '600' },
  voiceBtnTextActive: { color: '#2D6A4F' },
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  scroll:      { flex: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width:0, height:2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  flag:           { fontSize: 32, marginRight: 12 },
  cardTitleBox:   { flex: 1 },
  countryName:    { fontSize: 13, color: '#2D6A4F', fontWeight: '700', marginBottom: 4 },
  newsItemTitle:  { fontSize: 16, fontWeight: 'bold', color: '#1C1A17', lineHeight: 22 },
  playBtn: {
    backgroundColor: '#E8F4F0', borderRadius: 24, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  playBtnText:    { fontSize: 20 },
  summary:        { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 10 },
  source:         { fontSize: 13, color: '#888' },
  loginGuide:     { position: 'absolute', bottom: 24, left: 24, right: 24 },
  loginGuideText: { textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 8 },
  nextBtn:        { backgroundColor: '#2D6A4F', borderRadius: 14, padding: 18, alignItems: 'center' },
  nextBtnText:    { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
