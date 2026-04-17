import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Linking, Alert, Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';

const RELATION_EMOJI: Record<string, string> = {
  father:   '\u{1F474}',
  mother:   '\u{1F475}',
  spouse:   '\u{1F491}',
  son:      '\u{1F466}',
  daughter: '\u{1F467}',
  sibling:  '\u{1F46B}',
  other:    '\u{1F464}',
};

const RELATION_LABEL: Record<string, string> = {
  father:   '아버지',
  mother:   '어머니',
  spouse:   '배우자',
  son:      '아들',
  daughter: '딸',
  sibling:  '형제/자매',
  other:    '기타',
};

const RELATION_OPTIONS = [
  { key: 'father',   label: '아버지', emoji: '\u{1F474}' },
  { key: 'mother',   label: '어머니', emoji: '\u{1F475}' },
  { key: 'spouse',   label: '배우자', emoji: '\u{1F491}' },
  { key: 'son',      label: '아들',   emoji: '\u{1F466}' },
  { key: 'daughter', label: '딸',   emoji: '\u{1F467}' },
  { key: 'sibling',  label: '형제/자매', emoji: '\u{1F46B}' },
  { key: 'other',    label: '기타',   emoji: '\u{1F464}' },
];

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const [userId,      setUserId]      = useState<string>(route?.params?.userId || '');
  const [name,        setName]        = useState<string>(route?.params?.name   || '');
  const [members,     setMembers]     = useState<any[]>([]);
  const [selected,    setSelected]    = useState<any>(
    route?.params?.seniorId
      ? { id: route.params.seniorId, name: route.params.seniorName || '', phone: '', relation: route.params.seniorRelation || '' }
      : null
  );
  const [location,    setLocation]    = useState<any>(null);
  const [aiAdvice,    setAiAdvice]    = useState<string>('');
  const [medications, setMedications] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [relModal,    setRelModal]    = useState(false);
  const [relTarget,   setRelTarget]   = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const storedId   = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      const uid = storedId || route?.params?.userId || '';
      const uname = storedName || route?.params?.name || '';
      if (storedId) setUserId(uid);
      if (storedName) setName(uname);
      await fetchMembers(uid);
    };
    init();
  }, []);

  useEffect(() => {
    if (selected?.id) {
      fetchDashboard(selected.id);
    } else {
      setLocation(null);
      setAiAdvice('');
      setMedications([]);
    }
  }, [selected]);

  const fetchMembers = async (uid?: string) => {
    const id = uid || userId;
    if (!id) return;
    try {
      const r = await fetch(`${API}/family/members/${id}`);
      if (r.ok) {
        const d = await r.json();
        const mems = await Promise.all(
          (d.members || []).map(async (m: any) => {
            const savedRel = await AsyncStorage.getItem(`relation_${m.id}`);
            return { ...m, relation: savedRel || m.relation || '' };
          })
        );
        setMembers(mems);
        if (mems.length > 0 && !selected) {
          setSelected(mems[0]);
        }
      }
    } catch {}
  };

  const fetchDashboard = async (seniorId: string) => {
    setLoading(true);
    setLocation(null);
    setAiAdvice('');
    setMedications([]);
    try {
      // Location
      const locR = await fetch(`${API}/location/today/${seniorId}`);
      if (locR.ok) {
        const locD = await locR.json();
        if (locD && (locD.location || locD.address)) {
          setLocation(locD);
        }
      }
    } catch {}
    try {
      // AI advice
      const aiR = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: seniorId, message: '오늘 건강 상태를 간단히 요약해주세요' }),
      });
      if (aiR.ok) {
        const aiD = await aiR.json();
        setAiAdvice(aiD.reply || aiD.message || '');
      }
    } catch {}
    try {
      // Dashboard (medications)
      const dashR = await fetch(`${API}/family/dashboard/${seniorId}`);
      if (dashR.ok) {
        const dashD = await dashR.json();
        setMedications(dashD.medications || []);
      }
    } catch {}
    setLoading(false);
  };

  const callMember = () => {
    if (!selected?.phone) { Alert.alert('전화번호 없음', '등록된 전화번호가 없습니다.'); return; }
    Linking.openURL(`tel:${selected.phone.replace(/-/g, '')}`);
  };

  const openRelModal = (member: any) => {
    setRelTarget(member);
    setRelModal(true);
  };

  const saveRelation = async (rel: { key: string; label: string }) => {
    if (!relTarget) return;
    try {
      await AsyncStorage.setItem(`relation_${relTarget.id}`, rel.key);
      await fetch(`${API}/family/relation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, seniorId: relTarget.id, relation: rel.key }),
      });
    } catch {}
    const updated = members.map(m =>
      m.id === relTarget.id ? { ...m, relation: rel.key } : m
    );
    setMembers(updated);
    if (selected?.id === relTarget.id) {
      setSelected((prev: any) => ({ ...prev, relation: rel.key }));
    }
    setRelModal(false);
    setRelTarget(null);
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;
  const takenCount  = medications.filter((m: any) => m.taken).length;
  const totalCount  = medications.length;
  const missedCount = totalCount - takenCount;

  const headerLabel = selected
    ? (selected.relation && selected.relation !== 'other'
        ? `${RELATION_LABEL[selected.relation] || ''} ${selected.name}님`
        : `${selected.name}님`)
    : (name ? `${name}님의 가족 현황` : '가족 현황');

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>가족 건강</Text>
          <Text style={s.headerSub}>{headerLabel}</Text>
        </View>
        {selected?.phone ? (
          <TouchableOpacity style={s.callBtn} onPress={callMember}>
            <Text style={s.callIcon}>{'\u{1F4DE}'}</Text>
            <Text style={s.callTxt}>전화</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 멤버 선택 */}
      {members.length > 0 ? (
        <View style={s.memberBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.memberScroll}>
            {members.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.memberChip, selected?.id === m.id && s.memberChipOn]}
                onPress={() => setSelected(m)}
              >
                <Text style={s.memberIcon}>{RELATION_EMOJI[m.relation] || '\u{1F464}'}</Text>
                <View>
                  {m.relation && m.relation !== 'other' ? (
                    <>
                      <Text style={[s.memberRelation, selected?.id === m.id && s.memberRelationOn]}>
                        {RELATION_LABEL[m.relation] || m.relation}
                      </Text>
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
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* 관계 설정 버튼 */}
        {selected && !selected.relation ? (
          <TouchableOpacity style={s.relBtn} onPress={() => openRelModal(selected)}>
            <Text style={s.relBtnIcon}>{'\u{1F46A}'}</Text>
            <Text style={s.relBtnTxt}>{selected.name}님과의 관계를 설정해 주세요</Text>
            <Text style={s.relBtnArrow}>{'>'}</Text>
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1A4A8A" />
            <Text style={s.loadingTxt}>불러오는 중...</Text>
          </View>
        ) : (
          <>
            {/* 위치 정보 */}
            <View style={s.card}>
              <Text style={s.cardLabel}>현재 위치</Text>
              {location ? (
                <View style={s.locationRow}>
                  <Text style={s.locationIcon}>{'\u{1F4CD}'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.locationTxt}>{location.address || location.location || ''}</Text>
                    {location.timestamp ? (
                      <Text style={s.locationSub}>마지막 확인: {location.timestamp}</Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={s.emptyTxt}>아직 기록된 위치 데이터가 없어요</Text>
              )}
              <TouchableOpacity
                style={s.mapBtn}
                onPress={() => navigation.navigate('LocationMap', {
                  seniorName: selected?.name || '',
                  logs: location?.logs || [],
                  totalDist: location?.totalDist || 0,
                })}
              >
                <Text style={s.mapBtnTxt}>🗺️  오늘 동선 확인</Text>
              </TouchableOpacity>
            </View>

            {/* AI 건강조언 */}
            <View style={[s.card, s.aiCard]}>
              <View style={s.aiCardHeader}>
                <Text style={s.aiIcon}>{'\u{1F916}'}</Text>
                <Text style={s.aiLabel}>AI 건강조언</Text>
              </View>
              {aiAdvice ? (
                <Text style={s.aiAdviceTxt}>{aiAdvice}</Text>
              ) : (
                <Text style={s.emptyTxt}>아직 기록된 데이터가 없어요</Text>
              )}
            </View>

            {/* 복용약 현황 */}
            <View style={s.card}>
              <View style={s.medHeader}>
                <Text style={s.cardLabel}>복용약 현황</Text>
                {totalCount > 0 ? (
                  <View style={s.medBadge}>
                    <Text style={s.medBadgeTxt}>{takenCount}/{totalCount} 복용</Text>
                  </View>
                ) : null}
              </View>
              {totalCount === 0 ? (
                <Text style={s.emptyTxt}>아직 기록된 데이터가 없어요</Text>
              ) : (
                <>
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
                      <Text style={[s.medCol, s.medColName, s.medHeadTxt]}>약 이름</Text>
                      <Text style={[s.medCol, s.medColTime, s.medHeadTxt]}>시간</Text>
                      <Text style={[s.medCol, s.medColDose, s.medHeadTxt]}>용량</Text>
                      <Text style={[s.medCol, s.medColStatus, s.medHeadTxt]}>복용</Text>
                    </View>
                    {medications.map((m: any, i: number) => (
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
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 관계 설정 모달 */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {relTarget?.name}님과의 관계
            </Text>
            <Text style={s.modalSub}>관계를 선택하면 이후 표시됩니다</Text>
            {RELATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={s.relOption}
                onPress={() => saveRelation(opt)}
              >
                <Text style={s.relOptionEmoji}>{opt.emoji}</Text>
                <Text style={s.relOptionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalCancel} onPress={() => setRelModal(false)}>
              <Text style={s.modalCancelTxt}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SeniorTabBar activeTab="family" userId={userId} name={name} navigation={navigation} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F5FB' },

  header: { backgroundColor: '#1A4A8A', paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerLeft: {},
  headerTitle:{ fontSize: 38, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:  { fontSize: 26, color: 'rgba(255,255,255,0.85)' },
  callBtn:    { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  callIcon:   { fontSize: 32 },
  callTxt:    { fontSize: 22, fontWeight: '700', color: '#1A4A8A', marginTop: 2 },

  memberBar:    { backgroundColor: '#1A4A8A', paddingBottom: 16 },
  memberScroll: { paddingHorizontal: 16, gap: 10 },
  memberChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10, gap: 8 },
  memberChipOn:    { backgroundColor: '#fff' },
  memberIcon:      { fontSize: 32 },
  memberName:      { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  memberNameOn:    { color: '#1A4A8A' },
  memberRelation:  { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  memberRelationOn:{ color: '#1A4A8A' },
  memberSubName:   { fontSize: 20, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  memberSubNameOn: { color: '#888' },

  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 100 },

  relBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: '#FFB300' },
  relBtnIcon:  { fontSize: 34, marginRight: 12 },
  relBtnTxt:   { flex: 1, fontSize: 28, fontWeight: '700', color: '#E65100' },
  relBtnArrow: { fontSize: 30, color: '#E65100', fontWeight: '700' },

  card:     { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardLabel:{ fontSize: 30, fontWeight: '800', color: '#1A4A8A', marginBottom: 14 },

  emptyTxt: { fontSize: 26, color: '#AAB4C0', textAlign: 'center', paddingVertical: 12 },

  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  locationIcon:{ fontSize: 38 },
  locationTxt: { fontSize: 30, fontWeight: '700', color: '#2C2C2C', marginBottom: 4 },
  locationSub: { fontSize: 24, color: '#888' },

  aiCard:       { backgroundColor: '#EBF3FB', borderWidth: 1.5, borderColor: '#1A4A8A' },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  aiIcon:       { fontSize: 36 },
  aiLabel:      { fontSize: 30, fontWeight: '800', color: '#1A4A8A' },
  aiAdviceTxt:  { fontSize: 28, color: '#2C3E50', lineHeight: 38 },

  medHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  medBadge:      { backgroundColor: '#EBF3FB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  medBadgeTxt:   { fontSize: 26, fontWeight: '700', color: '#1A4A8A' },
  medAlert:      { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12, marginBottom: 14 },
  medAlertOk:    { backgroundColor: '#E8F5E9' },
  medAlertTxt:   { fontSize: 26, fontWeight: '700', color: '#E65100', textAlign: 'center' },

  medTable:    { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E8F0' },
  medTableHead:{ flexDirection: 'row', backgroundColor: '#1A4A8A', paddingVertical: 12, paddingHorizontal: 8 },
  medHeadTxt:  { color: '#fff', fontWeight: '700', fontSize: 24 },
  medRow:      { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#EEF2F8' },
  medRowEven:  { backgroundColor: '#F8FAFD' },
  medCol:      { flex: 1, fontSize: 26 },
  medColName:  { flex: 2 },
  medColTime:  { flex: 1.5 },
  medColDose:  { flex: 1 },
  medColStatus:{ flex: 1.2, textAlign: 'center' },
  medCellTxt:  { color: '#2C2C2C', fontWeight: '600' },
  takenTxt:    { color: '#2E7D32', fontWeight: '800', textAlign: 'center' },
  notTakenTxt: { color: '#D32F2F', fontWeight: '800', textAlign: 'center' },

  mapBtn:      { marginTop: 18, backgroundColor: '#1A4A8A', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  mapBtnTxt:   { fontSize: 26, fontWeight: '800', color: '#fff' },
  loadingBox:  { alignItems: 'center', paddingVertical: 40, gap: 14 },
  loadingTxt:  { fontSize: 28, color: '#888' },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48 },
  modalTitle:  { fontSize: 34, fontWeight: '900', color: '#1A4A8A', marginBottom: 8, textAlign: 'center' },
  modalSub:    { fontSize: 26, color: '#888', marginBottom: 20, textAlign: 'center' },
  relOption:   { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#F5F8FF', borderRadius: 16, padding: 18, marginBottom: 10 },
  relOptionEmoji:{ fontSize: 38 },
  relOptionLabel:{ fontSize: 32, fontWeight: '700', color: '#2C2C2C' },
  modalCancel: { marginTop: 6, padding: 18, alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 16 },
  modalCancelTxt:{ fontSize: 30, color: '#666', fontWeight: '700' },
});
