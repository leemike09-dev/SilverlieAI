import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform, ActivityIndicator, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };

const C = {
  indigo:   '#5C6BC0',
  indigoLt: '#7986CB',
  bg:       '#F0F0F8',
  text:     '#16273E',
  sub:      '#7A90A8',
  line:     '#D1D5F0',
  red:      '#E53935',
};

const TERMS_TEXT = `Silver Life AI 서비스 이용약관

제1조 (목적)
본 약관은 Silver Life AI(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정합니다.

제2조 (서비스 이용)
본 서비스는 건강 정보 제공을 목적으로 하며, 의료 진단·처방을 대체하지 않습니다. 긴급 상황 시 반드시 119 또는 의료기관에 연락하십시오.

제3조 (개인정보)
수집된 건강 정보는 AI 상담 개선 목적으로만 사용되며, 제3자에게 제공하지 않습니다.

제4조 (면책)
AI 답변은 참고용이며 전문 의료 상담을 대체하지 않습니다.

문의: support@silverlieai.com`;

export default function SettingsScreen({ route, navigation }: Props) {
  const { name: paramName = '회원', userId: paramUserId = '' } = route?.params ?? {};
  const insets = useSafeAreaInsets();

  const [userId,      setUserId]      = useState<string>(paramUserId);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [notifHealth, setNotifHealth] = useState(true);
  const [notifMed,    setNotifMed]    = useState(true);
  const [ttsEnabled,  setTtsEnabled]  = useState(true);
  const [termsModal,  setTermsModal]  = useState(false);

  const isGuest     = !userId || userId === 'guest';
  const displayName = userProfile?.name ?? paramName;

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('userId');
      if (stored) setUserId(stored);
      const nh  = await AsyncStorage.getItem('notif_health');
      const nm  = await AsyncStorage.getItem('notif_med');
      const tts = await AsyncStorage.getItem('tts_enabled');
      if (nh  !== null) setNotifHealth(nh === 'true');
      if (nm  !== null) setNotifMed(nm === 'true');
      if (tts !== null) setTtsEnabled(tts === 'true');
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId || isGuest) return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(data => { if (data?.id) setUserProfile(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleNotifHealth = async (val: boolean) => {
    setNotifHealth(val);
    await AsyncStorage.setItem('notif_health', String(val));
  };
  const toggleNotifMed = async (val: boolean) => {
    setNotifMed(val);
    await AsyncStorage.setItem('notif_med', String(val));
  };
  const toggleTts = async (val: boolean) => {
    setTtsEnabled(val);
    await AsyncStorage.setItem('tts_enabled', String(val));
  };

  const handlePasswordChange = () => {
    if (Platform.OS === 'web') {
      window.alert('이메일 로그인 사용자만 변경 가능합니다.\n로그인 화면에서 비밀번호 재설정을 이용해 주세요.');
    } else {
      Alert.alert(
        '비밀번호 변경',
        '이메일 로그인 사용자만 변경 가능합니다.\n로그인 화면에서 비밀번호 재설정을 이용해 주세요.',
        [{ text: '확인' }]
      );
    }
  };

  const handleLogout = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('로그아웃 하시겠습니까?')
      : await new Promise(resolve =>
          Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel', onPress: () => resolve(false) },
            { text: '로그아웃', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    await AsyncStorage.multiRemove(['userId', 'userName', 'family_members',
      'ai_greeting_date', 'ai_greeting_cache', 'tts_greeting_date']);
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* 프로필 헤더 */}
        <View style={[s.profileHeader, { paddingTop: Math.max(insets.top + 14, 28) }]}>
          <View style={s.avatarWrap}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.avatarText}>{isGuest ? '👤' : '👤'}</Text>
            }
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{isGuest ? '게스트' : `${displayName} 님`}</Text>
            <Text style={s.profileMeta}>
              {isGuest ? '로그인 없이 이용 중' : '오늘도 건강한 하루 되세요'}
            </Text>
            {isGuest && (
              <View style={s.loginRow}>
                <TouchableOpacity style={s.loginBtn}
                  onPress={() => navigation.navigate('Login')}>
                  <Text style={s.loginBtnTxt}>로그인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.signupBtn}
                  onPress={() => navigation.navigate('Login')}>
                  <Text style={s.signupBtnTxt}>회원가입</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 내 정보 — 게스트엔 숨김 */}
        {!isGuest && (
          <>
            <Text style={s.sectionTitle}>내 정보</Text>
            <View style={s.listBlock}>
              <TouchableOpacity style={s.listItem}
                onPress={() => navigation.navigate('Profile', { userId, name: displayName })}>
                <Text style={s.listIcon}>👤</Text>
                <Text style={s.listLabel}>내 프로필</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.listItem}
                onPress={() => navigation.navigate('ImportantContacts', { userId })}>
                <Text style={s.listIcon}>📞</Text>
                <Text style={s.listLabel}>중요 연락처</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.listItem}
                onPress={() => navigation.navigate('HealthProfile', { userId })}>
                <Text style={s.listIcon}>🏥</Text>
                <Text style={s.listLabel}>건강 프로필</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.listItem, s.listItemLast]}
                onPress={() => navigation.navigate('DoctorMemo', { userId })}>
                <Text style={s.listIcon}>📋</Text>
                <Text style={s.listLabel}>의사 전달 메모</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 알림 설정 */}
        <Text style={s.sectionTitle}>알림 설정</Text>
        <View style={s.listBlock}>
          <View style={s.listItem}>
            <Text style={s.listIcon}>🔔</Text>
            <Text style={s.listLabel}>건강 알림</Text>
            <Switch value={notifHealth} onValueChange={toggleNotifHealth}
              trackColor={{ false: '#C5C9E8', true: C.indigoLt }} thumbColor="#fff" />
          </View>
          <View style={[s.listItem, s.listItemLast]}>
            <Text style={s.listIcon}>💊</Text>
            <Text style={s.listLabel}>약복용 알림</Text>
            <Switch value={notifMed} onValueChange={toggleNotifMed}
              trackColor={{ false: '#C5C9E8', true: C.indigoLt }} thumbColor="#fff" />
          </View>
        </View>

        {/* 음성 설정 */}
        <Text style={s.sectionTitle}>음성 설정</Text>
        <View style={s.listBlock}>
          <View style={[s.listItem, s.listItemLast]}>
            <Text style={s.listIcon}>🔊</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.listLabel}>꿀비 음성 응답</Text>
              <Text style={s.listSub}>AI 답변에 🔊 버튼 표시</Text>
            </View>
            <Switch value={ttsEnabled} onValueChange={toggleTts}
              trackColor={{ false: '#C5C9E8', true: C.indigoLt }} thumbColor="#fff" />
          </View>
        </View>

        {/* 기타 */}
        <Text style={s.sectionTitle}>기타</Text>
        <View style={s.listBlock}>
          {!isGuest && (
            <TouchableOpacity style={s.listItem} onPress={handlePasswordChange}>
              <Text style={s.listIcon}>🔐</Text>
              <Text style={s.listLabel}>비밀번호 변경</Text>
              <Text style={s.listArrow}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.listItem}
            onPress={() => navigation.navigate('FAQ', { userId })}>
            <Text style={s.listIcon}>❓</Text>
            <Text style={s.listLabel}>도움말 / FAQ</Text>
            <Text style={s.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.listItem} onPress={() => setTermsModal(true)}>
            <Text style={s.listIcon}>📄</Text>
            <Text style={s.listLabel}>서비스 이용약관</Text>
            <Text style={s.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.listItem, s.listItemLast]} onPress={handleLogout}>
            <Text style={s.listIcon}>🚪</Text>
            <Text style={[s.listLabel, { color: C.red }]}>
              {isGuest ? '처음으로 돌아가기' : '로그아웃'}
            </Text>
            <Text style={[s.listArrow, { color: C.red }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.versionText}>Silver Life AI v0.1.0</Text>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab=""
        userId={userId} name={displayName} />

      {/* 이용약관 모달 */}
      <Modal visible={termsModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>서비스 이용약관</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={s.modalBody}>{TERMS_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setTermsModal(false)}>
              <Text style={s.modalCloseTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  profileHeader: {
    backgroundColor: '#5C6BC0',
    paddingBottom: 28, paddingHorizontal: 22,
    flexDirection: 'row', alignItems: 'center', gap: 18,
  },
  avatarWrap:  { width: 76, height: 76, borderRadius: 38,
                 backgroundColor: 'rgba(255,255,255,0.2)',
                 borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
                 justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 38 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  profileMeta: { fontSize: 18, color: 'rgba(255,255,255,0.85)', marginBottom: 10 },
  loginRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  loginBtn:    { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  loginBtnTxt: { fontSize: 18, fontWeight: '700', color: '#5C6BC0' },
  signupBtn:   { borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 20,
                 paddingVertical: 8, paddingHorizontal: 20 },
  signupBtnTxt:{ fontSize: 18, fontWeight: '700', color: '#fff' },

  sectionTitle: { fontSize: 16, color: '#7A90A8', fontWeight: '700',
                  paddingHorizontal: 18, paddingTop: 22, paddingBottom: 8, letterSpacing: 0.5 },

  listBlock:    { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 14,
                  overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5F0' },
  listItem:     { flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 18, paddingVertical: 17,
                  borderBottomWidth: 1, borderBottomColor: '#ECEDF8' },
  listItemLast: { borderBottomWidth: 0 },
  listIcon:     { fontSize: 26, width: 34, textAlign: 'center' },
  listLabel:    { fontSize: 20, fontWeight: '600', color: '#16273E' },
  listSub:      { fontSize: 14, color: '#90A4AE', marginTop: 2 },
  listArrow:    { fontSize: 24, color: '#C5C9E8' },

  versionText: { textAlign: 'center', color: '#C5C9E8', fontSize: 16, marginTop: 24, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  padding: 28, paddingBottom: 40 },
  modalTitle:   { fontSize: 24, fontWeight: '900', color: '#16273E', marginBottom: 16, textAlign: 'center' },
  modalBody:    { fontSize: 16, color: '#546E7A', lineHeight: 26 },
  modalClose:   { marginTop: 20, backgroundColor: '#5C6BC0', borderRadius: 16,
                  paddingVertical: 16, alignItems: 'center' },
  modalCloseTxt:{ fontSize: 20, fontWeight: '800', color: '#fff' },
});
