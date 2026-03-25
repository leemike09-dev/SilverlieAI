import React, { useState } from 'react';
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

const API_URL = 'https://silverlieai.onrender.com';

export default function HealthScreen({ navigation, route }: any) {
  const { userId } = route.params;
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!systolic && !diastolic && !heartRate && !weight && !bloodSugar) {
      Alert.alert('알림', '최소 하나의 항목을 입력해주세요.');
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
      Alert.alert('저장 완료', '건강 기록이 저장되었습니다.');
      setSystolic(''); setDiastolic(''); setHeartRate('');
      setWeight(''); setBloodSugar(''); setNotes('');
    } catch (error) {
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>건강 기록</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>혈압 (mmHg)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="수축기 (예: 120)"
            value={systolic}
            onChangeText={setSystolic}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="이완기 (예: 80)"
            value={diastolic}
            onChangeText={setDiastolic}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>심박수 (bpm)</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 72"
          value={heartRate}
          onChangeText={setHeartRate}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>체중 (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 65.5"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>혈당 (mg/dL)</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 95"
          value={bloodSugar}
          onChangeText={setBloodSugar}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>메모</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="오늘 몸 상태를 기록해보세요"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>저장하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    backgroundColor: '#2e86ab',
    padding: 20,
    paddingTop: 60,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: '#cce8f4',
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
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
  halfInput: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    margin: 16,
    marginTop: 24,
    backgroundColor: '#2e86ab',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
