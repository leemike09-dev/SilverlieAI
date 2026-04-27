import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Image, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

const LUMI_IMG = require('../assets/lumi8.png');

function LumiCharacter({ size = 80 }: { size?: number }) {
  if (LUMI_IMG) {
    return <Image source={LUMI_IMG} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  const s = size;
  return (
    <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ position: 'absolute', width: s, height: s, borderRadius: s / 2, backgroundColor: '#C8E6FA' }} />
      <View style={{ position: 'absolute', width: s * 0.78, height: s * 0.78, borderRadius: s * 0.39, backgroundColor: '#90CAF9' }} />
      <View style={{ width: s * 0.58, height: s * 0.58, borderRadius: s * 0.29, backgroundColor: '#42A5F5', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: s * 0.3 }}>✨</Text>
      </View>
    </View>
  );
}

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name,   setName]   = useState<string>(route?.params?.name   || '');
  const [steps,  setSteps]  = useState<number | null>(null);
  const ttsDoneRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId)   fetchLatest(storedId);
    };
    init();
    return () => stopSpeech();
  }, []);

  const fetchLatest = async (uid: string) => {
    try {
      const r = await fetch(`${API}/health/records/${uid}`);
      if (!r.ok) return;
      const d = await r.json();
      const recs: any[] = d.records || [];
      if (recs.length === 0) return;
      const latest = recs[0];
      if (latest.steps) setSteps(latest.steps);
      const today = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const h = new Date().getHours();
        const g = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        setTimeout(() => speak(`${g}, ${uname}님! 오늘도 건강한 하루 되세요.`, 0.85), 800);
      } else {
        ttsDoneRef.current = true;
      }
    } catch {}
  };

  const now     = new Date();
  const hour    = now.getHours();
  const minute  = now.getMinutes();
  const days    = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일(${days[now.getDay()]})`;
  const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm    = hour < 12 ? '오전' : '오후';
  const timeStr = `${ampm} ${h12}:${String(minute).padStart(2, '0')}`;

  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <LinearGradient
      colors={['#A8D8F0', '#C8E8F5', '#E4F3FB', '#F5FAFD']}
      locations={[0, 0.3, 0.65, 1]}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#A8D8F0" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* ══ 상단 바 ══ */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View>
            <Text style={s.topTitle}>Lumi</Text>
            <Text style={s.topSub}>65+ 건강·안심·친구</Text>
          </View>
          <View style={s.topRight}>
            <Text style={s.topDate}>{dateStr}</Text>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* ══ 히어로: 인사 + 캐릭터 ══ */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroGreet}>{greeting}</Text>
            <Text style={s.heroSub}>
              {name ? `${name}님, ` : ''}오늘도 함께해요 💙
            </Text>
            <View style={s.speechBubble}>
              <Text style={s.speechTxt}>제가 도와드릴게요!</Text>
            </View>
            {steps !== null && (
              <Text style={s.stepsInfo}>👟 오늘 {steps.toLocaleString()} 걸음</Text>
            )}
          </View>
          <View style={s.heroRight}>
            <LumiCharacter size={140} />
          </View>
        </View>

        {/* ══ 오늘 일정 카드 ══ */}
        <TouchableOpacity
          style={s.scheduleCard}
          onPress={() => navigation.navigate('Health', { userId, name })}
          activeOpacity={0.85}
        >
          <Text style={s.scheduleIcon}>📅</Text>
          <View style={s.scheduleTxt}>
            <Text style={s.scheduleLabel}>오늘 건강 기록</Text>
            <Text style={s.scheduleSub}>혈압·혈당·체온을 입력해 보세요</Text>
          </View>
          <Text style={s.scheduleArrow}>›</Text>
        </TouchableOpacity>

        {/* ══ 3개 기능 카드 ══ */}
        <View style={s.featRow}>

          <TouchableOpacity
            style={[s.featCard, s.featGreen]}
            onPress={() => navigation.navigate('Health', { userId, name })}
            activeOpacity={0.85}
          >
            <Text style={s.featEmoji}>💚</Text>
            <Text style={s.featLabel}>건강 확인</Text>
            <Text style={s.featDesc}>활동·혈압·혈당을{'\n'}확인하세요</Text>
            <Text style={[s.featArrow, { color: '#2E7D32' }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.featCard, s.featRed]}
            onPress={() => navigation.navigate('SOS', { userId, name })}
            activeOpacity={0.85}
          >
            <Text style={s.featEmoji}>🚨</Text>
            <Text style={s.featLabel}>긴급 도움</Text>
            <Text style={s.featDesc}>위급할 때{'\n'}바로 도움받아요</Text>
            <Text style={[s.featArrow, { color: '#C62828' }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.featCard, s.featPurple]}
            onPress={() => navigation.navigate('ImportantContacts', { userId })}
            activeOpacity={0.85}
          >
            <Text style={s.featEmoji}>👨‍👩‍👧</Text>
            <Text style={s.featLabel}>가족에게{'\n'}알리기</Text>
            <Text style={s.featDesc}>가족에게 내{'\n'}상태를 알려요</Text>
            <Text style={[s.featArrow, { color: '#6A1B9A' }]}>›</Text>
          </TouchableOpacity>

        </View>

        {/* ══ 루미와 대화하기 ══ */}
        <TouchableOpacity
          style={s.chatCard}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
          activeOpacity={0.88}
        >
          <View style={s.chatLeft}>
            <Text style={s.chatTitle}>루미와 대화하기</Text>
            <Text style={s.chatSub}>말이 필요할 때 대화해요</Text>
          </View>
          <View style={s.chatBtn}>
            <Text style={s.chatBtnTxt}>🔊 말하기</Text>
          </View>
        </TouchableOpacity>

        {/* ══ 게스트 배너 ══ */}
        {isGuest && (
          <TouchableOpacity
            style={s.guestBanner}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </LinearGradient>
  );
}

const CARD_GAP = 10;
const FEAT_W   = (width - 32 - CARD_GAP * 2) / 3;

const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── 상단 바 ── */
  topBar: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  topTitle: { fontSize: 26, fontWeight: '900', color: '#0D47A1', letterSpacing: 0.5 },
  topSub:   { fontSize: 12, color: '#1565C0', fontWeight: '600', marginTop: 1 },
  topRight: { alignItems: 'flex-end', gap: 2 },
  topDate:  { fontSize: 13, fontWeight: '600', color: '#1A5276' },
  topTime:  { fontSize: 22, fontWeight: '800', color: '#0D47A1' },

  /* ── 히어로 ── */
  hero: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
    gap: 8,
  },
  heroLeft:  { flex: 1, gap: 6 },
  heroRight: { width: 150, alignItems: 'center' },
  heroGreet: { fontSize: 28, fontWeight: '900', color: '#0D2B5E', lineHeight: 34 },
  heroSub:   { fontSize: 18, fontWeight: '700', color: '#1A5276', lineHeight: 24 },
  stepsInfo: { fontSize: 14, color: '#2E86C1', fontWeight: '600', marginTop: 2 },

  speechBubble: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#90CAF9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    marginTop: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  speechTxt: { fontSize: 14, fontWeight: '700', color: '#1565C0' },

  /* ── 오늘 일정 카드 ── */
  scheduleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 18, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    gap: 12,
    shadowColor: '#F9A825',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  scheduleIcon:  { fontSize: 28 },
  scheduleTxt:   { flex: 1 },
  scheduleLabel: { fontSize: 17, fontWeight: '800', color: '#E65100' },
  scheduleSub:   { fontSize: 13, color: '#BF360C', marginTop: 2, fontWeight: '500' },
  scheduleArrow: { fontSize: 26, color: '#E65100', fontWeight: '700' },

  /* ── 3개 기능 카드 ── */
  featRow: {
    flexDirection: 'row', gap: CARD_GAP,
    paddingHorizontal: 16, marginBottom: 12,
  },
  featCard: {
    width: FEAT_W, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 10,
    gap: 5,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  featGreen:  { backgroundColor: '#E8F5E9' },
  featRed:    { backgroundColor: '#FFEBEE' },
  featPurple: { backgroundColor: '#EDE7F6' },

  featEmoji: { fontSize: 26, marginBottom: 2 },
  featLabel: { fontSize: 14, fontWeight: '900', color: '#1A1A1A', lineHeight: 18 },
  featDesc:  { fontSize: 11, color: '#555', lineHeight: 15, fontWeight: '500' },
  featArrow: { fontSize: 22, fontWeight: '900', marginTop: 4 },

  /* ── 루미와 대화하기 ── */
  chatCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 18, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 18, paddingVertical: 16,
    gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chatLeft:   { flex: 1 },
  chatTitle:  { fontSize: 18, fontWeight: '900', color: '#0D2B5E' },
  chatSub:    { fontSize: 13, color: '#546E7A', marginTop: 3, fontWeight: '500' },
  chatBtn: {
    backgroundColor: '#1A4A8A',
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#1A4A8A', shadowOpacity: 0.3,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chatBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(13,71,161,0.08)',
    borderWidth: 1, borderColor: 'rgba(13,71,161,0.18)',
    paddingHorizontal: 16, paddingVertical: 9,
    marginHorizontal: 16, borderRadius: 12, marginBottom: 6,
  },
  guestTxt: { fontSize: 13, fontWeight: '600', color: '#0D47A1', flex: 1 },
  guestBtn: { fontSize: 13, fontWeight: '800', color: '#0D47A1' },
});
