import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Animated, Platform, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabBar from '../components/BottomTabBar';
import { DEMO_MODE } from '../App';

const API_URL = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

const HEALTH_TILES = [
  { icon: '🫀', label: '심혈관 건강', sub: '혈압·콜레스테롤' },
  { icon: '🦴', label: '관절·뼈 건강', sub: '걷기·근력운동' },
  { icon: '🥗', label: '식이·혈당',   sub: '저당·저염 식단' },
  { icon: '🧠', label: '두뇌·수면',   sub: '치매 예방' },
];

const TICKERS = [
  { text: '오늘 건강 기록을 입력해보세요', btn: '건강으로', target: 'Health' },
  { text: 'AI 상담으로 건강 궁금증 해결',  btn: 'AI 상담', target: 'AIChat' },
  { text: '약 복용 시간을 확인하세요',      btn: '내 약',   target: 'Medication' },
];

function getTodayStr() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
}

function calcScore(r: any): number {
  if (!r) return 0;
  let s = 0, c = 0;
  if (r.steps)                   { c++; s += r.steps >= 8000 ? 100 : r.steps >= 5000 ? 80 : 55; }
  if (r.blood_pressure_systolic) { c++; const v = r.blood_pressure_systolic; s += v < 120 ? 100 : v < 130 ? 85 : v < 140 ? 65 : 40; }
  if (r.heart_rate)              { c++; const v = r.heart_rate; s += (v >= 60 && v <= 100) ? 100 : 60; }
  if (r.blood_sugar)             { c++; const v = r.blood_sugar; s += v < 100 ? 100 : v < 125 ? 75 : 45; }
  return c > 0 ? Math.round(s / c) : 0;
}

export default function HomeScreen({ route, navigation }: any) {
  const [isGuest,      setIsGuest]      = useState(DEMO_MODE ? false : true);
  const [name,         setName]         = useState(DEMO_MODE ? '홍길동' : '게스트');
  const [userId,       setUserId]       = useState(DEMO_MODE ? 'demo-user' : '');
  const [record,       setRecord]       = useState<any>(null);
  const [exerciseDone, setExerciseDone] = useState<boolean | null>(null);
  const [showPopup,    setShowPopup]    = useState(false);
  const [tickerIdx,    setTickerIdx]    = useState(0);
  const popupAnim  = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (DEMO_MODE) return;
    const checkLogin = async () => {
      const storedId   = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      if (storedId && storedName) {
        setIsGuest(false); setName(storedName); setUserId(storedId);
      } else {
        const pId    = route?.params?.userId;
        const pName  = route?.params?.name;
        const pGuest = route?.params?.isGuest;
        if (pId && pId !== 'demo-user' && pGuest === false) {
          setIsGuest(false); setName(pName || '회원'); setUserId(pId);
        }
      }
    };
    checkLogin();
  }, [route?.params]);

  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    fetch(`${API_URL}/health/history/${userId}?days=1`)
      .then(r => r.json())
      .then(d => { if (d.records?.length > 0) setRecord(d.records[0]); })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerIdx(i => (i + 1) % TICKERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const openPopup = () => {
    setShowPopup(true);
    Animated.spring(popupAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };
  const closePopup = () => {
    Animated.timing(popupAnim, { toValue: 300, duration: 220, useNativeDriver: true })
      .start(() => setShowPopup(false));
  };
  const requireLogin = (action?: () => void) => {
    if (isGuest) { openPopup(); return; }
    action?.();
  };
  const goLogin  = () => { closePopup(); setTimeout(() => navigation.navigate('Login'), 250); };
  const goSignup = () => { closePopup(); setTimeout(() => navigation.navigate('Login', { tab: 'signup' }), 250); };

  const score  = calcScore(record);
  const ticker = TICKERS[tickerIdx];
  const tileW = (width - 32 - 10) / 2;

  return (
    <View style={s.root}>

      {/* ── 헤더 ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.appName}>Silver Life</Text>
          <View style={s.headerBtns}>
            {(isGuest || DEMO_MODE) && (
              <>
                <TouchableOpacity style={s.btnLogin} onPress={goLogin}>
                  <Text style={s.btnLoginTxt}>로그인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSignup} onPress={goSignup}>
                  <Text style={s.btnSignupTxt}>회원가입</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Notifications', { userId, name })}>
              <Text style={{ fontSize: 26 }}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.greeting}>{name}님, 안녕하세요</Text>
        <Text style={s.dateText}>{getTodayStr()}</Text>
        <View style={s.wave1} /><View style={s.wave2} />
      </View>

      {/* ── 본문 (flex:1, 스크롤 없음) ── */}
      <View style={s.body}>

        {/* 건강 점수 카드 */}
        <TouchableOpacity style={s.scoreCard}
          onPress={() => requireLogin(() => navigation.navigate('Dashboard', { userId, name }))}
          activeOpacity={0.9}>
          <View style={s.scoreRing}>
            <Text style={s.scoreNum}>{isGuest ? '--' : (score || '82')}</Text>
            <Text style={s.scoreUnit}>점</Text>
          </View>
          <View style={{ flex: 1 }}>
            {isGuest ? (
              <>
                <Text style={s.scoreTitle}>건강점수 확인하기 🔒</Text>
                <Text style={s.scoreSub}>로그인 후 AI 건강 분석 제공</Text>
              </>
            ) : (
              <>
                <Text style={s.scoreTitle}>건강점수 좋아요! ▲2점</Text>
                <Text style={s.scoreSub}>지난주보다 상승 · 상위 20%</Text>
              </>
            )}
            <Text style={s.scoreHint}>👆 탭하여 AI 분석 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 오늘 운동 */}
        <View style={s.exCard}>
          <Text style={s.exTitle}>오늘 운동 하셨나요? 🏃</Text>
          <View style={s.exBtns}>
            <TouchableOpacity style={[s.exBtn, s.exBtnYes, exerciseDone === true && s.exBtnYesActive]}
              onPress={() => requireLogin(() => setExerciseDone(true))}>
              <Text style={[s.exBtnTxt, exerciseDone === true && { color: '#fff' }]}>✓ 했어요</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.exBtn, s.exBtnNo]}
              onPress={() => requireLogin(() => setExerciseDone(false))}>
              <Text style={s.exBtnNoTxt}>✗ 아직요</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 건강 정보 2x2 그리드 */}
        <Text style={s.sectionLabel}>건강 정보</Text>
        <View style={s.grid}>
          {HEALTH_TILES.map((tile, i) => (
            <TouchableOpacity key={i} style={[s.tile, { width: tileW }]}
              onPress={() => navigation.navigate('HealthInfo', { userId, name, category: tile.label })}>
              <Text style={s.tileIcon}>{tile.icon}</Text>
              <Text style={s.tileLabel}>{tile.label}</Text>
              <Text style={s.tileSub}>{tile.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 티커 배너 */}
        <TouchableOpacity style={s.ticker}
          onPress={() => requireLogin(() => navigation.navigate(ticker.target as any, { userId, name }))}
          activeOpacity={0.85}>
          <Text style={s.tickerText}>👥 {ticker.text}</Text>
          <View style={s.tickerBtn}><Text style={s.tickerBtnTxt}>{ticker.btn}</Text></View>
        </TouchableOpacity>

      </View>

      {/* ── 탭바 ── */}
      <BottomTabBar navigation={navigation} activeTab="Home" userId={userId} name={name} onGuestPress={openPopup} />

      {/* ── 로그인 팝업 ── */}
      <Modal visible={showPopup} transparent animationType="none" onRequestClose={closePopup}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closePopup} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: popupAnim }] }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetIcon}>🔐</Text>
          <Text style={s.sheetTitle}>로그인이 필요해요</Text>
          <Text style={s.sheetSub}>{'AI 건강 분석, 기록, 커뮤니티는\n로그인 후 이용하실 수 있습니다'}</Text>
          <TouchableOpacity style={s.sheetLogin} onPress={goLogin}>
            <Text style={s.sheetLoginTxt}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.sheetSignup} onPress={goSignup}>
            <Text style={s.sheetSignupTxt}>회원가입</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={closePopup}>
            <Text style={s.sheetCancel}>취소</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f7' },

  // 헤더
  header:       { backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 14 : 28, paddingBottom: 12 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  appName:      { fontSize: 24, fontWeight: '800', color: '#1a5fbc' },
  headerBtns:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnLogin:     { borderWidth: 2, borderColor: '#1a5fbc', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16 },
  btnLoginTxt:  { fontSize: 16, fontWeight: '700', color: '#1a5fbc' },
  btnSignup:    { backgroundColor: '#1a5fbc', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16 },
  btnSignupTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  greeting:     { fontSize: 22, fontWeight: '800', color: '#1a2a3a' },
  dateText:     { fontSize: 16, color: '#90a4ae', marginTop: 2, marginBottom: 8 },
  wave1:        { height: 3, backgroundColor: '#bbdefb', borderRadius: 2, opacity: 0.5, marginBottom: 2 },
  wave2:        { height: 3, backgroundColor: '#90caf9', borderRadius: 2, opacity: 0.7 },

  // 본문
  body: { flex: 1, padding: 16, gap: 12 },

  // 건강 점수 카드
  scoreCard:  { backgroundColor: '#1a5fbc', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing:  { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum:   { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 26 },
  scoreUnit:  { fontSize: 18, color: 'rgba(255,255,255,0.8)' },
  scoreTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  scoreSub:   { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  scoreHint:  { fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontStyle: 'italic' },

  // 운동 카드
  exCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  exTitle:      { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 10 },
  exBtns:       { flexDirection: 'row', gap: 10 },
  exBtn:        { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  exBtnYes:     { borderWidth: 2, borderColor: '#1a5fbc' },
  exBtnYesActive: { backgroundColor: '#1a5fbc' },
  exBtnNo:      { borderWidth: 2, borderColor: '#e0e0e0' },
  exBtnTxt:     { fontSize: 16, fontWeight: '700', color: '#1a5fbc' },
  exBtnNoTxt:   { fontSize: 16, fontWeight: '700', color: '#90a4ae' },

  // 건강 정보
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1a2a3a' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:         { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tileIcon:     { fontSize: 28, marginBottom: 6 },
  tileLabel:    { fontSize: 16, fontWeight: '700', color: '#1a2a3a' },
  tileSub:      { fontSize: 18, color: '#90a4ae', marginTop: 2 },

  // 티커
  ticker:       { backgroundColor: '#e8f0fe', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tickerText:   { flex: 1, fontSize: 16, fontWeight: '700', color: '#1a3a6c' },
  tickerBtn:    { backgroundColor: '#1a5fbc', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  tickerBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 팝업
  overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 40, alignItems: 'center' },
  sheetHandle:   { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginBottom: 18 },
  sheetIcon:     { fontSize: 40, marginBottom: 10 },
  sheetTitle:    { fontSize: 20, fontWeight: '800', color: '#1a2a3a', marginBottom: 6 },
  sheetSub:      { fontSize: 16, color: '#90a4ae', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  sheetLogin:    { width: '100%', backgroundColor: '#1a5fbc', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  sheetLoginTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  sheetSignup:   { width: '100%', borderWidth: 2, borderColor: '#1a5fbc', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  sheetSignupTxt:{ fontSize: 18, fontWeight: '800', color: '#1a5fbc' },
  sheetCancel:   { fontSize: 16, color: '#90a4ae' },
});
