import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Modal, TextInput, Share, KeyboardAvoidingView, Platform,
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

const PRIVACY_TEXT = `개인정보 처리방침
최종 수정일: 2025년 5월 6일

Silver Life AI(이하 "서비스")는 개인정보보호법 및 관련 법령을 준수하며, 이용자의 개인정보를 소중히 보호합니다.

━━━━━━━━━━━━━━━━━━━━━━
1. 수집하는 개인정보
━━━━━━━━━━━━━━━━━━━━━━
[필수 항목]
· 이름, 이메일 주소, 전화번호
· 서비스 이용 기록, 접속 로그

[건강 민감정보 (이용자 직접 입력)]
· 나이, 성별, 키, 체중
· 혈압, 혈당, 심박수 측정값
· 복용 약물명 및 복약 이력
· 기저질환, 알레르기 정보
· 병원 예약 및 진료 기록
· GPS 위치 정보 및 이동 동선
· AI 상담 대화 내용

━━━━━━━━━━━━━━━━━━━━━━
2. 수집 및 이용 목적
━━━━━━━━━━━━━━━━━━━━━━
· 맞춤형 건강 관리 서비스 제공
· AI 상담 서비스 운영 및 품질 개선
· 가족 연결 기능을 통한 건강 정보 공유
· 복약 알림 및 병원 일정 알림 발송
· 이상 징후 감지 및 보호자 알림
· 서비스 부정 이용 방지

━━━━━━━━━━━━━━━━━━━━━━
3. 개인정보 보유 및 파기
━━━━━━━━━━━━━━━━━━━━━━
· 회원 탈퇴 시 모든 개인정보 즉시 영구 삭제
· 건강 기록, 복약 이력, AI 상담 내용은 복구 불가능한 방식으로 파기
· 관련 법령에 따라 일부 정보는 의무 보관 후 파기
  - 계약·청약철회 기록: 5년 (전자상거래법)
  - 소비자 분쟁 처리 기록: 3년 (전자상거래법)

━━━━━━━━━━━━━━━━━━━━━━
4. 제3자 제공
━━━━━━━━━━━━━━━━━━━━━━
수집된 개인정보는 다음 경우를 제외하고 외부에 제공하지 않습니다.
· 이용자가 가족 초대 코드로 직접 동의한 가족에게 건강 정보 공유
· 법령에 의거한 수사기관 요청 시

━━━━━━━━━━━━━━━━━━━━━━
5. 위탁 처리
━━━━━━━━━━━━━━━━━━━━━━
· AI 서비스: Anthropic (Claude AI 엔진)
· 데이터베이스: Supabase (암호화 저장)
· 서버 호스팅: Render.com
위탁 업체들은 서비스 목적 외 개인정보를 이용할 수 없습니다.

━━━━━━━━━━━━━━━━━━━━━━
6. 이용자의 권리
━━━━━━━━━━━━━━━━━━━━━━
이용자는 언제든지 다음 권리를 행사할 수 있습니다.
· 개인정보 열람 요청
· 오류 정정 요청
· 삭제 요청 (회원 탈퇴)
· 처리 정지 요청

━━━━━━━━━━━━━━━━━━━━━━
7. 개인정보 보호책임자
━━━━━━━━━━━━━━━━━━━━━━
문의: support@silverlieai.com`;

const TERMS_TEXT = `Silver Life AI 서비스 이용약관
최종 수정일: 2025년 5월 6일

━━━━━━━━━━━━━━━━━━━━━━
제1조 (목적)
━━━━━━━━━━━━━━━━━━━━━━
본 약관은 Silver Life AI(이하 "서비스")가 제공하는 시니어 건강 관리 서비스의 이용 조건 및 절차, 이용자와 회사 간의 권리·의무 사항을 규정함을 목적으로 합니다.

━━━━━━━━━━━━━━━━━━━━━━
제2조 (의료 면책 조항)
━━━━━━━━━━━━━━━━━━━━━━
① 본 서비스의 AI 답변 및 건강 정보는 참고용이며, 의료법에 따른 의료 행위(진단·처방·치료)를 대체하지 않습니다.

② 이용자는 건강 이상 증상이 있을 경우 반드시 전문 의료기관 또는 의사와 상담하여야 합니다.

③ 응급 상황 발생 시 즉시 119에 신고하거나 가까운 응급실을 이용하십시오. 서비스의 AI 상담은 응급 대응 수단이 아닙니다.

④ 서비스는 AI 답변의 정확성·완전성을 보증하지 않으며, 이를 근거로 한 의료적 판단에 대해 법적 책임을 지지 않습니다.

━━━━━━━━━━━━━━━━━━━━━━
제3조 (건강정보 수집 및 이용)
━━━━━━━━━━━━━━━━━━━━━━
① 서비스는 다음의 민감한 건강 정보를 수집합니다.
  · 혈압, 혈당, 심박수, 체중 등 생체 측정값
  · 복용 약물명, 복용 시간, 복약 이력
  · 병원 예약 및 진료 정보
  · GPS 기반 위치 정보 및 이동 동선
  · AI 상담 대화 내용

② 수집된 건강 정보는 다음 목적으로만 사용됩니다.
  · 개인 맞춤형 건강 관리 서비스 제공
  · AI 답변 품질 개선
  · 보호자(가족) 연결 기능을 통한 공유 (이용자 동의 시)

③ 이용자는 본 서비스 이용 시 위 건강 정보의 수집·이용에 동의한 것으로 간주됩니다.

━━━━━━━━━━━━━━━━━━━━━━
제4조 (개인정보 보유 및 파기)
━━━━━━━━━━━━━━━━━━━━━━
① 개인정보는 회원 탈퇴 시 지체 없이 파기됩니다. 단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.

② 건강 기록, 복약 이력, 대화 내용은 탈퇴 즉시 복구 불가능한 방식으로 영구 삭제됩니다.

③ 전자상거래법에 따라 계약·청약철회 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년간 보관됩니다.

━━━━━━━━━━━━━━━━━━━━━━
제5조 (가족 연결 및 정보 공유)
━━━━━━━━━━━━━━━━━━━━━━
① 이용자가 초대 코드를 통해 가족을 등록하는 경우, 등록된 가족은 다음 정보를 열람할 수 있습니다.
  · 건강 수치 기록 (혈압, 혈당, 걸음수 등)
  · 병원 예약 및 복약 현황
  · GPS 동선 정보

② AI 상담 대화 내용은 가족에게 공개되지 않습니다.

③ 이용자는 가족 연결을 언제든지 해제할 수 있으며, 해제 즉시 해당 가족의 열람 권한이 소멸됩니다.

━━━━━━━━━━━━━━━━━━━━━━
제6조 (이용 자격)
━━━━━━━━━━━━━━━━━━━━━━
① 본 서비스는 만 14세 이상만 이용할 수 있습니다.

② 만 14세 미만의 경우 법정 대리인의 동의가 필요하며, 서비스 이용이 확인되는 경우 계정이 삭제될 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━
제7조 (서비스 변경 및 약관 개정)
━━━━━━━━━━━━━━━━━━━━━━
본 약관은 서비스 내 공지를 통해 개정될 수 있으며, 개정 후 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주됩니다.

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
  const [privacyModal,    setPrivacyModal]    = useState(false);
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
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingTop: Math.max(insets.top + 20, 30) }]} keyboardShouldPersistTaps="handled">

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
          <TouchableOpacity style={s.listItem} onPress={() => setPrivacyModal(true)}>
            <Text style={s.listIcon}>🔒</Text>
            <Text style={s.listLabel}>개인정보 처리방침</Text>
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
          {' '}및{' '}
          <Text style={s.agreeLink} onPress={() => setPrivacyModal(true)}>개인정보 처리방침</Text>
          에{'\n'}동의한 것으로 간주됩니다.
        </Text>
        <Text style={s.versionText}>Silver Life AI v0.1.0</Text>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={displayName} />

      <Modal visible={termsModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>서비스 이용약관</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.modalBody}>{TERMS_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setTermsModal(false)}>
              <Text style={s.modalCloseTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={privacyModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>개인정보 처리방침</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.modalBody}>{PRIVACY_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setPrivacyModal(false)}>
              <Text style={s.modalCloseTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
