import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

export default function HomeScreen({ route, navigation }: any) {
  const { name, userId } = route.params;
  const { t } = useLanguage();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{t.greeting(name)}</Text>
            <Text style={styles.subGreeting}>{t.subGreeting}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Dashboard', { name, userId })}>
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuTitle}>건강 대시보드</Text>
          <Text style={styles.menuDesc}>오늘의 건강 + AI 분석</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Health', { userId })}>
          <Text style={styles.menuIcon}>❤️</Text>
          <Text style={styles.menuTitle}>{t.healthRecord}</Text>
          <Text style={styles.menuDesc}>{t.healthDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Community', { userId })}>
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuTitle}>{t.community}</Text>
          <Text style={styles.menuDesc}>{t.communityDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AIChat')}>
          <Text style={styles.menuIcon}>🤖</Text>
          <Text style={styles.menuTitle}>{t.aiChat}</Text>
          <Text style={styles.menuDesc}>{t.aiChatDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('WeeklyReport', { name, userId })}>
          <Text style={styles.menuIcon}>📈</Text>
          <Text style={styles.menuTitle}>주간 리포트</Text>
          <Text style={styles.menuDesc}>7일 건강 AI 분석</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Settings', { name, userId })}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuTitle}>설정</Text>
          <Text style={styles.menuDesc}>프로필 · 언어 · 알림</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: '#B7E4C7',
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
    fontSize: 36,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
