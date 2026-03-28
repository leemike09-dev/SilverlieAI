import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';

const INTENSITY_COLOR: Record<string, string> = {
  '저강도': '#52B788',
  '중강도': '#F59E0B',
  '고강도': '#EF4444',
  'Low':    '#52B788',
  'Medium': '#F59E0B',
  'High':   '#EF4444',
  '低強度': '#52B788',
  '中強度': '#F59E0B',
  '高強度': '#EF4444',
  '低强度': '#52B788',
  '中强度': '#F59E0B',
  '高强度': '#EF4444',
};

type Exercise = {
  emoji: string;
  name: string;
  duration: string;
  method: string;
  caution: string;
  intensity: string;
};

export default function DashboardScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { t, language } = useLanguage();

  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [exercises,   setExercises]   = useState<Exercise[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [done,        setDone]        = useState(false);

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    try {
      const res  = await fetch(`${API_URL}/health/history/${userId}?days=1`);
      const data = await res.json();
      const rec  = data.records?.[0] || null;
      setTodayRecord(rec);
      if (rec) getExercises(rec);
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const getExercises = async (rec?: any) => {
    const record = rec || todayRecord;
    setAiLoading(true);
    setDone(false);
    try {
      const res = await fetch(`${API_URL}/health/exercise-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:                  userId,
          user_name:                name,
          age:                      65,
          steps:                    record?.steps || null,
          blood_pressure_systolic:  record?.blood_pressure_systolic || null,
          blood_pressure_diastolic: record?.blood_pressure_diastolic || null,
          heart_rate:               record?.heart_rate || null,
          weight_kg:                record?.weight || null,
          blood_sugar:              record?.blood_sugar || null,
          language:                 language || 'ko',
        }),
      });
      const data = await res.json();
      setExercises(data.data?.exercises || []);
      setDone(true);
    } catch {}
    finally {
      setAiLoading(false);
      setLoading(false);
    }
  };

  const intensityColor = (i: string) => INTENSITY_COLOR[i] || '#52B788';

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏃 오늘의 AI 운동 처방</Text>
        <Text style={styles.subtitle}>{name}님의 건강 수치 기반 맞춤 운동</Text>
      </View>

      {/* 오늘 수치 요약 */}
      {todayRecord && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 오늘의 건강 수치</Text>
          <View style={styles.summaryRow}>
            {todayRecord.blood_pressure_systolic && (
              <View style={styles.summaryChip}>
                <Text style={styles.chipIcon}>💓</Text>
                <Text style={styles.chipVal}>{todayRecord.blood_pressure_systolic}/{todayRecord.blood_pressure_diastolic}</Text>
                <Text style={styles.chipUnit}>mmHg</Text>
              </View>
            )}
            {todayRecord.heart_rate && (
              <View style={styles.summaryChip}>
                <Text style={styles.chipIcon}>🫀</Text>
                <Text style={styles.chipVal}>{todayRecord.heart_rate}</Text>
                <Text style={styles.chipUnit}>bpm</Text>
              </View>
            )}
            {todayRecord.steps && (
              <View style={styles.summaryChip}>
                <Text style={styles.chipIcon}>🚶</Text>
                <Text style={styles.chipVal}>{todayRecord.steps.toLocaleString()}</Text>
                <Text style={styles.chipUnit}>보</Text>
              </View>
            )}
            {todayRecord.weight && (
              <View style={styles.summaryChip}>
                <Text style={styles.chipIcon}>⚖️</Text>
                <Text style={styles.chipVal}>{todayRecord.weight}</Text>
                <Text style={styles.chipUnit}>kg</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 로딩 */}
      {(loading || aiLoading) && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>AI가 운동을 처방하는 중...</Text>
          <Text style={styles.loadingSub}>건강 수치를 분석하고 있어요 🤖</Text>
        </View>
      )}

      {/* 기록 없음 */}
      {!loading && !aiLoading && !todayRecord && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>오늘의 건강 수치가 없습니다{'\n'}건강기록 화면에서 수치를 입력하면{'\n'}AI가 맞춤 운동을 처방해드려요!</Text>
        </View>
      )}

      {/* 운동 카드 */}
      {done && exercises.length > 0 && (
        <View style={styles.exerciseList}>
          {exercises.map((ex, i) => (
            <View key={i} style={styles.exCard}>
              {/* 카드 상단 */}
              <View style={styles.exHeader}>
                <Text style={styles.exEmoji}>{ex.emoji}</Text>
                <View style={styles.exTitleBox}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exDuration}>⏱ {ex.duration}</Text>
                </View>
                <View style={[styles.intensityBadge, { backgroundColor: intensityColor(ex.intensity) + '22', borderColor: intensityColor(ex.intensity) }]}>
                  <Text style={[styles.intensityText, { color: intensityColor(ex.intensity) }]}>{ex.intensity}</Text>
                </View>
              </View>

              {/* 방법 */}
              <View style={styles.methodBox}>
                <Text style={styles.methodLabel}>📌 방법</Text>
                <Text style={styles.methodText}>{ex.method}</Text>
              </View>

              {/* 주의사항 */}
              {ex.caution ? (
                <View style={styles.cautionBox}>
                  <Text style={styles.cautionText}>⚠️ {ex.caution}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {/* 다시 처방받기 */}
          <TouchableOpacity style={styles.retryBtn} onPress={() => getExercises()}>
            <Text style={styles.retryBtnText}>🔄 다시 처방받기</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },

  header: {
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 24,
  },
  backBtn:  { marginBottom: 8 },
  backText: { color: '#52B788', fontSize: 16 },
  title:    { fontSize: 24, fontWeight: 'bold', color: '#1B4332' },
  subtitle: { fontSize: 13, color: '#52B788', marginTop: 4 },

  summaryCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#1B4332', marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryChip:  { alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  chipIcon:     { fontSize: 18, marginBottom: 2 },
  chipVal:      { fontSize: 16, fontWeight: 'bold', color: '#1B4332' },
  chipUnit:     { fontSize: 10, color: '#888' },

  loadingBox:  { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  loadingText: { marginTop: 16, fontSize: 18, color: '#1B4332', fontWeight: 'bold' },
  loadingSub:  { marginTop: 6, fontSize: 14, color: '#888' },

  emptyBox:  { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyEmoji:{ fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 26 },

  exerciseList: { padding: 16, gap: 14 },

  exCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  exHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  exEmoji:     { fontSize: 40 },
  exTitleBox:  { flex: 1 },
  exName:      { fontSize: 18, fontWeight: 'bold', color: '#1B4332' },
  exDuration:  { fontSize: 13, color: '#52B788', marginTop: 2 },
  intensityBadge: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  intensityText:  { fontSize: 12, fontWeight: 'bold' },

  methodBox:   { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 10 },
  methodLabel: { fontSize: 12, fontWeight: 'bold', color: '#2D6A4F', marginBottom: 4 },
  methodText:  { fontSize: 14, color: '#333', lineHeight: 22 },

  cautionBox:  { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10 },
  cautionText: { fontSize: 13, color: '#78350F', lineHeight: 20 },

  retryBtn: {
    marginTop: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#52B788',
  },
  retryBtnText: { color: '#2D6A4F', fontSize: 16, fontWeight: 'bold' },
});
