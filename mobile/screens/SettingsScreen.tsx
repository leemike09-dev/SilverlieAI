import React, { useState } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Switch, Alert,
} from 'react-native';
import { Platform } from 'react-native';

type Props = { route: any; navigation: any };

const LANGUAGES = ['한국어', '中文', 'English', '日本語'];

export default function SettingsScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [notifOn, setNotifOn]   = useState(true);
  const [langIdx, setLangIdx]   = useState(0);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => {} },
    ]);
  };

  const cycleLang = () => setLangIdx(i => (i + 1) % LANGUAGES.length);

  return (
    <View style={[styles.safe, {flex:1}]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ─── 프로필 헤더 ─── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name} 님</Text>
            <Text style={styles.profileMeta}>68세 · 서울 · 건강점수 82점</Text>
            <View style={styles.tagRow}>
              {['🚶 걷기', '🏌️ 골프', '🍳 요리'].map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ─── 건강 현황 ─── */}
        <Text style={styles.sectionTitle}>건강 현황</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem}
            onPress={() => navigation.navigate('Health', { name, userId })}>
            <Text style={styles.listIcon}>🚶</Text>
            <Text style={styles.listLabel}>오늘 걸음수</Text>
            <Text style={[styles.listValue, { color: '#1565c0', fontWeight: '700' }]}>6,240보</Text>
          </TouchableOpacity>
          <View style={[styles.listItem, styles.listItemLast]}>
            <Text style={styles.listIcon}>💗</Text>
            <Text style={styles.listLabel}>혈압</Text>
            <Text style={styles.listValue}>118/78</Text>
          </View>
        </View>

        {/* ─── 계정 설정 ─── */}
        <Text style={styles.sectionTitle}>계정 설정</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>✏️</Text>
            <Text style={styles.listLabel}>프로필 수정</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem} onPress={cycleLang}>
            <Text style={styles.listIcon}>🌐</Text>
            <Text style={styles.listLabel}>언어 설정</Text>
            <Text style={styles.listValue}>{LANGUAGES[langIdx]}</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.listItem}>
            <Text style={styles.listIcon}>🔔</Text>
            <Text style={styles.listLabel}>건강 알림</Text>
            <Switch
              value={notifOn}
              onValueChange={setNotifOn}
              trackColor={{ false: '#e0e0e0', true: '#1565c0' }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={[styles.listItem, styles.listItemLast]}
            onPress={() => navigation.navigate('Wearable', { name, userId })}>
            <Text style={styles.listIcon}>⌚</Text>
            <Text style={styles.listLabel}>웨어러블 연결</Text>
            <Text style={[styles.listValue, { color: '#43a047', fontWeight: '700' }]}>연결됨</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 기타 ─── */}
        <Text style={styles.sectionTitle}>기타</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>🔐</Text>
            <Text style={styles.listLabel}>보안 / 비밀번호</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>❓</Text>
            <Text style={styles.listLabel}>도움말 / FAQ</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.listItem, styles.listItemLast]} onPress={handleLogout}>
            <Text style={styles.listIcon}>🚪</Text>
            <Text style={[styles.listLabel, { color: '#ef5350' }]}>로그아웃</Text>
            <Text style={[styles.listArrow, { color: '#ef5350' }]}>›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    
      <SeniorTabBar navigation={navigation} activeTab="info" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  /* 프로필 헤더 */
  profileHeader: {
    backgroundColor: '#fff', padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderBottomWidth: 1, borderBottomColor: '#eef2f7',
  },
  avatarWrap: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#1565c0',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:   { fontSize: 36 },
  profileInfo:  { flex: 1 },
  profileName:  { fontSize: 20, fontWeight: '800', color: '#263238', marginBottom: 4 },
  profileMeta:  { fontSize: 12, color: '#78909c', marginBottom: 10 },
  tagRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag:          { backgroundColor: '#e3f2fd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:      { fontSize: 11, fontWeight: '700', color: '#1565c0' },

  /* 섹션 제목 */
  sectionTitle: {
    fontSize: 11, color: '#b0bec5', fontWeight: '700',
    paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 18 : (StatusBar.currentHeight ?? 28) + 4, paddingBottom: 6,
    letterSpacing: 1,
  },

  /* 리스트 블록 */
  listBlock: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eef2f7' },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#f5f7fa',
  },
  listItemLast: { borderBottomWidth: 0 },
  listIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  listLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#37474f' },
  listValue: { fontSize: 13, color: '#90a4ae' },
  listArrow: { fontSize: 18, color: '#cfd8dc' },
});
