import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Modal, Animated, Dimensions, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';
const { width } = Dimensions.get('window');

const HEALTH_TILES = [
  { icon: '🫀', label: '심혈관 건강', sub: '혈압·콜레스테롤' },
  { icon: '🦴', label: '관절·뼈 건강', sub: '걷기·근력운동' },
  { icon: '🥗', label: '식이·혈당',   sub: '저당·저염 식단' },
  { icon: '🧠', label: '두뇌·수면',   sub: '치매 예방' },
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
  const [isGuest,      setIsGuest]      = useState(true);
  const [name,         setName]         = useState('게스트');
  const [userId,       setUserId]       = useState('');
  const [record,       setRecord]       = useState<any>(null);
  const [exerciseDone, setExerciseDone] = useState<boolean | null>(null);
  const [showPopup,    setShowPopup]    = useState(false);
  const popupAnim = useRef(new Animated.Value(300)).current;

  // AsyncStorage로 로그인 상태 확인 (route params보다 우선)
  useEffect(() => {
    const checkLogin = async () => {
      const storedId   = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      if (storedId && storedName) {
        setIsGuest(false);
        setName(storedName);
        setUserId(storedId);
      } else {
        const pUserId = route?.params?.userId;
        const pName   = route?.params?.name;
        const pGuest  = route?.params?.isGuest;
        if (pUserId && pUserId !== 'demo-user' && pGuest === false) {
          setIsGuest(false);
          setName(pName || '회원');
          setUserId(pUserId);
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

  const openPopup = () => {
    setShowPopup(true);
    Animated.spring(popupAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };
  const closePopup = () => {
    Animated.timing(popupAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => setShowPopup(false));
  };

  const requireLogin = (action?: () => void) => {
    if (isGuest) { openPopup(); return; }
    action?.();
  };

  const goLogin  = () => { closePopup(); setTimeout(() => navigation.navigate('Login'), 250); };
  const goSignup = () => { closePopup(); setTimeout(() => navigation.navigate('Login', { tab: 'signup' }), 250); };

  const score = calcScore(record);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* 헤더 */}
      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.appName}>Silver Life</Text>
          {isGuest ? (
            <View style={s.headerBtns}>
              <TouchableOpacity style={s.btnLogin} onPress={goLogin}>
                <Text style={s.btnLoginTxt}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSignup} onPress={goSignup}>
                <Text style={s.btnSignupTxt}>회원가입</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.greeting}>{name}님, 안녕하세요</Text>
        <Text style={s.dateText}>{getTodayStr()}</Text>
        {/* 물결 */}
        <View style={s.waveWrap}>
          <View style={[s.waveLine, { opacity: 0.45, marginBottom: 4 }]} />
          <View style={[s.waveLine, { opacity: 0.75 }]} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        {/* 건강 점수 카드 */}
        <TouchableOpacity
          style={s.scoreCard}
          onPress={() => requireLogin(() => navigation.navigate('Dashboard', { userId, name }))}
          activeOpacity={isGuest ? 1 : 0.85}
        >
          <View style={s.scoreRing}>
            <Text style={s.scoreNum}>{isGuest ? '--' : (score || '82')}</Text>
            <Text style={s.scoreUnit}>점</Text>
          </View>
          <View style={s.scoreRight}>
            {isGuest ? (
              <>
                <Text style={s.scoreTitle}>건강점수 확인하기 🔒</Text>
                <Text style={s.scoreSub}>로그인 후 AI 건강 분석 제공</Text>
              </>
            ) : (
              <>
                <Text style={s.scoreTitle}>건강점수 좋아요! ▲2점</Text>
                <Text style={s.scoreSub}>지난주보다 상승 · 상위 20%</Text>
                <View style={s.scoreBadgeRow}>
                  {record?.blood_pressure_systolic && (
                    <View style={s.scoreBadge}><Text style={s.scoreBadgeTxt}>혈압 {record.blood_pressure_systolic}/{record.blood_pressure_diastolic}</Text></View>
                  )}
                  {record?.steps && (
                    <View style={s.scoreBadge}><Text style={s.scoreBadgeTxt}>걸음 {(record.steps/1000).toFixed(1)}k</Text></View>
                  )}
                  {!record && (
                    <View style={s.scoreBadge}><Text style={s.scoreBadgeTxt}>혈압 120/80</Text></View>
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* 오늘 운동 카드 */}
        <TouchableOpacity
          style={s.exerciseCard}
          onPress={() => requireLogin()}
          activeOpacity={isGuest ? 0.7 : 1}
        >
          <Text style={s.exTitle}>오늘 운동 하셨나요? 🏃</Text>
          <Text style={s.exSub}>오늘 목표: 30분 걷기</Text>
          <View style={s.exBtns}>
            <TouchableOpacity
              style={[s.exBtn, s.exBtnYes, exerciseDone === true && s.exBtnActive]}
              onPress={() => requireLogin(() => setExerciseDone(true))}
            >
              <Text style={[s.exBtnTxt, exerciseDone === true && { color: '#fff' }]}>✓ 했어요</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.exBtn, s.exBtnNo, exerciseDone === false && { backgroundColor: '#f5f5f5' }]}
              onPress={() => requireLogin(() => setExerciseDone(false))}
            >
              <Text style={s.exBtnTxtNo}>✗ 아직요</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* 건강 정보 (누구나 열람 가능) */}
        <Text style={s.sectionTitle}>건강 정보</Text>
        <View style={s.tilesGrid}>
          {HEALTH_TILES.map((tile, i) => (
            <TouchableOpacity key={i} style={s.tile}
              onPress={() => navigation.navigate('HealthNews', { userId, name })}
            >
              <Text style={s.tileIcon}>{tile.icon}</Text>
              <Text style={s.tileLabel}>{tile.label}</Text>
              <Text style={s.tileSub}>{tile.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 커뮤니티 배너 */}
        <TouchableOpacity
          style={s.commBanner}
          onPress={() => requireLogin(() => navigation.navigate('Community', { userId, name }))}
          activeOpacity={0.85}
        >
          <Text style={s.commTxt}>👥 같이하고 싶은 사람들의 모임</Text>
          <View style={s.commBtn}><Text style={s.commBtnTxt}>커뮤니티로</Text></View>
        </TouchableOpacity>

      </ScrollView>

      {/* 탭바 */}
      <BottomTabBar navigation={navigation} activeTab="Home" userId={userId} name={name} onGuestPress={openPopup} />

      {/* 로그인 팝업 (바텀시트) */}
      <Modal visible={showPopup} transparent animationType="none" onRequestClose={closePopup}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closePopup} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: popupAnim }] }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetIcon}>🔐</Text>
          <Text style={s.sheetTitle}>로그인이 필요해요</Text>
          <Text style={s.sheetSub}>AI 건강 분석, 기록, 커뮤니티는{'\n'}로그인 후 이용하실 수 있습니다</Text>
          <TouchableOpacity style={s.sheetBtnLogin} onPress={goLogin}>
            <Text style={s.sheetBtnLoginTxt}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.sheetBtnSignup} onPress={goSignup}>
            <Text style={s.sheetBtnSignupTxt}>회원가입</Text>
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
  header: { backgroundColor: '#fff', paddingHorizontal: 18, paddingBottom: 12, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appName: { fontSize: 20, fontWeight: '800', color: '#1a5fbc' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  btnLogin: { borderWidth: 2, borderColor: '#1a5fbc', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  btnLoginTxt: { fontSize: 13, fontWeight: '700', color: '#1a5fbc' },
  btnSignup: { backgroundColor: '#1a5fbc', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  btnSignupTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1a2a3a', marginBottom: 2 },
  dateText: { fontSize: 13, color: '#90a4ae', marginBottom: 6 },
  waveWrap: { marginTop: 4 },
  waveLine: { height: 3, backgroundColor: '#bbdefb', borderRadius: 2, marginBottom: 2 },

  // 바디
  body: { flex: 1 },
  bodyContent: { padding: 14, paddingBottom: 20, gap: 10 },

  // 건강 점수
  scoreCard: {
    backgroundColor: '#1a5fbc', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  scoreRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 24 },
  scoreUnit: { fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  scoreRight: { flex: 1 },
  scoreTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 3 },
  scoreSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  scoreBadgeRow: { flexDirection: 'row', gap: 6 },
  scoreBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9 },
  scoreBadgeTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },

  // 운동
  exerciseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  exTitle: { fontSize: 16, fontWeight: '800', color: '#1a2a3a', marginBottom: 3 },
  exSub: { fontSize: 12, color: '#90a4ae', marginBottom: 12 },
  exBtns: { flexDirection: 'row', gap: 10 },
  exBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  exBtnYes: { borderWidth: 2, borderColor: '#1a5fbc' },
  exBtnActive: { backgroundColor: '#1a5fbc' },
  exBtnNo: { borderWidth: 2, borderColor: '#e0e0e0' },
  exBtnTxt: { fontSize: 14, fontWeight: '700', color: '#1a5fbc' },
  exBtnTxtNo: { fontSize: 14, fontWeight: '700', color: '#90a4ae' },

  // 건강 정보
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a2a3a', marginTop: 2 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: (width - 14*2 - 10) / 2, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tileIcon: { fontSize: 26, marginBottom: 6 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: '#1a2a3a' },
  tileSub: { fontSize: 11, color: '#90a4ae', marginTop: 3 },

  // 커뮤니티 배너
  commBanner: {
    backgroundColor: '#e8f0fe', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  commTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1a3a6c' },
  commBtn: { backgroundColor: '#1a5fbc', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  commBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // 팝업
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: 40, alignItems: 'center',
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginBottom: 18 },
  sheetIcon: { fontSize: 36, marginBottom: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 6 },
  sheetSub: { fontSize: 13, color: '#90a4ae', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  sheetBtnLogin: {
    width: '100%', backgroundColor: '#1a5fbc', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  sheetBtnLoginTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sheetBtnSignup: {
    width: '100%', borderWidth: 2, borderColor: '#1a5fbc', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 14,
  },
  sheetBtnSignupTxt: { fontSize: 16, fontWeight: '800', color: '#1a5fbc' },
  sheetCancel: { fontSize: 13, color: '#90a4ae' },
});
