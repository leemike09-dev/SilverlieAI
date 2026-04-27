import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
  StatusBar, Animated, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { speak, speakSentences, stopSpeech } from '../utils/speech';
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

const QUICK_CARDS = [
  { emoji: '💉', label: '약 부작용이\n걱정돼요',    color: '#3949AB', bg: '#E8EAF6' },
  { emoji: '❤️',  label: '혈압이\n높아요',          color: '#C62828', bg: '#FFEBEE' },
  { emoji: '😔', label: '기분이\n울적해요',          color: '#7B1FA2', bg: '#F3E5F5' },
  { emoji: '🦵', label: '무릎이\n아파요',            color: '#E65100', bg: '#FFF3E0' },
  { emoji: '👪', label: '가족이\n보고 싶어요',       color: '#2E7D32', bg: '#E8F5E9' },
  { emoji: '😴', label: '잠을 못 자고\n있어요',      color: '#1565C0', bg: '#E3F2FD' },
  { emoji: '😵', label: '어지럽고\n힘들어요',        color: '#6A1B9A', bg: '#EDE7F6' },
  { emoji: '🏃', label: '가볍게 걸어도\n될까요?',    color: '#00695C', bg: '#E0F2F1' },
];

// ── Intent 분류 ──
type Intent = 'emergency' | 'crisis' | 'emotional' | 'cognitive' | 'health' | 'daily';

const EMERGENCY_KW = [
  '가슴이 아파', '가슴 아파', '가슴통증', '가슴 답답', '심장이 아파', '심장 통증',
  '숨이 막혀', '숨막혀', '숨쉬기 힘들', '호흡 곤란', '호흡이 안', '호흡곤란',
  '쓰러질 것', '쓰러졌어', '쓰러졌다', '넘어졌어', '못 일어나',
  '의식이 없', '정신을 잃', '졸도', '심정지', '뇌졸중',
  '119 불러', '응급실 가야',
];

const CRISIS_KW = [
  '죽고 싶', '죽고싶', '살기 싫', '살기싫', '더 살기 힘',
  '이 세상 떠나', '사라지고 싶', '없어지고 싶', '자살',
];

const EMOTIONAL_KW = [
  '혼자', '외로', '심심', '아무도 없', '아무도 안', '보고싶', '그립다', '그리워',
  '슬프', '눈물이', '힘들어', '우울', '서럽다', '괜찮지 않', '무서워', '불안해',
  '기분이 안 좋', '기분이 울적', '마음이 아파', '마음이 힘', '위로가 필요',
  '기운이 없', '가족이 보고 싶', '자식이', '기운 없어',
];

const COGNITIVE_KW = [
  '또 물어봐서', '아까 말했', '헷갈려', '뭔지 모르겠', '기억이 안나',
  '다시 한번 말해줘', '방금 뭐라고', '이해가 안', '다시 알려줘',
];

function classifyIntent(msg: string, history: HistoryItem[]): Intent {
  if (EMERGENCY_KW.some(k => msg.includes(k))) return 'emergency';
  if (CRISIS_KW.some(k => msg.includes(k))) return 'crisis';
  if (EMOTIONAL_KW.some(k => msg.includes(k))) return 'emotional';
  if (COGNITIVE_KW.some(k => msg.includes(k))) return 'cognitive';
  const recent = history.filter(h => h.role === 'user').slice(-4).map(h => h.content);
  if (recent.length >= 2 && msg.length >= 6) {
    const key = msg.slice(0, 10);
    if (recent.filter(m => m.slice(0, 10) === key).length >= 1) return 'cognitive';
  }
  const DAILY_KW = ['날씨', '심심해', '뭐 해요', '뭐해요', '이야기 하고 싶', '그냥 얘기', '오늘 뭐'];
  if (DAILY_KW.some(k => msg.includes(k))) return 'daily';
  return 'health';
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

function cleanForTTS(text: string): string {
  return stripEmoji(text)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\*{1,3}([^*\n]*)\*{1,3}/g, '$1')
    .replace(/\*+/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^-{2,}\s*/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^={3,}$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 혈압 표기 변환: 139/94 mmHg → 백삼십구 구십사
    .replace(/(\d+)\/(\d+)\s*mmHg/gi, (_, s, d) => `${numToKorean(+s)} ${numToKorean(+d)}`)
    .replace(/(\d+)\/(\d+)/g, (_, a, b) => `${numToKorean(+a)} ${numToKorean(+b)}`)
    // 단위 자연스럽게
    .replace(/mg\/dL/gi, '밀리그램')
    .replace(/bpm/gi, '비피엠')
    .replace(/mmHg/gi, '')
    .replace(/\n/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function numToKorean(n: number): string {
  if (n === 0) return '영';
  const ones = ['','일','이','삼','사','오','육','칠','팔','구'];
  const tens = ['','십','이십','삼십','사십','오십','육십','칠십','팔십','구십'];
  const hundreds = ['','백','이백','삼백','사백','오백','육백','칠백','팔백','구백'];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let result = '';
  if (h === 1) result += '백';
  else if (h > 1) result += hundreds[h];
  if (t === 1) result += '십';
  else if (t > 1) result += tens[t];
  if (o > 0) result += ones[o];
  return result || String(n);
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 9)  return `${name}님, 좋은 아침이에요! 오늘 하루도 건강하고 행복하게 시작해요. 무엇이든 편하게 물어보세요.`;
  if (h < 12) return `${name}님, 안녕하세요! 오늘 컨디션은 어떠신가요? 건강이든 일상이든 편하게 이야기해요.`;
  if (h < 14) return `${name}님, 점심은 맛있게 드셨나요? 오늘도 곁에 있을게요. 궁금한 것 있으시면 말씀해요.`;
  if (h < 18) return `${name}님, 오후도 잘 보내고 계신가요? 무엇이든 편하게 물어보세요. 저 꿀비가 여기 있어요.`;
  if (h < 21) return `${name}님, 좋은 저녁이에요! 오늘 하루 어떠셨나요? 무엇이든 편하게 이야기해요.`;
  return `${name}님, 편안한 밤 되세요. 잠 자기 전 건강이나 걱정되는 것 있으시면 언제든 말씀해요.`;
}

export default function AIChatScreen({ route, navigation }: Props) {
  const { name = '회원', userId = '' } = route?.params ?? {};

  const greeting = getGreeting(name);
  const [displayMsg,  setDisplayMsg]  = useState<Msg>({ role: 'ai', text: '' });
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
  const [turnCount,   setTurnCount]   = useState(0);
  const [currentIntent, setCurrentIntent] = useState<Intent>('health');
  const [showCrisis,    setShowCrisis]    = useState(false);
  const [healthProfile, setHealthProfile] = useState<any>(null);

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const dotsAnim     = useRef(new Animated.Value(0)).current;
  const recognitionRef  = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const toastTimerRef   = useRef<any>(null);
  const speakTimerRef      = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const isWelcome = history.length === 0 && !loading;

  // 초기 선제적 인사 + 건강프로필 로드
  useEffect(() => {
    AsyncStorage.getItem('health_profile').then(stored => {
      if (stored) { try { setHealthProfile(JSON.parse(stored)); } catch {} }
    });
    fetchProactiveGreeting();
    return () => { stopSpeech(); };
  }, []);

  // 새 AI 메시지 TTS 자동 재생
  useEffect(() => {
    if (aiMsgIdx === 0) return;
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    stopSpeech();
    setIsSpeaking(true);
    speakSentences(cleanForTTS(displayMsg.text));
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
    speakSentences(cleanForTTS(displayMsg.text));
    const ms = Math.max(4000, displayMsg.text.length * 180);
    speakTimerRef.current = setTimeout(() => setIsSpeaking(false), ms);
  };

  const fetchProactiveGreeting = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [lastDate, cached] = await Promise.all([
      AsyncStorage.getItem('ai_greeting_date'),
      AsyncStorage.getItem('ai_greeting_cache'),
    ]);

    // 오늘 이미 인사했으면 캐시 표시만 (TTS 없음)
    if (lastDate === today && cached) {
      fadeInMsg({ role: 'ai', text: cached });
      return;
    }

    const fallback = getGreeting(name);
    const save = async (msg: string) => {
      await AsyncStorage.setItem('ai_greeting_date', today);
      await AsyncStorage.setItem('ai_greeting_cache', msg);
    };

    if (!userId || userId === 'guest') {
      fadeInMsg({ role: 'ai', text: fallback });
      setTimeout(() => speak(cleanForTTS(fallback), 0.85), 600);
      await save(fallback);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/ai/proactive-greeting/${userId}`);
      const data = await res.json();
      const msg  = data.message || fallback;
      fadeInMsg({ role: 'ai', text: msg });
      setTimeout(() => speak(cleanForTTS(msg), 0.85), 400);
      await save(msg);
    } catch {
      fadeInMsg({ role: 'ai', text: fallback });
      setTimeout(() => speak(cleanForTTS(fallback), 0.85), 600);
      await save(fallback);
    } finally {
      setLoading(false);
    }
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    stopSpeakingHandler();
    if (memoState !== 'saved') setMemoState('idle');

    // ── Intent 분류 ──
    const detectedIntent = classifyIntent(msg, history);
    setCurrentIntent(detectedIntent);

    // ── 응급 Pre-filter: API 호출 없이 즉시 SOS 표시 ──
    if (detectedIntent === 'emergency') {
      const emMsg = `${name}님, 지금 많이 불편하신가요? 걱정이 돼요. 아래 버튼으로 즉시 도움을 받으세요.`;
      fadeInMsg({ role: 'ai', text: emMsg, riskLevel: 'critical' });
      setAiMsgIdx(i => i + 1);
      setShowEmergency(true);
      setTimeout(() => speak(cleanForTTS(emMsg), 0.82), 300);
      return;
    }

    // ── 위기 Pre-filter: 위기 카드 표시 후 API도 호출 ──
    if (detectedIntent === 'crisis') {
      const crisisMsg = `${name}님, 지금 많이 힘드신 거 느껴져요. 저 꿀비가 여기 있어요. 혼자 감당하지 않아도 돼요.`;
      fadeInMsg({ role: 'ai', text: crisisMsg });
      setAiMsgIdx(i => i + 1);
      setShowCrisis(true);
      setTimeout(() => speak(cleanForTTS(crisisMsg), 0.82), 300);
      // 위기는 API도 호출해서 공감 응답 받기 (아래 계속 실행)
    }

    fadeInMsg({ role: 'user', text: msg });
    setLoading(true);

    const newHistory: HistoryItem[] = [...history, { role: 'user', content: msg }];
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message: msg, history: history.slice(-10), turn_count: turnCount, force_summary: false, intent: detectedIntent, client_profile: healthProfile }),
      });
      const data = await res.json();
      const reply     = stripEmoji(data.reply ?? data.response ?? '죄송합니다, 다시 시도해주세요.');
      const riskLevel = (data.risk_level ?? 'normal') as RiskLevel;
      const dMemoNeeded: boolean   = data.doctor_memo_needed ?? false;
      const dMemo: string | undefined = data.doctor_memo ?? undefined;

      const isFinal: boolean = data.is_final ?? false;
      const aiMsg: Msg = { role: 'ai', text: reply, riskLevel, doctorMemoNeeded: dMemoNeeded, doctorMemo: dMemo };
      fadeInMsg(aiMsg);
      setHistory([...newHistory, { role: 'assistant', content: reply }]);
      setAiMsgIdx(i => i + 1);
      setTurnCount(t => t + 1);

      if (memoState === 'idle' && ((isFinal && dMemo) || (dMemoNeeded && dMemo && ['medium','high','critical'].includes(riskLevel)))) {
        setPendingMemo(dMemo);
        // TTS 완료 후 메모 프롬프트 표시
        const mainMs = Math.max(4000, reply.length * 180);
        setTimeout(() => {
          setMemoState('asking');
          speak('병원 방문하실 때 의사 선생님께 드릴 메모를 작성해 드릴까요?', 0.85);
        }, mainMs + 600);
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

  const sendForceSummary = async () => {
    if (loading || turnCount < 1) return;
    stopSpeakingHandler();
    setMemoState('idle');
    fadeInMsg({ role: 'user', text: '지금까지 내용을 요약해 주세요' });
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message: '지금까지 증상을 요약해 주세요', history: history.slice(-10), turn_count: turnCount, force_summary: true, client_profile: healthProfile }),
      });
      const data = await res.json();
      const reply     = stripEmoji(data.reply ?? '죄송합니다, 다시 시도해주세요.');
      const riskLevel = (data.risk_level ?? 'normal') as RiskLevel;
      const dMemo: string | undefined = data.doctor_memo ?? undefined;
      const aiMsg: Msg = { role: 'ai', text: reply, riskLevel, doctorMemoNeeded: true, doctorMemo: dMemo };
      fadeInMsg(aiMsg);
      setHistory(prev => [...prev, { role: 'user', content: '요약 요청' }, { role: 'assistant', content: reply }]);
      setAiMsgIdx(i => i + 1);
      setTurnCount(t => t + 1);
      if (dMemo) {
        setPendingMemo(dMemo);
        const mainMs = Math.max(4000, reply.length * 150);
        setTimeout(() => {
          setMemoState('asking');
          speak('병원 방문하실 때 의사 선생님께 드릴 메모를 작성해 드릴까요?', 0.82);
        }, mainMs + 600);
      }
    } catch {
      fadeInMsg({ role: 'ai', text: '연결에 실패했습니다.' });
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
    finalTranscriptRef.current = '';
    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscriptRef.current += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      const combined = (finalTranscriptRef.current + interim).trim();
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
          <Text style={s.criticalCardTitle}>지금 즉시 도움을 받으세요</Text>
          <Text style={s.criticalCardDesc}>꿀비가 걱정돼요. 아래 버튼을 눌러주세요.</Text>
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

      {/* 위기 상담 카드 */}
      {showCrisis && (
        <View style={s.crisisCard}>
          <Text style={s.crisisCardTitle}>마음이 많이 힘드신가요?</Text>
          <Text style={s.crisisCardDesc}>전문 선생님과 바로 이야기하실 수 있어요.</Text>
          <TouchableOpacity style={s.crisisCallBtn}
            onPress={() => { if (Platform.OS === 'web') { (window as any).location.href = 'tel:1393'; } else { Linking.openURL('tel:1393'); } }}>
            <Text style={s.crisisCallTxt}>정신건강 위기상담 1393 (24시간 무료)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.crisisDismissBtn} onPress={() => setShowCrisis(false)}>
            <Text style={s.crisisDismissTxt}>닫기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 감정 공감 배너 */}
      {currentIntent === 'emotional' && !loading && displayMsg.role === 'ai' && history.length > 0 && (
        <View style={s.emotionalBanner}>
          <Text style={s.emotionalBannerTxt}>꿀비가 마음으로 함께할게요</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── 메인 바디 ── */}
        <View style={s.body}>

          {/* 상태 표시줄 */}
          {(loading || displayMsg.text !== '') && <View style={s.statusRow}>
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
          </View>}

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

          {/* 메시지 텍스트 — 웰컴(카드) 상태에서는 숨김 */}
          {!isWelcome && (loading || displayMsg.text !== '') ? (
            <ScrollView
              style={s.msgScroll}
              contentContainerStyle={s.msgContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[
                displayMsg.role === 'ai' ? s.aiTxt : s.userTxt,
                loading && s.loadingTxt,
              ]}>
                {loading ? '...' : displayMsg.text}
              </Text>
            </ScrollView>
          ) : (
            !isWelcome && <View style={s.msgPlaceholder} />
          )}

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
          {turnCount >= 2 && !loading && memoState === 'idle' && displayMsg.role === 'ai' && (
            <TouchableOpacity style={s.summaryBtn} onPress={sendForceSummary} activeOpacity={0.8}>
              <Text style={s.summaryBtnTxt}>지금 요약해줘</Text>
            </TouchableOpacity>
          )}

          {/* 2열 빠른 질문 카드 그리드 */}
          {isWelcome && memoState === 'idle' && !loading && (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {Array.from({ length: Math.ceil(QUICK_CARDS.length / 2) }, (_, ri) => (
                <View key={ri} style={s.cardRow}>
                  {QUICK_CARDS.slice(ri * 2, ri * 2 + 2).map(q => (
                    <TouchableOpacity
                      key={q.label}
                      style={[s.cardItem, { backgroundColor: q.bg, borderColor: q.color + '44' }]}
                      onPress={() => send(q.label.replace(/\n/g, ' '))}
                      activeOpacity={0.75}
                    >
                      <Text style={s.cardEmoji}>{q.emoji}</Text>
                      <Text style={[s.cardLabel, { color: q.color }]}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
  body: { flex: 1, flexDirection: 'column', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 6 },

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
  msgScroll:  { flex: 1, flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 60 },
  msgPlaceholder: { flex: 1 },
  msgContent: { paddingBottom: 12 },
  aiTxt:      { fontSize: 28, color: '#16273E', lineHeight: 44, fontWeight: '400' },
  userTxt:    { fontSize: 26, color: '#5E35B1', lineHeight: 40, fontWeight: '500', textAlign: 'right' },
  loadingTxt: { fontSize: 40, color: '#9C27B0', letterSpacing: 6 },

  // 의사 메모 제안
  memoPrompt: {
    backgroundColor: '#F3E5F5', borderRadius: 20, padding: 22, marginBottom: 12,
    borderWidth: 2, borderColor: '#CE93D8', flexShrink: 0,
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
  summaryBtn:    { backgroundColor: '#EDE7F6', borderRadius: 20,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
    borderWidth: 2, borderColor: '#9C27B0' },
  summaryBtnTxt: { fontSize: 20, color: '#7B1FA2', fontWeight: '800' },

  // 2열 카드 그리드
  msgScrollWelcome: { flexGrow: 0, maxHeight: 130 },
  cardGrid:  { paddingBottom: 8, marginTop: 6 },
  cardRow:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cardItem:  {
    flex: 1, borderRadius: 14, padding: 10, minHeight: 66,
    justifyContent: 'center', borderWidth: 1.5, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardEmoji: { fontSize: 22 },
  cardLabel: { fontSize: 15, fontWeight: '800', lineHeight: 22 },

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

  // 위기 상담 카드
  crisisCard: {
    backgroundColor: '#FFF3E0', borderTopWidth: 2, borderBottomWidth: 2,
    borderColor: '#F57C00', padding: 16, alignItems: 'center',
  },
  crisisCardTitle: { fontSize: 20, fontWeight: '800', color: '#E65100', marginBottom: 4 },
  crisisCardDesc:  { fontSize: 17, color: '#6D4C41', marginBottom: 12, textAlign: 'center' },
  crisisCallBtn:   { backgroundColor: '#E65100', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', marginBottom: 10, width: '100%' },
  crisisCallTxt:   { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  crisisDismissBtn: { paddingVertical: 8 },
  crisisDismissTxt: { fontSize: 16, color: '#90A4AE' },

  // 감정 공감 배너
  emotionalBanner: {
    backgroundColor: '#FCE4EC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center', marginBottom: 6,
    borderWidth: 1.5, borderColor: '#F48FB1',
  },
  emotionalBannerTxt: { fontSize: 17, color: '#880E4F', fontWeight: '700', textAlign: 'center' },

  // criticalCard desc 추가
  criticalCardDesc: { fontSize: 16, color: '#C62828', marginBottom: 8, textAlign: 'center' },
});
