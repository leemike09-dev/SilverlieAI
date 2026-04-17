import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Linking, Alert, Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  other:    '기타',
};

const RELATION_OPTIONS = [
  { key: 'father',   label: '아버지', emoji: '👴' },
  { key: 'mother',   label: '어머니', emoji: '👵' },
  { key: 'spouse',   label: '배우자', emoji: '💑' },
  { key: 'son',      label: '아들',   emoji: '👦' },
  { key: 'daughter', label: '딸',     emoji: '👧' },
  { key: 'sibling',  label: '형제/자매', emoji: '👫' },
  { key: 'other',    label: '기타',   emoji: '👤' },
];

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const [userId,      setUserId]      = useState<string>(route?.params?.userId || '');
  const [name,        setName]        = useState<string>(route?.params?.name   || '');
  const [members,     setMembers]     = useState<any[]>([]);
  const [selected,    setSelected]    = useState<any>(null);
  const [location,    setLocation]    = useState<any>(null);
  const [aiAdvice,    setAiAdvice]    = useState('');
  const [medications, setMedications] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [relModal,    setRelModal]    = useState(false);
  const [relTarget,   setRelTarget]   = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const storedId   = (await AsyncStorage.getItem('userId'))   || '';
      const storedName = (await AsyncStorage.getItem('userName')) || '';
      const uid   = storedId   || route?.params?.userId || '';
      const uname = storedName || route?.params?.name   || '';
      if (storedId)   setUserId(uid);
      if (storedName) setName(uname);
      fetchMembers(uid);
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

  const fetchMembers = async (uid: string) => {
    if (!uid) return;
    try {
      const r = await fetch(`${API}/family/members/${uid}`);
      if (r.ok) {
        const d = await r.json();
        const mems = await Promise.all(
          (d.members || []).map(async (m: any) => {
            const rel = await AsyncStorage.getItem(`relation_${m.id}`);
            return { ...m, relation: rel || m.relation || '' };
          })
        );
        setMembers(mems);
        if (mems.length > 0) setSelected(mems[0]);
      }
    } catch {}
  };

  const fetchDashboard = async (seniorId: string) => {
    setLoading(true);
    setLocation(null);
    setAiAdvice('');
    setMedications([]);

    try {
      const r = await fetch(`${API}/location/today/${seniorId}`);
      if (r.ok) {
        const d = await r.json();
        if (d && Object.keys(d).length > 0) setLocation(d);
      }
    } catch {}

    try {
      const r = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: seniorId, message: '오늘 건강 상태를 간단히 요약해 주세요' }),
      });
      if (r.ok) {
        const d = await r.json();
        setAiAdvice(d.reply || d.message || '');
      }
    } catch {}

    try {
      const r = await fetch(`${API}/family/dashboard/${seniorId}`);
      if (r.ok) {
        const d = await r.json();
        setMedications(d.medications || []);
      }
    } catch {}

    setLoading(false);
  };

  const callMember = () => {
    if (!selected?.phone) {
      Alert.alert('전화번호 없음', '등록된 전화번호가 없습니다.');
      return;
    }
    Linking.openURL(`tel:${selected.phone.replace(/-/g, '')}`);
  };

  const openRelModal = (member: any) => {
    setRelTarget(member);
    setRelModal(true);
  };

  const saveRelation = async (rel: { key: string; label: string }) => {
    if (!relTarget) return;
    await AsyncStorage.setItem(`relation_${relTarget.id}`, rel.key);
    try {
      await fetch(`${API}/family/relation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, seniorId: relTarget.id, relation: rel.key }),
      });
    } catch {}
    setMembers(prev => prev.map(m => m.id === relTarget.id ? { ...m, relation: rel.key } : m));
    if (selected?.id === relTarget.id) setSelected((p: any) => ({ ...p, relation: rel.key }));
    setRelModal(false);
  };

  const medBadge = (med: any) => {
    if (med.taken) return { label: '복용완료', color: '#2E7D32', bg: '#E8F5E9' };
    const [h, m] = (med.time || '00:00').split(':').map(Number);
    const now = new Date();
    const mt  = new Date();
    mt.setHours(h, m, 0, 0);
    if (now > mt) return { label: '미복용', color: '#C62828', bg: '#FFEBEE' };
    return { label: '예정', color: '#757575', bg: '#F5F5F5' };
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;
  const headerLabel = selected
    ? (selected.relation && selected.relation !== 'other'
        ? `${RELATION_LABEL[selected.relation] || ''} ${selected.name}님`
        : `${selected.name}님`)
    : `${name ? name + '님의 ' : ''}가족 현황`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>가족 건강</Text>
          <Text style={s.headerSub}>{headerLabel}</Text>
        </View>
        <TouchableOpacity style={s.callBtn} onPress={callMember}>
          <Text style={s.callIcon}>📞</Text>
          <Text style={s.callTxt}>전화</Text>
        </TouchableOpacity>
      </View>

      {/* 멤버 선택 가로 스크롤 */}
      {members.length > 0 && (
        <View style={s.memberBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.memberScroll}>
            {members.map(m => {
              const on = selected?.id === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.memberChip, on && s.memberChipOn]}
                  onPress={() => setSelected(m)}
                >
                  <Text style={s.memberEmoji}>{RELATION_EMOJI[m.relation] || '👤'}</Text>
                  <View>
                    {m.relation ? (
                      <>
                        <Text style={[s.memberRel, on && s.memberRelOn]}>
                          {RELATION_LABEL[m.relation] || m.relation}
                        </Text>
                        <Text style={[s.memberSub, on && s.memberSubOn]}>{m.name}</Text>
                      </>
                    ) : (
                      <Text style={[s.memberName, on && s.memberNameOn]}>{m.name}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* 관계 설정 배너 */}
        {selected && !selected.relation && (
          <TouchableOpacity style={s.relBanner} onPress={() => openRelModal(selected)}>
            <Text style={s.relBannerIcon}>👪</Text>
            <Text style={s.relBannerTxt}>{selected.name}님과의 관계를 설정해 주세요</Text>
            <Text style={s.relBannerArr}>›</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1A4A8A" />
            <Text style={s.loadingTxt}>불러오는 중...</Text>
          </View>
        ) : (
          <>
            {/* 동선 지도 카드 */}
            <View style={s.card}>
              <Text style={s.cardTitle}>📍 현재 위치</Text>
              {location?.address || location?.location ? (
                <View style={s.locRow}>
                  <View style={s.locInfo}>
                    <Text style={s.locAddr}>{location.address || location.location}</Text>
                    {location.timestamp ? (
                      <Text style={s.locTime}>마지막 확인: {location.timestamp}</Text>
                    ) : null}
                    <View style={s.locStats}>
                      {location.totalDist != null && (
                        <View style={s.locStat}>
                          <Text style={s.locStatVal}>
                            {location.totalDist >= 1000
                              ? `${(location.totalDist / 1000).toFixed(1)}km`
                              : `${location.totalDist}m`}
                          </Text>
                          <Text style={s.locStatLbl}>총 이동거리</Text>
                        </View>
                      )}
                      {location.points != null && (
                        <View style={s.locStat}>
                          <Text style={s.locStatVal}>{location.points}곳</Text>
                          <Text style={s.locStatLbl}>방문 지점</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={s.emptyTxt}>아직 기록된 위치 데이터가 없어요</Text>
              )}
              <TouchableOpacity
                style={s.mapBtn}
                onPress={() => navigation.navigate('LocationMap', {
                  seniorName: selected?.name || '',
                  logs:       location?.logs      || [],
                  totalDist:  location?.totalDist || 0,
                })}
              >
                <Text style={s.mapBtnTxt}>🗺️  오늘 동선 확인</Text>
              </TouchableOpacity>
            </View>

            {/* AI 건강 조언 카드 */}
            <View style={[s.card, s.aiCard]}>
              <View style={s.aiHeader}>
                <Text style={s.aiIcon}>🐝</Text>
                <Text style={s.aiLabel}>AI 건강 조언</Text>
              </View>
              {aiAdvice ? (
                <Text style={s.aiTxt}>{aiAdvice}</Text>
              ) : (
                <Text style={s.emptyTxt}>아직 기록된 데이터가 없어요</Text>
              )}
            </View>

            {/* 복용약 현황 */}
            <View style={s.card}>
              <Text style={s.cardTitle}>💊 복용약 현황</Text>
              {medications.length === 0 ? (
                <Text style={s.emptyTxt}>아직 기록된 데이터가 없어요</Text>
              ) : (
                <View style={s.table}>
                  <View style={s.tableHead}>
                    <Text style={[s.col, s.colName,   s.headTxt]}>약 이름</Text>
                    <Text style={[s.col, s.colTime,   s.headTxt]}>복용 시간</Text>
                    <Text style={[s.col, s.colStatus, s.headTxt]}>상태</Text>
                    <Text style={[s.col, s.colStock,  s.headTxt]}>재고</Text>
                  </View>
                  {medications.map((med: any, i: number) => {
                    const badge    = medBadge(med);
                    const lowStock = med.stock != null && med.stock <= 7;
                    return (
                      <View key={i} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
                        <Text style={[s.col, s.colName,  s.cellTxt]}>{med.name}</Text>
                        <Text style={[s.col, s.colTime,  s.cellTxt]}>{med.time || '-'}</Text>
                        <View style={[s.col, s.colStatus, s.badgeWrap]}>
                          <View style={[s.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[s.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        </View>
                        <Text style={[s.col, s.colStock, s.cellTxt, lowStock && s.lowStock]}>
                          {med.stock != null ? `${med.stock}일` : '-'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 관계 선택 모달 */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {relTarget?.name}님과의 관계
            </Text>
            <Text style={s.modalSub}>관계를 선택하면 이후 표시됩니다</Text>
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

      <SeniorTabBar activeTab="family" userId={userId} name={name} navigation={navigation} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F5FB' },

  header:      { backgroundColor: '#1A4A8A', paddingHorizontal: 20, paddingBottom: 20,
                 flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerLeft:  {},
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:   { fontSize: 20, color: 'rgba(255,255,255,0.85)' },
  callBtn:     { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 18,
                 paddingVertical: 12, alignItems: 'center' },
  callIcon:    { fontSize: 26 },
  callTxt:     { fontSize: 18, fontWeight: '700', color: '#1A4A8A', marginTop: 2 },

  memberBar:    { backgroundColor: '#1A4A8A', paddingBottom: 16 },
  memberScroll: { paddingHorizontal: 16, gap: 10 },
  memberChip:   { flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 32, paddingHorizontal: 18, paddingVertical: 12,
                  gap: 10, borderWidth: 2, borderColor: 'transparent' },
  memberChipOn: { backgroundColor: '#fff', borderColor: '#1A4A8A' },
  memberEmoji:  { fontSize: 26 },
  memberRel:    { fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  memberRelOn:  { color: '#1A4A8A' },
  memberSub:    { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  memberSubOn:  { color: '#888' },
  memberName:   { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  memberNameOn: { color: '#1A4A8A' },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 110 },

  relBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
                  borderRadius: 18, padding: 20, marginBottom: 14,
                  borderWidth: 1.5, borderColor: '#FFB300' },
  relBannerIcon:{ fontSize: 26, marginRight: 12 },
  relBannerTxt: { flex: 1, fontSize: 20, fontWeight: '700', color: '#E65100' },
  relBannerArr: { fontSize: 26, color: '#E65100', fontWeight: '700' },

  card:      { backgroundColor: '#fff', borderRadius: 22, padding: 22, marginBottom: 16,
               shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1A4A8A', marginBottom: 16 },
  emptyTxt:  { fontSize: 18, color: '#B0BEC5', textAlign: 'center', paddingVertical: 14 },

  locRow:     { marginBottom: 16 },
  locInfo:    {},
  locAddr:    { fontSize: 22, fontWeight: '700', color: '#2C2C2C', marginBottom: 4 },
  locTime:    { fontSize: 18, color: '#90A4AE', marginBottom: 12 },
  locStats:   { flexDirection: 'row', gap: 24 },
  locStat:    { alignItems: 'center' },
  locStatVal: { fontSize: 22, fontWeight: '900', color: '#1A4A8A' },
  locStatLbl: { fontSize: 16, color: '#90A4AE', marginTop: 2 },

  mapBtn:    { backgroundColor: '#1A4A8A', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  mapBtnTxt: { fontSize: 22, fontWeight: '800', color: '#fff' },

  aiCard:   { borderLeftWidth: 5, borderLeftColor: '#1A4A8A' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  aiIcon:   { fontSize: 28 },
  aiLabel:  { fontSize: 22, fontWeight: '800', color: '#1A4A8A' },
  aiTxt:    { fontSize: 18, color: '#37474F', lineHeight: 30 },

  table:      { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E8F0' },
  tableHead:  { flexDirection: 'row', backgroundColor: '#1A4A8A',
                paddingVertical: 14, paddingHorizontal: 10 },
  headTxt:    { color: '#fff', fontWeight: '700', fontSize: 18 },
  tableRow:   { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 10,
                borderTopWidth: 1, borderTopColor: '#EEF2F8', alignItems: 'center' },
  tableRowAlt:{ backgroundColor: '#F8FAFD' },
  col:        { flex: 1, fontSize: 18 },
  colName:    { flex: 2 },
  colTime:    { flex: 1.8 },
  colStatus:  { flex: 1.8 },
  colStock:   { flex: 1.2, textAlign: 'center' },
  cellTxt:    { color: '#2C2C2C', fontWeight: '600', fontSize: 18 },
  badgeWrap:  { alignItems: 'flex-start' },
  badge:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt:   { fontSize: 16, fontWeight: '800' },
  lowStock:   { color: '#C62828', fontWeight: '900' },

  loadingBox: { alignItems: 'center', paddingVertical: 50, gap: 16 },
  loadingTxt: { fontSize: 20, color: '#90A4AE' },

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
