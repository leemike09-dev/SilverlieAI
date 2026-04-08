import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Animated,
  Platform,
} from 'react-native';

import { HEADER_PADDING_TOP } from '../utils/layout';
import { useLanguage } from '../i18n/LanguageContext';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

type NewsItem = {
  country: string;
  flag: string;
  language: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
};

const IP_COUNTRY_MAP: Record<string, string> = {
  KR: 'ko', US: 'en', JP: 'ja', CN: 'zh',
  GB: 'en', AU: 'en', CA: 'en', TW: 'zh', HK: 'zh',
};

// 최대 9개 카드 애니메이션 값 미리 생성
const MAX_NEWS = 9;

export default function HealthNewsScreen({ navigation, route }: any) {
  const { t, language } = useLanguage();
  const userId = route?.params?.userId || '';
  const name   = route?.params?.name   || '';
  const isLoggedIn = !!userId;
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [isFemale, setIsFemale] = useState(true);

  const slideAnims = useRef(
    Array.from({ length: MAX_NEWS }, () => new Animated.Value(80))
  ).current;
  const fadeAnims = useRef(
    Array.from({ length: MAX_NEWS }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    fetchNewsWithIP();
    return () => { // Speech.stop(); };
  }, []);

  // 뉴스 로드 완료 → 카드 순차 슬라이드업
  useEffect(() => {
    if (news.length === 0) return;

    // 각 카드를 200ms 간격으로 천천히 슬라이드업
    news.forEach((_, i) => {
      const delay = i * 200;
      Animated.parallel([
        Animated.timing(slideAnims[i], {
          toValue: 0,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [news]);

  const fetchNewsWithIP = async () => {
    try {
      let userLang = 'ko';
      if (isLoggedIn) {
        // 로그인 상태: 앱 언어 설정 사용
        userLang = language;
      } else {
        // 미로그인: IP로 언어 감지
        try {
          const ipRes = await fetch('https://ipapi.co/json/');
          const ipData = await ipRes.json();
          const countryCode = ipData.country_code || '';
          userLang = IP_COUNTRY_MAP[countryCode] || 'ko';
        } catch {}
      }

      const res = await fetch(`${API_URL}/news/health-news?language=${userLang}`);
      const data = await res.json();
      setNews(data.news || []);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const speak = (item: NewsItem, index: number) => {
    const key = String(index);
    if (speaking === key) {
      // Speech.stop();
      setSpeaking(null);
      return;
    }
    // Speech.stop();
    const langMap: Record<string, string> = {
      ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN',
    };
    setSpeaking(key);
    // Speech.speak(`${item.title}. ${item.summary}`, {
      language: langMap[item.language] || 'ko-KR',
      pitch: isFemale ? 1.2 : 0.8,
      rate: 0.9,
      onDone:  () => setSpeaking(null),
      onError: () => setSpeaking(null),
    });
  };

  const goNext = async () => {
    // Speech.stop();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isLoggedIn && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t.home ?? '홈'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>🌏 오늘의 건강 뉴스</Text>
        <Text style={styles.subtitle}>Today's Health News</Text>
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

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>뉴스를 불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {news.length === 0 ? (
            <Text style={styles.errorText}>뉴스를 불러올 수 없습니다.</Text>
          ) : (
            news.map((item, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: fadeAnims[index],
                  transform: [{ translateY: slideAnims[index] }],
                }}
              >
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <View style={styles.cardTitleBox}>
                      <Text style={styles.countryName}>{item.country}</Text>
                      <Text style={styles.newsTitle}>{item.title}</Text>
                    </View>
                    <TouchableOpacity style={styles.playBtn} onPress={() => speak(item, index)}>
                      <Text style={styles.playBtnText}>
                        {speaking === String(index) ? '⏹' : '▶️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.summary}>{item.summary}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(item.source_url)}>
                    <Text style={styles.source}>📰 {item.source} — 기사 전문 보기 ↗</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {isLoggedIn ? (
        <BottomTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
      ) : (
        <View style={styles.loginGuide}>
          <Text style={styles.loginGuideText}>뉴스를 다 읽으셨나요?</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>Log In →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20, paddingTop: HEADER_PADDING_TOP, paddingBottom: 16,
  },
  backBtn:  { marginBottom: 10 },
  backText: { color: '#B7E4C7', fontSize: 14, fontWeight: '600' },
  title:    { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#B7E4C7', marginTop: 2, marginBottom: 12 },
  voiceToggle: { flexDirection: 'row', gap: 8 },
  voiceBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  voiceBtnActive:     { backgroundColor: '#fff' },
  voiceBtnText:       { fontSize: 14, color: '#B7E4C7', fontWeight: '600' },
  voiceBtnTextActive: { color: '#2D6A4F' },
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText:   { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 40 },
  scroll:      { flex: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  flag:          { fontSize: 32, marginRight: 12 },
  cardTitleBox:  { flex: 1 },
  countryName:   { fontSize: 13, color: '#2D6A4F', fontWeight: '700', marginBottom: 4 },
  newsTitle:     { fontSize: 16, fontWeight: 'bold', color: '#1C1A17', lineHeight: 22 },
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
