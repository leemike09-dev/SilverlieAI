import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = 'https://silverlieai.onrender.com';

type HealthRecord = {
  id: string;
  date: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  weight: number | null;
  blood_sugar: number | null;
  steps: number | null;
  notes: string | null;
};

export default function HealthScreen({ navigation, route }: any) {
  const { userId } = route.params;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');

  // 입력 상태
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // 히스토리 상태
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/health/history/${userId}?days=30`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!systolic && !diastolic && !heartRate && !weight && !bloodSugar) {
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
          blood_pressure_systolic: systolic ? parseInt(systolic) : null,
          blood_pressure_diastolic: diastolic ? parseInt(diastolic) : null,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          weight: weight ? parseFloat(weight) : null,
          blood_sugar: bloodSugar ? parseFloat(bloodSugar) : null,
          notes: notes || null,
        }),
      });
      Alert.alert('', t.saveSuccess);
      setSystolic(''); setDiastolic(''); setHeartRate('');
      setWeight(''); setBloodSugar(''); setNotes('');
    } catch {
      Alert.alert('', t.saveError);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.healthTitle}</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'input' && styles.tabActive]}
          onPress={() => setActiveTab('input')}
        >
          <Text style={[styles.tabText, activeTab === 'input' && styles.tabTextActive]}>{t.recordInputTab}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>{t.historyTab}</Text>
        </TouchableOpacity>
      </View>

      {/* 입력 탭 */}
      {activeTab === 'input' && (
        <ScrollView>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.bloodPressure}</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t.systolicPlaceholder}
                value={systolic}
                onChangeText={setSystolic}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t.diastolicPlaceholder}
                value={diastolic}
                onChangeText={setDiastolic}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.heartRate}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.heartRatePlaceholder}
              value={heartRate}
              onChangeText={setHeartRate}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.weight}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.weightPlaceholder}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.bloodSugar}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.bloodSugarPlaceholder}
              value={bloodSugar}
              onChangeText={setBloodSugar}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t.notesPlaceholder}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t.saveButton}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 히스토리 탭 */}
      {activeTab === 'history' && (
        <ScrollView>
          {historyLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#2D6A4F" />
              <Text style={styles.loadingText}>{t.aiAnalyzing}</Text>
            </View>
          ) : records.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>{t.noHistory}</Text>
              <Text style={styles.emptySubText}>{t.recordInputTab}</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              <Text style={styles.historyCount}>최근 {records.length}개 기록</Text>
              {records.map((r, i) => (
                <View key={i} style={styles.recordCard}>
                  <Text style={styles.recordDate}>{formatDate(r.date)}</Text>
                  <View style={styles.metricsRow}>
                    {r.blood_pressure_systolic && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>❤️</Text>
                        <Text style={styles.metricText}>{r.blood_pressure_systolic}/{r.blood_pressure_diastolic}</Text>
                        <Text style={styles.metricUnit}>mmHg</Text>
                      </View>
                    )}
                    {r.heart_rate && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>💓</Text>
                        <Text style={styles.metricText}>{r.heart_rate}</Text>
                        <Text style={styles.metricUnit}>bpm</Text>
                      </View>
                    )}
                    {r.weight && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>⚖️</Text>
                        <Text style={styles.metricText}>{r.weight}</Text>
                        <Text style={styles.metricUnit}>kg</Text>
                      </View>
                    )}
                    {r.blood_sugar && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>🩸</Text>
                        <Text style={styles.metricText}>{r.blood_sugar}</Text>
                        <Text style={styles.metricUnit}>mg/dL</Text>
                      </View>
                    )}
                    {r.steps && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>🚶</Text>
                        <Text style={styles.metricText}>{r.steps.toLocaleString()}</Text>
                        <Text style={styles.metricUnit}>{t.metricStepsUnit}</Text>
                      </View>
                    )}
                  </View>
                  {r.notes && <Text style={styles.recordNotes}>{r.notes}</Text>}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: 60,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 14 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DC',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#2D6A4F',
  },
  tabText: { fontSize: 16, color: '#999', fontWeight: '600' },
  tabTextActive: { color: '#2D6A4F' },
  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginBottom: 4,
  },
  halfInput: { flex: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: {
    margin: 16,
    marginTop: 24,
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    padding: 24,
  },
  loadingText: { color: '#666', marginTop: 12, fontSize: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#555', fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 15, color: '#999', textAlign: 'center' },
  historyList: { padding: 16 },
  historyCount: { fontSize: 14, color: '#999', marginBottom: 12 },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recordDate: { fontSize: 16, fontWeight: 'bold', color: '#2D6A4F', marginBottom: 10 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDE7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  metricEmoji: { fontSize: 14 },
  metricText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  metricUnit: { fontSize: 12, color: '#888' },
  recordNotes: { marginTop: 10, fontSize: 14, color: '#666', fontStyle: 'italic' },
});
