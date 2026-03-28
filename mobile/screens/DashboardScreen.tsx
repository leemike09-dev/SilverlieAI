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
import { HEADER_PADDING_TOP } from '../utils/layout';

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

type Recommendation = {
  category: string;
  emoji: string;
  title: string;
  desc: string;
  tags: string[];
  match: number;
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [recommendationsDone, setRecommendationsDone] = useState(false);
  const [userInfo, setUserInfo] = useState<{ age?: number; interests?: string[] }>({});

  const getHealthColor = (metric: string, value: number | null): string => {
    if (value === null || value === undefined) return '#999';
    switch (metric) {
      case 'bp':
        return value < 120 ? '#2D6A4F' : value < 140 ? '#F39C12' : '#E74C3C';
      case 'hr':
        return value >= 60 && value <= 100 ? '#2D6A4F' : '#F39C12';
      case 'steps':
        return value >= 5000 ? '#2D6A4F' : value >= 3000 ? '#F39C12' : '#C0392B';
      case 'bs':
        return value < 100 ? '#2D6A4F' : value < 125 ? '#F39C12' : '#E74C3C';
      default:
        return '#3A7CA5';
    }
  };

  const getHealthStatus = (data: any) => {
    if (!data) {
      return { label: t.dashboardStatusNoData || '데이터 없음', color: '#6C757D' };
    }

    let status: 'normal' | 'warning' | 'danger' = 'normal';
    const checks: string[] = [];

    if (data.blood_pressure_systolic && data.blood_pressure_diastolic) {
      if (data.blood_pressure_systolic >= 140 || data.blood_pressure_diastolic >= 90) checks.push('danger');
      else if (data.blood_pressure_systolic >= 120 || data.blood_pressure_diastolic >= 80) checks.push('warning');
      else checks.push('normal');
    }

    if (data.heart_rate) {
      if (data.heart_rate < 60 || data.heart_rate > 100) checks.push('warning');
      else checks.push('normal');
    }

    if (data.steps != null) {
      if (data.steps >= 5000) checks.push('normal');
      else if (data.steps >= 3000) checks.push('warning');
      else checks.push('danger');
    }

    if (checks.includes('danger')) status = 'danger';
    else if (checks.includes('warning')) status = 'warning';

    if (status === 'danger') return { label: t.dashboardStatusDanger || '위험', color: '#E74C3C' };
    if (status === 'warning') return { label: t.dashboardStatusWarning || '주의', color: '#F39C12' };
    return { label: t.dashboardStatusNormal || '정상', color: '#2D6A4F' };
  };

  const getAIRecommendations = async () => {
    if (!userId || userId === 'demo-user') return;
    setAiRecLoading(true);
    try {
      const histRes = await fetch(`${API_URL}/health/history/${userId}?days=3`);
      const histData = await histRes.json();
      const latestRecord = histData.records?.[0];

      const res = await fetch(`${API_URL}/health/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_name: name,
          age: userInfo.age || 65,
          interests: userInfo.interests || [],
          steps: latestRecord?.steps || null,
          blood_pressure_systolic: latestRecord?.blood_pressure_systolic || null,
          blood_pressure_diastolic: latestRecord?.blood_pressure_diastolic || null,
          weight_kg: latestRecord?.weight || null,
          heart_rate: latestRecord?.heart_rate || null,
        }),
      });
      const data = await res.json();
      if (data.data?.recommendations?.length > 0) {
        setRecommendations(data.data.recommendations);
      }
      setRecommendationsDone(true);
    } catch (e) {
      console.warn('AI recommend error', e);
    } finally {
      setAiRecLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
    if (userId && userId !== 'demo-user') {
      fetch(`${API_URL}/users/${userId}`)
        .then(r => r.json())
        .then(data => setUserInfo({ age: data.age, interests: data.interests || [] }))
        .catch(() => {});
    }
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
      label: t.metricSteps,
      value: todayData?.steps ? todayData.steps.toLocaleString() : '--',
      unit: t.metricStepsUnit,
      icon: '🚶',
      color: getHealthColor('steps', todayData?.steps || null),
    },
    {
      label: t.metricBP,
      value: todayData?.blood_pressure_systolic
        ? `${todayData.blood_pressure_systolic}/${todayData.blood_pressure_diastolic}`
        : '--',
      unit: 'mmHg',
      icon: '❤️',
      color: getHealthColor('bp', todayData?.blood_pressure_systolic || null),
    },
    {
      label: t.metricHR,
      value: todayData?.heart_rate ? String(todayData.heart_rate) : '--',
      unit: 'bpm',
      icon: '💓',
      color: getHealthColor('hr', todayData?.heart_rate || null),
    },
    {
      label: t.metricWeight,
      value: todayData?.weight ? String(todayData.weight) : '--',
      unit: 'kg',
      icon: '⚖️',
      color: '#3A7CA5',
    },
    {
      label: t.metricBloodSugar,
      value: todayData?.blood_sugar ? String(todayData.blood_sugar) : '--',
      unit: 'mg/dL',
      icon: '🩸',
      color: getHealthColor('bs', todayData?.blood_sugar || null),
    },
  ];

  const saveAndAnalyze = async () => {
    if (!systolic && !steps && !sleep && !weight) {
      Alert.alert('', t.fillOne);
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
      Alert.alert('', t.saveError);
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
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.dashboardTitle}</Text>
        <Text style={styles.subtitle}>{t.dashboardSubtitle(name)}</Text>
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

      <View style={[styles.statusCard, { borderColor: getHealthStatus(todayData).color }]}> 
        <Text style={[styles.statusText, { color: getHealthStatus(todayData).color }]}>{t.dashboardStatus}: {getHealthStatus(todayData).label}</Text>
      </View>
      <TouchableOpacity style={[styles.aiRecommendBtn, { backgroundColor: '#E8F5E9' }]} onPress={getAIRecommendations} disabled={aiRecLoading}>
        {aiRecLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.aiRecommendBtnText}>{t.getAIRecommendBtn}</Text>}
      </TouchableOpacity>
      {recommendationsDone && recommendations.length > 0 && (
        <View style={styles.recListContainer}>
          <Text style={styles.recListTitle}>{t.aiRecommendTitle}</Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recCardSmall}>
              <Text style={styles.recEmoji}>{rec.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitleSmall}>{rec.title}</Text>
                <Text style={styles.recDescSmall}>{rec.desc}</Text>
              </View>
              <Text style={[styles.recMatchSmall, { color: rec.match >= 90 ? '#2D6A4F' : rec.match >= 80 ? '#40916C' : '#C77B3A' }]}>{rec.match}%</Text>
            </View>
          ))}
        </View>
      )}
      {/* 기록 버튼 */}
      <TouchableOpacity style={styles.recordBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.recordBtnText}>{t.recordTodayBtn}</Text>
      </TouchableOpacity>

      {/* AI 분석 결과 */}
      {aiLoading && (
        <View style={styles.aiCard}>
          <ActivityIndicator color="#2D6A4F" />
          <Text style={styles.aiLoading}>{t.aiAnalyzing}</Text>
        </View>
      )}
      {aiInsight && !aiLoading && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{t.aiAnalysisTitle}</Text>
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
            <Text style={styles.modalTitle}>{t.modalTitle}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} placeholder={t.stepsPlaceholder} value={steps} onChangeText={setSteps} keyboardType="numeric" />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder={t.systolicBPPlaceholder} value={systolic} onChangeText={setSystolic} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder={t.diastolicBPPlaceholder} value={diastolic} onChangeText={setDiastolic} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder={t.sleepPlaceholder} value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" />
              <TextInput style={styles.input} placeholder={t.weightPlaceholder} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              <TextInput style={styles.input} placeholder={t.heartRatePlaceholder} value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" />
              <TouchableOpacity style={styles.saveBtn} onPress={saveAndAnalyze} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t.saveAnalyzeBtn}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>{t.cancel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 24,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#52B788', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B4332' },
  subtitle: { fontSize: 16, color: '#52B788', marginTop: 4 },
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
  metricIcon: { fontSize: 32, marginBottom: 6 },
  metricValue: { fontSize: 22, fontWeight: 'bold' },
  metricUnit: { fontSize: 14, color: '#999', marginTop: 2 },
  metricLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiRecommendBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  aiRecommendBtnText: {
    color: '#1B4332',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recListContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  recListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recCardSmall: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  recTitleSmall: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  recDescSmall: {
    fontSize: 13,
    color: '#666',
  },
  recMatchSmall: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recordBtn: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  recordBtnText: { color: '#1B4332', fontSize: 20, fontWeight: 'bold' },
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
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1A17', marginBottom: 16 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: '#FFF8F0',
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
  saveBtnText: { color: '#1B4332', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#999', fontSize: 16 },
});
