import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Alert, Modal, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';

const RELATION_OPTIONS = [
  { key: 'father',   label: '아버지', emoji: '👴' },
  { key: 'mother',   label: '어머니', emoji: '👵' },
  { key: 'spouse',   label: '배우자', emoji: '💑' },
  { key: 'son',      label: '아들',   emoji: '👦' },
  { key: 'daughter', label: '딸',     emoji: '👧' },
  { key: 'sibling',  label: '형제/자매', emoji: '👫' },
  { key: 'other',    label: '기타',   emoji: '👤' },
];

export default function FamilyConnectScreen({ route, navigation }: any) {
  const [userId,          setUserId]         = useState('');
  const [userName,        setUserName]       = useState('');
  const [myCode,          setMyCode]         = useState('');
  const [inputCode,       setInputCode]      = useState('');
  const [connecting,      setConnecting]     = useState(false);
  const [relModal,        setRelModal]       = useState(false);
  const [pendingSeniorId, setPendingSeniorId]= useState('');

  useEffect(() => {
    const init = async () => {
      const uid   = (await AsyncStorage.getItem('userId'))   || '';
      const uname = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUserName(uname);

      if (DEMO_MODE) {
        navigation.replace('FamilyDashboard', { userId: uid, name: uname });
        return;
      }

      let code = await AsyncStorage.getItem('myFamilyCode');
      if (!code) {
        code = generateCode();
        await AsyncStorage.setItem('myFamilyCode', code);
      }
      setMyCode(code);
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

  const shareCode = async () => {
    try {
      await Share.share({
        message: `SilverLifeAI 가족 연결 코드: ${myCode}\n앱에서 코드를 입력하면 가족으로 연결됩니다.`,
      });
    } catch {}
  };

  const connect = async () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length < 7) {
      Alert.alert('오류', '올바른 연결 코드를 입력해 주세요.');
      return;
    }
    setConnecting(true);
    try {
      const r = await fetch(`${API}/family/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, familyCode: code }),
      });
      if (r.ok) {
        const d = await r.json();
        setPendingSeniorId(d.seniorId || '');
        setRelModal(true);
      } else {
        Alert.alert('연결 실패', '코드를 확인해 주세요.');
      }
    } catch {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    }
    setConnecting(false);
  };

  const saveRelation = async (rel: { key: string; label: string }) => {
    await AsyncStorage.setItem(`relation_${pendingSeniorId}`, rel.key);
    try {
      await fetch(`${API}/family/relation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, seniorId: pendingSeniorId, relation: rel.key }),
      });
    } catch {}
    setRelModal(false);
    navigation.replace('FamilyDashboard', { userId, name: userName });
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: PT }]}>
        <Text style={s.headerTitle}>가족 연결</Text>
        <Text style={s.headerSub}>가족과 건강을 함께 확인해 보세요</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* 내 연결 코드 섹션 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>내 연결 코드</Text>
          <Text style={s.sectionDesc}>아래 코드를 가족에게 공유하세요</Text>

          <View style={s.codeBox}>
            <Text style={s.codeText}>{myCode || 'ABC-1234'}</Text>
          </View>

          <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
            <Text style={s.shareBtnTxt}>📤  코드 공유하기</Text>
          </TouchableOpacity>
        </View>

        {/* 구분선 */}
        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divTxt}>또는</Text>
          <View style={s.divLine} />
        </View>

        {/* 가족 코드 입력 섹션 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>가족 코드 입력</Text>
          <Text style={s.sectionDesc}>가족에게 받은 코드를 입력하세요</Text>

          <TextInput
            style={s.input}
            value={inputCode}
            onChangeText={setInputCode}
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
            <Text style={s.connectBtnTxt}>{connecting ? '연결 중...' : '연결하기'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* 관계 선택 모달 */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>가족과의 관계</Text>
            <Text style={s.modalSub}>연결된 분과의 관계를 선택해 주세요</Text>
            {RELATION_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} style={s.relOpt} onPress={() => saveRelation(opt)}>
                <Text style={s.relEmoji}>{opt.emoji}</Text>
                <Text style={s.relLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
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
  root:        { flex: 1, backgroundColor: '#F0F5FB' },
  header:      { backgroundColor: '#1A4A8A', paddingHorizontal: 24, paddingBottom: 28 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 20, color: 'rgba(255,255,255,0.85)' },

  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },

  section:      { backgroundColor: '#fff', borderRadius: 22, padding: 24, marginBottom: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#1A4A8A', marginBottom: 8 },
  sectionDesc:  { fontSize: 18, color: '#78909C', marginBottom: 22 },

  codeBox:  { backgroundColor: '#EBF3FB', borderRadius: 18, paddingVertical: 28,
              alignItems: 'center', marginBottom: 18,
              borderWidth: 2, borderColor: '#1A4A8A' },
  codeText: { fontSize: 40, fontWeight: '900', color: '#1A4A8A', letterSpacing: 5 },

  shareBtn:    { backgroundColor: '#FEE500', borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  shareBtnTxt: { fontSize: 22, fontWeight: '800', color: '#3A1D00' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: '#CFD8DC' },
  divTxt:  { fontSize: 20, color: '#90A4AE', marginHorizontal: 16, fontWeight: '700' },

  input: { backgroundColor: '#F5F8FF', borderRadius: 16, borderWidth: 2, borderColor: '#90CAF9',
           fontSize: 28, fontWeight: '800', color: '#1A4A8A',
           paddingVertical: 20, paddingHorizontal: 16,
           textAlign: 'center', marginBottom: 18, letterSpacing: 3 },

  connectBtn:    { backgroundColor: '#1A4A8A', borderRadius: 18, paddingVertical: 22, alignItems: 'center' },
  connectBtnOff: { backgroundColor: '#90A4AE' },
  connectBtnTxt: { fontSize: 24, fontWeight: '900', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
                  padding: 30, paddingBottom: 50 },
  modalTitle:   { fontSize: 26, fontWeight: '900', color: '#1A4A8A', textAlign: 'center', marginBottom: 8 },
  modalSub:     { fontSize: 18, color: '#90A4AE', textAlign: 'center', marginBottom: 22 },
  relOpt:   { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#F5F8FF',
              borderRadius: 18, padding: 20, marginBottom: 10 },
  relEmoji: { fontSize: 32 },
  relLabel: { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  modalCancel:    { marginTop: 8, padding: 20, alignItems: 'center',
                    backgroundColor: '#ECEFF1', borderRadius: 16 },
  modalCancelTxt: { fontSize: 22, color: '#546E7A', fontWeight: '700' },
});
