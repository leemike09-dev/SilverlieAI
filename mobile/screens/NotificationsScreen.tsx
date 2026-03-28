import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

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
  const { t } = useLanguage();
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
    return date.toLocaleDateString();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.notificationsTitle}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2D6A4F" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <Text style={styles.emptyText}>{t.noNotifications}</Text>
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
            
      <BottomTabBar navigation={navigation} activeTab="home" userId={userId} />
    </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1B4332' },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 18,
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
    backgroundColor: '#2D6A4F',
    marginTop: 6,
    marginRight: 10,
  },
  textArea: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardTitleRead: { fontWeight: 'normal' },
  cardBody: { fontSize: 16, color: '#666', marginTop: 6, lineHeight: 24 },
  cardDate: { fontSize: 14, color: '#aaa', marginTop: 8 },
});
