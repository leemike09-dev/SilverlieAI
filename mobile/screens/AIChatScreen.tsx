import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
  StatusBar, Animated, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { speak, stopSpeech } from '../utils/speech';
import SeniorTabBar from '../components/SeniorTabBar';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };
type RiskLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';
type Msg = {
  role: 'ai' | 'user';
  text: string;
  riskLevel?: RiskLevel;
  doctorMemoNeeded?: boolean;
  doctorMemo?: string;
};
type HistoryItem = { role: 'user' | 'assistant'; content: string };

const C = {
  purple1: '#7B1FA2',
  purple2: '#9C27B0',
  purpleWave: '#8E24AA',
  bg:      '#FBF8FF',
  card:    '#FFFFFF',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#E1BEE7',
  sage:    '#3DAB7B',
  warn:    '#FF8F00',
  emRed:   '#D32F2F',
};

const QUICK_CHIPS = [
  { label: '약 부작용' },
  { label: '혈압이 높아요' },
  { label: '잠이 안와요' },
  { label: '무릎 아파요' },
  { label: '어지러워요' },
  { label: '속이 메스꺼워요' },
];

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
  if (h < 14) return `${name}님, 점심은 드셨나요?\n건강 관련 궁금한 것이 있으시면 물어보세요`;
  if (h < 18) return `${name}님, 오후도 건강하게!\n궁금한 건강 정보가 있으시면 물어보세요`;
  if (h < 21) return `${name}님, 좋은 저녁이에요!\n오늘 하루 어떠셨나요?`;
  return `${name}님, 편안한 밤 되세요\n내일도 건강하게 함께해요`;
}

export default function AIChatScreen({ route, navigation }: Props) {
  const { name = '회원', userId = '' } = route?.params ?? {};

  const greeting = getGreeting(name);
  const [displayMsg,  setDisplayMsg]  = useState<Msg>({ role: 'ai', text: greeting });
  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [showEmergency,  setShowEmergency]  = useState(false);
  const [familyNotified, setFamilyNotified] = useState(false);
  const [memoState,   setMemoState]   = useState<'idle' | 'asking' | 'saved'>('idle');
  const [pendingMemo, setPendingMemo] = useState<string>('');
  const [toastMsg,    setToastMsg]    = useState('');
  const [aiMsgIdx,    setAiMsgIdx]    = useState(0);

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const dotsAnim     = useRef(new Animated.Value(0)).current;
  const recognitionRef  = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const toastTimerRef   = useRef<any>(null);
  const speakTimerRef   = useRef<any>(null);
  const isWelcome = history.length === 0 && !loading;

  // 초기 인사 TTS
  useEffect(() => {
    const t = setTimeout(() => {
      speak(greeting, 0.85);
      setIsSpeaking(true);
    }, 600);
    return () => { clearTimeout(t); stopSpeech(); };
  }, []);

  // 새 AI 메시지 TTS 자동 재생
  useEffect(() => {
    if (aiMsgIdx === 0) return;
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    stopSpeech();
    setIsSpeaking(true);
    speak(displayMsg.text, 0.85);
    const ms = Math.max(4000, displayMsg.text.length * 180);
    speakTimerRef.current = setTimeout(() => setIsSpeaking(false), ms);
    return () => { if (speakTimerRef.current) clearTimeout(speakTimerRef.current); };
  }, [aiMsgIdx]);

  // 로딩 애니메이션
  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      dotsAnim.stopAnimation();
      dotsAnim.setValue(0);
    }
  }, [loading]);

  // 녹음 펄스 애니메이션
  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: false }),
      ])).start();
    } else {
      pulseAnim.stopAnimation(); pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2500);
  };

  const fadeInMsg = (msg: Msg) => {
    fadeAnim.setValue(0);
    setDisplayMsg(msg);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const stopSpeakingHandler = () => {
    stopSpeech();
    setIsSpeaking(false);
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
  };

  const replaySpeech = () => {
    stopSpeakingHandler();
    setIsSpeaking(true);
    speak(displayMsg.text, 0.85);
    const ms = Math.max(4000, displayMsg.text.length * 180);
    speakTimerRef.current = setTimeout(() => setIsSpeaking(false), ms);
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    stopSpeakingHandler();
    setMemoState('idle');

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
      const reply     = stripEmoji(data.reply ?? data.response ?? '죄송합니다, 다시 시도해주세요.');
      const riskLevel = (data.risk_level ?? 'normal') as RiskLevel;
      const dMemoNeeded: boolean   = data.doctor_memo_needed ?? false;
      const dMemo: string | undefined = data.doctor_memo ?? undefined;

      const aiMsg: Msg = { role: 'ai', text: reply, riskLevel, doctorMemoNeeded: dMemoNeeded, doctorMemo: dMemo };
      fadeInMsg(aiMsg);
      setHistory([...newHistory, { role: 'assistant', content: reply }]);
      setAiMsgIdx(i => i + 1);

      if (dMemoNeeded && dMemo) {
        setPendingMemo(dMemo);
        setMemoState('asking');
        // 메모 질문을 TTS에 추가 (약간 딜레이 후)
        const mainMs = Math.max(3000, reply.length * 180);
        speakTimerRef.current = setTimeout(() => {
          speak('병원 방문하실 때 의사 선생님께 드릴 메모를 작성해 드릴까요?', 0.85);
        }, mainMs + 200);
      }
      if (riskLevel === 'critical') {
        setShowEmergency(true);
        if (data.sos_sent) setFamilyNotified(true);
      }
    } catch {
      fadeInMsg({ role: 'ai', text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.' });
      setAiMsgIdx(i => i + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleMemoYes = async () => {
    setMemoState('saved');
    try {
      await AsyncStorage.setItem('doctor_memo', pendingMemo);
      await AsyncStorage.setItem('doctor_memo_date', new Date().toISOString());
      speak('메모를 저장했습니다. 설정에서 의사 전달 메모를 확인하실 수 있어요.', 0.85);
      showToast('메모가 저장되었습니다');
    } catch { showToast('저장에 실패했습니다'); }
  };

  const handleMemoNo = () => {
    setMemoState('idle');
    speak('알겠습니다. 필요하실 때 언제든지 말씀해 주세요.', 0.85);
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
      let final = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      const combined = (final + interim).trim();
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

  const waveFill = Platform.OS === 'web' ? C.purpleWave : C.purple1;
  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(160deg, #6A1B9A 0%, #8E24AA 100%)' }
    : { backgroundColor: C.purple1 };

  return (
    <View style={s.root}>
      {/* ── 헤더 + 파도 웨이브 ── */}
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
      </View>
      {/* SVG 파도 웨이브 */}
      <Svg
        style={{ marginTop: -1 }}
        width="100%"
        height={36}
        viewBox="0 0 360 36"
        preserveAspectRatio="none"
      >
        <Path
          d="M0,36 L0,22 C30,10 60,34 90,22 C120,10 150,34 180,22 C210,10 240,34 270,22 C300,10 330,34 360,22 L360,36 Z"
          fill={waveFill}
        />
      </Svg>

      {/* CRITICAL 배너 */}
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
        {/* ── 메인 바디 ── */}
        <View style={s.body}>

          {/* 상태 표시줄 */}
          <View style={s.statusRow}>
            {loading ? (
              <Animated.Text style={[s.statusTxt, { opacity: dotsAnim.interpolate({ inputRange:[0,1], outputRange:[0.4,1] }) }]}>
                꿀비가 생각 중...
              </Animated.Text>
            ) : isSpeaking ? (
              <>
                <Text style={s.statusTxt}>꿀비가 말하는 중</Text>
                <TouchableOpacity onPress={stopSpeakingHandler} style={s.speakCtrlBtn}>
                  <Text style={s.speakCtrlTxt}>정지</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.statusTxt, { color: C.sub }]}>
                  {displayMsg.role === 'ai' ? '꿀비' : '내 질문'}
                </Text>
                {displayMsg.role === 'ai' && (
                  <TouchableOpacity onPress={replaySpeech} style={s.speakCtrlBtn}>
                    <Text style={s.speakCtrlTxt}>다시 듣기</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* 위험 배너 (high/medium) */}
          {!loading && displayMsg.role === 'ai' && displayMsg.riskLevel === 'critical' && (
            <TouchableOpacity style={s.bannerCritical} onPress={() => setShowEmergency(true)}>
              <Text style={s.bannerCriticalTxt}>즉시 119 또는 응급실이 필요합니다</Text>
            </TouchableOpacity>
          )}
          {!loading && displayMsg.role === 'ai' && displayMsg.riskLevel === 'high' && (
            <View style={s.bannerHigh}>
              <Text style={s.bannerHighTxt}>오늘 안에 병원 방문을 강력히 권고합니다</Text>
            </View>
          )}
          {!loading && displayMsg.role === 'ai' && displayMsg.riskLevel === 'medium' && (
            <View style={s.bannerMedium}>
              <Text style={s.bannerMediumTxt}>증상이 지속되면 병원 방문을 권장합니다</Text>
            </View>
          )}

          {/* 메시지 텍스트 — 스크롤 가능 */}
          <ScrollView
            style={s.msgScroll}
            contentContainerStyle={s.msgContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[
              displayMsg.role === 'ai' ? s.aiTxt : s.userTxt,
              loading && s.loadingTxt
            ]}>
              {loading ? '...' : displayMsg.text}
            </Text>
          </ScrollView>

          {/* 의사 메모 제안 */}
          {memoState === 'asking' && (
            <View style={s.memoPrompt}>
              <Text style={s.memoPromptTxt}>
                {'병원 방문하실 때\n의사 선생님께 드릴 메모를\n작성해 드릴까요?'}
              </Text>
              <View style={s.memoBtns}>
                <TouchableOpacity style={s.memoYesBtn} onPress={handleMemoYes} activeOpacity={0.8}>
                  <Text style={s.memoYesTxt}>네, 작성해 주세요</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.memoNoBtn} onPress={handleMemoNo} activeOpacity={0.8}>
                  <Text style={s.memoNoTxt}>괜찮아요</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {memoState === 'saved' && (
            <TouchableOpacity style={s.memoSavedBanner}
              onPress={() => navigation.navigate('DoctorMemo', { userId, name })}>
              <Text style={s.memoSavedTxt}>메모 저장됨  —  눌러서 확인하기</Text>
            </TouchableOpacity>
          )}

          {/* 빠른 질문 칩 (초기) */}
          {isWelcome && memoState === 'idle' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsScroll} style={s.chipsWrap}>
              {QUICK_CHIPS.map(q => (
                <TouchableOpacity key={q.label} style={s.chip}
                  onPress={() => send(q.label)} activeOpacity={0.75}>
                  <Text style={s.chipTxt}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── 입력창 ── */}
        <View style={s.inputWrap}>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputBox}
              value={input}
              onChangeText={setInput}
              placeholder={isRecording ? '듣고 있어요...' : '건강 궁금증을 물어보세요'}
              placeholderTextColor={isRecording ? C.purple2 : C.sub}
              multiline
              maxLength={300}
            />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={[s.micBtn, isRecording && s.micBtnActive]}
                onPress={toggleVoice} activeOpacity={0.8}>
                <Text style={s.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
              onPress={() => send()}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}>
              <Text style={s.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── 응급 모달 ── */}
      <Modal visible={showEmergency} transparent animationType="fade"
        onRequestClose={() => setShowEmergency(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>주의가 필요합니다</Text>
            <Text style={s.modalDesc}>
              {'AI가 즉각적인 도움이 필요할 수 있다고 판단했습니다.\n본인이 괜찮다면 닫기를 눌러주세요.\n불안하다면 119 또는 가족에게 연락하세요.'}
            </Text>
            <TouchableOpacity style={s.btn119} onPress={call119} activeOpacity={0.85}>
              <Text style={s.btn119Txt}>119 지금 전화하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnFamily}
              onPress={() => { setShowEmergency(false); navigation.navigate('ImportantContacts'); }}
              activeOpacity={0.85}>
              <Text style={s.btnFamilyTxt}>중요 연락처 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnDismiss} onPress={() => setShowEmergency(false)}>
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
  root: { flex: 1, backgroundColor: '#FBF8FF' },

  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
    paddingHorizontal: 18, paddingBottom: 16, gap: 12,
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
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 6 },

  // 상태줄
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusTxt:    { fontSize: 20, fontWeight: '700', color: '#7B1FA2' },
  speakCtrlBtn: { backgroundColor: '#EDE7F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  speakCtrlTxt: { fontSize: 18, color: '#7B1FA2', fontWeight: '700' },

  // 위험 배너
  bannerCritical: { backgroundColor: '#FFEBEE', borderRadius: 12, borderWidth: 2, borderColor: '#D32F2F',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  bannerCriticalTxt: { fontSize: 19, color: '#D32F2F', fontWeight: '800', textAlign: 'center' },
  bannerHigh: { backgroundColor: '#FFF0E0', borderRadius: 12, borderWidth: 1.5, borderColor: '#E65100',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  bannerHighTxt: { fontSize: 19, color: '#E65100', fontWeight: '700', textAlign: 'center' },
  bannerMedium: { backgroundColor: '#FFF8E1', borderRadius: 12, borderWidth: 1.5, borderColor: '#FF8F00',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  bannerMediumTxt: { fontSize: 19, color: '#FF8F00', fontWeight: '700', textAlign: 'center' },

  // 메시지 텍스트 (스크롤 가능)
  msgScroll:  { flex: 1 },
  msgContent: { paddingBottom: 12 },
  aiTxt:      { fontSize: 28, color: '#16273E', lineHeight: 44, fontWeight: '400' },
  userTxt:    { fontSize: 26, color: '#5E35B1', lineHeight: 40, fontWeight: '500', textAlign: 'right' },
  loadingTxt: { fontSize: 40, color: '#9C27B0', letterSpacing: 6 },

  // 의사 메모 제안
  memoPrompt: {
    backgroundColor: '#F3E5F5', borderRadius: 20, padding: 22, marginBottom: 12,
    borderWidth: 2, borderColor: '#CE93D8',
  },
  memoPromptTxt: { fontSize: 24, color: '#4A148C', fontWeight: '700', lineHeight: 36, textAlign: 'center', marginBottom: 18 },
  memoBtns:  { flexDirection: 'row', gap: 12 },
  memoYesBtn: { flex: 1, backgroundColor: '#7B1FA2', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center' },
  memoYesTxt: { fontSize: 22, color: '#fff', fontWeight: '800' },
  memoNoBtn: { flex: 1, backgroundColor: '#EDE7F6', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#CE93D8' },
  memoNoTxt: { fontSize: 22, color: '#7B1FA2', fontWeight: '700' },
  memoSavedBanner: { backgroundColor: '#E8F5E9', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 8, borderWidth: 1.5, borderColor: '#43A047' },
  memoSavedTxt: { fontSize: 20, color: '#2E7D32', fontWeight: '800' },

  // 칩
  chipsWrap:   { marginTop: 4 },
  chipsScroll: { flexDirection: 'row', gap: 10, paddingHorizontal: 2, paddingBottom: 4 },
  chip: { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E1BEE7',
    shadowColor: '#7B1FA2', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  chipTxt: { fontSize: 20, color: '#7B1FA2', fontWeight: '600' },

  // 입력
  inputWrap: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E1BEE7',
    paddingHorizontal: 12, paddingVertical: 10 },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputBox: { flex: 1, backgroundColor: '#FBF8FF', borderRadius: 22, borderWidth: 1.5,
    borderColor: '#E1BEE7', paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 22, color: '#16273E', maxHeight: 120, lineHeight: 30 },
  micBtn:       { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3E5F5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E1BEE7' },
  micBtnActive: { backgroundColor: '#FDEAEA', borderColor: '#D94040' },
  micIcon:      { fontSize: 22 },
  sendBtn:    { width: 50, height: 50, borderRadius: 25, backgroundColor: '#9C27B0',
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
  modalTitle: { fontSize: 26, fontWeight: '800', color: '#D32F2F', marginBottom: 14, textAlign: 'center' },
  modalDesc:  { fontSize: 18, color: '#16273E', lineHeight: 30, textAlign: 'center', marginBottom: 24 },
  btn119: { backgroundColor: '#D32F2F', borderRadius: 14, paddingVertical: 16,
    width: '100%', alignItems: 'center', marginBottom: 12 },
  btn119Txt: { fontSize: 22, fontWeight: '800', color: '#fff' },
  btnFamily: { backgroundColor: '#7B1FA2', borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center', marginBottom: 12 },
  btnFamilyTxt: { fontSize: 20, fontWeight: '700', color: '#fff' },
  btnDismiss:    { paddingVertical: 10 },
  btnDismissTxt: { fontSize: 17, color: '#7A90A8' },

  // 토스트
  toast: { position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10 },
  toastTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
