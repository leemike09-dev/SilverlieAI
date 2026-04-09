import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput,
} from 'react-native';
import { DEMO_MODE } from '../App';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const C = {
  bg:      '#FDFAF6',
  card:    '#FFFFFF',
  sage:    '#6BAE8F',
  sageLt:  '#EAF5EF',
  peach:   '#F4956A',
  peachLt: '#FEF0E8',
  sky:     '#6BA8C8',
  skyLt:   '#E8F4FB',
  text:    '#2C2C2C',
  sub:     '#8A8A8A',
  line:    '#F0EDE8',
};

export default function FamilyConnectScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || '';

  const [myCode,   setMyCode]   = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [links,    setLinks]    = useState<any>({ as_senior: [], as_family: [] });
  const [tab,      setTab]      = useState<'senior' | 'family'>('senior');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState('');

  useEffect(() => { fetchLinks(); }, []);

  const fetchLinks = async () => {
    try {
      const r = await fetch(`${API}/family/links/${userId}`);
      setLinks(await r.json());
    } catch {}
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/family/generate-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senior_id: userId, senior_name: name }),
      });
      const d = await r.json();
      setMyCode(d.code);
    } catch { if (DEMO_MODE) setMyCode('482910'); }
    finally { setLoading(false); }
  };

  const joinFamily = async () => {
    if (joinCode.length !== 6) { setMsg('6자리 코드를 입력해주세요'); return; }
    setLoading(true); setMsg('');
    try {
      const r = await fetch(`${API}/family/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: userId, family_name: name, link_code: joinCode }),
      });
      const d = await r.json();
      if (r.ok) { setMsg(`✅ ${d.senior_name}님과 연결되었습니다!`); setJoinCode(''); fetchLinks(); setTimeout(() => navigation.navigate('FamilyDashboard', { userId, name, seniorId: d.senior_id, seniorName: d.senior_name }), 1000); }
      else setMsg(d.detail || '연결에 실패했습니다');
    } catch { if (DEMO_MODE) { setMsg('✅ 홍길동님과 연결되었습니다! (데모)'); setTimeout(() => navigation.navigate('FamilyDashboard', { userId, name, seniorId: 'demo-senior', seniorName: '홍길동' }), 1000); } }
    finally { setLoading(false); }
  };

  return (
    <View style={s.root}>

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>👨‍👩‍👧 가족 연결</Text>
        <Text style={s.headerSub}>가족과 건강 정보를 공유해요</Text>
      </View>

      {/* 탭 */}
      <View style={s.segRow}>
        <TouchableOpacity style={[s.seg, tab === 'senior' && s.segOn]}
          onPress={() => setTab('senior')}>
          <Text style={[s.segTxt, tab === 'senior' && s.segTxtOn]}>👴 내 연결 코드</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.seg, tab === 'family' && s.segOn]}
          onPress={() => setTab('family')}>
          <Text style={[s.segTxt, tab === 'family' && s.segTxtOn]}>🔗 코드 입력</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 100 }}>

        {tab === 'senior' ? (
          <>
            <View style={s.descCard}>
              <Text style={s.descIcon}>📲</Text>
              <Text style={s.desc}>자녀에게 코드를 알려주세요.{'\n'}자녀가 앱에서 코드를 입력하면{'\n'}건강 정보가 자동으로 공유됩니다.</Text>
            </View>

            {myCode ? (
              <View style={s.codeCard}>
                <Text style={s.codeLbl}>연결 코드</Text>
                <Text style={s.codeNum}>
                  {myCode.slice(0,3)} {myCode.slice(3)}
                </Text>
                <View style={s.codeHintRow}>
                  <Text style={s.codeHint}>자녀에게 이 번호를 알려주세요</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={s.genBtn} onPress={generateCode}
                disabled={loading} activeOpacity={0.88}>
                <Text style={s.genBtnTxt}>{loading ? '생성 중...' : '🔑 코드 만들기'}</Text>
              </TouchableOpacity>
            )}

            {links.as_senior?.length > 0 && (
              <View style={s.linkedCard}>
                <Text style={s.linkedTitle}>연결된 가족</Text>
                {links.as_senior.map((l: any) => (
                  <View key={l.id} style={s.linkedRow}>
                    <View style={s.linkedAvatar}><Text style={{ fontSize: 18 }}>👤</Text></View>
                    <Text style={s.linkedName}>{l.family_name || '가족'}님</Text>
                    <View style={s.linkedBadge}><Text style={s.linkedBadgeTxt}>연결됨</Text></View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={s.descCard}>
              <Text style={s.descIcon}>💌</Text>
              <Text style={s.desc}>부모님께 받은 6자리 코드를{'\n'}아래에 입력해주세요.</Text>
            </View>

            <View style={s.inputCard}>
              <TextInput
                style={s.codeInput}
                value={joinCode}
                onChangeText={t => setJoinCode(t.replace(/[^0-9]/g,'').slice(0,6))}
                placeholder="0  0  0  0  0  0"
                placeholderTextColor="#D0CBC4"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[s.joinBtn, (loading || joinCode.length !== 6) && { opacity: 0.4 }]}
                onPress={joinFamily}
                disabled={loading || joinCode.length !== 6}
                activeOpacity={0.88}>
                <Text style={s.joinBtnTxt}>{loading ? '연결 중...' : '연결하기'}</Text>
              </TouchableOpacity>
            </View>

            {msg ? (
              <View style={[s.msgBox, msg.startsWith('✅') && s.msgBoxOk]}>
                <Text style={[s.msgTxt, msg.startsWith('✅') && { color: C.sage }]}>{msg}</Text>
              </View>
            ) : null}

            {links.as_family?.length > 0 && (
              <View style={s.linkedCard}>
                <Text style={s.linkedTitle}>연결된 부모님</Text>
                {links.as_family.map((l: any) => (
                  <TouchableOpacity key={l.id} style={s.linkedRow}
                    onPress={() => navigation.navigate('FamilyDashboard', {
                      seniorId: l.senior_id, seniorName: l.senior_name, userId, name })}>
                    <View style={[s.linkedAvatar, { backgroundColor: C.peachLt }]}>
                      <Text style={{ fontSize: 18 }}>👴</Text>
                    </View>
                    <Text style={s.linkedName}>{l.senior_name}님</Text>
                    <Text style={{ color: C.peach, fontWeight: '700', fontSize: 13 }}>현황 보기 →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 탭바 */}
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  header:        { backgroundColor: C.sky, paddingHorizontal: 22,
                   paddingTop: Platform.OS === 'web' ? 22 : (StatusBar.currentHeight ?? 28) + 10,
                   paddingBottom: 24 },
  headerTitle:   { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub:     { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  segRow:        { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line },
  seg:           { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  segOn:         { borderBottomColor: C.sky },
  segTxt:        { fontSize: 14, fontWeight: '600', color: '#BABABA' },
  segTxtOn:      { color: C.sky },
  descCard:      { backgroundColor: C.skyLt, borderRadius: 20, padding: 20, flexDirection: 'row',
                   gap: 14, marginBottom: 20, alignItems: 'center' },
  descIcon:      { fontSize: 32 },
  desc:          { fontSize: 15, color: C.text, lineHeight: 24, flex: 1 },
  codeCard:      { backgroundColor: C.card, borderRadius: 24, padding: 30, alignItems: 'center',
                   marginBottom: 20, shadowColor:'#B8A898', shadowOpacity:0.15, shadowRadius:14, elevation:4 },
  codeLbl:       { fontSize: 13, color: C.sub, fontWeight: '600', marginBottom: 12 },
  codeNum:       { fontSize: 52, fontWeight: '900', letterSpacing: 10, color: C.sky, marginBottom: 14 },
  codeHintRow:   { backgroundColor: C.skyLt, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  codeHint:      { fontSize: 13, color: C.sky, fontWeight: '600' },
  genBtn:        { backgroundColor: C.sky, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  genBtnTxt:     { fontSize: 17, fontWeight: '700', color: '#fff' },
  inputCard:     { backgroundColor: C.card, borderRadius: 24, padding: 22, marginBottom: 14,
                   shadowColor:'#B8A898', shadowOpacity:0.12, shadowRadius:12, elevation:3 },
  codeInput:     { fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 14,
                   color: C.text, backgroundColor: C.bg, borderRadius: 16, paddingVertical: 18,
                   marginBottom: 16, borderWidth: 1, borderColor: C.line },
  joinBtn:       { backgroundColor: C.sky, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  joinBtnTxt:    { fontSize: 17, fontWeight: '700', color: '#fff' },
  msgBox:        { backgroundColor: '#FEE8E8', borderRadius: 14, padding: 14, marginBottom: 16 },
  msgBoxOk:      { backgroundColor: C.sageLt },
  msgTxt:        { fontSize: 14, color: '#E53935', textAlign: 'center', fontWeight: '600' },
  linkedCard:    { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 8,
                   shadowColor:'#B8A898', shadowOpacity:0.10, shadowRadius:10, elevation:2 },
  linkedTitle:   { fontSize: 14, fontWeight: '700', color: C.sub, marginBottom: 12 },
  linkedRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                   borderTopWidth: 1, borderTopColor: C.line, gap: 12 },
  linkedAvatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: C.sageLt,
                   alignItems: 'center', justifyContent: 'center' },
  linkedName:    { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },
  linkedBadge:   { backgroundColor: C.sageLt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  linkedBadgeTxt:{ fontSize: 12, color: C.sage, fontWeight: '700' },
  tabbar:        { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, paddingBottom: 14 },
  tab:           { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon:       { fontSize: 22, opacity: 0.3 },
  tabLbl:        { fontSize: 10, color: '#BABABA', fontWeight: '500' },
});
