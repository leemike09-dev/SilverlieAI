import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };

const QUICK = ['오늘 운동 추천', '식단 조언', '수면 개선', '혈압 관리법'];
type Msg = { role: 'ai' | 'user'; text: string };

const WELCOME: Msg = {
  role: 'ai',
  text: '안녕하세요! 😊 건강에 관해 궁금한 점을 편하게 물어보세요.\n24시간 AI가 함께합니다.',
};

// 새 탭바 색상
const C = { sage: '#6BAE8F', line: '#F0EDE8', card: '#FFFFFF', sub: '#8A8A8A' };

export default function AIChatScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs]);

  const send = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message: msg }),
      });
      const data = await res.json();
      setMsgs(prev => [...prev, { role: 'ai', text: data.reply ?? data.response ?? '죄송합니다, 다시 시도해주세요.' }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'ai', text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.title}>🤖 AI 건강 상담</Text>
        <Text style={s.sub}>Claude AI · 24시간 · 의료정보 기반</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={s.chatArea} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 16 }}>
          {msgs.map((m, i) => (
            m.role === 'ai' ? (
              <View key={i} style={s.aiRow}>
                <View style={s.aiAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
                <View style={s.aiBubble}>
                  <Text style={s.aiText}>{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={i} style={s.userRow}>
                <View style={s.userBubble}>
                  <Text style={s.userText}>{m.text}</Text>
                </View>
              </View>
            )
          ))}
          {loading && (
            <View style={s.aiRow}>
              <View style={s.aiAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
              <View style={s.aiBubble}>
                <ActivityIndicator color="#4fc3f7" size="small" />
              </View>
            </View>
          )}
          {msgs.length <= 1 && (
            <View style={s.quickRow}>
              {QUICK.map(q => (
                <TouchableOpacity key={q} style={s.quickChip} onPress={() => send(q)}>
                  <Text style={s.quickTxt}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={s.inputRow}>
          <TextInput
            style={s.inputBox}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#546e7a"
            multiline
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendBtnOff]}
            onPress={() => send()} disabled={!input.trim() || loading}>
            <Text style={s.sendIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 새 탭바 (SeniorHome 스타일) */}
      <View style={s.tabbar}>
        {[
          { icon: '🏠', lbl: '오늘',    screen: 'SeniorHome', active: false },
          { icon: '💊', lbl: '내 약',   screen: 'Medication',  active: false },
          { icon: '🤖', lbl: 'AI 상담', screen: '',            active: true  },
          { icon: '👤', lbl: '내 정보', screen: 'Settings',    active: false },
        ].map(tab => (
          <TouchableOpacity key={tab.lbl} style={s.tab}
            onPress={() => tab.screen && navigation.navigate(tab.screen, { userId, name })}
            activeOpacity={0.7}>
            <Text style={[s.tabIcon, tab.active && { opacity: 1 }]}>{tab.icon}</Text>
            <Text style={[s.tabLbl, tab.active && { color: C.sage, fontWeight: '700' }]}>{tab.lbl}</Text>
            {tab.active && <View style={s.tabDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const BG = '#0a1628'; const CARD = '#0e1e35'; const BORDER = '#1a2a3a'; const ACCENT = '#4fc3f7';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, paddingHorizontal: 18,
            paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
            paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 11, color: '#607d8b', marginTop: 3 },

  chatArea: { flex: 1, backgroundColor: BG },

  aiRow:    { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0d3b66',
              justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  aiBubble: { backgroundColor: CARD, borderTopRightRadius: 14, borderBottomRightRadius: 14,
              borderBottomLeftRadius: 14, padding: 12, maxWidth: '78%',
              borderWidth: 1, borderColor: BORDER },
  aiText:   { fontSize: 13, color: '#b0bec5', lineHeight: 20 },

  userRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  userBubble: { backgroundColor: '#1565c0', borderRadius: 14, borderBottomRightRadius: 0,
                padding: 12, maxWidth: '78%' },
  userText:   { fontSize: 13, color: '#fff', lineHeight: 20 },

  quickRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quickChip: { backgroundColor: CARD, borderWidth: 1, borderColor: '#1565c0',
               borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  quickTxt:  { fontSize: 12, color: ACCENT, fontWeight: '600' },

  inputRow: { flexDirection: 'row', gap: 10, padding: 12,
              backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER, alignItems: 'flex-end' },
  inputBox: { flex: 1, backgroundColor: '#1a2a3a', borderRadius: 20,
              paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, color: '#e3f2fd', maxHeight: 100 },
  sendBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1565c0',
                justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#1a2a3a' },
  sendIcon:   { fontSize: 16 },

  // 탭바
  tabbar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line,
            paddingTop: 10, paddingBottom: 14 },
  tab:    { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon:{ fontSize: 22, opacity: 0.3 },
  tabLbl: { fontSize: 10, color: C.sub, fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.sage, marginTop: 1 },
});
