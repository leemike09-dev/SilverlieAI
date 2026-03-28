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
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import BottomTabBar from '../components/BottomTabBar';

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
  source: string | null;
};

export default function HealthScreen({ navigation, route }: any) {
  const { userId, name = '' } = route.params;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');

  // 입력 상태
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [steps, setSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // 히스토리 상태
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 수정 모달 상태
  const [editRecord, setEditRecord] = useState<HealthRecord | null>(null);
  const [editSystolic, setEditSystolic] = useState('');
  const [editDiastolic, setEditDiastolic] = useState('');
  const [editHeartRate, setEditHeartRate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editBloodSugar, setEditBloodSugar] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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
    if (!systolic && !diastolic && !heartRate && !weight && !bloodSugar && !steps) {
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
          steps: steps ? parseInt(steps) : null,
          notes: notes || null,
        }),
      });
      // 알림 설정 확인 후 자동 생성
      try {
        const userRes = await fetch(`${API_URL}/users/${userId}`);
        const userData = await userRes.json();
        if (userData.notification_health !== false) { // 기본값 true
          await fetch(`${API_URL}/notifications/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              title: t.notifHealthSaved,
              body: t.notifHealthSavedBody,
            }),
          });
        }
      } catch {}
      setSystolic(''); setDiastolic(''); setHeartRate('');
      setWeight(''); setBloodSugar(''); setSteps(''); setNotes('');
      setActiveTab('history');
      fetchHistory();
      Alert.alert('', t.saveSuccess, [
        { text: t.home ?? '홈으로', onPress: () => navigation.navigate('Home', { userId, name }) },
        { text: t.historyTab ?? '기록 보기', style: 'cancel' },
      ]);
    } catch {
      Alert.alert('', t.saveError);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (record: HealthRecord) => {
    setEditRecord(record);
    setEditSystolic(record.blood_pressure_systolic ? String(record.blood_pressure_systolic) : '');
    setEditDiastolic(record.blood_pressure_diastolic ? String(record.blood_pressure_diastolic) : '');
    setEditHeartRate(record.heart_rate ? String(record.heart_rate) : '');
    setEditWeight(record.weight ? String(record.weight) : '');
    setEditBloodSugar(record.blood_sugar ? String(record.blood_sugar) : '');
    setEditSteps(record.steps ? String(record.steps) : '');
    setEditNotes(record.notes || '');
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      const updates: any = {};
      if (editSystolic) updates.blood_pressure_systolic = parseInt(editSystolic);
      if (editDiastolic) updates.blood_pressure_diastolic = parseInt(editDiastolic);
      if (editHeartRate) updates.heart_rate = parseInt(editHeartRate);
      if (editWeight) updates.weight = parseFloat(editWeight);
      if (editBloodSugar) updates.blood_sugar = parseFloat(editBloodSugar);
      if (editSteps) updates.steps = parseInt(editSteps);
      if (editNotes) updates.notes = editNotes;

      await fetch(`${API_URL}/health/records/${editRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setEditRecord(null);
      Alert.alert('', t.updateSuccess);
      fetchHistory();
    } catch {
      Alert.alert('', t.saveError);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (record: HealthRecord) => {
    Alert.alert(t.deleteConfirmTitle, t.deleteConfirmMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/health/records/${record.id}`, { method: 'DELETE' });
            Alert.alert('', t.deleteSuccess);
            fetchHistory();
          } catch {
            Alert.alert('', t.saveError);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
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
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
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
            <Text style={styles.sectionTitle}>{t.steps}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.stepsPlaceholder}
              value={steps}
              onChangeText={setSteps}
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
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
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
              <Text style={styles.historyCount}>{records.length}</Text>
              {records.map((r, i) => (
                <View key={i} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.recordDate}>{formatDate(r.date)}</Text>
                      {r.source === 'wearable' && (
                        <View style={styles.sourceBadge}>
                          <Text style={styles.sourceBadgeText}>⌚ 웨어러블</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.actionBtns}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(r)}>
                        <Text style={styles.editBtnText}>{t.edit}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r)}>
                        <Text style={styles.deleteBtnText}>{t.delete}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
                    {r.steps && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>🚶</Text>
                        <Text style={styles.metricText}>{r.steps}</Text>
                        <Text style={styles.metricUnit}>{t.stepsUnit}</Text>
                      </View>
                    )}
                    {r.blood_sugar && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricEmoji}>🩸</Text>
                        <Text style={styles.metricText}>{r.blood_sugar}</Text>
                        <Text style={styles.metricUnit}>mg/dL</Text>
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

      {/* 수정 모달 */}
      <Modal visible={!!editRecord} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t.editModalTitle}</Text>
            {editRecord && <Text style={styles.modalDate}>{editRecord.date}</Text>}

            <View style={styles.row}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder={t.systolicBPPlaceholder}
                value={editSystolic}
                onChangeText={setEditSystolic}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { flex: 1, marginLeft: 8 }]}
                placeholder={t.diastolicBPPlaceholder}
                value={editDiastolic}
                onChangeText={setEditDiastolic}
                keyboardType="numeric"
              />
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder={t.heartRatePlaceholder}
              value={editHeartRate}
              onChangeText={setEditHeartRate}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={t.weightPlaceholder}
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={t.bloodSugarPlaceholder}
              value={editBloodSugar}
              onChangeText={setEditBloodSugar}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={t.stepsPlaceholder}
              value={editSteps}
              onChangeText={setEditSteps}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder={t.notesPlaceholder}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
            />

            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={editLoading}>
              {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>{t.updateButton}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditRecord(null)}>
              <Text style={styles.cancelBtnText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    
      <BottomTabBar navigation={navigation} activeTab="health" userId={userId} name={name} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  header: {
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 14 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1B4332' },
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
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordDate: { fontSize: 16, fontWeight: 'bold', color: '#2D6A4F' },
  sourceBadge: { backgroundColor: '#E0F2FE', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sourceBadgeText: { fontSize: 11, color: '#0C4A6E', fontWeight: '700' },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: { color: '#2D6A4F', fontSize: 14, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#FDECEA',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  deleteBtnText: { color: '#C0392B', fontSize: 14, fontWeight: '600' },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1A17', marginBottom: 4 },
  modalDate: { fontSize: 14, color: '#999', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  updateBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  updateBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#999', fontSize: 16 },
});
