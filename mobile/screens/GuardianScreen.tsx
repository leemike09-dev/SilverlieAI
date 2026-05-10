import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SeniorTabBar from '../components/SeniorTabBar';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type DoctorMemoItem = {
  id: string;
  createdAt: string;
  memo: string;
  opinion: string;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시`;
}

function GuardianScreenInner({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || '';
  const name   = route?.params?.name   || '어르신';
  const isMountedRef = useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  const [hospSchedule,  setHospSchedule]  = useState<any>(null);
  const [doctorMemos,   setDoctorMemos]   = useState<DoctorMemoItem[]>([]);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [lastSentDate,  setLastSentDate]  = useState<string | null>(null);
  const [autoSentToday, setAutoSentToday] = useState(false);
  const [lumiReport,    setLumiReport]    = useState<any>(null);
  const [showLumi,      setShowLumi]      = useState(false);
  const [showHospForm,  setShowHospForm]  = useState(false);
  const [hospDate,      setHospDate]      = useState('');
  const [hospName,      setHospName]      = useState('');
  const [hospDept,      setHospDept]      = useState('');
  const [hospTime,      setHospTime]      = useState('');
  const [hospNote,      setHospNote]      = useState('');

  // ref for safe AsyncStorage save in closures
  const doctorMemosRef = useRef<DoctorMemoItem[]>([]);
  useEffect(() => { doctorMemosRef.current = doctorMemos; }, [doctorMemos]);

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

      // 다중 메모 로드 (기존 단일 메모 마이그레이션 포함)
      const memosRaw = await AsyncStorage.getItem('doctor_memos');
      let memos: DoctorMemoItem[] = memosRaw ? JSON.parse(memosRaw) : [];

      if (memos.length === 0) {
        const oldMemo = await AsyncStorage.getItem('doctor_memo');
        if (oldMemo) {
          const oldDate = await AsyncStorage.getItem('doctor_memo_date') || new Date().toISOString();
          const cleaned = oldMemo.replace(/■ 최근 건강 수치[\s\S]*?(?=\n■|\n\*|$)/g, '').replace(/\n{3,}/g, '\n\n').trim();
          const oldOpinion = await AsyncStorage.getItem('doctor_opinion') || '';
          memos = [{ id: oldDate, createdAt: oldDate, memo: cleaned, opinion: oldOpinion }];
          await AsyncStorage.setItem('doctor_memos', JSON.stringify(memos));
          await AsyncStorage.removeItem('doctor_memo');
          await AsyncStorage.removeItem('doctor_memo_date');
          await AsyncStorage.removeItem('doctor_opinion');
        }
      }

      setDoctorMemos(memos);

      const fm = await AsyncStorage.getItem('family_members');
      setFamilyMembers(fm ? JSON.parse(fm) : []);

      const lastSent = await AsyncStorage.getItem('guardian_last_sent');
      setLastSentDate(lastSent);

      const lr = await AsyncStorage.getItem('lumi_weekly_cache');
      if (lr) setLumiReport(JSON.parse(lr));

    } catch {}
  }, [userId]);

  useFocusEffect(useCallback(() => { loadData().catch(() => {}); }, [loadData]));

  useEffect(() => {
    if (autoSentToday || familyMembers.length === 0 || !lastSentDate) return;
    const now = Date.now();
    const last = new Date(lastSentDate).getTime();
    if (now - last >= SEVEN_DAYS_MS) {
      setAutoSentToday(true);
      handleShare(true).catch(() => {});
    }
  }, [familyMembers, lastSentDate]);

  const updateMemoOpinion = (id: string, text: string) => {
    const updated = doctorMemos.map(m => m.id === id ? { ...m, opinion: text } : m);
    setDoctorMemos(updated);
  };

  const saveMemosToStorage = async () => {
    await AsyncStorage.setItem('doctor_memos', JSON.stringify(doctorMemosRef.current));
  };

  const deleteMemo = (id: string) => {
    Alert.alert('메모 삭제', '이 메모를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          const updated = doctorMemosRef.current.filter(m => m.id !== id);
          setDoctorMemos(updated);
          await AsyncStorage.setItem('doctor_memos', JSON.stringify(updated));
          if (expandedId === id) setExpandedId(null);
        },
      },
    ]);
  };

  const buildSummaryText = () => {
    const today = new Date().toLocaleDateString('ko-KR');
    const lines: string[] = [
      `📋 Silver Life — ${name}님 건강 요약`,
      `📅 ${today}`,
      '',
    ];

    if (hospSchedule) {
      lines.push('🏥 병원 예약');
      lines.push(`  ${hospSchedule.date || ''} ${hospSchedule.hospital || ''} ${hospSchedule.department || ''}`);
      lines.push('');
    }

    const latestOpinion = doctorMemos[0]?.opinion;
    if (latestOpinion) {
      lines.push('📝 의사 소견 (최신)');
      lines.push(`  ${latestOpinion}`);
      lines.push('');
    }

    lines.push('— Silver Life AI 루미가 전달드립니다 —');
    return lines.join('\n');
  };

  const handleShare = async (isAuto = false) => {
    try {
      const text = buildSummaryText();
      await Share.share({ message: text, title: `${name}님 건강 요약` });
      if (!isMountedRef.current) return;
      const now = new Date().toISOString();
      await AsyncStorage.setItem('guardian_last_sent', now);
      setLastSentDate(now);
      if (isAuto) {
        Alert.alert('자동 발송', '7일이 지나 가족에게 건강 요약을 전달했습니다.');
      }
    } catch {}
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: Math.max(insets.top + 16, 24) }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      >

        {/* 의사 전달 메모 목록 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📋 의사 전달 메모</Text>

          {doctorMemos.length === 0 ? (
            <Text style={s.emptyTxt}>루미와 대화 후 메모를 저장하면 여기에 표시됩니다</Text>
          ) : (
            doctorMemos.map((item, index) => (
              <View key={item.id} style={[s.memoItem, index > 0 && { marginTop: 10 }]}>
                <TouchableOpacity
                  style={s.memoHeader}
                  onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  activeOpacity={0.7}
                >
                  <View style={s.memoHeaderLeft}>
                    <Text style={s.memoNum}>메모 {index + 1}</Text>
                    <Text style={s.memoDate}>{fmtDateTime(item.createdAt)}</Text>
                  </View>
                  <View style={s.memoHeaderRight}>
                    <TouchableOpacity
                      onPress={() => deleteMemo(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={s.memoDelete}>삭제</Text>
                    </TouchableOpacity>
                    <Text style={s.toggleTxt}>{expandedId === item.id ? '접기 ▲' : '펼치기 ▼'}</Text>
                  </View>
                </TouchableOpacity>

                {expandedId === item.id && (
                  <View style={s.memoBody}>
                    <Text style={s.memoSectionLabel}>📋 루미 메모</Text>
                    <View style={s.memoAiBox}>
                      <Text style={s.memoAiTxt}>{item.memo}</Text>
                    </View>
                    <Text style={[s.memoSectionLabel, { marginTop: 12 }]}>📝 의사 소견</Text>
                    <TextInput
                      style={s.memoInput}
                      value={item.opinion}
                      onChangeText={text => updateMemoOpinion(item.id, text)}
                      onBlur={saveMemosToStorage}
                      placeholder="진료 후 의사 소견이나 처방 내용을 기록해 두세요"
                      placeholderTextColor="#bdbdbd"
                      multiline
                    />
                  </View>
                )}
              </View>
            ))
          )}

          {/* 루미 7일 건강 분석 참고 */}
          {lumiReport && (
            <>
              <View style={[s.divider, { marginTop: 16 }]} />
              <TouchableOpacity
                style={s.lumiRefHeader}
                onPress={() => setShowLumi(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={s.lumiRefTitle}>💡 루미 7일 건강 분석 참고</Text>
                <Text style={s.toggleTxt}>{showLumi ? '접기 ▲' : '펼치기 ▼'}</Text>
              </TouchableOpacity>
              {showLumi && (
                <View style={s.lumiRefBody}>
                  {lumiReport.summary && (
                    <Text style={s.lumiRefTxt}>📋 {lumiReport.summary}</Text>
                  )}
                  {lumiReport.recommendation && (
                    <Text style={[s.lumiRefTxt, { color: '#1a5fbc', marginTop: 6 }]}>
                      🎯 {lumiReport.recommendation}
                    </Text>
                  )}
                  {lumiReport.improvements?.length > 0 && lumiReport.improvements.map((imp: string, i: number) => (
                    <Text key={i} style={[s.lumiRefTxt, { color: '#E65100', marginTop: 4 }]}>• {imp}</Text>
                  ))}
                </View>
              )}
            </>
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

  // 메모 아이템
  memoItem:        { borderWidth: 1, borderColor: '#E8E8F0', borderRadius: 12, overflow: 'hidden' },
  memoHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     backgroundColor: '#F3F0FA', paddingHorizontal: 14, paddingVertical: 12 },
  memoHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  memoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memoNum:         { fontSize: 14, fontWeight: '800', color: '#7B5EA7' },
  memoDate:        { fontSize: 13, color: '#6b7280' },
  memoDelete:      { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  toggleTxt:       { fontSize: 12, color: '#90a4ae' },

  memoBody:         { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  memoSectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  memoAiBox:        { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 10 },
  memoAiTxt:        { fontSize: 13, color: '#374151', lineHeight: 20 },
  memoInput:        { fontSize: 14, color: '#374151', lineHeight: 22, minHeight: 60,
                      backgroundColor: '#F8F9FA', borderRadius: 8, padding: 10,
                      textAlignVertical: 'top', borderWidth: 1, borderColor: '#E8E8E8' },

  divider:       { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },
  lumiRefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lumiRefTitle:  { fontSize: 13, fontWeight: '700', color: '#7B5EA7' },
  lumiRefBody:   { marginTop: 10, gap: 2 },
  lumiRefTxt:    { fontSize: 13, color: '#374151', lineHeight: 20 },

  hospForm:    { gap: 8 },
  hospInput:   { backgroundColor: '#F8F9FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                 fontSize: 15, color: '#1a2a3a', borderWidth: 1, borderColor: '#E8E8E8' },
  hospSaveBtn: { backgroundColor: '#1a5fbc', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  hospSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  hospRow:  { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  hospDate: { fontSize: 15, fontWeight: '700', color: '#1a5fbc', minWidth: 60 },
  hospInfo: { flex: 1 },
  hospName: { fontSize: 16, fontWeight: '700', color: '#1a2a3a' },
  hospDept: { fontSize: 14, color: '#5c6bc0', marginTop: 2 },
  hospNote: { fontSize: 13, color: '#90a4ae', marginTop: 4 },

  linkTxt:  { fontSize: 15, color: '#1a5fbc', fontWeight: '600' },
  emptyTxt: { fontSize: 14, color: '#bdbdbd' },

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

class GuardianScreen extends React.Component<any, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1a2a3a', textAlign: 'center' }}>
            화면을 불러오지 못했습니다{'\n'}잠시 후 다시 시도해 주세요
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#1a5fbc', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 }}
            onPress={() => { this.setState({ hasError: false }); this.props.navigation?.goBack(); }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>홈으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <GuardianScreenInner {...this.props} />;
  }
}

export default GuardianScreen;
