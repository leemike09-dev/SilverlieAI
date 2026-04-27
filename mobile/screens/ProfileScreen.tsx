import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

export default function ProfileScreen({ navigation, route }: any) {
  const { userId: paramUserId, name: paramName } = route?.params ?? {};
  const [userId,  setUserId]  = useState(paramUserId || '');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [name,    setName]    = useState(paramName || '');
  const [phone,   setPhone]   = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => { if (id) setUserId(id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.name)  setName(d.name);
        if (d.phone) setPhone(d.phone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!userId) {
      Alert.alert('알림', '로그인 후 저장할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (res.ok) {
        await AsyncStorage.setItem('userName', name.trim());
        Alert.alert('저장 완료', '프로필이 저장되었습니다.', [
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
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>내 프로필</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#5C6BC0" style={{ marginTop: 80 }} />
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.label}>이름</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="이름을 입력하세요"
                placeholderTextColor="#B0BEC5"
                maxLength={20}
              />

              <Text style={s.label}>전화번호</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="010-0000-0000"
                placeholderTextColor="#B0BEC5"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            <TouchableOpacity
              style={s.healthBtn}
              onPress={() => navigation.navigate('HealthProfile', { userId })}
              activeOpacity={0.85}
            >
              <Text style={s.healthBtnIcon}>🏥</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.healthBtnTxt}>건강 프로필 편집</Text>
                <Text style={s.healthBtnSub}>나이·키·체중·질환·알레르기</Text>
              </View>
              <Text style={s.healthBtnArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveTxt}>저장하기</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F0F8' },

  header: {
    backgroundColor: '#5C6BC0',
    paddingTop: Platform.OS === 'web' ? 30 : (StatusBar.currentHeight ?? 28) + 8,
    paddingBottom: 18, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { paddingVertical: 4 },
  backTxt:     { color: '#fff', fontSize: 20, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },

  body: { padding: 24, paddingBottom: 60 },

  card: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#D1D5F0',
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  label: {
    fontSize: 22, fontWeight: '700', color: '#37474F',
    marginBottom: 12, marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F6FF', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 24, color: '#16273E',
    borderWidth: 1.5, borderColor: '#C5CAE9',
    marginBottom: 8,
  },

  healthBtn: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 22, borderWidth: 1.5, borderColor: '#5C6BC0',
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  healthBtnIcon:  { fontSize: 34 },
  healthBtnTxt:   { fontSize: 22, fontWeight: '800', color: '#5C6BC0', marginBottom: 4 },
  healthBtnSub:   { fontSize: 18, color: '#90A4AE' },
  healthBtnArrow: { fontSize: 30, color: '#5C6BC0', fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#5C6BC0', borderRadius: 20,
    paddingVertical: 24, alignItems: 'center',
    shadowColor: '#5C6BC0', shadowOpacity: 0.3, shadowRadius: 10, elevation: 3,
  },
  saveTxt: { color: '#fff', fontSize: 26, fontWeight: '900' },
});
