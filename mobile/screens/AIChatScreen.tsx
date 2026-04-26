import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
  StatusBar, Image, Animated, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak, stopSpeech } from '../utils/speech';
import SeniorTabBar from '../components/SeniorTabBar';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };
type RiskLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';
type Msg = { role: 'ai' | 'user'; text: string; riskLevel?: RiskLevel; doctorMemoNeeded?: boolean; doctorMemo?: string };
type HistoryItem = { role: 'user' | 'assistant'; content: string };

const C = {
  purple1: '#7B1FA2',
  purple2: '#9C27B0',
  bg:      '#FBF8FF',
  card:    '#FFFFFF',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#E1BEE7',
  sage:    '#3DAB7B',
  warn:    '#FF8F00',
  emRed:   '#D32F2F',
  emBg:    '#FFEBEE',
};

const KKULBI_IMAGES = {
  default: require('../assets/Kkulbi_1.png'),
  happy:   require('../assets/Kkulbi_1.png'),
  worry:   require('../assets/Kkulbi_worry.png'),
  cheer:   require('../assets/Kkulbi_Cheer.png'),
  sleep:   require('../assets/Kkulbi_sleep.png'),
  sos:     require('../assets/Kkulbi_1.png'),
};

const SLEEP_KEYWORDS = ['수면', '잠', '불면', '졸림', '피로', '잠이', '자다', '못자'];
const CHEER_KEYWORDS = ['잘하셨', '좋아요', '괴찮아', '다행', '건강하', '운동', '식단', '걷기', '정상'];

function getKkulbiImage(riskLevel?: RiskLevel, text: string = '') {
  if (riskLevel === 'critical') return KKULBI_IMAGES.sos;
  if (riskLevel === 'high' || riskLevel === 'medium') return KKULBI_IMAGES.worry;
  if (SLEEP_KEYWORDS.some(k => text.includes(k))) return KKULBI_IMAGES.sleep;
  if (CHEER_KEYWORDS.some(k => text.includes(k))) return KKULBI_IMAGES.cheer;
  return KKULBI_IMAGES.happy;
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/️/gu, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 9)  return `${name}님, 좋은 아침이에요!\n오늘 하루도 건강하게 시작해요`;
  if (h < 12) return `${name}님, 안녕하세요!\n무엇이든 편하게 물어보세요`;
  if (h < 14) return `${name}님, 점심은 드셨나요?\n건강한 하루를 보내고 계신가요?`;
  if (h < 18) return `${name}님, 오후도 건강하게!\n궁금한 건강 정보가 있으신가요?`;
  if (h < 21) return `${name}님, 좋은 저녁이에요!\n오늘 하루 어떠세요?`;
  return `${name}님, 편안한 밤 되세요\n내일도 건강하게 함께해요`;
}

const QUICK_CHIPS = [
  { label: '약 부작용' },
  { label: '혈압이 높아요' },
  { label: '잠이 안와요' },
  { label: '무릎 아파요' },
  { label: '어지러워요' },
  { label: '속이 메스꺼워요' },
];

export default function AIChatScreen({ route, navigation }: Props) {
  const { name = '회원', userId = '' } = route?.params ?? {};

  const [displayMsg, setDisplayMsg] = useState<Msg>({ role: 'ai', text: getGreeting(name) });
  const [history,    setHistory]    = useState<HistoryItem[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmergency,  setShowEmergency]  = useState(false);
  const [familyNotified, setFamilyNotified] = useState(false);
  const [toastMsg,       setToastMsg]       = useState('');
  const [ttsActive,      setTtsActive]      = useState(false);
  const [doctorMemoSaved, setDoctorMemoSaved] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef   = useRef<any>(null);
  const silenceTimerRef  = useRef<any>(null);
  const toastTimerRef    = useRef<any>(null);
  const msgFadeAnim      = useRef(new Animated.Value(1)).current;

  useEffect(() => () => { stopSpeech(); }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: false }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2500);
  };

  const fadeInMsg = (msg: Msg) => {
    msgFadeAnim.setValue(0);
    setDisplayMsg(msg);
    Animated.timing(msgFadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  const toggleTts = () => {
    if (ttsActive) {
      stopSpeech();
      setTtsActive(false);
    } else {
      setTtsActive(true);
      speak(displayMsg.text, 0.85);
      const ms = Math.max(3000, displayMsg.text.length * 180);
      setTimeout(() => setTtsActive(false), ms);
    }
  };

  const saveDoctorMemo = async (memo: string) => {
    try {
      await AsyncStorage.setItem('doctor_memo', memo);
      await AsyncStorage.setItem('doctor_memo_date', new Date().toISOString());
      setDoctorMemoSaved(true);
      showToast('메모가 저장되었습니다');
    } catch { showToast('저장에 실패했습니다'); }
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setTtsActive(false);
    stopSpeech();
    setDoctorMemoSaved(false);

    fadeInMsg({ role: 'user', text: msg });
    setLoading(true);

    const newHistory: HistoryItem[] = [...history, { role: 'user', content: msg }];
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message: msg, history: history.slice(-10) }),
      });
      const data = await res.json();
      const reply      = stripEmoji(data.reply ?? data.response ?? '죄송합니다, 다시 시도해주세요.');
      const riskLevel  = (data.risk_level ?? 'normal') as RiskLevel;
      const dMemoNeeded: boolean  = data.doctor_memo_needed ?? false;
      const dMemo: string | undefined = data.doctor_memo ?? undefined;

      fadeInMsg({ role: 'ai', text: reply, riskLevel, doctorMemoNeeded: dMemoNeeded, doctorMemo: dMemo });
      setHistory([...newHistory, { role: 'assistant', content: reply }]);

      if (riskLevel === 'critical') {
        setShowEmergency(true);
        if (data.sos_sent) setFamilyNotified(true);
      }
    } catch {
      fadeInMsg({ role: 'ai', text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setLoading(false);
    }
  };

  const stopVoice = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const toggleVoice = () => {
    if (Platform.OS !== 'web') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showToast('Chrome 브라우저를 사용해 주세요'); return; }
    if (isRecording) { stopVoice(); return; }
    const recognition = new SR();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend   = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (e: any) => {
      let finalText = '', interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interimText += e.results[i][0].transcript;
      }
      const combined = (finalText + interimText).trim();
      if (combined) setInput(combined);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(stopVoice, 1500);
    };
    recognition.start();
  };

  const call119 = () => {
    if (Platform.OS === 'web') window.location.href = 'tel:119';
    else Linking.openURL('tel:119');
  };

  const kkulbiImg  = getKkulbiImage(displayMsg.riskLevel, displayMsg.text);
  const isUserMsg  = displayMsg.role === 'user';
  const isWelcome  = history.length === 0 && !loading;

  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(160deg, #6A1B9A 0%, #8E24AA 100%)' }
    : { backgroundColor: C.purple1 };

  return (
    <View style={s.root}>
      {/* 헤더 + 웨이브 아치 */}
      <View style={[s.header, webBg]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>AI 건강 상담</Text>
          <Text style={s.headerSub}>꿀비와 함께하는 건강 관리</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.onlineDot} />
          <TouchableOpacity style={s.settingsBtn}
            onPress={() => navigation.navigate('Settings', { userId, name })}>
            <Text style={{ fontSize: 26, textAlign: 'center' }}>⚙️</Text>
            <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>설정</Text>
          </TouchableOpacity>
        </View>
        {/* 웨이브 아치 */}
        <View style={s.waveArch} />
      </View>

      {/* CRITICAL 인라인 카드 */}
      {showEmergency && (
        <View style={s.criticalCard}>
          <Text style={s.criticalCardTitle}>응급 증상이 의심됩니다</Text>
          {familyNotified && <Text style={s.familyNotified}>가족에게 알림 전송됨</Text>}
          <View style={s.criticalBtns}>
            <TouchableOpacity style={s.btnCritical119} onPress={call119}>
              <Text style={s.btnCritical119Txt}>119 전화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnCriticalDismiss}
              onPress={() => { setShowEmergency(false); setFamilyNotified(false); }}>
              <Text style={s.btnCriticalDismissTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* 메인 바디 - 고정 레이아웃 (스크롤 없음) */}
        <View style={s.body}>

          {/* 꿀비 이미지 섹션 */}
          <View style={s.kkulbiSection}>
            <View style={s.kkulbiWrap}>
              <Image source={kkulbiImg} style={s.kkulbiImg} resizeMode="contain" />
            </View>
          </View>

          {/* 메시지 버블 섹션 */}
          <View style={s.bubbleSection}>
            <Animated.View style={[
              isUserMsg ? s.userBubble : s.aiBubble,
              { opacity: msgFadeAnim }
            ]}>
              {!isUserMsg && displayMsg.riskLevel === 'critical' && (
                <TouchableOpacity style={s.bannerCritical} onPress={() => setShowEmergency(true)}>
                  <Text style={s.bannerCriticalTxt}>즉시 119 또는 응급실이 필요합니다</Text>
                </TouchableOpacity>
              )}
              {!isUserMsg && displayMsg.riskLevel === 'high' && (
                <View style={s.bannerHigh}>
                  <Text style={s.bannerHighTxt}>오늘 안에 병원 방문을 강력히 권고합니다</Text>
                </View>
              )}
              {!isUserMsg && displayMsg.riskLevel === 'medium' && (
                <View style={s.bannerMedium}>
                  <Text style={s.bannerMediumTxt}>증상이 지속되면 병원 방문을 권장합니다</Text>
                </View>
              )}
              <Text style={isUserMsg ? s.userBubbleTxt : s.aiBubbleTxt}>
                {loading ? '...' : displayMsg.text}
              </Text>
              {!isUserMsg && !loading && (
                <TouchableOpacity style={s.ttsBtn} onPress={toggleTts} activeOpacity={0.7}>
                  <Text style={s.ttsBtnTxt}>{ttsActive ? '정지' : '읽기'}</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
            {!isUserMsg && displayMsg.doctorMemoNeeded && displayMsg.doctorMemo && !doctorMemoSaved && (
              <TouchableOpacity style={s.doctorMemoBtn}
                onPress={() => saveDoctorMemo(displayMsg.doctorMemo!)} activeOpacity={0.8}>
                <Text style={s.doctorMemoBtnTxt}>의사 전달 메모 저장하기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 빠른 질문 칩 (초기 상태) */}
          {isWelcome && (
            <View style={s.chipsSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsScroll}>
                {QUICK_CHIPS.map(q => (
                  <TouchableOpacity key={q.label} style={s.chip}
                    onPress={() => send(q.label)} activeOpacity={0.75}>
                    <Text style={s.chipTxt}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 입력창 */}
        <View style={s.inputWrap}>
          <View style={s.inputRow}>
            <TextInput style={s.inputBox} value={input} onChangeText={setInput}
              placeholder={isRecording ? '듣고 있어요...' : '건강 궁금증을 물어보세요'}
              placeholderTextColor={isRecording ? C.purple2 : C.sub}
              multiline maxLength={300} />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={[s.micBtn, isRecording && s.micBtnActive]}
                onPress={toggleVoice} activeOpacity={0.8}>
                <Text style={s.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
              onPress={() => send()} disabled={!input.trim() || loading} activeOpacity={0.8}>
              <Text style={s.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 응급 모달 */}
      <Modal visible={showEmergency} transparent animationType="fade"
        onRequestClose={() => setShowEmergency(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Image source={KKULBI_IMAGES.sos} style={s.modalKkulbi} resizeMode="contain" />
            <Text style={s.modalTitle}>주의가 필요합니다</Text>
            <Text style={s.modalDesc}>
              {`AI가 즉각적인 도움이 필요할 수 있다고 판단했습니다.\n본인이 괜찮다면 닫기를 눌러주세요.\n불안하다면 119 또는 가족에게 연락하세요.`}
            </Text>
            <TouchableOpacity style={s.btn119} onPress={call119} activeOpacity={0.85}>
              <Text style={s.btn119Txt}>119 지금 전화하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnFamily}
              onPress={() => { setShowEmergency(false); navigation.navigate('ImportantContacts'); }}
              activeOpacity={0.85}>
              <Text style={s.btnFamilyTxt}>중요 연락처 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnDismiss} onPress={() => setShowEmergency(false)} activeOpacity={0.85}>
              <Text style={s.btnDismissTxt}>괜찮습니다, 닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toastMsg ? <View style={s.toast}><Text style={s.toastTxt}>{toastMsg}</Text></View> : null}
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // 헤더 + 웨이브 아치
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
    paddingHorizontal: 18, paddingBottom: 20, gap: 12,
    overflow: 'visible', zIndex: 10,
  },
  waveArch: {
    position: 'absolute',
    bottom: -22,
    left: -10,
    right: -10,
    height: 44,
    backgroundColor: C.bg,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt:      { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  onlineDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3DAB7B',
    shadowColor: '#3DAB7B', shadowRadius: 4, shadowOpacity: 0.8 },
  settingsBtn:  { alignItems: 'center' },

  // 메인 바디
  body: { flex: 1, paddingTop: 30, paddingHorizontal: 20, paddingBottom: 8 },

  // 꿀비 섹션
  kkulbiSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kkulbiWrap: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#EDE7F6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.purple1, shadowOpacity: 0.18,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  kkulbiImg: { width: 160, height: 160 },

  // 메시지 버블 섹션
  bubbleSection: { flex: 2, justifyContent: 'flex-start', paddingTop: 8 },

  aiBubble: {
    backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6,
    padding: 18,
    shadowColor: C.purple1, shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  aiBubbleTxt: { fontSize: 22, color: C.text, lineHeight: 34, fontWeight: '500' },

  userBubble: {
    backgroundColor: '#7B1FA2', borderRadius: 20, borderBottomRightRadius: 6,
    padding: 18, alignSelf: 'flex-end', maxWidth: '88%',
  },
  userBubbleTxt: { fontSize: 22, color: '#fff', lineHeight: 34, fontWeight: '500' },

  ttsBtn:    { alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 16, paddingVertical: 8,
               backgroundColor: '#EDE7F6', borderRadius: 20 },
  ttsBtnTxt: { fontSize: 18, color: '#7B1FA2', fontWeight: '700' },

  bannerCritical: { backgroundColor: '#FFEBEE', borderRadius: 10, borderWidth: 2, borderColor: '#D32F2F',
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  bannerCriticalTxt: { fontSize: 17, color: '#D32F2F', fontWeight: '800', textAlign: 'center' },
  bannerHigh: { backgroundColor: '#FFF0E0', borderRadius: 10, borderWidth: 1.5, borderColor: '#E65100',
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  bannerHighTxt: { fontSize: 17, color: '#E65100', fontWeight: '700', textAlign: 'center' },
  bannerMedium: { backgroundColor: '#FFF8E1', borderRadius: 10, borderWidth: 1.5, borderColor: '#FF8F00',
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  bannerMediumTxt: { fontSize: 17, color: '#FF8F00', fontWeight: '700', textAlign: 'center' },

  doctorMemoBtn: { marginTop: 12, backgroundColor: '#E8F5E9', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#43A047', paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center' },
  doctorMemoBtnTxt: { fontSize: 19, color: '#2E7D32', fontWeight: '800' },

  // 칩 섹션
  chipsSection: { paddingTop: 12 },
  chipsScroll:  { flexDirection: 'row', gap: 10, paddingHorizontal: 2, paddingBottom: 4 },
  chip: { backgroundColor: C.card, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#E1BEE7',
    shadowColor: C.purple1, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  chipTxt: { fontSize: 19, color: '#7B1FA2', fontWeight: '600' },

  // 입력창
  inputWrap: { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: '#E1BEE7',
    paddingHorizontal: 12, paddingVertical: 10 },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputBox: { flex: 1, backgroundColor: C.bg, borderRadius: 22, borderWidth: 1.5,
    borderColor: '#E1BEE7', paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 20, color: C.text, maxHeight: 120, lineHeight: 30 },
  micBtn:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3E5F5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E1BEE7' },
  micBtnActive: { backgroundColor: '#FDEAEA', borderColor: '#D94040' },
  micIcon:      { fontSize: 22 },
  sendBtn:    { width: 48, height: 48, borderRadius: 24, backgroundColor: '#9C27B0',
    alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#E1BEE7' },
  sendIcon:   { fontSize: 22, color: '#fff', fontWeight: '700' },

  // 응급
  criticalCard: { backgroundColor: '#FFF0F0', borderTopWidth: 2, borderBottomWidth: 2,
    borderColor: '#C62828', padding: 14, alignItems: 'center' },
  criticalCardTitle: { fontSize: 20, fontWeight: '900', color: '#C62828', marginBottom: 8 },
  familyNotified: { fontSize: 16, color: '#2E7D32', fontWeight: '700', marginBottom: 8 },
  criticalBtns: { flexDirection: 'row', gap: 10 },
  btnCritical119: { backgroundColor: '#C62828', borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 24, flex: 1, alignItems: 'center' },
  btnCritical119Txt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  btnCriticalDismiss: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#C62828' },
  btnCriticalDismissTxt: { fontSize: 18, fontWeight: '700', color: '#C62828' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 380, alignItems: 'center' },
  modalKkulbi: { width: 80, height: 80, marginBottom: 8 },
  modalTitle: { fontSize: 26, fontWeight: '800', color: '#D32F2F', marginBottom: 14, textAlign: 'center' },
  modalDesc:  { fontSize: 18, color: C.text, lineHeight: 30, textAlign: 'center', marginBottom: 24 },
  btn119: { backgroundColor: '#D32F2F', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', marginBottom: 12 },
  btn119Txt: { fontSize: 22, fontWeight: '800', color: '#fff' },
  btnFamily: { backgroundColor: '#7B1FA2', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', marginBottom: 12 },
  btnFamilyTxt: { fontSize: 20, fontWeight: '700', color: '#fff' },
  btnDismiss:    { paddingVertical: 10 },
  btnDismissTxt: { fontSize: 17, color: C.sub },

  // 토스트
  toast: { position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10 },
  toastTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
