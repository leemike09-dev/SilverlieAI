import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeniorTabBar from '../components/SeniorTabBar';

const API   = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_W   = (width - 24 - CARD_GAP) / 2;


export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string>(route?.params?.userId || '');
  const [name,   setName]   = useState<string>(route?.params?.name   || '');
  const [cards,  setCards]  = useState<any[]>([]);
  const [steps,  setSteps]  = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'sharing' | 'off' | 'loading'>('off');
  const ttsDoneRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      // AsyncStorage에서 userId/userName 우선 읽기
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
      const latest = recs[0]; // 가장 최근 기록

      const newCards = [
        {
          emoji: '🫀', label: '혈압',
          value: latest.blood_pressure_systolic
            ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}`
            : '미측정',
          unit: 'mmHg', bg: '#F57C00',
        },
        {
          emoji: '💉', label: '혈당',
          value: latest.blood_sugar ? String(latest.blood_sugar) : '미측정',
          unit: 'mg/dL', bg: '#C2185B',
        },
        {
          emoji: '🌡️', label: '체온',
          value: latest.temp ? String(latest.temp) : '미측정',
          unit: '°C', bg: '#1565C0',
        },
        {
          emoji: '⚖️', label: '체중',
          value: latest.weight ? String(latest.weight) : '미측정',
          unit: 'kg', bg: '#2E7D32',
        },
      ];
      setCards(newCards);
      if (latest.steps) setSteps(latest.steps);

      // 인사 TTS — 하루 1회만
      const today = new Date().toISOString().slice(0, 10);
      const lastGreetDate = await AsyncStorage.getItem('tts_greeting_date');
      if (!ttsDoneRef.current && lastGreetDate !== today) {
        ttsDoneRef.current = true;
        await AsyncStorage.setItem('tts_greeting_date', today);
        const uname = await AsyncStorage.getItem('userName') || '';
        const hour = new Date().getHours();
        const timeGreet = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
        setTimeout(() => speak(`${timeGreet}, ${uname}님! 오늘도 건강한 하루 되세요.`, 0.85), 800);
      } else {
        ttsDoneRef.current = true;
      }
    } catch (e) {
      console.log('fetchLatest error:', e);
    }
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
      // 오늘 기록 없으면 현재 위치를 첫 로그로 전달
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
      navigation.navigate('LocationMap', {
        logs, seniorName: name, totalDist: d.total_distance_m || 0,
      });
    } catch {
      navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 });
    }
  };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  const headerStyle: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(135deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: '#1A4A8A' };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* ══ 헤더 ══ */}
      <View style={[s.header, headerStyle, { paddingTop: Math.max(insets.top + 14, 28) }]}>
        <View style={s.headerRow}>
          <View style={s.headerText}>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.userName}>{name}님</Text>
            {locationStatus === 'sharing' && (
              <Text style={s.locTxt}>🟢 위치 공유 중</Text>
            )}
          </View>
          <TouchableOpacity
            style={s.settingBtn}
            onPress={() => navigation.navigate('Settings', { userId, name })}
            activeOpacity={0.7}>
            <Text style={s.settingIco}>⚙️</Text>
            <Text style={s.settingLbl}>설정</Text>
          </TouchableOpacity>
        </View>
        {Platform.OS === 'web' && (
          // @ts-ignore
          <svg viewBox="0 0 375 60" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, width: '100%', display: 'block', pointerEvents: 'none' }}>
            {/* @ts-ignore */}
            <path d="M0 30 Q90 60 188 22 Q285 -5 375 32 L375 60 L0 60 Z" fill="#F4F7FC" />
          </svg>
        )}
      </View>

      {/* ══ 본문 ══ */}
      <View style={s.body}>

        {/* 건강 카드 2×2 */}
        <View style={s.healthGrid}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.label}
              style={[s.healthCard, { backgroundColor: card.bg }]}
              onPress={() => navigation.navigate('Health', { userId, name })}
              activeOpacity={0.82}
            >
              <Text style={s.healthEmoji}>{card.emoji}</Text>
              <Text style={s.healthLabel}>{card.label}</Text>
              <View style={s.healthValueRow}>
                <Text style={s.healthValue}>{card.value}</Text>
                <Text style={s.healthUnit}>{card.unit}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 동선 한 줄 버튼 */}
        <TouchableOpacity style={s.motionRow} onPress={goLocationMap} activeOpacity={0.85}>
          <Text style={s.motionRowIcon}>🗺️</Text>
          <Text style={s.motionRowLabel}>오늘 동선 확인</Text>
          <View style={s.motionRowSteps}>
            <Text style={s.motionRowStepNum}>
              {steps !== null ? steps.toLocaleString() : '--'}
            </Text>
            <Text style={s.motionRowStepUnit}>걸음</Text>
          </View>
          <Text style={s.motionRowArrow}>›</Text>
        </TouchableOpacity>

        {/* SOS + AI 버튼 */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.sosBtn}
            onPress={() => navigation.navigate('SOS', { userId, name })}
            activeOpacity={0.85}
          >
            <Text style={s.sosBtnIcon}>🆘</Text>
            <Text style={s.sosBtnTxt}>SOS 긴급 호출</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.aiBtn}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.85}
          >
            <Text style={s.aiBtnIcon}>🐝</Text>
            <Text style={s.aiBtnTxt}>AI{'\n'}상담</Text>
          </TouchableOpacity>
        </View>

      </View>

      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FC' },

  header:     { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  greeting:   { color: 'rgba(255,255,255,0.80)', fontSize: 16, fontWeight: '500', marginBottom: 2 },
  userName:   { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 2 },
  locTxt:     { color: 'rgba(255,255,255,0.80)', fontSize: 13, fontWeight: '500' },

  settingBtn: { alignItems: 'center', paddingLeft: 12 },
  settingIco: { fontSize: 26 },
  settingLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginTop: 2 },

  body: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, gap: 8 },

  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthCard: {
    width: CARD_W, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  healthEmoji:    { fontSize: 26, marginBottom: 8 },
  healthLabel:    { fontSize: 13, fontWeight: '700', marginBottom: 6, color: 'rgba(255,255,255,0.85)' },
  healthValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  healthValue:    { fontSize: 28, fontWeight: '800', lineHeight: 32, color: '#fff' },
  healthUnit:     { fontSize: 13, fontWeight: '600', paddingBottom: 2, color: 'rgba(255,255,255,0.85)' },

  motionRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 10,
  },
  motionRowIcon:    { fontSize: 22 },
  motionRowLabel:   { flex: 1, fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  motionRowSteps:   { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  motionRowStepNum: { fontSize: 20, fontWeight: '800', color: '#1A4A8A' },
  motionRowStepUnit:{ fontSize: 13, fontWeight: '600', color: '#2272B8', paddingBottom: 1 },
  motionRowArrow:   { fontSize: 22, color: '#C0C0C0', marginLeft: 2 },

  actionRow: { flexDirection: 'row', gap: 10 },
  sosBtn: {
    flex: 3, backgroundColor: '#C62828', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 10,
    shadowColor: '#C62828', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  sosBtnIcon: { fontSize: 26 },
  sosBtnTxt:  { color: '#fff', fontSize: 20, fontWeight: '900' },
  aiBtn: {
    flex: 1, backgroundColor: '#1A4A8A', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: '#1A4A8A', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  aiBtnIcon: { fontSize: 22 },
  aiBtnTxt:  { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
});
