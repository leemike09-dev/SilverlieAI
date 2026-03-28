import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';

// Internal filter keys are always Korean (matches AI-returned category values)
const CATEGORY_KEYS = ['전체', '운동', '문화', '사교', '두뇌'];

const DEFAULT_RECOMMENDATIONS = [
  { category: '운동', emoji: '🚶', title: '공원 산책', desc: '하루 30분 가벼운 산책으로 혈압과 혈당을 개선하세요', tags: ['걷기', '야외', '혈압'], match: 92 },
  { category: '운동', emoji: '🧘', title: '실버 요가', desc: '관절에 부담 없는 스트레칭으로 유연성을 높이세요', tags: ['유연성', '실내', '관절'], match: 88 },
  { category: '문화', emoji: '📚', title: '독서 모임', desc: '매주 한 권 책을 읽고 이야기를 나눠보세요', tags: ['독서', '두뇌', '사교'], match: 85 },
  { category: '사교', emoji: '🎵', title: '노래 교실', desc: '즐거운 노래로 스트레스를 해소하고 친구를 사귀세요', tags: ['음악', '사교', '스트레스'], match: 82 },
  { category: '두뇌', emoji: '🎮', title: '두뇌 게임', desc: '퍼즐과 게임으로 인지 기능을 유지하세요', tags: ['두뇌', '인지', '게임'], match: 79 },
  { category: '문화', emoji: '🎨', title: '미술 취미', desc: '그림 그리기로 창의성을 키우고 마음을 힐링하세요', tags: ['미술', '창의', '힐링'], match: 76 },
];

type Recommendation = {
  category: string;
  emoji: string;
  title: string;
  desc: string;
  tags: string[];
  match: number;
};

export default function AIRecommendScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(DEFAULT_RECOMMENDATIONS);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [userData, setUserData] = useState<{ age?: number; interests?: string[] }>({});

  // 사용자 데이터 로드
  useEffect(() => {
    if (userId && userId !== 'demo-user') {
      fetch(`${API_URL}/users/${userId}`)
        .then(r => r.json())
        .then(data => {
          setUserData({ age: data.age, interests: data.interests || [] });
        })
        .catch(() => {});
    }
  }, [userId]);

  const getAIRecommendations = async () => {
    setLoading(true);
    try {
      const histRes = await fetch(`${API_URL}/health/history/${userId}?days=3`);
      const histData = await histRes.json();
      const latestRecord = histData.records?.[0];

      const res = await fetch(`${API_URL}/health/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_name: name,
          age: userData.age || 65,
          interests: userData.interests || [],
          steps: latestRecord?.steps || null,
          blood_pressure_systolic: latestRecord?.blood_pressure_systolic || null,
          blood_pressure_diastolic: latestRecord?.blood_pressure_diastolic || null,
          weight_kg: latestRecord?.weight || null,
          heart_rate: latestRecord?.heart_rate || null,
        }),
      });
      const data = await res.json();
      if (data.data?.recommendations?.length > 0) {
        setRecommendations(data.data.recommendations);
      }
      setAiGenerated(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const filtered = selectedCategory === '전체'
    ? recommendations
    : recommendations.filter(r => r.category === selectedCategory);

  const matchColor = (score: number) => {
    if (score >= 90) return '#2D6A4F';
    if (score >= 80) return '#40916C';
    return '#C77B3A';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.aiRecommendTitle}</Text>
        <Text style={styles.subtitle}>{t.aiRecommendSubtitle(name)}</Text>
      </View>

      {/* AI 추천 버튼 */}
      {!aiGenerated && (
        <TouchableOpacity style={styles.aiBtn} onPress={getAIRecommendations} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.aiBtnText}>{t.getAIRecommendBtn}</Text>
              <Text style={styles.aiBtnSub}>{t.getAIRecommendSub}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {aiGenerated && (
        <View style={styles.aiGeneratedBadge}>
          <Text style={styles.aiGeneratedText}>{t.aiGeneratedBadge}</Text>
        </View>
      )}

      {/* 카테고리 필터 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORY_KEYS.map((key, index) => (
          <TouchableOpacity
            key={key}
            style={[styles.categoryBtn, selectedCategory === key && styles.categoryBtnActive]}
            onPress={() => setSelectedCategory(key)}
          >
            <Text style={[styles.categoryText, selectedCategory === key && styles.categoryTextActive]}>
              {t.categories[index]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 추천 카드 목록 */}
      <View style={styles.cardList}>
        {filtered.map((rec, i) => (
          <View key={i} style={styles.recCard}>
            <View style={styles.recHeader}>
              <Text style={styles.recEmoji}>{rec.emoji}</Text>
              <View style={styles.recInfo}>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recCategory}>{rec.category}</Text>
              </View>
              <View style={[styles.matchBadge, { backgroundColor: matchColor(rec.match) }]}>
                <Text style={styles.matchText}>{rec.match}%</Text>
              </View>
            </View>
            <Text style={styles.recDesc}>{rec.desc}</Text>
            <View style={styles.tagRow}>
              {rec.tags.map((tag, j) => (
                <View key={j} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 24,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1B4332' },
  subtitle: { fontSize: 15, color: '#52B788', marginTop: 4 },
  aiBtn: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  aiBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  aiBtnSub: { color: '#B7E4C7', fontSize: 13, marginTop: 4 },
  aiGeneratedBadge: {
    margin: 16,
    backgroundColor: '#D8F3DC',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  aiGeneratedText: { color: '#2D6A4F', fontSize: 15, fontWeight: 'bold' },
  categoryRow: { marginVertical: 12 },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryBtnActive: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  categoryText: { fontSize: 15, color: '#666' },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  cardList: { paddingHorizontal: 16 },
  recCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recEmoji: { fontSize: 36, marginRight: 12 },
  recInfo: { flex: 1 },
  recTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1A17' },
  recCategory: { fontSize: 15, color: '#7A746A', marginTop: 2 },
  matchBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  recDesc: { fontSize: 16, color: '#4A4540', lineHeight: 26, marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#F0EDE7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { fontSize: 15, color: '#7A746A' },
});
