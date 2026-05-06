import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };

const C = {
  indigo:   '#5C6BC0',
  indigoLt: '#7986CB',
  bg:       '#fff',
  text:     '#16273E',
  sub:      '#7A90A8',
  line:     '#F0F0F0',
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

  const [userId,        setUserId]        = useState<string>(paramUserId);
  const [userProfile,   setUserProfile]   = useState<any>(null);
  const [loading,       setLoading]       = useState(false);
  const [notifHealth,   setNotifHealth]   = useState(true);
  const [notifMed,      setNotifMed]      = useState(true);
  const [ttsEnabled,    setTtsEnabled]    = useState(true);
  const [termsModal,    setTermsModal]    = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newName,       setNewName]       = useState('');
  const [newRelation,   setNewRelation]   = useState('');

  const isGuest     = !userId || userId === 'guest';
  const displayName = userProfile?.name ?? paramName;

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('userId');
      if (stored) setUserId(stored);
      const nh  = await AsyncStorage.getItem('notif_health');
      const nm  = await AsyncStorage.getItem('notif_med');
      const tts = await AsyncStorage.getItem('tts_enabled');
      const fm  = await AsyncStorage.getItem('family_members');
      if (nh  !== null) setNotifHealth(nh === 'true');
      if (nm  !== null) setNotifMed(nm === 'true');
      if (tts !== null) setTtsEnabled(tts === 'true');
      if (fm)           setFamilyMembers(JSON.parse(fm));
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

  const saveFamilyMembers = async (members: any[]) => {
    setFamilyMembers(members);
    await AsyncStorage.setItem('family_members', JSON.stringify(members));
  };

  const handleAddFamily = async () => {
    if (!newName.trim() || !newRelation.trim()) {
      Alert.alert('알림', '이름과 관계를 모두 입력해 주세요.');
      return;
    }
    const updated = [...familyMembers, { name: newName.trim(), relation: newRelation.trim() }];
    await saveFamilyMembers(updated);
    setNewName('');
    setNewRelation('');
    setShowAddFamily(false);
  };

  const handleRemoveFamily = (index: number) => {
    Alert.alert('가족 삭제', `${familyMembers[index].name}님을 삭제하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        const updated = familyMembers.filter((_, i) => i !== index);
        await saveFamilyMembers(updated);
      }},
    ]);
  };

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

  const handleDeleteAccount = async () => {
    const confirmed = await new Promise(resolve =>
      Alert.alert('회원탈퇴', '모든 건강기록, 약 정보, 대화 내용이 영구 삭제됩니다.\n정말 탈퇴하시겠습니까?', [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '탈퇴하기', style: 'destructive', onPress: () => resolve(true) },
      ])
    );
    if (!confirmed) return;
    try { await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' }); } catch {}
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
  };

  const handleLogout = async () => {
    const confirmed = await new Promise(resolve =>
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
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingTop: Math.max(insets.top + 20, 30) }]}>

        {/* 사용자 이름 */}
        {!isGuest ? (
          <View style={s.nameRow}>
            {loading
              ? <ActivityIndicator color={C.indigo} size="small" />
              : <Text style={s.nameText}>{displayName} 님</Text>
            }
            <Text style={s.nameSubText}>오늘도 건강한 하루 되세요</Text>
          </View>
        ) : (
          <View style={s.nameRow}>
            <Text style={s.nameText}>게스트</Text>
            <View style={s.guestBtns}>
              <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={s.loginBtnTxt}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.signupBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={s.signupBtnTxt}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 내 정보 */}
        {!isGuest && (
          <>
            <Text style={s.sectionTitle}>내 정보</Text>
            <View style={s.listBlock}>
              <TouchableOpacity style={s.listItem}
                onPress={() => navigation.navigate('Profile', { userId, name: displayName })}>
                <Text style={s.listIcon}>👤</Text>
                <Text style={s.listLabel}>내 프로필 보기 · 수정</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.listItem}
                onPress={() => navigation.navigate('HealthProfile', { userId })}>
                <Text style={s.listIcon}>🏥</Text>
                <Text style={s.listLabel}>건강 프로필</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.listItem, s.listItemLast]}
                onPress={() => navigation.navigate('ImportantContacts', { userId })}>
                <Text style={s.listIcon}>📞</Text>
                <Text style={s.listLabel}>중요 연락처</Text>
                <Text style={s.listArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 가족 등록 */}
        <Text style={s.sectionTitle}>가족 등록</Text>
        <View style={s.familyCard}>
          <View style={s.familyNotice}>
            <Text style={s.familyNoticeIcon}>ℹ️</Text>
            <Text style={s.familyNoticeText}>
              등록된 가족은 보호자 화면에서 건강 수치·병원 일정·동선 등 모든 기록을 열람할 수 있습니다. (상담 내용 제외)
            </Text>
          </View>

          {familyMembers.length > 0 && (
            <View style={s.memberList}>
              {familyMembers.map((m: any, i: number) => (
                <View key={i} style={s.memberRow}>
                  <Text style={s.memberName}>{m.name}</Text>
                  <Text style={s.memberRelation}>{m.relation}</Text>
                  <TouchableOpacity onPress={() => handleRemoveFamily(i)} style={s.memberDel}>
                    <Text style={s.memberDelTxt}>삭제</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showAddFamily ? (
            <View style={s.addForm}>
              <TextInput style={s.addInput} placeholder="이름" placeholderTextColor="#bdbdbd"
                value={newName} onChangeText={setNewName} />
              <TextInput style={s.addInput} placeholder="관계 (예: 아들, 딸)" placeholderTextColor="#bdbdbd"
                value={newRelation} onChangeText={setNewRelation} />
              <View style={s.addFormBtns}>
                <TouchableOpacity style={s.addConfirmBtn} onPress={handleAddFamily}>
                  <Text style={s.addConfirmTxt}>등록</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addCancelBtn} onPress={() => { setShowAddFamily(false); setNewName(''); setNewRelation(''); }}>
                  <Text style={s.addCancelTxt}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.addFamilyBtn} onPress={() => setShowAddFamily(true)}>
              <Text style={s.addFamilyBtnTxt}>+ 가족 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 알림 설정 */}
        <Text style={s.sectionTitle}>알림 설정</Text>
        <View style={s.listBlock}>
          <View style={s.listItem}>
            <Text style={s.listIcon}>🔔</Text>
            <Text style={s.listLabel}>건강 알림</Text>
            <Switch value={notifHealth} onValueChange={toggleNotifHealth}
              trackColor={{ false: '#D1D5F0', true: C.indigoLt }} thumbColor="#fff" />
          </View>
          <View style={[s.listItem, s.listItemLast]}>
            <Text style={s.listIcon}>💊</Text>
            <Text style={s.listLabel}>약복용 알림</Text>
            <Switch value={notifMed} onValueChange={toggleNotifMed}
              trackColor={{ false: '#D1D5F0', true: C.indigoLt }} thumbColor="#fff" />
          </View>
        </View>

        {/* 음성 설정 */}
        <Text style={s.sectionTitle}>음성 설정</Text>
        <View style={s.listBlock}>
          <View style={[s.listItem, s.listItemLast]}>
            <Text style={s.listIcon}>🔊</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.listLabel}>루미 음성 응답</Text>
              <Text style={s.listSub}>AI 답변에 🔊 버튼 표시</Text>
            </View>
            <Switch value={ttsEnabled} onValueChange={toggleTts}
              trackColor={{ false: '#D1D5F0', true: C.indigoLt }} thumbColor="#fff" />
          </View>
        </View>

        {/* 기타 */}
        <Text style={s.sectionTitle}>기타</Text>
        <View style={s.listBlock}>
          <TouchableOpacity style={s.listItem} onPress={() => setTermsModal(true)}>
            <Text style={s.listIcon}>📄</Text>
            <Text style={s.listLabel}>서비스 이용약관</Text>
            <Text style={s.listArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.listItem} onPress={handleLogout}>
            <Text style={s.listIcon}>🚪</Text>
            <Text style={[s.listLabel, { color: C.red }]}>
              {isGuest ? '처음으로 돌아가기' : '로그아웃'}
            </Text>
            <Text style={[s.listArrow, { color: C.red }]}>›</Text>
          </TouchableOpacity>
          {!isGuest && (
            <TouchableOpacity style={[s.listItem, s.listItemLast]} onPress={handleDeleteAccount}>
              <Text style={s.listIcon}>🗑️</Text>
              <Text style={[s.listLabel, { color: C.red, fontWeight: '700' }]}>회원탈퇴</Text>
              <Text style={[s.listArrow, { color: C.red }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.versionText}>Silver Life AI v0.1.0</Text>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={displayName} />

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
  root:          { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 100 },

  nameRow:      { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.line },
  nameText:     { fontSize: 24, fontWeight: '800', color: C.text },
  nameSubText:  { fontSize: 14, color: C.sub, marginTop: 4 },
  guestBtns:    { flexDirection: 'row', gap: 10, marginTop: 12 },
  loginBtn:     { backgroundColor: C.indigo, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  loginBtnTxt:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  signupBtn:    { borderWidth: 1.5, borderColor: C.indigo, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  signupBtnTxt: { fontSize: 16, fontWeight: '700', color: C.indigo },

  sectionTitle: { fontSize: 13, color: C.sub, fontWeight: '700',
                  paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, letterSpacing: 0.5 },

  listBlock:    { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  listItem:     { flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 20, paddingVertical: 16,
                  borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: '#fff' },
  listItemLast: { borderBottomWidth: 0 },
  listIcon:     { fontSize: 22, width: 30, textAlign: 'center' },
  listLabel:    { flex: 1, fontSize: 17, fontWeight: '500', color: C.text },
  listSub:      { fontSize: 13, color: C.sub, marginTop: 2 },
  listArrow:    { fontSize: 20, color: '#C5C9E8' },

  familyCard:    { marginHorizontal: 0, borderTopWidth: 1, borderBottomWidth: 1,
                   borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16 },
  familyNotice:  { flexDirection: 'row', gap: 10, backgroundColor: '#F3F6FF',
                   borderRadius: 10, padding: 12, marginBottom: 14 },
  familyNoticeIcon: { fontSize: 16 },
  familyNoticeText: { flex: 1, fontSize: 13, color: C.indigo, lineHeight: 20 },

  memberList:    { gap: 8, marginBottom: 12 },
  memberRow:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                   paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  memberName:    { fontSize: 16, fontWeight: '700', color: C.text, flex: 1 },
  memberRelation:{ fontSize: 14, color: C.sub },
  memberDel:     { paddingHorizontal: 10, paddingVertical: 4 },
  memberDelTxt:  { fontSize: 13, color: C.red },

  addFamilyBtn:  { borderWidth: 1.5, borderColor: C.indigo, borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center' },
  addFamilyBtnTxt: { fontSize: 16, fontWeight: '700', color: C.indigo },

  addForm:       { gap: 10 },
  addInput:      { borderWidth: 1, borderColor: C.line, borderRadius: 10,
                   paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: C.text },
  addFormBtns:   { flexDirection: 'row', gap: 10 },
  addConfirmBtn: { flex: 1, backgroundColor: C.indigo, borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center' },
  addConfirmTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  addCancelBtn:  { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center' },
  addCancelTxt:  { fontSize: 16, color: C.sub },

  versionText: { textAlign: 'center', color: '#C5C9E8', fontSize: 14, marginTop: 24, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  padding: 28, paddingBottom: 40 },
  modalTitle:   { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 16, textAlign: 'center' },
  modalBody:    { fontSize: 15, color: '#546E7A', lineHeight: 24 },
  modalClose:   { marginTop: 20, backgroundColor: C.indigo, borderRadius: 16,
                  paddingVertical: 14, alignItems: 'center' },
  modalCloseTxt:{ fontSize: 18, fontWeight: '800', color: '#fff' },
});
