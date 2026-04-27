import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

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

  /* 웹 전용 그라디언트 */
  const rootBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(175deg, #6B21B0 0%, #9B59D8 45%, #C8A8F0 100%)' }
    : { backgroundColor: '#7B2FC8' };

  /* 웹 전용 카드 글래스 효과 */
  const glassWeb: any = Platform.OS === 'web'
    ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
    : {};

  return (
    <View style={[s.root, rootBg]}>
      <StatusBar barStyle="light-content" backgroundColor="#6B21B0" translucent />

      {/* ══ 루미 캐릭터 영역 ══ */}
      <View style={[s.characterArea, { paddingTop: Math.max(insets.top + 20, 40) }]}>

        {/* 설정 버튼 */}
        <TouchableOpacity
          style={s.settingBtn}
          onPress={() => navigation.navigate('Settings', { userId, name })}
          activeOpacity={0.7}
        >
          <Text style={s.settingIco}>⚙️</Text>
        </TouchableOpacity>

        {/* 루미 캐릭터 — 글로우 오브 */}
        <View style={s.orbOuter}>
          <View style={s.orbMid}>
            <View style={s.orbInner}>
              <Text style={s.orbFace}>🌟</Text>
            </View>
          </View>
        </View>

        <Text style={s.lumiTitle}>루미</Text>
        <Text style={s.lumiGreeting}>{name ? `${name}님, ` : ''}{greeting}</Text>
        {locationStatus === 'sharing' && (
          <Text style={s.locBadge}>🟢 위치 공유 중</Text>
        )}
      </View>

      {/* 게스트 배너 */}
      {isGuest && (
        <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Text style={s.guestTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
          <Text style={s.guestBtn}>로그인 →</Text>
        </TouchableOpacity>
      )}

      {/* ══ 카드 영역 ══ */}
      <View style={s.body}>

        <View style={s.cardGrid}>

          {/* 내 위치 */}
          <TouchableOpacity
            style={[s.card, glassWeb, { borderColor: 'rgba(120,200,255,0.4)' }]}
            onPress={goLocationMap} activeOpacity={0.82}
          >
            <Text style={s.cardEmoji}>📍</Text>
            <Text style={s.cardLabel}>내 위치</Text>
            <Text style={s.cardSub}>{steps !== null ? `${steps.toLocaleString()} 걸음` : '동선 확인'}</Text>
            <View style={[s.cardAccent, { backgroundColor: 'rgba(120,200,255,0.35)' }]} />
          </TouchableOpacity>

          {/* 건강 체크 */}
          <TouchableOpacity
            style={[s.card, glassWeb, { borderColor: 'rgba(100,220,180,0.4)' }]}
            onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.82}
          >
            <Text style={s.cardEmoji}>🏥</Text>
            <Text style={s.cardLabel}>건강 체크</Text>
            <Text style={s.cardSub}>혈압·혈당·체온</Text>
            <View style={[s.cardAccent, { backgroundColor: 'rgba(100,220,180,0.35)' }]} />
          </TouchableOpacity>

          {/* AI 상담 */}
          <TouchableOpacity
            style={[s.card, glassWeb, { borderColor: 'rgba(220,180,255,0.4)' }]}
            onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.82}
          >
            <Text style={s.cardEmoji}>✨</Text>
            <Text style={s.cardLabel}>AI 상담</Text>
            <Text style={s.cardSub}>루미와 대화하기</Text>
            <View style={[s.cardAccent, { backgroundColor: 'rgba(220,180,255,0.35)' }]} />
          </TouchableOpacity>

          {/* 보호자 */}
          <TouchableOpacity
            style={[s.card, glassWeb, { borderColor: 'rgba(255,190,130,0.4)' }]}
            onPress={() => navigation.navigate('ImportantContacts', { userId })} activeOpacity={0.82}
          >
            <Text style={s.cardEmoji}>👨‍👩‍👧</Text>
            <Text style={s.cardLabel}>보호자</Text>
            <Text style={s.cardSub}>연락처 확인</Text>
            <View style={[s.cardAccent, { backgroundColor: 'rgba(255,190,130,0.35)' }]} />
          </TouchableOpacity>

        </View>

        {/* 응급 도움 */}
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

  /* ── 캐릭터 영역 ── */
  characterArea: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  settingBtn: {
    position: 'absolute', top: 16, right: 16,
    zIndex: 10, padding: 8,
  },
  settingIco: { fontSize: 26 },

  /* 루미 글로우 오브 */
  orbOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#E0C8FF',
    shadowOpacity: 0.8, shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  orbMid: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  orbInner: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  orbFace: { fontSize: 38 },

  lumiTitle:    { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.9)', letterSpacing: 3, marginBottom: 6 },
  lumiGreeting: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  locBadge:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 5 },

  /* ── 게스트 배너 ── */
  guestBanner: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
    marginHorizontal: 16, borderRadius: 12, marginBottom: 4,
  },
  guestTxt: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  guestBtn: { fontSize: 14, fontWeight: '800', color: '#FFD580', marginLeft: 8 },

  /* ── 카드 영역 ── */
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 8, gap: 12 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },

  card: {
    width: CARD_W,
    borderRadius: 22,
    paddingVertical: 20, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    overflow: 'hidden',
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  /* 카드 하단 컬러 악센트 */
  cardAccent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 5, borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },

  cardEmoji: { fontSize: 32, marginBottom: 4 },
  cardLabel: { fontSize: 20, fontWeight: '900', color: '#fff' },
  cardSub:   { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },

  /* ── 응급 카드 ── */
  sosCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(192,40,40,0.88)',
    borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22,
    gap: 16, borderWidth: 1.5, borderColor: 'rgba(255,120,120,0.4)',
    shadowColor: '#C02828', shadowOpacity: 0.4,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  sosEmoji:   { fontSize: 36 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 24, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosArrow:   { fontSize: 32, color: 'rgba(255,255,255,0.6)' },
});
