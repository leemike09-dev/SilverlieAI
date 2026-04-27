import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Alert, Modal, Share,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API = 'https://silverlieai.onrender.com';

const RELATION_OPTIONS = [
  { key: 'father',   label: '아버지',    emoji: '👴' },
  { key: 'mother',   label: '어머니',    emoji: '👵' },
  { key: 'spouse',   label: '배우자',    emoji: '💑' },
  { key: 'son',      label: '아들',      emoji: '👦' },
  { key: 'daughter', label: '딸',        emoji: '👧' },
  { key: 'sibling',  label: '형제/자매', emoji: '👫' },
  { key: 'other',    label: '기타',      emoji: '👤' },
];

export default function FamilyConnectScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,      setUserId]      = useState('');
  const [userName,    setUserName]    = useState('');
  const [myCode,      setMyCode]      = useState('');
  const [inputCode,   setInputCode]   = useState('');
  const [connecting,  setConnecting]  = useState(false);
  const [relModal,    setRelModal]    = useState(false);
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);

  // ── 초기화: 연결된 가족 확인 ──
  useEffect(() => {
    const init = async () => {
      const uid   = (await AsyncStorage.getItem('userId'))   || '';
      const uname = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUserName(uname);

      // 이미 연결된 가족이 있으면 바로 대시보드로 (addMode면 건너뜀)
      const addMode = route?.params?.addMode;
      if (!addMode) {
        const stored = await AsyncStorage.getItem('family_members');
        if (stored) {
          const mems = JSON.parse(stored);
          if (mems && mems.length > 0) {
            navigation.replace('FamilyDashboard', { userId: uid, name: uname });
            return;
          }
        }
      }

      // 내 연결 코드 가져오기
      if (uid) {
        try {
          const r = await fetch(`${API}/family/mycode/${uid}`);
          if (r.ok) {
            const d = await r.json();
            setMyCode(d.code || generateCode());
          } else {
            setMyCode(generateCode());
          }
        } catch {
          setMyCode(generateCode());
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = '';
    for (let i = 0; i < 3; i++) r += chars[Math.floor(Math.random() * chars.length)];
    r += '-';
    for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
  };

  // ── 코드 공유 ──
  const shareCode = async () => {
    try {
      await Share.share({
        message: `[SilverLifeAI] 가족 연결 코드: ${myCode}\n앱에서 코드를 입력하면 가족으로 연결됩니다.`,
      });
    } catch {}
  };

  // ── 가족 코드로 연결하기 ──
  const connect = async () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length < 7) {
      Alert.alert('입력 오류', '올바른 연결 코드를 입력해 주세요. (예: ABC-1234)');
      return;
    }
    setConnecting(true);

    try {
      const r = await fetch(`${API}/family/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myUserId: userId, code }),
      });
      if (r.ok) {
        const d = await r.json();
        setPendingMember({
          id:    d.targetUserId || d.userId || '',
          name:  d.name  || '가족',
          phone: d.phone || '',
          relation: '',
        });
        setRelModal(true);
      } else {
        const err = await r.json().catch(() => ({}));
        Alert.alert('연결 실패', err.message || '코드를 다시 확인해 주세요.');
      }
    } catch {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    }
    setConnecting(false);
  };

  // ── 관계 선택 후 저장 ──
  const saveRelation = async (rel: { key: string; label: string }) => {
    if (!pendingMember) return;
    const member = { ...pendingMember, relation: rel.key };

    // AsyncStorage에 family_members 저장
    try {
      const stored = await AsyncStorage.getItem('family_members');
      const existing: any[] = stored ? JSON.parse(stored) : [];
      const updated = [...existing.filter(m => m.id !== member.id), member];
      await AsyncStorage.setItem('family_members', JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`${API}/family/relation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetUserId: pendingMember.id, relation: rel.key }),
      });
    } catch {}

    setRelModal(false);
    navigation.replace('FamilyDashboard', { userId, name: userName });
  };


  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color="#1A4A8A" />
        <Text style={s.loadingTxt}>연결 정보 확인 중...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 14, 28) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>가족 연결</Text>
        <Text style={s.headerSub}>가족과 건강을 함께 확인해 보세요</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── 내 연결 코드 섹션 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>내 연결 코드</Text>
          <Text style={s.sectionDesc}>아래 코드를 가족에게 공유하면{`\n`}가족이 내 건강 정보를 확인할 수 있어요</Text>

          <View style={s.codeBox}>
            <Text style={s.codeText}>{myCode}</Text>
          </View>

          <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
            <Text style={s.shareBtnTxt}>📤  코드 공유하기</Text>
          </TouchableOpacity>
        </View>

        {/* 구분선 */}
        <View style={s.divRow}>
          <View style={s.divLine} />
          <Text style={s.divTxt}>또는</Text>
          <View style={s.divLine} />
        </View>

        {/* ── 가족 코드 입력 섹션 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>가족 코드 입력</Text>
          <Text style={s.sectionDesc}>가족에게 받은 코드를 입력하면{`\n`}가족의 건강 정보를 확인할 수 있어요</Text>

          <TextInput
            style={s.input}
            value={inputCode}
            onChangeText={t => setInputCode(t.toUpperCase())}
            placeholder="ABC-1234"
            placeholderTextColor="#B0BEC5"
            autoCapitalize="characters"
            maxLength={8}
          />

          <TouchableOpacity
            style={[s.connectBtn, connecting && s.connectBtnOff]}
            onPress={connect}
            disabled={connecting}
          >
            {connecting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.connectBtnTxt}>연결하기</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── 관계 선택 모달 ── */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{pendingMember?.name}님과의 관계</Text>
            <Text style={s.modalSub}>연결된 분과의 관계를 선택해 주세요</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {RELATION_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key} style={s.relOpt} onPress={() => saveRelation(opt)}>
                  <Text style={s.relEmoji}>{opt.emoji}</Text>
                  <Text style={s.relLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalCancel} onPress={() => setRelModal(false)}>
              <Text style={s.modalCancelTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F5FB' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },

  header:      { backgroundColor: '#1A4A8A', paddingHorizontal: 24, paddingBottom: 28 },
  backBtn:     { marginBottom: 12, alignSelf: 'flex-start' },
  backArrow:   { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 20, color: 'rgba(255,255,255,0.85)' },

  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },

  section:      { backgroundColor: '#fff', borderRadius: 22, padding: 24, marginBottom: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#1A4A8A', marginBottom: 8 },
  sectionDesc:  { fontSize: 18, color: '#78909C', marginBottom: 22, lineHeight: 28 },

  codeBox:  { backgroundColor: '#EBF3FB', borderRadius: 18, paddingVertical: 30,
              alignItems: 'center', marginBottom: 18,
              borderWidth: 2.5, borderColor: '#1A4A8A' },
  codeText: { fontSize: 40, fontWeight: '900', color: '#1A4A8A', letterSpacing: 6 },

  shareBtn:    { backgroundColor: '#FEE500', borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  shareBtnTxt: { fontSize: 22, fontWeight: '800', color: '#3A1D00' },

  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  divLine:{ flex: 1, height: 1, backgroundColor: '#CFD8DC' },
  divTxt: { fontSize: 20, color: '#90A4AE', marginHorizontal: 16, fontWeight: '700' },

  input: { backgroundColor: '#F5F8FF', borderRadius: 16, borderWidth: 2, borderColor: '#90CAF9',
           fontSize: 28, fontWeight: '800', color: '#1A4A8A',
           paddingVertical: 20, paddingHorizontal: 16,
           textAlign: 'center', marginBottom: 18, letterSpacing: 4 },

  connectBtn:    { backgroundColor: '#1A4A8A', borderRadius: 18, paddingVertical: 22, alignItems: 'center' },
  connectBtnOff: { backgroundColor: '#90A4AE' },
  connectBtnTxt: { fontSize: 24, fontWeight: '900', color: '#fff' },

  loadingTxt: { fontSize: 20, color: '#90A4AE' },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
                 padding: 30, paddingBottom: 48, maxHeight: '80%' },
  modalTitle:  { fontSize: 26, fontWeight: '900', color: '#1A4A8A', textAlign: 'center', marginBottom: 8 },
  modalSub:    { fontSize: 18, color: '#90A4AE', textAlign: 'center', marginBottom: 22 },
  relOpt:  { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#F5F8FF',
             borderRadius: 18, padding: 20, marginBottom: 10 },
  relEmoji:{ fontSize: 32 },
  relLabel:{ fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  modalCancel:    { marginTop: 8, padding: 20, alignItems: 'center',
                    backgroundColor: '#ECEFF1', borderRadius: 16 },
  modalCancelTxt: { fontSize: 22, color: '#546E7A', fontWeight: '700' },
});
