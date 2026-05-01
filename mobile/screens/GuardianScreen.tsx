import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Alert, Platform,
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

  const loadData = useCallback(async () => {
    const hs = await AsyncStorage.getItem('hospital_schedule');
    if (hs) setHospSchedule(JSON.parse(hs));

    const dm = await AsyncStorage.getItem('doctor_memo');
    setDoctorMemo(dm || '');

    const fm = await AsyncStorage.getItem('family_members');
    setFamilyMembers(fm ? JSON.parse(fm) : []);

    const lastSent = await AsyncStorage.getItem('guardian_last_sent');
    setLastSentDate(lastSent);

    if (userId) {
      fetch(`${API_URL}/health/history/${userId}?days=1`)
        .then(r => r.json())
        .then(d => { if (d.records?.length > 0) setHealthRecord(d.records[0]); })
        .catch(() => {});
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // 7일 자동 발송 체크
  useEffect(() => {
    if (autoSentToday || familyMembers.length === 0) return;
    const now = Date.now();
    const last = lastSentDate ? new Date(lastSentDate).getTime() : 0;
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
    <View style={s.root}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <Text style={s.headerTitle}>👨‍👩‍👧 보호자</Text>
        <Text style={s.headerSub}>{name}님의 건강 현황</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 건강 수치 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🩺 최근 건강 수치</Text>
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
          <Text style={s.cardTitle}>🏥 병원 예약</Text>
          {hospSchedule ? (
            <View style={s.hospRow}>
              <Text style={s.hospDate}>{hospSchedule.date}</Text>
              <View style={s.hospInfo}>
                <Text style={s.hospName}>{hospSchedule.hospital}</Text>
                {hospSchedule.department ? <Text style={s.hospDept}>{hospSchedule.department}</Text> : null}
                {hospSchedule.note ? <Text style={s.hospNote}>{hospSchedule.note}</Text> : null}
              </View>
            </View>
          ) : (
            <Text style={s.emptyTxt}>예약된 병원 일정이 없습니다</Text>
          )}
        </View>

        {/* 의사 메모 */}
        {doctorMemo ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>📝 의사 메모</Text>
            <Text style={s.memoTxt}>{doctorMemo}</Text>
          </View>
        ) : null}

        {/* 동선 */}
        <TouchableOpacity
          style={s.card}
          onPress={() => navigation.navigate('LocationMap', { logs: [], seniorName: name, totalDist: 0 })}
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

        {/* 마지막 발송 */}
        {lastSentDate && (
          <Text style={s.lastSentTxt}>
            마지막 발송: {fmtDate(lastSentDate)}
          </Text>
        )}

        {/* 발송 버튼 */}
        <TouchableOpacity style={s.shareBtn} onPress={() => handleShare(false)} activeOpacity={0.85}>
          <Text style={s.shareBtnTxt}>📤 가족에게 전달하기</Text>
          <Text style={s.shareBtnSub}>카카오톡 · 문자 · 앱 알림</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F0F2F7' },
  header:  { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a2a3a' },
  headerSub:   { fontSize: 15, color: '#90a4ae', marginTop: 2 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a2a3a', marginBottom: 12 },

  gridRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox:  { backgroundColor: '#f0f4ff', borderRadius: 12, padding: 12, minWidth: 90, alignItems: 'center' },
  statVal:  { fontSize: 18, fontWeight: '800', color: '#1a5fbc' },
  statLbl:  { fontSize: 12, color: '#90a4ae', marginTop: 2 },

  hospRow:  { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  hospDate: { fontSize: 15, fontWeight: '700', color: '#1a5fbc', minWidth: 60 },
  hospInfo: { flex: 1 },
  hospName: { fontSize: 16, fontWeight: '700', color: '#1a2a3a' },
  hospDept: { fontSize: 14, color: '#5c6bc0', marginTop: 2 },
  hospNote: { fontSize: 13, color: '#90a4ae', marginTop: 4 },

  memoTxt:  { fontSize: 15, color: '#374151', lineHeight: 22 },
  linkTxt:  { fontSize: 15, color: '#1a5fbc', fontWeight: '600' },
  emptyTxt: { fontSize: 14, color: '#bdbdbd' },

  memberRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  memberName:     { fontSize: 15, fontWeight: '600', color: '#1a2a3a' },
  memberRelation: { fontSize: 14, color: '#90a4ae' },

  lastSentTxt: { textAlign: 'center', fontSize: 13, color: '#bdbdbd' },

  shareBtn:    { backgroundColor: '#1a5fbc', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4 },
  shareBtnTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  shareBtnSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
});
