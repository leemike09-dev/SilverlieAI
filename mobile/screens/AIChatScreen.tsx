import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useChatSession, SESSION_KEY, MAX_SESSIONS, ChatSession, Msg as ChatMsg, HistoryItem } from '../hooks/useChatSession';
import { useVoice } from '../hooks/useVoice';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Keyboard,
  Animated, Modal, Linking, Alert,
} from 'react-native';
import Lumi, { LumiMood } from '../components/Lumi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { speak, stopSpeech } from '../utils/speech';
import SeniorTabBar from '../components/SeniorTabBar';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };
type ChatSessionProps = {
  userId: string; name: string; seedMood?: string;
  language: any; navigation: any; onNewChat: () => void;
};
type RiskLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';
type Msg = ChatMsg;

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

// ── Lumi 지식베이스 기반 추천 질문 ──────────────────────────────────
const DOMAIN_EMOJI: Record<string, string> = {
  BP: '💗', GLU: '🩸', SLP: '😴', MED: '💊',
  HRT: '💓', RESP: '😤', EXE: '🚶', NUT: '🍽️',
  COG: '🧠', PAIN: '🦴', MOOD: '😔', DEV: '📱',
  SEAS: '🌡️', EMG: '🚨',
};

function buildQuickCards(): { emoji: string; label: string }[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const kb = require('../assets/lumi-chat-kb.json') as { entries: any[] };
    const seen = new Set<string>();
    const result: { emoji: string; label: string }[] = [];
    // approved 우선, 그 다음 review — draft·EMG(응급) 제외
    const sorted = [...kb.entries].sort((a, b) => {
      const rank = { approved: 0, review: 1, draft: 2 };
      return (rank[a.status as keyof typeof rank] ?? 2) - (rank[b.status as keyof typeof rank] ?? 2);
    });
    for (const e of sorted) {
      if (e.domain === 'EMG' || e.status === 'draft') continue;
      if (seen.has(e.domain)) continue;
      seen.add(e.domain);
      const variant = e.variants?.[0] ?? e.intent;
      result.push({ emoji: DOMAIN_EMOJI[e.domain] ?? '💬', label: variant });
      if (result.length >= 8) break;
    }
    return result.length > 0 ? result : QUICK_CARDS_FALLBACK;
  } catch {
    return QUICK_CARDS_FALLBACK;
  }
}

const QUICK_CARDS_FALLBACK = [
  { emoji: '💊', label: '약을 깜박하고 못 먹었어요' },
  { emoji: '💗', label: '혈압이 높게 나왔어요' },
  { emoji: '😔', label: '기분이 울적하고 외로워요' },
  { emoji: '🦴', label: '무릎·관절이 아파요' },
  { emoji: '😴', label: '밤에 잠이 안 와요' },
  { emoji: '😵', label: '어지럽고 쓰러질 것 같아요' },
  { emoji: '🍽️', label: '밥맛이 없고 식욕이 없어요' },
  { emoji: '🚶', label: '오늘 산책해도 될까요?' },
];

const QUICK_CARDS = buildQuickCards();

// ── Intent 분류 ──
type Intent = 'emergency' | 'crisis' | 'emotional' | 'cognitive' | 'health' | 'daily';

// EMERGENCY_KW — KB urgent entries의 keywords에서 단일 생성 (이원화 방지)
function buildEmergencyKw(): string[] {
  try {
    const kb = require('../assets/lumi-chat-kb.json') as { entries: any[] };
    const kws = kb.entries
      .filter((e: any) => e.riskLevel === 'urgent' && Array.isArray(e.keywords))
      .flatMap((e: any) => e.keywords as string[]);
    return kws.length > 0 ? kws : EMERGENCY_KW_FALLBACK;
  } catch {
    return EMERGENCY_KW_FALLBACK;
  }
}
// KB 로드 실패 시 최소 보호망
const EMERGENCY_KW_FALLBACK = [
  '가슴이 아파', '가슴이 답답', '숨이 차', '호흡곤란',
  '넘어졌', '쓰러질 것', '뇌졸중', '심정지',
  '팔에 힘이 없', '말이 어눌', '119 불러', '응급실 가야',
];
const EMERGENCY_KW: string[] = buildEmergencyKw();

// 응급 게이트 정밀화 — 백엔드 is_urgent_bypass()와 동일 로직
const _NOW_KW    = ['지금', '방금', '갑자기', '지금 당장', '이 순간', '지금 막', '막 시작'];
const _PAST_RE   = /\d+\s*(?:개월|달|년|주일?)\s*전|예전에?|과거에?|어렸을\s*때|작년|재작년|지난\s*해|지난\s*달|지난번에?/;
const _HIST_KW   = ['병력', '가족력', '수술했었', '쓰러진 적', '진단받았었', '앓으셨', '돌아가셨', '세상을 떠나', '기왕력'];

function isEmergencySignal(msg: string): boolean {
  if (!EMERGENCY_KW.some(k => msg.includes(k))) return false;
  if (_NOW_KW.some(k => msg.includes(k))) return true;                              // 현재성 → 무조건 응급
  if (_PAST_RE.test(msg) || _HIST_KW.some(k => msg.includes(k))) return false;     // 과거/이력 → 제외
  return true;                                                                       // 애매 → 응급 유지
}

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

// 건강 프로필 정규화: 프론트 문자열 → 백엔드 기대 배열 형식 변환
function normalizeProfile(p: any): any {
  if (!p) return null;
  return {
    ...p,
    diseases: typeof p.diseases === 'string'
      ? p.diseases.split(',').map((s: string) => s.trim()).filter(Boolean)
      : (p.diseases || []),
    drugAllergies: typeof p.allergies === 'string' && p.allergies
      ? [p.allergies]
      : (p.drugAllergies || []),
  };
}

function classifyIntent(msg: string, history: HistoryItem[]): Intent {
  if (isEmergencySignal(msg)) return 'emergency';
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
  if (h < 18) return `${name}님, 오후도 잘 보내고 계신가요? 무엇이든 편하게 물어보세요. 저 루미가 여기 있어요.`;
  if (h < 21) return `${name}님, 좋은 저녁이에요! 오늘 하루 어떠셨나요? 무엇이든 편하게 이야기해요.`;
  return `${name}님, 편안한 밤 되세요. 잠 자기 전 건강이나 걱정되는 것 있으시면 언제든 말씀해요.`;
}

const MOOD_LABELS = ['좋아요', '평온해요', '그저그래요', '걱정돼요', '힘들어요'];

async function readHealthRecords7d(userId: string): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(`health_records.${userId}`);
    if (!raw) return [];
    const recs: any[] = JSON.parse(raw);
    return recs.slice(0, 7).map(r => ({
      date:                     r.date,
      blood_pressure_systolic:  r.blood_pressure_systolic  ?? null,
      blood_pressure_diastolic: r.blood_pressure_diastolic ?? null,
      blood_sugar:              r.blood_sugar   ?? null,
      steps:                    r.steps         ?? null,
      sleep_hours:              r.sleep_hours   ?? null,
      heart_rate:               r.heart_rate    ?? null,
      weight:                   r.weight        ?? null,
    })).filter(r => !!r.date);
  } catch {
    return [];
  }
}

function ChatSessionView({ userId, name, seedMood = '', language, navigation, onNewChat }: ChatSessionProps) {
  const insets = useSafeAreaInsets();

  const [messages,     setMessages]     = useState<Msg[]>([]);
  const [history,      setHistory]      = useState<HistoryItem[]>([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showEmergency,   setShowEmergency]   = useState(false);
  const [familyNotified,  setFamilyNotified]  = useState(false);
  const [memoState,    setMemoState]    = useState<'idle' | 'asking' | 'saved'>('idle');
  const [pendingMemo,  setPendingMemo]  = useState<string>('');
  const [toastMsg,     setToastMsg]     = useState('');
  const [turnCount,    setTurnCount]    = useState(0);
  const [currentIntent, setCurrentIntent] = useState<Intent>('health');
  const [showCrisis,    setShowCrisis]    = useState(false);
  const [healthProfile,    setHealthProfile]    = useState<any>(null);
  const [healthRecord,     setHealthRecord]     = useState<any>(null);
  const [medications,      setMedications]      = useState<any[]>([]);
  const [todayMood,        setTodayMood]        = useState<string | undefined>(undefined);
  const [ttsEnabled,      setTtsEnabled]      = useState(true);
  const [pendingConditions, setPendingConditions] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion]   = useState<{
    id: string; fact_type: string; verbatim: string;
  } | null>(null);
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianLabel, setGuardianLabel] = useState('');
  const [profilePrompt, setProfilePrompt] = useState<{
    fieldKey: string; question: string; chips: string[];
  } | null>(null);
  const sessionAskedRef      = useRef<Set<string>>(new Set());
  const profilePromptCountRef = useRef(0);

  const weatherRef   = useRef<string | undefined>(undefined);
  const sessionIdRef = useRef<string>(Date.now().toString());
  const historyRef   = useRef<HistoryItem[]>([]);
  const turnCountRef = useRef<number>(0);

  const scrollRef      = useRef<ScrollView>(null);
  const dotsAnim       = useRef(new Animated.Value(0)).current;
  const toastTimerRef  = useRef<any>(null);
  const prevInputRef   = useRef<string>('');


  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2500);
  };

  // 세션 관리 훅
  const { sessions, setSessions, loadSessions, deleteSession } = useChatSession({
    messages, history, turnCountRef, sessionIdRef,
    onNewSession: () => {}, // key remount이 상태 초기화를 담당 — 수동 나열 불필요
  });

  // 음성 입력 훅
  const { isRecording, pulseAnim, toggleVoice, stopVoice } = useVoice({
    onTranscript: (text) => { prevInputRef.current = text; setInput(text); },
    onSend: (text) => send(text),
    showToast,
  });

  const isWelcome = messages.length === 0 && !loading;
  const [showPastChats, setShowPastChats] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedMsgs, setExpandedMsgs] = useState<Set<number>>(new Set());
  const MSG_COLLAPSE_LEN = 120; // 이 글자 수 이상이면 접기
  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai');

  const lumiMood = (): LumiMood => {
    if (loading) return 'focused';
    if (!lastAiMsg) return 'happy';
    const r = lastAiMsg.riskLevel;
    if (r === 'critical' || r === 'high') return 'worried';
    return 'happy';
  };

  // 초기 로드: 건강프로필 + 건강기록 + 약 목록 + TTS + 보호자 + 세션 복원
  useEffect(() => {
    // 보호자 전화번호 — 응급 모달에서 직접 전화 연결
    AsyncStorage.getItem(`guardians.${userId}`).then(raw => {
      if (!raw) return;
      try {
        const list: { name: string; relation: string; phoneNumber?: string }[] = JSON.parse(raw);
        const first = list.find(g => g.phoneNumber);
        if (first) {
          setGuardianPhone(first.phoneNumber!);
          setGuardianLabel(`${first.name}(${first.relation})`);
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    }).catch(() => {});

    const todayKey = localDate();
    Promise.all([
      AsyncStorage.getItem('health_profile'),
      AsyncStorage.getItem('tts_enabled'),
      AsyncStorage.getItem(`health_records.${userId}`),
      AsyncStorage.getItem(`medications.${userId}`),
      AsyncStorage.getItem(`mood.${userId}.${todayKey}`),
    ]).then(([hp, tts, hr, meds, moodRaw]) => {
      if (hp)  { try { setHealthProfile(JSON.parse(hp)); } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } } }
      if (tts !== null) setTtsEnabled(tts === 'true');
      if (hr)  {
        try {
          const recs: any[] = JSON.parse(hr);
          if (recs.length > 0) {
            const l = recs[0];
            setHealthRecord({
              blood_pressure_systolic:  l.blood_pressure_systolic  ?? null,
              blood_pressure_diastolic: l.blood_pressure_diastolic ?? null,
              blood_sugar:  l.blood_sugar   ?? null,
              steps:        l.steps         ?? null,
              sleep_hours:  l.sleep_hours   ?? null,
              heart_rate:   l.heart_rate    ?? null,
              weight:       l.weight        ?? null,
              date:         l.date,
            });
          }
        } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      }
      if (meds) { try { setMedications(JSON.parse(meds)); } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } } }
      if (moodRaw !== null) {
        const idx = parseInt(moodRaw, 10);
        if (!isNaN(idx) && idx >= 0 && idx < MOOD_LABELS.length) {
          setTodayMood(MOOD_LABELS[idx]);
        }
      }

      // 세션 기록 로드
      loadSessions();
    });

    // 기분 seed: 홈 기분 체크인에서 부정 기분 선택 후 진입 시에만 메시지 표시
    if (seedMood) {
      setTimeout(() => {
        addMsg({
          role: 'ai',
          text: `${name}님, ${seedMood}이라고 하셨군요. 마음이 좀 무거우시겠어요 💜\n어떤 일이 있으셨는지 편하게 말씀해 주세요. 제가 잘 들을게요.`,
          riskLevel: 'low',
        });
      }, 400);
    }

    // 날씨 조회: getLastKnownPositionAsync로 즉시 반환 (GPS 대기 없음)
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        // 캐시된 위치 즉시 사용, 없으면 저정밀도로 빠르게 조회
        let pos = await Location.getLastKnownPositionAsync();
        if (!pos) {
          pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        }
        if (!pos) return;
        const res = await fetch(
          `${API_URL}/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.summary) { weatherRef.current = data.summary; }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    })();

    return () => { stopSpeech(); };
  }, []);

  // refs 최신 상태 동기화 (stale closure 방지)
  useEffect(() => { historyRef.current   = history;    }, [history]);
  useEffect(() => { turnCountRef.current = turnCount;  }, [turnCount]);

  const startNewSession = () => {
    stopSpeech();
    onNewChat(); // key 교체 → ChatSessionView 전체 remount → 모든 상태 자동 초기화
  };

  const switchSession = (sess: ChatSession) => {
    stopSpeech();
    sessionIdRef.current = sess.id;
    setMessages(sess.messages);
    setHistory(sess.history);
    setTurnCount(sess.turnCount);
    setMemoState('idle');
    setShowPastChats(false);
    setExpandedSessionId(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  };

  // 화면 벗어날 때 오늘 대화 자동 요약 (3턴 이상일 때만)
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!userId || userId === 'guest' || turnCountRef.current < 2) return;
        fetch(`${API_URL}/ai/summary/${userId}`, { method: 'POST' }).catch(() => {});
      };
    }, [userId])
  );

  // 재진입 시 remount는 App.tsx getId()가 처리 — 여기서 별도 reset 불필요

  // Render 콜드스타트 방지 Keep-alive (진입 즉시 + 13분마다 ping)
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/`).catch(() => {});
    ping(); // 화면 진입 시 즉시 서버 깨우기
    const id = setInterval(ping, 13 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

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


  // ─── 대화형 프로필 수집 트리거 ─────────────────────────────────────────────
  // 우선순위: 혈액형 → 알레르기 → 비상연락 → 루틴 → 말투 → 호칭
  const PROFILE_QUEUE = [
    {
      key: 'bloodType',
      question: '혈액형을 알고 계세요? 응급 때 꼭 필요해요.',
      chips: ['A형', 'B형', 'O형', 'AB형', '모르겠어요', '나중에'],
    },
    {
      key: 'allergies',
      question: '약이나 음식 알레르기가 있으신가요?',
      chips: ['없어요', '있어요 →', '나중에'],
    },
    {
      key: 'guardian',
      question: '비상연락처(보호자)를 등록해 두시면 더 안심이에요.',
      chips: ['지금 등록할게요 →', '나중에'],
    },
    {
      key: 'routine',
      question: '보통 몇 시쯤 일어나세요?',
      chips: ['5~6시', '6~7시', '7~8시', '8시 이후', '나중에'],
    },
    {
      key: 'speechStyle',
      question: '루미가 어떻게 말씀드리면 편하실까요?',
      chips: ['정중하게', '친근하게', '나중에'],
    },
    {
      key: 'address',
      question: '루미가 어르신을 어떻게 불러드릴까요?',
      chips: [...(name ? [`${name}님`] : []), '어르신', '편하게', '나중에'],
    },
  ] as const;

  useEffect(() => {
    // 2턴, 5턴에서만 자연스러운 틈에 수집
    if (turnCount !== 2 && turnCount !== 5) return;
    if (loading) return;
    // 응급·위기·감정호소 중 프로필 질문 금지
    if (currentIntent === 'emergency' || currentIntent === 'crisis' || currentIntent === 'emotional') return;
    if (profilePromptCountRef.current >= 2) return;
    if (memoState !== 'idle') return;
    if (pendingConditions.length > 0) return;
    if (profilePrompt !== null) return;

    const hp = healthProfile || {};
    for (const item of PROFILE_QUEUE) {
      if (sessionAskedRef.current.has(item.key)) continue;
      let missing = false;
      if (item.key === 'bloodType')   missing = !hp.bloodType;
      if (item.key === 'allergies')   missing = !hp.allergies;
      if (item.key === 'guardian')    missing = !guardianPhone;
      if (item.key === 'routine')     missing = !(hp.routine?.wakeAt);
      if (item.key === 'speechStyle') missing = !hp.speechStyle;
      if (item.key === 'address')     missing = !hp.address;
      if (missing) {
        setProfilePrompt({ fieldKey: item.key, question: item.question, chips: [...item.chips] });
        profilePromptCountRef.current += 1;
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnCount]);

  const handleProfileAnswer = async (fieldKey: string, value: string) => {
    setProfilePrompt(null);
    sessionAskedRef.current.add(fieldKey);

    if (value === '나중에') return;

    // 내비게이션 케이스
    if (fieldKey === 'guardian' || value === '지금 등록할게요 →') {
      navigation.navigate('Guardian', { userId });
      return;
    }
    if (fieldKey === 'allergies' && value === '있어요 →') {
      navigation.navigate('HealthProfile', { userId });
      return;
    }

    // 프로필 저장
    try {
      const raw = await AsyncStorage.getItem('health_profile');
      const prof = raw ? JSON.parse(raw) : {};
      const sources = prof.fieldSources || {};

      if (fieldKey === 'bloodType') {
        prof.bloodType = value;  // 'A형' 등
        sources.bloodType = 'self';
      } else if (fieldKey === 'allergies') {
        prof.allergies = '없음';
        sources.allergies = 'self';
      } else if (fieldKey === 'routine') {
        const wakeMap: Record<string, string> = {
          '5~6시': '05:30', '6~7시': '06:30', '7~8시': '07:30', '8시 이후': '08:30',
        };
        prof.routine = { ...(prof.routine || {}), wakeAt: wakeMap[value] || '' };
        sources.routine = 'self';
      } else if (fieldKey === 'speechStyle') {
        prof.speechStyle = value;
        sources.speechStyle = 'self';
      } else if (fieldKey === 'address') {
        prof.address = value;
        sources.address = 'self';
      }

      prof.fieldSources = sources;
      await AsyncStorage.setItem('health_profile', JSON.stringify(prof));
      setHealthProfile(prof);
      showToast('✓ 저장됐어요');
    } catch {}
  };

  const addMsg = (msg: Msg) => {
    setMessages(prev => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const fetchProactiveGreeting = async () => {
    const today = localDate();
    const [lastDate, cached] = await Promise.all([
      AsyncStorage.getItem('ai_greeting_date'),
      AsyncStorage.getItem('ai_greeting_cache'),
    ]);

    // 오늘 이미 인사했으면 조용히 넘김 (버블·TTS 없음, 퀵카드만 표시)
    if (lastDate === today && cached) return;

    const fallback = getGreeting(name);
    const save = async (msg: string) => {
      await AsyncStorage.setItem('ai_greeting_date', today);
      await AsyncStorage.setItem('ai_greeting_cache', msg);
    };

    // 첫 방문: 버블 없음 → messages 배열 비어 있어 퀵카드 유지
    if (!userId || userId === 'guest') {
      await save(fallback);
      return;
    }
    try {
      const res  = await fetch(`${API_URL}/ai/proactive-greeting/${userId}`);
      const data = await res.json();
      const msg  = data.message || fallback;
      await save(msg);
    } catch {
      await save(fallback);
    }
  };

  const handleTextChange = (text: string) => {
    // 완전 중복만 차단 (IME가 동일 텍스트를 두 번 보낼 때)
    if (text === prevInputRef.current + prevInputRef.current && prevInputRef.current.length > 0) {
      return;
    }
    prevInputRef.current = text;
    setInput(text);
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    // 게스트 5회 제한
    if (userId === 'guest' && turnCount >= 5) {
      if (Platform.OS === 'web') {
        window.alert('로그인하면 계속 이용할 수 있어요.\n로그인 후 무제한으로 상담할 수 있습니다.');
      } else {
        Alert.alert('이용 제한', '로그인하면 계속 이용할 수 있어요.\n로그인 후 무제한으로 상담할 수 있습니다.', [
          { text: '로그인하기', onPress: () => navigation.navigate('Login') },
          { text: '닫기', style: 'cancel' },
        ]);
      }
      return;
    }

    setInput('');
    prevInputRef.current = '';
    Keyboard.dismiss();
    stopSpeech();
    if (memoState !== 'saved') setMemoState('idle');

    const detectedIntent = classifyIntent(msg, history);
    setCurrentIntent(detectedIntent);

    const OTHER_KW = ['친구', '이웃', '지인', '남편', '아내', '아들', '딸', '부모님', '형제', '어머니', '아버지', '누나', '오빠', '언니', '동생', '손녀', '손자'];
    const SELF_KW  = ['저는', '저도', '제가', '나는', '내가', '저한테', '저한', '본인'];
    const isAboutOthers = OTHER_KW.some(k => msg.includes(k)) && !SELF_KW.some(k => msg.includes(k));

    if (detectedIntent === 'emergency') {
      const emMsg = `${name}님, 지금 많이 불편하신가요? 걱정이 돼요. 아래 버튼으로 즉시 도움을 받으세요.`;
      addMsg({ role: 'user', text: msg });
      addMsg({ role: 'ai', text: emMsg, riskLevel: 'critical' });
      speak(cleanForTTS(emMsg));
      setShowEmergency(true);
      return;
    }
    if (detectedIntent === 'crisis') {
      const crisisMsg = `${name}님, 지금 많이 힘드신 거 느껴져요. 저 루미가 여기 있어요. 혼자 감당하지 않아도 돼요.`;
      addMsg({ role: 'user', text: msg });
      addMsg({ role: 'ai', text: crisisMsg });
      speak(cleanForTTS(crisisMsg));
      setShowCrisis(true);
    } else {
      addMsg({ role: 'user', text: msg });
    }

    setLoading(true);
    const newHistory: HistoryItem[] = [...history, { role: 'user', content: msg }];

    // 빈 AI 메시지 선점 (스트리밍 채움용)
    setMessages(prev => [...prev, { role: 'ai', text: '' }]);

    const records7d = await readHealthRecords7d(userId);

    const normalizedProfile = normalizeProfile(healthProfile);

    const chatBody = {
      user_id: userId, message: msg, history: history.slice(-10),
      turn_count: turnCount, force_summary: false,
      intent: detectedIntent,
      client_profile:    normalizedProfile,
      client_record:     healthRecord,
      client_records_7d: records7d.length > 0 ? records7d : undefined,
      client_meds:       medications.length > 0 ? medications : undefined,
      client_weather:    weatherRef.current,
      client_mood:       todayMood,
      language,
    };

    const fetchStream = () => fetch(`${API_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody),
    });

    const applyResult = (cleanText: string, riskLevel: RiskLevel, dMemo: string | undefined, dMemoNeeded: boolean, isFinal: boolean, sosSent: boolean, profileUpdates: string[]) => {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'ai', text: cleanText, riskLevel, doctorMemoNeeded: dMemoNeeded, doctorMemo: dMemo };
        return next;
      });
      setHistory([...newHistory, { role: 'assistant', content: cleanText }]);
      setTurnCount(t => t + 1);
      if (ttsEnabled) speak(cleanForTTS(cleanText), 0.82, 0.88);
      if (riskLevel === 'critical') { setShowEmergency(true); if (sosSent) setFamilyNotified(true); }
      if (!isAboutOthers && memoState === 'idle' && riskLevel !== 'normal' && detectedIntent !== 'daily' &&
          ((isFinal && dMemo) || (dMemoNeeded && dMemo && ['medium','high','critical'].includes(riskLevel)))) {
        setPendingMemo(dMemo!);
        const mainMs = ttsEnabled ? Math.min(Math.max(3000, cleanText.length * 80), 8000) : 1500;
        setTimeout(() => setMemoState('asking'), mainMs);
      }
      if (profileUpdates.length > 0) setPendingConditions(profileUpdates);
    };

    const callNonStreaming = async () => {
      const r = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
      });
      if (!r.ok) throw new Error('api error');
      const data = await r.json();
      const cleanText = stripEmoji(data.reply) || '죄송합니다, 다시 시도해주세요.';
      applyResult(cleanText, data.risk_level ?? 'normal', data.doctor_memo ?? undefined,
                  data.doctor_memo_needed ?? false, data.is_final ?? false,
                  data.sos_sent ?? false, data.profile_updates || []);
    };

    try {
      let res = await fetchStream();
      // 서버 콜드스타트 → 5초 대기 후 재시도
      if (!res.ok || !res.body) {
        await new Promise(r => setTimeout(r, 5000));
        res = await fetchStream();
      }

      if (!res.ok) throw new Error('server error');

      // React Native에서 res.body가 null이면 비스트리밍 폴백
      if (!res.body) {
        await callNonStreaming();
      } else {
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const data = JSON.parse(payload);
            if (data.token) {
              accumulated += data.token;
              const partial = stripEmoji(accumulated);
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'ai', text: partial };
                return next;
              });
              scrollRef.current?.scrollToEnd({ animated: false });
            }
            if (data.done || data.error) {
              const riskLevel  = (data.risk_level ?? 'normal') as RiskLevel;
              const dMemo: string | undefined = data.doctor_memo ?? undefined;
              const dMemoNeeded: boolean = data.doctor_memo_needed ?? false;
              const isFinal: boolean     = data.is_final ?? false;
              const cleanText = stripEmoji(accumulated) || '죄송합니다, 다시 시도해주세요.';
              applyResult(cleanText, riskLevel, dMemo, dMemoNeeded, isFinal,
                          data.sos_sent ?? false, data.profile_updates || []);
              // Phase 2: 승격 후보 — 다른 카드 없을 때만 노출
              const cands = data.promotion_candidates || [];
              if (cands.length > 0) {
                setPendingPromotion({ id: cands[0].id, fact_type: cands[0].fact_type, verbatim: cands[0].verbatim });
              }
            }
          } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
        }
      }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'ai' && last.text === '') {
          next[next.length - 1] = { role: 'ai', text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.' };
        } else {
          next.push({ role: 'ai', text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.' });
        }
        return next;
      });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };


  const sendForceSummary = async () => {
    if (loading || turnCount < 1) return;
    stopSpeech();
    setMemoState('idle');
    addMsg({ role: 'user', text: '지금까지 내용을 요약해 주세요' });
    setLoading(true);
    setMessages(prev => [...prev, { role: 'ai', text: '' }]);

    const summaryBody = {
      user_id: userId, message: '지금까지 증상을 요약해 주세요',
      history: history.slice(-10), turn_count: turnCount,
      force_summary: true, client_profile: normalizeProfile(healthProfile),
      intent: currentIntent, client_mood: todayMood,
      client_record: healthRecord, client_weather: weatherRef.current,
    };
    const doFetch = () => fetch(`${API_URL}/ai/chat/stream`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summaryBody),
    });

    try {
      let res = await doFetch();
      // 서버 콜드스타트 → 5초 대기 후 재시도
      if (!res.ok || !res.body) {
        await new Promise(r => setTimeout(r, 5000));
        res = await doFetch();
      }
      if (!res.ok) throw new Error('server error');

      // React Native에서 res.body null → 비스트리밍 폴백
      if (!res.body) {
        const fallback = await fetch(`${API_URL}/ai/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(summaryBody),
        });
        if (!fallback.ok) throw new Error('fallback error');
        const data = await fallback.json();
        const cleanText = stripEmoji(data.reply) || '요약 실패. 다시 시도해주세요.';
        setMessages(prev => { const next=[...prev]; next[next.length-1]={ role:'ai', text:cleanText }; return next; });
        setHistory(prev => [...prev, { role:'user', content:'요약 요청' }, { role:'assistant', content:cleanText }]);
        setTurnCount(t => t + 1);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const data = JSON.parse(payload);
            if (data.token) {
              accumulated += data.token;
              const partial = stripEmoji(accumulated);
              setMessages(prev => { const next = [...prev]; next[next.length-1] = { role: 'ai', text: partial }; return next; });
              scrollRef.current?.scrollToEnd({ animated: false });
            }
            if (data.done || data.error) {
              const riskLevel = (data.risk_level ?? 'normal') as RiskLevel;
              const dMemo: string | undefined = data.doctor_memo ?? undefined;
              const cleanText = stripEmoji(accumulated) || '요약 실패. 다시 시도해주세요.';
              setMessages(prev => { const next=[...prev]; next[next.length-1]={ role:'ai', text:cleanText, riskLevel, doctorMemoNeeded:true, doctorMemo:dMemo }; return next; });
              setHistory(prev => [...prev, { role:'user', content:'요약 요청' }, { role:'assistant', content:cleanText }]);
              setTurnCount(t => t + 1);
              if (cleanText) {
                setPendingMemo(dMemo || cleanText);
                const mainMs = ttsEnabled ? Math.min(Math.max(3000, cleanText.length * 80), 8000) : 1500;
                setTimeout(() => setMemoState('asking'), mainMs);
              }
            }
          } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
        }
      }
    } catch {
      setMessages(prev => { const next=[...prev]; next[next.length-1]={ role:'ai', text:'연결에 실패했습니다.' }; return next; });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };


  const handleMemoYes = async () => {
    setMemoState('saved');
    try {
      const cleanMemo = pendingMemo
        .replace(/지금까지\s*(증상을|내용을|이야기를)?\s*요약해\s*(주세요|줘)[.。]?\s*/g, '')
        .trim();
      const nowDate = new Date();
      const now = nowDate.toISOString();
      const localDateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth()+1).padStart(2,'0')}-${String(nowDate.getDate()).padStart(2,'0')}`;
      const newItem = { id: now, createdAt: now, localDate: localDateStr, memo: cleanMemo, opinion: '' };
      const raw = await AsyncStorage.getItem('doctor_memos');
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [newItem, ...existing].slice(0, 10);
      await AsyncStorage.setItem('doctor_memos', JSON.stringify(updated));
      showToast('메모가 저장되었습니다');
    } catch { showToast('저장에 실패했습니다'); }
  };

  const handleMemoNo = () => {
    setMemoState('idle');
  };

  const handleConditionSave = async () => {
    try {
      const raw = await AsyncStorage.getItem('health_profile');
      const profile = raw ? JSON.parse(raw) : {};
      const existing: string[] = profile.diseases || profile.chronic_diseases || [];
      profile.diseases = Array.from(new Set([...existing, ...pendingConditions]));
      await AsyncStorage.setItem('health_profile', JSON.stringify(profile));
      showToast(`${pendingConditions.join(', ')} 프로필에 저장됐어요 ✅`);
    } catch { showToast('저장에 실패했습니다'); }
    setPendingConditions([]);
  };

  // Phase 2: 승격 배너 핸들러
  const handlePromotionAccept = async () => {
    if (!pendingPromotion) return;
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const r = await fetch(`${API_URL}/ai/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            observation_id: pendingPromotion.id,
            action: 'accept',
            fact_type: pendingPromotion.fact_type,
            verbatim: pendingPromotion.verbatim,
          }),
        });
        if (r.ok) {
          // 로컬 health_profile 업데이트
          const raw = await AsyncStorage.getItem('health_profile');
          const prof = raw ? JSON.parse(raw) : {};
          const now = new Date().toISOString();
          const existing = prof.confirmedObservations || [];
          if (!existing.find((o: any) => o.id === pendingPromotion.id)) {
            prof.confirmedObservations = [...existing, {
              id: pendingPromotion.id,
              fact_type: pendingPromotion.fact_type,
              verbatim: pendingPromotion.verbatim,
              confirmed_at: now,
              source: 'self-confirmed',
            }];
            if (pendingPromotion.fact_type === '가족력') {
              const fh = prof.familyHistory || [];
              if (!fh.includes(pendingPromotion.verbatim)) {
                prof.familyHistory = [...fh, pendingPromotion.verbatim];
              }
            }
            await AsyncStorage.setItem('health_profile', JSON.stringify(prof));
          }
          showToast('기억해 둘게요');
        }
      }
    } catch {}
    setPendingPromotion(null);
  };

  const handlePromotionReject = async () => {
    if (!pendingPromotion) return;
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        fetch(`${API_URL}/ai/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, observation_id: pendingPromotion.id, action: 'reject' }),
        }).catch(() => {});
      }
    } catch {}
    setPendingPromotion(null);
  };


  const call119 = () => {
    if (Platform.OS === 'web') window.location.href = 'tel:119';
    else Linking.openURL('tel:119');
  };

  return (
    <LinearGradient colors={['#F1ECE4', '#FBF8F3']} style={s.root}>
      {/* ── 탑바 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 4, 14) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.topTitle}>루미와 대화</Text>
        </View>
        <TouchableOpacity style={s.newChatBtn} onPress={startNewSession} activeOpacity={0.8}>
          <Text style={s.newChatTxt}>새 대화</Text>
        </TouchableOpacity>
      </View>

      {/* CRITICAL 배너 */}
      {showEmergency && (
        <View style={s.criticalCard}>
          <Text style={s.criticalCardTitle}>지금 즉시 도움을 받으세요</Text>
          <Text style={s.criticalCardDesc}>루미가 걱정돼요. 아래 버튼을 눌러주세요.</Text>
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
      {currentIntent === 'emotional' && !loading && !!lastAiMsg && history.length > 0 && (
        <View style={s.emotionalBanner}>
          <Text style={s.emotionalBannerTxt}>루미가 마음으로 함께할게요</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}>
        {/* ── 메인 바디 ── */}
        <View style={s.body}>

                    {/* 위험 배너 */}
          {lastAiMsg?.riskLevel === 'critical' && (
            <TouchableOpacity style={s.bannerCritical} onPress={() => setShowEmergency(true)}>
              <Text style={s.bannerCriticalTxt}>즉시 119 또는 응급실이 필요합니다</Text>
            </TouchableOpacity>
          )}
          {lastAiMsg?.riskLevel === 'high' && (
            <View style={s.bannerHigh}>
              <Text style={s.bannerHighTxt}>오늘 안에 병원 방문을 강력히 권고합니다</Text>
            </View>
          )}
          {lastAiMsg?.riskLevel === 'medium' && (
            <View style={s.bannerMedium}>
              <Text style={s.bannerMediumTxt}>증상이 지속되면 병원 방문을 권장합니다</Text>
            </View>
          )}

          {/* 대화 버블 리스트 */}
          {!isWelcome && (
            <ScrollView
              ref={scrollRef}
              style={s.msgScroll}
              contentContainerStyle={s.msgContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 이전 세션은 "이전 대화 보기" 패널에서만 확인 가능 — 인라인 노출 제거 */}

              {messages.map((msg, i) => {
                const isStreaming = i === messages.length - 1 && msg.role === 'ai' && loading && msg.text === '';
                const isLastAi   = msg.role === 'ai' && i === [...messages].map((m,j)=>m.role==='ai'?j:-1).filter(j=>j>=0).pop();
                const isLong     = msg.role === 'ai' && !isStreaming && msg.text.length > MSG_COLLAPSE_LEN;
                const isExpanded = expandedMsgs.has(i);
                const displayTxt = isLong && !isExpanded
                  ? msg.text.slice(0, MSG_COLLAPSE_LEN) + '…'
                  : msg.text;
                return (
                  <View key={i} style={msg.role === 'ai' ? s.aiRow : s.userRow}>
                    {msg.role === 'ai' && (
                      <Lumi mood={lumiMood()} size={52} bob={false} />
                    )}
                    <View style={msg.role === 'ai' ? s.aiBubble : s.userBubble}>
                      {msg.role === 'ai' && <Text style={s.bubbleName}>루미</Text>}
                      <Text selectable style={msg.role === 'ai' ? s.aiTxt : s.userTxt}>
                        {isStreaming ? (
                          <Animated.Text style={{ opacity: dotsAnim.interpolate({ inputRange:[0,1], outputRange:[0.3,1] }) }}>
                            ···
                          </Animated.Text>
                        ) : displayTxt}
                      </Text>
                      {isLong && (
                        <TouchableOpacity
                          onPress={() => setExpandedMsgs(prev => {
                            const next = new Set(prev);
                            isExpanded ? next.delete(i) : next.add(i);
                            return next;
                          })}
                          style={s.expandBtn} activeOpacity={0.7}>
                          <Text style={s.expandBtnTxt}>{isExpanded ? '접기 ▲' : '더 보기 ▼'}</Text>
                        </TouchableOpacity>
                      )}
                      {/* TTS 버튼: 마지막 AI 메시지에만 표시 */}
                      {msg.role === 'ai' && isLastAi && !isStreaming && msg.text.length > 0 && ttsEnabled && (
                        <TouchableOpacity
                          onPress={() => speak(cleanForTTS(msg.text), 0.82, 0.88)}
                          style={s.ttsBtnInline}
                          activeOpacity={0.7}>
                          <Text style={s.ttsBtnTxt}>🔊</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* 만성질환 감지 확인 카드 */}
          {pendingConditions.length > 0 && memoState === 'idle' && (
            <View style={s.condCard}>
              <Text style={s.condTitle}>건강 정보가 감지됐어요 💊</Text>
              <Text style={s.condBody}>{pendingConditions.join(', ')}</Text>
              <Text style={s.condSub}>프로필에 저장하면 다음 대화부터 맞춤 답변을 드려요</Text>
              <View style={s.condBtns}>
                <TouchableOpacity style={s.condYes} onPress={handleConditionSave} activeOpacity={0.8}>
                  <Text style={s.condYesTxt}>네, 저장해요</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.condNo} onPress={() => setPendingConditions([])} activeOpacity={0.8}>
                  <Text style={s.condNoTxt}>괜찮아요</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Phase 2: 관찰 승격 제안 배너 */}
          {pendingPromotion && memoState === 'idle' && pendingConditions.length === 0 && (
            <View style={s.obsCard}>
              <Text style={s.obsTitle}>루미가 기억해 둘까요?</Text>
              <Text style={s.obsVerbatim}>"{pendingPromotion.verbatim}"</Text>
              <Text style={s.obsSub}>이전 대화에서 말씀하신 내용이에요. 저장하면 다음에도 기억해요.</Text>
              <View style={s.obsBtns}>
                <TouchableOpacity style={s.obsYes} onPress={handlePromotionAccept} activeOpacity={0.8}>
                  <Text style={s.obsYesTxt}>네, 저장해요</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.obsNo} onPress={handlePromotionReject} activeOpacity={0.8}>
                  <Text style={s.obsNoTxt}>괜찮아요</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.obsSnooze} onPress={() => setPendingPromotion(null)} activeOpacity={0.8}>
                  <Text style={s.obsSnoozeTxt}>나중에</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 대화형 프로필 수집 카드 */}
          {profilePrompt && memoState === 'idle' && !loading && pendingConditions.length === 0 && (
            <View style={s.ppCard}>
              <Text style={s.ppQ}>💜 {profilePrompt.question}</Text>
              <View style={s.ppChips}>
                {profilePrompt.chips.map(chip => (
                  <TouchableOpacity
                    key={chip}
                    style={[s.ppChip, chip === '나중에' && s.ppChipSkip]}
                    onPress={() => handleProfileAnswer(profilePrompt.fieldKey, chip)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.ppChipTxt, chip === '나중에' && s.ppChipSkipTxt]}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
          {turnCount >= 5 && !loading && memoState === 'idle' && !!lastAiMsg && currentIntent !== 'daily' && (
            <TouchableOpacity style={s.summaryBtn} onPress={sendForceSummary} activeOpacity={0.8}>
              <Text style={s.summaryBtnTxt}>지금 요약해줘</Text>
            </TouchableOpacity>
          )}

          {/* 웰컴 상태: 루미 + 인사 + 빠른 질문 */}
          {isWelcome && memoState === 'idle' && !loading && (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8, alignItems: 'center' }}>

              {/* 루미 크게 196px */}
              <Lumi mood={lumiMood()} size={196} bob />
              <Text style={s.lumiWelcomeName}>루미</Text>

              {/* 컨텍스트 pill */}
              <View style={s.contextPill}>
                <View style={s.contextPillDot} />
                <Text style={s.contextPillTxt}>건강 · 약 · 일정 · 위치 기록을 모두 참고해요</Text>
              </View>

              <View style={s.lumiGreetBubble}>
                <Text style={s.lumiGreetTxt}>{getGreeting(name)}</Text>
              </View>

              {/* 이전 대화 보기 버튼 */}
              {sessions.filter(s => s.messages.length > 0).length > 0 && (
                <TouchableOpacity
                  style={s.pastChatBtn}
                  onPress={() => setShowPastChats(v => !v)}
                  activeOpacity={0.75}>
                  <Text style={s.pastChatBtnIcon}>{showPastChats ? '▲' : '🕐'}</Text>
                  <Text style={s.pastChatBtnTxt}>
                    {showPastChats ? '이전 대화 닫기' : `이전 대화 보기 (${sessions.filter(s => s.messages.length > 0).length}개)`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 이전 대화 목록 — 카드형 */}
              {showPastChats && (
                <View style={s.pastChatList}>
                  {[...sessions].reverse().filter(sess => sess.messages.length > 0).map(sess => {
                    const isExpanded = expandedSessionId === sess.id;
                    const firstUser = sess.messages.find((m: any) => m.role === 'user')?.text || '대화';
                    const titleText = firstUser.length > 28 ? firstUser.slice(0, 28) + '…' : firstUser;
                    return (
                      <View key={sess.id} style={s.pastChatCard}>
                        <TouchableOpacity
                          style={s.pastChatCardHeader}
                          onPress={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                          activeOpacity={0.75}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.pastChatCardDate}>{sess.date}</Text>
                            <Text style={s.pastChatCardTitle} numberOfLines={1}>{titleText}</Text>
                          </View>
                          <TouchableOpacity
                            style={s.pastChatDelBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => {
                              Alert.alert('대화 삭제', '이 대화 기록을 삭제할까요?', [
                                { text: '취소', style: 'cancel' },
                                { text: '삭제', style: 'destructive', onPress: async () => {
                                  if (expandedSessionId === sess.id) setExpandedSessionId(null);
                                  await deleteSession(sess.id);
                                }},
                              ]);
                            }}>
                            <Text style={s.pastChatDelTxt}>🗑</Text>
                          </TouchableOpacity>
                          <Text style={s.pastChatCardArrow}>{isExpanded ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {isExpanded && (
                          <View style={s.pastChatCardBody}>
                            {sess.messages.map((msg: any, i: number) => (
                              <View key={i} style={[msg.role === 'ai' ? s.aiRow : s.userRow, { marginBottom: 8 }]}>
                                {msg.role === 'ai' && <Lumi mood="happy" size={40} bob={false} />}
                                <View style={msg.role === 'ai' ? s.aiBubble : s.userBubble}>
                                  {msg.role === 'ai' && <Text style={s.bubbleName}>루미</Text>}
                                  <Text selectable style={msg.role === 'ai' ? s.aiTxt : s.userTxt}>{msg.text}</Text>
                                </View>
                              </View>
                            ))}

                            {/* 이 대화 이어가기 */}
                            <TouchableOpacity
                              style={s.continueBtn}
                              activeOpacity={0.8}
                              onPress={() => switchSession(sess)}>
                              <Text style={s.continueBtnTxt}>이 대화 이어가기 →</Text>
                            </TouchableOpacity>

                            {/* 병원전달 메모 만들기 */}
                            <TouchableOpacity
                              style={s.pastChatMemoBtn}
                              activeOpacity={0.8}
                              onPress={async () => {
                                try {
                                  const memoText = sess.messages
                                    .map((m: any) => `${m.role === 'ai' ? '[루미]' : '[나]'} ${m.text}`)
                                    .join('\n\n');
                                  const nowDate = new Date();
                                  const isoStr = nowDate.toISOString();
                                  const localDateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth()+1).padStart(2,'0')}-${String(nowDate.getDate()).padStart(2,'0')}`;
                                  const newItem = { id: isoStr, createdAt: isoStr, localDate: localDateStr, memo: `[${sess.date} 대화 요약]\n\n${memoText}`, opinion: '' };
                                  const raw = await AsyncStorage.getItem('doctor_memos');
                                  const existing = raw ? JSON.parse(raw) : [];
                                  await AsyncStorage.setItem('doctor_memos', JSON.stringify([newItem, ...existing].slice(0, 10)));
                                  showToast('병원전달 메모에 저장됐어요 🩺');
                                } catch { showToast('저장에 실패했습니다'); }
                              }}>
                              <Text style={s.pastChatMemoBtnTxt}>🩺 병원전달 메모 만들기</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* 예시 질문 리스트 */}
              <View style={s.exampleList}>
                <Text style={s.exampleTitle}>이렇게 질문하세요</Text>
                {QUICK_CARDS.map(q => (
                  <TouchableOpacity
                    key={q.label}
                    style={s.exampleItem}
                    onPress={() => send(q.label.replace(/\n/g, ' '))}
                    activeOpacity={0.7}
                  >
                    <Text style={s.exampleEmoji}>{q.emoji}</Text>
                    <Text style={s.exampleText}>{q.label.replace(/\n/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

            </ScrollView>
          )}
        </View>

        {/* ── 입력창 ── */}
        <View style={s.inputWrap}>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputBox}
              value={input}
              onChangeText={handleTextChange}
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
            {guardianPhone ? (
              <TouchableOpacity style={s.btnFamily}
                onPress={() => Linking.openURL(`tel:${guardianPhone}`).catch(() => {})}
                activeOpacity={0.85}>
                <Text style={s.btnFamilyTxt}>{guardianLabel || '보호자'}에게 전화</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.btnFamily}
                onPress={() => { setShowEmergency(false); navigation.navigate('Guardian', { userId, name }); }}
                activeOpacity={0.85}>
                <Text style={s.btnFamilyTxt}>보호자 등록하기</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.btnDismiss} onPress={() => setShowEmergency(false)}>
              <Text style={s.btnDismissTxt}>지금 일어난 일이 아닙니다</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toastMsg ? <View style={s.toast}><Text style={s.toastTxt}>{toastMsg}</Text></View> : null}
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // 탑바
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'transparent', paddingHorizontal: 12, paddingBottom: 10,
  },
  backBtn:    { padding: 8 },
  backBtnTxt: { fontSize: 28, color: C.purple1, fontWeight: '700', lineHeight: 30 },
  topCenter:  { flex: 1, alignItems: 'center' },
  topTitle:   { fontSize: 22, fontWeight: '900', color: '#16273E' },
  topSub:     { fontSize: 13, color: '#7A90A8', marginTop: 2 },
  onlineDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3DAB7B',
    shadowColor: '#3DAB7B', shadowRadius: 4, shadowOpacity: 0.8 },

  // 메인 바디
  body: { flex: 1, flexDirection: 'column', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 6 },

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

  // 메시지 버블
  dateDivider:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16, paddingHorizontal: 4 },
  dateDividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dateDividerTxt:  { fontSize: 13, fontWeight: '700', color: '#9CA3AF', paddingHorizontal: 4 },

  pastChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECE6F6', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 12,
    marginTop: 4, marginBottom: 8, alignSelf: 'center',
  },
  pastChatBtnIcon: { fontSize: 16 },
  pastChatBtnTxt:  { fontSize: 16, fontWeight: '700', color: '#5B3DB5' },
  pastChatList:    { width: '100%', paddingHorizontal: 4, gap: 10 },

  pastChatCard: {
    backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  pastChatCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, gap: 12,
  },
  pastChatCardDate:   { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginBottom: 3 },
  pastChatCardTitle:  { fontSize: 17, fontWeight: '700', color: '#0F1B2D' },
  pastChatCardArrow:  { fontSize: 14, color: '#9CA3AF' },
  pastChatDelBtn:     { padding: 6, marginRight: 4 },
  pastChatDelTxt:     { fontSize: 18 },
  continueBtn:        { backgroundColor: '#5B3DB5', borderRadius: 14, paddingVertical: 14,
                        alignItems: 'center', marginTop: 4 },
  continueBtnTxt:     { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  pastChatMemoBtn:    { backgroundColor: '#EEE8F8', borderRadius: 14, paddingVertical: 14,
                        alignItems: 'center', marginTop: 8 },
  pastChatMemoBtnTxt: { fontSize: 16, fontWeight: '800', color: '#5B3DB5' },
  pastChatCardBody:   { paddingHorizontal: 12, paddingBottom: 14, paddingTop: 4, gap: 8,
                        borderTopWidth: 1, borderTopColor: '#F3F4F6' },

  msgScroll:   { flex: 1, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  msgPlaceholder: { flex: 1 },
  msgContent:  { paddingVertical: 12, gap: 10 },
  aiRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: 'flex-start', maxWidth: '92%' },
  userRow:     { alignSelf: 'flex-end', maxWidth: '88%' },
  lumiAvatar:  { width: 52, height: 52, borderRadius: 26, marginBottom: 4, resizeMode: 'contain' },
  aiBubble:    {
    flex: 1,
    backgroundColor: '#F3E5F5', borderRadius: 18,
    borderTopLeftRadius: 4, padding: 14,
  },
  userBubble:  {
    backgroundColor: '#7B1FA2', borderRadius: 18,
    borderTopRightRadius: 4, padding: 14,
  },
  bubbleName:  { fontSize: 14, color: '#7B1FA2', fontWeight: '700', marginBottom: 4 },
  aiTxt:       { fontSize: 22, color: '#16273E', lineHeight: 38, fontWeight: '600' },
  userTxt:     { fontSize: 22, color: '#fff',     lineHeight: 34, fontWeight: '500' },
  loadingTxt:  { fontSize: 30, color: '#9C27B0', letterSpacing: 6 },

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

  // 대화형 프로필 수집 카드
  ppCard: {
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: '#F4EFFB', borderRadius: 18,
    padding: 16, borderWidth: 1.5, borderColor: '#C9B7F0',
  },
  ppQ:       { fontSize: 18, fontWeight: '700', color: '#4A3580', marginBottom: 12, lineHeight: 26 },
  ppChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ppChip:    {
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1.5, borderColor: '#9B7FE8',
  },
  ppChipSkip:    { borderColor: '#D1CCBC', backgroundColor: '#F8F6F1' },
  ppChipTxt:     { fontSize: 17, fontWeight: '700', color: '#7C5BE3' },
  ppChipSkipTxt: { color: '#A0A0A0', fontWeight: '500' },

  // 2열 카드 그리드
  cardGrid:  { paddingBottom: 8, marginTop: 6 },
  cardRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  cardItem:  {
    flex: 1, borderRadius: 16, padding: 14, minHeight: 88,
    justifyContent: 'center', borderWidth: 1.5, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 20, fontWeight: '800', lineHeight: 28 },

  // 예시 질문 리스트
  exampleList:  { width: '100%', paddingHorizontal: 18, marginTop: 16, marginBottom: 8 },
  exampleTitle: { fontSize: 16, fontWeight: '800', color: '#7E8AA1', marginBottom: 12,
    textAlign: 'center', letterSpacing: 0.3 },
  exampleItem:  { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(15,27,45,0.06)' },
  exampleEmoji: { fontSize: 24 },
  exampleText:  { fontSize: 20, fontWeight: '600', color: '#3D4B62', flex: 1 },

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
  ttsBtnInline: { alignSelf: 'flex-end', marginTop: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ttsBtnTxt:    { fontSize: 18 },
  expandBtn:    { marginTop: 8, alignSelf: 'flex-start' },
  expandBtnTxt: { fontSize: 15, fontWeight: '700', color: '#7C5BE3' },

  // 만성질환 감지 확인 카드
  condCard:  { backgroundColor: '#E8F5E9', borderRadius: 20, padding: 20, marginBottom: 12,
               borderWidth: 2, borderColor: '#66BB6A', flexShrink: 0 },
  condTitle: { fontSize: 20, fontWeight: '800', color: '#1B5E20', marginBottom: 6 },
  condBody:  { fontSize: 22, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  condSub:   { fontSize: 16, color: '#388E3C', marginBottom: 16, lineHeight: 24 },
  condBtns:  { flexDirection: 'row', gap: 10 },
  condYes:   { flex: 1, backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  condYesTxt:{ fontSize: 20, color: '#fff', fontWeight: '800' },
  condNo:    { flex: 1, backgroundColor: '#C8E6C9', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  condNoTxt: { fontSize: 20, color: '#2E7D32', fontWeight: '700' },

  // 새 대화 버튼 (탑바 오른쪽)
  newChatBtn: { backgroundColor: '#F3E5F5', borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 10, borderWidth: 1.5, borderColor: '#CE93D8', minHeight: 44, justifyContent: 'center' },
  newChatTxt: { fontSize: 17, fontWeight: '800', color: '#7B1FA2' },

  // 루미 웰컴
  lumiWelcome: {
    width: 196, height: 196,
    borderRadius: 98, resizeMode: 'contain',
    marginTop: 16, marginBottom: 8,
    shadowColor: '#7B1FA2', shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  lumiWelcomeName: {
    fontSize: 20, fontWeight: '900', color: C.purple1, marginBottom: 10,
  },
  contextPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E6F4E2', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 14,
  },
  contextPillDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#3BA559',
  },
  contextPillTxt: {
    fontSize: 13, fontWeight: '700', color: '#1F7A3A',
  },
  lumiGreetBubble: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 14,
    marginHorizontal: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#E1BEE7',
  },
  lumiGreetTxt: {
    fontSize: 18, fontWeight: '600', color: C.text,
    textAlign: 'center', lineHeight: 28,
  },
  quickGrid: { alignSelf: 'stretch' },

  restoreNotice: {
    position: 'absolute', alignSelf: 'center',
    top: '38%',
    backgroundColor: '#5E1188', borderRadius: 24,
    paddingHorizontal: 32, paddingVertical: 22, zIndex: 200,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  restoreNoticeTxt: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },

  // Phase 2: 관찰 승격 배너
  obsCard:     { backgroundColor: '#EEE8FC', borderRadius: 20, padding: 20, marginBottom: 12,
                 borderWidth: 1.5, borderColor: '#C4B5FD' },
  obsTitle:    { fontSize: 18, fontWeight: '800', color: '#4C1D95', marginBottom: 6 },
  obsVerbatim: { fontSize: 22, fontWeight: '700', color: '#5B21B6', marginBottom: 6, lineHeight: 30 },
  obsSub:      { fontSize: 15, color: '#6D28D9', marginBottom: 16, lineHeight: 22 },
  obsBtns:     { flexDirection: 'row', gap: 8 },
  obsYes:      { flex: 1, backgroundColor: '#5B21B6', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  obsYesTxt:   { fontSize: 18, color: '#fff', fontWeight: '800' },
  obsNo:       { flex: 1, backgroundColor: '#DDD6FE', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  obsNoTxt:    { fontSize: 18, color: '#4C1D95', fontWeight: '700' },
  obsSnooze:   { paddingHorizontal: 14, paddingVertical: 15, alignItems: 'center' },
  obsSnoozeTxt:{ fontSize: 16, color: '#7C3AED', fontWeight: '600' },
});

// ─── 얇은 래퍼: chatKey만 관리, 상태 초기화는 key remount가 처리 ───────────────
export default function AIChatScreen({ route, navigation }: Props) {
  const { language } = useLanguage();
  const { name = '회원', userId = '', seedMood = '' } = route?.params ?? {};
  const [chatKey, setChatKey] = useState(() => String(Date.now()));
  return (
    <ChatSessionView
      key={chatKey}
      userId={userId}
      name={name}
      seedMood={seedMood}
      language={language}
      navigation={navigation}
      onNewChat={() => setChatKey(String(Date.now()))}
    />
  );
}
