import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView,
} from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

type Notification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

const DEMO_NOTIFS: Notification[] = [
  { id: '1', title: '오늘 걸음수 목표 달성! 🎉', body: '8,000보를 달성했습니다. 훌륭해요!', is_read: false, created_at: new Date().toISOString() },
  { id: '2', title: 'AI 건강 리포트 준비됨', body: '이번 주 건강 분석이 완료됐습니다.', is_read: false, created_at: new Date(Date.now()-3600000).toISOString() },
  { id: '3', title: '혈압 기록 알림', body: '오늘 혈압을 아직 기록하지 않으셨습니다.', is_read: true, created_at: new Date(Date.now()-86400000).toISOString() },
];

export default function NotificationsScreen({ navigation, route }: any) {
  const { userId = 'demo-user', name = '회원' } = route?.params ?? {};
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/notifications/${userId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setNotifications(data); })
      .catch(() => {});
  }, [userId]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff/60)}시간 전`;
    return `${Math.floor(diff/1440)}일 전`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🔔 알림</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>읽지 않은 알림 {unreadCount}개</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() =>
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
          }>
            <Text style={styles.allRead}>전체 읽음</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#4fc3f7" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          {notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={styles.emptyText}>알림이 없습니다</Text>
            </View>
          ) : (
            notifications.map(n => (
              <TouchableOpacity key={n.id}
                style={[styles.card, n.is_read && styles.cardRead]}
                onPress={() => markAsRead(n.id)} activeOpacity={0.8}>
                <View style={styles.cardLeft}>
                  {!n.is_read && <View style={styles.dot} />}
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, n.is_read && styles.cardTitleRead]}>
                    {n.title}
                  </Text>
                  {n.body ? <Text style={styles.cardDesc}>{n.body}</Text> : null}
                  <Text style={styles.cardDate}>{formatDate(n.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <BottomTabBar navigation={navigation} activeTab="none" userId={userId} name={name} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f0f2f7' },
  header: {
    backgroundColor: '#1a5fbc', paddingHorizontal: 20,
    paddingTop: 18, paddingBottom: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title:       { fontSize: 20, fontWeight: '800', color: '#fff' },
  unreadBadge: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  allRead:     { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600',
                 borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                 borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10,
    padding: 16, flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 2,
  },
  cardRead:      { opacity: 0.55 },
  cardLeft:      { width: 16, alignItems: 'center', paddingTop: 4 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a5fbc' },
  cardBody:      { flex: 1 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#263238', marginBottom: 4 },
  cardTitleRead: { fontWeight: '500', color: '#78909c' },
  cardDesc:      { fontSize: 12, color: '#546e7a', lineHeight: 18, marginBottom: 6 },
  cardDate:      { fontSize: 11, color: '#b0bec5' },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: '#90a4ae' },
});
