import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = 'https://silverlieai.onrender.com';

type HealthMetric = {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
};

type AIInsight = {
  summary: string;
  insights: string[];
};

export default function DashboardScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);

  const [steps, setSteps] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [sleep, setSleep] = useState('');
  const [weight, setWeight] = useState('');
  const [heartRate, setHeartRate] = useState('');

  const [todayData, setTodayData] = useState<any>(null);

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    try {
      const res = await fetch(`${API_URL}/health/history/${userId}?days=1`);
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        setTodayData(data.records[0]);
      }
    } catch {}
  };

  const metrics: HealthMetric[] = [
    {
      label: '걸음수',
      value: todayData?.steps ? todayData.steps.toLocaleString() : '--',
      unit: '보',
      icon: '🚶',
      color: '#40916C',
    },
    {
      label: '혈압',
      value: todayData?.blood_pressure_systolic
        ? `${todayData.blood_pressure_systolic}/${todayData.blood_pressure_diastolic}`
        : '--',
      unit: 'mmHg',
      icon: '❤️',
      color: '#E07B54',
    },
    {
      label: '심박수',
      value: todayData?.heart_rate ? String(todayData.heart_rate) : '--',
      unit: 'bpm',
      icon: '💓',
      color: '#C77B3A',
    },
    {
      label: '체중',
      value: todayData?.weight ? String(todayData.weight) : '--',
      unit: 'kg',
      icon: '⚖️',
      color: '#3A7CA5',
    },
    {
      label: '혈당',
      value: todayData?.blood_sugar ? String(todayData.blood_sugar) : '--',
      unit: 'mg/dL',
      icon: '🩸',
      color: '#6B5B95',
    },
  ];

  const saveAndAnalyze = async () => {
    if (!systolic && !steps && !sleep && !weight) {
      Alert.alert('', '최소 하나의 항목을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/health/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date: today,
          steps: steps ? parseInt(steps) : null,
          blood_pressure_systolic: systolic ? parseInt(systolic) : null,
          blood_pressure_diastolic: diastolic ? parseInt(diastolic) : null,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          weight: weight ? parseFloat(weight) : null,
        }),
      });

      setShowModal(false);
      fetchTodayData();

      // AI 분석
      if (systolic && diastolic) {
        setAiLoading(true);
        const res = await fetch(`${API_URL}/health/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            user_name: name,
            age: 65,
            steps: parseInt(steps) || 3000,
            blood_pressure_systolic: parseInt(systolic),
            blood_pressure_diastolic: parseInt(diastolic),
            sleep_hours: parseFloat(sleep) || 7,
            weight_kg: parseFloat(weight) || 65,
            heart_rate: heartRate ? parseInt(heartRate) : null,
          }),
        });
        const data = await res.json();
        setAiInsight(data.data);
      }
    } catch {
      Alert.alert('', '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>오늘의 건강</Text>
        <Text style={styles.subtitle}>{name}님의 건강 대시보드</Text>
      </View>

      {/* 지표 카드 */}
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricIcon}>{m.icon}</Text>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.metricUnit}>{m.unit}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* 기록 버튼 */}
      <TouchableOpacity style={styles.recordBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.recordBtnText}>+ 오늘 건강 기록하기</Text>
      </TouchableOpacity>

      {/* AI 분석 결과 */}
      {aiLoading && (
        <View style={styles.aiCard}>
          <ActivityIndicator color="#2D6A4F" />
          <Text style={styles.aiLoading}>AI 분석 중...</Text>
        </View>
      )}
      {aiInsight && !aiLoading && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>🤖 AI 건강 분석</Text>
          <Text style={styles.aiSummary}>{aiInsight.summary}</Text>
          {aiInsight.insights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <Text style={styles.insightDot}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 기록 입력 모달 */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>건강 기록 입력</Text>
            <TextInput style={styles.input} placeholder="걸음수 (예: 5000)" value={steps} onChangeText={setSteps} keyboardType="numeric" />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="수축기 혈압 (120)" value={systolic} onChangeText={setSystolic} keyboardType="numeric" />
              <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="이완기 (80)" value={diastolic} onChangeText={setDiastolic} keyboardType="numeric" />
            </View>
            <TextInput style={styles.input} placeholder="수면 시간 (예: 7.5)" value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="체중 (예: 65.5)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="심박수 (예: 72)" value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" />
            <TouchableOpacity style={styles.saveBtn} onPress={saveAndAnalyze} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>저장 + AI 분석</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#B7E4C7', marginTop: 4 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  metricCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  metricIcon: { fontSize: 28, marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: 'bold' },
  metricUnit: { fontSize: 11, color: '#999', marginTop: 2 },
  metricLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  recordBtn: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  recordBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  aiCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  aiTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D6A4F', marginBottom: 10 },
  aiSummary: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 12 },
  aiLoading: { textAlign: 'center', color: '#666', marginTop: 8 },
  insightRow: { flexDirection: 'row', marginBottom: 6 },
  insightDot: { color: '#2D6A4F', fontSize: 16, marginRight: 8 },
  insightText: { fontSize: 15, color: '#555', flex: 1, lineHeight: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1A17', marginBottom: 16 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: '#F7F4EF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#999', fontSize: 16 },
});
