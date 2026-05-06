import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Modal, TextInput, Share,
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
  green:    '#2E7D32',
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

  const [userId,          setUserId]          = useState<string>(paramUserId);
  const [userProfile,     setUserProfile]     = useState<any>(null);
  const [loading,         setLoading]         = useState(false);
  const [notifHealth,     setNotifHealth]     = useState(true);
  const [notifMed,        setNotifMed]        = useState(true);
  const [ttsEnabled,      setTtsEnabled]      = useState(true);
  const [termsModal,      setTermsModal]      = useState(false);
  // 가족 초대 코드 (내가 시니어일 때)
  const [inviteCode,      setInviteCode]      = useState('');
  const [linkedFamilies,  setLinkedFamilies]  = useState<any[]>([]);
  // 코드 입력 (내가 가족으로 등록할 때)
  const [codeInput,       setCodeInput]       = useState('');
  const [connectLoading,  setConnectLoading]  = useState(false);
  const [connectResult,   setConnectResult]   = useState('');
  const [connectedSeniors,setConnectedSeniors]= useState<any[]>([]);

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

    // 내 초대 코드 및 연결된 가족 로드
    fetch(`${API_URL}/family/mycode/${userId}`)
      .then(r => r.json())
      .then(data => { if (data.code) setInviteCode(data.code); })
      .catch(() => {});

    fetch(`${API_URL}/family/links/${userId}`)
      .then(r => r.json())
      .then(data => {
        const asSenior = data.as_senior || [];
        const asFamily = data.as_family || [];
        setLinkedFamilies(asSenior);
        setConnectedSeniors(asFamily);
        // GuardianScreen에서 읽을 수 있도록 AsyncStorage 동기화
        const members = asSenior.map((l: any) => ({
          name: l.family_name || '가족',
          relation: l.relation || '가족',
          verified: true,
        }));
        AsyncStorage.setItem('family_members', JSON.stringify(members)).catch(() => {});
      })
      .catch(() => {});
  }, [userId]);

  const handleShareCode = async () => {
    if (!inviteCode) return;
    await Share.share({
      message: `Silver Life AI 가족 초대 코드: ${inviteCode}\n앱 설정 → 가족으로 등록하기에서 코드를 입력하세요.`,
      title: '가족 초대 코드',
    });
  };

  const handleConnect = async () => {
    if (!codeInput.trim()) {
      Alert.alert('알림', '초대 코드를 입력해 주세요.');
      return;
    }
    if (isGuest) {
      Alert.alert('알림', '로그인 후 이용할 수 있습니다.');
      return;
    }
    setConnectLoading(true);
    setConnectResult('');
    try {
      const res = await fetch(`${API_URL}/family/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myUserId: userId, code: codeInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setConnectResult(`✓ ${data.name || '가족'}님과 연결되었습니다`);
        setCodeInput('');
        // 연결된 시니어 목록 새로고침
        fetch(`${API_URL}/family/links/${userId}`)
          .then(r => r.json())
          .then(d => { setConnectedSeniors(d.as_family || []); })
          .catch(() => {});
      } else {
        Alert.alert('오류', data.detail || '코드가 유효하지 않습니다.');
      }
    } catch {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setConnectLoading(false);
    }
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

        {/* 가족 연결 */}
        {!isGuest && (
          <>
            <Text style={s.sectionTitle}>가족 연결</Text>

            {/* 내 초대 코드 카드 */}
            <View style={s.familyCard}>
              <View style={s.familyNotice}>
                <Text style={s.familyNoticeIcon}>ℹ️</Text>
                <Text style={s.familyNoticeText}>
                  연결된 가족은 건강 수치·병원 일정·동선 등을 열람할 수 있습니다. (상담 내용 제외)
                </Text>
              </View>

              <Text style={s.familySubTitle}>내 초대 코드</Text>
              <Text style={s.familyHint}>이 코드를 가족에게 전달하세요. 가족이 코드를 입력하면 자동으로 연결됩니다.</Text>

              {inviteCode ? (
                <View style={s.codeBox}>
                  <Text style={s.codeText}>{inviteCode}</Text>
                  <TouchableOpacity style={s.shareCodeBtn} onPress={handleShareCode} activeOpacity={0.8}>
                    <Text style={s.shareCodeBtnTxt}>공유하기 📤</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ActivityIndicator color={C.indigo} size="small" style={{ marginVertical: 8 }} />
              )}

              {linkedFamilies.length > 0 && (
                <>
                  <View style={s.familyDivider} />
                  <Text style={s.familySubTitle}>인증된 가족 {linkedFamilies.length}명</Text>
                  {linkedFamilies.map((m: any, i: number) => (
                    <View key={i} style={[s.verifiedRow, i === linkedFamilies.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={s.verifiedName}>{m.family_name || '가족'}</Text>
                      {m.relation ? <Text style={s.verifiedRelation}>{m.relation}</Text> : null}
                      <View style={s.verifiedBadge}>
                        <Text style={s.verifiedBadgeTxt}>✓ 인증</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* 가족으로 등록하기 카드 */}
            <View style={s.familyCard}>
              <Text style={s.familySubTitle}>가족으로 등록하기</Text>
              <Text style={s.familyHint}>다른 분의 초대 코드를 받았다면 입력하세요.</Text>
              <View style={s.codeInputRow}>
                <TextInput
                  style={s.codeInputField}
                  placeholder="예: ABC-1234"
                  placeholderTextColor="#bdbdbd"
                  value={codeInput}
                  onChangeText={t => setCodeInput(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TouchableOpacity
                  style={[s.connectBtn, (!codeInput.trim() || connectLoading) && { opacity: 0.5 }]}
                  onPress={handleConnect}
                  disabled={!codeInput.trim() || connectLoading}
                  activeOpacity={0.8}
                >
                  {connectLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.connectBtnTxt}>연결</Text>
                  }
                </TouchableOpacity>
              </View>
              {connectResult ? <Text style={s.connectResult}>{connectResult}</Text> : null}

              {connectedSeniors.length > 0 && (
                <>
                  <View style={s.familyDivider} />
                  <Text style={s.familySubTitle}>연결된 분</Text>
                  {connectedSeniors.map((m: any, i: number) => (
                    <View key={i} style={[s.verifiedRow, i === connectedSeniors.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={s.verifiedName}>{m.senior_name || '어르신'}</Text>
                      <View style={s.verifiedBadge}>
                        <Text style={s.verifiedBadgeTxt}>✓ 연결됨</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
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

        <Text style={s.agreeText}>
          로그인 시{' '}
          <Text style={s.agreeLink} onPress={() => setTermsModal(true)}>서비스 이용약관</Text>
          {' '}및 개인정보 처리방침에{'\n'}동의한 것으로 간주됩니다.
        </Text>
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

  // 가족 연결
  familyCard:       { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line,
                      backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, marginTop: -1 },
  familyNotice:     { flexDirection: 'row', gap: 10, backgroundColor: '#F3F6FF',
                      borderRadius: 10, padding: 12, marginBottom: 16 },
  familyNoticeIcon: { fontSize: 16 },
  familyNoticeText: { flex: 1, fontSize: 13, color: C.indigo, lineHeight: 20 },
  familySubTitle:   { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  familyHint:       { fontSize: 13, color: C.sub, marginBottom: 14, lineHeight: 18 },
  familyDivider:    { height: 1, backgroundColor: C.line, marginVertical: 16 },

  codeBox:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: '#F3F6FF', borderRadius: 12, padding: 16 },
  codeText:         { fontSize: 24, fontWeight: '900', color: C.indigo, letterSpacing: 2 },
  shareCodeBtn:     { backgroundColor: C.indigo, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  shareCodeBtnTxt:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  verifiedRow:      { flexDirection: 'row', alignItems: 'center', gap: 8,
                      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  verifiedName:     { fontSize: 16, fontWeight: '700', color: C.text, flex: 1 },
  verifiedRelation: { fontSize: 14, color: C.sub },
  verifiedBadge:    { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedBadgeTxt: { fontSize: 12, color: C.green, fontWeight: '700' },

  codeInputRow:     { flexDirection: 'row', gap: 10, alignItems: 'center' },
  codeInputField:   { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10,
                      paddingHorizontal: 14, paddingVertical: 12, fontSize: 17,
                      color: C.text, fontWeight: '700', letterSpacing: 1 },
  connectBtn:       { backgroundColor: C.indigo, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  connectBtnTxt:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  connectResult:    { fontSize: 14, color: C.green, marginTop: 10, fontWeight: '600' },

  agreeText:   { textAlign: 'center', color: C.sub, fontSize: 12, lineHeight: 18, marginTop: 24, marginHorizontal: 20 },
  agreeLink:   { color: C.indigo, textDecorationLine: 'underline' },
  versionText: { textAlign: 'center', color: '#C5C9E8', fontSize: 13, marginTop: 8, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  padding: 28, paddingBottom: 40 },
  modalTitle:   { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 16, textAlign: 'center' },
  modalBody:    { fontSize: 15, color: '#546E7A', lineHeight: 24 },
  modalClose:   { marginTop: 20, backgroundColor: C.indigo, borderRadius: 16,
                  paddingVertical: 14, alignItems: 'center' },
  modalCloseTxt:{ fontSize: 18, fontWeight: '800', color: '#fff' },
});
