import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';
const GREEN  = '#3D8B6C';
const ORANGE = '#E8734A';
const CREAM  = '#FFF9F4';

function getTodayStr() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
}

export default function SeniorHomeScreen({ route, navigation }: any) {
  const userId   = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name     = route?.params?.name   || (DEMO_MODE ? '홍길동'   : '');

  const [meds,      setMeds]      = useState<any[]>([]);
  const [logs,      setLogs]      = useState<any[]>([]);
  const [mood,      setMood]      = useState<string | null>(null);
  const [greeting,  setGreeting]  = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? '좋은 아침이에요 ☀️' : h < 18 ? '좋은 오후예요 🌤️' : '좋은 저녁이에요 🌙');
    fetchMeds();
    loadMood();
  }, []);

  const fetchMeds = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [medsRes, logsRes] = await Promise.all([
        fetch(`${API}/medications/${userId}`),
        fetch(`${API}/medications/log/${userId}/${today}`),
      ]);
      const medsData = await medsRes.json();
      const logsData = await logsRes.json();
      setMeds(Array.isArray(medsData) ? medsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch {
      // 데모: 샘플 데이터
      if (DEMO_MODE) {
        setMeds([
          { id: '1', name: '혈압약', dosage: '1정', times: ['08:00', '20:00'], color: '#e53935' },
          { id: '2', name: '당뇨약', dosage: '1정', times: ['08:00', '12:00'], color: '#1976d2' },
          { id: '3', name: '관절약', dosage: '2정', times: ['12:00'], color: '#388e3c' },
        ]);
        setLogs([{ medication_id: '1', scheduled_time: '08:00', taken: true }]);
      }
    }
  };

  const loadMood = async () => {
    const key = `mood_${new Date().toISOString().split('T')[0]}`;
    const saved = await AsyncStorage.getItem(key);
    if (saved) setMood(saved);
  };

  const saveMood = async (m: string) => {
    setMood(m);
    const key = `mood_${new Date().toISOString().split('T')[0]}`;
    await AsyncStorage.setItem(key, m);
  };

  // 오늘 전체 복용 건수 계산
  const totalDoses = meds.reduce((s, m) => s + (m.times?.length || 0), 0);
  const takenDoses = logs.filter(l => l.taken).length;
  const allTaken   = totalDoses > 0 && takenDoses >= totalDoses;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CREAM} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.name}>{name}님</Text>
          <Text style={s.date}>{getTodayStr()}</Text>
        </View>

        {/* 약 복용 카드 */}
        <TouchableOpacity style={s.medCard} onPress={() => navigation.navigate('Medication', { userId, name })} activeOpacity={0.85}>
          <View style={s.medCardTop}>
            <Text style={s.medIcon}>💊</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.medTitle}>오늘의 약</Text>
              {totalDoses > 0 ? (
                <Text style={s.medSub}>
                  {allTaken ? '✅ 오늘 약을 모두 드셨어요!' : `${totalDoses}번 중 ${takenDoses}번 복용`}
                </Text>
              ) : (
                <Text style={s.medSub}>등록된 약이 없어요</Text>
              )}
            </View>
            <Text style={s.medArrow}>›</Text>
          </View>

          {/* 진행바 */}
          {totalDoses > 0 && (
            <View style={s.progressBar}>
              <View style={[s.progressFill, {
                width: `${Math.min(100, (takenDoses / totalDoses) * 100)}%` as any,
                backgroundColor: allTaken ? GREEN : ORANGE,
              }]} />
            </View>
          )}

          {!allTaken && totalDoses > 0 && (
            <View style={s.medBtnWrap}>
              <Text style={s.medBtn}>💊 지금 약 먹기</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 기분 체크 */}
        <View style={s.moodCard}>
          <Text style={s.moodTitle}>오늘 기분이 어떠세요?</Text>
          <View style={s.moodRow}>
            {[['😊', '좋아요'], ['😐', '보통이에요'], ['😔', '안 좋아요']].map(([emoji, label]) => (
              <TouchableOpacity
                key={emoji}
                style={[s.moodBtn, mood === emoji && s.moodBtnOn]}
                onPress={() => saveMood(emoji)}
                activeOpacity={0.7}>
                <Text style={s.moodEmoji}>{emoji}</Text>
                <Text style={[s.moodLabel, mood === emoji && s.moodLabelOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 가족 연결 / AI 상담 */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('FamilyConnect', { userId, name })} activeOpacity={0.8}>
            <Text style={s.actionIcon}>👨‍👩‍👧</Text>
            <Text style={s.actionTxt}>가족 연결</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#e8f4fd' }]} onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.8}>
            <Text style={s.actionIcon}>🤖</Text>
            <Text style={s.actionTxt}>AI 건강 상담</Text>
          </TouchableOpacity>
        </View>

        {/* 오늘 약 목록 미리보기 */}
        {meds.length > 0 && (
          <View style={s.medPreview}>
            <Text style={s.previewTitle}>오늘 복용할 약</Text>
            {meds.slice(0, 3).map(m => (
              <View key={m.id} style={s.previewRow}>
                <View style={[s.medDot, { backgroundColor: m.color }]} />
                <Text style={s.previewName}>{m.name}</Text>
                <Text style={s.previewTimes}>{m.times?.join(' · ')}</Text>
              </View>
            ))}
            {meds.length > 3 && <Text style={s.previewMore}>외 {meds.length - 3}개 더 →</Text>}
          </View>
        )}

      </ScrollView>

      {/* 하단 탭바 */}
      <View style={s.tabbar}>
        <TouchableOpacity style={s.tab} onPress={() => {}}>
          <Text style={[s.tabIcon, { opacity: 1 }]}>🏠</Text>
          <Text style={[s.tabLbl, { color: GREEN, fontWeight: '700' }]}>오늘</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('Medication', { userId, name })}>
          <Text style={s.tabIcon}>💊</Text>
          <Text style={s.tabLbl}>내 약</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('AIChat', { userId, name })}>
          <Text style={s.tabIcon}>🤖</Text>
          <Text style={s.tabLbl}>AI 상담</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('Settings', { userId, name })}>
          <Text style={s.tabIcon}>👤</Text>
          <Text style={s.tabLbl}>내 정보</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: CREAM },
  scroll:       { padding: 20, paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8, paddingBottom: 20 },
  header:       { marginBottom: 24 },
  greeting:     { fontSize: 16, color: '#888', marginBottom: 2 },
  name:         { fontSize: 32, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  date:         { fontSize: 15, color: '#aaa' },

  // 약 카드
  medCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  medCardTop:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  medIcon:      { fontSize: 36 },
  medTitle:     { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  medSub:       { fontSize: 14, color: '#666' },
  medArrow:     { fontSize: 24, color: '#ccc' },
  progressBar:  { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  medBtnWrap:   { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  medBtn:       { fontSize: 17, fontWeight: '700', color: '#fff' },

  // 기분
  moodCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  moodTitle:    { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
  moodRow:      { flexDirection: 'row', justifyContent: 'space-around' },
  moodBtn:      { alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0', width: 100 },
  moodBtnOn:    { borderColor: GREEN, backgroundColor: '#f0faf6' },
  moodEmoji:    { fontSize: 36, marginBottom: 6 },
  moodLabel:    { fontSize: 12, color: '#888', fontWeight: '500' },
  moodLabelOn:  { color: GREEN, fontWeight: '700' },

  // 액션 버튼
  actionRow:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn:    { flex: 1, backgroundColor: '#f0faf6', borderRadius: 16, padding: 18, alignItems: 'center' },
  actionIcon:   { fontSize: 28, marginBottom: 6 },
  actionTxt:    { fontSize: 14, fontWeight: '700', color: '#333' },

  // 약 미리보기
  medPreview:   { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  previewRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  medDot:       { width: 10, height: 10, borderRadius: 5 },
  previewName:  { flex: 1, fontSize: 15, color: '#333', fontWeight: '600' },
  previewTimes: { fontSize: 13, color: '#888' },
  previewMore:  { fontSize: 13, color: GREEN, marginTop: 4, textAlign: 'right' },

  // 탭바
  tabbar:       { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 8, paddingBottom: 12 },
  tab:          { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:      { fontSize: 22, opacity: 0.35 },
  tabLbl:       { fontSize: 10, color: '#b0bec5', fontWeight: '500' },
});
