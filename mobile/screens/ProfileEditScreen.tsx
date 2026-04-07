import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

const C = {
  blue1:  '#1A4A8A',
  blue2:  '#2272B8',
  bg:     '#F0F5FB',
  card:   '#FFFFFF',
  text:   '#16273E',
  sub:    '#7A90A8',
  line:   '#DDE8F4',
};

export default function ProfileEditScreen({ navigation, route }: any) {
  const { userId: paramUserId, name: paramName } = route?.params ?? {};

  const [userId,  setUserId]  = useState(paramUserId || '');
  const [name,    setName]    = useState(paramName || '');
  const [age,     setAge]     = useState('');
  const [height,  setHeight]  = useState('');
  const [weight,  setWeight]  = useState('');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => { if (id) setUserId(id); });
  }, []);

  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.name)   setName(data.name);
        if (data?.age)    setAge(String(data.age));
        if (data?.height) setHeight(String(data.height));
        if (data?.weight) setWeight(String(data.weight));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('알림', '이름을 입력해주세요.'); return; }
    if (userId === 'demo-user' || !userId) {
      Alert.alert('알림', '로그인 후 프로필을 수정할 수 있습니다.'); return;
    }
    setSaving(true);
    try {
      const body: any = { name: name.trim() };
      if (age)    body.age    = parseInt(age);
      if (height) body.height = parseFloat(height);
      if (weight) body.weight = parseFloat(weight);

      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await AsyncStorage.setItem('userName', name.trim());
        Alert.alert('완료', '프로필이 저장되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('오류', '저장에 실패했습니다.');
      }
    } catch {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 수정</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={C.blue1} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>기본 정보</Text>

              <Text style={styles.label}>이름</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="이름을 입력하세요" placeholderTextColor={C.sub} maxLength={20} />

              <Text style={styles.label}>나이</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge}
                placeholder="나이 (예: 65)" placeholderTextColor={C.sub}
                keyboardType="number-pad" maxLength={3} />

              <Text style={styles.label}>키 (cm)</Text>
              <TextInput style={styles.input} value={height} onChangeText={setHeight}
                placeholder="키 (예: 165)" placeholderTextColor={C.sub}
                keyboardType="decimal-pad" maxLength={5} />

              <Text style={styles.label}>몸무게 (kg)</Text>
              <TextInput style={[styles.input, { marginBottom: 0 }]} value={weight} onChangeText={setWeight}
                placeholder="몸무게 (예: 60)" placeholderTextColor={C.sub}
                keyboardType="decimal-pad" maxLength={5} />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveTxt}>저장하기</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1A4A8A',
    paddingTop: Platform.OS === 'web' ? 30 : 52,
    paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { padding: 4 },
  backTxt:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  body: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 60 },
  avatarWrap: {
    alignSelf: 'center', width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#D6E6F7', justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  avatarEmoji: { fontSize: 46 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#DDE8F4', marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#7A90A8', letterSpacing: 0.5, marginBottom: 18,
  },
  label: { fontSize: 15, fontWeight: '700', color: '#16273E', marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: '#F0F5FB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: '#16273E',
    borderWidth: 1, borderColor: '#DDE8F4', marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: '#1A4A8A', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
