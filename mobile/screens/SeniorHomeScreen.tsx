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

const API      = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name,   setName]   = useState<string>(route?.params?.name   || '');
  const ttsDoneRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId) fetchLatest(storedId);
    };
    init();
    return () => stopSpeech();
  }, []);

  const fetchLatest = async (uid: string) => {
    try {
      const r = await fetch(`${API}/health/records/${uid}`);
      if (!r.ok) return;


      const today         = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const h     = new Date().getHours();
        const g     = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        const raw2  = await AsyncStorage.getItem('hospital_schedule');
        let msg = `${g}, ${uname}님! 오늘도 건강한 하루 되세요.`;
        if (raw2) {
          const p = JSON.parse(raw2);
          if (p.date === today) msg += ` 오늘 ${p.time} ${p.clinic} 가시는 날이에요.`;
        }
        setTimeout(() => speak(msg, 0.85), 800);
      } else {
        ttsDoneRef.current = true;
      }
    } catch {}
  };

  const now     = new Date();
  const hour    = now.getHours();
  const days    = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일(${days[now.getDay()]})`;
  const h12     = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour < 12 ? '오전' : '오후'} ${h12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const weather  = hour >= 6 && hour < 19 ? '☀️' : '🌙';
  const greeting = hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후예요!' : '좋은 저녁이에요!';
  const isGuest  = !userId || userId === 'guest';

  return (
    <LinearGradient
      colors={['#4FA8D6', '#74BEE4', '#A8D8F0', '#D4EDF8', '#EEF7FC', '#F8FCFF']}
      locations={[0, 0.15, 0.35, 0.6, 0.82, 1]}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#4FA8D6" />

      {/* ── 구름 레이어 ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {/* 구름 1 (왼쪽 상단) */}
        <View style={[s.puff, { top: 65, left: 10,  width: 70,  height: 70,  borderRadius: 35 }]} />
        <View style={[s.puff, { top: 82, left: -20, width: 90,  height: 60,  borderRadius: 30 }]} />
        <View style={[s.puff, { top: 77, left: 65,  width: 80,  height: 60,  borderRadius: 30 }]} />
        <View style={[s.puff, { top: 100,left: -10, width: 120, height: 44,  borderRadius: 22 }]} />
        {/* 구름 2 (오른쪽 상단) */}
        <View style={[s.puff2, { top: 95,  right: 22, width: 58, height: 58, borderRadius: 29 }]} />
        <View style={[s.puff2, { top: 112, right: -8, width: 78, height: 52, borderRadius: 26 }]} />
        <View style={[s.puff2, { top: 108, right: 55, width: 62, height: 48, borderRadius: 24 }]} />
        <View style={[s.puff2, { top: 130, right: 2,  width: 108,height: 38, borderRadius: 19 }]} />
        {/* 구름 3 (작은, 중앙) */}
        <View style={[s.puff3, { top: 180, left: 98,  width: 44, height: 44, borderRadius: 22 }]} />
        <View style={[s.puff3, { top: 195, left: 82,  width: 62, height: 36, borderRadius: 18 }]} />
        <View style={[s.puff3, { top: 192, left: 128, width: 48, height: 36, borderRadius: 18 }]} />
        <View style={[s.puff3, { top: 210, left: 90,  width: 82, height: 30, borderRadius: 15 }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 20 }]}
      >
        {/* ── 상단 바 ── */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          {/* 좌측: 인사말 */}
          <View style={s.topLeft}>
            <Text style={s.topGreeting}>{greeting}</Text>
            {name ? <Text style={s.topName}>{name}님, 반가워요 👋</Text> : null}
          </View>
          {/* 우측: 날짜·시간·설정 */}
          <View style={s.topRight}>
            <View style={s.topDateRow}>
              <Text style={s.topDate}>{weather}  {dateStr}</Text>
              <TouchableOpacity
                style={s.gearBtn}
                onPress={() => navigation.navigate('Settings', { userId, name })}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.gearEmoji}>⚙️</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.topTime}>{timeStr}</Text>
          </View>
        </View>

        {/* ── 히어로: 루미 ── */}
        <View style={s.hero}>
          <Image
            source={require('../assets/lumi10.png')}
            style={s.lumiImg}
            resizeMode="contain"
          />
        </View>

        {/* ── 게스트 배너 ── */}
        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
            <Text style={s.guestBtn}>로그인 →</Text>
          </TouchableOpacity>
        )}

        {/* ── 4개 카드 ── */}
        <View style={s.cardGrid}>

          <TouchableOpacity
            style={[s.card, { backgroundColor: '#D6EEFA' }]}
            onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 })}
            activeOpacity={0.88}
          >
            <Text style={s.iconEmoji}>📍</Text>
            <Text style={s.cardLabel}>내 위치</Text>
            <Text style={s.cardDesc}>내 위치를 확인해요</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, { backgroundColor: '#FFE0EA' }]}
            onPress={() => navigation.navigate('Health', { userId, name })}
            activeOpacity={0.88}
          >
            <Text style={s.iconEmoji}>❤️</Text>
            <Text style={s.cardLabel}>건강 체크</Text>
            <Text style={s.cardDesc}>혈압·혈당·체온 확인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, { backgroundColor: '#E8DEFF' }]}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.88}
          >
            <Text style={s.iconEmoji}>💬</Text>
            <Text style={s.cardLabel}>루미와 대화</Text>
            <Text style={s.cardDesc}>궁금한 걸 물어보세요</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, { backgroundColor: '#D4F5EC' }]}
            onPress={() => navigation.navigate('ImportantContacts', { userId })}
            activeOpacity={0.88}
          >
            <Text style={s.iconEmoji}>👨‍👩‍👧</Text>
            <Text style={s.cardLabel}>보호자</Text>
            <Text style={s.cardDesc}>가족에게 알려드려요</Text>
          </TouchableOpacity>

        </View>

        {/* ── SOS ── */}
        <TouchableOpacity
          style={s.sosBtn}
          onPress={() => navigation.navigate('SOS', { userId, name })}
          activeOpacity={0.85}
        >
          <Text style={s.sosEmoji}>🚨</Text>
          <View style={s.sosTxtWrap}>
            <Text style={s.sosLabel}>SOS 긴급 도움</Text>
            <Text style={s.sosSub}>위급할 때 눌러주세요</Text>
          </View>
          <Text style={s.sosPhone}>📞</Text>
        </TouchableOpacity>

      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  /* ── 구름 puff ── */
  puff:  { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.22)' },
  puff2: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.17)' },
  puff3: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.12)' },

  /* ── 상단 바 ── */
  topBar:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 4 },
  topLeft:     { flexShrink: 1, paddingRight: 8 },
  topGreeting: {
    fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,30,80,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  topName:     { fontSize: 12, color: 'rgba(255,255,255,0.88)', fontWeight: '600', marginTop: 2 },
  topRight:    { alignItems: 'flex-end', gap: 2 },
  topDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topDate:     { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  gearBtn: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  gearEmoji: { fontSize: 20 },
  topTime:   { fontSize: 21, fontWeight: '900', color: '#fff' },

  /* ── 히어로 ── */
  hero:    { alignItems: 'center', paddingVertical: 0 },
  lumiImg: { width: 260, height: 290, transform: [{ scale: 1.7 }] },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12,
  },
  guestTxt: { fontSize: 13, fontWeight: '600', color: '#1A4A8A', flex: 1 },
  guestBtn: { fontSize: 13, fontWeight: '800', color: '#1A4A8A' },

  /* ── 4개 카드 (flat, 테두리·그림자 없음) ── */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 12 },
  card:     { width: CARD_W, borderRadius: 22, paddingVertical: 20, paddingHorizontal: 16, gap: 8 },
  iconEmoji:{ fontSize: 32 },
  cardLabel:{ fontSize: 20, fontWeight: '900', color: '#0D2B5E' },
  cardDesc: { fontSize: 13, color: '#3A5070', fontWeight: '500', lineHeight: 18 },

  /* ── SOS ── */
  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20, gap: 14,
    shadowColor: '#B71C1C', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sosEmoji:   { fontSize: 32 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosPhone:   { fontSize: 28 },
});
