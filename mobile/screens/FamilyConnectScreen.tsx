import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Clipboard, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE     = '#3B82F6';
const SKY_FROM = '#CDE3F4';
const SKY_TO   = '#F1F7FC';
const INK      = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const CARD_BG  = '#EFF6FF';

const API = 'https://silverlieai.onrender.com';
const SESSION_SECS = 600; // 10분

export default function FamilyConnectScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;

  const [code,      setCode]      = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [timeLeft,  setTimeLeft]  = useState<number>(SESSION_SECS);
  const [expired,   setExpired]   = useState(false);

  useEffect(() => {
    generateCode();
  }, []);

  const generateCode = async () => {
    setExpired(false);
    setTimeLeft(SESSION_SECS);
    try {
      const res = await fetch(`${API}/pairing-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      const newCode = data.code || makeFallbackCode();
      setCode(newCode);
      setQrPayload(data.qrPayload || `silverlifeai://pair?code=${newCode}&uid=${userId}`);
    } catch {
      const fallback = makeFallbackCode();
      setCode(fallback);
      setQrPayload(`silverlifeai://pair?code=${fallback}&uid=${userId}`);
    }
  };

  const makeFallbackCode = () =>
    String(Math.floor(100000 + Math.random() * 900000));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [code]);

  const handleCopy = async () => {
    await Clipboard.setString(code);
    Alert.alert('', '코드가 복사됐어요 📋', [{ text: '확인' }]);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = timeLeft / SESSION_SECS;
  const timerColor = timeLeft > 120 ? BLUE : '#EF4444';

  return (
    <LinearGradient colors={[SKY_FROM, SKY_TO]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={28} color={INK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>가족 연결</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Lumi */}
        <View style={s.lumiRow}>
          <Image source={require('../assets/lumi-happy.png')} style={s.lumiImg} />
          <View style={s.lumiBubble}>
            <Text style={s.lumiText}>가족과 연결하면{'\n'}더 안심이 돼요 💜</Text>
          </View>
        </View>

        {/* ── QR Code 섹션 ── */}
        <View style={s.sectionWrap}>
          <View style={s.stepRow}>
            <View style={s.stepBadge}><Text style={s.stepNum}>1</Text></View>
            <Text style={s.stepTitle}>가족 폰으로 QR 코드 찍기</Text>
          </View>

          <View style={s.qrCard}>
            {expired ? (
              /* 만료 상태 */
              <View style={s.expiredBox}>
                <Text style={s.expiredIcon}>⏱️</Text>
                <Text style={s.expiredTitle}>시간이 만료됐어요</Text>
                <TouchableOpacity style={s.refreshBtn} onPress={generateCode}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={s.refreshTxt}>새 코드 받기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* QR 코드 */
              <View style={s.qrWrap}>
                {qrPayload ? (
                  <QRCode
                    value={qrPayload}
                    size={220}
                    color={INK}
                    backgroundColor="#fff"
                    logo={require('../assets/lumi-happy.png')}
                    logoSize={40}
                    logoBackgroundColor="#fff"
                    logoBorderRadius={8}
                  />
                ) : (
                  <View style={s.qrLoading}>
                    <Text style={{ fontSize: 32 }}>📱</Text>
                    <Text style={s.qrLoadingTxt}>생성 중...</Text>
                  </View>
                )}
              </View>
            )}

            {/* 타이머 */}
            {!expired && (
              <>
                <Text style={[s.timerLabel, { color: timerColor }]}>
                  {formatTime(timeLeft)} 동안 사용 가능해요
                </Text>
                <View style={s.timerBar}>
                  <View style={[s.timerFill, {
                    width: `${progress * 100}%` as any,
                    backgroundColor: timerColor,
                  }]} />
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── 또는 ── */}
        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divText}>또는</Text>
          <View style={s.divLine} />
        </View>

        {/* ── 6자리 코드 섹션 ── */}
        <View style={s.sectionWrap}>
          <View style={s.stepRow}>
            <View style={s.stepBadge}><Text style={s.stepNum}>2</Text></View>
            <Text style={s.stepTitle}>6자리 코드 알려주기</Text>
          </View>

          <View style={s.codeCard}>
            <View style={s.codeBoxes}>
              {(code || '------').split('').map((digit, i) => (
                <View key={i} style={[s.codeBox, expired && s.codeBoxExpired]}>
                  <Text style={[s.codeDigit, expired && { color: INK_MUTE }]}>
                    {digit}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[s.btnCopy, expired && s.btnCopyDisabled]}
              onPress={expired ? undefined : handleCopy}
              activeOpacity={expired ? 1 : 0.7}
            >
              <Ionicons name="copy-outline" size={20}
                color={expired ? INK_MUTE : BLUE} />
              <Text style={[s.btnCopyTxt, expired && { color: INK_MUTE }]}>
                코드 복사하기
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 안내 */}
        <View style={s.hint}>
          <Ionicons name="information-circle-outline" size={20} color={INK_MUTE} />
          <Text style={s.hintTxt}>
            가족이 Silver Life AI 앱에서{'\n'}'코드로 연결하기'를 눌러주세요
          </Text>
        </View>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn:     { padding: 10 },
  headerTitle: { flex: 1, fontSize: 26, fontWeight: '900', color: INK, textAlign: 'center' },

  lumiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  lumiImg:    { width: 60, height: 60, borderRadius: 30 },
  lumiBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lumiText: { fontSize: 18, fontWeight: '700', color: INK, lineHeight: 26 },

  sectionWrap: { paddingHorizontal: 18, marginTop: 20 },
  stepRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  stepBadge:   {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum:   { fontSize: 20, fontWeight: '900', color: '#fff' },
  stepTitle: { fontSize: 22, fontWeight: '800', color: INK },

  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  qrWrap: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  qrLoading: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD_BG, borderRadius: 12,
  },
  qrLoadingTxt: { fontSize: 18, fontWeight: '700', color: INK_SOFT, marginTop: 8 },

  expiredBox: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FEF2F2', borderRadius: 12, marginBottom: 20,
  },
  expiredIcon:  { fontSize: 48 },
  expiredTitle: { fontSize: 18, fontWeight: '800', color: '#EF4444' },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BLUE, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 12,
    marginTop: 4,
  },
  refreshTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

  timerLabel: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  timerBar: {
    width: '100%', height: 6,
    backgroundColor: 'rgba(15,27,45,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 3 },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, marginVertical: 24, gap: 12,
  },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(15,27,45,0.08)' },
  divText: { fontSize: 15, fontWeight: '700', color: INK_MUTE },

  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  codeBoxes: {
    flexDirection: 'row', gap: 8,
    marginBottom: 24, justifyContent: 'center',
  },
  codeBox: {
    width: 52, height: 64,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  codeBoxExpired: { backgroundColor: '#F1F5F9' },
  codeDigit: { fontSize: 34, fontWeight: '900', color: BLUE },

  btnCopy: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 56, paddingHorizontal: 24,
    borderRadius: 16, borderWidth: 2, borderColor: BLUE,
  },
  btnCopyDisabled: { borderColor: '#E5E7EB' },
  btnCopyTxt: { fontSize: 18, fontWeight: '800', color: BLUE },

  hint: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, paddingHorizontal: 24, marginTop: 24, marginBottom: 8,
  },
  hintTxt: {
    flex: 1, fontSize: 16, fontWeight: '600',
    color: INK_MUTE, lineHeight: 24,
  },
});
