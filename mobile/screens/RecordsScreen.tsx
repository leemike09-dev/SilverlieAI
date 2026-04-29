import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE   = '#1A4A8A';
const GREEN  = '#2E7D32';
const RED    = '#C62828';
const PURPLE = '#6A1B9A';

type TabKey = 'med' | 'hospital' | 'memo';

function fmtTime(h: number, m: number) {
  const ap  = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ap} ${h12}시${m > 0 ? ` ${m}분` : ''}`;
}

const TIME_SLOT_LABEL: Record<string, string> = {
  morning: '아침 🌅', lunch: '점심 ☀️', evening: '저녁 🌙', bedtime: '취침전 🌛',
};

export default function RecordsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [uname,  setUname]  = useState('');
  const [tab,    setTab]    = useState<TabKey>('med');

  // ── 약 목록 ────────────────────────────────────
  const [meds,        setMeds]        = useState<any[]>([]);
  const [editMed,     setEditMed]     = useState<any | null>(null);
  const [medSaving,   setMedSaving]   = useState(false);

  // ── 병원 예약 ───────────────────────────────────
  const [hospDate,    setHospDate]    = useState('');
  const [hospTime,    setHospTime]    = useState('');
  const [hospClinic,  setHospClinic]  = useState('');
  const [savedHosp,   setSavedHosp]   = useState<any>(null);
  const [hospSaving,  setHospSaving]  = useState(false);
  const [hospEditing, setHospEditing] = useState(false);

  // ── 의사 메모 ───────────────────────────────────
  const [memo,        setMemo]        = useState('');
  const [memoDate,    setMemoDate]    = useState('');
  const [memoEditing, setMemoEditing] = useState(false);
  const [memoSaving,  setMemoSaving]  = useState(false);

  useEffect(() => {
    const init = async () => {
      const uid  = (await AsyncStorage.getItem('userId'))   || '';
      const name = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUname(name);
      loadAll();
    };
    init();
  }, []);

  const loadAll = useCallback(async () => {
    // 약 목록
    const storedMeds = await AsyncStorage.getItem('medications');
    if (storedMeds) setMeds(JSON.parse(storedMeds));

    // 병원 예약
    const storedHosp = await AsyncStorage.getItem('hospital_schedule');
    if (storedHosp) {
      const p = JSON.parse(storedHosp);
      setSavedHosp(p);
      setHospDate(p.date || '');
      setHospTime(p.time || '');
      setHospClinic(p.clinic || '');
    }

    // 의사 메모
    const storedMemo     = await AsyncStorage.getItem('doctor_memo');
    const storedMemoDate = await AsyncStorage.getItem('doctor_memo_date');
    if (storedMemo) setMemo(storedMemo);
    if (storedMemoDate) setMemoDate(storedMemoDate);
  }, []);

  // ── 약 수정 저장 ────────────────────────────────
  const saveMed = async () => {
    if (!editMed?.name?.trim()) {
      Alert.alert('입력 확인', '약 이름을 입력해 주세요.');
      return;
    }
    setMedSaving(true);
    const updated = meds.map(m => m.id === editMed.id ? { ...editMed } : m);
    await AsyncStorage.setItem('medications', JSON.stringify(updated));
    setMeds(updated);
    setEditMed(null);
    setMedSaving(false);
  };

  const deleteMed = (id: string) => {
    Alert.alert('약 삭제', '이 약을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = meds.filter(m => m.id !== id);
          await AsyncStorage.setItem('medications', JSON.stringify(updated));
          setMeds(updated);
        },
      },
    ]);
  };

  // ── 병원 예약 저장 ───────────────────────────────
  const saveHospital = async () => {
    if (!hospDate || !hospTime || !hospClinic) {
      Alert.alert('입력 확인', '날짜, 시간, 병원명을 모두 입력해 주세요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hospDate)) {
      Alert.alert('날짜 형식', '2026-05-15 형식으로 입력해 주세요.');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(hospTime)) {
      Alert.alert('시간 형식', '14:30 형식으로 입력해 주세요.');
      return;
    }
    setHospSaving(true);
    const schedule = { date: hospDate, time: hospTime, clinic: hospClinic };
    await AsyncStorage.setItem('hospital_schedule', JSON.stringify(schedule));
    setSavedHosp(schedule);
    setHospEditing(false);
    setHospSaving(false);
    const [hh, mm] = hospTime.split(':').map(Number);
    Alert.alert('저장 완료 🏥', `${hospDate}  ${fmtTime(hh, mm)}\n${hospClinic}`);
  };

  const deleteHospital = () => {
    Alert.alert('일정 삭제', '병원 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('hospital_schedule');
          setSavedHosp(null);
          setHospDate(''); setHospTime(''); setHospClinic('');
          setHospEditing(false);
        },
      },
    ]);
  };

  // ── 의사 메모 저장 ───────────────────────────────
  const saveMemo = async () => {
    if (!memo.trim()) {
      Alert.alert('입력 확인', '메모 내용을 입력해 주세요.');
      return;
    }
    setMemoSaving(true);
    const now = new Date().toLocaleDateString('ko-KR');
    await AsyncStorage.setItem('doctor_memo', memo);
    await AsyncStorage.setItem('doctor_memo_date', now);
    setMemoDate(now);
    setMemoEditing(false);
    setMemoSaving(false);
    Alert.alert('저장 완료 📋', '의사 메모가 저장되었습니다.');
  };

  const deleteMemo = () => {
    Alert.alert('메모 삭제', '의사 메모를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('doctor_memo');
          await AsyncStorage.removeItem('doctor_memo_date');
          setMemo(''); setMemoDate(''); setMemoEditing(false);
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={['#F0F4FF', '#E8EEF8', '#DDE6F5']} style={s.root}>
      {/* ── 상단 바 ── */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <Text style={s.topTitle}>📋 내 기록</Text>
        <Text style={s.topSub}>저장된 정보를 확인하고 수정하세요</Text>
      </View>

      {/* ── 탭 ── */}
      <View style={s.tabBar}>
        {([['med', '💊 약 목록'], ['hospital', '🏥 병원 예약'], ['memo', '📝 의사 메모']] as [TabKey, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, tab === key && s.tabBtnOn]}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabTxt, tab === key && s.tabTxtOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 약 목록 탭 ── */}
      {tab === 'med' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          {meds.length === 0 ? (
            <EmptyBox icon="💊" title="저장된 약이 없어요" sub={'약관리 탭에서 약을 추가하면\n여기에 표시됩니다'} />
          ) : (
            meds.map(med => (
              <View key={med.id} style={s.card}>
                {editMed?.id === med.id ? (
                  /* 수정 모드 */
                  <View style={s.editBox}>
                    <Text style={s.editLabel}>약 이름</Text>
                    <TextInput style={s.editInput} value={editMed.name}
                      onChangeText={v => setEditMed({ ...editMed, name: v })} />
                    <Text style={s.editLabel}>용량</Text>
                    <TextInput style={s.editInput} value={editMed.dosage}
                      onChangeText={v => setEditMed({ ...editMed, dosage: v })}
                      placeholder="예: 1정" placeholderTextColor="#B0BEC5" />
                    <Text style={s.editLabel}>복용 시간</Text>
                    <View style={s.slotRow}>
                      {Object.entries(TIME_SLOT_LABEL).map(([k, v]) => (
                        <TouchableOpacity
                          key={k}
                          style={[s.slotBtn, editMed.timeSlot === k && s.slotBtnOn]}
                          onPress={() => setEditMed({ ...editMed, timeSlot: k })}
                        >
                          <Text style={[s.slotTxt, editMed.timeSlot === k && s.slotTxtOn]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.editBtnRow}>
                      <TouchableOpacity style={s.editSaveBtn} onPress={saveMed} disabled={medSaving}>
                        {medSaving
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.editSaveBtnTxt}>저장</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={s.editCancelBtn} onPress={() => setEditMed(null)}>
                        <Text style={s.editCancelBtnTxt}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* 조회 모드 */
                  <View>
                    <View style={s.medHeader}>
                      <Text style={s.medName}>{med.name}</Text>
                      <View style={s.medSlotBadge}>
                        <Text style={s.medSlotTxt}>{TIME_SLOT_LABEL[med.timeSlot] || med.timeSlot}</Text>
                      </View>
                    </View>
                    {med.dosage ? <Text style={s.medDosage}>💊 {med.dosage}</Text> : null}
                    {med.method ? <Text style={s.medMethod}>📌 {med.method}</Text> : null}
                    {med.stock  ? <Text style={s.medStock}>📦 재고: {med.stock}정</Text> : null}
                    <View style={s.medBtnRow}>
                      <TouchableOpacity style={s.medEditBtn} onPress={() => setEditMed({ ...med })}>
                        <Text style={s.medEditBtnTxt}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.medDelBtn} onPress={() => deleteMed(med.id)}>
                        <Text style={s.medDelBtnTxt}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
          <TouchableOpacity
            style={s.goBtn}
            onPress={() => navigation.navigate('Medication', { userId, name: uname })}
          >
            <Text style={s.goBtnTxt}>+ 약관리에서 추가하기</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── 병원 예약 탭 ── */}
      {tab === 'hospital' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          {savedHosp && !hospEditing ? (
            /* 저장된 일정 표시 */
            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: RED }]}>
              <Text style={s.hospSavedTitle}>📅 예약된 병원 일정</Text>
              <Text style={s.hospSavedDate}>{savedHosp.date}</Text>
              <Text style={s.hospSavedTime}>
                {(() => { const [hh, mm] = savedHosp.time.split(':').map(Number); return fmtTime(hh, mm); })()}
              </Text>
              <Text style={s.hospSavedClinic}>🏥 {savedHosp.clinic}</Text>
              <Text style={s.hospSavedNote}>🔔 전날 저녁 7시 · 당일 4시간 전 알림</Text>
              <View style={s.medBtnRow}>
                <TouchableOpacity style={s.medEditBtn} onPress={() => setHospEditing(true)}>
                  <Text style={s.medEditBtnTxt}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.medDelBtn} onPress={deleteHospital}>
                  <Text style={s.medDelBtnTxt}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* 입력/수정 폼 */
            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: RED }]}>
              <Text style={s.cardTitle}>🏥 병원 예약 {hospEditing ? '수정' : '등록'}</Text>
              <Text style={s.fieldLabel}>날짜 (예: 2026-05-15)</Text>
              <TextInput style={s.fieldInput} value={hospDate} onChangeText={setHospDate}
                placeholder="2026-05-15" placeholderTextColor="#B0BEC5"
                autoComplete="off" autoCorrect={false} maxLength={10} />
              <Text style={s.fieldLabel}>시간 (예: 14:30)</Text>
              <TextInput style={s.fieldInput} value={hospTime} onChangeText={setHospTime}
                placeholder="14:30" placeholderTextColor="#B0BEC5"
                keyboardType="numbers-and-punctuation" maxLength={5} />
              <Text style={s.fieldLabel}>병원명</Text>
              <TextInput style={s.fieldInput} value={hospClinic} onChangeText={setHospClinic}
                placeholder="서울내과" placeholderTextColor="#B0BEC5" autoComplete="off" />
              <View style={s.medBtnRow}>
                <TouchableOpacity
                  style={[s.editSaveBtn, { backgroundColor: RED }]}
                  onPress={saveHospital} disabled={hospSaving}
                >
                  {hospSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.editSaveBtnTxt}>💾 저장</Text>}
                </TouchableOpacity>
                {hospEditing && (
                  <TouchableOpacity style={s.editCancelBtn} onPress={() => setHospEditing(false)}>
                    <Text style={s.editCancelBtnTxt}>취소</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── 의사 메모 탭 ── */}
      {tab === 'memo' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          {memo && !memoEditing ? (
            /* 저장된 메모 표시 */
            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: PURPLE }]}>
              <Text style={s.memoSavedTitle}>📝 의사 전달 메모</Text>
              {memoDate ? <Text style={s.memoDate}>저장일: {memoDate}</Text> : null}
              <Text style={s.memoContent}>{memo}</Text>
              <View style={s.medBtnRow}>
                <TouchableOpacity style={s.medEditBtn} onPress={() => setMemoEditing(true)}>
                  <Text style={s.medEditBtnTxt}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.medDelBtn} onPress={deleteMemo}>
                  <Text style={s.medDelBtnTxt}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* 입력/수정 폼 */
            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: PURPLE }]}>
              <Text style={s.cardTitle}>📝 의사 전달 메모 {memoEditing ? '수정' : '작성'}</Text>
              <Text style={s.fieldHint}>병원 방문 시 의사에게 전달할 내용을 적어주세요</Text>
              <TextInput
                style={s.memoInput}
                value={memo}
                onChangeText={setMemo}
                multiline
                numberOfLines={8}
                placeholder={'예) 최근 두통이 심합니다.\n혈압약 부작용이 있는 것 같습니다.'}
                placeholderTextColor="#B0BEC5"
                textAlignVertical="top"
              />
              <View style={s.medBtnRow}>
                <TouchableOpacity
                  style={[s.editSaveBtn, { backgroundColor: PURPLE }]}
                  onPress={saveMemo} disabled={memoSaving}
                >
                  {memoSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.editSaveBtnTxt}>💾 저장</Text>}
                </TouchableOpacity>
                {memoEditing && (
                  <TouchableOpacity style={s.editCancelBtn} onPress={() => setMemoEditing(false)}>
                    <Text style={s.editCancelBtnTxt}>취소</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <SeniorTabBar activeTab="records" userId={userId} name={uname} navigation={navigation} />
    </LinearGradient>
  );
}

function EmptyBox({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={s.emptyBox}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1 },

  topBar:  { paddingHorizontal: 20, paddingBottom: 10 },
  topTitle:{ fontSize: 26, fontWeight: '900', color: '#1A2C4E' },
  topSub:  { fontSize: 13, color: '#607D8B', fontWeight: '600', marginTop: 2 },

  tabBar:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)',
              borderBottomWidth: 1, borderBottomColor: '#D0D8E8' },
  tabBtn:   { flex: 1, paddingVertical: 14, alignItems: 'center',
              borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: BLUE },
  tabTxt:   { fontSize: 15, fontWeight: '700', color: '#90A4AE' },
  tabTxtOn: { color: BLUE, fontWeight: '900' },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },

  card:      { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
               shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: BLUE, marginBottom: 12 },

  /* 약 목록 */
  medHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  medName:      { fontSize: 22, fontWeight: '900', color: '#1A2C4E', flex: 1 },
  medSlotBadge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  medSlotTxt:   { fontSize: 14, color: GREEN, fontWeight: '700' },
  medDosage:    { fontSize: 18, color: '#546E7A', marginBottom: 4 },
  medMethod:    { fontSize: 18, color: '#546E7A', marginBottom: 4 },
  medStock:     { fontSize: 18, color: '#546E7A', marginBottom: 10 },
  medBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 14 },
  medEditBtn:   { flex: 1, backgroundColor: '#EBF3FB', borderRadius: 12,
                  paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: BLUE },
  medEditBtnTxt:{ fontSize: 18, fontWeight: '800', color: BLUE },
  medDelBtn:    { flex: 1, backgroundColor: '#FFEBEE', borderRadius: 12,
                  paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E53935' },
  medDelBtnTxt: { fontSize: 18, fontWeight: '800', color: RED },

  /* 수정 폼 */
  editBox:        { gap: 4 },
  editLabel:      { fontSize: 17, fontWeight: '700', color: '#546E7A', marginTop: 12, marginBottom: 4 },
  editInput:      { fontSize: 22, fontWeight: '700', color: BLUE,
                    borderBottomWidth: 2, borderBottomColor: BLUE, paddingVertical: 6 },
  slotRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slotBtn:        { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                    backgroundColor: '#F4F7FC', borderWidth: 1.5, borderColor: '#E0E0E0' },
  slotBtnOn:      { backgroundColor: '#EBF3FB', borderColor: BLUE },
  slotTxt:        { fontSize: 16, fontWeight: '700', color: '#78909C' },
  slotTxtOn:      { color: BLUE },
  editBtnRow:     { flexDirection: 'row', gap: 10, marginTop: 18 },
  editSaveBtn:    { flex: 1, backgroundColor: BLUE, borderRadius: 14,
                    paddingVertical: 16, alignItems: 'center' },
  editSaveBtnTxt: { fontSize: 19, fontWeight: '900', color: '#fff' },
  editCancelBtn:  { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 14,
                    paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0' },
  editCancelBtnTxt: { fontSize: 19, fontWeight: '700', color: '#546E7A' },

  /* 병원 예약 */
  hospSavedTitle:  { fontSize: 18, fontWeight: '800', color: RED, marginBottom: 10 },
  hospSavedDate:   { fontSize: 28, fontWeight: '900', color: '#B71C1C' },
  hospSavedTime:   { fontSize: 24, fontWeight: '800', color: '#B71C1C', marginBottom: 6 },
  hospSavedClinic: { fontSize: 22, fontWeight: '700', color: '#1A2C4E', marginBottom: 6 },
  hospSavedNote:   { fontSize: 14, color: '#E53935', fontWeight: '600' },
  fieldLabel:      { fontSize: 17, fontWeight: '700', color: '#546E7A', marginTop: 14, marginBottom: 4 },
  fieldInput:      { fontSize: 22, fontWeight: '700', color: BLUE,
                     borderBottomWidth: 2, borderBottomColor: BLUE, paddingVertical: 6 },
  fieldHint:       { fontSize: 15, color: '#90A4AE', marginBottom: 12 },

  /* 의사 메모 */
  memoSavedTitle:{ fontSize: 18, fontWeight: '800', color: PURPLE, marginBottom: 6 },
  memoDate:      { fontSize: 15, color: '#90A4AE', marginBottom: 10 },
  memoContent:   { fontSize: 20, color: '#1A2C4E', lineHeight: 32, marginBottom: 10 },
  memoInput:     { fontSize: 20, color: '#1A2C4E', lineHeight: 30,
                   borderWidth: 1.5, borderColor: '#C0C0C0', borderRadius: 12,
                   padding: 14, minHeight: 180, marginBottom: 10, backgroundColor: '#FAFAFA' },

  goBtn:    { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', marginTop: 8 },
  goBtnTxt: { fontSize: 19, fontWeight: '800', color: '#fff' },

  emptyBox:  { alignItems: 'center', paddingVertical: 60, gap: 14 },
  emptyIcon: { fontSize: 64 },
  emptyTitle:{ fontSize: 24, fontWeight: '800', color: '#2C2C2C' },
  emptySub:  { fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 },
});
