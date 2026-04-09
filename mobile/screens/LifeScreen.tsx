import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import { StatusBar,
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Dimensions, Linking, ActivityIndicator, Platform,
} from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';

const openURL = (url: string) => {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    Linking.openURL(url);
  }
};

const { width } = Dimensions.get('window');

type Props = { route: any; navigation: any };

const GRID_ITEMS = [
  { icon: '🥗', title: '레시피',           sub: '시니어 맞춤 건강 요리',       type: 'recipe'   },
  { icon: '🧘', title: '운동',              sub: '집에서 하는 가벼운 스트레칭', type: 'exercise' },
  { icon: '🧩', title: '치매예방\n두뇌게임', sub: '매일 10분 두뇌 트레이닝',   type: 'brain'    },
  { icon: '🎭', title: '문화·공연',         sub: '이번 주 추천 문화 행사',      type: 'culture'  },
];

const YOUTUBE_LINKS: Record<string, string> = {
  golf: 'https://www.youtube.com/results?search_query=시니어+골프+레슨',
  ai:   'https://www.youtube.com/results?search_query=시니어를+위한+AI+활용법+강의',
};

const LECTURES = [
  { icon: '⛳', title: '인터넷 골프 레슨', sub: '시니어를 위한 최적의 강의', color: '#388e3c' },
  { icon: '🤖', title: 'AI 인터넷 강의',   sub: '시니어를 위한 쉬운 강의',   color: '#1565c0' },
];

export default function LifeScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [travel, setTravel] = useState<{title:string; sub:string; tags:string} | null>(null);
  const [travelLoading, setTravelLoading] = useState(true);

  useEffect(() => {
    const DEFAULT = { title: '봄 건강 여행', sub: '경주 온천 1박 2일', tags: '🌡 온천 치료 · 🍱 한식 건강식 · 🚌 편의 이동' };
    const timer = setTimeout(() => { setTravel(DEFAULT); setTravelLoading(false); }, 5000);
    fetch(`${API_URL}/ai/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '한국 시니어에게 맞는 봄 여행지 1곳을 추천해줘. 제목(15자 이내), 부제(20자 이내), 키워드 3개를 JSON으로: {"title":"...","sub":"...","tags":"... · ... · ..."}' }),
    })
      .then(r => r.json())
      .then(d => {
        const text = d.reply || '';
        const start = text.indexOf('{'); const end = text.lastIndexOf('}') + 1;
        if (start >= 0) setTravel(JSON.parse(text.slice(start, end)));
        else setTravel(DEFAULT);
      })
      .catch(() => setTravel(DEFAULT))
      .finally(() => { clearTimeout(timer); setTravelLoading(false); });
  }, []);

  return (
    <View style={[styles.safe, {flex:1}]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>즐거운 시니어 라이프</Text>
        <Text style={styles.headerTitle}>🌿 라이프</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ─── AI 히어로 배너 ─── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTag}><Text style={styles.heroTagText}>✈️ AI 여행 맞춤</Text></View>
          {travelLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <>
              <Text style={styles.heroTitle}>{travel?.title ?? '봄 건강 여행'}</Text>
              <Text style={styles.heroSub}>{travel?.sub ?? '경주 온천 1박 2일'}</Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaText}>{travel?.tags ?? '🌡 온천 치료  •  🍱 한식 건강식  •  🚌 편의 이동'}</Text>
              </View>
            </>
          )}
          <TouchableOpacity style={styles.heroBtn}
            onPress={() => navigation.navigate('LifeDetail', {
              type: 'travel',
              name, userId,
              travelTitle: travel?.title,
              travelSub: travel?.sub,
              travelTags: travel?.tags,
            })}>
            <Text style={styles.heroBtnText}>자세히 보기 →</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 섹션 제목 ─── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>라이프 스타일</Text>
          <TouchableOpacity><Text style={styles.sectionMore}>전체보기</Text></TouchableOpacity>
        </View>

        {/* ─── 2×2 그리드 ─── */}
        <View style={styles.grid}>
          {GRID_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={styles.gridCard} activeOpacity={0.82}
              onPress={() => navigation.navigate('LifeDetail', { type: item.type, name, userId })}>
              <Text style={styles.gridIcon}>{item.icon}</Text>
              <Text style={styles.gridTitle}>{item.title}</Text>
              <Text style={styles.gridSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── 인터넷 강의 ─── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>인터넷 강의</Text>
          <TouchableOpacity><Text style={styles.sectionMore}>전체보기</Text></TouchableOpacity>
        </View>

        {LECTURES.map((lec, i) => (
          <TouchableOpacity key={i} style={styles.lectureCard} activeOpacity={0.85}
            onPress={() => openURL(YOUTUBE_LINKS[i === 0 ? 'golf' : 'ai'])}>
            <View style={[styles.lectureAccent, { backgroundColor: lec.color }]} />
            <View style={styles.lectureIconWrap}>
              <Text style={styles.lectureIcon}>{lec.icon}</Text>
            </View>
            <View style={styles.lectureText}>
              <Text style={styles.lectureTitle}>{lec.title}</Text>
              <Text style={styles.lectureSub}>{lec.sub}</Text>
            </View>
            <Text style={styles.lectureArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const GREEN = '#1A4A8A';
const GREEN_LIGHT = '#2272B8';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F0F5FB' },
  scroll: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 16 : (StatusBar.currentHeight ?? 28) + 4, paddingBottom: 20,
  },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  /* Hero Banner */
  heroBanner: {
    margin: 16, borderRadius: 18,
    backgroundColor: GREEN_LIGHT,
    padding: 20, overflow: 'hidden',
  },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  heroTagText:  { color: '#fff', fontSize: 13, fontWeight: '600' },
  heroTitle:    { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  heroSub:      { color: 'rgba(255,255,255,0.9)', fontSize: 17, marginBottom: 12 },
  heroMeta:     { backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: 8, marginBottom: 14 },
  heroMetaText: { color: '#fff', fontSize: 14 },
  heroBtn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  heroBtnText: { color: GREEN, fontWeight: '700', fontSize: 15 },

  /* Section header */
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A4A8A' },
  sectionMore:  { fontSize: 14, color: '#2272B8' },

  /* 2×2 Grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, gap: 10, marginBottom: 16 },
  gridCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    shadowColor: '#1A4A8A', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 3,
  },
  gridIcon:  { fontSize: 34, marginBottom: 10 },
  gridTitle: { fontSize: 17, fontWeight: '700', color: '#1A4A8A', marginBottom: 4 },
  gridSub:   { fontSize: 13, color: '#7A90A8', lineHeight: 18 },

  /* Lecture Cards */
  lectureCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
    elevation: 2,
  },
  lectureAccent: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
  lectureIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EBF3FB',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  lectureIcon:  { fontSize: 22 },
  lectureText:  { flex: 1 },
  lectureTitle: { fontSize: 17, fontWeight: '700', color: '#16273E', marginBottom: 4 },
  lectureSub:   { fontSize: 14, color: '#7A90A8' },
  lectureArrow: { fontSize: 22, color: '#b0bec5', marginLeft: 8 },
});
