import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Image, Alert, Modal, TextInput, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE = '#3B82F6';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const GREEN = '#3BA559';
const GREEN_DK = '#1F7A3A';
const GREEN_BG = '#E6F4E2';
const ORANGE = '#F58A4D';
const ORANGE_BG = '#FFE4CC';
const RED = '#E5453C';
const RED_BG = '#FFE6DC';
const WARN = '#A8770F';
const WARN_BG = '#FFF3D6';

const STATUS = {
  normal: { label: '정상', fg: GREEN_DK, bg: GREEN_BG },
  caution: { label: '주의', fg: WARN, bg: WARN_BG },
  danger: { label: '위험', fg: RED, bg: RED_BG },
};

const bpStatus = (sys: number, dia: number) => {
  if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) return 'normal';
  if (sys > 140 || dia > 90) return 'danger';
  return 'caution';
};

const glucoseStatus = (val: number) => {
  if (val >= 70 && val <= 140) return 'normal';
  if (val > 168) return 'danger';
  return 'caution';
};

const stepsStatus = (val: number) => {
  if (val >= 8000) return 'normal';
  if (val >= 5000) return 'caution';
  return 'danger';
};

const sleepStatus = (hours: number) => {
  if (hours >= 7 && hours <= 9) return 'normal';
  if (hours >= 5) return 'caution';
  return 'danger';
};

const API = 'https://silverlieai.onrender.com';

interface HealthRecord {
  date: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  blood_sugar: number;
  heart_rate: number;
  weight: number;
  steps: number;
  sleep_hours: number;
}

export default function HealthScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<HealthRecord | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const raw = await AsyncStorage.getItem('health_records');
      const list = raw ? JSON.parse(raw) : [];
      const sorted = list.sort((a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecords(sorted);

      const today = sorted.find((r: any) => r.date === todayKey);
      setTodayRecord(today || null);
    } catch {}
  };

  const handleSaveMeasurement = async () => {
    if (!inputValue.trim()) {
      Alert.alert('', '값을 입력해주세요');
      return;
    }

    try {
      let updated: HealthRecord;

      if (todayRecord) {
        updated = { ...todayRecord };
      } else {
        updated = {
          date: todayKey,
          blood_pressure_systolic: 0,
          blood_pressure_diastolic: 0,
          blood_sugar: 0,
          heart_rate: 0,
          weight: 0,
          steps: 0,
          sleep_hours: 0,
        };
      }

      if (modalType === 'bp') {
        const [sys, dia] = inputValue.split('/').map(Number);
        updated.blood_pressure_systolic = sys;
        updated.blood_pressure_diastolic = dia;
      } else if (modalType === 'sg') {
        updated.blood_sugar = Number(inputValue);
      } else if (modalType === 'sl') {
        updated.sleep_hours = Number(inputValue);
      }

      const raw = await AsyncStorage.getItem('health_records');
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((r: any) => r.date === todayKey);

      if (idx >= 0) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }

      await AsyncStorage.setItem('health_records', JSON.stringify(list));
      await fetch(`${API}/health/records/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});

      setTodayRecord(updated);
      setModalType(null);
      setInputValue('');
      Alert.alert('', '저장되었습니다');
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다');
    }
  };

  const hasWarning = todayRecord ?
    [
      bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic),
      glucoseStatus(todayRecord.blood_sugar),
      stepsStatus(todayRecord.steps),
      sleepStatus(todayRecord.sleep_hours),
    ].some(s => s !== 'normal') : false;

  const lumiImage = hasWarning ? require('../assets/lumi-worried.png') : require('../assets/lumi-content.png');

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>건강 기록</Text>
        </View>

        {/* Lumi Greeting */}
        <View style={s.lumiGreeting}>
          <Image source={lumiImage} style={s.lumiImage} />
          <View>
            <View style={s.statusBadge}>
              <Text style={s.statusBadgeText}>{hasWarning ? '주의' : '좋음'}</Text>
            </View>
            <Text style={s.greetingText}>{name}님, 오늘도{'\n'}잘 챙기고 계세요 💜</Text>
          </View>
        </View>

        {/* AI Weekly Report */}
        <TouchableOpacity
          style={s.reportCard}
          onPress={() => navigation.navigate('WeeklyReport', { userId, name })}
        >
          <LinearGradient colors={['#E8F1FC', '#D6E7F8']} style={s.reportGradient}>
            <View style={s.reportContent}>
              <Text style={s.reportIcon}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.reportTitle}>AI 주간 리포트</Text>
                <Text style={s.reportDesc}>이번 주 분석 준비됐어요</Text>
              </View>
              <Text style={s.reportChevron}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Metrics - BP */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: ORANGE_BG }]}>
              <Text style={s.metricIcon}>❤️</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>혈압</Text>
              {todayRecord?.blood_pressure_systolic ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.blood_pressure_systolic} / {todayRecord.blood_pressure_diastolic}
                    <Text style={s.metricUnit}> mmHg</Text>
                  </Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)].bg }]}>
                      <Text style={[s.statusBadgeSmallText, { color: STATUS[bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)].fg }]}>
                        {STATUS[bpStatus(todayRecord.blood_pressure_systolic, todayRecord.blood_pressure_diastolic)].label}
                      </Text>
                    </View>
                    <Text style={s.statusTime}>방금 전</Text>
                  </View>
                </>
              ) : (
                <Text style={s.emptyValue}>측정 안 함</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('bp')}>
            <Text style={s.measureBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics - Blood Sugar */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: ORANGE_BG }]}>
              <Text style={s.metricIcon}>🩸</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>혈당</Text>
              {todayRecord?.blood_sugar ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.blood_sugar}
                    <Text style={s.metricUnit}> mg/dL</Text>
                  </Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[glucoseStatus(todayRecord.blood_sugar)].bg }]}>
                      <Text style={[s.statusBadgeSmallText, { color: STATUS[glucoseStatus(todayRecord.blood_sugar)].fg }]}>
                        {STATUS[glucoseStatus(todayRecord.blood_sugar)].label}
                      </Text>
                    </View>
                    <Text style={s.statusTime}>방금 전</Text>
                  </View>
                </>
              ) : (
                <Text style={s.emptyValue}>측정 안 함</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('sg')}>
            <Text style={s.measureBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics - Steps (자동 측정, 버튼 없음) */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: ORANGE_BG }]}>
              <Text style={s.metricIcon}>🚶</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>걸음수</Text>
              {todayRecord?.steps ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.steps.toLocaleString()}
                    <Text style={s.metricUnit}> 보</Text>
                  </Text>
                  <View style={s.stepsProgress}>
                    <View style={[s.progressBar, { width: `${Math.min(todayRecord.steps / 8000 * 100, 100)}%` as any }]} />
                  </View>
                  <Text style={s.progressText}>목표 8000보 · {Math.round(todayRecord.steps / 80)}%</Text>
                </>
              ) : (
                <Text style={s.emptyValue}>자동 측정 중</Text>
              )}
            </View>
          </View>
        </View>

        {/* Metrics - Sleep */}
        <View style={s.metricCard}>
          <View style={s.metricTopRow}>
            <View style={[s.metricIconBox, { backgroundColor: ORANGE_BG }]}>
              <Text style={s.metricIcon}>😴</Text>
            </View>
            <View style={s.metricContent}>
              <Text style={s.metricLabel}>수면</Text>
              {todayRecord?.sleep_hours ? (
                <>
                  <Text style={s.metricValue}>
                    {todayRecord.sleep_hours}
                    <Text style={s.metricUnit}> 시간</Text>
                  </Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadgeSmall, { backgroundColor: STATUS[sleepStatus(todayRecord.sleep_hours)].bg }]}>
                      <Text style={[s.statusBadgeSmallText, { color: STATUS[sleepStatus(todayRecord.sleep_hours)].fg }]}>
                        {STATUS[sleepStatus(todayRecord.sleep_hours)].label}
                      </Text>
                    </View>
                    <Text style={s.statusTime}>어제</Text>
                  </View>
                </>
              ) : (
                <Text style={s.emptyValue}>측정 안 함</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.measureBtn} onPress={() => setModalType('sl')}>
            <Text style={s.measureBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Records */}
        <Text style={s.recentTitle}>최근 기록</Text>
        <View style={s.recordsTable}>
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, { flex: 1 }]}>날짜</Text>
            <Text style={[s.tableCell, { flex: 1.2 }]}>혈압</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>혈당</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>걸음</Text>
            <Text style={[s.tableCell, { flex: 0.8 }]}>수면</Text>
          </View>
          {records.slice(0, 4).map((r) => (
            <View key={r.date} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 1, fontWeight: '600' }]}>
                {r.date.slice(5).replace('-', '/')}
              </Text>
              <Text style={[s.tableCell, { flex: 1.2 }]}>
                {r.blood_pressure_systolic ? `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}` : '—'}
              </Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{r.blood_sugar || '—'}</Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{r.steps || '—'}</Text>
              <Text style={[s.tableCell, { flex: 0.8 }]}>{r.sleep_hours || '—'}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity>
          <Text style={s.moreLink}>전체 기록 보기 →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Input Modal */}
      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {modalType === 'bp' ? '혈압을 입력해주세요' :
               modalType === 'sg' ? '혈당을 입력해주세요' :
               '수면 시간을 입력해주세요'}
            </Text>
            <Text style={s.modalHint}>
              {modalType === 'bp' ? '수축기/이완기 (예: 120/80)' :
               modalType === 'sg' ? '혈당 수치 (예: 120)' :
               '수면 시간 (예: 7.5)'}
            </Text>
            <TextInput
              style={s.modalInput}
              placeholder={modalType === 'bp' ? '120/80' : modalType === 'sg' ? '120' : '7.5'}
              keyboardType="decimal-pad"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.btnCancel} onPress={() => { setModalType(null); setInputValue(''); }}>
                <Text style={s.btnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSaveMeasurement}>
                <Text style={s.btnSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SeniorTabBar navigation={navigation} activeTab="health" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: INK,
  },

  lumiGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 24,
    gap: 12,
  },
  lumiImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    resizeMode: 'contain',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: GREEN_BG,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN_DK,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    lineHeight: 30,
  },

  reportCard: {
    marginHorizontal: 18,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reportGradient: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  reportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIcon: {
    fontSize: 28,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BLUE,
    marginBottom: 2,
  },
  reportDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: INK_SOFT,
  },
  reportChevron: {
    fontSize: 18,
    color: BLUE,
  },

  metricCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 14,
    shadowColor: '#1C3C6E',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricIconBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricIcon: {
    fontSize: 32,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: INK_MUTE,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '900',
    color: INK,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: INK_SOFT,
  },
  emptyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: INK_MUTE,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTime: {
    fontSize: 11,
    fontWeight: '600',
    color: INK_MUTE,
  },

  stepsProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: BLUE,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: INK_SOFT,
  },

  measureBtn: {
    width: '100%',
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },

  recentTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    marginHorizontal: 18,
    marginTop: 24,
    marginBottom: 12,
  },

  recordsTable: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 12,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
  },

  moreLink: {
    marginHorizontal: 18,
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    fontWeight: '600',
    color: INK_SOFT,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: INK_SOFT,
  },
  btnSave: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});
