import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Alert, TextInput,
} from 'react-native';
import { DEMO_MODE } from '../App';

const API   = 'https://silverlieai.onrender.com';
const GREEN = '#3D8B6C';
const CREAM = '#FFF9F4';

export default function FamilyConnectScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || '';

  const [myCode,    setMyCode]    = useState<string | null>(null);
  const [joinCode,  setJoinCode]  = useState('');
  const [links,     setLinks]     = useState<any>({ as_senior: [], as_family: [] });
  const [tab,       setTab]       = useState<'senior' | 'family'>('senior');
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState('');

  useEffect(() => { fetchLinks(); }, []);

  const fetchLinks = async () => {
    try {
      const r = await fetch(`${API}/family/links/${userId}`);
      const d = await r.json();
      setLinks(d);
    } catch {}
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/family/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senior_id: userId, senior_name: name }),
      });
      const d = await r.json();
      setMyCode(d.code);
    } catch {
      if (DEMO_MODE) setMyCode('482910');
    } finally { setLoading(false); }
  };

  const joinFamily = async () => {
    if (joinCode.length !== 6) { setMsg('6자리 코드를 입력해주세요'); return; }
    setLoading(true); setMsg('');
    try {
      const r = await fetch(`${API}/family/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: userId, family_name: name, link_code: joinCode }),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg(`✅ ${d.senior_name}님과 연결되었습니다!`);
        setJoinCode('');
        fetchLinks();
      } else {
        setMsg(d.detail || '연결에 실패했습니다');
      }
    } catch {
      if (DEMO_MODE) setMsg('✅ 홍길동님과 연결되었습니다! (데모)');
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <View style={s.header}>
        <Text style={s.headerTitle}>👨‍👩‍👧 가족 연결</Text>
        <Text style={s.headerSub}>가족과 건강 정보를 공유해요</Text>
      </View>

      {/* 탭 */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'senior' && s.tabBtnOn]} onPress={() => setTab('senior')}>
          <Text style={[s.tabBtnTxt, tab === 'senior' && s.tabBtnTxtOn]}>👴 나의 연결 코드</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'family' && s.tabBtnOn]} onPress={() => setTab('family')}>
          <Text style={[s.tabBtnTxt, tab === 'family' && s.tabBtnTxtOn]}>👨‍👩‍👧 가족 코드 입력</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {tab === 'senior' ? (
          <View>
            <Text style={s.desc}>자녀에게 아래 코드를 알려주세요.{'\n'}자녀가 코드를 입력하면 건강 정보가 공유됩니다.</Text>
            {myCode ? (
              <View style={s.codeBox}>
                <Text style={s.codeLabel}>연결 코드</Text>
                <Text style={s.codeNum}>{myCode}</Text>
                <Text style={s.codeHint}>이 코드를 자녀에게 알려주세요</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.genBtn} onPress={generateCode} disabled={loading} activeOpacity={0.85}>
                <Text style={s.genBtnTxt}>{loading ? '생성 중...' : '🔑 연결 코드 만들기'}</Text>
              </TouchableOpacity>
            )}

            {/* 연결된 가족 목록 */}
            {links.as_senior?.length > 0 && (
              <View style={s.linkedBox}>
                <Text style={s.linkedTitle}>연결된 가족</Text>
                {links.as_senior.map((l: any) => (
                  <View key={l.id} style={s.linkedRow}>
                    <Text style={s.linkedIcon}>👤</Text>
                    <Text style={s.linkedName}>{l.family_name || '가족'}</Text>
                    <Text style={s.linkedStatus}>연결됨 ✅</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={s.desc}>부모님께 연결 코드를 받아 입력하세요.{'\n'}부모님의 약 복용 현황을 확인할 수 있습니다.</Text>
            <View style={s.joinRow}>
              <TextInput
                style={s.codeInput}
                value={joinCode}
                onChangeText={t => setJoinCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="6자리 숫자 입력"
                placeholderTextColor="#bbb"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={[s.joinBtn, joinCode.length !== 6 && { opacity: 0.4 }]}
                onPress={joinFamily} disabled={loading || joinCode.length !== 6} activeOpacity={0.85}>
                <Text style={s.joinBtnTxt}>{loading ? '...' : '연결'}</Text>
              </TouchableOpacity>
            </View>
            {msg ? <Text style={[s.msg, msg.startsWith('✅') && { color: GREEN }]}>{msg}</Text> : null}

            {/* 연결된 시니어 목록 */}
            {links.as_family?.length > 0 && (
              <View style={s.linkedBox}>
                <Text style={s.linkedTitle}>연결된 부모님</Text>
                {links.as_family.map((l: any) => (
                  <TouchableOpacity key={l.id} style={s.linkedRow}
                    onPress={() => navigation.navigate('FamilyDashboard', { seniorId: l.senior_id, seniorName: l.senior_name, userId, name })}>
                    <Text style={s.linkedIcon}>👴</Text>
                    <Text style={s.linkedName}>{l.senior_name}님</Text>
                    <Text style={s.linkedStatus}>현황 보기 ›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 하단 탭 */}
      <View style={s.tabbar}>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('SeniorHome', { userId, name })}>
          <Text style={s.tabIcon}>🏠</Text><Text style={s.tabLbl}>오늘</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('Medication', { userId, name })}>
          <Text style={s.tabIcon}>💊</Text><Text style={s.tabLbl}>내 약</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('AIChat', { userId, name })}>
          <Text style={s.tabIcon}>🤖</Text><Text style={s.tabLbl}>AI 상담</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('Settings', { userId, name })}>
          <Text style={s.tabIcon}>👤</Text><Text style={s.tabLbl}>내 정보</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: CREAM },
  header:       { backgroundColor: GREEN, paddingHorizontal: 20,
                  paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
                  paddingBottom: 20 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub:    { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  tabRow:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBtn:       { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnOn:     { borderBottomColor: GREEN },
  tabBtnTxt:    { fontSize: 14, fontWeight: '600', color: '#aaa' },
  tabBtnTxtOn:  { color: GREEN },
  desc:         { fontSize: 15, color: '#666', lineHeight: 24, marginBottom: 20 },
  codeBox:      { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16,
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  codeLabel:    { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8 },
  codeNum:      { fontSize: 48, fontWeight: '900', letterSpacing: 8, color: GREEN, marginBottom: 8 },
  codeHint:     { fontSize: 13, color: '#aaa', textAlign: 'center' },
  genBtn:       { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  genBtnTxt:    { fontSize: 17, fontWeight: '700', color: '#fff' },
  joinRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  codeInput:    { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 22,
                  fontWeight: '700', textAlign: 'center', letterSpacing: 6, borderWidth: 2, borderColor: '#eee' },
  joinBtn:      { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  joinBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  msg:          { textAlign: 'center', fontSize: 14, color: '#e53935', marginTop: 4 },
  linkedBox:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 20,
                  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  linkedTitle:  { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 10 },
  linkedRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  linkedIcon:   { fontSize: 24, marginRight: 12 },
  linkedName:   { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  linkedStatus: { fontSize: 13, color: GREEN, fontWeight: '600' },
  tabbar:       { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 8, paddingBottom: 12 },
  tab:          { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:      { fontSize: 22, opacity: 0.35 },
  tabLbl:       { fontSize: 10, color: '#b0bec5', fontWeight: '500' },
});
