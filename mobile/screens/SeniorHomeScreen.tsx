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
const CARD_GAP = 14;
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
      if (storedId) {
        fetchLatest(storedId);
        sendLocation(storedId);
      }
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
        const hour  = new Date().getHours();
        const g = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        setTimeout(() => speak(`${g}, ${uname}님! 오늘도 건강한 하루 되세요.`, 0.85), 800);
      } else {
        ttsDoneRef.current = true;
      }
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
        address  = ra.road || ra.suburb || ra.neighbourhood || ra.county || '';
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

  const topBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(160deg, #5B1FA2 0%, #9B59D0 100%)' }
    : { backgroundColor: '#6B24B8' };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5B1FA2" />

      {/* ══ 루미 캐릭터 섹션 ══ */}
      <View style={[s.topSection, topBg, { paddingTop: Math.max(insets.top + 16, 32) }]}>

        {/* 설정 버튼 */}
        <TouchableOpacity
          style={s.settingBtn}
          onPress={() => navigation.navigate('Settings', { userId, name })}
          activeOpacity={0.7}
        >
          <Text style={s.settingIco}>⚙️</Text>
        </TouchableOpacity>

        {/* 루미 캐릭터 */}
        <View style={s.lumiOrbOuter}>
          <View style={s.lumiOrbMid}>
            <View style={s.lumiOrbInner}>
              <Text style={s.lumiOrbEmoji}>✨</Text>
            </View>
          </View>
        </View>

        {/* 이름 + 인사 */}
        <Text style={s.lumiLabel}>루미</Text>
        <Text style={s.lumiGreet}>
          {name ? `${name}님, ` : ''}{greeting}
        </Text>
        {locationStatus === 'sharing' && (
          <Text style={s.locBadge}>🟢 위치 공유 중</Text>
        )}

      </View>

      {/* 게스트 배너 */}
      {isGuest && (
        <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Text style={s.guestBannerTxt}>👤 로그인하면 건강기록이 저장돼요</Text>
          <Text style={s.guestBannerBtn}>로그인 →</Text>
        </TouchableOpacity>
      )}

      {/* ══ 본문 ══ */}
      <View style={s.body}>

        {/* ── 메인 4개 카드 ── */}
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

          <TouchableOpacity style={[s.card, s.cardViolet]}
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

        {/* ── 응급 도움 카드 ── */}
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
  root: { flex: 1, backgroundColor: '#F0EBF8' },

  /* ── 루미 섹션 ── */
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  settingBtn: {
    position: 'absolute',
    top: 16, right: 16,
    zIndex: 10, padding: 8,
  },
  settingIco: { fontSize: 26 },

  /* 루미 글로우 오브 */
  lumiOrbOuter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#fff',
    shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    marginBottom: 10,
  },
  lumiOrbMid: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  lumiOrbInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  lumiOrbEmoji: { fontSize: 34 },

  lumiLabel: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 6 },
  lumiGreet: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  locBadge:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

  /* ── 게스트 배너 ── */
  guestBanner:    { backgroundColor: '#E65100', flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 11 },
  guestBannerTxt: { fontSize: 15, fontWeight: '600', color: '#fff', flex: 1 },
  guestBannerBtn: { fontSize: 15, fontWeight: '800', color: '#fff', marginLeft: 10 },

  /* ── 본문 ── */
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 14 },

  /* ── 4개 카드 ── */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  card: {
    width: CARD_W, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.12,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5, gap: 6,
  },

  /* 정제된 카드 색상 — Lumi 팔레트 기반 */
  cardBlue:   { backgroundColor: '#3A7BD5' },   /* 딥 스카이 블루 */
  cardTeal:   { backgroundColor: '#2A9D8F' },   /* 세이지 틸 */
  cardViolet: { backgroundColor: '#7B5EA7' },   /* 소프트 바이올렛 */
  cardCoral:  { backgroundColor: '#E07850' },   /* 웜 코랄 */

  cardEmoji: { fontSize: 34, marginBottom: 2 },
  cardLabel: { fontSize: 21, fontWeight: '900', color: '#fff' },
  cardSub:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },

  /* ── 응급 카드 ── */
  sosCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#C0392B',
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 22,
    gap: 16,
    shadowColor: '#C0392B', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  sosEmoji:   { fontSize: 38 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 24, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosArrow:   { fontSize: 34, color: 'rgba(255,255,255,0.65)' },
});
