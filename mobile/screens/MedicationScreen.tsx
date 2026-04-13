import React, { useState, useEffect, useRef } from 'react';
import { StatusBar,
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Platform, Alert, Animated,
} from 'react-native';
import { DEMO_MODE } from '../App';
import { scheduleMedicationNotifications, cancelMedicationNotifications, snoozeNotification } from '../utils/notifications';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';
const C = {
  blue1:   '#1A4A8A',
  blue2:   '#2272B8',
  blueCard:'#EBF3FB',
  bg:      '#F0F5FB',
  card:    '#FFFFFF',
  sage:    '#3DAB7B',
  sageLt:  '#E6F7EF',
  sageDk:  '#2A8A5E',
  peach:   '#F4956A',
  peachLt: '#FEF0E8',
  amber:   '#E8960A',
  amberLt: '#FEF6E0',
  sky:     '#2272B8',
  skyLt:   '#EBF3FB',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#DDE8F4',
};

const TIMES  = ['아침 (08:00)', '점심 (12:00)', '저녁 (19:00)', '자기 전 (21:00)'];
const TKEYS  = ['08:00', '12:00', '19:00', '21:00'];
const TLABEL: Record<string,string> = { '08:00':'🌅 아침', '12:00':'☀️ 점심', '19:00':'🌆 저녁', '21:00':'🌙 자기 전' };
const COLORS = ['#e57373','#64b5f6','#81c784','#ffb74d','#ba68c8','#4dd0e1'];

const DEMO_MEDS: any[] = [];

type LogStatus = 'taken' | 'skipped' | 'snoozed';

export default function MedicationScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name   = route?.params?.name   || '';
  const today  = new Date().toISOString().split('T')[0];
  const [nowTime, setNowTime] = useState('');

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const days = ['일','월','화','수','목','금','토'];
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      const day = days[d.getDay()];
      const hh = String(d.getHours()).padStart(2,'0');
      const min = String(d.getMinutes()).padStart(2,'0');
      setNowTime(`${d.getFullYear()}.${mm}.${dd} (${day}) ${hh}:${min}`);
    };
    fmt();
    const timer = setInterval(fmt, 60000);
    return () => clearInterval(timer);
  }, []);

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
  const [selMedType,  setSelMedType]  = useState<'처방약' | '영양제'>('처방약');
  const [memo,        setMemo]        = useState('');
  const [memoSaved,   setMemoSaved]   = useState(false);
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
      if (!DEMO_MODE) {
        fetchTakenCounts(medList);
        scheduleMedicationNotifications(medList);
      }
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

  const handleSnooze = (med: any) => {
    Alert.alert('⏰ 30분 후 알림', `${med.name} 복용 알림을 30분 후로 미룰까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: async () => {
        await snoozeNotification(med.name, med.med_type || '처방약');
        Alert.alert('알림 설정', '30분 후에 알려드릴게요! 📲');
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
            total_quantity: qty, med_type: selMedType,
          }),
        });
        await fetchAll();
      } else {
        setMeds(p => [...p, {
          id: Date.now().toString(), name: medName, dosage,
          times: selTimes, color: selColor, total_quantity: qty, med_type: selMedType,
        }]);
      }
      setModal(false); setMedName(''); setDosage('1정');
      setSelTimes(['08:00']); setSelColor(COLORS[0]); setTotalQty(''); setSelMedType('처방약');
      Alert.alert('✅ 등록 완료', '약이 등록되었습니다.');
    } finally { setSaving(false); }
  };

  const deleteMed = (med: any) => Alert.alert('약 삭제', `${med.name}을(를) 삭제할까요?`, [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: async () => {
      if (!DEMO_MODE) {
        await fetch(`${API}/medications/${med.id}`, { method: 'DELETE' });
        await cancelMedicationNotifications(med.id);
      }
      setMeds(p => p.filter(m => m.id !== med.id));
    }},
  ]);

  const saveMemo = () => {
    if (!memo.trim()) return;
    setMemoSaved(true);
    setTimeout(() => setMemoSaved(false), 2000);
    // 실제 앱: DB 저장
  };

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

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.headerDate}>{nowTime}</Text>
          <Text style={s.headerTitle}>내 약 💊</Text>
          {/* 진행 바 */}
          {total > 0 && (
            <View style={s.progWrap}>
              <View style={[s.progFill, { width: `${pct}%` as any }]} />
            </View>
          )}
          {/* 3개 요약 카드 */}
          {total > 0 && (
            <View style={s.summaryRow}>
              <View style={[s.summaryCard, { borderTopColor: C.sage }]}>
                <Text style={s.summaryNum}>{takenToday}</Text>
                <Text style={s.summaryLabel}>✅ 완료</Text>
              </View>
              <View style={[s.summaryCard, { borderTopColor: C.amber }]}>
                <Text style={s.summaryNum}>{total - takenToday}</Text>
                <Text style={s.summaryLabel}>💊 남은 약</Text>
              </View>
              <View style={[s.summaryCard, { borderTopColor: C.blue2 }]}>
                <Text style={s.summaryNum}>{pct}%</Text>
                <Text style={s.summaryLabel}>📊 달성률</Text>
              </View>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[s.medName, (done || skipped) && s.strikethrough]}>{med.name}</Text>
                              <Text style={[s.medTypeBadge, med.med_type === '영양제' && s.medTypeBadgeGreen]}>
                                {med.med_type === '영양제' ? '🌿 영양제' : '💊 처방약'}
                              </Text>
                            </View>
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
                            onPress={() => handleSnooze(med)} activeOpacity={0.8}>
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

          {/* ─── 건강 메모 ─── */}
          <View style={s.memoCard}>
            <View style={s.memoHeader}>
              <Text style={s.memoTitle}>📝 오늘의 건강 메모</Text>
              <Text style={s.memoDate}>{today}</Text>
            </View>
            <TextInput
              style={s.memoInput}
              value={memo}
              onChangeText={t => { setMemo(t); setMemoSaved(false); }}
              placeholder={"오늘 몸 상태, 식사, 운동 등 자유롭게 기록하세요\n예) 오전에 두통이 있었어요. 점심은 가볍게 먹었어요."}
              placeholderTextColor={C.sub}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[s.memoSaveBtn, !memo.trim() && { opacity: 0.4 }]}
              onPress={saveMemo}
              disabled={!memo.trim()}
              activeOpacity={0.8}>
              <Text style={s.memoSaveTxt}>{memoSaved ? '✓ 저장됐어요!' : '메모 저장'}</Text>
            </TouchableOpacity>
          </View>

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
              <Text style={s.sheetTitle}>새 약 / 영양제 추가</Text>

              <Text style={s.label}>종류</Text>
              <View style={s.chipRow}>
                <TouchableOpacity
                  style={[s.chip, selMedType === '처방약' && s.chipOn]}
                  onPress={() => setSelMedType('처방약')}>
                  <Text style={[s.chipTxt, selMedType === '처방약' && s.chipTxtOn]}>💊 처방약</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.chip, selMedType === '영양제' && s.chipOn]}
                  onPress={() => setSelMedType('영양제')}>
                  <Text style={[s.chipTxt, selMedType === '영양제' && s.chipTxtOn]}>🌿 영양제</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.qtyHint, { marginBottom: 8 }]}>{selMedType === '처방약' ? '처방약은 미복용 시 가족에게 알림이 갑니다' : '영양제는 본인에게만 알림이 옵니다'}</Text>

              <Text style={s.label}>이름</Text>
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
      <SeniorTabBar navigation={navigation} activeTab="med" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 22 : (StatusBar.currentHeight ?? 28) + 10,
    paddingBottom: 18,
    ...(Platform.OS === 'web'
      ? { background: 'linear-gradient(135deg, #1A4A8A 0%, #2272B8 100%)' } as any
      : { backgroundColor: '#1A4A8A' }),
  },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerDate:     { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 6, fontWeight: '600' },
  headerTitle:    { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub:      { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  headerBadge:    { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerBadgeTxt: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 24 },
  headerBadgeSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  progWrap:       { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginBottom: 12 },
  progFill:       { height: 6, backgroundColor: '#fff', borderRadius: 3 },

  summaryRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  summaryCard:   { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14,
                   paddingVertical: 10, alignItems: 'center', borderTopWidth: 3 },
  summaryNum:    { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 30 },
  summaryLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },

  group:      { marginBottom: 24 },
  groupTitle: { fontSize: 16, fontWeight: '700', color: C.sub, marginBottom: 10, marginLeft: 2 },

  medCard:        { backgroundColor: C.card, borderRadius: 18, marginBottom: 10, overflow: 'hidden',
                    shadowColor:'#B8A898', shadowOpacity:0.12, shadowRadius:8, elevation:2 },
  medCardDone:    { opacity: 0.65 },
  medCardSkipped: { opacity: 0.5 },

  medInfoRow: { flexDirection: 'row', alignItems: 'center' },
  colorStripe:{ width: 5, alignSelf: 'stretch' },
  medNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 },
  medName:    { fontSize: 21, fontWeight: '800', color: C.text },
  medTypeBadge: { fontSize: 12, fontWeight: '700', color: '#2272B8',
                  backgroundColor: '#EBF3FB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  medTypeBadgeGreen: { color: '#2e7d32', backgroundColor: '#E8F5E9' },
  strikethrough: { textDecorationLine: 'line-through', color: '#BABABA' },
  medDosage:  { fontSize: 14, color: C.sub },

  // 잔여량 배지
  remBadge:    { backgroundColor: C.skyLt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  remBadgeTxt: { fontSize: 13, fontWeight: '700', color: C.sky },

  statusIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#E0D8D0',
                alignItems: 'center', justifyContent: 'center', marginRight: 14 },

  // 액션 버튼 3개
  actionRow:   { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 0 },
  btnTake:     { flex: 2, backgroundColor: C.sageLt, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnTakeTxt:  { fontSize: 15, fontWeight: '700', color: C.sageDk },
  btnSnooze:   { flex: 1.5, backgroundColor: C.amberLt, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnSnoozeTxt:{ fontSize: 14, fontWeight: '700', color: C.amber },
  btnSkip:     { flex: 1.5, backgroundColor: C.line, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnSkipTxt:  { fontSize: 14, fontWeight: '600', color: C.sub },

  undoRow: { paddingHorizontal: 14, paddingBottom: 10 },
  undoTxt: { fontSize: 14, color: C.sub, textDecorationLine: 'underline', textAlign: 'right' },

  empty:      { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.sub, marginBottom: 8 },
  emptySub:   { fontSize: 16, color: '#BABABA' },

  addBtn:    { backgroundColor: C.blue2, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 6 },
  addBtnTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
  hint:      { textAlign: 'center', color: '#C8C0B8', fontSize: 14, marginTop: 10 },

  // 건강 메모
  memoCard:     { backgroundColor: C.card, borderRadius: 18, padding: 18, marginTop: 6, marginBottom: 10,
                  shadowColor:'#B8A898', shadowOpacity:0.10, shadowRadius:8, elevation:2 },
  memoHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  memoTitle:    { fontSize: 17, fontWeight: '700', color: C.text },
  memoDate:     { fontSize: 13, color: C.sub },
  memoInput:    { backgroundColor: C.bg, borderRadius: 14, padding: 14, fontSize: 15, color: C.text,
                  borderWidth: 1, borderColor: C.line, minHeight: 100 },
  memoSaveBtn:  { marginTop: 12, backgroundColor: C.blueCard, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  memoSaveTxt:  { fontSize: 15, fontWeight: '700', color: C.blue1 },

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
  chipOn:       { backgroundColor: C.blueCard, borderColor: C.blue2 },
  chipTxt:      { fontSize: 12, fontWeight: '600', color: C.sub },
  chipTxtOn:    { color: C.blue2 },
  colorRow:     { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot:     { width: 34, height: 34, borderRadius: 17 },
  colorDotOn:   { borderWidth: 3, borderColor: C.text },
  sheetBtns:    { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn:    { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: C.line, alignItems: 'center' },
  cancelTxt:    { fontSize: 16, fontWeight: '700', color: C.sub },
  saveBtn:      { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: C.blue2, alignItems: 'center' },
  saveTxt:      { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 탭바
  tabbar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, paddingBottom: 14 },
  tab:    { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon:{ fontSize: 22, opacity: 0.3 },
  tabLbl: { fontSize: 10, color: '#BABABA', fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.sage },
});
