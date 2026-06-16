import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const API_URL    = 'https://silverlieai.onrender.com';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK        = '#0F1B2D';
const INK_SOFT   = '#3D4B62';
const INK_MUTE   = '#7E8AA1';
const BLUE       = '#3B82F6';
const RED        = '#E5453C';

type Notification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen({ navigation, route }: any) {
  const { userId: paramId = '', name = '회원' } = route?.params ?? {};
  const insets = useSafeAreaInsets();
  const [userId,        setUserId]        = useState(paramId);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const init = async () => {
      const uid = (await AsyncStorage.getItem('userId')) || paramId;
      if (uid) setUserId(uid);
      if (!uid) { setLoading(false); return; }
      try {
        const r = await fetch(`${API_URL}/notifications/${uid}`);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) setNotifications(data);
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      setLoading(false);
    };
    init();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const deleteOne = (id: string) => {
    Alert.alert('알림 삭제', '이 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => {
          setNotifications(prev => prev.filter(n => n.id !== id));
          fetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
        },
      },
    ]);
  };

  const deleteAll = () => {
    if (notifications.length === 0) return;
    Alert.alert('전체 삭제', '모든 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '전체 삭제', style: 'destructive',
        onPress: () => {
          setNotifications([]);
          fetch(`${API_URL}/notifications/all/${userId}`, { method: 'DELETE' }).catch(() => {});
        },
      },
    ]);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    notifications.filter(n => !n.is_read).forEach(n =>
      fetch(`${API_URL}/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={{ flex: 1 }}>
      {/* 헤더 */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color={INK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>알림</Text>
        <TouchableOpacity onPress={deleteAll} style={s.deleteAllBtn}>
          <Text style={s.deleteAllTxt}>전체 삭제</Text>
        </TouchableOpacity>
      </View>

      {unreadCount > 0 && (
        <View style={s.unreadBar}>
          <Text style={s.unreadText}>읽지 않은 알림 {unreadCount}개</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.allReadTxt}>전체 읽음</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {notifications.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>🔕</Text>
              <Text style={s.emptyTitle}>알림이 없습니다</Text>
            </View>
          ) : (
            notifications.map(n => (
              <View key={n.id} style={[s.card, n.is_read && s.cardRead]}>
                <TouchableOpacity
                  style={s.cardBody}
                  onPress={() => markAsRead(n.id)}
                  activeOpacity={0.8}>
                  {!n.is_read && <View style={s.dot} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, n.is_read && s.cardTitleRead]}>
                      {n.title}
                    </Text>
                    {n.body ? <Text style={s.cardDesc}>{n.body}</Text> : null}
                    <Text style={s.cardDate}>{formatDate(n.created_at)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteOne(n.id)} style={s.trashBtn}>
                  <Ionicons name="trash-outline" size={20} color={RED} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingBottom: 12,
    justifyContent: 'space-between',
  },
  backBtn:      { padding: 10, width: 48 },
  headerTitle:  { fontSize: 26, fontWeight: '900', color: INK },
  deleteAllBtn: { padding: 10, width: 72, alignItems: 'flex-end' },
  deleteAllTxt: { fontSize: 16, fontWeight: '700', color: RED },

  unreadBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 4,
  },
  unreadText: { fontSize: 15, fontWeight: '600', color: INK_SOFT },
  allReadTxt: { fontSize: 15, fontWeight: '700', color: BLUE },

  card: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },
  cardRead: { opacity: 0.55 },
  cardBody: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start',
    padding: 18, gap: 10,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: BLUE, marginTop: 6,
  },
  cardTitle:     { fontSize: 18, fontWeight: '700', color: INK, marginBottom: 4, lineHeight: 26 },
  cardTitleRead: { fontWeight: '500', color: INK_MUTE },
  cardDesc:      { fontSize: 16, color: INK_SOFT, lineHeight: 24, marginBottom: 6 },
  cardDate:      { fontSize: 14, color: INK_MUTE },

  trashBtn: {
    paddingHorizontal: 18, paddingVertical: 18,
    alignSelf: 'stretch', justifyContent: 'center',
  },

  emptyWrap:  { alignItems: 'center', marginTop: 100 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: INK_MUTE },
});
