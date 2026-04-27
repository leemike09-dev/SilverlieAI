import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Dimensions, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

// ── 캐릭터 이미지 준비되면 여기만 교체 ──
// const LUMI_IMG = require('../assets/lumi_character.png');
const LUMI_IMG = null;

function LumiCharacter({ size = 80 }: { size?: number }) {
  if (LUMI_IMG) {
    return <Image source={LUMI_IMG} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  const s = size;
  return (
    <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
      {/* 바깥 글로우 링 */}
      <View style={{
        position: 'absolute',
        width: s, height: s, borderRadius: s / 2,
        backgroundColor: '#EAD5FB',
      }} />
      {/* 중간 링 */}
      <View style={{
        position: 'absolute',
        width: s * 0.78, height: s * 0.78, borderRadius: s * 0.39,
        backgroundColor: '#D4AEEF',
      }} />
      {/* 핵심 오브 */}
      <View style={{
        width: s * 0.58, height: s * 0.58, borderRadius: s * 0.29,
        backgroundColor: '#BE8DE6',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: s * 0.3 }}>✨</Text>
      </View>
      {/* 반짝임 */}
      <Text style={{ position: 'absolute', top: 2, right: 4, fontSize: s * 0.14, color: '#C8A0E8' }}>✦</Text>
      <Text style={{ position: 'absolute', bottom: 4, left: 2, fontSize: s * 0.10, color: '#D4AEEF' }}>✦</Text>
    </View>
  );
}

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name,   setName]   = useState<string>(route?.params?.name   || '');
  const [steps,  setSteps]  = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'sharing' | 'off' | 'loading'>('off');
  const ttsDoneRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId')   || route?.params?.userId || '';
      const storedName = await AsyncStorage.getItem('userName') || route?.params?.name   || '';
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);
      if (storedId) { fetchLatest(storedId); sendLocation(storedId); }
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
      } else { ttsDoneRef.current = true; }
    } catch {}
  };

  const sendLocation = async (uid: string) => {
    if (!uid) return;
    try {
      setLocationStatus('loading');
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      let address = '';
      try {
        const gr = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
          { headers: { 'User-Agent': 'SilverLifeAI/1.0' } }
        );
        const gd = await gr.json();
        const ra = gd.address || {};
        address = ra.road || ra.suburb || ra.neighbourhood || ra.county || '';
      } catch {}
      await fetch(`${API}/location/update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, lat, lng, address, activity: 'unknown' }),
      });
      setLocationStatus('sharing');
    } catch { setLocationStatus('off'); }
  };

  const goLocationMap = async () => {
    try {
      const r = await fetch(`${API}/location/today/${userId}`);
      const d = r.ok ? await r.json() : {};
      const logs = d.logs || [];
      if (logs.length === 0 && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            navigation.navigate('LocationMap', {
              logs: [{ lat, lng, activity: 'outdoor', created_at: new Date().toISOString(), address: '' }],
              seniorName: name, totalDist: 0,
            });
          },
          () => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 }),
          { timeout: 5000 }
        );
        return;
      }
      navigation.navigate('LocationMap', { logs, seniorName: name, totalDist: d.total_distance_m || 0 });
    } catch {
      navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 });
    }
  };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? '좋은 아침이에요 ☀️' : hour < 18 ? '좋은 오후예요 🌤️' : '좋은 저녁이에요 🌙';
  const isGuest  = !userId || userId === 'guest';

  const rootBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(180deg, #EAE0F8 0%, #F7F3FF 100%)' }
    : { backgroundColor: '#EDE6F7' };

  return (
    <View style={[s.root, rootBg]}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDE6F7" />

      {/* ══ 상단 미니멀 바 ══ */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 6, 18) }]}>
        <View style={s.topLeft}>
          <LumiCharacter size={34} />
          <Text style={s.topTitle}>루미나</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings', { userId, name })}
          activeOpacity={0.7}
        >
          <Text style={s.topBell}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* 게스트 배너 */}
      {isGuest && (
        <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
          <Text style={s.guestBtn}>로그인 →</Text>
        </TouchableOpacity>
      )}

      {/* ══ 인사 카드 ══ */}
      <View style={s.greetCard}>
        <LumiCharacter size={80} />
        <View style={s.greetText}>
          <Text style={s.greetHello}>안녕하세요! 👋</Text>
          <Text style={s.greetName}>{name ? `${name}님` : '어서오세요'}</Text>
          <Text style={s.greetSub}>{greeting}</Text>
          {locationStatus === 'sharing' && (
            <Text style={s.locBadge}>🟢 위치 공유 중</Text>
          )}
        </View>
      </View>

      {/* ══ 4개 카드 ══ */}
      <View style={s.cardGrid}>

        <TouchableOpacity style={[s.card, s.cardBlue]} onPress={goLocationMap} activeOpacity={0.85}>
          <Text style={s.cardEmoji}>📍</Text>
          <Text style={s.cardLabel}>내 위치</Text>
          <Text style={s.cardSub}>{steps !== null ? `${steps.toLocaleString()} 걸음` : '동선 확인'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardTeal]}
          onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.85}>
          <Text style={s.cardEmoji}>🏥</Text>
          <Text style={s.cardLabel}>건강 체크</Text>
          <Text style={s.cardSub}>혈압·혈당·체온</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardPurple]}
          onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.85}>
          <Text style={s.cardEmoji}>✨</Text>
          <Text style={s.cardLabel}>AI 상담</Text>
          <Text style={s.cardSub}>루미와 대화하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardCoral]}
          onPress={() => navigation.navigate('ImportantContacts', { userId })} activeOpacity={0.85}>
          <Text style={s.cardEmoji}>👨‍👩‍👧</Text>
          <Text style={s.cardLabel}>보호자</Text>
          <Text style={s.cardSub}>연락처 확인</Text>
        </TouchableOpacity>

      </View>

      {/* ══ 응급 도움 ══ */}
      <View style={s.sosWrap}>
        <TouchableOpacity style={s.sosCard}
          onPress={() => navigation.navigate('SOS', { userId, name })} activeOpacity={0.85}>
          <Text style={s.sosEmoji}>🆘</Text>
          <View style={s.sosTxtWrap}>
            <Text style={s.sosLabel}>응급 도움</Text>
            <Text style={s.sosSub}>긴급 상황 시 즉시 누르세요</Text>
          </View>
          <Text style={s.sosArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── 상단 바 ── */
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  topLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { fontSize: 20, fontWeight: '900', color: '#6B21B0' },
  topBell:  { fontSize: 24, padding: 4 },

  /* ── 게스트 배너 ── */
  guestBanner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(107,33,176,0.08)',
    borderWidth: 1, borderColor: 'rgba(107,33,176,0.18)',
    paddingHorizontal: 16, paddingVertical: 9,
    marginHorizontal: 16, borderRadius: 12, marginBottom: 6,
  },
  guestTxt: { fontSize: 13, fontWeight: '600', color: '#6B21B0', flex: 1 },
  guestBtn: { fontSize: 13, fontWeight: '800', color: '#6B21B0' },

  /* ── 인사 카드 ── */
  greetCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, borderRadius: 24,
    padding: 18, gap: 16, marginBottom: 14,
    shadowColor: '#9B59D8', shadowOpacity: 0.10,
    shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  greetText:  { flex: 1, gap: 3 },
  greetHello: { fontSize: 20, fontWeight: '900', color: '#2D1B4E' },
  greetName:  { fontSize: 17, fontWeight: '700', color: '#6B21B0' },
  greetSub:   { fontSize: 13, color: '#8A6BAA', fontWeight: '500' },
  locBadge:   { fontSize: 12, color: '#43A047', marginTop: 2 },

  /* ── 카드 그리드 ── */
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: CARD_GAP, paddingHorizontal: 16, marginBottom: 12,
  },
  card: {
    width: CARD_W, borderRadius: 20,
    paddingVertical: 18, paddingHorizontal: 16, gap: 5,
    shadowColor: '#000', shadowOpacity: 0.09,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardBlue:   { backgroundColor: '#5BA8E8' },
  cardTeal:   { backgroundColor: '#48BFA8' },
  cardPurple: { backgroundColor: '#9278D0' },
  cardCoral:  { backgroundColor: '#F09070' },

  cardEmoji: { fontSize: 28, marginBottom: 2 },
  cardLabel: { fontSize: 18, fontWeight: '900', color: '#fff' },
  cardSub:   { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.88)' },

  /* ── 응급 카드 ── */
  sosWrap: { paddingHorizontal: 16 },
  sosCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#D63031',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20,
    gap: 14,
    shadowColor: '#D63031', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sosEmoji:   { fontSize: 32 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 21, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosArrow:   { fontSize: 28, color: 'rgba(255,255,255,0.6)' },
});
