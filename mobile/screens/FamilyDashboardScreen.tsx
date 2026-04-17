import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Linking, Alert, Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../App';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';

// ──────────────── 관계 맵 ────────────────
const RELATION_EMOJI: Record<string, string> = {
  father: '👴', mother: '👵', spouse: '💑',
  son: '👦', daughter: '👧', sibling: '👫', other: '👤',
};
const RELATION_LABEL: Record<string, string> = {
  father: '아버지', mother: '어머니', spouse: '배우자',
  son: '아들', daughter: '딸', sibling: '형제/자매', other: '기타',
};
const RELATION_OPTIONS = [
  { key: 'father',   label: '아버지',   emoji: '👴' },
  { key: 'mother',   label: '어머니',   emoji: '👵' },
  { key: 'spouse',   label: '배우자',   emoji: '💑' },
  { key: 'son',      label: '아들',     emoji: '👦' },
  { key: 'daughter', label: '딸',       emoji: '👧' },
  { key: 'sibling',  label: '형제/자매', emoji: '👫' },
  { key: 'other',    label: '기타',     emoji: '👤' },
];

// ──────────────── 데모 폴백 데이터 ────────────────
const DEMO_MEMBERS = [
  { id: 'demo-senior-1', name: '홍길동', phone: '010-1234-5678', relation: 'father' },
  { id: 'demo-senior-2', name: '박영희', phone: '010-9876-5432', relation: 'mother' },
];
const DEMO_LOCATION = {
  address: '서울 강남구 역삼동 자택',
  timestamp: '오전 11시 05분',
  totalDist: 1240,
  points: 5,
  logs: [
    { lat: 37.4979, lng: 127.0276, activity: 'home',    address: '역삼동',   created_at: '2026-04-17T07:30:00Z' },
    { lat: 37.4985, lng: 127.0290, activity: 'outdoor', address: '역삼공원', created_at: '2026-04-17T09:10:00Z' },
    { lat: 37.5001, lng: 127.0310, activity: 'outdoor', address: '강남역 근처', created_at: '2026-04-17T09:45:00Z' },
    { lat: 37.4992, lng: 127.0295, activity: 'outdoor', address: '이마트',   created_at: '2026-04-17T10:20:00Z' },
    { lat: 37.4981, lng: 127.0280, activity: 'home',    address: '역삼동',   created_at: '2026-04-17T11:05:00Z' },
  ],
};
const DEMO_ADVICE = '오늘 혈압이 정상 범위입니다. 혈압약을 꾸준히 드시고 계세요. 물을 충분히 드시면 더욱 좋습니다.';
const DEMO_MEDS = [
  { name: '혈압약', time: '08:00', taken: true,  stock: 28 },
  { name: '당뇨약', time: '08:00', taken: true,  stock: 14 },
  { name: '당뇨약', time: '12:00', taken: false, stock: 14 },
  { name: '관절약', time: '12:00', taken: false, stock: 5  },
  { name: '혈압약', time: '20:00', taken: false, stock: 28 },
];

// ──────────────── 컴포넌트 ────────────────
export default function FamilyDashboardScreen({ route, navigation }: any) {
  const [userId,      setUserId]      = useState<string>(route?.params?.userId || '');
  const [name,        setName]        = useState<string>(route?.params?.name   || '');
  const [members,     setMembers]     = useState<any[]>([]);
  const [selected,    setSelected]    = useState<any>(null);
  const [selectedId,  setSelectedId]  = useState<string>('');
  const [location,    setLocation]    = useState<any>(null);
  const [aiAdvice,    setAiAdvice]    = useState('');
  const [medications, setMedications] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [relModal,    setRelModal]    = useState(false);
  const [relTarget,   setRelTarget]   = useState<any>(null);

  // ── 초기화 ──
  useEffect(() => {
    const init = async () => {
      const storedId   = (await AsyncStorage.getItem('userId'))   || '';
      const storedName = (await AsyncStorage.getItem('userName')) || '';
      const uid   = storedId   || route?.params?.userId || '';
      const uname = storedName || route?.params?.name   || '';
      if (storedId)   setUserId(uid);
      if (storedName) setName(uname);
      await fetchMembers(uid);
    };
    init();
  }, []);

  // ── 선택 멤버 변경 시 대시보드 로드 ──
  useEffect(() => {
    if (selectedId) fetchDashboard(selectedId);
    else {
      setLocation(null);
      setAiAdvice('');
      setMedications([]);
    }
  }, [selectedId]);

  // ── 가족 멤버 목록 조회 ──
  const fetchMembers = async (uid: string) => {
    // AsyncStorage에서 연결된 가족 코드 목록 확인
    try {
      if (uid) {
        const r = await fetch(`${API}/family/members/${uid}`);
        if (r.ok) {
          const d = await r.json();
          if (d.members && d.members.length > 0) {
            const mems = await Promise.all(
              d.members.map(async (m: any) => {
                const rel = await AsyncStorage.getItem(`relation_${m.id}`);
                return { ...m, relation: rel || m.relation || '' };
              })
            );
            setMembers(mems);
            setSelected(mems[0]);
            setSelectedId(mems[0].id);
            return;
          }
        }
      }
    } catch {}

    // API 실패 또는 빈 응답 → DEMO_MODE 폴백
    if (DEMO_MODE) {
      const mems = await Promise.all(
        DEMO_MEMBERS.map(async (m) => {
          const rel = await AsyncStorage.getItem(`relation_${m.id}`);
          return { ...m, relation: rel || m.relation };
        })
      );
      setMembers(mems);
      setSelected(mems[0]);
      setSelectedId(mems[0].id);
    }
  };

  // ── 선택 멤버 대시보드 데이터 조회 ──
  const fetchDashboard = async (seniorId: string) => {
    setLoading(true);
    setLocation(null);
    setAiAdvice('');
    setMedications([]);

    let gotLoc = false, gotAi = false, gotMed = false;

    // 위치
    try {
      const r = await fetch(`${API}/location/today/${seniorId}`);
      if (r.ok) {
        const d = await r.json();
        if (d && Object.keys(d).length > 0) { setLocation(d); gotLoc = true; }
      }
    } catch {}

    // AI 조언
    try {
      const r = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: seniorId, message: '오늘 건강 상태를 간단히 요약해 주세요' }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d.reply || d.message || '';
        if (txt) { setAiAdvice(txt); gotAi = true; }
      }
    } catch {}

    // 복용약
    try {
      const r = await fetch(`${API}/family/dashboard/${seniorId}`);
      if (r.ok) {
        const d = await r.json();
        if (d.medications?.length > 0) { setMedications(d.medications); gotMed = true; }
      }
    } catch {}

    // DEMO_MODE 폴백: API 응답 없을 때 데모 데이터 사용
    if (DEMO_MODE) {
      if (!gotLoc) setLocation(DEMO_LOCATION);
      if (!gotAi)  setAiAdvice(DEMO_ADVICE);
      if (!gotMed) setMedications(DEMO_MEDS);
    }

    setLoading(false);
  };

  // ── 멤버 선택 ──
  const selectMember = (m: any) => {
    console.log('멤버 선택:', m.name, '| id:', m.id);
    setSelected(m);
    setSelectedId(m.id);
  };

  // ── 전화 ──
  const callMember = () => {
    if (!selected?.phone) {
      Alert.alert('전화번호 없음', '등록된 전화번호가 없습니다.');
      return;
    }
    Linking.openURL(`tel:${selected.phone.replace(/-/g, '')}`);
  };

  // ── 관계 설정 모달 ──
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
    if (selected?.id === relTarget.id) {
      const updated = { ...selected, relation: rel.key };
      setSelected(updated);
      // selectedId는 유지 (같은 멤버)
    }
    setRelModal(false);
  };

  // ── 복용약 배지 ──
  const medBadge = (med: any) => {
    if (med.taken) return { label: '복용완료', color: '#2E7D32', bg: '#E8F5E9' };
    const [h, m] = (med.time || '00:00').split(':').map(Number);
    const now = new Date();
    const mt  = new Date();
    mt.setHours(h, m, 0, 0);
    if (now > mt) return { label: '미복용', color: '#D32F2F', bg: '#FFEBEE' };
    return { label: '예정', color: '#888888', bg: '#F5F5F5' };
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;
  const headerSub = selected
    ? (selected.relation && selected.relation !== 'other'
        ? `${RELATION_LABEL[selected.relation] || ''} ${selected.name}님`
        : `${selected.name}님`)
    : `${name ? name + '님의 ' : ''}가족 현황`;

  const distStr = (d: number) =>
    d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* ── 헤더 ── */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View>
          <Text style={s.headerTitle}>가족 건강</Text>
          <Text style={s.headerSub}>{headerSub}</Text>
        </View>
        <TouchableOpacity style={s.callBtn} onPress={callMember}>
          <Text style={s.callIcon}>📞</Text>
          <Text style={s.callTxt}>전화</Text>
        </TouchableOpacity>
      </View>

      {/* ── 멤버 선택 가로 스크롤 ── */}
      {members.length > 0 && (
        <View style={s.memberBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.memberScroll}
          >
            {members.map(m => {
              const on = selectedId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={on ? [s.chip, s.chipOn] : [s.chip, s.chipOff]}
                  onPress={() => selectMember(m)}
                >
                  <Text style={s.chipEmoji}>{RELATION_EMOJI[m.relation] || '👤'}</Text>
                  <View>
                    {m.relation ? (
                      <>
                        <Text style={[s.chipRel, on && s.chipRelOn]}>
                          {RELATION_LABEL[m.relation] || m.relation}
                        </Text>
                        <Text style={[s.chipName, on && s.chipNameOn]}>{m.name}</Text>
                      </>
                    ) : (
                      <Text style={[s.chipNameOnly, on && s.chipNameOnlyOn]}>{m.name}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── 스크롤 콘텐츠 ── */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* 관계 미설정 배너 */}
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
            {/* ── 동선 카드 ── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>📍 현재 위치 · 오늘 동선</Text>

              {location ? (
                <View style={s.locBlock}>
                  <Text style={s.locAddr}>{location.address || location.location || '위치 확인 중'}</Text>
                  {location.timestamp ? (
                    <Text style={s.locTime}>마지막 확인: {location.timestamp}</Text>
                  ) : null}
                  <View style={s.locStats}>
                    <View style={s.locStat}>
                      <Text style={s.locStatVal}>{distStr(location.totalDist || 0)}</Text>
                      <Text style={s.locStatLbl}>총 이동거리</Text>
                    </View>
                    <View style={s.locDivider} />
                    <View style={s.locStat}>
                      <Text style={s.locStatVal}>{location.points || (location.logs?.length || 0)}곳</Text>
                      <Text style={s.locStatLbl}>방문 지점</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={s.emptyTxt}>아직 기록된 위치 데이터가 없어요</Text>
              )}

              <TouchableOpacity
                style={s.mapBtn}
                onPress={() => navigation.navigate('LocationMap', {
                  userId:     selected?.id        || '',
                  seniorName: selected?.name      || '',
                  logs:       location?.logs      || [],
                  totalDist:  location?.totalDist || 0,
                })}
              >
                <Text style={s.mapBtnTxt}>🗺️  오늘 동선 확인</Text>
              </TouchableOpacity>
            </View>

            {/* ── AI 건강 조언 ── */}
            <View style={[s.card, s.aiCard]}>
              <View style={s.aiHeader}>
                <Text style={s.aiIconTxt}>🐝</Text>
                <Text style={s.aiLabel}>AI 건강 조언</Text>
              </View>
              {aiAdvice ? (
                <Text style={s.aiTxt}>{aiAdvice}</Text>
              ) : (
                <Text style={s.emptyTxt}>아직 기록된 데이터가 없어요</Text>
              )}
            </View>

            {/* ── 복용약 현황 표 ── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>💊 복용약 현황</Text>
              {medications.length === 0 ? (
                <Text style={s.emptyTxt}>아직 기록된 데이터가 없어요</Text>
              ) : (
                <View style={s.table}>
                  {/* 테이블 헤더 */}
                  <View style={s.tHead}>
                    <Text style={[s.tCol, s.tColName,   s.tHeadTxt]}>약 이름</Text>
                    <Text style={[s.tCol, s.tColTime,   s.tHeadTxt]}>시간</Text>
                    <Text style={[s.tCol, s.tColStatus, s.tHeadTxt]}>상태</Text>
                    <Text style={[s.tCol, s.tColStock,  s.tHeadTxt]}>재고</Text>
                  </View>
                  {/* 테이블 행 */}
                  {medications.map((med: any, i: number) => {
                    const badge    = medBadge(med);
                    const lowStock = med.stock != null && med.stock <= 7;
                    return (
                      <View key={i} style={[s.tRow, i % 2 === 1 && s.tRowAlt]}>
                        <Text style={[s.tCol, s.tColName,  s.tCell]}>{med.name}</Text>
                        <Text style={[s.tCol, s.tColTime,  s.tCell]}>{med.time || '-'}</Text>
                        <View style={[s.tCol, s.tColStatus]}>
                          <View style={[s.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[s.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        </View>
                        <Text style={[s.tCol, s.tColStock, s.tCell, lowStock && s.lowStock]}>
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

      {/* ── 관계 선택 모달 ── */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{relTarget?.name}님과의 관계</Text>
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

// ──────────────── 스타일 ────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F5FB' },

  // 헤더
  header:      { backgroundColor: '#1A4A8A', paddingHorizontal: 20, paddingBottom: 20,
                 flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:   { fontSize: 20, color: 'rgba(255,255,255,0.85)' },
  callBtn:     { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 18,
                 paddingVertical: 12, alignItems: 'center' },
  callIcon:    { fontSize: 26 },
  callTxt:     { fontSize: 18, fontWeight: '700', color: '#1A4A8A', marginTop: 2 },

  // 멤버 선택 바
  memberBar:    { backgroundColor: '#1A4A8A', paddingBottom: 18 },
  memberScroll: { paddingHorizontal: 16, gap: 10 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 32, paddingHorizontal: 18, paddingVertical: 12,
                  borderWidth: 2, borderColor: 'transparent' },
  chipOn:       { backgroundColor: '#fff', borderColor: '#1565C0' },
  chipOff:      { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.35)' },
  chipEmoji:    { fontSize: 28 },
  chipRel:      { fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  chipRelOn:    { color: '#1A4A8A' },
  chipName:     { fontSize: 17, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  chipNameOn:   { color: '#666' },
  chipNameOnly: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  chipNameOnlyOn:{ color: '#1A4A8A' },

  // 관계 배너
  relBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
                  borderRadius: 18, padding: 20, marginBottom: 14,
                  borderWidth: 1.5, borderColor: '#FFB300' },
  relBannerIcon:{ fontSize: 26, marginRight: 12 },
  relBannerTxt: { flex: 1, fontSize: 20, fontWeight: '700', color: '#E65100' },
  relBannerArr: { fontSize: 28, color: '#E65100', fontWeight: '700' },

  // 스크롤
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },

  // 카드
  card:      { backgroundColor: '#fff', borderRadius: 22, padding: 22, marginBottom: 16,
               shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1A4A8A', marginBottom: 16 },
  emptyTxt:  { fontSize: 18, color: '#B0BEC5', textAlign: 'center', paddingVertical: 14 },

  // 위치 블록
  locBlock:   { marginBottom: 16 },
  locAddr:    { fontSize: 22, fontWeight: '700', color: '#1A2C4E', marginBottom: 6 },
  locTime:    { fontSize: 18, color: '#90A4AE', marginBottom: 14 },
  locStats:   { flexDirection: 'row', alignItems: 'center', gap: 0 },
  locStat:    { flex: 1, alignItems: 'center', paddingVertical: 10,
                backgroundColor: '#EBF3FB', borderRadius: 14 },
  locStatVal: { fontSize: 24, fontWeight: '900', color: '#1A4A8A' },
  locStatLbl: { fontSize: 16, color: '#90A4AE', marginTop: 3 },
  locDivider: { width: 12 },

  // 동선 버튼
  mapBtn:    { backgroundColor: '#1A4A8A', borderRadius: 16, paddingVertical: 18,
               alignItems: 'center' },
  mapBtnTxt: { fontSize: 22, fontWeight: '800', color: '#fff' },

  // AI 카드
  aiCard:    { borderLeftWidth: 5, borderLeftColor: '#1A4A8A' },
  aiHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  aiIconTxt: { fontSize: 28 },
  aiLabel:   { fontSize: 22, fontWeight: '800', color: '#1A4A8A' },
  aiTxt:     { fontSize: 18, color: '#37474F', lineHeight: 30 },

  // 복용약 표
  table:   { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E8F0' },
  tHead:   { flexDirection: 'row', backgroundColor: '#1A4A8A', paddingVertical: 14, paddingHorizontal: 8 },
  tHeadTxt:{ color: '#fff', fontWeight: '800', fontSize: 18 },
  tRow:    { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8,
             borderTopWidth: 1, borderTopColor: '#EEF2F8', alignItems: 'center' },
  tRowAlt: { backgroundColor: '#F8FAFD' },
  tCol:    { flex: 1 },
  tColName:  { flex: 2.2 },
  tColTime:  { flex: 1.6 },
  tColStatus:{ flex: 2.0, alignItems: 'flex-start' },
  tColStock: { flex: 1.2, textAlign: 'center' },
  tCell:   { fontSize: 18, color: '#2C2C2C', fontWeight: '600' },
  badge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeTxt:{ fontSize: 16, fontWeight: '800' },
  lowStock:{ color: '#C62828', fontWeight: '900' },

  // 로딩
  loadingBox: { alignItems: 'center', paddingVertical: 50, gap: 16 },
  loadingTxt: { fontSize: 20, color: '#90A4AE' },

  // 모달
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
                    padding: 30, paddingBottom: 50 },
  modalTitle:     { fontSize: 26, fontWeight: '900', color: '#1A4A8A', textAlign: 'center', marginBottom: 8 },
  modalSub:       { fontSize: 18, color: '#90A4AE', textAlign: 'center', marginBottom: 22 },
  relOpt:         { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#F5F8FF',
                    borderRadius: 18, padding: 20, marginBottom: 10 },
  relEmoji:       { fontSize: 32 },
  relLabel:       { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  modalCancel:    { marginTop: 8, padding: 20, alignItems: 'center', backgroundColor: '#ECEFF1', borderRadius: 16 },
  modalCancelTxt: { fontSize: 22, color: '#546E7A', fontWeight: '700' },
});
