import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export const SESSION_KEY  = 'ai_chat_sessions';
export const MAX_SESSIONS = 10;

export type Msg = {
  role: 'ai' | 'user';
  text: string;
  riskLevel?: string;
  doctorMemoNeeded?: boolean;
  doctorMemo?: string;
};
export type HistoryItem = { role: 'user' | 'assistant'; content: string };
export type ChatSession = {
  id: string;
  date: string;
  label: string;
  messages: Msg[];
  history: HistoryItem[];
  turnCount: number;
};

interface UseChatSessionProps {
  messages: Msg[];
  history: HistoryItem[];
  turnCountRef: React.MutableRefObject<number>;
  sessionIdRef: React.MutableRefObject<string>;
  onNewSession: () => void;
}

export function useChatSession({
  messages, history, turnCountRef, sessionIdRef, onNewSession,
}: UseChatSessionProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // 초기 세션 기록 로드
  const loadSessions = async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved: ChatSession[] = JSON.parse(raw);
        if (saved.length > 0) setSessions(saved);
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  // 메시지가 바뀔 때마다 현재 세션 자동 저장
  useEffect(() => {
    if (messages.length === 0) return;
    const firstUserMsg = messages.find(m => m.role === 'user')?.text || '';
    const label = firstUserMsg.length > 20 ? firstUserMsg.slice(0, 20) + '…' : firstUserMsg;
    const current: ChatSession = {
      id: sessionIdRef.current,
      date: localDate(),
      label: label || '대화',
      messages,
      history,
      turnCount: turnCountRef.current,
    };
    AsyncStorage.getItem(SESSION_KEY).then(raw => {
      try {
        const existing: ChatSession[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter(s => s.id !== current.id);
        const updated = [current, ...filtered].slice(0, MAX_SESSIONS);
        setSessions(updated);
        AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    });
  }, [messages]);

  const startNewSession = () => {
    sessionIdRef.current = Date.now().toString();
    onNewSession();
  };

  const deleteSession = async (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  };

  return { sessions, setSessions, loadSessions, startNewSession, deleteSession };
}
