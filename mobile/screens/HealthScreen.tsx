import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE    = '#1A4A8A';
const LBLUE   = '#EBF3FB';
const BG      = '#F4F7FC';
const GREEN   = '#2E7D32';
const LGREEN  = '#E8F5E9';
const RED     = '#C62828';
const LRED    = '#FFEBEE';
const ORANGE  = '#E65100';
const LORANGE = '#FFF3E0';

const STORAGE_KEY = 'health_records';
const GLUCOSE_TYPES = ['공복', '식전', '식후'];

// ── 정상 범위 판정 ──
const bpStatus = (sys: number, dia: number) => {
  if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) return 'normal';
  if (sys > 140 || dia > 90) return 'danger';
  return 'caution';
};
const glucoseStatus = (val: number, type: string) => {
  const range = type === '공복' ? [70, 100] : type === '식전' ? [70, 110] : [70, 140];
  if (val >= range[0] && val <= range[1]) return 'normal';
  if (val > range[1] * 1.2) return 'danger';
  return 'caution';
};
const tempStatus = (val: number) => {
  if (val >= 36.0 && val <= 37.2) return 'normal';
  if (val > 38.0) return 'danger';
  return 'caution';
};
const stepsStatus = (val: number) => {
  if (val >= 8000) return 'normal';
  if (val >= 5000) return 'caution';
  return 'danger';
};
const STATUS_LABEL: Record<string, string> = { normal: '정상', caution: '주의', danger: '위험' };
const STATUS_COLOR: Record<string, string> = { normal: GREEN, caution: ORANGE, danger: RED };
const STATUS_BG:    Record<string, string> = { normal: LGREEN, caution: LORANGE, danger: LRED };

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function HealthScreen({ navigation }: any) {
  const [userId, setUserId] = useState('');
  const [uname,  setUname]  = useState('');
  const [tab,    setTab]    = useState<'input' | 'history'>('input');

  // 오늘 입력값
  const [bpSys,  setBpSys]  = useState('');
  const [bpDia,  setBpDia]  = useState('');
  const [glucose,    setGlucose]    = useState('');
  const [glucoseType, setGlucoseType] = useState('공복');
  const [temp,   setTemp]   = useState('');
  const [weight, setWeight] = useState('');
  const [steps,  setSteps]  = useState('');
  const [stepsAuto,  setStepsAuto]  = useState(false);
  const [stepsLoading, setStepsLoading] = useState(false);

  // 기록
  const [records, setRecords] = useState<any[]>([]);
  const [saving,  setSaving]  = useState(false);

  // ── 초기화 ──
  useEffect(() => {
    const init = async () => {
      const uid  = (await AsyncStorage.getItem('userId'))   || '';
      const name = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUname(name);
      await loadRecords();
      tryPedometer();
    };
    init();
  }, []);

  // ── 만보기 자동 연동 (네이티브만) ──
  const tryPedometer = async () => {
    if (Platform.OS === 'web') return; // 웹 미지원
    try {
      const { Pedometer } = await import('expo-sensors');
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) return;
      const { status } = await Pedometer.isAvailableAsync();
      if (!status) return;
      setStepsLoading(true);
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(midnight, new Date());
      if (result?.steps != null) {
        setSteps(String(result.steps));
        setStepsAuto(true);
      }
    } catch {}
    setStepsLoading(false);
  };

  // ── 기록 불러오기 ──
  const loadRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setRecords(JSON.parse(stored));
    } catch {}
  };

  // ── 저장하기 ──
  const save = async () => {
    if (!bpSys && !bpDia && !glucose && !temp && !weight && !steps) {
      Alert.alert('입력 없음', '하나 이상의 수치를 입력해 주세요.');
      return;
    }
    setSaving(true);
    const record: any = {
      id:   Date.now().toString(),
      date: todayKey(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    if (bpSys || bpDia) record.bp = { sys: Number(bpSys) || 0, dia: Number(bpDia) || 0 };
    if (glucose)        record.glucose = { val: Number(glucose), type: glucoseType };
    if (temp)           record.temp   = Number(temp);
    if (weight)         record.weight = Number(weight);
    if (steps)          record.steps  = Number(steps);

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: any[] = stored ? JSON.parse(stored) : [];
      const updated = [record, ...existing].slice(0, 90); // 최대 90개
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecords(updated);
      Alert.alert('저장 완료', '건강 기록이 저장되었습니다.');
      setBpSys(''); setBpDia(''); setGlucose(''); setTemp(''); setWeight('');
      if (!stepsAuto) setSteps('');
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
    setSaving(false);
  };

  const stepsGoal = 8000;
  const stepsPct  = steps ? Math.min(Number(steps) / stepsGoal, 1) : 0;
  const PT = Platform.OS === 'ios' ? 54 : 32;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── 헤더 ── */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerTopRow}>
          <View>
            <Text style={s.headerTitle}>📊 건강 기록</Text>
            <Text style={s.headerSub}>오늘 수치를 입력해주세요</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn}
            onPress={() => navigation.navigate('Settings', { userId, name: uname })}>
            <Text style={s.settingsBtnTxt}>⚙️</Text>
          </TouchableOpacity>
        </View>
        {Platform.OS === 'web' ? (
          <View style={s.waveWrap}>
            {/* @ts-ignore */}
            <svg width="100%" height="20" viewBox="0 0 100 20"
              preserveAspectRatio="none"
              style={{ width: '100%', display: 'block', marginBottom: '-1px' }}>
              <path d="M0 20 Q25 0 50 12 Q75 24 100 5 L100 20 L0 20 Z" fill={BG} />
            </svg>
          </View>
        ) : (
          <View style={s.waveNative} />
        )}
      </View>

      {/* ── 탭 ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={tab === 'input' ? [s.tabBtn, s.tabBtnOn] : s.tabBtn}
          onPress={() => setTab('input')}
        >
          <Text style={tab === 'input' ? [s.tabTxt, s.tabTxtOn] : s.tabTxt}>오늘 입력</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tab === 'history' ? [s.tabBtn, s.tabBtnOn] : s.tabBtn}
          onPress={() => setTab('history')}
        >
          <Text style={tab === 'history' ? [s.tabTxt, s.tabTxtOn] : s.tabTxt}>기록 조회</Text>
        </TouchableOpacity>
      </View>

      {/* ── 오늘 입력 탭 ── */}
      {tab === 'input' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* 혈압 카드 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>💗 혈압</Text>
            <Text style={s.cardHint}>정상: 90~120 / 60~80 mmHg</Text>
            <View style={s.bpRow}>
              <View style={s.bpBox}>
                <Text style={s.bpLabel}>수축기</Text>
                <TextInput
                  style={s.bpInput}
                  value={bpSys}
                  onChangeText={setBpSys}
                  keyboardType="numeric"
                  placeholder="120"
                  placeholderTextColor="#B0BEC5"
                  maxLength={3}
                />
                <Text style={s.bpUnit}>mmHg</Text>
              </View>
              <Text style={s.bpSlash}>/</Text>
              <View style={s.bpBox}>
                <Text style={s.bpLabel}>이완기</Text>
                <TextInput
                  style={s.bpInput}
                  value={bpDia}
                  onChangeText={setBpDia}
                  keyboardType="numeric"
                  placeholder="80"
                  placeholderTextColor="#B0BEC5"
                  maxLength={3}
                />
                <Text style={s.bpUnit}>mmHg</Text>
              </View>
            </View>
            {bpSys && bpDia ? (() => {
              const st = bpStatus(Number(bpSys), Number(bpDia));
              return (
                <View style={[s.statusBadge, { backgroundColor: STATUS_BG[st] }]}>
                  <Text style={[s.statusTxt, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
                </View>
              );
            })() : null}
          </View>

          {/* 혈당 카드 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🩸 혈당</Text>
            <View style={s.glucoseTypeRow}>
              {GLUCOSE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={glucoseType === t ? [s.typeBtn, s.typeBtnOn] : s.typeBtn}
                  onPress={() => setGlucoseType(t)}
                >
                  <Text style={glucoseType === t ? [s.typeTxt, s.typeTxtOn] : s.typeTxt}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.bigInputRow}>
              <TextInput
                style={s.bigInput}
                value={glucose}
                onChangeText={setGlucose}
                keyboardType="numeric"
                placeholder="--"
                placeholderTextColor="#B0BEC5"
                maxLength={3}
              />
              <Text style={s.bigUnit}>mg/dL</Text>
            </View>
            {glucose ? (() => {
              const st = glucoseStatus(Number(glucose), glucoseType);
              return (
                <View style={[s.statusBadge, { backgroundColor: STATUS_BG[st] }]}>
                  <Text style={[s.statusTxt, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
                </View>
              );
            })() : null}
          </View>

          {/* 체온 / 체중 카드 */}
          <View style={s.rowCards}>
            <View style={[s.card, s.halfCard]}>
              <Text style={s.cardTitle}>🌡️ 체온</Text>
              <View style={s.midInputRow}>
                <TextInput
                  style={s.midInput}
                  value={temp}
                  onChangeText={setTemp}
                  keyboardType="decimal-pad"
                  placeholder="36.5"
                  placeholderTextColor="#B0BEC5"
                  maxLength={4}
                />
                <Text style={s.midUnit}>°C</Text>
              </View>
              {temp ? (() => {
                const st = tempStatus(Number(temp));
                return (
                  <View style={[s.statusBadgeSm, { backgroundColor: STATUS_BG[st] }]}>
                    <Text style={[s.statusTxtSm, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
                  </View>
                );
              })() : null}
            </View>

            <View style={[s.card, s.halfCard]}>
              <Text style={s.cardTitle}>⚖️ 체중</Text>
              <View style={s.midInputRow}>
                <TextInput
                  style={s.midInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="68.0"
                  placeholderTextColor="#B0BEC5"
                  maxLength={5}
                />
                <Text style={s.midUnit}>kg</Text>
              </View>
            </View>
          </View>

          {/* 걸음수 카드 */}
          <View style={s.card}>
            <View style={s.stepsHeader}>
              <Text style={s.cardTitle}>🚶 걸음수</Text>
              {stepsAuto && (
                <View style={s.autoBadge}>
                  <Text style={s.autoBadgeTxt}>자동 측정 중</Text>
                </View>
              )}
              {stepsLoading && <ActivityIndicator color={BLUE} size="small" />}
            </View>
            <View style={s.bigInputRow}>
              <TextInput
                style={s.bigInput}
                value={steps}
                onChangeText={t => { setSteps(t); setStepsAuto(false); }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#B0BEC5"
                maxLength={6}
                editable={!stepsLoading}
              />
              <Text style={s.bigUnit}>보</Text>
            </View>
            {/* 목표 진행률 바 */}
            <View style={s.stepsGoalRow}>
              <Text style={s.stepsGoalTxt}>목표 {stepsGoal.toLocaleString()}보</Text>
              {steps ? (
                <Text style={[s.stepsGoalTxt, { color: STATUS_COLOR[stepsStatus(Number(steps))] }]}>
                  {Math.min(Math.round(stepsPct * 100), 100)}%
                </Text>
              ) : null}
            </View>
            <View style={s.stepsBar}>
              <View style={[s.stepsFill, {
                width: (Math.round(stepsPct * 100) + '%') as any,
                backgroundColor: steps ? STATUS_COLOR[stepsStatus(Number(steps))] : '#B0BEC5',
              }]} />
            </View>
            {Platform.OS === 'web' && (
              <Text style={s.stepsNote}>* 웹에서는 수동 입력만 가능합니다</Text>
            )}
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnOff]} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>저장하기</Text>}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── 기록 조회 탭 ── */}
      {tab === 'history' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {records.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📊</Text>
              <Text style={s.emptyTitle}>아직 기록이 없어요</Text>
              <Text style={s.emptySub}>오늘 건강 수치를 입력하면{`\n`}여기에 기록이 쌓입니다</Text>
            </View>
          ) : (
            records.map((rec, i) => (
              <View key={rec.id} style={s.recCard}>
                <View style={s.recHeader}>
                  <Text style={s.recDate}>{rec.date}</Text>
                  <Text style={s.recTime}>{rec.time}</Text>
                </View>
                {rec.bp && (
                  <RecRow
                    icon="💗" label="혈압"
                    value={`${rec.bp.sys} / ${rec.bp.dia} mmHg`}
                    status={bpStatus(rec.bp.sys, rec.bp.dia)}
                  />
                )}
                {rec.glucose && (
                  <RecRow
                    icon="🩸" label={`혈당 (${rec.glucose.type})`}
                    value={`${rec.glucose.val} mg/dL`}
                    status={glucoseStatus(rec.glucose.val, rec.glucose.type)}
                  />
                )}
                {rec.temp != null && (
                  <RecRow
                    icon="🌡️" label="체온"
                    value={`${rec.temp} °C`}
                    status={tempStatus(rec.temp)}
                  />
                )}
                {rec.weight != null && (
                  <RecRow
                    icon="⚖️" label="체중"
                    value={`${rec.weight} kg`}
                    status="normal"
                  />
                )}
                {rec.steps != null && (
                  <RecRow
                    icon="🚶" label="걸음수"
                    value={`${rec.steps.toLocaleString()} 보`}
                    status={stepsStatus(rec.steps)}
                  />
                )}
              </View>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <SeniorTabBar activeTab="health" userId={userId} name={uname} navigation={navigation} />
    </View>
  );
}

// ── 기록 행 컴포넌트 ──
function RecRow({ icon, label, value, status }: { icon: string; label: string; value: string; status: string }) {
  return (
    <View style={sr.row}>
      <Text style={sr.icon}>{icon}</Text>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
      <View style={[sr.badge, { backgroundColor: STATUS_BG[status] }]}>
        <Text style={[sr.badgeTxt, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
      </View>
    </View>
  );
}
const sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8,
              borderBottomWidth: 1, borderBottomColor: '#EEF2F8' },
  icon:     { fontSize: 22, width: 32 },
  label:    { fontSize: 18, color: '#546E7A', flex: 1 },
  value:    { fontSize: 20, fontWeight: '700', color: '#1A2C4E' },
  badge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 6 },
  badgeTxt: { fontSize: 16, fontWeight: '800' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // 헤더
  header:      { backgroundColor: BLUE, paddingHorizontal: 20, paddingBottom: 0 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  settingsBtn:  { padding: 8, marginTop: 4 },
  settingsBtnTxt: { fontSize: 28 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:   { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  waveWrap:    { height: 20, overflow: 'hidden' },
  waveNative:  { height: 22, backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22 },

  // 탭
  tabBar:   { flexDirection: 'row', backgroundColor: '#fff',
              borderBottomWidth: 1, borderBottomColor: '#E0E8F0' },
  tabBtn:   { flex: 1, paddingVertical: 16, alignItems: 'center',
              borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: BLUE },
  tabTxt:   { fontSize: 20, fontWeight: '700', color: '#90A4AE' },
  tabTxtOn: { color: BLUE, fontWeight: '900' },

  // 스크롤
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },

  // 카드 공통
  card:      { backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 14,
               shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: BLUE, marginBottom: 6 },
  cardHint:  { fontSize: 16, color: '#90A4AE', marginBottom: 14 },

  // 혈압
  bpRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  bpBox:   { flex: 1, alignItems: 'center' },
  bpLabel: { fontSize: 18, color: '#546E7A', marginBottom: 6 },
  bpInput: { fontSize: 38, fontWeight: '900', color: BLUE, textAlign: 'center',
             borderBottomWidth: 2.5, borderBottomColor: BLUE, width: '100%', paddingVertical: 4 },
  bpUnit:  { fontSize: 16, color: '#90A4AE', marginTop: 4 },
  bpSlash: { fontSize: 38, color: '#B0BEC5', fontWeight: '300', marginTop: 20 },

  // 혈당
  glucoseTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn:   { flex: 1, paddingVertical: 12, alignItems: 'center',
               backgroundColor: BG, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0' },
  typeBtnOn: { backgroundColor: LBLUE, borderColor: BLUE },
  typeTxt:   { fontSize: 18, fontWeight: '700', color: '#78909C' },
  typeTxtOn: { color: BLUE },

  // 큰 입력
  bigInputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bigInput:    { fontSize: 52, fontWeight: '900', color: BLUE, textAlign: 'center',
                 borderBottomWidth: 2.5, borderBottomColor: BLUE, minWidth: 120, paddingVertical: 4 },
  bigUnit:     { fontSize: 22, color: '#90A4AE', marginBottom: 10 },

  // 중간 입력
  rowCards:    { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfCard:    { flex: 1, marginBottom: 14 },
  midInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  midInput:    { fontSize: 34, fontWeight: '900', color: BLUE, borderBottomWidth: 2, borderBottomColor: BLUE,
                 flex: 1, paddingVertical: 4 },
  midUnit:     { fontSize: 18, color: '#90A4AE', marginBottom: 6 },

  // 상태 배지
  statusBadge:   { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  statusTxt:     { fontSize: 18, fontWeight: '800' },
  statusBadgeSm: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusTxtSm:   { fontSize: 16, fontWeight: '800' },

  // 걸음수
  stepsHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  autoBadge:     { backgroundColor: LBLUE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  autoBadgeTxt:  { fontSize: 16, fontWeight: '700', color: BLUE },
  stepsGoalRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  stepsGoalTxt:  { fontSize: 18, color: '#90A4AE', fontWeight: '600' },
  stepsBar:      { height: 12, backgroundColor: '#E0E8F0', borderRadius: 6, overflow: 'hidden' },
  stepsFill:     { height: '100%' as any, borderRadius: 6 },
  stepsNote:     { fontSize: 16, color: '#B0BEC5', marginTop: 10 },

  // 저장 버튼
  saveBtn:    { backgroundColor: BLUE, borderRadius: 18, paddingVertical: 22, alignItems: 'center', marginTop: 8 },
  saveBtnOff: { backgroundColor: '#90A4AE' },
  saveBtnTxt: { fontSize: 22, fontWeight: '900', color: '#fff' },

  // 빈 상태
  emptyBox:  { alignItems: 'center', paddingVertical: 60, gap: 14 },
  emptyIcon: { fontSize: 64 },
  emptyTitle:{ fontSize: 24, fontWeight: '800', color: '#2C2C2C' },
  emptySub:  { fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 },

  // 기록 카드
  recCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
               shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
               shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F8', paddingBottom: 10 },
  recDate:   { fontSize: 20, fontWeight: '900', color: BLUE },
  recTime:   { fontSize: 18, color: '#90A4AE' },
});
