import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Platform, StatusBar, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API = 'https://silverlieai.onrender.com';

const RELATION_EMOJI: Record<string, string> = {
  father: '👴', mother: '👵', spouse: '💑',
  son: '👦', daughter: '👧', sibling: '👫', other: '👤',
};
const RELATION_LABEL: Record<string, string> = {
  father: '아버지', mother: '어머니', spouse: '배우자',
  son: '아들', daughter: '딸', sibling: '형제/자매', other: '기타',
};

const QUICK_REPLIES = [
  '잘 지내고 있어요! 걱정 마세요 💙',
  '오늘 산책 다녀왔어요 🚶',
  '보고 싶어요 ❤️',
  '약 잘 먹고 있어요 👍',
  '오늘 날씨가 좋네요 ☀️',
  '밥 잘 먹었어요 🍚',
];

const DEMO_MESSAGES = [
  { sender_id: 'demo-son-1',  message: '아버지 오늘 점심은 드셨어요?', created_at: new Date(Date.now() - 3600000).toISOString() },
  { sender_id: 'demo-user',   message: '응, 잘 먹었어! 오늘 날씨 좋더라', created_at: new Date(Date.now() - 3500000).toISOString() },
  { sender_id: 'demo-son-1',  message: '다행이에요 :) 이번 주말에 방문할게요!', created_at: new Date(Date.now() - 3400000).toISOString() },
  { sender_id: 'demo-user',   message: '그래, 기다릴게 😊', created_at: new Date(Date.now() - 3300000).toISOString() },
];

export default function FamilyChatScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name, partnerId, partnerName, partnerRelation } = route?.params || {};
  const [messages,  setMessages]  = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const relLabel = partnerRelation ? (RELATION_LABEL[partnerRelation] || '') : '';
  const relEmoji = partnerRelation ? (RELATION_EMOJI[partnerRelation] || '👤') : '👤';

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const r = await fetch(`${API}/family/messages/${userId}/${partnerId}`);
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages || DEMO_MESSAGES);
      } else {
        setMessages(DEMO_MESSAGES);
      }
    } catch {
      setMessages(DEMO_MESSAGES);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setInputText('');
    // Optimistic append
    const optimistic = { sender_id: userId, message: msg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      await fetch(`${API}/family/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: userId, receiver_id: partnerId, message: msg, msg_type: 'text' }),
      });
      // Refresh to get server timestamps
      await fetchMessages();
    } catch {}
    setSending(false);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 14, 28) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>{relEmoji}</Text>
          <View>
            <Text style={s.headerName}>{relLabel ? `${relLabel} ${partnerName}` : partnerName}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>

        {/* Messages */}
        {loading ? (
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color="#1A4A8A" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.msgList}
            contentContainerStyle={s.msgContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={s.emptyBox}>
                <Text style={s.emptyTxt}>{relLabel} {partnerName}님과{'\n'}첫 인사를 나눠보세요 💙</Text>
              </View>
            )}
            {messages.map((msg: any, i: number) => {
              const isMine = msg.sender_id === userId;
              const time   = formatTime(msg.created_at);
              return (
                <View key={i} style={[s.msgRow, isMine && s.msgRowRight]}>
                  {!isMine && (
                    <View style={s.avatarCircle}>
                      <Text style={s.avatarTxt}>{relEmoji}</Text>
                    </View>
                  )}
                  <View style={s.msgCol}>
                    <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
                      <Text style={[s.bubbleTxt, isMine && s.bubbleTxtMine]}>{msg.message}</Text>
                    </View>
                    <Text style={[s.msgTime, isMine && s.msgTimeRight]}>{time}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Quick replies */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.quickBar} contentContainerStyle={s.quickContent}>
          {QUICK_REPLIES.map((r, i) => (
            <TouchableOpacity key={i} style={s.quickChip} onPress={() => sendMessage(r)} activeOpacity={0.7}>
              <Text style={s.quickTxt}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#B0BEC5"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnOff]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendTxt}>전송</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F5FB' },

  header:       { backgroundColor: '#1A4A8A', paddingHorizontal: 16, paddingBottom: 16,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { width: 40, alignItems: 'center' },
  backTxt:      { fontSize: 38, color: '#fff', fontWeight: '300', lineHeight: 42 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerEmoji:  { fontSize: 32 },
  headerName:   { fontSize: 22, fontWeight: '800', color: '#fff' },

  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  msgList:    { flex: 1 },
  msgContent: { padding: 16, paddingBottom: 8, gap: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTxt: { fontSize: 20, color: '#90A4AE', textAlign: 'center', lineHeight: 32 },

  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  msgRowRight: { flexDirection: 'row-reverse' },
  msgCol:      { maxWidth: '72%', gap: 4 },
  avatarCircle:{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EBF3FB',
                 alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:   { fontSize: 20 },

  bubble:        { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14 },
  bubbleOther:   { backgroundColor: '#fff', borderBottomLeftRadius: 6,
                   shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  bubbleMine:    { backgroundColor: '#1A4A8A', borderBottomRightRadius: 6 },
  bubbleTxt:     { fontSize: 18, color: '#1E2D3D', lineHeight: 26 },
  bubbleTxtMine: { color: '#fff' },

  msgTime:      { fontSize: 13, color: '#B0BEC5', paddingHorizontal: 4 },
  msgTimeRight: { textAlign: 'right' },

  quickBar:    { backgroundColor: '#F8FAFD', borderTopWidth: 1, borderTopColor: '#E5E5EA',
                 flexGrow: 0, flexShrink: 0 },
  quickContent:{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  quickChip:   { backgroundColor: '#EBF3FB', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
                 borderWidth: 1, borderColor: '#C8DCF0' },
  quickTxt:    { fontSize: 16, color: '#1A4A8A', fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10,
              backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
              borderTopWidth: 1, borderTopColor: '#E5E5EA',
              paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  input:    { flex: 1, backgroundColor: '#F5F8FF', borderRadius: 20, borderWidth: 1.5,
              borderColor: '#90CAF9', paddingHorizontal: 18, paddingVertical: 14,
              maxHeight: 100, color: '#1E2D3D' },
  sendBtn:    { backgroundColor: '#1A4A8A', borderRadius: 20,
                paddingHorizontal: 20, paddingVertical: 14, minWidth: 72, alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#B0BEC5' },
  sendTxt:    { fontSize: 18, fontWeight: '800', color: '#fff' },
});
