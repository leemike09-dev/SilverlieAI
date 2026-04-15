import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Platform, StatusBar, Dimensions,
} from 'react-native';
import SeniorTabBar from '../components/SeniorTabBar';

const { width } = Dimensions.get('window');
type Props = { route: any; navigation: any };

const C = {
  blue1: '#1A4A8A', blue2: '#2272B8',
  bg: '#F4F7FC', card: '#FFFFFF',
  text: '#1C1C1E', sub: '#8E8E93',
  line: '#E5E5EA',
};

const beeSource = Platform.OS === 'web'
  ? { uri: 'https://raw.githubusercontent.com/leemike09-dev/SilverlieAI/main/mobile/assets/bee_nobg.png' }
  : require('../assets/bee_nobg.png');

const HEALTH_CARDS = [
  { key: 'bp',     label: '혈압',  emoji: '🩸', color: '#F57C00', unit: 'mmHg',  demo: '128/82', status: '정상 범위' },
  { key: 'sugar',  label: '혈당',  emoji: '💧', color: '#C2185B', unit: 'mg/dL', demo: '105',    status: '공복 정상' },
  { key: 'temp',   label: '체온',  emoji: '🌡️', color: '#1565C0', unit: '°C',    demo: '36.5',   status: '정상' },
  { key: 'weight', label: '체중',  emoji: '⚖️', color: '#2E7D32', unit: 'kg',    demo: '68.2',   status: 'BMI 24.1' },
];

const CARD_W = (width - 24 - 8) / 2; // paddingHorizontal 12×2 + gap 8

export default function SeniorHomeScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};

  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(155deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: C.blue1 };

  useEffect(() => { sendLocation(); }, []);

  const sendLocation = async () => {
    try {
      // expo-location 사용 시 여기에 구현
    } catch (e) {}
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 9)  return '좋은 아침이에요 🌅';
    if (h < 12) return '활기찬 오전이에요 ☀️';
    if (h < 14) return '점심 시간이에요 🍱';
    if (h < 18) return '좋은 오후예요 🌤️';
    if (h < 21) return '좋은 저녁이에요 🌙';
    return '편안한 밤 되세요 🌛';
  };

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={[s.header, webBg]}>
        <View style={s.headerText}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name}>{name}님</Text>
          <Text style={s.subtitle}>오늘도 건강한 하루 되세요</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AIChat', { userId, name })}>
          <Image source={beeSource} style={s.beeLogo} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* 본문 - 스크롤 없음 */}
      <View style={s.body}>

        {/* 건강 카드 4개 */}
        <Text style={s.sectionTitle}>오늘의 건강 기록</Text>
        <View style={s.cardGrid}>
          {HEALTH_CARDS.map(card => (
            <TouchableOpacity
              key={card.key}
              style={[s.healthCard, { backgroundColor: card.color }]}
              onPress={() => navigation.navigate('Health')}
              activeOpacity={0.85}>
              <Text style={s.cardEmoji}>{card.emoji}</Text>
              <Text style={s.cardLabel}>{card.label}</Text>
              <Text style={s.cardVal}>{card.demo}</Text>
              <Text style={s.cardUnit}>{card.unit} · {card.status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 동선 + 걸음수 통합 카드 */}
        <View style={s.mapCard}>
          <View style={s.mapTop}>
            <Text style={s.mapTitle}>🗺️ 오늘 동선</Text>
            <Text style={s.mapSteps}>5,420<Text style={s.mapStepsUnit}> 걸음</Text></Text>
          </View>

          {Platform.OS === 'web' ? (
            <svg width="100%" height="70" viewBox="0 0 280 70" style={{ display: 'block' }}>
              <rect width="280" height="70" fill="#EEF3EE" />
              <polyline points="20,58 68,42 128,26 184,30 252,14"
                stroke="#1A4A8A" strokeWidth="2.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="58" r="5" fill="#F57C00" />
              <text x="20" y="68" fontSize="8" fill="#555" textAnchor="middle">집</text>
              <circle cx="128" cy="26" r="4" fill="#1565C0" />
              <text x="128" y="18" fontSize="8" fill="#555" textAnchor="middle">공원</text>
              <circle cx="252" cy="14" r="5" fill="#2E7D32" />
              <text x="252" y="8" fontSize="8" fill="#555" textAnchor="middle">현재</text>
            </svg>
          ) : (
            <View style={s.mapPlaceholder}>
              <Text style={s.mapPlaceholderTxt}>🗺️ 지도 로딩 중...</Text>
            </View>
          )}
        </View>

        {/* SOS + AI 상담 버튼 행 */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.sosBtn}
            onPress={() => navigation.navigate('SOS', { userId, name })}
            activeOpacity={0.85}>
            <View style={s.sosIco}>
              <Text style={{ fontSize: 22 }}>🚨</Text>
            </View>
            <View>
              <Text style={s.sosTxt}>SOS 긴급 호출</Text>
              <Text style={s.sosSub}>119 & 가족 즉시 연락</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.aiBtn}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.85}>
            <Text style={{ fontSize: 24 }}>🐝</Text>
            <Text style={s.aiBtnTxt}>{'AI'}{'\n'}{'상담'}</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* 탭바 */}
      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* 헤더 */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
    paddingHorizontal: 20, paddingBottom: 24,
  },
  headerText: { flex: 1 },
  greeting:   { fontSize: 18, color: 'rgba(255,255,255,0.75)' },
  name:       { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 2 },
  subtitle:   { fontSize: 16, color: 'rgba(255,255,255,0.70)', marginTop: 3 },
  beeLogo:    { width: 52, height: 52, marginLeft: 10 },

  /* 본문 */
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#555' },

  /* 건강 카드 2×2 */
  cardGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthCard: { width: CARD_W, borderRadius: 16, padding: 14 },
  cardEmoji:  { fontSize: 24, marginBottom: 6 },
  cardLabel:  { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  cardVal:    { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
  cardUnit:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* 동선 카드 */
  mapCard:          { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' },
  mapTop:           {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
  },
  mapTitle:         { fontSize: 15, fontWeight: '700', color: C.text },
  mapSteps:         { fontSize: 18, fontWeight: '900', color: '#7B1FA2' },
  mapStepsUnit:     { fontSize: 12, fontWeight: '400', color: '#888' },
  mapPlaceholder:   { height: 70, backgroundColor: '#EEF3EE', alignItems: 'center', justifyContent: 'center' },
  mapPlaceholderTxt:{ fontSize: 14, color: '#888' },

  /* SOS + AI 행 */
  actionRow: { flexDirection: 'row', gap: 8 },
  sosBtn: {
    flex: 1, backgroundColor: '#D32F2F', borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  sosIco: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  sosTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sosSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  aiBtn: {
    backgroundColor: C.blue1, borderRadius: 16, padding: 14, width: 68,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  aiBtnTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
});
