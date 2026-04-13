import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeniorTabBar from '../components/SeniorTabBar';
import { DEMO_MODE } from '../App';

const API   = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

const CARD_GAP = 10;
const CARD_W   = (width - 32 - CARD_GAP) / 2;

const beeSource = Platform.OS === 'web'
  ? { uri: 'https://raw.githubusercontent.com/leemike09-dev/SilverlieAI/main/mobile/assets/bee_nobg.png' }
  : require('../assets/bee_nobg.png');

const HEALTH_CARDS = [
  { emoji: '🫀', label: '혈압',  value: '120/80', unit: 'mmHg', color: '#F57C00', bg: '#FFF3E0' },
  { emoji: '💉', label: '혈당',  value: '98',     unit: 'mg/dL', color: '#C2185B', bg: '#FCE4EC' },
  { emoji: '🌡️', label: '체온',  value: '36.5',   unit: '°C',   color: '#1565C0', bg: '#E3F2FD' },
  { emoji: '⚖️', label: '체중',  value: '68.2',   unit: 'kg',   color: '#2E7D32', bg: '#E8F5E9' },
];

export default function SeniorHomeScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || (DEMO_MODE ? '홍길동' : '');

  const [locationStatus, setLocationStatus] = useState<'sharing' | 'off' | 'loading'>('off');

  useEffect(() => { sendLocation(); }, []);

  const sendLocation = async () => {
    if (!userId) return;
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
        const r  = gd.address || {};
        address  = r.road || r.suburb || r.neighbourhood || r.county || '';
      } catch {}
      await fetch(`${API}/location/update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lat, lng, address, activity: 'unknown' }),
      });
      setLocationStatus('sharing');
    } catch { setLocationStatus('off'); }
  };

  const goFamily = () => navigation.navigate(
    DEMO_MODE ? 'FamilyDashboard' : 'FamilyConnect',
    DEMO_MODE
      ? { seniorId: 'demo-senior', seniorName: '홍길동', userId, name }
      : { userId, name }
  );

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  const headerStyle: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(135deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: '#1A4A8A' };

  return (
    <View style={s.root}>

      {/* ══ 헤더 ══ */}
      <View style={[s.header, headerStyle, { paddingTop: insets.top + 14 }]}>
        <View style={s.headerRow}>
          <View style={s.headerText}>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.userName}>{name} 어르신</Text>
            {locationStatus === 'sharing' && (
              <Text style={s.locTxt}>🟢 위치 공유 중</Text>
            )}
          </View>
          <Image source={beeSource} style={s.beeLogo} resizeMode="contain" />
        </View>
      </View>

      {/* ══ 본문 (스크롤 없음) ══ */}
      <View style={s.body}>

        {/* 건강 카드 2×2 */}
        <Text style={s.sectionTitle}>오늘의 건강 상태</Text>
        <View style={s.healthGrid}>
          {HEALTH_CARDS.map(card => (
            <TouchableOpacity
              key={card.label}
              style={[s.healthCard, { backgroundColor: card.bg }]}
              onPress={() => navigation.navigate('Health', { userId, name })}
              activeOpacity={0.82}
            >
              <Text style={s.healthEmoji}>{card.emoji}</Text>
              <Text style={[s.healthLabel, { color: card.color }]}>{card.label}</Text>
              <View style={s.healthValueRow}>
                <Text style={[s.healthValue, { color: card.color }]}>{card.value}</Text>
                <Text style={[s.healthUnit,  { color: card.color }]}>{card.unit}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 동선 카드 */}
        <Text style={s.sectionTitle}>오늘의 동선 · 걸음수</Text>
        <TouchableOpacity style={s.motionCard} onPress={goFamily} activeOpacity={0.88}>
          <View style={s.miniMap}>
            <Text style={s.miniMapTxt}>🗺️</Text>
            <Text style={s.miniMapLabel}>동선 지도</Text>
          </View>
          <View style={s.motionStats}>
            <View style={s.motionStat}>
              <Text style={s.motionNum}>2.4</Text>
              <Text style={s.motionUnit}>km</Text>
              <Text style={s.motionLabel}>이동거리</Text>
            </View>
            <View style={s.motionDivider} />
            <View style={s.motionStat}>
              <Text style={s.motionNum}>47</Text>
              <Text style={s.motionUnit}>분</Text>
              <Text style={s.motionLabel}>활동시간</Text>
            </View>
            <View style={s.motionDivider} />
            <View style={s.motionStat}>
              <Text style={s.motionNum}>68</Text>
              <Text style={s.motionUnit}>%</Text>
              <Text style={s.motionLabel}>달성률</Text>
            </View>
          </View>
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

      {/* 탭바 */}
      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FC' },

  /* 헤더 */
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  greeting:  { color: 'rgba(255,255,255,0.80)', fontSize: 15, fontWeight: '500', marginBottom: 2 },
  userName:  { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 2 },
  locTxt:    { color: 'rgba(255,255,255,0.80)', fontSize: 13, fontWeight: '500' },
  beeLogo:   { width: 60, height: 60, marginLeft: 10 },

  /* 본문 */
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },

  /* 섹션 타이틀 */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },

  /* 건강 카드 2×2 */
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  healthCard: {
    width: CARD_W,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  healthEmoji:    { fontSize: 24, marginBottom: 6 },
  healthLabel:    { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  healthValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  healthValue:    { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  healthUnit:     { fontSize: 12, fontWeight: '600', paddingBottom: 1 },

  /* 동선 카드 */
  motionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  miniMap: {
    height: 70,
    backgroundColor: '#E8EEF8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  miniMapTxt:   { fontSize: 24 },
  miniMapLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  motionStats:  { flexDirection: 'row', alignItems: 'center' },
  motionStat:   { flex: 1, alignItems: 'center', gap: 1 },
  motionDivider:{ width: 1, height: 36, backgroundColor: '#E5E5EA' },
  motionNum:    { fontSize: 24, fontWeight: '800', color: '#1A4A8A' },
  motionUnit:   { fontSize: 13, fontWeight: '600', color: '#2272B8' },
  motionLabel:  { fontSize: 12, color: '#8E8E93', fontWeight: '500' },

  /* SOS + AI */
  actionRow: { flexDirection: 'row', gap: 10 },
  sosBtn: {
    flex: 3,
    backgroundColor: '#C62828',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#C62828',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  sosBtnIcon: { fontSize: 26 },
  sosBtnTxt:  { color: '#fff', fontSize: 20, fontWeight: '900' },
  aiBtn: {
    flex: 1,
    backgroundColor: '#1A4A8A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#1A4A8A',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  aiBtnIcon: { fontSize: 22 },
  aiBtnTxt:  { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
});
