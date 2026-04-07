import React, { useState } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Switch, Alert, Platform,
} from 'react-native';

type Props = { route: any; navigation: any };

const LANGUAGES = ['한국어', '中文', 'English', '日本語'];

const C = {
  blue1:   '#1A4A8A',
  blue2:   '#2272B8',
  blueMid: '#1A5FA0',
  blueCard:'#EBF3FB',
  bg:      '#F0F5FB',
  card:    '#FFFFFF',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#DDE8F4',
  red:     '#E53935',
};

export default function SettingsScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [notifOn, setNotifOn] = useState(true);
  const [langIdx, setLangIdx] = useState(0);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => {} },
    ]);
  };

  const cycleLang = () => setLangIdx(i => (i + 1) % LANGUAGES.length);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ─── 프로필 헤더 ─── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name} 님</Text>
            <Text style={styles.profileMeta}>68세 · 서울 · 건강점수 82점</Text>

          </View>
        </View>

        {/* ─── 건강 현황 ─── */}
        <Text style={styles.sectionTitle}>건강 현황</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem}
            onPress={() => navigation.navigate('Health', { name, userId })}>
            <Text style={styles.listIcon}>🚶</Text>
            <Text style={styles.listLabel}>오늘 걸음수</Text>
            <Text style={[styles.listValue, { color: C.blue1, fontWeight: '700' }]}>6,240보</Text>
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
          <View style={[styles.listItem, styles.listItemLast]}>
            <Text style={styles.listIcon}>🔔</Text>
            <Text style={styles.listLabel}>건강 알림</Text>
            <Switch
              value={notifOn}
              onValueChange={setNotifOn}
              trackColor={{ false: '#cdd8e8', true: C.blue2 }}
              thumbColor="#fff"
            />
          </View>
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
            <Text style={[styles.listLabel, { color: C.red }]}>로그아웃</Text>
            <Text style={[styles.listArrow, { color: C.red }]}>›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="info" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  /* 프로필 헤더 */
  profileHeader: {
    backgroundColor: '#1A4A8A',
    paddingTop: Platform.OS === 'web' ? 40 : 52,
    paddingBottom: 28,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  avatarWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:   { fontSize: 38 },
  profileInfo:  { flex: 1 },
  profileName:  { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  profileMeta:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 12 },


  /* 섹션 제목 */
  sectionTitle: {
    fontSize: 13, color: '#7A90A8', fontWeight: '700',
    paddingHorizontal: 18, paddingTop: 22, paddingBottom: 8,
    letterSpacing: 0.5,
  },

  /* 리스트 블록 */
  listBlock: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#DDE8F4',
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 17,
    borderBottomWidth: 1, borderBottomColor: '#EEF4FB',
  },
  listItemLast: { borderBottomWidth: 0 },
  listIcon:  { fontSize: 22, width: 30, textAlign: 'center' },
  listLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: '#16273E' },
  listValue: { fontSize: 15, color: '#7A90A8' },
  listArrow: { fontSize: 20, color: '#B8CCE0' },
});
