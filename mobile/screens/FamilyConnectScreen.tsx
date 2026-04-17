import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Clipboard, Alert, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../App';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';

const RELATIONS = [
  { key: 'father',  label: '아버지', icon: '👨' },
  { key: 'mother',  label: '어머니', icon: '👩' },
  { key: 'spouse',  label: '배우자', icon: '💑' },
  { key: 'son',     label: '아들',   icon: '👨‍👦' },
  { key: 'daughter',label: '딸',     icon: '👧' },
  { key: 'sibling', label: '형제/자매', icon: '👫' },
  { key: 'other',   label: '기타',   icon: '👤' },
];

export default function FamilyConnectScreen({ route, navigation }: any) {
  const [userId,   setUserId]   = useState<string>(route?.params?.userId || (DEMO_MODE ? 'demo-user' : ''));
  const [name,     setName]     = useState<string>(route?.params?.name   || '');
  const [myCode,   setMyCode]   = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState('');
  const [copied,   setCopied]   = useState(false);

  // 관계 선택 모달
  const [relModal,    setRelModal]    = useState(false);
  const [pendingConn, setPendingConn] = useState<{ seniorId: string; seniorName: string; connectionId?: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      const uid   = storedId   || userId;
      const uname = storedName || name;
      if (storedId)   setUserId(storedId);
      if (storedName) setName(storedName);

      if (DEMO_MODE) {
        navigation.replace('FamilyDashboard', { userId: uid || 'demo-user', name: uname });
        return;
      }

      if (uid) {
        try {
          const r = await fetch(`${API}/family/members/${uid}`);
          if (r.ok) {
            const d = await r.json();
            if (d.members && d.members.length > 0) {
              navigation.replace('FamilyDashboard', { userId: uid, name: uname });
              return;
            }
          }
        } catch {}
      }

      if (uid) {
        try {
          const r = await fetch(`${API}/family/my-code/${uid}`);
          if (r.ok) { const d = await r.json(); setMyCode(d.code || null); }
        } catch {}
      }
    };
    init();
  }, []);

  const generateCode = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/family/generate-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senior_id: userId, senior_name: name }),
      });
      const d = await r.json();
      setMyCode(d.code);
    } catch {
      if (DEMO_MODE) setMyCode('482910');
    } finally { setLoading(false); }
  };

  const copyCode = () => {
    if (!myCode) return;
    Clipboard.setString(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareKakao = () => {
    if (!myCode) return;
    Alert.alert('카카오톡 공유', `코드 ${myCode}를 카카오톡으로 공유합니다.\n\n"Silver Life AI 가족 연결 코드: ${myCode}"`, [{ text: '확인' }]);
  };

  const joinFamily = async () => {
    if (joinCode.replace(/-/g, '').length < 6) { setMsg('6자리 코드를 입력해주세요'); return; }
    setLoading(true); setMsg('');
    try {
      const code = joinCode.replace(/-/g, '');
      const r = await fetch(`${API}/family/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: userId, family_name: name, link_code: code }),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg(`연결 완료! ${d.senior_name}님과 연결되었습니다.`);
        setJoinCode('');
        // 관계 선택 모달 오픈
        setPendingConn({ seniorId: d.senior_id, seniorName: d.senior_name, connectionId: d.connection_id });
        setRelModal(true);
      } else {
        setMsg(d.detail || '연결에 실패했습니다. 코드를 확인해주세요.');
      }
    } catch {
      if (DEMO_MODE) {
        setPendingConn({ seniorId: 'demo-senior', seniorName: '홍길동' });
        setRelModal(true);
      } else {
        setMsg('연결에 실패했습니다. 다시 시도해주세요.');
      }
    } finally { setLoading(false); }
  };

  const saveRelation = async (rel: typeof RELATIONS[0]) => {
    setRelModal(false);
    if (!pendingConn) return;

    // 백엔드에 관계 저장
    try {
      await fetch(`${API}/family/relation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id:     userId,
          senior_id:     pendingConn.seniorId,
          connection_id: pendingConn.connectionId,
          relation:      rel.key,
          relation_label: rel.label,
        }),
      });
    } catch {}

    navigation.replace('FamilyDashboard', {
      userId,
      name,
      seniorId:      pendingConn.seniorId,
      seniorName:    pendingConn.seniorName,
      seniorRelation: rel.key,
    });
  };

  const skipRelation = () => {
    setRelModal(false);
    if (!pendingConn) return;
    navigation.replace('FamilyDashboard', {
      userId, name,
      seniorId:   pendingConn.seniorId,
      seniorName: pendingConn.seniorName,
    });
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F6F2" />
      <View style={[s.header, { paddingTop: PT }]}>
        <Text style={s.headerTitle}>가족 연결</Text>
        <Text style={s.headerSub}>{name ? `${name}님` : '내 계정'}</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.section}>
          <Text style={s.sectionLabel}>내 연결 코드 공유하기</Text>
          <Text style={s.sectionDesc}>이 코드를 가족에게 알려주세요{'\n'}가족이 코드를 입력하면 연결됩니다</Text>
          {myCode ? (
            <>
              <View style={s.codeBox}>
                <Text style={s.codeText}>{myCode}</Text>
              </View>
              <View style={s.codeActions}>
                <TouchableOpacity style={[s.actionBtn, s.copyBtn]} onPress={copyCode}>
                  <Text style={s.actionBtnTxt}>{copied ? '복사됨!' : '복사하기'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, s.kakaoBtn]} onPress={shareKakao}>
                  <Text style={[s.actionBtnTxt, { color: '#3C1E1E' }]}>카카오톡 공유</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={s.generateBtn} onPress={generateCode} disabled={loading}>
              <Text style={s.generateBtnTxt}>{loading ? '생성 중...' : '코드 생성하기'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divTxt}>또는</Text>
          <View style={s.divLine} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>가족 코드 입력하기</Text>
          <Text style={s.sectionDesc}>가족이 공유한 6자리 코드를 입력하세요{'\n'}입력하면 가족의 건강 정보를 볼 수 있어요</Text>
          <TextInput
            style={s.codeInput}
            placeholder="6자리 코드 입력"
            placeholderTextColor="#BDBDBD"
            value={joinCode}
            onChangeText={t => { setJoinCode(t); setMsg(''); }}
            keyboardType="number-pad"
            maxLength={6}
          />
          {msg ? (
            <Text style={[s.msgTxt, msg.includes('완료') ? s.msgOk : s.msgErr]}>{msg}</Text>
          ) : null}
          <TouchableOpacity style={s.joinBtn} onPress={joinFamily} disabled={loading}>
            <Text style={s.joinBtnTxt}>{loading ? '연결 중...' : '연결하기'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SeniorTabBar activeTab="family" userId={userId} name={name} navigation={navigation} />

      {/* 관계 선택 모달 */}
      <Modal visible={relModal} transparent animationType="slide" onRequestClose={skipRelation}>
        <View style={s.overlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>이 분은 어떤 관계인가요?</Text>
            {pendingConn && (
              <Text style={s.modalSub}>{pendingConn.seniorName}님과의 관계를 선택해주세요</Text>
            )}
            <View style={s.relGrid}>
              {RELATIONS.map(rel => (
                <TouchableOpacity
                  key={rel.key}
                  style={s.relBtn}
                  onPress={() => saveRelation(rel)}
                  activeOpacity={0.8}
                >
                  <Text style={s.relIcon}>{rel.icon}</Text>
                  <Text style={s.relLabel}>{rel.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.skipBtn} onPress={skipRelation}>
              <Text style={s.skipTxt}>나중에 설정하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F8F6F2' },
  header:     { backgroundColor: '#1A4A8A', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle:{ fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:  { fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  scroll:     { flex: 1 },
  content:    { padding: 20, paddingBottom: 100 },

  section:     { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 16,
                 shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  sectionLabel:{ fontSize: 22, fontWeight: '800', color: '#1A4A8A', marginBottom: 8 },
  sectionDesc: { fontSize: 17, color: '#666', lineHeight: 26, marginBottom: 20 },

  codeBox:    { backgroundColor: '#EBF3FB', borderRadius: 16, paddingVertical: 22, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#1A4A8A' },
  codeText:   { fontSize: 42, fontWeight: '900', color: '#1A4A8A', letterSpacing: 8 },
  codeActions:{ flexDirection: 'row', gap: 12 },
  actionBtn:  { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  copyBtn:    { backgroundColor: '#1A4A8A' },
  kakaoBtn:   { backgroundColor: '#FEE500' },
  actionBtnTxt:{ fontSize: 18, fontWeight: '800', color: '#fff' },

  generateBtn:   { backgroundColor: '#1A4A8A', borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  generateBtnTxt:{ fontSize: 20, fontWeight: '800', color: '#fff' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  divTxt:  { fontSize: 18, color: '#999', marginHorizontal: 16, fontWeight: '700' },

  codeInput: { borderWidth: 2, borderColor: '#1A4A8A', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
               fontSize: 28, fontWeight: '800', color: '#1A4A8A', textAlign: 'center', letterSpacing: 6, marginBottom: 16 },
  msgTxt:    { fontSize: 17, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  msgOk:     { color: '#2E7D32' },
  msgErr:    { color: '#D32F2F' },
  joinBtn:   { backgroundColor: '#2E7D32', borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  joinBtnTxt:{ fontSize: 22, fontWeight: '900', color: '#fff' },

  // 모달
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
                 padding: 24, paddingBottom: 40 },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 22 },
  modalTitle:  { fontSize: 26, fontWeight: '900', color: '#1A4A8A', textAlign: 'center', marginBottom: 8 },
  modalSub:    { fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 24 },

  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  relBtn:  { width: '30%', backgroundColor: '#F0F5FF', borderRadius: 16, paddingVertical: 18,
             alignItems: 'center', borderWidth: 1.5, borderColor: '#D0DCF0' },
  relIcon: { fontSize: 34, marginBottom: 8 },
  relLabel:{ fontSize: 20, fontWeight: '800', color: '#1A4A8A' },

  skipBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 14 },
  skipTxt: { fontSize: 18, color: '#ABABAB', fontWeight: '600' },
});
