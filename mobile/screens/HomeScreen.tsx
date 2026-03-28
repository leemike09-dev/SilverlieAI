import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';

const MENU_ITEMS = [
  { icon: '📊', key: 'dashboard',    screen: 'Dashboard', color: '#D8F3DC', textColor: '#1B4332' },
  { icon: '❤️', key: 'healthRecord', screen: 'Health',    color: '#DBEAFE', textColor: '#1E3A5F' },
  { icon: '📈', key: 'weeklyReport', screen: 'WeeklyReport', color: '#FEF3C7', textColor: '#78350F' },
  { icon: '👥', key: 'community',    screen: 'Community', color: '#EDE9FE', textColor: '#4C1D95' },
  { icon: '🌏', key: 'healthNews',   screen: 'HealthNews', color: '#E0F2FE', textColor: '#0C4A6E' },
  { icon: '🔔', key: 'notifications',screen: 'Notifications', color: '#FEE2E2', textColor: '#7F1D1D' },
  { icon: '⌚', key: 'wearable',     screen: 'Wearable',  color: '#F0FDF4', textColor: '#166534' },
  { icon: '⚙️', key: 'settings',    screen: 'Settings',  color: '#F5F3FF', textColor: '#4C1D95' },
];

const CONDITION_MAP = [
  { min: 0,   max: 3000, emoji: '😴', label_ko: '오늘 활동이 부족해요', label_en: 'Low activity today', label_ja: '今日は活動が少ないです', label_zh: '今天活动不足' },
  { min: 3000,max: 6000, emoji: '🙂', label_ko: '보통이에요, 조금 더 걸어볼까요?', label_en: 'Not bad, walk a bit more?', label_ja: 'まあまあです', label_zh: '一般，再走走吧' },
  { min: 6000,max: 9999, emoji: '😊', label_ko: '컨디션이 좋아요!', label_en: 'Feeling good!', label_ja: '調子がいいですね！', label_zh: '状态不错！' },
  { min: 9999,max: 99999,emoji: '🌟', label_ko: '훌륭해요! 최고의 하루!', label_en: 'Excellent! Best day!', label_ja: '素晴らしい！', label_zh: '太棒了！' },
];

function getCondition(steps: number | null, lang: string) {
  if (!steps) return { emoji: '😊', label: lang === 'ko' ? '오늘도 건강한 하루!' : lang === 'ja' ? '今日も健康に！' : lang === 'zh' ? '今天也健康！' : 'Have a healthy day!' };
  const c = CONDITION_MAP.find(m => steps >= m.min && steps < m.max) || CONDITION_MAP[2];
  const label = lang === 'ja' ? c.label_ja : lang === 'zh' ? c.label_zh : lang === 'en' ? c.label_en : c.label_ko;
  return { emoji: c.emoji, label };
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
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (!userId || userId === 'demo-user') { setLoadingRecord(false); return; }
    fetch(`${API_URL}/health/history/${userId}?days=1`)
      .then(r => r.json())
      .then(data => {
        if (data.records?.length > 0) setTodayRecord(data.records[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingRecord(false));
  }, [userId]);

  const condition = getCondition(todayRecord?.steps ?? null, language || 'ko');
  const todayStr  = getTodayStr(language || 'ko');

  const metricSummary = todayRecord
    ? [
        todayRecord.blood_pressure_systolic ? `💓 ${todayRecord.blood_pressure_systolic}/${todayRecord.blood_pressure_diastolic}` : null,
        todayRecord.steps ? `🚶 ${todayRecord.steps.toLocaleString()}${language==='ko'?'보':language==='ja'?'歩':'steps'}` : null,
        todayRecord.weight ? `⚖️ ${todayRecord.weight}kg` : null,
      ].filter(Boolean).join('  ·  ')
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8F5E9" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{t.greeting(name)} 😊</Text>
              <Text style={styles.subGreeting}>{t.subGreeting}</Text>
            </View>
            <TouchableOpacity
              style={styles.dateBadge}
              onPress={async () => { await AsyncStorage.clear(); navigation.replace('Login'); }}
            >
              <Text style={styles.dateBadgeText}>{todayStr}</Text>
            </TouchableOpacity>
          </View>

          {/* 컨디션 카드 */}
          <TouchableOpacity
            style={styles.conditionCard}
            onPress={() => navigation.navigate('Health', { userId })}
            activeOpacity={0.85}
          >
            {loadingRecord ? (
              <ActivityIndicator color="#2D6A4F" style={{ marginVertical: 4 }} />
            ) : (
              <>
                <Text style={styles.condEmoji}>{condition.emoji}</Text>
                <View style={styles.condTextBox}>
                  <Text style={styles.condLabel}>{condition.label}</Text>
                  {metricSummary ? (
                    <Text style={styles.condMetrics}>{metricSummary}</Text>
                  ) : (
                    <Text style={styles.condMetrics}>{t.homeTodayNoRecord} →</Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── AI 상담 대형 버튼 ── */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => navigation.navigate('AIChat')}
          activeOpacity={0.88}
        >
          <Text style={styles.aiButtonIcon}>🤖</Text>
          <View>
            <Text style={styles.aiButtonTitle}>{t.aiChat}</Text>
            <Text style={styles.aiButtonSub}>{t.aiChatDesc}</Text>
          </View>
          <Text style={styles.aiArrow}>›</Text>
        </TouchableOpacity>

        {/* ── 메뉴 그리드 ── */}
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuCard, { backgroundColor: item.color }]}
              onPress={() => {
                if (item.screen === 'Dashboard')     navigation.navigate('Dashboard', { name, userId });
                else if (item.screen === 'Health')   navigation.navigate('Health', { userId });
                else if (item.screen === 'Community')navigation.navigate('Community', { userId, name });
                else if (item.screen === 'Settings') navigation.navigate('Settings', { name, userId });
                else if (item.screen === 'WeeklyReport') navigation.navigate('WeeklyReport', { name, userId });
                else if (item.screen === 'AIRecommend')  navigation.navigate('AIRecommend', { name, userId });
                else if (item.screen === 'Notifications')navigation.navigate('Notifications', { userId });
                else navigation.navigate(item.screen);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuTitle, { color: item.textColor }]}>{(t as any)[item.key] || item.key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── 하단 탭바 ── */}
      <View style={styles.tabbar}>
        {[
          { icon: '🏠', label: t.home ?? '홈',      onPress: () => {} },
          { icon: '❤️', label: t.healthRecord,      onPress: () => navigation.navigate('Health', { userId }) },
          { icon: '🤖', label: t.aiChat,            onPress: () => navigation.navigate('AIChat') },
          { icon: '👥', label: t.community,         onPress: () => navigation.navigate('Community', { userId, name }) },
          { icon: '⚙️', label: t.settings,          onPress: () => navigation.navigate('Settings', { name, userId }) },
        ].map((tab, i) => (
          <TouchableOpacity key={i} style={styles.tab} onPress={tab.onPress}>
            <Text style={[styles.tabIcon, i === 0 && styles.tabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, i === 0 && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#FFF8F0' },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 90 },

  /* 헤더 */
  header: {
    background: 'transparent',
    backgroundColor: '#E8F5E9',
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  greeting:      { fontSize: 24, fontWeight: 'bold', color: '#1B4332' },
  subGreeting:   { fontSize: 13, color: '#52B788', marginTop: 2 },
  dateBadge:     { backgroundColor: '#2D6A4F', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  dateBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* 컨디션 카드 */
  conditionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  condEmoji:   { fontSize: 40 },
  condTextBox: { flex: 1 },
  condLabel:   { fontSize: 16, fontWeight: 'bold', color: '#1B4332' },
  condMetrics: { fontSize: 12, color: '#666', marginTop: 4 },

  /* AI 버튼 */
  aiButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  aiButtonIcon:  { fontSize: 34 },
  aiButtonTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  aiButtonSub:   { fontSize: 12, color: '#B7E4C7', marginTop: 2 },
  aiArrow:       { marginLeft: 'auto', fontSize: 28, color: '#B7E4C7' },

  /* 메뉴 그리드 */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  menuCard: {
    width: '47%',
    borderRadius: 18,
    padding: 18,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIcon:  { fontSize: 32, marginBottom: 8 },
  menuTitle: { fontSize: 16, fontWeight: 'bold' },

  /* 탭바 */
  tabbar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#E8F5E9',
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 8,
  },
  tab:           { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:       { fontSize: 22, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel:      { fontSize: 9, color: '#aaa' },
  tabLabelActive:{ color: '#2D6A4F', fontWeight: '700' },
});
