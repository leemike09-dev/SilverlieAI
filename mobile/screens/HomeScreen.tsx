import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Animated, SafeAreaView, Dimensions,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

const HEALTH_TILES = [
  { icon: '🫀', title: '심혈관 건강', sub: '혈압·콜레스테롤' },
  { icon: '🦴', title: '관절·뼈 건강', sub: '걷기·근력운동' },
  { icon: '🥗', title: '식이·혈당',   sub: '저당·저염 식단' },
  { icon: '🧠', title: '두뇌·수면',   sub: '치매 예방' },
];

const TICKER_MSGS = [
  { text: '여행 일정이 필요하신가요?',    btnText: '라이프로',   target: 'Life' },
  { text: '건강에 좋은 레시피 →',         btnText: '라이프로',   target: 'Life' },
  { text: '같이하고 싶은 사람들의 모임',  btnText: '커뮤니티로', target: 'Community' },
];

function calcHealthScore(r: any): number {
  if (!r) return 0;
  let s = 0, c = 0;
  if (r.steps)                   { c++; s += r.steps >= 5000 ? 100 : r.steps >= 3000 ? 70 : 40; }
  if (r.blood_pressure_systolic) { c++; const v = r.blood_pressure_systolic; s += v < 120 ? 100 : v < 130 ? 85 : v < 140 ? 65 : 40; }
  if (r.heart_rate)              { c++; const v = r.heart_rate; s += (v >= 60 && v <= 100) ? 100 : 60; }
  if (r.blood_sugar)             { c++; const v = r.blood_sugar; s += v < 100 ? 100 : v < 125 ? 75 : 45; }
  return c > 0 ? Math.round(s / c) : 0;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
}

export default function HomeScreen({ route, navigation }: any) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const { t } = useLanguage();

  const [todayRecord, setTodayRecord]     = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [exerciseDone, setExerciseDone]   = useState<boolean | null>(null);
  const [tickerIdx, setTickerIdx]         = useState(0);
  const tickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId || userId === 'demo-user') { setLoadingRecord(false); return; }
    fetch(`${API_URL}/health/history/${userId}?days=1`)
      .then(r => r.json())
      .then(data => { if (data.records?.length > 0) setTodayRecord(data.records[0]); })
      .catch(() => {})
      .finally(() => setLoadingRecord(false));
  }, [userId]);

  useEffect(() => {
    const run = () => {
      Animated.sequence([
        Animated.timing(tickerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(3200),
        Animated.timing(tickerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setTickerIdx(i => (i + 1) % TICKER_MSGS.length));
    };
    run();
    const id = setInterval(run, 4000);
    return () => clearInterval(id);
  }, []);

  const healthScore = calcHealthScore(todayRecord);
  const ticker = TICKER_MSGS[tickerIdx];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── 헤더: 흰 배경 ── */}
      <SafeAreaView style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <Text style={styles.appName}>Silver Life</Text>
          <View style={styles.authRow}>
            <TouchableOpacity style={styles.loginBtn}
              onPress={() => navigation.navigate('Settings', { name, userId })}>
              <Text style={styles.loginTxt}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinBtn}
              onPress={() => navigation.navigate('Settings', { name, userId })}>
              <Text style={styles.joinTxt}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.greeting}>{name}님, 안녕하세요</Text>
        <Text style={styles.dateStr}>{getTodayStr()}</Text>
      </SafeAreaView>

      {/* ── 건강점수 카드 (그라데이션) ── */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <View style={styles.scoreRing}>
            {loadingRecord
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.scoreNum}>{todayRecord ? healthScore : '—'}</Text>
            }
            <Text style={styles.scoreUnit}>점</Text>
          </View>
        </View>
        <View style={styles.scoreRight}>
          <Text style={styles.scoreTitle}>
            {todayRecord ? `건강점수 좋아요! ▲2점` : '오늘 건강 기록을 입력하세요'}
          </Text>
          <Text style={styles.scoreSub}>
            {todayRecord ? '지난주보다 상승 · 상위 20%' : '기록하면 AI가 분석해드려요'}
          </Text>
          <View style={styles.chipRow}>
            {todayRecord?.blood_pressure_systolic && (
              <View style={styles.chip}><Text style={styles.chipTxt}>혈압 {todayRecord.blood_pressure_systolic}/{todayRecord.blood_pressure_diastolic}</Text></View>
            )}
            {todayRecord?.steps && (
              <View style={styles.chip}><Text style={styles.chipTxt}>걸음 {(todayRecord.steps/1000).toFixed(1)}k</Text></View>
            )}
            {!todayRecord && !loadingRecord && (
              <TouchableOpacity style={styles.chipEmpty}
                onPress={() => navigation.navigate('Health', { userId, name })}>
                <Text style={styles.chipEmptyTxt}>+ 기록 입력</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── 본문 ── */}
      <View style={styles.body}>

        {/* 운동 체크 */}
        <View style={styles.exCard}>
          <Text style={styles.exQ}>오늘 운동 하셨나요? 🏃</Text>
          <Text style={styles.exGoal}>오늘 목표: 30분 걷기</Text>
          <View style={styles.exBtns}>
            <TouchableOpacity
              style={[styles.exBtn, styles.exYes, exerciseDone === true && styles.exYesOn]}
              onPress={() => setExerciseDone(true)}>
              <Text style={[styles.exBtnTxt, { color: exerciseDone === true ? '#fff' : '#1565c0' }]}>✓ 했어요</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exBtn, styles.exNo, exerciseDone === false && styles.exNoOn]}
              onPress={() => setExerciseDone(false)}>
              <Text style={[styles.exBtnTxt, { color: exerciseDone === false ? '#546e7a' : '#90a4ae' }]}>✗ 아직요</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 건강 정보 2×2 */}
        <View>
          <Text style={styles.sectionLbl}>건강 정보</Text>
          <View style={styles.tileGrid}>
            {HEALTH_TILES.map((tile, i) => (
              <TouchableOpacity key={i} style={styles.tile}
                onPress={() => navigation.navigate('Health', { userId, name })} activeOpacity={0.8}>
                <Text style={styles.tileIcon}>{tile.icon}</Text>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSub}>{tile.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 티커 */}
        <Animated.View style={[styles.tickerCard, {
          opacity: tickerAnim,
          transform: [{ translateY: tickerAnim.interpolate({ inputRange:[0,1], outputRange:[6,0] }) }],
        }]}>
          <Text style={styles.tickerIcon}>👥</Text>
          <Text style={styles.tickerText} numberOfLines={1}>{ticker.text}</Text>
          <TouchableOpacity style={styles.tickerBtn}
            onPress={() => navigation.navigate(ticker.target, { userId, name })}>
            <Text style={styles.tickerBtnTxt}>{ticker.btnText}</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>

      <BottomTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f4f8' },

  /* 헤더 */
  headerWrap: { backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appName:    { fontSize: 18, fontWeight: '800', color: '#1565c0' },
  authRow:    { flexDirection: 'row', gap: 8 },
  loginBtn:   { borderWidth: 1.5, borderColor: '#1565c0', borderRadius: 18,
                paddingHorizontal: 14, paddingVertical: 7 },
  loginTxt:   { color: '#1565c0', fontSize: 13, fontWeight: '700' },
  joinBtn:    { backgroundColor: '#1565c0', borderRadius: 18,
                paddingHorizontal: 14, paddingVertical: 7 },
  joinTxt:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  greeting:   { fontSize: 22, fontWeight: '800', color: '#1a2a3a', marginBottom: 2 },
  dateStr:    { fontSize: 12, color: '#90a4ae' },

  /* 건강점수 카드 */
  scoreCard: {
    marginHorizontal: 14, marginTop: 12, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1565c0',
    shadowColor: '#1565c0', shadowOpacity: 0.3, shadowOffset: { width:0, height:4 }, shadowRadius:12, elevation:6,
  },
  scoreLeft:  {},
  scoreRing:  { width: 64, height: 64, borderRadius: 32, borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center' },
  scoreNum:   { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 24 },
  scoreUnit:  { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  scoreRight: { flex: 1 },
  scoreTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 3 },
  scoreSub:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  chipRow:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:       { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  chipTxt:    { color: '#fff', fontSize: 11, fontWeight: '600' },
  chipEmpty:  { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, borderWidth:1,
                borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 9, paddingVertical: 3 },
  chipEmptyTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },

  /* 본문 */
  body: { flex: 1, paddingHorizontal: 14, paddingTop: 12, justifyContent: 'space-between', paddingBottom: 8 },

  /* 운동 체크 */
  exCard: { backgroundColor: '#e8f4fd', borderRadius: 18, padding: 16 },
  exQ:    { fontSize: 18, fontWeight: '700', color: '#1a2a3a', marginBottom: 3 },
  exGoal: { fontSize: 12, color: '#78909c', marginBottom: 12 },
  exBtns: { flexDirection: 'row', gap: 10 },
  exBtn:  { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 2 },
  exYes:  { backgroundColor: '#fff', borderColor: '#1565c0' },
  exNo:   { backgroundColor: '#fff', borderColor: '#e0e0e0' },
  exYesOn: { backgroundColor: '#1565c0', borderColor: '#1565c0' },
  exNoOn:  { backgroundColor: '#eceff1', borderColor: '#b0bec5' },
  exBtnTxt: { fontSize: 16, fontWeight: '700' },

  /* 건강 정보 2×2 */
  sectionLbl: { fontSize: 13, fontWeight: '700', color: '#546e7a', marginBottom: 8 },
  tileGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile:       { width: (width - 28 - 8) / 2, backgroundColor: '#fff', borderRadius: 16,
                padding: 14, alignItems: 'flex-start',
                shadowColor: '#000', shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:6, elevation:2 },
  tileIcon:   { fontSize: 28, marginBottom: 8 },
  tileTitle:  { fontSize: 13, fontWeight: '700', color: '#1a2a3a', marginBottom: 3 },
  tileSub:    { fontSize: 11, color: '#90a4ae' },

  /* 티커 */
  tickerCard:   { backgroundColor: '#dbeafe', borderRadius: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  tickerIcon:   { fontSize: 16 },
  tickerText:   { flex: 1, fontSize: 13, color: '#1e40af', fontWeight: '500' },
  tickerBtn:    { backgroundColor: '#1565c0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tickerBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
