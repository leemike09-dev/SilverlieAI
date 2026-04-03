import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, StatusBar, Platform, Alert, Animated,
} from 'react-native';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';
const C = {
  bg:      '#FDFAF6',
  card:    '#FFFFFF',
  sage:    '#6BAE8F',
  sageLt:  '#EAF5EF',
  sageDk:  '#4A8C6E',
  peach:   '#F4956A',
  peachLt: '#FEF0E8',
  amber:   '#F5A623',
  amberLt: '#FEF6E7',
  sky:     '#6BA8C8',
  skyLt:   '#E8F4FB',
  text:    '#2C2C2C',
  sub:     '#8A8A8A',
  line:    '#F0EDE8',
};

const TIMES  = ['아침 (08:00)', '점심 (12:00)', '저녁 (19:00)', '자기 전 (21:00)'];
const TKEYS  = ['08:00', '12:00', '19:00', '21:00'];
const TLABEL: Record<string,string> = { '08:00':'🌅 아침', '12:00':'☀️ 점심', '19:00':'🌆 저녁', '21:00':'🌙 자기 전' };
const COLORS = ['#e57373','#64b5f6','#81c784','#ffb74d','#ba68c8','#4dd0e1'];

const DEMO_MEDS = [
  { id:'1', name:'혈압약',  dosage:'1정', times:['08:00','20:00'], color:'#e57373', total_quantity: 60 },
  { id:'2', name:'당뇨약',  dosage:'1정', times:['08:00','12:00'], color:'#64b5f6', total_quantity: 90 },
  { id:'3', name:'관절약',  dosage:'2정', times:['12:00'],         color:'#81c784', total_quantity: null },
];

type LogStatus = 'taken' | 'skipped' | 'snoozed';

export default function MedicationScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || '';
  const today  = new Date().toISOString().split('T')[0];

  const [meds,        setMeds]        = useState<any[]>([]);
  const [logs,        setLogs]        = useState<any[]>([]);
  const [takenCounts, setTakenCounts] = useState<Record<string, number>>({});
  const [modal,       setModal]       = useState(false);
  const [medName,     setMedName]     = useState('');
  const [dosage,      setDosage]      = useState('1정');
  const [selTimes,    setSelTimes]    = useState<string[]>(['08:00']);
  const [selColor,    setSelColor]    = useState(COLORS[0]);
  const [totalQty,    setTotalQty]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [mr, lr] = await Promise.all([
        fetch(`${API}/medications/${userId}`),
        fetch(`${API}/medications/log/${userId}/${today}`),
      ]);
      const md = await mr.json();
      const ld = await lr.json();
      const medList = Array.isArray(md) ? md : DEMO_MODE ? DEMO_MEDS : [];
      setMeds(medList);
      setLogs(Array.isArray(ld) ? ld : []);
      // 전체 복용 횟수 (잔여량 계산)
      if (!DEMO_MODE) fetchTakenCounts(medList);
      else {
        // 데모: 혈압약 18회, 당뇨약 32회 복용한 것으로 가정
        setTakenCounts({ '1': 18, '2': 32, '3': 0 });
      }
    } catch {
      if (DEMO_MODE) {
        setMeds(DEMO_MEDS);
        setTakenCounts({ '1': 18, '2': 32, '3': 0 });
      }
    }
  };

  const fetchTakenCounts = async (medList: any[]) => {
    const counts: Record<string, number> = {};
    await Promise.all(medList.map(async (m: any) => {
      try {
        const r = await fetch(`${API}/medications/taken-count/${userId}/${m.id}`);
        const d = await r.json();
        counts[m.id] = d.count || 0;
      } catch { counts[m.id] = 0; }
    }));
    setTakenCounts(counts);
  };

  const getLogStatus = (id: string, t: string): LogStatus | null => {
    const log = logs.find(l => l.medication_id === id && l.scheduled_time === t);
    if (!log) return null;
    return (log.status as LogStatus) || (log.taken ? 'taken' : null);
  };

  const isTaken   = (id: string, t: string) => getLogStatus(id, t) === 'taken';
  const isSkipped = (id: string, t: string) => getLogStatus(id, t) === 'skipped';

  const saveLog = async (med: any, time: string, status: LogStatus) => {
    const taken = status === 'taken';
    setLogs(prev => [
      ...prev.filter(l => !(l.medication_id === med.id && l.scheduled_time === time)),
      { medication_id: med.id, scheduled_time: time, taken, status },
    ]);
    if (!DEMO_MODE) {
      try {
        await fetch(`${API}/medications/log`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, medication_id: med.id, medication_name: med.name,
            scheduled_time: time, date: today, taken, status,
          }),
        });
      } catch { fetchAll(); }
    }
  };

  const handleSnooze = (med: any, time: string) => {
    Alert.alert('⏰ 30분 후 알림', `${med.name} 복용 알림을 30분 후로 미룰까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: () => {
        Alert.alert('알림 설정', '30분 후에 알려드릴게요! 📲');
        // 실제 앱에서는 expo-notifications로 스케줄링
      }},
    ]);
  };

  // 잔여량 계산
  const getRemaining = (med: any): { qty: number; days: number } | null => {
    if (!med.total_quantity) return null;
    const taken = takenCounts[med.id] || 0;
    const remaining = med.total_quantity - taken;
    const dosesPerDay = (med.times || []).length;
    const days = dosesPerDay > 0 ? Math.floor(remaining / dosesPerDay) : 0;
    return { qty: Math.max(0, remaining), days: Math.max(0, days) };
  };

  const addMed = async () => {
    if (!medName.trim()) return;
    setSaving(true);
    const qty = totalQty ? parseInt(totalQty) : null;
    try {
      if (!DEMO_MODE) {
        await fetch(`${API}/medications/add`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, name: medName, dosage,
            times: selTimes, color: selColor,
            total_quantity: qty,
          }),
        });
        fetchAll();
      } else {
        setMeds(p => [...p, {
          id: Date.now().toString(), name: medName, dosage,
          times: selTimes, color: selColor, total_quantity: qty,
        }]);
      }
      setModal(false); setMedName(''); setDosage('1정');
      setSelTimes(['08:00']); setSelColor(COLORS[0]); setTotalQty('');
    } finally { setSaving(false); }
  };

  const deleteMed = (med: any) => Alert.alert('약 삭제', `${med.name}을(를) 삭제할까요?`, [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: async () => {
      if (!DEMO_MODE) await fetch(`${API}/medications/${med.id}`, { method: 'DELETE' });
      setMeds(p => p.filter(m => m.id !== med.id));
    }},
  ]);

  const grouped: Record<string, any[]> = {};
  meds.forEach(m => (m.times || []).forEach((t: string) => {
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(m);
  }));
  const sortedTimes = Object.keys(grouped).sort();

  const total = meds.reduce((s, m) => s + (m.times?.length || 0), 0);
  const takenToday = logs.filter(l => l.taken).length;
  const pct = total > 0 ? Math.round((takenToday / total) * 100) : 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.sageDk} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* 헤더 */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>내 약 💊</Text>
              <Text style={s.headerSub}>
                {total > 0 ? `오늘 ${total}번 중 ${takenToday}번 복용` : '약을 등록해 주세요'}
              </Text>
            </View>
            {total > 0 && (
              <View style={s.headerBadge}>
                <Text style={s.headerBadgeTxt}>{pct}%</Text>
                <Text style={s.headerBadgeSub}>완료</Text>
              </View>
            )}
          </View>
          {/* 진행 바 */}
          {total > 0 && (
            <View style={s.progWrap}>
              <View style={[s.progFill, { width: `${pct}%` as any }]} />
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

          {meds.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>💊</Text>
              <Text style={s.emptyTitle}>등록된 약이 없어요</Text>
              <Text style={s.emptySub}>아래 버튼으로 약을 추가해보세요</Text>
            </View>
          ) : (
            sortedTimes.map(time => (
              <View key={time} style={s.group}>
                <Text style={s.groupTitle}>{TLABEL[time] || time}</Text>
                {grouped[time].map(med => {
                  const status = getLogStatus(med.id, time);
                  const done    = status === 'taken';
                  const skipped = status === 'skipped';
                  const rem = getRemaining(med);

                  return (
                    <View key={med.id + time}
                      style={[s.medCard, done && s.medCardDone, skipped && s.medCardSkipped]}>

                      {/* 약 정보 행 */}
                      <TouchableOpacity
                        style={s.medInfoRow}
                        onLongPress={() => deleteMed(med)}
                        activeOpacity={0.7}>
                        <View style={[s.colorStripe, { backgroundColor: med.color }]} />
                        <View style={{ flex: 1, paddingVertical: 14, paddingLeft: 14 }}>
                          <View style={s.medNameRow}>
                            <Text style={[s.medName, (done || skipped) && s.strikethrough]}>{med.name}</Text>
                            {/* 잔여량 배지 */}
                            {rem && (
                              <View style={[s.remBadge, rem.days <= 7 && { backgroundColor: C.peachLt }]}>
                                <Text style={[s.remBadgeTxt, rem.days <= 7 && { color: C.peach }]}>
                                  {rem.qty}정 남음 {rem.days > 0 ? `(${rem.days}일치)` : '⚠️'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.medDosage}>{med.dosage} · {time}</Text>
                        </View>
                        {/* 상태 아이콘 */}
                        <View style={[
                          s.statusIcon,
                          done    && { backgroundColor: C.sage,  borderColor: C.sage  },
                          skipped && { backgroundColor: C.line,  borderColor: C.line  },
                        ]}>
                          <Text style={{ fontSize: 16 }}>
                            {done ? '✓' : skipped ? '⏭' : '·'}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* 액션 버튼 (미복용/미건너뛰기 상태에서만) */}
                      {!done && !skipped && (
                        <View style={s.actionRow}>
                          <TouchableOpacity style={s.btnTake}
                            onPress={() => saveLog(med, time, 'taken')} activeOpacity={0.8}>
                            <Text style={s.btnTakeTxt}>✅ 복용 완료</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.btnSnooze}
                            onPress={() => handleSnooze(med, time)} activeOpacity={0.8}>
                            <Text style={s.btnSnoozeTxt}>⏰ 30분 후</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.btnSkip}
                            onPress={() => saveLog(med, time, 'skipped')} activeOpacity={0.8}>
                            <Text style={s.btnSkipTxt}>⏭ 건너뛰기</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* 복용 취소 버튼 (복용 완료 상태에서) */}
                      {done && (
                        <TouchableOpacity style={s.undoRow}
                          onPress={() => saveLog(med, time, 'skipped')} activeOpacity={0.7}>
                          <Text style={s.undoTxt}>복용 취소하기</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          )}

          <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)} activeOpacity={0.88}>
            <Text style={s.addBtnTxt}>+ 약 추가하기</Text>
          </TouchableOpacity>
          <Text style={s.hint}>약 이름을 길게 누르면 삭제됩니다</Text>
        </ScrollView>
      </Animated.View>

      {/* 약 추가 모달 */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView>
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>새 약 추가</Text>

              <Text style={s.label}>약 이름</Text>
              <TextInput style={s.input} value={medName} onChangeText={setMedName}
                placeholder="예: 혈압약, 아모디핀" placeholderTextColor="#C8C0B8" />

              <Text style={s.label}>용량</Text>
              <TextInput style={s.input} value={dosage} onChangeText={setDosage}
                placeholder="예: 1정, 2캡슐" placeholderTextColor="#C8C0B8" />

              <Text style={s.label}>총 수량 (선택)</Text>
              <View style={s.qtyRow}>
                <TextInput style={[s.input, { flex: 1 }]}
                  value={totalQty} onChangeText={t => setTotalQty(t.replace(/[^0-9]/g, ''))}
                  placeholder="예: 60" placeholderTextColor="#C8C0B8"
                  keyboardType="number-pad" />
                <Text style={s.qtyUnit}>정/캡슐</Text>
              </View>
              <Text style={s.qtyHint}>입력하면 잔여량이 자동으로 계산됩니다</Text>

              <Text style={s.label}>복용 시간</Text>
              <View style={s.chipRow}>
                {TIMES.map((lbl, i) => (
                  <TouchableOpacity key={i}
                    style={[s.chip, selTimes.includes(TKEYS[i]) && s.chipOn]}
                    onPress={() => setSelTimes(p =>
                      p.includes(TKEYS[i]) ? p.filter(t => t !== TKEYS[i]) : [...p, TKEYS[i]])}>
                    <Text style={[s.chipTxt, selTimes.includes(TKEYS[i]) && s.chipTxtOn]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>색상</Text>
              <View style={s.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity key={c}
                    style={[s.colorDot, { backgroundColor: c }, selColor === c && s.colorDotOn]}
                    onPress={() => setSelColor(c)} />
                ))}
              </View>

              <View style={s.sheetBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={s.cancelTxt}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, !medName && { opacity: 0.4 }]}
                  onPress={addMed} disabled={!medName || saving}>
                  <Text style={s.saveTxt}>{saving ? '저장 중...' : '저장'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 탭바 */}
      <View style={s.tabbar}>
        {[
          { icon:'🌿', lbl:'오늘',    screen:'SeniorHome', active:false },
          { icon:'💊', lbl:'내 약',   screen:'',           active:true  },
          { icon:'💬', lbl:'AI 상담', screen:'AIChat',     active:false },
          { icon:'🌸', lbl:'내 정보', screen:'Settings',   active:false },
        ].map(tab => (
          <TouchableOpacity key={tab.lbl} style={s.tab}
            onPress={() => tab.screen && navigation.navigate(tab.screen, { userId, name })}
            activeOpacity={0.7}>
            <Text style={[s.tabIcon, tab.active && { opacity: 1 }]}>{tab.icon}</Text>
            <Text style={[s.tabLbl, tab.active && { color: C.sage, fontWeight: '700' }]}>{tab.lbl}</Text>
            {tab.active && <View style={s.tabDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.sage,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 22 : (StatusBar.currentHeight ?? 28) + 10,
    paddingBottom: 18,
  },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub:      { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  headerBadge:    { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerBadgeTxt: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 22 },
  headerBadgeSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  progWrap:       { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  progFill:       { height: 6, backgroundColor: '#fff', borderRadius: 3 },

  group:      { marginBottom: 24 },
  groupTitle: { fontSize: 15, fontWeight: '700', color: C.sub, marginBottom: 10, marginLeft: 2 },

  medCard:        { backgroundColor: C.card, borderRadius: 18, marginBottom: 10, overflow: 'hidden',
                    shadowColor:'#B8A898', shadowOpacity:0.12, shadowRadius:8, elevation:2 },
  medCardDone:    { opacity: 0.65 },
  medCardSkipped: { opacity: 0.5 },

  medInfoRow: { flexDirection: 'row', alignItems: 'center' },
  colorStripe:{ width: 5, alignSelf: 'stretch' },
  medNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 },
  medName:    { fontSize: 17, fontWeight: '700', color: C.text },
  strikethrough: { textDecorationLine: 'line-through', color: '#BABABA' },
  medDosage:  { fontSize: 12, color: C.sub },

  // 잔여량 배지
  remBadge:    { backgroundColor: C.skyLt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  remBadgeTxt: { fontSize: 11, fontWeight: '700', color: C.sky },

  statusIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#E0D8D0',
                alignItems: 'center', justifyContent: 'center', marginRight: 14 },

  // 액션 버튼 3개
  actionRow:   { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 0 },
  btnTake:     { flex: 2, backgroundColor: C.sageLt, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnTakeTxt:  { fontSize: 13, fontWeight: '700', color: C.sageDk },
  btnSnooze:   { flex: 1.5, backgroundColor: C.amberLt, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnSnoozeTxt:{ fontSize: 12, fontWeight: '700', color: C.amber },
  btnSkip:     { flex: 1.5, backgroundColor: C.line, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnSkipTxt:  { fontSize: 12, fontWeight: '600', color: C.sub },

  undoRow: { paddingHorizontal: 14, paddingBottom: 10 },
  undoTxt: { fontSize: 12, color: C.sub, textDecorationLine: 'underline', textAlign: 'right' },

  empty:      { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.sub, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: '#BABABA' },

  addBtn:    { backgroundColor: C.peach, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 6 },
  addBtnTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
  hint:      { textAlign: 'center', color: '#C8C0B8', fontSize: 12, marginTop: 10 },

  // 모달
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 50 },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:   { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 20, textAlign: 'center' },
  label:        { fontSize: 13, fontWeight: '700', color: C.sub, marginTop: 16, marginBottom: 8 },
  input:        { backgroundColor: C.bg, borderRadius: 14, padding: 15, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.line },
  qtyRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyUnit:      { fontSize: 15, color: C.text, fontWeight: '600' },
  qtyHint:      { fontSize: 11, color: C.sub, marginTop: 4 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 2, borderColor: C.line },
  chipOn:       { backgroundColor: C.sageLt, borderColor: C.sage },
  chipTxt:      { fontSize: 12, fontWeight: '600', color: C.sub },
  chipTxtOn:    { color: C.sage },
  colorRow:     { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot:     { width: 34, height: 34, borderRadius: 17 },
  colorDotOn:   { borderWidth: 3, borderColor: C.text },
  sheetBtns:    { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn:    { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: C.line, alignItems: 'center' },
  cancelTxt:    { fontSize: 16, fontWeight: '700', color: C.sub },
  saveBtn:      { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: C.sage, alignItems: 'center' },
  saveTxt:      { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 탭바
  tabbar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, paddingBottom: 14 },
  tab:    { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon:{ fontSize: 22, opacity: 0.3 },
  tabLbl: { fontSize: 10, color: '#BABABA', fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.sage },
});
