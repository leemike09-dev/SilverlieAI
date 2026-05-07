import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SeniorTabBar from '../components/SeniorTabBar';

const API_URL = 'https://silverlieai.onrender.com';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function GuardianScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || '';
  const name   = route?.params?.name   || '어르신';

  const [hospSchedule,   setHospSchedule]   = useState<any>(null);
  const [doctorMemo,     setDoctorMemo]     = useState('');
  const [healthRecord,   setHealthRecord]   = useState<any>(null);
  const [familyMembers,  setFamilyMembers]  = useState<any[]>([]);
  const [lastSentDate,   setLastSentDate]   = useState<string | null>(null);
  const [autoSentToday,  setAutoSentToday]  = useState(false);
  const [hospitalMemo,   setHospitalMemo]   = useState('');
  const [showHospForm,   setShowHospForm]   = useState(false);
  const [hospDate,       setHospDate]       = useState('');
  const [hospName,       setHospName]       = useState('');
  const [hospDept,       setHospDept]       = useState('');
  const [hospTime,       setHospTime]       = useState('');
  const [hospNote,       setHospNote]       = useState('');

  const saveHospSchedule = async () => {
    if (!hospName.trim() || !hospDate.trim()) {
      Alert.alert('알림', '날짜와 병원명을 입력해 주세요.'); return;
    }
    const sched = { date: hospDate.trim(), hospital: hospName.trim(), department: hospDept.trim(), time: hospTime.trim(), note: hospNote.trim() };
    await AsyncStorage.setItem('hospital_schedule', JSON.stringify(sched));
    setHospSchedule(sched);
    setShowHospForm(false);
    setHospDate(''); setHospName(''); setHospDept(''); setHospTime(''); setHospNote('');
  };

  const loadData = useCallback(async () => {
    try {
      const hs = await AsyncStorage.getItem('hospital_schedule');
      if (hs) setHospSchedule(JSON.parse(hs));
    } catch {}

    const dm = await AsyncStorage.getItem('doctor_memo');
    setDoctorMemo(dm || '');

    try {
      const fm = await AsyncStorage.getItem('family_members');
      setFamilyMembers(fm ? JSON.parse(fm) : []);
    } catch { setFamilyMembers([]); }

    const lastSent = await AsyncStorage.getItem('guardian_last_sent');
    setLastSentDate(lastSent);

    const hm = await AsyncStorage.getItem('hospital_memo');
    setHospitalMemo(hm || '');

    // AsyncStorage에서 최신 건강 기록 로드 (항상 사용 가능)
    try {
      const stored = await AsyncStorage.getItem('health_records');
      if (stored) {
        const records: any[] = JSON.parse(stored);
        if (records.length > 0) {
          const latest = records[0]; // 최신순 저장
          setHealthRecord({
            blood_pressure_systolic:  latest.bp?.sys  ?? null,
            blood_pressure_diastolic: latest.bp?.dia  ?? null,
            blood_sugar:              latest.glucose?.val ?? null,
            steps:                    latest.steps   ?? null,
            sleep_hours:              latest.sleep?.hours ?? null,
            date:                     latest.date,
          });
        }
      }
    } catch {}

    // API에서도 시도 (더 최신 데이터가 있을 수 있음)
    if (userId) {
      fetch(`${API_URL}/health/history/${userId}?days=1`)
        .then(r => r.json())
        .then(d => {
          if (d.records?.length > 0) {
            const r = d.records[0];
            if (r.blood_pressure_systolic || r.blood_sugar || r.steps) {
              setHealthRecord(r);
            }
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // 7일 자동 발송 체크 (한 번도 안 보낸 경우 자동발송 제외)
  useEffect(() => {
    if (autoSentToday || familyMembers.length === 0 || !lastSentDate) return;
    const now = Date.now();
    const last = new Date(lastSentDate).getTime();
    if (now - last >= SEVEN_DAYS_MS) {
      setAutoSentToday(true);
      handleShare(true);
    }
  }, [familyMembers, lastSentDate]);

  const buildSummaryText = () => {
    const today = new Date().toLocaleDateString('ko-KR');
    const lines: string[] = [
      `📋 Silver Life — ${name}님 건강 요약`,
      `📅 ${today}`,
      '',
    ];

    if (healthRecord) {
      lines.push('🩺 최근 건강 수치');
      if (healthRecord.blood_pressure_systolic && healthRecord.blood_pressure_diastolic)
        lines.push(`  혈압: ${healthRecord.blood_pressure_systolic}/${healthRecord.blood_pressure_diastolic} mmHg`);
      if (healthRecord.blood_sugar)
        lines.push(`  혈당: ${healthRecord.blood_sugar} mg/dL`);
      if (healthRecord.heart_rate)
        lines.push(`  심박수: ${healthRecord.heart_rate} bpm`);
      if (healthRecord.weight)
        lines.push(`  체중: ${healthRecord.weight} kg`);
      if (healthRecord.steps)
        lines.push(`  걸음수: ${healthRecord.steps.toLocaleString()} 보`);
      lines.push('');
    }

    if (hospSchedule) {
      lines.push('🏥 병원 예약');
      lines.push(`  ${hospSchedule.date || ''} ${hospSchedule.hospital || ''} ${hospSchedule.department || ''}`);
      lines.push('');
    }

    if (doctorMemo) {
      lines.push('📝 의사 메모');
      lines.push(`  ${doctorMemo}`);
      lines.push('');
    }

    lines.push('— Silver Life AI 루미가 전달드립니다 —');
    return lines.join('\n');
  };

  const handleShare = async (isAuto = false) => {
    const text = buildSummaryText();
    try {
      await Share.share({ message: text, title: `${name}님 건강 요약` });
      const now = new Date().toISOString();
      await AsyncStorage.setItem('guardian_last_sent', now);
      setLastSentDate(now);
      if (isAuto) {
        Alert.alert('자동 발송', '7일이 지나 가족에게 건강 요약을 전달했습니다.');
      }
    } catch (_) {}
  };

  const r = healthRecord;
  const hasHealth = r && (r.blood_pressure_systolic || r.blood_sugar || r.steps);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: Math.max(insets.top + 16, 24) }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      >

        {/* 건강 수치 */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>🩺 최근 건강 수치</Text>
            {healthRecord?.date && <Text style={s.editSmall}>{healthRecord.date}</Text>}
          </View>
          {hasHealth ? (
            <View style={s.gridRow}>
              {r.blood_pressure_systolic && r.blood_pressure_diastolic && (
                <View style={s.statBox}>
                  <Text style={s.statVal}>{r.blood_pressure_systolic}/{r.blood_pressure_diastolic}</Text>
                  <Text style={s.statLbl}>혈압 mmHg</Text>
                </View>
              )}
              {r.blood_sugar && (
                <View style={s.statBox}>
                  <Text style={s.statVal}>{r.blood_sugar}</Text>
                  <Text style={s.statLbl}>혈당 mg/dL</Text>
                </View>
              )}
              {r.heart_rate && (
                <View style={s.statBox}>
                  <Text style={s.statVal}>{r.heart_rate}</Text>
                  <Text style={s.statLbl}>심박수 bpm</Text>
                </View>
              )}
              {r.weight && (
                <View style={s.statBox}>
                  <Text style={s.statVal}>{r.weight}</Text>
                  <Text style={s.statLbl}>체중 kg</Text>
                </View>
              )}
              {r.steps && (
                <View style={s.statBox}>
                  <Text style={s.statVal}>{r.steps.toLocaleString()}</Text>
                  <Text style={s.statLbl}>걸음수</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={s.emptyTxt}>오늘 기록된 건강 수치가 없습니다</Text>
          )}
        </View>

        {/* 병원 예약 */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>🏥 병원 예약</Text>
            <TouchableOpacity onPress={() => setShowHospForm(v => !v)} activeOpacity={0.7}>
              <Text style={s.editSmall}>{showHospForm ? '취소' : hospSchedule ? '수정' : '+ 추가'}</Text>
            </TouchableOpacity>
          </View>

          {showHospForm ? (
            <View style={s.hospForm}>
              <TextInput style={s.hospInput} value={hospDate} onChangeText={setHospDate}
                placeholder="날짜 (예: 2025-06-10)" placeholderTextColor="#bdbdbd" />
              <TextInput style={s.hospInput} value={hospTime} onChangeText={setHospTime}
                placeholder="시간 (예: 오전 10:30)" placeholderTextColor="#bdbdbd" />
              <TextInput style={s.hospInput} value={hospName} onChangeText={setHospName}
                placeholder="병원명 (예: 서울성모병원)" placeholderTextColor="#bdbdbd" />
              <TextInput style={s.hospInput} value={hospDept} onChangeText={setHospDept}
                placeholder="진료과 (예: 내과)" placeholderTextColor="#bdbdbd" />
              <TextInput style={s.hospInput} value={hospNote} onChangeText={setHospNote}
                placeholder="메모 (선택)" placeholderTextColor="#bdbdbd" />
              <TouchableOpacity style={s.hospSaveBtn} onPress={saveHospSchedule} activeOpacity={0.85}>
                <Text style={s.hospSaveTxt}>저장</Text>
              </TouchableOpacity>
            </View>
          ) : hospSchedule ? (
            <View style={s.hospRow}>
              <Text style={s.hospDate}>{hospSchedule.date}{hospSchedule.time ? ` ${hospSchedule.time}` : ''}</Text>
              <View style={s.hospInfo}>
                <Text style={s.hospName}>{hospSchedule.hospital}</Text>
                {hospSchedule.department ? <Text style={s.hospDept}>{hospSchedule.department}</Text> : null}
                {hospSchedule.note ? <Text style={s.hospNote}>{hospSchedule.note}</Text> : null}
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowHospForm(true)} activeOpacity={0.7}>
              <Text style={s.emptyTxt}>병원 예약을 추가해 주세요 →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 의사 메모 */}
        {doctorMemo ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>📝 의사 메모</Text>
            <Text style={s.memoTxt}>{doctorMemo}</Text>
          </View>
        ) : null}

        {/* 병원 메모 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🏥 병원 메모</Text>
          <TextInput
            style={s.memoInput}
            value={hospitalMemo}
            onChangeText={setHospitalMemo}
            onBlur={() => AsyncStorage.setItem('hospital_memo', hospitalMemo)}
            placeholder="병원 방문 시 참고할 메모를 적어두세요"
            placeholderTextColor="#bdbdbd"
            multiline
          />
        </View>

        {/* 동선 */}
        <TouchableOpacity
          style={s.card}
          onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0, userId })}
          activeOpacity={0.85}
        >
          <Text style={s.cardTitle}>📍 오늘 동선</Text>
          <Text style={s.linkTxt}>지도에서 확인하기 →</Text>
        </TouchableOpacity>

        {/* 가족 구성원 */}
        {familyMembers.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>👥 가족 구성원</Text>
            {familyMembers.map((m: any, i: number) => (
              <View key={i} style={s.memberRow}>
                <Text style={s.memberName}>{m.name}</Text>
                <Text style={s.memberRelation}>{m.relation}</Text>
              </View>
            ))}
          </View>
        )}


        {/* 가족 전달 카드 */}
        <TouchableOpacity style={s.shareCard} onPress={() => handleShare(false)} activeOpacity={0.85}>
          <View style={s.shareCardTop}>
            <Text style={s.shareCardIcon}>📤</Text>
            <View>
              <Text style={s.shareCardTitle}>가족에게 전달하기</Text>
              <Text style={s.shareCardSub}>카카오톡 · 문자 · 앱 알림</Text>
            </View>
          </View>
          {lastSentDate && (
            <Text style={s.shareCardLast}>마지막 발송: {fmtDate(lastSentDate)}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#fff' },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 0 },

  card:       { backgroundColor: '#fff', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: '#1a2a3a', marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  editSmall:  { fontSize: 14, fontWeight: '700', color: '#1a5fbc' },

  hospForm:    { gap: 8 },
  hospInput:   { backgroundColor: '#F8F9FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                 fontSize: 15, color: '#1a2a3a', borderWidth: 1, borderColor: '#E8E8E8' },
  hospSaveBtn: { backgroundColor: '#1a5fbc', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  hospSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  gridRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox:  { backgroundColor: '#F3F6FF', borderRadius: 12, padding: 12, minWidth: 90, alignItems: 'center' },
  statVal:  { fontSize: 18, fontWeight: '800', color: '#1a5fbc' },
  statLbl:  { fontSize: 12, color: '#90a4ae', marginTop: 2 },

  hospRow:  { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  hospDate: { fontSize: 15, fontWeight: '700', color: '#1a5fbc', minWidth: 60 },
  hospInfo: { flex: 1 },
  hospName: { fontSize: 16, fontWeight: '700', color: '#1a2a3a' },
  hospDept: { fontSize: 14, color: '#5c6bc0', marginTop: 2 },
  hospNote: { fontSize: 13, color: '#90a4ae', marginTop: 4 },

  memoTxt:   { fontSize: 15, color: '#374151', lineHeight: 22 },
  memoInput: { fontSize: 15, color: '#374151', lineHeight: 22, minHeight: 70,
               backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12,
               textAlignVertical: 'top' },
  linkTxt:   { fontSize: 15, color: '#1a5fbc', fontWeight: '600' },
  emptyTxt:  { fontSize: 14, color: '#bdbdbd' },

  memberRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  memberName:     { fontSize: 15, fontWeight: '600', color: '#1a2a3a' },
  memberRelation: { fontSize: 14, color: '#90a4ae' },

  shareCard:     { backgroundColor: '#1a5fbc', borderRadius: 18, padding: 20, marginTop: 16 },
  shareCardTop:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  shareCardIcon: { fontSize: 32 },
  shareCardTitle:{ fontSize: 18, fontWeight: '800', color: '#fff' },
  shareCardSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  shareCardLast: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 12, textAlign: 'right' },
});
