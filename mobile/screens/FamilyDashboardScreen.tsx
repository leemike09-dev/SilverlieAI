import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, ActivityIndicator, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  { key: 'father',   label: '아버지',    emoji: '👴' },
  { key: 'mother',   label: '어머니',    emoji: '👵' },
  { key: 'spouse',   label: '배우자',    emoji: '💑' },
  { key: 'son',      label: '아들',      emoji: '👦' },
  { key: 'daughter', label: '딸',        emoji: '👧' },
  { key: 'sibling',  label: '형제/자매', emoji: '👫' },
  { key: 'other',    label: '기타',      emoji: '👤' },
];

const DEMO_CONVERSATIONS = [
  { partner_id: 'demo-son-1',    last_message: '아버지 오늘 점심은 드셨어요?', last_at: new Date().toISOString(), unread_count: 2 },
  { partner_id: 'demo-daughter-1', last_message: '이번 주말에 방문할게요! 😊', last_at: new Date(Date.now() - 3600000).toISOString(), unread_count: 0 },
];
const DEMO_GOALS = [
  { id: 'g1', goal_type: 'steps', target: 5000, period: 'daily', progress_pct: 84, created_by: 'demo-son-1' },
];

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,   setUserId]   = useState<string>(route?.params?.userId || '');
  const [name,     setName]     = useState<string>(route?.params?.name   || '');
  const [members,  setMembers]  = useState<any[]>([]);
  const [convs,    setConvs]    = useState<any[]>([]);
  const [goals,    setGoals]    = useState<any[]>([]);
  const [tab,      setTab]      = useState<'messages' | 'goals'>('messages');
  const [loading,  setLoading]  = useState(true);
  const [relModal, setRelModal] = useState(false);
  const [relTarget,setRelTarget]= useState<any>(null);

  const unreadTotal = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  useEffect(() => {
    const init = async () => {
      const uid   = (await AsyncStorage.getItem('userId'))   || route?.params?.userId || '';
      const uname = (await AsyncStorage.getItem('userName')) || route?.params?.name   || '';
      if (uid)   setUserId(uid);
      if (uname) setName(uname);

      const stored = await AsyncStorage.getItem('family_members');
      const mems: any[] = stored ? JSON.parse(stored) : [];
      setMembers(mems || []);
      await fetchData(uid);
    };
    init();
  }, []);

  const fetchData = async (uid: string) => {
    setLoading(true);
    try {
      const [cr, gr, mr] = await Promise.all([
        fetch(`${API}/family/messages/${uid}`),
        fetch(`${API}/family/goals/${uid}`),
        fetch(`${API}/family/members/${uid}`),
      ]);
      if (cr.ok) {
        const cd = await cr.json();
        setConvs(cd.conversations || []);
      } else {
        setConvs(DEMO_CONVERSATIONS);
      }
      if (gr.ok) {
        const gd = await gr.json();
        setGoals(gd.goals || DEMO_GOALS);
      } else {
        setGoals(DEMO_GOALS);
      }
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
    } catch {
      setConvs(DEMO_CONVERSATIONS);
      setGoals(DEMO_GOALS);
    }
    setLoading(false);
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
    } catch {}
    setRelModal(false);
  };


  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A8A" />

      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 14, 28) }]}>
        <View>
          <Text style={s.headerTitle}>우리 가족</Text>
          <Text style={s.headerSub}>{name ? `${name}님의 가족 공간` : '가족과 소통해요'}</Text>
        </View>
        <TouchableOpacity style={s.addFamilyBtn}
          onPress={() => navigation.navigate('FamilyConnect', { userId, name, addMode: true })}>
          <Ionicons name="person-add-outline" size={22} color="#1A4A8A" />
        </TouchableOpacity>
      </View>

      {/* Member chips */}
      {members.length > 0 && (
        <View style={s.chipBar}>
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
                    {m.relation ? `${RELATION_LABEL[m.relation]}` : m.name}
                  </Text>
                  {noRel && <Text style={s.chipEdit}>설정</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Tab toggle */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'messages' && s.tabBtnOn]}
          onPress={() => setTab('messages')}>
          <Text style={[s.tabTxt, tab === 'messages' && s.tabTxtOn]}>
            메시지{unreadTotal > 0 ? `  ${unreadTotal}` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'goals' && s.tabBtnOn]}
          onPress={() => setTab('goals')}>
          <Text style={[s.tabTxt, tab === 'goals' && s.tabTxtOn]}>건강 목표</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadBox}>
          <ActivityIndicator size="large" color="#1A4A8A" />
          <Text style={s.loadTxt}>불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {tab === 'messages' ? (
            members.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>👨‍👩‍👧‍👦</Text>
                <Text style={s.emptyTxt}>연결된 가족이 없어요</Text>
                <TouchableOpacity style={s.emptyBtn}
                  onPress={() => navigation.navigate('FamilyConnect', { userId, name, addMode: true })}>
                  <Text style={s.emptyBtnTxt}>가족 연결하기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              members.map(m => {
                const conv = convs.find(c => c.partner_id === m.id);
                const unread   = conv?.unread_count || 0;
                const lastMsg  = conv?.last_message || '첫 인사를 나눠보세요 💙';
                const lastTime = conv?.last_at
                  ? new Date(conv.last_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <TouchableOpacity key={m.id} style={s.convCard}
                    onPress={() => navigation.navigate('FamilyChat', {
                      userId, name,
                      partnerId: m.id, partnerName: m.name, partnerRelation: m.relation,
                    })}
                    activeOpacity={0.85}>
                    <View style={s.convAvatar}>
                      <Text style={s.convAvatarTxt}>{RELATION_EMOJI[m.relation] || '👤'}</Text>
                      {unread > 0 && (
                        <View style={s.unreadDot}>
                          <Text style={s.unreadDotTxt}>{unread}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.convBody}>
                      <View style={s.convTopRow}>
                        <Text style={s.convName}>
                          {m.relation ? RELATION_LABEL[m.relation] : m.name} {m.relation ? m.name : ''}
                        </Text>
                        {lastTime ? <Text style={s.convTime}>{lastTime}</Text> : null}
                      </View>
                      <Text style={[s.convLast, unread > 0 && s.convLastUnread]}
                        numberOfLines={1}>{lastMsg}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
                  </TouchableOpacity>
                );
              })
            )
          ) : (
            goals.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>🎯</Text>
                <Text style={s.emptyTxt}>설정된 건강 목표가 없어요{'\n'}가족과 함께 목표를 정해보세요!</Text>
              </View>
            ) : (
              goals.map((g: any) => {
                const pct   = Math.min(100, Math.round(g.progress_pct || 0));
                const color = pct >= 100 ? '#3DAB7B' : pct >= 60 ? '#F5A623' : '#2272B8';
                const label = g.goal_type === 'steps' ? '걸음수 목표' : '건강 목표';
                const icon  = g.goal_type === 'steps' ? '🚶' : '🎯';
                return (
                  <View key={g.id} style={s.goalCard}>
                    <View style={s.goalTop}>
                      <Text style={s.goalTitle}>{icon} {label}</Text>
                      <View style={[s.goalPeriodBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[s.goalPeriodTxt, { color }]}>
                          {g.period === 'daily' ? '오늘' : '이번 주'}
                        </Text>
                      </View>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    </View>
                    <View style={s.goalBottom}>
                      <Text style={[s.goalPct, { color }]}>{pct}% 달성</Text>
                      <Text style={s.goalTarget}>목표 {g.target?.toLocaleString()}보</Text>
                    </View>
                    {g.created_by && g.created_by !== userId && (
                      <Text style={s.goalCheer}>가족이 응원하고 있어요 💙</Text>
                    )}
                  </View>
                );
              })
            )
          )}
        </ScrollView>
      )}

      {/* Relation modal */}
      <Modal visible={relModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{relTarget?.name}님과의 관계</Text>
            <Text style={s.modalSub}>관계를 선택해 주세요</Text>
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

      <SeniorTabBar activeTab="family" userId={userId} name={name} navigation={navigation} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F5FB' },

  header:        { backgroundColor: '#1A4A8A', paddingHorizontal: 22, paddingBottom: 18,
                   flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerTitle:   { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 2 },
  headerSub:     { fontSize: 18, color: 'rgba(255,255,255,0.82)' },
  addFamilyBtn:  { backgroundColor: '#fff', borderRadius: 14, padding: 10 },

  chipBar:    { backgroundColor: '#1A4A8A', paddingBottom: 16 },
  chipScroll: { paddingHorizontal: 16, gap: 10 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 30,
                paddingHorizontal: 16, paddingVertical: 10,
                borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  chipEmoji: { fontSize: 24 },
  chipName:  { fontSize: 17, fontWeight: '700', color: '#fff' },
  chipEdit:  { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  tabRow:    { flexDirection: 'row', backgroundColor: '#fff',
               borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  tabBtn:    { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabBtnOn:  { borderBottomWidth: 3, borderBottomColor: '#1A4A8A' },
  tabTxt:    { fontSize: 18, fontWeight: '600', color: '#90A4AE' },
  tabTxtOn:  { color: '#1A4A8A', fontWeight: '800' },

  loadBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 },
  loadTxt:  { fontSize: 18, color: '#90A4AE' },

  content: { padding: 16, paddingBottom: 120 },

  emptyBox:    { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyIcon:   { fontSize: 56 },
  emptyTxt:    { fontSize: 20, color: '#90A4AE', textAlign: 'center', lineHeight: 32 },
  emptyBtn:    { backgroundColor: '#1A4A8A', borderRadius: 18, paddingHorizontal: 28, paddingVertical: 16, marginTop: 8 },
  emptyBtnTxt: { fontSize: 20, fontWeight: '800', color: '#fff' },

  convCard:      { flexDirection: 'row', alignItems: 'center', gap: 16,
                   backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12,
                   shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  convAvatar:    { width: 58, height: 58, borderRadius: 29,
                   backgroundColor: '#EBF3FB', alignItems: 'center', justifyContent: 'center',
                   position: 'relative' },
  convAvatarTxt: { fontSize: 28 },
  unreadDot:     { position: 'absolute', top: -2, right: -2,
                   backgroundColor: '#E53935', borderRadius: 10,
                   minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                   paddingHorizontal: 5 },
  unreadDotTxt:  { fontSize: 13, fontWeight: '900', color: '#fff' },
  convBody:      { flex: 1 },
  convTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  convName:      { fontSize: 20, fontWeight: '800', color: '#1E2D3D' },
  convTime:      { fontSize: 15, color: '#B0BEC5' },
  convLast:      { fontSize: 17, color: '#90A4AE', lineHeight: 24 },
  convLastUnread:{ color: '#1E2D3D', fontWeight: '700' },

  goalCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 22, marginBottom: 14,
                shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  goalTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  goalTitle:  { fontSize: 22, fontWeight: '800', color: '#1E2D3D' },
  goalPeriodBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  goalPeriodTxt:   { fontSize: 16, fontWeight: '700' },
  barBg:      { height: 16, backgroundColor: '#EEF2F8', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  barFill:    { height: '100%', borderRadius: 8 },
  goalBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  goalPct:    { fontSize: 24, fontWeight: '900' },
  goalTarget: { fontSize: 17, color: '#90A4AE' },
  goalCheer:  { fontSize: 17, color: '#2272B8', fontWeight: '600', marginTop: 10 },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
                    padding: 30, paddingBottom: 48, maxHeight: '80%' },
  modalTitle:     { fontSize: 26, fontWeight: '900', color: '#1A4A8A', textAlign: 'center', marginBottom: 8 },
  modalSub:       { fontSize: 18, color: '#90A4AE', textAlign: 'center', marginBottom: 22 },
  relOpt:         { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#F5F8FF',
                    borderRadius: 18, padding: 20, marginBottom: 10 },
  relEmoji:       { fontSize: 32 },
  relLabel:       { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  modalCancel:    { marginTop: 8, padding: 20, alignItems: 'center',
                    backgroundColor: '#ECEFF1', borderRadius: 16 },
  modalCancelTxt: { fontSize: 22, color: '#546E7A', fontWeight: '700' },
});
