import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import { scheduleMedNotification, cancelMedNotification } from '../utils/notifications';
import { speak } from '../utils/speech';

const API_URL = 'https://silverlieai.onrender.com';
const isDemo  = (uid: string) => !uid || uid === 'demo-user' || uid === 'guest';

const GREEN  = '#2E7D32';
const LGREEN = '#E8F5E9';

const TIME_SLOTS = [
  { key: 'morning',  label: '아침',   icon: '🌅', defaultTime: '08:00' },
  { key: 'lunch',    label: '점심',   icon: '☀️',  defaultTime: '12:00' },
  { key: 'evening',  label: '저녁',   icon: '🌙',  defaultTime: '18:00' },
  { key: 'bedtime',  label: '취침전', icon: '🌛',  defaultTime: '21:00' },
];

const STORAGE_KEY = 'medications';
const EMPTY_FORM  = { name: '', dosage: '', method: '', timeSlot: 'morning', stock: '' };

export default function MedicationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,   setUserId]   = useState('');
  const [uname,    setUname]    = useState('');
  const [meds,     setMeds]     = useState<any[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [form,     setForm]     = useState<any>(EMPTY_FORM);

  useEffect(() => {
    const init = async () => {
      const uid  = (await AsyncStorage.getItem('userId'))   || '';
      const name = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUname(name);

      // 서버 우선 로드, 실패 시 로컬 폴백
      if (!isDemo(uid)) {
        try {
          const res  = await fetch(`${API_URL}/medications/today/${uid}`);
          if (res.ok) {
            const data = await res.json();
            setMeds(data);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            announceMeds(data);
            return;
          }
        } catch {}
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const loaded = JSON.parse(stored);
        setMeds(loaded);
        announceMeds(loaded);
      }
    };
    init();
  }, []);

  const announceMeds = (medsData: any[]) => {
    if (!medsData.length) return;
    const h = new Date().getHours();
    const slot = h < 10 ? 'morning' : h < 14 ? 'lunch' : h < 20 ? 'evening' : 'bedtime';
    const slotLabel: Record<string, string> = { morning: '아침', lunch: '점심', evening: '저녁', bedtime: '취침 전' };
    const slotMeds = medsData.filter((m: any) => m.timeSlot === slot);
    const pending  = slotMeds.filter((m: any) => !m.taken && !m.skipped);
    if (pending.length > 0) {
      setTimeout(() => speak(
        `${slotLabel[slot]} 약이 ${pending.length}가지 남아있어요. ${pending[0].name} 잊지 마세요.`, 0.85
      ), 600);
    } else if (slotMeds.length > 0) {
      setTimeout(() => speak(`${slotLabel[slot]} 약은 모두 드셨어요. 잘 하셨어요!`, 0.85), 600);
    }
  };

  const saveMeds = async (updated: any[]) => {
    setMeds(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const apiToggle = (uid: string, medId: string, field: string, value: boolean) => {
    if (isDemo(uid)) return;
    fetch(`${API_URL}/medications/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, med_id: medId, field, value }),
    }).catch(() => {});
  };

  const toggleTaken = (id: string) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const nowTaking = !med.taken;
    if (nowTaking) speak(`${med.name} 복용 완료예요. 건강 챙기셨네요!`, 0.85);
    const updated = meds.map(m => m.id === id ? { ...m, taken: nowTaking, skipped: false } : m);
    saveMeds(updated);
    apiToggle(userId, id, 'taken', nowTaking);
    if (!nowTaking) apiToggle(userId, id, 'skipped', false);
  };

  const toggleSkipped = (id: string) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const nowSkipping = !med.skipped;
    const updated = meds.map(m => m.id === id ? { ...m, skipped: nowSkipping, taken: false } : m);
    saveMeds(updated);
    apiToggle(userId, id, 'skipped', nowSkipping);
    if (!nowSkipping) apiToggle(userId, id, 'taken', false);
  };

  const addMed = async () => {
    if (!form.name.trim()) {
      Alert.alert('입력 오류', '약 이름을 입력해 주세요.');
      return;
    }
    const newMed = {
      id:       Date.now().toString(),
      name:     form.name.trim(),
      dosage:   form.dosage.trim()  || '1정',
      method:   form.method.trim()  || '식후',
      timeSlot: form.timeSlot,
      stock:    parseInt(form.stock) || 0,
      taken:    false,
      skipped:  false,
    };
    const updatedMeds = [...meds, newMed];
    await saveMeds(updatedMeds);
    scheduleMedNotification(newMed.id, newMed.name, newMed.timeSlot);
    // 서버 저장 (오프라인 안전)
    if (!isDemo(userId)) {
      fetch(`${API_URL}/medications/add-simple/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newMed.id, name: newMed.name, dosage: newMed.dosage,
          method: newMed.method, time_slot: newMed.timeSlot, stock: newMed.stock,
        }),
      }).catch(() => {});
    }
    setForm(EMPTY_FORM);
    setAddModal(false);
  };

  const deleteMed = (id: string) => {
    Alert.alert('약 삭제', '이 약을 목록에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => {
          saveMeds(meds.filter(m => m.id !== id));
          if (!isDemo(userId)) {
            fetch(`${API_URL}/medications/delete/${userId}/${id}`, { method: 'DELETE' }).catch(() => {});
          }
        }},
    ]);
  };

  const total = meds.length;
  const taken = meds.filter(m => m.taken).length;
  const pct   = total > 0 ? Math.round((taken / total) * 100) : 0;


  return (
    <LinearGradient colors={['#F4FBF6', '#DFF2E8', '#C5E8D3']} locations={[0, 0.55, 1]} style={s.root}>

      {/* ── 탑바 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View>
          <Text style={s.topTitle}>💊 약 관리</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setAddModal(true)} activeOpacity={0.8}>
            <Text style={s.addBtnTxt}>+ 약 추가</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── 진행률 카드 ── */}
        <View style={s.progressCard}>
          <View style={s.progressTop}>
            <Text style={s.progressLabel}>오늘 복약 현황</Text>
            <Text style={s.progressCountTxt}>
              {taken}<Text style={s.progressTotalTxt}>/{total} 완료</Text>
            </Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: (pct + '%') as any }]} />
          </View>
          <Text style={s.progressPct}>{pct}% 완료</Text>
        </View>

        {/* ── 약 없을 때 ── */}
        {total === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>💊</Text>
            <Text style={s.emptyTitle}>아직 등록된 약이 없어요</Text>
            <Text style={s.emptySub}>복용하는 약을 등록하면{`\n`}복용 현황을 관리할 수 있어요</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setAddModal(true)}>
              <Text style={s.emptyBtnTxt}>+ 약 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 시간대별 목록 ── */}
        {TIME_SLOTS.map(slot => {
          const slotMeds = meds.filter(m => m.timeSlot === slot.key);
          if (slotMeds.length === 0) return null;
          const slotTaken = slotMeds.filter(m => m.taken).length;
          return (
            <View key={slot.key} style={s.section}>
              {/* 시간대 헤더 */}
              <View style={s.sectionHead}>
                <Text style={s.sectionIcon}>{slot.icon}</Text>
                <Text style={s.sectionLabel}>{slot.label}</Text>
                <View style={s.sectionBadge}>
                  <Text style={s.sectionBadgeTxt}>{slotTaken}/{slotMeds.length}</Text>
                </View>
              </View>

              {/* 약 카드 목록 */}
              {slotMeds.map(med => {
                const lowStock = med.stock != null && med.stock <= 7;
                return (
                  <TouchableOpacity
                    key={med.id}
                    style={[s.medCard,
                      med.taken   && s.medCardDone,
                      med.skipped && s.medCardSkip]}
                    onLongPress={() => deleteMed(med.id)}
                    activeOpacity={0.85}
                  >
                    {/* 약 정보 */}
                    <View style={s.medInfo}>
                      <View style={s.medNameRow}>
                        <Text style={[s.medName, (med.taken || med.skipped) && s.medNameGray]}>
                          {med.name}
                        </Text>
                        {med.taken   && <Text style={s.doneBadge}>✓ 완료</Text>}
                        {med.skipped && <Text style={s.skipBadge}>건너뜀</Text>}
                      </View>
                      <Text style={s.medDetail}>{med.dosage}  ·  {med.method}</Text>
                      {lowStock
                        ? <Text style={s.stockWarn}>⚠️ 재고 {med.stock}일 분 남음</Text>
                        : med.stock > 0
                          ? <Text style={s.stockOk}>재고 {med.stock}일 분</Text>
                          : null}
                    </View>

                    {/* 버튼 */}
                    <View style={s.medBtns}>
                      {!med.taken && !med.skipped && (
                        <>
                          <TouchableOpacity style={s.btnTake} onPress={() => toggleTaken(med.id)}>
                            <Text style={s.btnTakeTxt}>복용</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.btnSkip} onPress={() => toggleSkipped(med.id)}>
                            <Text style={s.btnSkipTxt}>건너뜀</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {(med.taken || med.skipped) && (
                        <TouchableOpacity
                          style={s.btnUndo}
                          onPress={() => med.taken ? toggleTaken(med.id) : toggleSkipped(med.id)}
                        >
                          <Text style={s.btnUndoTxt}>취소</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── 약 추가 모달 ── */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>약 추가</Text>

              <Text style={s.fLabel}>약 이름</Text>
              <TextInput
                style={s.fInputLg}
                value={form.name}
                onChangeText={t => setForm({ ...form, name: t })}
                placeholder="예: 혈압약"
                placeholderTextColor="#B0BEC5"
              />

              <Text style={s.fLabel}>복용량</Text>
              <TextInput
                style={s.fInput}
                value={form.dosage}
                onChangeText={t => setForm({ ...form, dosage: t })}
                placeholder="예: 1정"
                placeholderTextColor="#B0BEC5"
              />

              <Text style={s.fLabel}>복용 시간대</Text>
              <View style={s.timeRow}>
                {TIME_SLOTS.map(ts => (
                  <TouchableOpacity
                    key={ts.key}
                    style={form.timeSlot === ts.key ? [s.timeBtn, s.timeBtnOn] : s.timeBtn}
                    onPress={() => setForm({ ...form, timeSlot: ts.key })}
                  >
                    <Text style={s.timeBtnIcon}>{ts.icon}</Text>
                    <Text style={form.timeSlot === ts.key ? [s.timeBtnTxt, s.timeBtnTxtOn] : s.timeBtnTxt}>
                      {ts.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fLabel}>복용 방법</Text>
              <TextInput
                style={s.fInput}
                value={form.method}
                onChangeText={t => setForm({ ...form, method: t })}
                placeholder="예: 식후 30분"
                placeholderTextColor="#B0BEC5"
              />

              <Text style={s.fLabel}>현재 재고 (일 수)</Text>
              <TextInput
                style={s.fInput}
                value={form.stock}
                onChangeText={t => setForm({ ...form, stock: t })}
                placeholder="예: 30"
                placeholderTextColor="#B0BEC5"
                keyboardType="numeric"
              />

              <TouchableOpacity style={s.saveBtn} onPress={addMed}>
                <Text style={s.saveBtnTxt}>저장하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setForm(EMPTY_FORM); setAddModal(false); }}>
                <Text style={s.cancelBtnTxt}>취소</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <SeniorTabBar activeTab="med" userId={userId} name={uname} navigation={navigation} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // 탑바
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12,
               borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
  topTitle:  { fontSize: 22, fontWeight: '900', color: '#1A2C4E', marginBottom: 8 },
  addBtn:    { backgroundColor: GREEN, borderRadius: 14,
               paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start' },
  addBtnTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  gearBtn:   { backgroundColor: LGREEN, borderRadius: 14,
               paddingHorizontal: 9, paddingVertical: 4,
               borderWidth: 1, borderColor: '#A5D6A7', alignItems: 'center' },
  gearEmoji: { fontSize: 20 },
  gearLabel: { fontSize: 10, color: GREEN, fontWeight: '700', textAlign: 'center', marginTop: 1 },

  // 스크롤
  scroll:  { flex: 1 },
  content: { padding: 16, paddingTop: 18, paddingBottom: 120 },

  // 진행률
  progressCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 18,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  progressTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel:    { fontSize: 20, fontWeight: '800', color: '#2C2C2C' },
  progressCountTxt: { fontSize: 28, fontWeight: '900', color: GREEN },
  progressTotalTxt: { fontSize: 20, color: '#90A4AE', fontWeight: '700' },
  progressBar:  { height: 14, backgroundColor: LGREEN, borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%' as any, backgroundColor: GREEN, borderRadius: 7 },
  progressPct:  { fontSize: 18, color: GREEN, fontWeight: '700', textAlign: 'right' },

  // 빈 상태
  emptyBox:  { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: { fontSize: 64 },
  emptyTitle:{ fontSize: 24, fontWeight: '800', color: '#2C2C2C' },
  emptySub:  { fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 },
  emptyBtn:  { backgroundColor: GREEN, borderRadius: 18, paddingHorizontal: 32, paddingVertical: 20, marginTop: 8 },
  emptyBtnTxt:{ fontSize: 22, fontWeight: '900', color: '#fff' },

  // 섹션
  section:      { marginBottom: 22 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:  { fontSize: 26 },
  sectionLabel: { fontSize: 22, fontWeight: '900', color: '#1A2C4E', flex: 1 },
  sectionBadge: { backgroundColor: LGREEN, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  sectionBadgeTxt:{ fontSize: 18, fontWeight: '700', color: GREEN },

  // 약 카드
  medCard:     { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10,
                 flexDirection: 'row', alignItems: 'center',
                 shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                 shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  medCardDone: { backgroundColor: LGREEN, borderWidth: 1.5, borderColor: '#A5D6A7' },
  medCardSkip: { backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0' },
  medInfo:     { flex: 1 },
  medNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  medName:     { fontSize: 22, fontWeight: '800', color: '#1A2C4E' },
  medNameGray: { color: '#90A4AE' },
  doneBadge:   { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
                 fontSize: 16, fontWeight: '700', color: '#fff', overflow: 'hidden' },
  skipBadge:   { backgroundColor: '#9E9E9E', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
                 fontSize: 16, fontWeight: '700', color: '#fff', overflow: 'hidden' },
  medDetail:   { fontSize: 18, color: '#888', marginBottom: 4 },
  stockWarn:   { fontSize: 18, color: '#D32F2F', fontWeight: '700' },
  stockOk:     { fontSize: 16, color: '#B0BEC5' },

  // 버튼
  medBtns:    { flexDirection: 'column', gap: 8, marginLeft: 12 },
  btnTake:    { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  btnTakeTxt: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  btnSkip:    { backgroundColor: '#F5F5F5', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  btnSkipTxt: { fontSize: 18, fontWeight: '700', color: '#888', textAlign: 'center' },
  btnUndo:    { backgroundColor: LGREEN, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
                borderWidth: 1, borderColor: '#A5D6A7' },
  btnUndoTxt: { fontSize: 18, fontWeight: '700', color: GREEN, textAlign: 'center' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScroll:  { justifyContent: 'flex-end', flexGrow: 1 },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
                  padding: 28, paddingBottom: 50 },
  modalTitle:   { fontSize: 28, fontWeight: '900', color: GREEN, textAlign: 'center', marginBottom: 22 },

  fLabel:   { fontSize: 18, fontWeight: '700', color: '#546E7A', marginBottom: 8, marginTop: 14 },
  fInputLg: { backgroundColor: '#F4F7FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#90CAF9',
              fontSize: 22, fontWeight: '700', color: '#1A2C4E',
              paddingVertical: 16, paddingHorizontal: 16 },
  fInput:   { backgroundColor: '#F4F7FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#C8E6C9',
              fontSize: 20, fontWeight: '600', color: '#1A2C4E',
              paddingVertical: 14, paddingHorizontal: 16 },

  timeRow:     { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timeBtn:     { flex: 1, alignItems: 'center', backgroundColor: '#F4F7FC',
                 borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: '#E0E0E0' },
  timeBtnOn:   { backgroundColor: LGREEN, borderColor: GREEN },
  timeBtnIcon: { fontSize: 22, marginBottom: 4 },
  timeBtnTxt:  { fontSize: 16, fontWeight: '700', color: '#78909C' },
  timeBtnTxtOn:{ color: GREEN },

  saveBtn:     { backgroundColor: GREEN, borderRadius: 18, paddingVertical: 22, alignItems: 'center', marginTop: 22 },
  saveBtnTxt:  { fontSize: 22, fontWeight: '900', color: '#fff' },
  cancelBtn:   { padding: 18, alignItems: 'center' },
  cancelBtnTxt:{ fontSize: 20, color: '#90A4AE', fontWeight: '700' },
});
