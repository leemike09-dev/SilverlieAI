import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = 'https://silverlieai.onrender.com';

export default function HomeScreen({ route, navigation }: any) {
  const { name, userId } = route.params;
  const { t } = useLanguage();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (!userId || userId === 'demo-user') {
      setLoadingRecord(false);
      return;
    }
    fetch(`${API_URL}/health/records?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        const today = new Date().toISOString().slice(0, 10);
        const todayRec = Array.isArray(data)
          ? data.find((r: any) => r.recorded_at?.slice(0, 10) === today)
          : null;
        setTodayRecord(todayRec || null);
      })
      .catch(() => {})
      .finally(() => setLoadingRecord(false));
  }, [userId]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{t.greeting(name)}</Text>
            <Text style={styles.subGreeting}>{t.subGreeting}</Text>
          </View>
          <TouchableOpacity onPress={async () => { await AsyncStorage.clear(); navigation.replace('Login'); }} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 오늘의 건강 요약 카드 */}
      <TouchableOpacity
        style={styles.summaryCard}
        onPress={() => navigation.navigate('Health', { userId })}
        activeOpacity={0.85}
      >
        <Text style={styles.summaryTitle}>{t.homeTodaySummary}</Text>
        {loadingRecord ? (
          <ActivityIndicator color="#2D6A4F" style={{ marginTop: 8 }} />
        ) : todayRecord ? (
          <View style={styles.summaryMetrics}>
            {todayRecord.blood_pressure_systolic && (
              <View style={styles.metric}>
                <Text style={styles.metricIcon}>💓</Text>
                <Text style={styles.metricValue}>
                  {todayRecord.blood_pressure_systolic}/{todayRecord.blood_pressure_diastolic}
                </Text>
                <Text style={styles.metricLabel}>{t.metricBP}</Text>
              </View>
            )}
            {todayRecord.heart_rate && (
              <View style={styles.metric}>
                <Text style={styles.metricIcon}>🫀</Text>
                <Text style={styles.metricValue}>{todayRecord.heart_rate}</Text>
                <Text style={styles.metricLabel}>{t.metricHR}</Text>
              </View>
            )}
            {todayRecord.weight && (
              <View style={styles.metric}>
                <Text style={styles.metricIcon}>⚖️</Text>
                <Text style={styles.metricValue}>{todayRecord.weight}</Text>
                <Text style={styles.metricLabel}>{t.metricWeight}</Text>
              </View>
            )}
            {todayRecord.blood_sugar && (
              <View style={styles.metric}>
                <Text style={styles.metricIcon}>🩸</Text>
                <Text style={styles.metricValue}>{todayRecord.blood_sugar}</Text>
                <Text style={styles.metricLabel}>{t.metricBloodSugar}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noRecordRow}>
            <Text style={styles.noRecordText}>{t.homeTodayNoRecord}</Text>
            <Text style={styles.recordNowText}>{t.homeRecordNow}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Dashboard', { name, userId })}>
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuTitle}>{t.dashboard}</Text>
          <Text style={styles.menuDesc}>{t.dashboardDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Health', { userId })}>
          <Text style={styles.menuIcon}>❤️</Text>
          <Text style={styles.menuTitle}>{t.healthRecord}</Text>
          <Text style={styles.menuDesc}>{t.healthDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Community', { userId, name })}>
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuTitle}>{t.community}</Text>
          <Text style={styles.menuDesc}>{t.communityDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AIChat')}>
          <Text style={styles.menuIcon}>🤖</Text>
          <Text style={styles.menuTitle}>{t.aiChat}</Text>
          <Text style={styles.menuDesc}>{t.aiChatDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AIRecommend', { name, userId })}>
          <Text style={styles.menuIcon}>✨</Text>
          <Text style={styles.menuTitle}>{t.aiRecommend}</Text>
          <Text style={styles.menuDesc}>{t.aiRecommendDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('WeeklyReport', { name, userId })}>
          <Text style={styles.menuIcon}>📈</Text>
          <Text style={styles.menuTitle}>{t.weeklyReport}</Text>
          <Text style={styles.menuDesc}>{t.weeklyReportDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Settings', { name, userId })}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuTitle}>{t.settings}</Text>
          <Text style={styles.menuDesc}>{t.settingsDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Notifications', { userId })}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuTitle}>{t.notifications}</Text>
          <Text style={styles.menuDesc}>{t.notificationsDesc}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 24,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#B7E4C7',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2D6A4F',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 12,
  },
  summaryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metric: {
    alignItems: 'center',
    minWidth: 64,
  },
  metricIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1A17',
  },
  metricLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noRecordText: {
    fontSize: 15,
    color: '#999',
  },
  recordNowText: {
    fontSize: 15,
    color: '#2D6A4F',
    fontWeight: 'bold',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  menuCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  menuDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
