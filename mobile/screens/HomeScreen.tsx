import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, StatusBar, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

const HEALTH_TILES = [
  { icon: '🫀', key: '심혈관', label_ko: '심혈관', label_en: 'Cardio', label_ja: '心臓', label_zh: '心血管' },
  { icon: '🦴', key: '관절', label_ko: '관절', label_en: 'Joints', label_ja: '関節', label_zh: '关节' },
  { icon: '🥗', key: '식이', label_ko: '식이', label_en: 'Diet', label_ja: '食事', label_zh: '饮食' },
  { icon: '🧠', key: '두뇌', label_ko: '두뇌', label_en: 'Brain', label_ja: '脳', label_zh: '大脑' },
];

const TICKER_MSGS = [
  { text_ko: '여행 일정이 필요하신가요?', text_en: 'Need a travel plan?', text_ja: '旅行の計画が必要ですか？', text_zh: '需要旅行计划吗？', target: 'Life' },
  { text_ko: '더 많은 건강 음식 레시피 →', text_en: 'More healthy recipes →', text_ja: 'ヘルシーレシピをもっと見る →', text_zh: '更多健康食谱 →', target: 'Life' },
  { text_ko: '같이하고 싶은 사람들의 모임', text_en: 'Find people to meet', text_ja: '一緒に活動する仲間', text_zh: '寻找同伴活动', target: 'Community' },
];

function calcHealthScore(record: any): number {
  if (!record) return 0;
  let score = 0; let count = 0;
  if (record.steps) { count++; score += record.steps >= 5000 ? 100 : record.steps >= 3000 ? 70 : 40; }
  if (record.blood_pressure_systolic) {
    count++;
    const s = record.blood_pressure_systolic;
    score += s < 120 ? 100 : s < 130 ? 85 : s < 140 ? 65 : 40;
  }
  if (record.heart_rate) {
    count++;
    const h = record.heart_rate;
    score += (h >= 60 && h <= 100) ? 100 : 60;
  }
  if (record.blood_sugar) {
    count++;
    const b = record.blood_sugar;
    score += b < 100 ? 100 : b < 125 ? 75 : 45;
  }
  return count > 0 ? Math.round(score / count) : 72;
}

function getScoreLabel(score: number, lang: string) {
  if (score >= 85) return lang === 'ko' ? '건강 상태 양호' : lang === 'ja' ? '健康状態良好' : lang === 'zh' ? '健康状况良好' : 'Health is good';
  if (score >= 65) return lang === 'ko' ? '주의가 필요해요' : lang === 'ja' ? '注意が必要です' : lang === 'zh' ? '需要注意' : 'Needs attention';
  return lang === 'ko' ? '오늘 건강 체크를!' : lang === 'ja' ? '健康チェックを！' : lang === 'zh' ? '请做健康检查！' : 'Check your health!';
}

function getTodayStr(lang: string) {
  const d = new Date();
  if (lang === 'ko') return `${d.getMonth()+1}월 ${d.getDate()}일`;
  if (lang === 'ja') return `${d.getMonth()+1}月${d.getDate()}日`;
  if (lang === 'zh') return `${d.getMonth()+1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen({ route, navigation }: any) {
  const { name, userId } = route.params;
  const { t, language } = useLanguage();
  const lang = language || 'ko';

  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [exerciseDone, setExerciseDone] = useState<boolean | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);
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
    const cycle = () => {
      Animated.sequence([
        Animated.timing(tickerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(3200),
        Animated.timing(tickerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTickerIdx(i => (i + 1) % TICKER_MSGS.length);
      });
    };
    cycle();
    const id = setInterval(cycle, 4000);
    return () => clearInterval(id);
  }, []);

  const healthScore = calcHealthScore(todayRecord);
  const scoreLabel  = getScoreLabel(healthScore, lang);
  const todayStr    = getTodayStr(lang);
  const ticker      = TICKER_MSGS[tickerIdx];
  const tickerText  = lang === 'ja' ? ticker.text_ja : lang === 'zh' ? ticker.text_zh : lang === 'en' ? ticker.text_en : ticker.text_ko;
  const tickerTarget = ticker.target;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3a5c" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── 파노라마 헤더 ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Silver Life AI</Text>
            <View style={styles.headerBtns}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.headerBtnText}>{lang === 'ko' ? '로그인' : 'Login'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, styles.headerBtnFill]} onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.headerBtnText, { color: '#1a3a5c' }]}>{lang === 'ko' ? '회원가입' : 'Sign up'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.panoramaRow}>
            {/* 건강 점수 링 */}
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
              <Text style={styles.panoramaDate}>{todayStr}</Text>
              <Text style={styles.panoramaLabel}>{lang === 'ko' ? '🤖 AI 건강 점수' : '🤖 AI Health Score'}</Text>
              <Text style={styles.panoramaStatus}>{scoreLabel}</Text>
              <View style={styles.chipRow}>
                {todayRecord?.blood_pressure_systolic ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>💗 {todayRecord.blood_pressure_systolic}/{todayRecord.blood_pressure_diastolic}</Text>
                  </View>
                ) : null}
                {todayRecord?.steps ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>🚶 {todayRecord.steps.toLocaleString()}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* ── 운동 체크 카드 ── */}
        <View style={styles.section}>
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseQuestion}>
              {lang === 'ko' ? '오늘 운동 하셨나요? 🏃' : lang === 'ja' ? '今日運動しましたか？🏃' : lang === 'zh' ? '今天运动了吗？🏃' : 'Did you exercise today? 🏃'}
            </Text>
            <View style={styles.exerciseBtns}>
              <TouchableOpacity
                style={[styles.exerciseBtn, styles.exerciseBtnYes, exerciseDone === true && styles.exerciseBtnActive]}
                onPress={() => setExerciseDone(true)}
              >
                <Text style={[styles.exerciseBtnText, exerciseDone === true && { color: '#fff' }]}>
                  {lang === 'ko' ? '✓ 했어요' : '✓ Yes'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exerciseBtn, styles.exerciseBtnNo, exerciseDone === false && styles.exerciseBtnNoActive]}
                onPress={() => setExerciseDone(false)}
              >
                <Text style={[styles.exerciseBtnText, exerciseDone === false && { color: '#fff' }]}>
                  {lang === 'ko' ? '✗ 아직요' : '✗ Not yet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── AI 상담 카드 ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.aiCard} onPress={() => navigation.navigate('AIChat')} activeOpacity={0.88}>
            <View style={styles.aiCardAccent} />
            <View style={styles.aiCardBody}>
              <Text style={styles.aiCardIcon}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiCardTitle}>{t.aiChat}</Text>
                <Text style={styles.aiCardSub}>{t.aiChatDesc}</Text>
              </View>
              <Text style={styles.aiCardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 건강 정보 타일 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{lang === 'ko' ? '건강 정보' : lang === 'ja' ? '健康情報' : lang === 'zh' ? '健康信息' : 'Health Info'}</Text>
          <View style={styles.tileGrid}>
            {HEALTH_TILES.map((tile) => (
              <TouchableOpacity
                key={tile.key}
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
              { opacity: tickerAnim, transform: [{ translateY: tickerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
            ]}
          >
            <Text style={styles.tickerText} numberOfLines={1}>{tickerText}</Text>
            <TouchableOpacity
              style={styles.tickerBtn}
              onPress={() => navigation.navigate(tickerTarget === 'Community' ? 'Community' : 'HealthNews', { userId, name })}
            >
              <Text style={styles.tickerBtnText}>
                {tickerTarget === 'Community'
                  ? (lang === 'ko' ? '커뮤니티로' : 'Community')
                  : (lang === 'ko' ? '라이프로' : 'Life')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

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
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  headerBtnFill: { backgroundColor: '#fff', borderColor: '#fff' },
  headerBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* 파노라마 */
  panoramaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum:  { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 24 },
  scoreUnit: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  panoramaInfo: { flex: 1 },
  panoramaDate:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  panoramaLabel:  { fontSize: 11, color: '#7dd3fc', fontWeight: '600', marginBottom: 2 },
  panoramaStatus: { fontSize: 15, fontWeight: '700', color: '#ffd700', marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* 섹션 */
  section: { marginHorizontal: 16, marginTop: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1a3a5c', marginBottom: 10 },

  /* 운동 체크 */
  exerciseCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  exerciseQuestion: { fontSize: 18, fontWeight: '700', color: '#1a3a5c', marginBottom: 14 },
  exerciseBtns: { flexDirection: 'row', gap: 12 },
  exerciseBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 2 },
  exerciseBtnYes: { borderColor: '#1565c0', backgroundColor: '#f0f7ff' },
  exerciseBtnNo:  { borderColor: '#e0e0e0', backgroundColor: '#fafafa' },
  exerciseBtnActive: { backgroundColor: '#1565c0' },
  exerciseBtnNoActive: { backgroundColor: '#9e9e9e', borderColor: '#9e9e9e' },
  exerciseBtnText: { fontSize: 16, fontWeight: '700', color: '#1565c0' },

  /* AI 카드 */
  aiCard: { borderRadius: 18, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  aiCardAccent: { width: 5, backgroundColor: '#1565c0' },
  aiCardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  aiCardIcon:  { fontSize: 32 },
  aiCardTitle: { fontSize: 16, fontWeight: '700', color: '#1a3a5c' },
  aiCardSub:   { fontSize: 12, color: '#7b8fa6', marginTop: 2 },
  aiCardArrow: { fontSize: 26, color: '#c5d0da' },

  /* 건강정보 타일 */
  tileGrid: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tileIcon:  { fontSize: 26, marginBottom: 6 },
  tileLabel: { fontSize: 11, fontWeight: '700', color: '#1a3a5c' },

  /* 티커 */
  tickerCard: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tickerText: { flex: 1, fontSize: 13, color: '#1a3a5c', fontWeight: '500' },
  tickerBtn: { backgroundColor: '#1565c0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tickerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
