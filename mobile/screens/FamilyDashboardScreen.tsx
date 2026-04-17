import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Linking, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../App';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';

const RELATION_EMOJI: Record<string, string> = {
  father:   '👴',
  mother:   '👵',
  spouse:   '💑',
  son:      '👦',
  daughter: '👧',
  sibling:  '👫',
  other:    '👤',
};

const RELATION_LABEL: Record<string, string> = {
  father:   '아버지',
  mother:   '어머니',
  spouse:   '배우자',
  son:      '아들',
  daughter: '딸',
  sibling:  '형제/자매',
  other:    '',
};

const DEMO_MEMBERS = [
  { id: 'senior-1', name: '홍길동', phone: '010-1234-5678', relation: 'mother' },
  { id: 'senior-2', name: '홍쳊동', phone: '010-9876-5432', relation: 'father' },
];

const DEMO_HEALTH = {
  aiAdvice: '오늘 혈압이 정상 범위입니다. 혈압약을 꾸준히 드시고 계세요. 물을 충분히 드시면 더욱 좋습니다.',
  medications: [
    { name: '혈압약', time: '08:00', taken: true,  dosage: '1정' },
    { name: '당뇨약', time: '08:00', taken: true,  dosage: '1정' },
    { name: '당뇨약', time: '12:00', taken: false, dosage: '1정' },
    { name: '관절약', time: '12:00', taken: false, dosage: '2정' },
    { name: '혈압약', time: '20:00', taken: false, dosage: '1정' },
  ],
  location: '역삼동 자택',
  lastSeen: '오늘 오전 11시 05분',
  vitals: {
    bp: '128/82', bpStatus: '정상',
    glucose: '105', glucoseStatus: '공복 정상',
    temp: '36.5', tempStatus: '정상',
    weight: '68.2', weightStatus: 'BMI 24.1',
  },
};

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const [userId,   setUserId]   = useState<string>(route?.params?.userId || '');
  const [name,     setName]     = useState<string>(route?.params?.name   || '');
  const [members,  setMembers]  = useState<any[]>(DEMO_MODE ? DEMO_MEMBERS : []);
  const [selected, setSelected] = useState<any>(DEMO_MODE ? DEMO_MEMBERS[0] : (route?.params ? { id: route.params.seniorId, name: route.params.seniorName, phone: '' } : null));
  const [health,   setHealth]   = useState<any>(DEMO_MODE ? DEMO_HEALTH : null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const storedId   = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      if (storedId) setUserId(storedId);
      if (storedName) setName(storedName);
    };
    loadUser();
    if (!DEMO_MODE) { fetchMembers(); }
  }, []);

  useEffect(() => {
    if (selected && !DEMO_MODE) fetchHealth(selected.id);
    if (selected && DEMO_MODE) setHealth(DEMO_HEALTH);
  }, [selected]);

  const fetchMembers = async () => {
    try {
      const r = await fetch(`${API}/family/members/${userId}`);
      if (r.ok) {
        const d = await r.json();
        setMembers(d.members || []);
        if (d.members?.length > 0 && !selected) setSelected(d.members[0]);
      }
    } catch {}
  };

  const fetchHealth = async (seniorId: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/family/health/${seniorId}`);
      if (r.ok) setHealth(await r.json());
    } catch {}
    finally { setLoading(false); }
  };

  const callMember = () => {
    if (!selected?.phone) { Alert.alert('전화번호 없음', '등록된 전화번호가 없습니다.'); return; }
    Linking.openURL(`tel:${selected.phone.replace(/-/g, '')}`);
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;
  const takenCount  = health?.medications?.filter((m: any) => m.taken).length || 0;
  const totalCount  = health?.medications?.length || 0;
  const missedCount = totalCount - takenCount;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>가족 건강</Text>
          <Text style={s.headerSub}>{name ? `${name}님의 가족 현황` : '가족 현황'}</Text>
        </View>
        {selected?.phone ? (
          <TouchableOpacity style={s.callBtn} onPress={callMember}>
            <Text style={s.callIcon}>📞</Text>
            <Text style={s.callTxt}>전화</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 멤버 선택 가로스크롤 */}
      <View style={s.memberBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.memberScroll}>
          {members.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.memberChip, selected?.id === m.id && s.memberChipOn]}
              onPress={() => setSelected(m)}
            >
              <Text style={s.memberIcon}>{RELATION_EMOJI[m.relation] || '👤'}</Text>
              <View>
                {m.relation && m.relation !== 'other' ? (
                  <>
                    <Text style={[s.memberRelation, selected?.id === m.id && s.memberRelationOn]}>{RELATION_LABEL[m.relation] || m.relation}</Text>
                    <Text style={[s.memberSubName, selected?.id === m.id && s.memberSubNameOn]}>{m.name}</Text>
                  </>
                ) : (
                  <Text style={[s.memberName, selected?.id === m.id && s.memberNameOn]}>{m.name}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* 위치 정보 */}
        {health?.location ? (
          <View style={s.card}>
            <Text style={s.cardLabel}>현재 위치</Text>
            <View style={s.locationRow}>
              <Text style={s.locationIcon}>📍</Text>
              <View>
                <Text style={s.locationTxt}>{health.location}</Text>
                <Text style={s.locationSub}>마지막 확인: {health.lastSeen}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* AI 건강조언 카드 */}
        {health?.aiAdvice ? (
          <View style={[s.card, s.aiCard]}>
            <View style={s.aiCardHeader}>
              <Text style={s.aiIcon}>🤖</Text>
              <Text style={s.aiLabel}>AI 건강조언</Text>
            </View>
            <Text style={s.aiAdviceTxt}>{health.aiAdvice}</Text>
          </View>
        ) : null}



        {/* 복용약 현황 */}
        {health?.medications ? (
          <View style={s.card}>
            <View style={s.medHeader}>
              <Text style={s.cardLabel}>복용약 현황</Text>
              <View style={s.medBadge}>
                <Text style={s.medBadgeTxt}>{takenCount}/{totalCount} 복용</Text>
              </View>
            </View>
            {missedCount > 0 ? (
              <View style={s.medAlert}>
                <Text style={s.medAlertTxt}>미복용 {missedCount}건이 있습니다</Text>
              </View>
            ) : (
              <View style={[s.medAlert, s.medAlertOk]}>
                <Text style={[s.medAlertTxt, { color: '#2E7D32' }]}>오늘 복약을 모두 완료했습니다!</Text>
              </View>
            )}
            <View style={s.medTable}>
              <View style={s.medTableHead}>
                <Text style={[s.medCol, s.medColName]}>약 이름</Text>
                <Text style={[s.medCol, s.medColTime]}>시간</Text>
                <Text style={[s.medCol, s.medColDose]}>용량</Text>
                <Text style={[s.medCol, s.medColStatus]}>복용</Text>
              </View>
              {health.medications.map((m: any, i: number) => (
                <View key={i} style={[s.medRow, i % 2 === 0 && s.medRowEven]}>
                  <Text style={[s.medCol, s.medColName, s.medCellTxt]}>{m.name}</Text>
                  <Text style={[s.medCol, s.medColTime, s.medCellTxt]}>{m.time}</Text>
                  <Text style={[s.medCol, s.medColDose, s.medCellTxt]}>{m.dosage}</Text>
                  <Text style={[s.medCol, s.medColStatus, m.taken ? s.takenTxt : s.notTakenTxt]}>
                    {m.taken ? '완료' : '미복용'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {loading ? <Text style={s.loadingTxt}>불러오는 중...</Text> : null}

      </ScrollView>

      <SeniorTabBar activeTab="family" userId={userId} name={name} navigation={navigation} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F5FB' },

  header: { backgroundColor: '#1A4A8A', paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerLeft: {},
  headerTitle:{ fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:  { fontSize: 17, color: 'rgba(255,255,255,0.85)' },
  callBtn:    { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  callIcon:   { fontSize: 22 },
  callTxt:    { fontSize: 14, fontWeight: '700', color: '#1A4A8A', marginTop: 2 },

  memberBar:    { backgroundColor: '#1A4A8A', paddingBottom: 16 },
  memberScroll: { paddingHorizontal: 16, gap: 10 },
  memberChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10, gap: 8 },
  memberChipOn:    { backgroundColor: '#fff' },
  memberIcon:      { fontSize: 22 },
  memberName:      { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  memberNameOn:    { color: '#1A4A8A' },
  memberRelation:  { fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  memberRelationOn:{ color: '#1A4A8A' },
  memberSubName:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  memberSubNameOn: { color: '#888' },

  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 100 },

  card:     { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardLabel:{ fontSize: 20, fontWeight: '800', color: '#1A4A8A', marginBottom: 14 },

  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  locationIcon:{ fontSize: 28 },
  locationTxt: { fontSize: 20, fontWeight: '700', color: '#2C2C2C', marginBottom: 4 },
  locationSub: { fontSize: 15, color: '#888' },

  aiCard:       { backgroundColor: '#EBF3FB', borderWidth: 1.5, borderColor: '#1A4A8A' },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  aiIcon:       { fontSize: 26 },
  aiLabel:      { fontSize: 20, fontWeight: '800', color: '#1A4A8A' },
  aiAdviceTxt:  { fontSize: 18, color: '#2C3E50', lineHeight: 28 },


  medHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  medBadge:      { backgroundColor: '#EBF3FB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  medBadgeTxt:   { fontSize: 16, fontWeight: '700', color: '#1A4A8A' },
  medAlert:      { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12, marginBottom: 14 },
  medAlertOk:    { backgroundColor: '#E8F5E9' },
  medAlertTxt:   { fontSize: 17, fontWeight: '700', color: '#E65100', textAlign: 'center' },

  medTable:    { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E8F0' },
  medTableHead:{ flexDirection: 'row', backgroundColor: '#1A4A8A', paddingVertical: 12, paddingHorizontal: 8 },
  medRow:      { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#EEF2F8' },
  medRowEven:  { backgroundColor: '#F8FAFD' },
  medCol:      { flex: 1, fontSize: 16 },
  medColName:  { flex: 2 },
  medColTime:  { flex: 1.5 },
  medColDose:  { flex: 1 },
  medColStatus:{ flex: 1.2, textAlign: 'center' },
  medCellTxt:  { color: '#2C2C2C', fontWeight: '600' },
  takenTxt:    { color: '#2E7D32', fontWeight: '800', textAlign: 'center' },
  notTakenTxt: { color: '#D32F2F', fontWeight: '800', textAlign: 'center' },

  loadingTxt: { textAlign: 'center', fontSize: 18, color: '#888', marginTop: 20 },
});
