import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  StatusBar, Image, Animated, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';

const API_URL = 'https://silverlieai.onrender.com';
type Props = { route: any; navigation: any };
type RiskLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';
type Msg = {
  role: 'ai' | 'user';
  text: string;
  riskLevel?: RiskLevel;
  suggestedQuestions?: string[];
};
type HistoryItem = { role: 'user' | 'assistant'; content: string };

const C = {
  purple1: '#7B1FA2',
  purple2: '#9C27B0',
  purpleCard:'#F3E5F5',
  bg:      '#F9F4FC',
  card:    '#FFFFFF',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#E1BEE7',
  sage:    '#3DAB7B',
  sageLt:  '#E6F7EF',
  warn:    '#FF8F00',
  warnBg:  '#FFF8E1',
  emRed:   '#D32F2F',
  emBg:    '#FFEBEE',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 9)  return '좋은 아침이에요! 🌅\n오늘 하루도 건강하게 시작해요';
  if (h < 12) return '오전이 활기차네요! ☀️\n무엇이든 편하게 물어보세요';
  if (h < 14) return '점심 시간이에요! 🍱\n건강한 하루를 보내고 계신가요?';
  if (h < 18) return '오후도 건강하게! 🌤️\n궁금한 건강 정보가 있으신가요?';
  if (h < 21) return '좋은 저녁이에요! 🌙\n오늘 하루 어떠셨나요?';
  return '잠자리 준비가 되셨나요? 🌛\n편안한 밤 되세요';
}

const QUICK_CHIPS = [
  { emoji: '💊',   label: '약 부작용' },
  { emoji: '🩸',  label: '혁압이 높아요' },
  { emoji: '😴',  label: '잠이 안와요' },
  { emoji: '🦵',    label: '무릅 아파요' },
  { emoji: '😵',  label: '어지러워요' },
  { emoji: '🤢', label: '속이 메스껍워요' },
];

export default function AIChatScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};

  const welcomeMsg: Msg = {
    role: 'ai',
    text: `${getGreeting()}\n건강에 대해 편하게 물어보세요 😊`,
  };
  const [msgs, setMsgs] = useState<Msg[]>([welcomeMsg]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmergency,  setShowEmergency]  = useState(false);
  const [familyNotified, setFamilyNotified] = useState(false);
  const [profileTags,    setProfileTags]    = useState<string[]>([]);
  const [todayBP,        setTodayBP]        = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  // 건강 프로필 태그 로드
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('health_profile');
        if (stored) {
          const prof = JSON.parse(stored);
          const tags: string[] = [];
          if (prof.diseases?.length)      tags.push(...prof.diseases.slice(0, 2));
          if (prof.drugAllergies?.length) tags.push('알레르기: ' + prof.drugAllergies[0]);
          setProfileTags(tags);
        }
        const recStr = await AsyncStorage.getItem('health_records');
        if (recStr) {
          const recs = JSON.parse(recStr);
          const today = new Date().toISOString().slice(0, 10);
          const rec = recs.find((r: any) => r.date === today);
          if (rec?.bp_sys && rec?.bp_dia) setTodayBP(rec.bp_sys + '/' + rec.bp_dia);
        }
      } catch {}
    })();
  }, []);

  // 이전 상담 기록 불러오기 (로그인 회원만)
  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/ai/history/${userId}?limit=20`);
        if (!res.ok) return;
        const logs: { role: string; message: string; risk_level: string }[] = await res.json();
        if (!logs.length) return;
        const loadedMsgs: Msg[] = logs.map(l => ({
          role: l.role === 'assistant' ? 'ai' : 'user',
          text: l.message,
          riskLevel: (l.risk_level ?? 'normal') as RiskLevel,
        }));
        setMsgs([welcomeMsg, ...loadedMsgs]);
        setHistory(logs.map(l => ({
          role: l.role === 'assistant' ? 'assistant' : 'user',
          content: l.message,
        })));
      } catch { /* 기록 없으면 무시 */ }
    })();
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: false }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    const newHistory: HistoryItem[] = [...history, { role: 'user', content: msg }];

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: msg,
          history: history.slice(-10),
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.response ?? '죄송합니다, 다시 시도해주세요.';
      const riskLevel = data.risk_level ?? 'normal';
      const suggestedQuestions: string[] = data.suggested_questions ?? [];

      setMsgs(prev => [...prev, {
        role: 'ai',
        text: reply,
        riskLevel,
        suggestedQuestions,
      }]);
      setHistory([...newHistory, { role: 'assistant', content: reply }]);

      if (riskLevel === 'critical') {
        setShowEmergency(true);
        if (data.sos_sent) setFamilyNotified(true);
      }
    } catch {
      setMsgs(prev => [...prev, {
        role: 'ai',
        text: '연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
      }]);
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
    if (!SR) {
      setMsgs(prev => [...prev, { role: 'ai', text: '이 브라우저는 음성 인식을 지원하지 않아요.\nChrome을 사용해 주세요.' }]);
      return;
    }
    if (isRecording) { stopVoice(); return; }

    const recognition = new SR();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend   = () => setIsRecording(false);
    recognition.onerror = () => { setIsRecording(false); };

    recognition.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
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

  const showChips = msgs.length <= 1;
  const webBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(175deg, #7B1FA2 0%, #9C27B0 65%)' }
    : { backgroundColor: C.purple1 };

  const call119 = () => {
    if (Platform.OS === 'web') {
      window.location.href = 'tel:119';
    } else {
      Linking.openURL('tel:119');
    }
  };

  return (
    <View style={s.root}>

      {/* 헤더 */}
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
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700', textAlign: 'center', marginTop: -2 }}>설정</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 의료 고지 배너 */}
      <View style={s.disclaimer}>
        <Text style={s.disclaimerTxt}>⚕️ AI 답변은 참고용입니다. 정확한 진단은 의사 선생님께 확인하세요.</Text>
      </View>

      {/* 건강 프로필 태그 */}
      {(profileTags.length > 0 || todayBP) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.tagsBar} contentContainerStyle={s.tagsContent}>
          {todayBP ? <View style={s.tagBP}><Text style={s.tagBPTxt}>🩸 혁압 {todayBP}</Text></View> : null}
          {profileTags.map((tag, i) => (
            <View key={i} style={s.tag}><Text style={s.tagTxt}>{tag}</Text></View>
          ))}
        </ScrollView>
      )}

      {/* CRITICAL 인라인 카드 */}
      {showEmergency && (
        <View style={s.criticalCard}>
          <Text style={s.criticalCardTitle}>🚨 응급 증상이 의심됩니다</Text>
          {familyNotified && <Text style={s.familyNotified}>✅ 가족에게 알림 전송됨</Text>}
          <View style={s.criticalBtns}>
            <TouchableOpacity style={s.btnCritical119} onPress={call119}>
              <Text style={s.btnCritical119Txt}>📞 119 전화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnCriticalDismiss}
              onPress={() => { setShowEmergency(false); setFamilyNotified(false); }}>
              <Text style={s.btnCriticalDismissTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <ScrollView
          ref={scrollRef}
          style={s.chatArea}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}>

          {showChips && (
            <View style={s.welcomeArea}>
              <View style={s.beeWrap}>
                <Image
                  source={{uri: 'https://via.placeholder.com/36'}}
                  style={s.beeImg}
                  resizeMode="cover"
                />
              </View>
              <Text style={s.welcomeName}>{name}님, 안녕하세요!</Text>
            </View>
          )}

          {msgs.map((m, i) => (
            m.role === 'ai' ? (
              <View key={i} style={s.aiRow}>
                <Image
                  source={{uri: 'https://via.placeholder.com/36'}}
                  style={s.aiAvatar}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  {/* 위험도 배너 — 4단계 */}
                  {m.riskLevel === 'critical' && (
                    <TouchableOpacity style={s.bannerCritical} onPress={() => setShowEmergency(true)}>
                      <Text style={s.bannerCriticalTxt}>🚨 즉시 119 또는 응급실이 필요합니다 — 탭하여 확인</Text>
                    </TouchableOpacity>
                  )}
                  {m.riskLevel === 'high' && (
                    <View style={s.bannerHigh}>
                      <Text style={s.bannerHighTxt}>🔴 오늘 안에 병원 방문을 강력히 권고합니다</Text>
                    </View>
                  )}
                  {m.riskLevel === 'medium' && (
                    <View style={s.bannerMedium}>
                      <Text style={s.bannerMediumTxt}>⚠️ 증상이 지속되면 병원 방문을 권장합니다</Text>
                    </View>
                  )}

                  <View style={s.aiBubble}>
                    <Text style={s.aiText}>{m.text}</Text>
                  </View>

                  {/* 후속 질문 칩 */}
                  {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                    <View style={s.followupWrap}>
                      <Text style={s.followupLabel}>💡 더 알고 싶으시면</Text>
                      {m.suggestedQuestions.map((q, qi) => (
                        <TouchableOpacity
                          key={qi}
                          style={s.followupChip}
                          onPress={() => send(q)}
                          activeOpacity={0.75}>
                          <Text style={s.followupChipTxt}>▶ {q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
              <Image
                source={{uri: 'https://via.placeholder.com/36'}}
                style={s.aiAvatar}
                resizeMode="cover"
              />
              <View style={s.aiBubble}>
                <View style={s.typingDots}>
                  {[0,1,2].map(i => <View key={i} style={s.dot} />)}
                </View>
              </View>
            </View>
          )}

          {showChips && (
            <View style={s.chipsWrap}>
              <Text style={s.chipsLabel}>자주 묻는 질문</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsScroll}>
                {QUICK_CHIPS.map(q => (
                  <TouchableOpacity
                    key={q.label}
                    style={s.chip}
                    onPress={() => send(q.label)}
                    activeOpacity={0.75}>
                    <Text style={s.chipEmoji}>{q.emoji}</Text>
                    <Text style={s.chipTxt}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.chipsHint}>아래 입력창에서 원하는 질문을 직접 해보세요 👇</Text>
            </View>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* 입력창 */}
        <View style={s.inputWrap}>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputBox}
              value={input}
              onChangeText={setInput}
              placeholder={isRecording ? '🎤 듣고 있어요...' : '건강 궁금증을 물어보세요'}
              placeholderTextColor={isRecording ? C.purple2 : C.sub}
              multiline
              maxLength={300}
            />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[s.micBtn, isRecording && s.micBtnActive]}
                onPress={toggleVoice}
                activeOpacity={0.8}>
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

      {/* 응급 모달 */}
      <Modal
        visible={showEmergency}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmergency(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>🚨 주의가 필요합니다</Text>
            <Text style={s.modalDesc}>
              AI가 즉각적인 도움이 필요할 수 있다고 판단했습니다.{'\n\n'}
              본인이 괜찮다면 닫기를 눌러주세요.{'\n'}
              불안하다면 119 또는 가족에게 연락하세요.
            </Text>

            <TouchableOpacity style={s.btn119} onPress={call119} activeOpacity={0.85}>
              <Text style={s.btn119Txt}>📞 119 지금 전화하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.btnFamily}
              onPress={() => {
                setShowEmergency(false);
                navigation.navigate('ImportantContacts');
              }}
              activeOpacity={0.85}>
              <Text style={s.btnFamilyTxt}>👥 중요 연락처 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.btnDismiss}
              onPress={() => setShowEmergency(false)}
              activeOpacity={0.85}>
              <Text style={s.btnDismissTxt}>괜찮습니다, 닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
    paddingHorizontal: 18, paddingBottom: 14, gap: 12,
  },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt:      { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  onlineDot:    {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#3DAB7B',
    shadowColor: '#3DAB7B', shadowRadius: 4, shadowOpacity: 0.8,
  },

  disclaimer:    {
    backgroundColor: '#FFF8E1', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  disclaimerTxt: { fontSize: 15, color: '#795548', textAlign: 'center', lineHeight: 22 },

  chatArea:    { flex: 1, backgroundColor: C.bg },
  chatContent: { padding: 16, paddingBottom: 8 },

  welcomeArea: { alignItems: 'center', marginBottom: 20, marginTop: 4 },
  beeWrap: {
    width: 96, height: 96, borderRadius: 48, overflow: 'hidden',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: C.purple1, shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
    marginBottom: 10,
  },
  beeImg:      { width: 96, height: 96 },
  welcomeName: { fontSize: 26, fontWeight: '700', color: C.text },

  aiRow:    { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  aiAvatar: { width: 36, height: 36, borderRadius: 18, flexShrink: 0 },
  aiBubble: {
    backgroundColor: C.card, borderRadius: 4, borderTopLeftRadius: 18,
    borderTopRightRadius: 18, borderBottomRightRadius: 18,
    padding: 14,
    shadowColor: C.purple1, shadowOpacity: 0.07, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  aiText: { fontSize: 20, color: C.text, lineHeight: 32 },

  // 위험도 배너 4단계
  bannerCritical: {
    backgroundColor: C.emBg, borderRadius: 10, borderWidth: 2, borderColor: C.emRed,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  bannerCriticalTxt: { fontSize: 16, color: C.emRed, fontWeight: '800', textAlign: 'center' },

  bannerHigh: {
    backgroundColor: '#FFF0E0', borderRadius: 10, borderWidth: 2, borderColor: '#E65100',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  bannerHighTxt: { fontSize: 16, color: '#E65100', fontWeight: '700', textAlign: 'center' },

  bannerMedium: {
    backgroundColor: C.warnBg, borderRadius: 10, borderWidth: 1.5, borderColor: C.warn,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
  },
  bannerMediumTxt: { fontSize: 16, color: C.warn, fontWeight: '700', textAlign: 'center' },

  followupWrap: { marginTop: 8, paddingLeft: 4 },
  followupLabel: { fontSize: 15, color: C.sub, fontWeight: '600', marginBottom: 6 },
  followupChip: {
    backgroundColor: C.purpleCard, borderRadius: 10, borderWidth: 1, borderColor: C.line,
    borderLeftWidth: 4, borderLeftColor: C.purple1,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6,
  },
  followupChipTxt: { fontSize: 17, color: C.purple1, lineHeight: 24 },

  userRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  userBubble: {
    backgroundColor: C.purple2, borderRadius: 18, borderBottomRightRadius: 4,
    padding: 14, maxWidth: '78%',
  },
  userText: { fontSize: 20, color: '#fff', lineHeight: 32 },

  typingDots: { flexDirection: 'row', gap: 5, paddingVertical: 4 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple2 },

  chipsWrap:  { marginTop: 4, marginBottom: 8 },
  chipsLabel: { fontSize: 17, fontWeight: '700', color: C.sub, marginBottom: 10, textAlign: 'center' },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: C.line,
    shadowColor: C.purple1, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  chipEmoji: { fontSize: 20 },
  chipTxt:   { fontSize: 18, color: C.purple1, fontWeight: '600' },
  chipsHint: { fontSize: 17, color: C.sub, textAlign: 'center', lineHeight: 26 },

  inputWrap: {
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.line,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputBox: {
    flex: 1, backgroundColor: C.bg, borderRadius: 22, borderWidth: 1.5,
    borderColor: C.line, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 19, color: C.text, maxHeight: 120, lineHeight: 28,
  },

  micBtn:       {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.line,
  },
  micBtnActive: { backgroundColor: '#FDEAEA', borderColor: '#D94040' },
  micIcon:      { fontSize: 20 },

  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purple2, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: C.line },
  sendIcon:   { fontSize: 20, color: '#fff', fontWeight: '700' },

  // 응급 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 380, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  modalTitle: { fontSize: 26, fontWeight: '800', color: C.emRed, marginBottom: 14, textAlign: 'center' },
  modalDesc:  { fontSize: 18, color: C.text, lineHeight: 30, textAlign: 'center', marginBottom: 24 },

  btn119: {
    backgroundColor: C.emRed, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  btn119Txt: { fontSize: 22, fontWeight: '800', color: '#fff' },

  btnFamily: {
    backgroundColor: C.purple1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  btnFamilyTxt: { fontSize: 20, fontWeight: '700', color: '#fff' },

  btnDismiss: {
    paddingVertical: 10,
  },
  btnDismissTxt: { fontSize: 17, color: C.sub },

  tagsBar:     { maxHeight: 44, backgroundColor: C.purpleCard, borderBottomWidth: 1, borderBottomColor: C.line },
  tagsContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tag:    { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.line },
  tagTxt: { fontSize: 14, color: C.purple1, fontWeight: '700' },
  tagBP:    { backgroundColor: '#FFF0F0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#FFAAAA' },
  tagBPTxt: { fontSize: 14, color: '#C62828', fontWeight: '700' },
  criticalCard:          { backgroundColor: '#FFF0F0', borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#C62828', padding: 14, alignItems: 'center' },
  criticalCardTitle:     { fontSize: 20, fontWeight: '900', color: '#C62828', marginBottom: 8 },
  familyNotified:        { fontSize: 16, color: '#2E7D32', fontWeight: '700', marginBottom: 8 },
  criticalBtns:          { flexDirection: 'row', gap: 10 },
  btnCritical119:        { backgroundColor: '#C62828', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, flex: 1, alignItems: 'center' },
  btnCritical119Txt:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  btnCriticalDismiss:    { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#C62828' },
  btnCriticalDismissTxt: { fontSize: 18, fontWeight: '700', color: '#C62828' },
  chipsScroll: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingBottom: 4 },
  settingsBtn: { alignItems: 'center' },
});
