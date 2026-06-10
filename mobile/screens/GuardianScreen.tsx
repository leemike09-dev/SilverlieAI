import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Modal, TextInput,
} from 'react-native';
import Lumi from '../components/Lumi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SeniorTabBar from '../components/SeniorTabBar';
import * as Linking from 'expo-linking';

const BLUE     = '#3B82F6';
const GREEN    = '#22C55E';
const RED      = '#EF4444';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK      = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];
const getAvatarColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];
const getInitials = (name: string) =>
  name.trim().slice(0, 2) || '?';

type Guardian = {
  id: string;
  name: string;
  relation: string;
  phoneNumber: string;
  priority?: number;
};

const RELATIONS = ['딸', '아들', '배우자', '형제/자매', '기타'];

export default function GuardianScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;

  const [guardians, setGuardians]   = useState<Guardian[]>([]);
  const [modalOpen, setModalOpen]   = useState(false);
  const [inputName, setInputName]   = useState('');
  const [inputRel,  setInputRel]    = useState('딸');
  const [inputPhone, setInputPhone] = useState('');

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(`guardians.${userId}`);
      if (raw) setGuardians(JSON.parse(raw));
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async (list: Guardian[]) => {
    setGuardians(list);
    await AsyncStorage.setItem(`guardians.${userId}`, JSON.stringify(list));
  };

  const handleAdd = async () => {
    const trimName  = inputName.trim();
    const trimPhone = inputPhone.trim();
    if (!trimName)  { Alert.alert('알림', '이름을 입력해주세요'); return; }
    if (!trimPhone) { Alert.alert('알림', '전화번호를 입력해주세요'); return; }
    const newItem: Guardian = {
      id: Date.now().toString(),
      name: trimName,
      relation: inputRel,
      phoneNumber: trimPhone,
      priority: guardians.length === 0 ? 1 : undefined,
    };
    await save([...guardians, newItem]);
    setModalOpen(false);
    setInputName('');
    setInputPhone('');
    setInputRel('딸');
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제', '이 연락처를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = guardians.filter(g => g.id !== id);
          await save(updated);
        }
      },
    ]);
  };

  const handleCall = (g: Guardian) => {
    if (!g.phoneNumber) { Alert.alert('알림', '연락처가 없습니다'); return; }
    Linking.openURL(`tel:${g.phoneNumber}`).catch(() => {});
  };

  const handleMessage = (g: Guardian) => {
    if (!g.phoneNumber) { Alert.alert('알림', '연락처가 없습니다'); return; }
    Linking.openURL(`sms:${g.phoneNumber}`).catch(() => {});
  };

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={28} color={INK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>보호자 연락처</Text>
          <TouchableOpacity onPress={() => setModalOpen(true)} style={s.addHeaderBtn}>
            <Ionicons name="add" size={28} color={BLUE} />
          </TouchableOpacity>
        </View>

        {/* Lumi greeting */}
        <View style={s.lumiRow}>
          <Lumi mood="happy" size={80} bob />
          <View style={s.lumiBubble}>
            <Text style={s.lumiText}>
              {name}님 가족이{'\n'}항상 곁에 있어요 💜
            </Text>
          </View>
        </View>

        {guardians.length === 0 ? (
          /* ─── Empty state ─── */
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>👨‍👩‍👧</Text>
            <Text style={s.emptyTitle}>아직 보호자가 없어요</Text>
            <Text style={s.emptyDesc}>가족 연락처를 추가하면{'\n'}SOS 상황에 바로 연결돼요</Text>
            <TouchableOpacity style={s.btnPrimary} onPress={() => setModalOpen(true)}>
              <Text style={s.btnPrimaryText}>+ 첫 보호자 추가하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── Guardian list ─── */
          <View style={s.listWrap}>
            {guardians.map((g, idx) => (
              <View key={g.id} style={s.card}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: getAvatarColor(idx) }]}>
                    <Text style={s.avatarText}>{getInitials(g.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.memberName}>{g.name}</Text>
                      {g.priority === 1 && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>1순위</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.memberRel}>{g.relation}</Text>
                    <Text style={s.memberPhone}>{g.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(g.id)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={RED} />
                  </TouchableOpacity>
                </View>

                {/* Action buttons */}
                <View style={s.actionRow}>
                  <TouchableOpacity style={[s.btnAction, { backgroundColor: GREEN }]}
                    onPress={() => handleCall(g)}>
                    <Ionicons name="call" size={22} color="#fff" />
                    <Text style={s.btnActionTxt}>전화하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btnAction, s.btnOutline]}
                    onPress={() => handleMessage(g)}>
                    <Ionicons name="chatbubble-outline" size={22} color={BLUE} />
                    <Text style={[s.btnActionTxt, { color: BLUE }]}>메시지</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add more */}
            <TouchableOpacity style={s.addMoreBtn} onPress={() => setModalOpen(true)}>
              <Ionicons name="add-circle-outline" size={24} color={INK_SOFT} />
              <Text style={s.addMoreTxt}>보호자 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />

      {/* ─── Add Guardian Modal ─── */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>보호자 추가</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={26} color={INK} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>이름</Text>
            <TextInput
              style={[s.input, { fontSize: 20 }]}
              value={inputName}
              onChangeText={setInputName}
              placeholder="예: 김철수"
              placeholderTextColor={INK_MUTE}
            />

            <Text style={s.inputLabel}>관계</Text>
            <View style={s.relRow}>
              {RELATIONS.map(r => (
                <TouchableOpacity key={r}
                  style={[s.relChip, inputRel === r && s.relChipActive]}
                  onPress={() => setInputRel(r)}>
                  <Text style={[s.relChipTxt, inputRel === r && s.relChipTxtActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>전화번호</Text>
            <TextInput
              style={[s.input, { fontSize: 20 }]}
              value={inputPhone}
              onChangeText={setInputPhone}
              placeholder="010-0000-0000"
              placeholderTextColor={INK_MUTE}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={s.btnSave} onPress={handleAdd}>
              <Text style={s.btnSaveTxt}>저장하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn:      { padding: 10 },
  addHeaderBtn: { padding: 10 },
  headerTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    color: INK,
    textAlign: 'center',
  },

  lumiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  lumiImg: { width: 64, height: 64, borderRadius: 32 },
  lumiBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lumiText: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    lineHeight: 26,
  },

  emptyCard: {
    marginHorizontal: 18,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyIcon:  { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: INK, marginBottom: 8 },
  emptyDesc: {
    fontSize: 17,
    fontWeight: '600',
    color: INK_SOFT,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },

  listWrap: { paddingHorizontal: 18, gap: 16, marginTop: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  memberName: { fontSize: 24, fontWeight: '900', color: INK },
  badge: {
    backgroundColor: '#FFF3D6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText:   { fontSize: 12, fontWeight: '800', color: '#A8770F' },
  memberRel:   { fontSize: 16, fontWeight: '600', color: INK_SOFT },
  memberPhone: { fontSize: 15, fontWeight: '600', color: INK_MUTE, marginTop: 2 },
  deleteBtn:   { padding: 8 },

  actionRow: { flexDirection: 'row', gap: 10 },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 64,
    borderRadius: 16,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: BLUE,
  },
  btnActionTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },

  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(15,27,45,0.15)',
    borderStyle: 'dashed',
  },
  addMoreTxt: { fontSize: 18, fontWeight: '700', color: INK_SOFT },

  btnPrimary: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  btnPrimaryText: { fontSize: 22, fontWeight: '800', color: '#fff' },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 26, fontWeight: '900', color: INK },

  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: INK_SOFT,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: INK,
    backgroundColor: '#FAFAFA',
  },

  relRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  relChipActive:    { backgroundColor: '#EFF6FF', borderColor: BLUE },
  relChipTxt:       { fontSize: 17, fontWeight: '700', color: INK_SOFT },
  relChipTxtActive: { color: BLUE },

  btnSave: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  btnSaveTxt: { fontSize: 22, fontWeight: '800', color: '#fff' },
});
