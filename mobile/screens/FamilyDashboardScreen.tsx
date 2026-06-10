import React, { useState, useEffect, useCallback } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, ActivityIndicator, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import { Ionicons } from '@expo/vector-icons';

const API = 'https://silverlieai.onrender.com';

const RELATION_EMOJI: Record<string, string> = {
  father: '👴', mother: '👵', spouse: '💑',
  son: '👦', daughter: '👧', sibling: '👫', other: '👤',
};
const RELATION_LABEL: Record<string, string> = {
  father: '아버지', mother: '어머니', spouse: '배우자',
  son: '아들', daughter: '딸', sibling: '형제/자매', other: '기타',
};
const RELATION_OPTIONS = [
  { key: 'father', label: '아버지', emoji: '👴' },
  { key: 'mother', label: '어머니', emoji: '👵' },
  { key: 'spouse', label: '배우자', emoji: '💑' },
  { key: 'son',    label: '아들',   emoji: '👦' },
  { key: 'daughter', label: '딸',   emoji: '👧' },
  { key: 'sibling',  label: '형제/자매', emoji: '👫' },
  { key: 'other',    label: '기타', emoji: '👤' },
];

type FeedItem = {
  id: string;
  type: 'message' | 'hospital' | 'memo' | 'connect' | 'health' | 'medication';
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  memberId?: string;
  memberName?: string;
  onPress?: () => void;
};

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,  setUserId]  = useState<string>(route?.params?.userId || '');
  const [name,    setName]    = useState<string>(route?.params?.name   || '');
  const [members, setMembers] = useState<any[]>([]);
  const [feed,    setFeed]    = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [relModal,   setRelModal]    = useState(false);
  const [relTarget,  setRelTarget]   = useState<any>(null);

  type StatusCard = { icon: string; iconBg: string; text: string; sub: string };
  const [statusCards, setStatusCards] = useState<StatusCard[]>([
    { icon: '📍', iconBg: '#E8F1FC', text: '위치 확인 중',   sub: '마지막 위치를 가져오는 중' },
    { icon: '❤️', iconBg: '#FFE6DC', text: '혈압 정보 없음', sub: '아직 측정값이 없어요' },
    { icon: '💊', iconBg: '#E6F4E2', text: '복약 정보 없음', sub: '약 목록을 추가해주세요' },
  ]);

  useEffect(() => {
    (async () => {
      const uid   = (await AsyncStorage.getItem('userId'))   || route?.params?.userId || '';
      const uname = (await AsyncStorage.getItem('userName')) || route?.params?.name   || '';
      if (uid)   setUserId(uid);
      if (uname) setName(uname);

      const stored = await AsyncStorage.getItem('family_members');
      const mems: any[] = stored ? JSON.parse(stored) : [];
      setMembers(mems);

      await Promise.all([loadFeed(uid, mems), loadStatusCards(uid)]);
    })();
  }, []);

  const loadStatusCards = async (uid: string) => {
    const today = localDate();
    const next = (prev: StatusCard[], idx: number, patch: Partial<StatusCard>) =>
      prev.map((c, i) => i === idx ? { ...c, ...patch } : c);

    // 혈압 — AsyncStorage health_records
    try {
      const raw = await AsyncStorage.getItem('health_records');
      if (raw) {
        const records: any[] = JSON.parse(raw);
        const latest = records[0];
        if (latest?.blood_pressure_systolic) {
          const sys = latest.blood_pressure_systolic;
          const dia = latest.blood_pressure_diastolic;
          const isNormal = sys <= 130 && dia <= 85;
          setStatusCards(prev => next(prev, 1, {
            text: `혈압 ${sys}/${dia}${isNormal ? ', 모두 정상' : ''}`,
            sub: latest.date === today ? '오늘 측정했어요' : '어제 측정했어요',
          }));
        }
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

    // 약복용 — AsyncStorage medications (taken 플래그)
    try {
      const raw = await AsyncStorage.getItem('medications');
      if (raw) {
        const meds: any[] = JSON.parse(raw);
        if (meds.length > 0) {
          const taken = meds.filter(m => m.taken).length;
          const total = meds.length;
          setStatusCards(prev => next(prev, 2, {
            text: taken === total ? '오늘 약 모두 복용 완료' : `오늘 약 ${taken}/${total}개 복용`,
            sub: taken === total ? '잘 챙기고 계세요 💜' : `${total - taken}개 남았어요`,
          }));
        }
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

    // 위치 — 서버 조회 (실패 시 무시)
    try {
      const res = await fetch(`${API}/location/current/${uid}`);
      if (res.ok) {
        const data = await res.json();
        const locText = data?.address || (data?.lat ? '위치 공유 중' : null);
        if (locText) {
          setStatusCards(prev => next(prev, 0, { text: locText, sub: '방금 전 위치' }));
        }
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const loadFeed = async (uid: string, mems: any[]) => {
    setLoading(true);
    const items: FeedItem[] = [];

    try {
      // ── 가족 메시지 ──
      const cr = await fetch(`${API}/family/messages/${uid}`);
      if (cr.ok) {
        const cd = await cr.json();
        const convs: any[] = cd.conversations || [];
        convs.forEach((conv: any) => {
          if (!conv.last_message) return;
          const member = mems.find(m => m.id === conv.partner_id);
          const relLabel = member?.relation ? RELATION_LABEL[member.relation] : (member?.name || '가족');
          const ts = conv.last_at ? new Date(conv.last_at).getTime() : Date.now() - 3600000;
          items.push({
            id: `msg-${conv.partner_id}`,
            type: 'message',
            icon: '💬',
            iconBg: '#EFF6FF',
            title: `${relLabel}에서 메시지`,
            desc: conv.last_message,
            time: formatTime(ts),
            timestamp: ts,
            memberId: conv.partner_id,
            memberName: member?.name,
            onPress: () => navigation.navigate('FamilyChat', {
              userId: uid, name,
              partnerId: conv.partner_id,
              partnerName: member?.name || '',
              partnerRelation: member?.relation || '',
            }),
          });
        });
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

    // ── 병원 일정 ──
    try {
      const hs = await AsyncStorage.getItem('hospital_schedule');
      if (hs) {
        const sched = JSON.parse(hs);
        const ts = sched.date ? new Date(sched.date).getTime() : Date.now() - 7200000;
        items.push({
          id: 'hospital',
          type: 'hospital',
          icon: '🏥',
          iconBg: '#F5F3FF',
          title: `${sched.clinic || '병원'} 예약`,
          desc: `${sched.date || ''} ${sched.time || ''}${sched.memo ? ' · ' + sched.memo : ''}`.trim(),
          time: formatTime(ts),
          timestamp: ts,
        });
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

    // ── 의사 메모 ──
    try {
      const dm   = await AsyncStorage.getItem('doctor_memo');
      const dmd  = await AsyncStorage.getItem('doctor_memo_date');
      if (dm) {
        const ts = dmd ? new Date(dmd).getTime() : Date.now() - 86400000;
        items.push({
          id: 'memo',
          type: 'memo',
          icon: '📋',
          iconBg: '#FFFBEB',
          title: '의사 전달 메모 저장됨',
          desc: dm.slice(0, 60) + (dm.length > 60 ? '...' : ''),
          time: formatTime(ts),
          timestamp: ts,
        });
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }

    // ── 가족 연결 이벤트 ──
    mems.forEach((m, idx) => {
      items.push({
        id: `connect-${m.id}`,
        type: 'connect',
        icon: '👨‍👩‍👧',
        iconBg: '#ECFDF5',
        title: `${m.relation ? RELATION_LABEL[m.relation] : m.name} 연결됨`,
        desc: '가족과 건강 정보를 공유하고 있어요',
        time: '연결 중',
        timestamp: Date.now() - (idx + 1) * 86400000 * 3,
        memberId: m.id,
        memberName: m.name,
      });
    });

    // 최신순 정렬
    items.sort((a, b) => b.timestamp - a.timestamp);
    setFeed(items);
    setLoading(false);

    // 서버에서 members 최신화
    try {
      const mr = await fetch(`${API}/family/members/${uid}`);
      if (mr.ok) {
        const md = await mr.json();
        const serverMembers: any[] = md.members || [];
        if (serverMembers.length > 0) {
          const stored = await AsyncStorage.getItem('family_members');
          const local: any[] = stored ? JSON.parse(stored) : [];
          const merged = serverMembers.map((sm: any) => {
            const lm = local.find((l: any) => l.id === sm.id);
            return { ...sm, relation: lm?.relation || sm.relation || '' };
          });
          setMembers(merged);
          await AsyncStorage.setItem('family_members', JSON.stringify(merged));
        }
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const saveRelation = async (rel: { key: string; label: string }) => {
    if (!relTarget) return;
    const updated = members.map(m => m.id === relTarget.id ? { ...m, relation: rel.key } : m);
    setMembers(updated);
    try {
      await AsyncStorage.setItem('family_members', JSON.stringify(updated));
      await fetch(`${API}/family/relation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetUserId: relTarget.id, relation: rel.key }),
      });
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    setRelModal(false);
  };

  const FEED_TYPE_COLOR: Record<string, string> = {
    message:    '#3B82F6',
    hospital:   '#8B5CF6',
    memo:       '#F59E0B',
    connect:    '#10B981',
    health:     '#EF4444',
    medication: '#F59E0B',
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1A4A8A', '#2563EB']} style={[s.headerBg, { paddingTop: Math.max(insets.top + 14, 28) }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>우리 가족</Text>
            <Text style={s.headerSub}>{name ? `${name}님의 가족 공간` : '가족과 소통해요'}</Text>
          </View>
          <TouchableOpacity style={s.addBtn}
            onPress={() => navigation.navigate('FamilyConnect', { userId, name, addMode: true })}>
            <Ionicons name="person-add-outline" size={22} color="#1A4A8A" />
          </TouchableOpacity>
        </View>

        {/* 가족 멤버 chips */}
        {members.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipScroll}>
            {members.map(m => {
              const noRel = !m.relation;
              return (
                <TouchableOpacity key={m.id} style={s.chip}
                  onPress={() => noRel && (setRelTarget(m), setRelModal(true))}
                  activeOpacity={noRel ? 0.6 : 1}>
                  <Text style={s.chipEmoji}>{RELATION_EMOJI[m.relation] || '👤'}</Text>
                  <Text style={s.chipName}>
                    {m.relation ? RELATION_LABEL[m.relation] : m.name}
                  </Text>
                  {noRel && <Text style={s.chipEdit}>설정</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {/* 메인 스크롤 — 상태 요약 + 피드 통합 */}
      <ScrollView contentContainerStyle={s.feedContent} showsVerticalScrollIndicator={false}>

        {/* ── 상태 요약 카드 3개 ── */}
        <Text style={s.sectionLabel}>가족에게 보이는 내 상태</Text>
        <View style={s.statusCardsWrap}>
          {statusCards.map((card, idx) => (
            <View key={idx} style={s.statusCard}>
              <View style={[s.statusCardIcon, { backgroundColor: card.iconBg }]}>
                <Text style={s.statusCardEmoji}>{card.icon}</Text>
              </View>
              <View style={s.statusCardBody}>
                <Text style={s.statusCardText} numberOfLines={1}>{card.text}</Text>
                <Text style={s.statusCardSub}  numberOfLines={1}>{card.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 활동 피드 ── */}
        {loading ? (
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color="#1A4A8A" />
            <Text style={s.loadTxt}>불러오는 중...</Text>
          </View>
        ) : feed.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={s.emptyTitle}>아직 활동 내역이 없어요</Text>
            <Text style={s.emptyDesc}>가족과 연결하면 건강 정보와{'\n'}메시지를 공유할 수 있어요</Text>
            <TouchableOpacity style={s.emptyBtn}
              onPress={() => navigation.navigate('FamilyConnect', { userId, name, addMode: true })}>
              <Text style={s.emptyBtnTxt}>가족 연결하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.feedSectionLabel}>최근 활동</Text>

            {feed.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={s.feedCard}
                onPress={item.onPress}
                activeOpacity={item.onPress ? 0.75 : 1}
              >
                {idx < feed.length - 1 && <View style={s.timelineBar} />}
                <View style={[s.feedIconWrap, { backgroundColor: item.iconBg }]}>
                  <Text style={s.feedIcon}>{item.icon}</Text>
                </View>
                <View style={s.feedBody}>
                  <View style={s.feedTitleRow}>
                    <Text style={s.feedTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.feedTime}>{item.time}</Text>
                  </View>
                  <Text style={s.feedDesc} numberOfLines={2}>{item.desc}</Text>
                  {item.type === 'message' && item.onPress && (
                    <View style={s.feedAction}>
                      <Text style={s.feedActionTxt}>답장하기</Text>
                      <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={s.addFamilyCard}
              onPress={() => navigation.navigate('FamilyConnect', { userId, name, addMode: true })}>
              <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
              <Text style={s.addFamilyTxt}>가족 더 추가하기</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* 관계 설정 모달 */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{relTarget?.name}님과의 관계</Text>
            <Text style={s.modalSub}>관계를 선택해 주세요</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {RELATION_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key} style={s.relOpt}
                  onPress={() => saveRelation(opt)}>
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

      <SeniorTabBar activeTab="" userId={userId} name={name} navigation={navigation} />
    </View>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (min < 1)   return '방금';
  if (min < 60)  return `${min}분 전`;
  if (hr < 24)   return `${hr}시간 전`;
  if (day < 7)   return `${day}일 전`;
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },

  headerBg:   { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle:{ fontSize: 28, fontWeight: '900', color: '#fff' },
  headerSub:  { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addBtn:     { backgroundColor: '#fff', borderRadius: 14, padding: 10 },

  chipScroll: { gap: 10, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  chipEmoji: { fontSize: 22 },
  chipName:  { fontSize: 17, fontWeight: '700', color: '#fff' },
  chipEdit:  { fontSize: 14, color: 'rgba(255,255,255,0.65)' },

  loadBox: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadTxt: { fontSize: 18, color: '#90A4AE' },

  emptyBox:  { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle:{ fontSize: 24, fontWeight: '900', color: '#1E2D3D', marginBottom: 10 },
  emptyDesc: { fontSize: 17, color: '#90A4AE', textAlign: 'center', lineHeight: 26, marginBottom: 28 },
  emptyBtn:  {
    backgroundColor: '#1A4A8A', borderRadius: 18,
    paddingHorizontal: 28, paddingVertical: 18, minHeight: 64, justifyContent: 'center',
  },
  emptyBtnTxt: { fontSize: 20, fontWeight: '800', color: '#fff' },

  feedContent: { padding: 16, paddingBottom: 120 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#90A4AE',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginLeft: 4,
  },

  // ── 상태 요약 카드 ──
  statusCardsWrap: { gap: 10, marginBottom: 24 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  statusCardIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statusCardEmoji: { fontSize: 22 },
  statusCardBody:  { flex: 1 },
  statusCardText:  { fontSize: 17, fontWeight: '800', color: '#1E2D3D', marginBottom: 2 },
  statusCardSub:   { fontSize: 14, fontWeight: '500', color: '#90A4AE' },

  feedSectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#90A4AE',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 16, marginLeft: 4,
  },

  feedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#fff', borderRadius: 20,
    padding: 18, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
    position: 'relative',
  },
  timelineBar: {
    position: 'absolute',
    left: 33, top: 68,
    width: 2, height: 18,
    backgroundColor: '#E5E7EB',
    zIndex: 0,
  },
  feedIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  feedIcon: { fontSize: 22 },
  feedBody: { flex: 1 },
  feedTitleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: 4,
  },
  feedTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1E2D3D' },
  feedTime:  { fontSize: 13, fontWeight: '600', color: '#90A4AE', flexShrink: 0, marginTop: 1 },
  feedDesc:  { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  feedAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8,
  },
  feedActionTxt: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },

  addFamilyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 20, marginTop: 8,
    borderRadius: 18, borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.2)',
    borderStyle: 'dashed', backgroundColor: '#F8FAFF',
  },
  addFamilyTxt: { fontSize: 18, fontWeight: '700', color: '#3B82F6' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 30, paddingBottom: 48, maxHeight: '80%',
  },
  modalTitle:    { fontSize: 26, fontWeight: '900', color: '#1A4A8A', textAlign: 'center', marginBottom: 8 },
  modalSub:      { fontSize: 18, color: '#90A4AE', textAlign: 'center', marginBottom: 22 },
  relOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    backgroundColor: '#F5F8FF', borderRadius: 18, padding: 20, marginBottom: 10,
  },
  relEmoji:       { fontSize: 32 },
  relLabel:       { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  modalCancel:    { marginTop: 8, padding: 20, alignItems: 'center', backgroundColor: '#ECEFF1', borderRadius: 16 },
  modalCancelTxt: { fontSize: 22, color: '#546E7A', fontWeight: '700' },
});
