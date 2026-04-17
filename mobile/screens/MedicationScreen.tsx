import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';

const GREEN  = '#2E7D32';
const LGREEN = '#E8F5E9';
const BG     = '#F4F7FC';

const TIME_SLOTS = [
  { key: 'morning',  label: '아침',   icon: '🌅', defaultTime: '08:00' },
  { key: 'lunch',    label: '점심',   icon: '☀️',  defaultTime: '12:00' },
  { key: 'evening',  label: '저녁',   icon: '🌙',  defaultTime: '18:00' },
  { key: 'bedtime',  label: '취침전', icon: '🌛',  defaultTime: '21:00' },
];

const DEMO_MEDS = [
  { id: '1', name: '혈압약', dosage: '1정', method: '식후 즉시', timeSlot: 'morning', stock: 28, taken: true,  skipped: false },
  { id: '2', name: '당뇨약', dosage: '1정', method: '식사 중',   timeSlot: 'morning', stock: 14, taken: true,  skipped: false },
  { id: '3', name: '당뇨약', dosage: '1정', method: '식사 중',   timeSlot: 'lunch',   stock: 14, taken: false, skipped: false },
  { id: '4', name: '관절약', dosage: '2정', method: '식후 30분', timeSlot: 'lunch',   stock: 5,  taken: false, skipped: false },
  { id: '5', name: '혈압약', dosage: '1정', method: '식후 즉시', timeSlot: 'evening', stock: 28, taken: false, skipped: false },
];

const STORAGE_KEY = 'medications';
const EMPTY_FORM  = { name: '', dosage: '', method: '', timeSlot: 'morning', stock: '' };

export default function MedicationScreen({ navigation }: any) {
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
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMeds(JSON.parse(stored));
      } else {
        setMeds(DEMO_MEDS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_MEDS));
      }
    };
    init();
  }, []);

  const saveMeds = async (updated: any[]) => {
    setMeds(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleTaken = (id: string) => {
    saveMeds(meds.map(m => m.id === id ? { ...m, taken: !m.taken, skipped: false } : m));
  };

  const toggleSkipped = (id: string) => {
    saveMeds(meds.map(m => m.id === id ? { ...m, skipped: !m.skipped, taken: false } : m));
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
    await saveMeds([...meds, newMed]);
    setForm(EMPTY_FORM);
    setAddModal(false);
  };

  const deleteMed = (id: string) => {
    Alert.alert('약 삭제', '이 약을 목록에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => saveMeds(meds.filter(m => m.id !== id)) },
    ]);
  };

  const total = meds.length;
  const taken = meds.filter(m => m.taken).length;
  const pct   = total > 0 ? Math.round((taken / total) * 100) : 0;

  const PT = Platform.OS === 'ios' ? 54 : 32;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── 헤더 ── */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>💊 약 관리</Text>
            <Text style={s.headerSub}>오늘도 건강하게 복용해요</Text>
          </View>
          <TouchableOpacity style={s.addHeaderBtn} onPress={() => setAddModal(true)}>
            <Text style={s.addHeaderTxt}>+ 약 추가</Text>
          </TouchableOpacity>
        </View>
        {/* 웨이브: 웹 전용 */}
        {Platform.OS === 'web' ? (
          <View style={s.waveWrap}>
            {/* @ts-ignore */}
            <svg width="100%" height="30" viewBox="0 0 200 30" preserveAspectRatio="none"
              style={{ display: 'block' }}>
              <path d="M0 20 Q50 0 100 15 Q150 30 200 10 L200 30 L0 30 Z" fill={BG} />
            </svg>
          </View>
        ) : (
          <View style={s.waveNative} />
        )}
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // 헤더
  header:      { backgroundColor: GREEN, paddingHorizontal: 20, paddingBottom: 0, zIndex: 10 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
                 paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:   { fontSize: 18, color: 'rgba(255,255,255,0.75)' },
  addHeaderBtn:{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14,
                 paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  addHeaderTxt:{ fontSize: 18, fontWeight: '800', color: '#fff' },
  waveWrap:    { height: 30, overflow: 'hidden' },
  waveNative:  { height: 24, backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22 },

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
