import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Platform, StatusBar, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeniorTabBar from '../components/SeniorTabBar';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lumiChar = require('../assets/lumi1.png') as number;

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

  const headerBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(160deg, #6A1B9A 0%, #AB47BC 100%)' }
    : { backgroundColor: '#7B2FBE' };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* ══ 루미 캐릭터 헤더 ══ */}
      <View style={[s.lumiHeader, headerBg, { paddingTop: Math.max(insets.top + 10, 24) }]}>

        {/* 설정 버튼 */}
        <TouchableOpacity
          style={s.settingBtn}
          onPress={() => navigation.navigate('Settings', { userId, name })}
          activeOpacity={0.7}
        >
          <Text style={s.settingIco}>⚙️</Text>
        </TouchableOpacity>

        {/* 루미 캐릭터 이미지 */}
        <View style={s.lumiImgWrap}>
          <Image source={lumiChar} style={s.lumiImg} resizeMode="cover" />
        </View>

        {/* 인사말 */}
        <View style={s.lumiGreetWrap}>
          <Text style={s.lumiName}>루미</Text>
          <Text style={s.lumiGreet}>안녕하세요!</Text>
          <Text style={s.lumiSub}>{name ? `${name}님, ` : ''}{greeting}</Text>
          {locationStatus === 'sharing' && (
            <Text style={s.locBadge}>🟢 위치 공유 중</Text>
          )}
        </View>

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

          {/* 내 위치 */}
          <TouchableOpacity style={[s.card, s.cardBlue]} onPress={goLocationMap} activeOpacity={0.85}>
            <Text style={s.cardEmoji}>📍</Text>
            <Text style={s.cardLabel}>내 위치</Text>
            <Text style={s.cardSub}>
              {steps !== null ? `${steps.toLocaleString()} 걸음` : '오늘 동선 확인'}
            </Text>
          </TouchableOpacity>

          {/* 건강 체크 */}
          <TouchableOpacity style={[s.card, s.cardGreen]}
            onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.85}>
            <Text style={s.cardEmoji}>🏥</Text>
            <Text style={s.cardLabel}>건강 체크</Text>
            <Text style={s.cardSub}>혈압·혈당·체온</Text>
          </TouchableOpacity>

          {/* AI 상담 */}
          <TouchableOpacity style={[s.card, s.cardPurple]}
            onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.85}>
            <Text style={s.cardEmoji}>✨</Text>
            <Text style={s.cardLabel}>AI 상담</Text>
            <Text style={s.cardSub}>루미와 대화하기</Text>
          </TouchableOpacity>

          {/* 보호자 */}
          <TouchableOpacity style={[s.card, s.cardOrange]}
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
  root: { flex: 1, backgroundColor: '#F5F0FF' },

  /* ── 루미 헤더 ── */
  lumiHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
  },
  settingBtn: {
    position: 'absolute',
    top: 16, right: 16,
    zIndex: 10,
    padding: 6,
  },
  settingIco: { fontSize: 28 },

  lumiImgWrap: {
    width: 90, height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#fff',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  lumiImg: { width: 90, height: 90 },

  lumiGreetWrap: { flex: 1 },
  lumiName:  { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1, marginBottom: 2 },
  lumiGreet: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 2 },
  lumiSub:   { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500', flexWrap: 'wrap' },
  locBadge:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  /* ── 게스트 배너 ── */
  guestBanner:    { backgroundColor: '#FF8F00', flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  guestBannerTxt: { fontSize: 16, fontWeight: '600', color: '#fff', flex: 1 },
  guestBannerBtn: { fontSize: 16, fontWeight: '800', color: '#fff', marginLeft: 10 },

  /* ── 본문 ── */
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 14 },

  /* ── 4개 카드 그리드 ── */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },

  card: {
    width: CARD_W,
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    gap: 6,
  },
  cardBlue:   { backgroundColor: '#29B6F6' },
  cardGreen:  { backgroundColor: '#43A047' },
  cardPurple: { backgroundColor: '#8E24AA' },
  cardOrange: { backgroundColor: '#FB8C00' },

  cardEmoji: { fontSize: 36, marginBottom: 4 },
  cardLabel: { fontSize: 22, fontWeight: '900', color: '#fff' },
  cardSub:   { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  /* ── 응급 도움 카드 ── */
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
    shadowColor: '#C62828',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  sosEmoji:   { fontSize: 40 },
  sosTxtWrap: { flex: 1 },
  sosLabel:   { fontSize: 26, fontWeight: '900', color: '#fff' },
  sosSub:     { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sosArrow:   { fontSize: 36, color: 'rgba(255,255,255,0.7)', fontWeight: '300' },
});
