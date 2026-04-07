import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Switch, Alert, Platform, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

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

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  age?: number;
  language?: string;
}

export default function SettingsScreen({ route, navigation }: Props) {
  const { name: paramName = '회원', userId: paramUserId = 'demo-user' } = route?.params ?? {};

  const [userId,      setUserId]      = useState<string>(paramUserId);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [notifHealth, setNotifHealth] = useState(true);
  const [notifMed,    setNotifMed]    = useState(true);
  const [notifFamily, setNotifFamily] = useState(true);
  const [langIdx,     setLangIdx]     = useState(0);

  const isGuest = !userId || userId === 'demo-user';
  const displayName = userProfile?.name ?? paramName;

  useEffect(() => {
    // AsyncStorage에서 userId 로드 (로그인 후 params가 없을 경우 대비)
    AsyncStorage.getItem('userId').then(stored => {
      if (stored && stored !== 'demo-user') setUserId(stored);
    });
  }, []);

  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(data => { if (data?.id) setUserProfile(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('userName');
          navigation.replace('SeniorHome', { name: '홍길동', userId: 'demo-user' });
        },
      },
    ]);
  };

  const cycleLang = () => setLangIdx(i => (i + 1) % LANGUAGES.length);

  const ageLine = userProfile?.age
    ? `${userProfile.age}세` + (userProfile.email ? `  ·  ${userProfile.email}` : '')
    : isGuest ? '게스트 모드' : '프로필을 완성해주세요';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ─── 프로필 헤더 ─── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.avatarText}>👤</Text>
            }
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName} 님</Text>
            <Text style={styles.profileMeta}>{ageLine}</Text>
            {isGuest && (
              <View style={styles.loginRow}>
                <TouchableOpacity style={styles.loginBtn}
                  onPress={() => navigation.navigate('Login', { tab: 'login' })}>
                  <Text style={styles.loginBtnTxt}>로그인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signupBtn}
                  onPress={() => navigation.navigate('Login', { tab: 'signup' })}>
                  <Text style={styles.signupBtnTxt}>회원가입</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ─── 내 정보 ─── */}
        <Text style={styles.sectionTitle}>내 정보</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem}
            onPress={() => navigation.navigate('Health', { name: displayName, userId })}>
            <Text style={styles.listIcon}>🚶</Text>
            <Text style={styles.listLabel}>오늘 걸음수</Text>
            <Text style={[styles.listValue, { color: C.blue1, fontWeight: '700' }]}>6,240보</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}
            onPress={() => navigation.navigate('Health', { name: displayName, userId })}>
            <Text style={styles.listIcon}>💗</Text>
            <Text style={styles.listLabel}>최근 혈압</Text>
            <Text style={styles.listValue}>118/78</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.listItem, styles.listItemLast]}
            onPress={() => navigation.navigate('Profile', { userId, name: displayName })}>
            <Text style={styles.listIcon}>👤</Text>
            <Text style={styles.listLabel}>내 프로필</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 알림 설정 ─── */}
        <Text style={styles.sectionTitle}>알림 설정</Text>
        <View style={styles.listBlock}>
          <View style={styles.listItem}>
            <Text style={styles.listIcon}>🔔</Text>
            <Text style={styles.listLabel}>건강 알림</Text>
            <Switch
              value={notifHealth}
              onValueChange={setNotifHealth}
              trackColor={{ false: '#cdd8e8', true: C.blue2 }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listIcon}>💊</Text>
            <Text style={styles.listLabel}>약복용 알림</Text>
            <Switch
              value={notifMed}
              onValueChange={setNotifMed}
              trackColor={{ false: '#cdd8e8', true: C.blue2 }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.listItem, styles.listItemLast]}>
            <Text style={styles.listIcon}>👨‍👩‍👧</Text>
            <Text style={styles.listLabel}>가족 안심 알림</Text>
            <Switch
              value={notifFamily}
              onValueChange={setNotifFamily}
              trackColor={{ false: '#cdd8e8', true: C.blue2 }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ─── 앱 설정 ─── */}
        <Text style={styles.sectionTitle}>앱 설정</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem} onPress={cycleLang}>
            <Text style={styles.listIcon}>🌐</Text>
            <Text style={styles.listLabel}>언어 설정</Text>
            <Text style={styles.listValue}>{LANGUAGES[langIdx]}</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.listItem, styles.listItemLast]}>
            <Text style={styles.listIcon}>🔤</Text>
            <Text style={styles.listLabel}>글자 크기</Text>
            <Text style={styles.listValue}>크게</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 보안 / 기타 ─── */}
        <Text style={styles.sectionTitle}>보안 · 기타</Text>
        <View style={styles.listBlock}>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>🔐</Text>
            <Text style={styles.listLabel}>비밀번호 변경</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>❓</Text>
            <Text style={styles.listLabel}>도움말 / FAQ</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listIcon}>📋</Text>
            <Text style={styles.listLabel}>서비스 이용약관</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.listItem, styles.listItemLast]} onPress={handleLogout}>
            <Text style={styles.listIcon}>🚪</Text>
            <Text style={[styles.listLabel, { color: C.red }]}>로그아웃</Text>
            <Text style={[styles.listArrow, { color: C.red }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Silver Life AI v0.1.0</Text>

      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="info" userId={userId} name={displayName} />
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
  loginRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  loginBtn:     { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  loginBtnTxt:  { fontSize: 15, fontWeight: '700', color: '#1A4A8A' },
  signupBtn:    { borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  signupBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

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

  versionText: {
    textAlign: 'center',
    color: '#B8CCE0',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 8,
  },
});
