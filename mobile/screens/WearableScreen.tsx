import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

// Health Connect는 Android 네이티브 빌드에서만 동작
// 웹/iOS에서는 수동입력 안내
let HealthConnect: any = null;
try {
  if (Platform.OS === 'android') {
    HealthConnect = require('react-native-health-connect');
  }
} catch {}

type SyncResult = {
  steps?: number;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  weight?: number;
  bloodSugar?: number;
  sleepHours?: number;
  syncedAt: string;
};

export default function WearableScreen({ navigation, route }: any) {
  const { t, language } = useLanguage();
  const userId = route?.params?.userId || '';
  const name   = route?.params?.name   || '';

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [syncing, setSyncing]         = useState(false);
  const [lastSync, setLastSync]       = useState<SyncResult | null>(null);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    if (Platform.OS !== 'android' || !HealthConnect) {
      setIsAvailable(false);
      return;
    }
    try {
      const available = await HealthConnect.getSdkStatus();
      // 0 = Not installed, 1 = Not supported, 2 = Available
      setIsAvailable(available === 2);
    } catch {
      setIsAvailable(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (!HealthConnect) return false;
    try {
      const granted = await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'BloodPressure' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'BloodGlucose' },
        { accessType: 'read', recordType: 'SleepSession' },
      ]);
      return granted.length > 0;
    } catch {
      return false;
    }
  };

  const syncToday = async () => {
    if (!HealthConnect || !isAvailable) return;
    setSyncing(true);
    try {
      const ok = await requestPermissions();
      if (!ok) {
        Alert.alert('', '건강 데이터 읽기 권한이 필요합니다.');
        return;
      }

      const today  = new Date();
      const start  = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const end    = new Date().toISOString();
      const result: SyncResult = { syncedAt: new Date().toISOString() };

      // 걸음수
      try {
        const steps = await HealthConnect.readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: start, endTime: end } });
        if (steps.records?.length) {
          result.steps = steps.records.reduce((s: number, r: any) => s + (r.count || 0), 0);
        }
      } catch {}

      // 심박수 (최신값)
      try {
        const hr = await HealthConnect.readRecords('HeartRate', { timeRangeFilter: { operator: 'between', startTime: start, endTime: end } });
        if (hr.records?.length) {
          const last = hr.records[hr.records.length - 1];
          result.heartRate = last.samples?.[0]?.beatsPerMinute || last.beatsPerMinute;
        }
      } catch {}

      // 혈압 (최신값)
      try {
        const bp = await HealthConnect.readRecords('BloodPressure', { timeRangeFilter: { operator: 'between', startTime: start, endTime: end } });
        if (bp.records?.length) {
          const last = bp.records[bp.records.length - 1];
          result.systolic  = Math.round(last.systolic?.inMillimetersOfMercury   || 0) || undefined;
          result.diastolic = Math.round(last.diastolic?.inMillimetersOfMercury  || 0) || undefined;
        }
      } catch {}

      // 체중 (최신값)
      try {
        const wt = await HealthConnect.readRecords('Weight', { timeRangeFilter: { operator: 'between', startTime: start, endTime: end } });
        if (wt.records?.length) {
          result.weight = wt.records[wt.records.length - 1].weight?.inKilograms;
        }
      } catch {}

      // 혈당 (최신값)
      try {
        const bg = await HealthConnect.readRecords('BloodGlucose', { timeRangeFilter: { operator: 'between', startTime: start, endTime: end } });
        if (bg.records?.length) {
          // mmol/L → mg/dL 변환
          const raw = bg.records[bg.records.length - 1].level?.inMillimolesPerLiter;
          if (raw) result.bloodSugar = Math.round(raw * 18.0182);
        }
      } catch {}

      // 수면 (어젯밤 시간)
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const sleepStart = new Date(yesterday.setHours(18, 0, 0, 0)).toISOString();
        const sleep = await HealthConnect.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: sleepStart, endTime: end } });
        if (sleep.records?.length) {
          const s = sleep.records[sleep.records.length - 1];
          const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
          result.sleepHours = Math.round(ms / 3600000 * 10) / 10;
        }
      } catch {}

      setLastSync(result);
    } catch (e) {
      Alert.alert('', '데이터 읽기 중 오류가 발생했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  const saveToHealthRecords = async () => {
    if (!lastSync || !userId) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/health/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:                  userId,
          date:                     today,
          steps:                    lastSync.steps    || null,
          heart_rate:               lastSync.heartRate || null,
          blood_pressure_systolic:  lastSync.systolic  || null,
          blood_pressure_diastolic: lastSync.diastolic || null,
          weight:                   lastSync.weight    || null,
          blood_sugar:              lastSync.bloodSugar|| null,
          notes:                    lastSync.sleepHours ? `수면: ${lastSync.sleepHours}시간` : null,
          source:                   'wearable',
        }),
      });
      Alert.alert('✅', '건강 기록에 저장되었습니다!\n건강 기록 화면에서 확인하세요.');
    } catch {
      Alert.alert('', '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const MetricRow = ({ icon, label, value }: { icon: string; label: string; value: string | undefined }) =>
    value ? (
      <View style={styles.metricRow}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t.home ?? '홈'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>⌚ 웨어러블 연동</Text>
          <Text style={styles.subtitle}>건강 데이터를 자동으로 불러옵니다</Text>
        </View>

        <View style={styles.body}>

          {/* Android Health Connect */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Google Health Connect</Text>
                <Text style={styles.cardSub}>Android · Galaxy Watch · Fitbit · Garmin</Text>
              </View>
              <View style={[styles.badge, isAvailable ? styles.badgeActive : styles.badgeOff]}>
                <Text style={[styles.badgeText, isAvailable ? styles.badgeTextActive : styles.badgeTextOff]}>
                  {isAvailable === null ? '확인 중' : isAvailable ? '연결 가능' : Platform.OS !== 'android' ? 'Android 전용' : '앱 설치 필요'}
                </Text>
              </View>
            </View>

            {/* 측정 항목 */}
            <View style={styles.metricsChips}>
              {['🚶 걸음수', '❤️ 심박수', '🩺 혈압', '⚖️ 체중', '🩸 혈당', '💤 수면'].map(m => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))}
            </View>

            {/* 동기화 버튼 */}
            <TouchableOpacity
              style={[styles.syncBtn, (!isAvailable || syncing) && styles.syncBtnDisabled]}
              onPress={syncToday}
              disabled={!isAvailable || syncing}
            >
              {syncing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.syncBtnText}>📲 오늘 데이터 불러오기</Text>
              }
            </TouchableOpacity>

            {/* Android 아닌 경우 안내 */}
            {Platform.OS !== 'android' && (
              <Text style={styles.platformNote}>
                💡 Android 기기에서 앱을 실행하고, Google Health Connect가 설치되어 있어야 합니다.
              </Text>
            )}

            {/* Health Connect 미설치 안내 */}
            {Platform.OS === 'android' && isAvailable === false && (
              <Text style={styles.platformNote}>
                Google Play에서 "Health Connect" 앱을 먼저 설치하고, 웨어러블 기기를 연결하세요.
              </Text>
            )}
          </View>

          {/* 동기화 결과 */}
          {lastSync && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>📊 불러온 데이터</Text>
              <Text style={styles.resultTime}>
                {new Date(lastSync.syncedAt).toLocaleTimeString()} 기준
              </Text>

              <MetricRow icon="🚶" label="걸음수"  value={lastSync.steps?.toLocaleString() + ' 보'} />
              <MetricRow icon="❤️" label="심박수"  value={lastSync.heartRate ? lastSync.heartRate + ' bpm' : undefined} />
              <MetricRow icon="🩺" label="혈압"    value={lastSync.systolic ? `${lastSync.systolic}/${lastSync.diastolic} mmHg` : undefined} />
              <MetricRow icon="⚖️" label="체중"    value={lastSync.weight ? lastSync.weight + ' kg' : undefined} />
              <MetricRow icon="🩸" label="혈당"    value={lastSync.bloodSugar ? lastSync.bloodSugar + ' mg/dL' : undefined} />
              <MetricRow icon="💤" label="수면"    value={lastSync.sleepHours ? lastSync.sleepHours + ' 시간' : undefined} />

              {/* 저장 버튼 */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={saveToHealthRecords}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>💾 건강 기록에 저장하기</Text>
                }
              </TouchableOpacity>
              <Text style={styles.saveNote}>
                저장하면 AI 분석·주간 리포트에 자동 반영됩니다
              </Text>
            </View>
          )}

          {/* Apple Watch (예정) */}
          <View style={[styles.card, styles.cardDisabled]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🍎</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Apple Watch</Text>
                <Text style={styles.cardSub}>iOS · HealthKit</Text>
              </View>
              <View style={styles.badgeSoon}>
                <Text style={styles.badgeSoonText}>준비 중</Text>
              </View>
            </View>
            <Text style={styles.platformNote}>
              iOS 앱 출시 후 Apple HealthKit으로 자동 불러오기가 제공됩니다.
            </Text>
          </View>

          {/* 데이터 흐름 설명 */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📌 데이터 처리 방식</Text>
            <Text style={styles.infoText}>웨어러블 → Health Connect → Silver Life AI → AI 분석</Text>
            <Text style={styles.infoText}>• 수기 입력과 동일한 테이블에 저장 (source: 웨어러블)</Text>
            <Text style={styles.infoText}>• 같은 날 재동기화 시 자동으로 업데이트</Text>
            <Text style={styles.infoText}>• 개인 건강 데이터는 기기 밖으로 전송되지 않습니다</Text>
          </View>

        </View>
      </ScrollView>

      <BottomTabBar navigation={navigation} activeTab="home" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    backgroundColor: '#E8F5E9',
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn:  { marginBottom: 10 },
  backText: { color: '#52B788', fontSize: 14, fontWeight: '600' },
  title:    { fontSize: 24, fontWeight: 'bold', color: '#1B4332' },
  subtitle: { fontSize: 13, color: '#52B788', marginTop: 4 },

  body: { padding: 16, gap: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon:  { fontSize: 32 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1B4332' },
  cardSub:   { fontSize: 12, color: '#888', marginTop: 2 },

  badge:           { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeActive:     { backgroundColor: '#D1FAE5' },
  badgeOff:        { backgroundColor: '#F3F4F6' },
  badgeText:       { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#065F46' },
  badgeTextOff:    { color: '#6B7280' },
  badgeSoon:       { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeSoonText:   { fontSize: 12, fontWeight: '700', color: '#92400E' },

  metricsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:         { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:     { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },

  syncBtn:         { backgroundColor: '#2D6A4F', borderRadius: 14, padding: 16, alignItems: 'center' },
  syncBtnDisabled: { backgroundColor: '#A7C4B5' },
  syncBtnText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  platformNote: { marginTop: 12, fontSize: 13, color: '#888', lineHeight: 20 },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#D1FAE5',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultTitle: { fontSize: 17, fontWeight: 'bold', color: '#1B4332', marginBottom: 4 },
  resultTime:  { fontSize: 12, color: '#888', marginBottom: 16 },

  metricRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metricIcon:  { fontSize: 22, width: 36 },
  metricLabel: { flex: 1, fontSize: 15, color: '#555' },
  metricValue: { fontSize: 16, fontWeight: 'bold', color: '#1B4332' },

  saveBtn:         { backgroundColor: '#2D6A4F', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { backgroundColor: '#A7C4B5' },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  saveNote:        { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 },

  infoBox:   { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1B4332', marginBottom: 8 },
  infoText:  { fontSize: 13, color: '#555', lineHeight: 22 },
});
