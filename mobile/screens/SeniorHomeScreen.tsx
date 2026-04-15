import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Platform, StatusBar, Dimensions,
} from 'react-native';
import SeniorTabBar from '../components/SeniorTabBar';

const { width } = Dimensions.get('window');
const API_URL = 'https://silverlieai.onrender.com';
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
  const userId = route?.params?.userId || 'demo-user';
  const name   = route?.params?.name   || '회원';

  const [advice, setAdvice]         = useState('');
  const [adviceLoading, setAdviceLoading] = useState(true);

  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(155deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: C.blue1 };

  useEffect(() => {
    sendLocation();
    fetchAdvice();
  }, []);

  const sendLocation = async () => {
    try {
      // expo-location 사용 시 여기에 구현
    } catch (e) {}
  };

  const fetchAdvice = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: '오늘 시니어 건강을 위한 짧은 한 줄 조언을 해주세요. 이모지 포함, 30자 이내로.',
          history: [],
        }),
      });
      const data = await res.json();
      const text = data.reply ?? data.response ?? '';
      if (text) setAdvice(text);
    } catch {
      setAdvice('오늘도 건강한 하루 보내세요! 💪');
    } finally {
      setAdviceLoading(false);
    }
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

  const goMotion = () => {
    if (!userId || userId === '') {
      navigation.navigate('Login');
    } else {
      navigation.navigate('FamilyDashboard', {
        seniorId: userId, seniorName: name, userId, name,
      });
    }
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
              onPress={() => navigation.navigate('Health', { userId, name })}
              activeOpacity={0.85}>
              <Text style={s.cardEmoji}>{card.emoji}</Text>
              <Text style={s.cardLabel}>{card.label}</Text>
              <Text style={s.cardVal}>{card.demo}</Text>
              <Text style={s.cardUnit}>{card.unit} · {card.status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 동선 한 줄 버튼 */}
        <TouchableOpacity style={s.motionRow} onPress={goMotion} activeOpacity={0.85}>
          <Text style={s.motionIcon}>🗺️</Text>
          <Text style={s.motionLabel}>오늘 동선 확인</Text>
          <View style={s.motionRight}>
            <Text style={s.motionSteps}>5,420걸음</Text>
            <Text style={s.motionArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 꿀비 AI 한마디 카드 */}
        <View style={s.adviceCard}>
          <Text style={s.adviceTitle}>🐝 꿀비의 오늘 건강 조언</Text>
          <Text style={s.adviceTxt}>
            {adviceLoading ? '꿀비가 분석 중이에요...' : advice}
          </Text>
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
    paddingHorizontal: 20, paddingBottom: 32,
  },
  headerText: { flex: 1 },
  greeting:   { fontSize: 20, color: 'rgba(255,255,255,0.75)' },
  name:       { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 2 },
  subtitle:   { fontSize: 18, color: 'rgba(255,255,255,0.70)', marginTop: 3 },
  beeLogo:    { width: 80, height: 80, marginLeft: 10 },

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

  /* 동선 한 줄 버튼 */
  motionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5, borderColor: '#D0E4F7',
    paddingVertical: 14, paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#1A4A8A', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  motionIcon:  { fontSize: 22 },
  motionLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: C.text },
  motionRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  motionSteps: { fontSize: 15, fontWeight: '800', color: C.blue1 },
  motionArrow: { fontSize: 22, color: '#C0C0C0', marginLeft: 2 },

  /* 꿀비 AI 조언 카드 */
  adviceCard: {
    backgroundColor: '#EBF3FB',
    borderRadius: 16,
    borderLeftWidth: 4, borderLeftColor: '#2272B8',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  adviceTitle: { fontSize: 13, fontWeight: '700', color: C.blue1, marginBottom: 6 },
  adviceTxt:   { fontSize: 17, color: C.text, lineHeight: 26 },

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
