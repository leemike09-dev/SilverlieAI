import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Speech from 'expo-speech';
import { HEADER_PADDING_TOP } from '../utils/layout';

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
  GB: 'en', AU: 'en', CA: 'en',
};

export default function HealthNewsScreen({ navigation }: any) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [isFemale, setIsFemale] = useState(true);

  useEffect(() => {
    fetchNewsWithIP();
    return () => { Speech.stop(); };
  }, []);

  const fetchNewsWithIP = async () => {
    try {
      // IP 감지
      let userLang = 'ko';
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const countryCode = ipData.country_code || '';
        userLang = IP_COUNTRY_MAP[countryCode] || 'ko';
      } catch {}

      const res = await fetch(`${API_URL}/news/health-news?language=${userLang}`);
      const data = await res.json();
      setNews(data.news || []);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const getVoice = (language: string) => {
    if (Platform.OS === 'ios') {
      const voices: Record<string, { female: string; male: string }> = {
        ko: { female: 'ko-KR-language', male: 'ko-KR-language' },
        en: { female: 'en-US-language', male: 'en-US-language' },
        ja: { female: 'ja-JP-language', male: 'ja-JP-language' },
        zh: { female: 'zh-CN-language', male: 'zh-CN-language' },
      };
      return voices[language] || voices['ko'];
    }
    return null;
  };

  const speak = (item: NewsItem) => {
    if (speaking === item.country) {
      Speech.stop();
      setSpeaking(null);
      return;
    }
    Speech.stop();

    const langMap: Record<string, string> = {
      ko: 'ko-KR',
      en: 'en-US',
      ja: 'ja-JP',
      zh: 'zh-CN',
    };

    const text = `${item.title}. ${item.summary}`;
    setSpeaking(item.country);

    Speech.speak(text, {
      language: langMap[item.language] || 'ko-KR',
      pitch: isFemale ? 1.2 : 0.8,
      rate: 0.9,
      onDone: () => setSpeaking(null),
      onError: () => setSpeaking(null),
    });
  };

  const goNext = async () => {
    Speech.stop();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌏 오늘의 건강 뉴스</Text>
        <Text style={styles.subtitle}>Today's Health News</Text>

        {/* 남/여 토글 */}
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
            news.map((item) => (
              <View key={item.country} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={styles.cardTitleBox}>
                    <Text style={styles.countryName}>{item.country}</Text>
                    <Text style={styles.newsTitle}>{item.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.playBtn} onPress={() => speak(item)}>
                    <Text style={styles.playBtnText}>
                      {speaking === item.country ? '⏹' : '▶️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.summary}>{item.summary}</Text>
                <TouchableOpacity onPress={() => {
                  const query = encodeURIComponent(item.title);
                  const langMap: Record<string, string> = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-CN' };
                  const hl = langMap[item.language] || 'ko';
                  Linking.openURL(`https://news.google.com/search?q=${query}&hl=${hl}`);
                }}>
                  <Text style={styles.source}>📰 {item.source} — 관련 기사 보기 ↗</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
        <Text style={styles.nextBtnText}>Log In →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#B7E4C7', marginTop: 2, marginBottom: 12 },
  voiceToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  voiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  voiceBtnActive: { backgroundColor: '#fff' },
  voiceBtnText: { fontSize: 14, color: '#B7E4C7', fontWeight: '600' },
  voiceBtnTextActive: { color: '#2D6A4F' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 40 },
  scroll: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  flag: { fontSize: 32, marginRight: 12 },
  cardTitleBox: { flex: 1 },
  countryName: { fontSize: 13, color: '#2D6A4F', fontWeight: '700', marginBottom: 4 },
  newsTitle: { fontSize: 16, fontWeight: 'bold', color: '#1C1A17', lineHeight: 22 },
  playBtn: {
    backgroundColor: '#E8F4F0',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  playBtnText: { fontSize: 20 },
  summary: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 10 },
  source: { fontSize: 13, color: '#888' },
  nextBtn: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
