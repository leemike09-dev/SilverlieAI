import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

export default function AIChatScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: t.aiGreeting },
  ]);
  const [loading, setLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const MAX_MESSAGES = 5;
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (msgCount >= MAX_MESSAGES) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, language }),
      });
      const data = await response.json();
      const newCount = msgCount + 1;
      setMsgCount(newCount);
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      if (newCount >= MAX_MESSAGES) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'ai', text: t.demoChatLimit }]);
        }, 500);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: t.serverError }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.aiChatTitle}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.aiText]}>
              {msg.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color="#2D6A4F" />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputRow}>
          {msgCount >= MAX_MESSAGES ? (
            <Text style={styles.limitText}>{t.demoChatLimit}</Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder={t.inputPlaceholder}
                value={input}
                onChangeText={setInput}
                multiline
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!input.trim() || loading}
              >
                <Text style={styles.sendText}>{t.send}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  chatArea: { flex: 1 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userBubble: {
    backgroundColor: '#2D6A4F',
    alignSelf: 'flex-end',
  },
  bubbleText: { fontSize: 17, lineHeight: 26 },
  aiText: { color: '#333' },
  userText: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#aaa',
  },
  sendText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  limitText: {
    flex: 1,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 14,
  },
});
