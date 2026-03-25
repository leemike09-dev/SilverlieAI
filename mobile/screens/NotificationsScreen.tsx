import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';

type Notification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen({ navigation, route }: any) {
  const { userId } = route.params;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/notifications/${userId}`);
      const data = await response.json();
      setNotifications(data);
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔔 알림</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2e86ab" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <Text style={styles.emptyText}>알림이 없습니다.</Text>
      ) : (
        notifications.map(notification => (
          <TouchableOpacity
            key={notification.id}
            style={[styles.card, notification.is_read && styles.cardRead]}
            onPress={() => markAsRead(notification.id)}
          >
            <View style={styles.cardContent}>
              {!notification.is_read && <View style={styles.dot} />}
              <View style={styles.textArea}>
                <Text style={[styles.cardTitle, notification.is_read && styles.cardTitleRead]}>
                  {notification.title}
                </Text>
                {notification.body && (
                  <Text style={styles.cardBody}>{notification.body}</Text>
                )}
                <Text style={styles.cardDate}>{formatDate(notification.created_at)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  header: {
    backgroundColor: '#2e86ab',
    padding: 20,
    paddingTop: 60,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#cce8f4', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRead: { opacity: 0.6 },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e86ab',
    marginTop: 6,
    marginRight: 10,
  },
  textArea: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardTitleRead: { fontWeight: 'normal' },
  cardBody: { fontSize: 14, color: '#666', marginTop: 4 },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 6 },
});
