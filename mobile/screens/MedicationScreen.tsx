import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, StatusBar, Platform, Alert,
} from 'react-native';
import { DEMO_MODE } from '../App';

const API    = 'https://silverlieai.onrender.com';
const GREEN  = '#3D8B6C';
const ORANGE = '#E8734A';
const CREAM  = '#FFF9F4';

const TIMES = ['아침 (08:00)', '점심 (12:00)', '저녁 (19:00)', '자기 전 (21:00)'];
const TIME_KEYS = ['08:00', '12:00', '19:00', '21:00'];
const COLORS = ['#e53935','#1976d2','#388e3c','#f57c00','#7b1fa2','#0097a7'];

const DEMO_MEDS = [
  { id: '1', name: '혈압약', dosage: '1정', times: ['08:00', '20:00'], color: '#e53935' },
  { id: '2', name: '당뇨약', dosage: '1정', times: ['08:00', '12:00'], color: '#1976d2' },
  { id: '3', name: '관절약', dosage: '2정', times: ['12:00'],          color: '#388e3c' },
];

export default function MedicationScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || '';
  const today  = new Date().toISOString().split('T')[0];

  const [meds,    setMeds]    = useState<any[]>([]);
  const [logs,    setLogs]    = useState<any[]>([]);
  const [modal,   setModal]   = useState(false);
  const [medName, setMedName] = useState('');
  const [dosage,  setDosage]  = useState('1정');
  const [selTimes, setSelTimes] = useState<string[]>(['08:00']);
  const [selColor, setSelColor] = useState(COLORS[0]);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [mr, lr] = await Promise.all([
        fetch(`${API}/medications/${userId}`),
        fetch(`${API}/medications/log/${userId}/${today}`),
      ]);
      const md = await mr.json();
      const ld = await lr.json();
      setMeds(Array.isArray(md) ? md : DEMO_MODE ? DEMO_MEDS : []);
      setLogs(Array.isArray(ld) ? ld : []);
    } catch {
      if (DEMO_MODE) setMeds(DEMO_MEDS);
    }
  };

  const isTaken = (medId: string, time: string) =>
    logs.some(l => l.medication_id === medId && l.scheduled_time === time && l.taken);

  const toggleTaken = async (med: any, time: string) => {
    const taken = !isTaken(med.id, time);
    // 낙관적 업데이트
    const newLog = { medication_id: med.id, medication_name: med.name, scheduled_time: time, date: today, taken };
    setLogs(prev => {
      const filtered = prev.filter(l => !(l.medication_id === med.id && l.scheduled_time === time));
      return [...filtered, newLog];
    });
    if (!DEMO_MODE) {
      try {
        await fetch(`${API}/medications/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, ...newLog }),
        });
      } catch { fetchAll(); }
    }
  };

  const addMed = async () => {
    if (!medName.trim()) return;
    setSaving(true);
    try {
      if (!DEMO_MODE) {
        await fetch(`${API}/medications/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, name: medName, dosage, times: selTimes, color: selColor }),
        });
      } else {
        setMeds(prev => [...prev, { id: Date.now().toString(), name: medName, dosage, times: selTimes, color: selColor }]);
      }
      setModal(false); setMedName(''); setDosage('1정'); setSelTimes(['08:00']); setSelColor(COLORS[0]);
      if (!DEMO_MODE) fetchAll();
    } finally { setSaving(false); }
  };

  const deleteMed = (med: any) => {
    Alert.alert('약 삭제', `${med.name}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        if (!DEMO_MODE) await fetch(`${API}/medications/${med.id}`, { method: 'DELETE' });
        setMeds(prev => prev.filter(m => m.id !== med.id));
      }},
    ]);
  };

  // 시간대별 그룹
  const grouped: Record<string, any[]> = {};
  meds.forEach(med => {
    (med.times || []).forEach((t: string) => {
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(med);
    });
  });
  const sortedTimes = Object.keys(grouped).sort();

  const totalDoses = meds.reduce((s, m) => s + (m.times?.length || 0), 0);
  const takenDoses = logs.filter(l => l.taken).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>💊 내 약 관리</Text>
        <Text style={s.headerSub}>
          {totalDoses > 0 ? `오늘 ${totalDoses}번 중 ${takenDoses}번 복용` : '약을 등록해 주세요'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {meds.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💊</Text>
            <Text style={s.emptyTxt}>등록된 약이 없어요</Text>
            <Text style={{ color: '#aaa', marginTop: 4 }}>아래 버튼으로 약을 추가해보세요</Text>
          </View>
        ) : (
          sortedTimes.map(time => {
            const label = TIME_KEYS.includes(time) ? TIMES[TIME_KEYS.indexOf(time)] : time;
            return (
              <View key={time} style={s.group}>
                <Text style={s.groupTitle}>{label}</Text>
                {grouped[time].map(med => {
                  const taken = isTaken(med.id, time);
                  return (
                    <TouchableOpacity key={med.id + time} style={[s.medRow, taken && s.medRowTaken]}
                      onPress={() => toggleTaken(med, time)} onLongPress={() => deleteMed(med)} activeOpacity={0.75}>
                      <View style={[s.colorBar, { backgroundColor: med.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.medName, taken && s.medNameTaken]}>{med.name}</Text>
                        <Text style={s.medDosage}>{med.dosage}</Text>
                      </View>
                      <View style={[s.checkCircle, taken && s.checkCircleOn]}>
                        <Text style={{ color: taken ? '#fff' : '#ccc', fontSize: 20 }}>{taken ? '✓' : '○'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}

        {/* 약 추가 버튼 */}
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)} activeOpacity={0.85}>
          <Text style={s.addBtnTxt}>+ 약 추가하기</Text>
        </TouchableOpacity>

        <Text style={s.hint}>💡 약 이름을 길게 누르면 삭제됩니다</Text>
      </ScrollView>

      {/* 약 추가 모달 */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>약 추가</Text>

            <Text style={s.fieldLabel}>약 이름</Text>
            <TextInput style={s.input} value={medName} onChangeText={setMedName}
              placeholder="예: 혈압약, 아모디핀" placeholderTextColor="#bbb" />

            <Text style={s.fieldLabel}>용량</Text>
            <TextInput style={s.input} value={dosage} onChangeText={setDosage}
              placeholder="예: 1정, 2캡슐" placeholderTextColor="#bbb" />

            <Text style={s.fieldLabel}>복용 시간 (복수 선택 가능)</Text>
            <View style={s.timeRow}>
              {TIMES.map((label, i) => (
                <TouchableOpacity key={i}
                  style={[s.timeChip, selTimes.includes(TIME_KEYS[i]) && s.timeChipOn]}
                  onPress={() => setSelTimes(prev =>
                    prev.includes(TIME_KEYS[i]) ? prev.filter(t => t !== TIME_KEYS[i]) : [...prev, TIME_KEYS[i]]
                  )}>
                  <Text style={[s.timeTxt, selTimes.includes(TIME_KEYS[i]) && s.timeTxtOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>색상</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorCircle, { backgroundColor: c }, selColor === c && s.colorCircleOn]}
                  onPress={() => setSelColor(c)} />
              ))}
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
                <Text style={s.cancelTxt}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, !medName && { opacity: 0.4 }]} onPress={addMed} disabled={!medName || saving}>
                <Text style={s.saveTxt}>{saving ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 하단 탭 */}
      <View style={s.tabbar}>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('SeniorHome', { userId, name })}>
          <Text style={s.tabIcon}>🏠</Text><Text style={s.tabLbl}>오늘</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => {}}>
          <Text style={[s.tabIcon, { opacity: 1 }]}>💊</Text>
          <Text style={[s.tabLbl, { color: GREEN, fontWeight: '700' }]}>내 약</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('AIChat', { userId, name })}>
          <Text style={s.tabIcon}>🤖</Text><Text style={s.tabLbl}>AI 상담</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('Settings', { userId, name })}>
          <Text style={s.tabIcon}>👤</Text><Text style={s.tabLbl}>내 정보</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: CREAM },
  header:        { backgroundColor: GREEN, paddingHorizontal: 20,
                   paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
                   paddingBottom: 20 },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub:     { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  group:         { marginBottom: 20 },
  groupTitle:    { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 8, marginLeft: 4 },
  medRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                   borderRadius: 16, marginBottom: 8, overflow: 'hidden',
                   shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  medRowTaken:   { opacity: 0.6 },
  colorBar:      { width: 6, alignSelf: 'stretch' },
  medName:       { fontSize: 17, fontWeight: '700', color: '#1a1a1a', padding: 16, paddingBottom: 4 },
  medNameTaken:  { textDecorationLine: 'line-through', color: '#aaa' },
  medDosage:     { fontSize: 13, color: '#888', paddingHorizontal: 16, paddingBottom: 14 },
  checkCircle:   { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#e0e0e0',
                   alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  checkCircleOn: { backgroundColor: GREEN, borderColor: GREEN },
  emptyBox:      { alignItems: 'center', paddingVertical: 60 },
  emptyTxt:      { fontSize: 18, fontWeight: '700', color: '#555' },
  addBtn:        { backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  addBtnTxt:     { fontSize: 17, fontWeight: '700', color: '#fff' },
  hint:          { textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 12 },
  // 모달
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 20, textAlign: 'center' },
  fieldLabel:    { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 6, marginTop: 14 },
  input:         { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 16, color: '#1a1a1a' },
  timeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#f0f0f0' },
  timeChipOn:    { backgroundColor: '#e8f5f0', borderColor: GREEN },
  timeTxt:       { fontSize: 12, fontWeight: '600', color: '#666' },
  timeTxtOn:     { color: GREEN },
  colorRow:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  colorCircle:   { width: 32, height: 32, borderRadius: 16 },
  colorCircleOn: { borderWidth: 3, borderColor: '#1a1a1a' },
  modalBtns:     { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn:     { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center' },
  cancelTxt:     { fontSize: 16, fontWeight: '700', color: '#666' },
  saveBtn:       { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center' },
  saveTxt:       { fontSize: 16, fontWeight: '700', color: '#fff' },
  // 탭바
  tabbar:        { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 8, paddingBottom: 12 },
  tab:           { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:       { fontSize: 22, opacity: 0.35 },
  tabLbl:        { fontSize: 10, color: '#b0bec5', fontWeight: '500' },
});
