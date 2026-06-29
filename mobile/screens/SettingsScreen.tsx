import React, { useState, useEffect } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };

const BLUE       = '#3B82F6';
const ORANGE     = '#F58A4D';
const PURPLE     = '#7C5BE3';
const RED        = '#E5453C';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK        = '#0F1B2D';
const INK_SOFT   = '#3D4B62';
const INK_MUTE   = '#7E8AA1';
const LINE       = 'rgba(15,27,45,0.06)';

const PRIVACY_TEXT = `개인정보 처리방침\n최종 수정일: 2026년 5월\nSilver Life AI(이하 "서비스")는 개인정보보호법을 준수하며, 이용자의 개인정보를 소중히 보호합니다.`;
const TERMS_TEXT   = `Silver Life AI 서비스 이용약관\n최종 수정일: 2026년 5월\n본 서비스의 AI 답변 및 건강 정보는 참고용이며, 의료법에 따른 의료 행위를 대체하지 않습니다.\n건강 이상 증상이 있을 경우 반드시 의료기관과 상담하세요.`;

const FONT_OPTIONS: { key: 'normal' | 'large' | 'xlarge'; label: string; preview: number; sample: number }[] = [
  { key: 'normal', label: '보통',   preview: 20, sample: 18 },
  { key: 'large',  label: '크게',   preview: 26, sample: 22 },
  { key: 'xlarge', label: '아주크게', preview: 32, sample: 26 },
];

export default function SettingsScreen({ route, navigation }: Props) {
  const { name: paramName = '회원', userId: paramUserId = '' } = route?.params ?? {};
  const insets = useSafeAreaInsets();

  const [userId,       setUserId]       = useState<string>(paramUserId);
  const [name,         setName]         = useState(paramName);
  const [fontSize,     setFontSize]     = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [voiceGuide,   setVoiceGuide]   = useState(true);
  const [soundLoud,    setSoundLoud]    = useState(false);
  const [darkMode,     setDarkMode]     = useState(false);
  const [notifMed,     setNotifMed]     = useState(true);
  const [notifHospital,setNotifHospital]= useState(true);
  const [notifFamily,  setNotifFamily]  = useState(true);
  const [termsModal,   setTermsModal]   = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [debugTaps,    setDebugTaps]    = useState(0);
  const [debugModal,   setDebugModal]   = useState(false);
  const [debugText,    setDebugText]    = useState('');

  const isGuest = !userId || userId === 'guest';

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('userId');
      if (stored) setUserId(stored);
      const sName = await AsyncStorage.getItem('userName');
      if (sName) setName(sName);
      const fs = await AsyncStorage.getItem('fontSize');
      if (fs) setFontSize(fs as any);
      const vg = await AsyncStorage.getItem('voiceGuide');
      if (vg) setVoiceGuide(vg === 'true');
      const sl = await AsyncStorage.getItem('soundLoud');
      if (sl) setSoundLoud(sl === 'true');
      const dm = await AsyncStorage.getItem('darkMode');
      if (dm) setDarkMode(dm === 'true');
      const nm = await AsyncStorage.getItem('notifMed');
      if (nm) setNotifMed(nm === 'true');
      const nh = await AsyncStorage.getItem('notifHospital');
      if (nh) setNotifHospital(nh === 'true');
      const nf = await AsyncStorage.getItem('notifFamily');
      if (nf) setNotifFamily(nf === 'true');
    })();
  }, []);

  const handleFontSize = async (size: 'normal' | 'large' | 'xlarge') => {
    setFontSize(size);
    await AsyncStorage.setItem('fontSize', size);
  };

  const handleLogout = async () => {
    const confirmed = await new Promise(resolve =>
      Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '로그아웃', style: 'destructive', onPress: () => resolve(true) },
      ])
    );
    if (!confirmed) return;
    // 세션 토큰만 제거 — userId 네임스페이스 데이터(medications.uid, health_records.uid 등)는 유지
    // (재로그인 시 서버에서 복원 + 같은 userId면 로컬 캐시 재사용)
    await AsyncStorage.multiRemove(['userId', 'userName', 'session_token']);
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] });
  };

  const currentSample = FONT_OPTIONS.find(f => f.key === fontSize)?.sample ?? 18;

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: Math.max(insets.top + 8, 24) }]}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>설정</Text>
        </View>

        {/* Profile Card */}
        {!isGuest && (
          <View style={[s.card, s.profileCard]}>
            <LinearGradient colors={['#3BA559', '#1F7A3A']} style={s.profileAvatar}>
              <Text style={s.profileAvatarTxt}>🌿</Text>
            </LinearGradient>
            <Text style={s.profileName}>{name}</Text>
            <TouchableOpacity style={s.profileEditBtn}
              onPress={() => navigation.navigate('HealthProfile', { userId })}>
              <Text style={s.profileEditTxt}>✏️ 내 정보 수정</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 글자 크기 ── */}
        <View style={s.card}>
          <View style={s.rowCenter}>
            <Text style={s.cardIcon}>🔤</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>글자 크기</Text>
              <Text style={s.cardDesc}>선택 즉시 다른 화면에 적용돼요</Text>
            </View>
          </View>

          {/* 3단계 선택 버튼 */}
          <View style={s.fontBtnRow}>
            {FONT_OPTIONS.map(opt => {
              const active = fontSize === opt.key;
              return (
                <TouchableOpacity key={opt.key}
                  style={[s.fontBtn, active && s.fontBtnActive]}
                  onPress={() => handleFontSize(opt.key)}
                  activeOpacity={0.75}>
                  <Text style={[s.fontBtnPreview, { fontSize: opt.preview },
                    active && { color: BLUE }]}>가</Text>
                  <Text style={[s.fontBtnLabel, active && { color: BLUE, fontWeight: '800' }]}>
                    {opt.label}
                  </Text>
                  {active && <View style={s.fontBtnDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 실시간 미리보기 */}
          <View style={s.fontPreviewBox}>
            <Text style={s.fontPreviewHint}>미리보기</Text>
            <Text style={[s.fontPreviewTxt, { fontSize: currentSample }]}>
              {'오늘도 건강하게 지내세요 😊'}
            </Text>
          </View>
        </View>

        {/* ── 편의 기능 ── */}
        <View style={s.card}>
          <ToggleRow icon="🔊" label="음성 안내" desc="화면을 큰 소리로 읽어줘요"
            value={voiceGuide} onChange={setVoiceGuide} color={BLUE} />
          <View style={s.divider} />
          <ToggleRow icon="🔔" label="알림음 크게" desc="잘 안 들릴 때 켜주세요"
            value={soundLoud} onChange={setSoundLoud} color={BLUE} />
          <View style={s.divider} />
          <ToggleRow icon="🌙" label="다크 모드" desc="저녁에 눈이 편해요"
            value={darkMode} onChange={setDarkMode} color={INK_SOFT} />
        </View>

        {/* ── 알림 ── */}
        <Text style={s.section}>알림</Text>
        <View style={s.card}>
          <ToggleRow icon="💊" label="약 복용 알림" desc="복용 시간 10분 전"
            value={notifMed} onChange={setNotifMed} color={ORANGE} />
          <View style={s.divider} />
          <ToggleRow icon="🏥" label="병원 일정 알림" desc="당일 아침 + 1시간 전"
            value={notifHospital} onChange={setNotifHospital} color={BLUE} />
          <View style={s.divider} />
          <ToggleRow icon="💬" label="가족 메시지" desc="새 메시지 도착 시"
            value={notifFamily} onChange={setNotifFamily} color={PURPLE} />
        </View>

        {/* ── 계정·도움말 ── */}
        <Text style={s.section}>계정·도움말</Text>
        <View style={s.card}>
          <MenuRow icon="👨‍👩‍👧" label="보호자 관리"
            onPress={() => navigation.navigate('Guardian', { userId, name })} />
          <View style={s.divider} />
          <MenuRow icon="🛡️" label="개인정보 보호"
            onPress={() => setPrivacyModal(true)} />
          <View style={s.divider} />
          <MenuRow icon="❓" label="도움말 / 자주 묻는 질문"
            onPress={() => setTermsModal(true)} />
          <View style={s.divider} />
          <MenuRow icon="📞" label="고객센터 전화하기"
            onPress={() => Alert.alert('고객센터', '☎️ 1588-XXXX\n평일 오전 9시 - 오후 6시')} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.btnLogout} onPress={handleLogout}>
          <Text style={s.btnLogoutTxt}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            const next = debugTaps + 1;
            setDebugTaps(next);
            if (next >= 7) {
              setDebugTaps(0);
              const { getErrorLogs, clearAllLogs } = await import('../utils/errorLogger');
              const logs = await getErrorLogs();
              const hcRaw = await AsyncStorage.getItem('hc_diag');
              const hc = hcRaw ? JSON.parse(hcRaw) : null;
              const hcText = hc
                ? `\n\n[HC 진단]\n시간: ${(hc.ts||'').slice(0,19)}\nAndroid: ${hc.v}\nSDK: ${hc.sdkStatusLabel??hc.sdkStatus}\n단계: ${hc.step||'?'}\n${hc.success?'✅ 성공':'❌ 실패: '+(hc.failAt||'?')}\n${hc.permErr?'권한오류: '+hc.permErr:''}\n${hc.fatalErr?'치명오류: '+hc.fatalErr:''}`
                : '\n\n[HC 진단] 없음';
              const logText = logs.length
                ? logs.slice(0, 5).map(l => `[${l.ts.slice(11,19)}] ${l.ctx}: ${l.msg}`).join('\n')
                : '오류 없음';
              setDebugText(`[오류 로그 (최근 5건)]\n${logText}${hcText}`);
              setDebugModal(true);
            }
          }}
          activeOpacity={1}
        >
          <Text style={s.version}>Silver Life AI v1.0.0</Text>
        </TouchableOpacity>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="set" userId={userId} name={name} />

      {/* 디버그 모달 (버전 7번 탭) */}
      <Modal visible={debugModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: INK, marginBottom: 12 }}>🔧 개발자 진단</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={{ fontSize: 12, color: INK_SOFT, fontFamily: 'monospace', lineHeight: 18 }}>{debugText}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' }}
                onPress={() => setDebugModal(false)}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: INK_SOFT }}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: RED, alignItems: 'center' }}
                onPress={async () => {
                  const { clearAllLogs } = await import('../utils/errorLogger');
                  await clearAllLogs();
                  setDebugModal(false);
                  Alert.alert('완료', '로그가 삭제됐습니다');
                }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>로그 삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <TextModal visible={termsModal} title="서비스 이용약관"
        body={TERMS_TEXT} onClose={() => setTermsModal(false)} />
      <TextModal visible={privacyModal} title="개인정보 처리방침"
        body={PRIVACY_TEXT} onClose={() => setPrivacyModal(false)} />
    </LinearGradient>
  );
}

/* ── Sub-components ── */
function ToggleRow({ icon, label, desc, value, onChange, color }: any) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleDesc}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: '#D1D5F0', true: color }}
        thumbColor="#fff" />
    </View>
  );
}

function MenuRow({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.rowIcon}>{icon}</Text>
      <Text style={s.menuLabel}>{label}</Text>
      <Text style={s.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

function TextModal({ visible, title, body, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            <Text style={s.modalBody}>{body}</Text>
          </ScrollView>
          <TouchableOpacity style={s.modalClose} onPress={onClose}>
            <Text style={s.modalCloseTxt}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 120 },

  header:      { paddingBottom: 16 },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#0F1B2D' },

  card: {
    backgroundColor: '#fff', borderRadius: 22, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },

  /* Profile */
  profileCard:      { alignItems: 'center', paddingVertical: 28 },
  profileAvatar:    {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarTxt: { fontSize: 36 },
  profileName:      { fontSize: 26, fontWeight: '900', color: INK, marginBottom: 16 },
  profileEditBtn:   {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, borderWidth: 2, borderColor: BLUE,
  },
  profileEditTxt:   { fontSize: 16, fontWeight: '700', color: BLUE },

  /* Font size */
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  cardIcon:  { fontSize: 28 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: INK, marginBottom: 2 },
  cardDesc:  { fontSize: 13, fontWeight: '600', color: INK_SOFT },

  fontBtnRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  fontBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRadius: 18, borderWidth: 2, borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA', minHeight: 90, justifyContent: 'center',
  },
  fontBtnActive:   { borderColor: BLUE, backgroundColor: '#EFF6FF' },
  fontBtnPreview:  { fontWeight: '900', color: INK, marginBottom: 6 },
  fontBtnLabel:    { fontSize: 13, fontWeight: '600', color: INK_MUTE },
  fontBtnDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: BLUE, marginTop: 6,
  },

  fontPreviewBox: {
    backgroundColor: '#F8FAFC', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  fontPreviewHint: { fontSize: 12, fontWeight: '700', color: INK_MUTE, marginBottom: 6 },
  fontPreviewTxt:  { color: INK, fontWeight: '600', lineHeight: 32 },

  /* Toggles */
  toggleRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  rowIcon:    { fontSize: 24 },
  toggleLabel:{ fontSize: 17, fontWeight: '700', color: INK, marginBottom: 2 },
  toggleDesc: { fontSize: 13, fontWeight: '600', color: INK_SOFT },
  divider:    { height: 1, backgroundColor: LINE },

  /* Section title */
  section: {
    fontSize: 13, fontWeight: '700', color: INK_SOFT,
    marginTop: 24, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  /* Menu rows */
  menuRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, minHeight: 64 },
  menuLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: INK },
  menuArrow: { fontSize: 22, color: INK_MUTE },

  btnLogout: {
    backgroundColor: '#fff', borderRadius: 18,
    paddingVertical: 22, alignItems: 'center',
    marginVertical: 24, minHeight: 64,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  btnLogoutTxt: { fontSize: 22, fontWeight: '900', color: RED },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: INK_MUTE, marginBottom: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40,
  },
  modalTitle:    { fontSize: 22, fontWeight: '900', color: INK, marginBottom: 16, textAlign: 'center' },
  modalBody:     { fontSize: 14, color: INK_SOFT, lineHeight: 22 },
  modalClose: {
    marginTop: 20, backgroundColor: BLUE,
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  modalCloseTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
