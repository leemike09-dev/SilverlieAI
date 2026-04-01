import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };

const QUICK = ['오늘 운동 추천', '식단 조언', '수면 개선', '혈압 관리법'];

type Msg = { role: 'ai' | 'user'; text: string };

const WELCOME: Msg = {
  role: 'ai',
  text: '안녕하세요! 😊 건강에 관해 궁금한 점을 편하게 물어보세요.\n24시간 AI가 함께합니다.',
};

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
      setMsgs(prev => [...prev, { role: 'ai', text: data.response ?? '죄송합니다, 다시 시도해주세요.' }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'ai', text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.homeBtnText}>🏠 홈</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>AI 건강 상담</Text>
        <Text style={styles.sub}>Claude AI · 24시간 · 의료정보 기반</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={styles.chatArea} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 16 }}>
          {msgs.map((m, i) => (
            m.role === 'ai' ? (
              <View key={i} style={styles.aiRow}>
                <View style={styles.aiAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiText}>{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={i} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              </View>
            )
          ))}
          {loading && (
            <View style={styles.aiRow}>
              <View style={styles.aiAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
              <View style={styles.aiBubble}>
                <ActivityIndicator color="#4fc3f7" size="small" />
              </View>
            </View>
          )}
          {/* 빠른 질문 */}
          {msgs.length <= 1 && (
            <View style={styles.quickRow}>
              {QUICK.map(q => (
                <TouchableOpacity key={q} style={styles.quickChip} onPress={() => send(q)}>
                  <Text style={styles.quickTxt}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputBox}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#546e7a"
            multiline
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
            onPress={() => send()} disabled={!input.trim() || loading}>
            <Text style={styles.sendIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </SafeAreaView>
  );
}

const BG = '#0a1628'; const CARD = '#0e1e35'; const BORDER = '#1a2a3a'; const ACCENT = '#4fc3f7';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, padding: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  homeBtn:   { backgroundColor: '#1a2a3a', borderWidth: 1, borderColor: ACCENT,
               borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  homeBtnText: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  title:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 11, color: '#607d8b', marginTop: 3 },

  chatArea: { flex: 1, backgroundColor: BG },

  aiRow:    { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0d3b66',
              justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  aiBubble: { backgroundColor: CARD, borderRadius: 0, borderTopRightRadius: 14,
              borderBottomRightRadius: 14, borderBottomLeftRadius: 14,
              padding: 12, maxWidth: '78%', borderWidth: 1, borderColor: BORDER },
  aiText:   { fontSize: 13, color: '#b0bec5', lineHeight: 20 },

  userRow:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  userBubble:{ backgroundColor: '#1565c0', borderRadius: 14, borderBottomRightRadius: 0,
               padding: 12, maxWidth: '78%' },
  userText:  { fontSize: 13, color: '#fff', lineHeight: 20 },

  quickRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quickChip: { backgroundColor: CARD, borderWidth: 1, borderColor: '#1565c0',
               borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  quickTxt:  { fontSize: 12, color: ACCENT, fontWeight: '600' },

  inputRow:  { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 16,
               backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
               alignItems: 'flex-end' },
  inputBox:  { flex: 1, backgroundColor: '#1a2a3a', borderRadius: 20,
               paddingHorizontal: 16, paddingVertical: 10,
               fontSize: 13, color: '#e3f2fd', maxHeight: 100 },
  sendBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1565c0',
                justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#1a2a3a' },
  sendIcon:   { fontSize: 16 },
});
