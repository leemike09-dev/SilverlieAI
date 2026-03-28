import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

const API_URL = 'https://silverlieai.onrender.com';

type ReportData = {
  health_score: number;
  summary: string;
  achievements: string[];
  improvements: string[];
  recommendation: string;
};

export default function WeeklyReportScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      const res = await fetch(`${API_URL}/health/history/${userId}?days=7`);
      const data = await res.json();
      setWeeklyData(data.records || []);
    } catch {}
  };

  const generateReport = async () => {
    if (weeklyData.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/health/weekly-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_name: name,
          age: 65,
          weekly_data: weeklyData.map(r => ({
            date: r.date,
            steps: r.steps,
            blood_pressure_systolic: r.blood_pressure_systolic,
            blood_pressure_diastolic: r.blood_pressure_diastolic,
            sleep_hours: null,
            weight_kg: r.weight,
          })),
        }),
      });
      const data = await res.json();
      setReport(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return '#2D6A4F';
    if (score >= 60) return '#C77B3A';
    return '#E07B54';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.weeklyTitle}</Text>
        <Text style={styles.subtitle}>{t.weeklySubtitle}</Text>
      </View>

      {/* 주간 데이터 요약 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.weeklyRecordsTitle}</Text>
        {weeklyData.length === 0 ? (
          <Text style={styles.emptyText}>{t.weeklyEmpty}</Text>
        ) : (
          weeklyData.slice(0, 7).map((record, i) => (
            <View key={i} style={styles.recordRow}>
              <Text style={styles.recordDate}>{record.date}</Text>
              <View style={styles.recordValues}>
                {record.steps && <Text style={styles.recordTag}>🚶 {record.steps.toLocaleString()}</Text>}
                {record.blood_pressure_systolic && (
                  <Text style={styles.recordTag}>❤️ {record.blood_pressure_systolic}/{record.blood_pressure_diastolic}</Text>
                )}
                {record.weight && <Text style={styles.recordTag}>⚖️ {record.weight}kg</Text>}
              </View>
            </View>
          ))
        )}
      </View>

      {/* AI 리포트 생성 버튼 */}
      {weeklyData.length > 0 && !report && (
        <TouchableOpacity style={styles.generateBtn} onPress={generateReport} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>{t.generateReportBtn}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* 리포트 결과 */}
      {report && (
        <>
          {/* 건강 점수 */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>{t.weeklyScoreLabel}</Text>
            <Text style={[styles.scoreValue, { color: scoreColor(report.health_score) }]}>
              {report.health_score}
            </Text>
            <Text style={styles.scoreMax}>/ 100</Text>
            <Text style={styles.scoreSummary}>{report.summary}</Text>
          </View>

          {/* 잘한 점 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.weeklyAchievements}</Text>
            {report.achievements.map((a, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listDot}>•</Text>
                <Text style={styles.listText}>{a}</Text>
              </View>
            ))}
          </View>

          {/* 개선할 점 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.weeklyImprovements}</Text>
            {report.improvements.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listDot}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 핵심 권고 */}
          <View style={[styles.card, styles.recommendCard]}>
            <Text style={styles.recommendTitle}>{t.weeklyRecommendTitle}</Text>
            <Text style={styles.recommendText}>{report.recommendation}</Text>
          
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
      </ScrollView>
      <BottomTabBar navigation={navigation} activeTab="health" userId={userId} name={name} />
    </View>
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
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1B4332' },
  subtitle: { fontSize: 15, color: '#52B788', marginTop: 4 },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1A17', marginBottom: 12 },
  emptyText: { color: '#999', fontSize: 15, textAlign: 'center', paddingVertical: 12 },
  recordRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE7',
  },
  recordDate: { fontSize: 16, color: '#7A746A', marginBottom: 4 },
  recordValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recordTag: { fontSize: 16, color: '#333', backgroundColor: '#FFF8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  generateBtn: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scoreCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreLabel: { fontSize: 16, color: '#7A746A', marginBottom: 8 },
  scoreValue: { fontSize: 72, fontWeight: 'bold' },
  scoreMax: { fontSize: 18, color: '#999', marginTop: -8 },
  scoreSummary: { fontSize: 16, color: '#4A4540', textAlign: 'center', marginTop: 12, lineHeight: 24 },
  listRow: { flexDirection: 'row', marginBottom: 8 },
  listDot: { color: '#2D6A4F', fontSize: 16, marginRight: 8 },
  listText: { fontSize: 17, color: '#4A4540', flex: 1, lineHeight: 26 },
  recommendCard: {
    backgroundColor: '#2D6A4F',
  },
  recommendTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  recommendText: { fontSize: 16, color: '#B7E4C7', lineHeight: 26 },
});
