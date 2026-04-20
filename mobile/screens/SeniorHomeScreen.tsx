import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, StatusBar, Dimensions, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 42) / 2;
type Props = { route: any; navigation: any };

export default function SeniorHomeScreen({ route, navigation }: Props) {
  const { name = '게스트', userId = 'demo-user' } = route?.params ?? {};

  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(155deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: '#1A4A8A' };

  // 최신 건강 기록
  const [latestBp,     setLatestBp]     = useState<string>('--/--');
  const [latestBpSt,   setLatestBpSt]   = useState<string>('기록 없음');
  const [latestGlucose,setLatestGlucose]= useState<string>('--');
  const [latestGluSt,  setLatestGluSt]  = useState<string>('기록 없음');
  const [latestWeight, setLatestWeight] = useState<string>('--');
  const [latestWtSt,   setLatestWtSt]   = useState<string>('기록 없음');
  const [todaySteps,   setTodaySteps]   = useState<string>('--');
  const [stepsSt,      setStepsSt]      = useState<string>('기록 없음');

  useEffect(() => {
    const fetchLatest = async () => {
      const uid = userId || await AsyncStorage.getItem('userId') || '';
      if (!uid || uid === 'demo-user') return; // 데모 모드: 하드코딩 유지
      try {
        const res = await fetch('https://silverlieai.onrender.com/health/records/' + uid);
        if (!res.ok) return;
        const data = await res.json();
        const records = data.records || [];
        if (!records.length) return;

        // 혈압 — 가장 최근 기록
        const bpRec = records.find((r: any) => r.blood_pressure_systolic);
        if (bpRec) {
          const sys = bpRec.blood_pressure_systolic;
          const dia = bpRec.blood_pressure_diastolic;
          setLatestBp(`${sys}/${dia}`);
          setLatestBpSt(sys <= 120 && dia <= 80 ? '정상 범위' : sys >= 140 || dia >= 90 ? '고혈압 주의' : '경계 범위');
        }

        // 혈당
        const gluRec = records.find((r: any) => r.blood_sugar != null);
        if (gluRec) {
          const g = gluRec.blood_sugar;
          setLatestGlucose(String(g));
          setLatestGluSt(g <= 100 ? '공복 정상' : g <= 126 ? '경계 범위' : '당뇨 주의');
        }

        // 체중
        const wtRec = records.find((r: any) => r.weight != null);
        if (wtRec) {
          setLatestWeight(String(wtRec.weight));
          setLatestWtSt('기록됨');
        }

        // 걸음수 — 오늘 날짜
        const today = new Date().toISOString().slice(0, 10);
        const stepsRec = records.find((r: any) => r.steps != null && r.date === today);
        if (stepsRec) {
          setTodaySteps(stepsRec.steps.toLocaleString());
          setStepsSt(stepsRec.steps >= 8000 ? '목표 달성' : stepsRec.steps >= 5000 ? '절반 달성' : '더 걸어봐요');
        }
      } catch {}
    };
    fetchLatest();
  }, [userId]);

  const CARDS = [
    { label: '혈압', value: latestBp,      unit: 'mmHg',  status: latestBpSt,    color: '#F57C00', bigFont: 22 },
    { label: '혈당', value: latestGlucose, unit: 'mg/dL', status: latestGluSt,   color: '#7B1FA2', bigFont: 30 },
    { label: '걸음', value: todaySteps,    unit: '보',    status: stepsSt,       color: '#1565C0', bigFont: 24 },
    { label: '체중', value: latestWeight,  unit: 'kg',    status: latestWtSt,    color: '#2E7D32', bigFont: 30 },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />
      <View style={[s.header, webBg]}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{name}</Text>
          <Text style={s.headerSub}>오늘도 건강한 하루 되세요</Text>
        </View>
        <TouchableOpacity
          style={s.settingBtn}
          onPress={() => navigation.navigate('Settings', { userId, name })}
          activeOpacity={0.7}>
          <Text style={s.settingIco}>⚙️</Text>
          <Text style={s.settingLbl}>설정</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          // @ts-ignore
          <svg viewBox="0 0 375 60" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, width: '100%', display: 'block', pointerEvents: 'none' }}>
            {/* @ts-ignore */}
            <path d="M0 30 Q90 60 188 22 Q285 -5 375 32 L375 60 L0 60 Z" fill="#F4F7FC" />
          </svg>
        )}
      </View>
      <View style={s.content}>
        <View style={s.cardGrid}>
          {CARDS.map(card => (
            <TouchableOpacity
              key={card.label}
              style={[s.card, { backgroundColor: card.color }]}
              onPress={() => navigation.navigate('Health')}
              activeOpacity={0.85}>
              <Text style={s.cardLabel}>{card.label}</Text>
              <Text style={[s.cardValue, { fontSize: card.bigFont }]}>{card.value}</Text>
              <Text style={s.cardUnit}>{card.unit}</Text>
              <Text style={s.cardStatus}>{card.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={s.mapBtn}
          onPress={() => navigation.navigate('LocationMap', { userId, name })}
          activeOpacity={0.85}>
          <Text style={s.mapLeft}>🗺️  오늘 동선 확인</Text>
          <Text style={s.mapRight}>5,420걸음 ›</Text>
        </TouchableOpacity>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.sosBtn}
            onPress={() => navigation.navigate('SOS', { userId, name })}
            activeOpacity={0.85}>
            <Text style={s.sosIco}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.sosTxt} numberOfLines={1} adjustsFontSizeToFit>SOS 긴급 호출</Text>
              <Text style={s.sosSub} numberOfLines={1} adjustsFontSizeToFit>119 & 가족 즉시 연락</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.aiBtn}
            onPress={() => navigation.navigate('AIChat', { userId, name })}
            activeOpacity={0.85}>
            <Text style={s.aiTxt}>AI 상담</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SeniorTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FC' },
  header: {
    paddingTop: Platform.OS === 'web' ? 24 : (StatusBar.currentHeight ?? 28) + 12,
    paddingHorizontal: 20, paddingBottom: 44,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  name:      { fontSize: 30, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  content: {
    flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    justifyContent: 'space-between',
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: CARD_SIZE, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 22, gap: 2,
  },
  cardLabel:  { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  cardValue:  { fontWeight: '900', color: '#fff' },
  cardUnit:   { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  cardStatus: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  mapBtn: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#D0E4F7',
  },
  mapLeft:  { fontSize: 18, fontWeight: '700', color: '#1A4A8A' },
  mapRight: { fontSize: 16, fontWeight: '800', color: '#7B1FA2' },
  actionRow: { flexDirection: 'row', gap: 10 },
  sosBtn: {
    flex: 3, minWidth: 0, backgroundColor: '#D32F2F', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  sosIco: { fontSize: 28 },
  sosTxt: { fontSize: 20, fontWeight: '900', color: '#fff' },
  sosSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  aiBtn: {
    flex: 2, minWidth: 0, backgroundColor: '#1A4A8A', borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 20,
  },
  aiTxt: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center' },
  settingBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, alignSelf: 'flex-start', marginTop: 4 },
  settingIco: { fontSize: 32 },
  settingLbl: { fontSize: 26, color: 'rgba(255,255,255,0.95)', fontWeight: '700', marginTop: 2 },
});
