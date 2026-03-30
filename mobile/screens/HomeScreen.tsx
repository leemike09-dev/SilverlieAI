import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, StatusBar, Animated,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

const HEALTH_TILES = [
  { icon: '🫀', label_ko: '심혈관', label_en: 'Cardio',  label_ja: '心臓',  label_zh: '心血管' },
  { icon: '🦴', label_ko: '관절',   label_en: 'Joints',  label_ja: '関節',  label_zh: '关节'  },
  { icon: '🥗', label_ko: '식이',   label_en: 'Diet',    label_ja: '食事',  label_zh: '饮食'  },
  { icon: '🧠', label_ko: '두뇌',   label_en: 'Brain',   label_ja: '脳',    label_zh: '大脑'  },
];

const TICKER_MSGS = [
  { text_ko: '여행 일정이 필요하신가요?',      text_en: 'Need a travel plan?',      text_ja: '旅行の計画が必要ですか？', text_zh: '需要旅行计划吗？', target: 'Life' },
  { text_ko: '건강에 좋은 음식 레시피 →',      text_en: 'Healthy food recipes →',   text_ja: 'ヘルシーレシピを見る →',  text_zh: '更多健康食谱 →',    target: 'Life' },
  { text_ko: '같이하고 싶은 사람들의 모임',     text_en: 'Find people to meet',      text_ja: '一緒に活動する仲間',       text_zh: '寻找同伴活动',       target: 'Community' },
];

function calcHealthScore(r: any): number {
  if (!r) return 0;
  let s = 0; let c = 0;
  if (r.steps)                   { c++; s += r.steps >= 5000 ? 100 : r.steps >= 3000 ? 70 : 40; }
  if (r.blood_pressure_systolic) { c++; const v = r.blood_pressure_systolic; s += v < 120 ? 100 : v < 130 ? 85 : v < 140 ? 65 : 40; }
  if (r.heart_rate)              { c++; const v = r.heart_rate; s += (v >= 60 && v <= 100) ? 100 : 60; }
  if (r.blood_sugar)             { c++; const v = r.blood_sugar; s += v < 100 ? 100 : v < 125 ? 75 : 45; }
  return c > 0 ? Math.round(s / c) : 72;
}

function getScoreLabel(score: number, lang: string) {
  if (score >= 85) return lang === 'ko' ? '건강 상태 양호' : lang === 'ja' ? '健康状態良好' : lang === 'zh' ? '健康状况良好' : 'Health is good';
  if (score >= 65) return lang === 'ko' ? '주의가 필요해요' : lang === 'ja' ? '注意が必要です' : lang === 'zh' ? '需要注意' : 'Needs attention';
  return lang === 'ko' ? '오늘 건강 체크를!' : lang === 'ja' ? '健康チェックを！' : lang === 'zh' ? '请做健康检查！' : 'Check your health!';
}

function getTodayStr(lang: string) {
  const d = new Date();
  if (lang === 'ko') return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
  if (lang === 'ja') return `${d.getMonth()+1}月${d.getDate()}日`;
  if (lang === 'zh') return `${d.getMonth()+1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HomeScreen({ route, navigation }: any) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const { t, language } = useLanguage();
  const lang = language || 'ko';

  const [todayRecord, setTodayRecord]   = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [exerciseDone, setExerciseDone] = useState<boolean | null>(null);
  const [tickerIdx, setTickerIdx]       = useState(0);
  const tickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId || userId === 'demo-user') { setLoadingRecord(false); return; }
    fetch(`${API_URL}/health/history/${userId}?days=1`)
      .then(r => r.json())
      .then(data => { if (data.records?.length > 0) setTodayRecord(data.records[0]); })
      .catch(() => {})
      .finally(() => setLoadingRecord(false));
  }, [userId]);

  // 티커 애니메이션
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
  const scoreLabel  = getScoreLabel(healthScore, lang);
  const todayStr    = getTodayStr(lang);
  const ticker      = TICKER_MSGS[tickerIdx];
  const tickerText  = lang === 'ja' ? ticker.text_ja : lang === 'zh' ? ticker.text_zh : lang === 'en' ? ticker.text_en : ticker.text_ko;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3a5c" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── 파노라마 헤더 ── */}
        <View style={styles.header}>
          {/* 상단 바: 앱명 + 날짜 */}
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.appName}>Silver Life AI</Text>
              <Text style={styles.headerDate}>{todayStr}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.langBtn}
                onPress={() => navigation.navigate('Settings', { name, userId })}
              >
                <Text style={styles.langBtnText}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={() => navigation.navigate('Notifications', { userId, name })}
              >
                <Text style={styles.notifBtnText}>🔔</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 건강 점수 파노라마 */}
          <View style={styles.panoramaRow}>
            <View style={styles.scoreRing}>
              {loadingRecord ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.scoreNum}>{todayRecord ? healthScore : '—'}</Text>
                  <Text style={styles.scoreUnit}>{lang === 'ko' ? '점' : 'pts'}</Text>
                </>
              )}
            </View>
            <View style={styles.panoramaInfo}>
              <Text style={styles.panoramaTagLine}>🤖 {lang === 'ko' ? 'AI 건강 점수' : 'AI Health Score'}</Text>
              <Text style={styles.panoramaStatus}>{scoreLabel}</Text>
              <View style={styles.chipRow}>
                {todayRecord?.blood_pressure_systolic ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>💗 {todayRecord.blood_pressure_systolic}/{todayRecord.blood_pressure_diastolic}</Text>
                  </View>
                ) : null}
                {todayRecord?.steps ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>🚶 {todayRecord.steps.toLocaleString()}{lang === 'ko' ? '보' : ''}</Text>
                  </View>
                ) : null}
                {!todayRecord && !loadingRecord && (
                  <TouchableOpacity style={styles.chipEmpty} onPress={() => navigation.navigate('Health', { userId, name })}>
                    <Text style={styles.chipEmptyText}>{lang === 'ko' ? '+ 오늘 기록 입력' : '+ Add today\'s record'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── 운동 체크 카드 ── */}
        <View style={styles.section}>
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseQ}>
              {lang === 'ko' ? '오늘 운동 하셨나요? 🏃' : lang === 'ja' ? '今日運動しましたか？🏃' : lang === 'zh' ? '今天运动了吗？🏃' : 'Did you exercise today? 🏃'}
            </Text>
            <View style={styles.exerciseBtns}>
              <TouchableOpacity
                style={[styles.exBtn, styles.exBtnYes, exerciseDone === true && styles.exBtnYesActive]}
                onPress={() => setExerciseDone(true)}
              >
                <Text style={[styles.exBtnText, { color: exerciseDone === true ? '#fff' : '#1565c0' }]}>✓ {lang === 'ko' ? '했어요' : 'Yes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exBtn, styles.exBtnNo, exerciseDone === false && styles.exBtnNoActive]}
                onPress={() => setExerciseDone(false)}
              >
                <Text style={[styles.exBtnText, { color: exerciseDone === false ? '#fff' : '#9aabb8' }]}>✗ {lang === 'ko' ? '아직요' : 'Not yet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── AI 상담 카드 ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.aiCard} onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.88}>
            <View style={styles.aiCardBar} />
            <View style={styles.aiCardInner}>
              <Text style={styles.aiCardIcon}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiCardTitle}>{t.aiChat}</Text>
                <Text style={styles.aiCardSub}>{t.aiChatDesc}</Text>
              </View>
              <Text style={styles.aiCardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 건강 정보 타일 4개 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {lang === 'ko' ? '건강 정보' : lang === 'ja' ? '健康情報' : lang === 'zh' ? '健康信息' : 'Health Info'}
          </Text>
          <View style={styles.tileRow}>
            {HEALTH_TILES.map((tile, i) => (
              <TouchableOpacity
                key={i}
                style={styles.tile}
                onPress={() => navigation.navigate('Health', { userId, name })}
                activeOpacity={0.8}
              >
                <Text style={styles.tileIcon}>{tile.icon}</Text>
                <Text style={styles.tileLabel}>
                  {lang === 'ja' ? tile.label_ja : lang === 'zh' ? tile.label_zh : lang === 'en' ? tile.label_en : tile.label_ko}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 슬라이딩 티커 ── */}
        <View style={styles.section}>
          <Animated.View
            style={[
              styles.tickerCard,
              {
                opacity: tickerAnim,
                transform: [{ translateY: tickerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              },
            ]}
          >
            <Text style={styles.tickerText} numberOfLines={1}>{tickerText}</Text>
            <TouchableOpacity
              style={styles.tickerBtn}
              onPress={() => navigation.navigate(ticker.target === 'Community' ? 'Community' : 'Notifications', { userId, name })}
            >
              <Text style={styles.tickerBtnText}>
                {ticker.target === 'Community'
                  ? (lang === 'ko' ? '커뮤니티로' : 'Community')
                  : (lang === 'ko' ? '라이프로' : 'Life')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#f4f8fc' },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 90 },

  /* 헤더 */
  header: {
    backgroundColor: '#1a3a5c',
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  appName:    { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.4 },
  headerDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  langBtn:     { padding: 4 },
  langBtnText: { fontSize: 20 },
  notifBtn:    { padding: 4 },
  notifBtnText: { fontSize: 20 },

  /* 파노라마 */
  panoramaRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  scoreRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum:  { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 26 },
  scoreUnit: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  panoramaInfo:    { flex: 1 },
  panoramaTagLine: { fontSize: 11, color: '#7dd3fc', fontWeight: '600', marginBottom: 4 },
  panoramaStatus:  { fontSize: 16, fontWeight: '700', color: '#ffd700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  chipText:      { color: '#fff', fontSize: 12, fontWeight: '600' },
  chipEmpty: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderStyle: 'dashed',
  },
  chipEmptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  /* 섹션 */
  section:      { marginHorizontal: 16, marginTop: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1a3a5c', marginBottom: 10 },

  /* 운동 체크 */
  exerciseCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  exerciseQ:    { fontSize: 18, fontWeight: '700', color: '#1a3a5c', marginBottom: 14 },
  exerciseBtns: { flexDirection: 'row', gap: 12 },
  exBtn:        { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 2 },
  exBtnYes:     { borderColor: '#1565c0', backgroundColor: '#f0f7ff' },
  exBtnNo:      { borderColor: '#e0e0e0', backgroundColor: '#fafafa' },
  exBtnYesActive: { backgroundColor: '#1565c0', borderColor: '#1565c0' },
  exBtnNoActive:  { backgroundColor: '#9e9e9e', borderColor: '#9e9e9e' },
  exBtnText:    { fontSize: 16, fontWeight: '700' },

  /* AI 상담 카드 */
  aiCard: {
    borderRadius: 18, overflow: 'hidden', flexDirection: 'row',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  aiCardBar:   { width: 5, backgroundColor: '#1565c0' },
  aiCardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  aiCardIcon:  { fontSize: 32 },
  aiCardTitle: { fontSize: 16, fontWeight: '700', color: '#1a3a5c' },
  aiCardSub:   { fontSize: 12, color: '#7b8fa6', marginTop: 2 },
  aiCardArrow: { fontSize: 28, color: '#c5d0da' },

  /* 건강 정보 타일 */
  tileRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tileIcon:  { fontSize: 26, marginBottom: 6 },
  tileLabel: { fontSize: 12, fontWeight: '700', color: '#1a3a5c' },

  /* 티커 */
  tickerCard: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tickerText:    { flex: 1, fontSize: 13, color: '#1a3a5c', fontWeight: '500' },
  tickerBtn:     { backgroundColor: '#1565c0', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 7 },
  tickerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
