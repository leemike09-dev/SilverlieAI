import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://silverlieai.onrender.com';

export default function ProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { userId: paramUserId, name: paramName } = route?.params ?? {};
  const [userId,   setUserId]   = useState(paramUserId || '');
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [name,     setName]     = useState(paramName || '');
  const [phone,    setPhone]    = useState('');

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
    if (!name.trim()) { Alert.alert('알림', '이름을 입력해 주세요.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (res.ok) {
        await AsyncStorage.setItem('userName', name.trim());
        setEditMode(false);
        Alert.alert('저장 완료', '프로필이 저장되었습니다.');
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
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* 헤더 */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>내 프로필</Text>
        {!editMode ? (
          <TouchableOpacity onPress={() => setEditMode(true)} style={s.editBtn}>
            <Text style={s.editBtnTxt}>수정</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditMode(false)} style={s.editBtn}>
            <Text style={[s.editBtnTxt, { color: '#90A4AE' }]}>취소</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color="#5C6BC0" style={{ marginTop: 60 }} />
        ) : editMode ? (
          /* ── 수정 모드 ── */
          <>
            <View style={s.card}>
              <Text style={s.label}>이름</Text>
              <TextInput style={s.input} value={name} onChangeText={setName}
                placeholder="이름을 입력하세요" placeholderTextColor="#B0BEC5" maxLength={20} />
              <Text style={s.label}>전화번호</Text>
              <TextInput style={s.input} value={phone} onChangeText={setPhone}
                placeholder="010-0000-0000" placeholderTextColor="#B0BEC5"
                keyboardType="phone-pad" maxLength={15} />
            </View>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveTxt}>저장하기</Text>}
            </TouchableOpacity>
          </>
        ) : (
          /* ── 보기 모드 ── */
          <>
            <View style={s.card}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>이름</Text>
                <Text style={s.infoValue}>{name || '—'}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>전화번호</Text>
                <Text style={s.infoValue}>{phone || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.healthBtn}
              onPress={() => navigation.navigate('HealthProfile', { userId })}
              activeOpacity={0.85}>
              <Text style={s.healthBtnIcon}>🏥</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.healthBtnTxt}>건강 프로필 보기 · 편집</Text>
                <Text style={s.healthBtnSub}>나이 · 키 · 체중 · 질환 · 알레르기</Text>
              </View>
              <Text style={s.healthBtnArrow}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#fff', paddingBottom: 14, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn:     { paddingVertical: 4, minWidth: 60 },
  backTxt:     { color: '#5C6BC0', fontSize: 17, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#16273E' },
  editBtn:     { minWidth: 60, alignItems: 'flex-end' },
  editBtnTxt:  { fontSize: 17, fontWeight: '700', color: '#5C6BC0' },

  body: { padding: 20, paddingBottom: 60, gap: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  infoRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: 18, paddingVertical: 16 },
  infoLabel: { fontSize: 15, color: '#7A90A8', fontWeight: '600' },
  infoValue: { fontSize: 16, color: '#16273E', fontWeight: '700' },
  divider:   { height: 1, backgroundColor: '#F0F0F0' },

  label: { fontSize: 14, fontWeight: '700', color: '#7A90A8', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#F8F9FA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 17, color: '#16273E',
    borderWidth: 1, borderColor: '#E8E8E8',
    marginBottom: 14,
  },

  healthBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: '#D1D5F0',
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  healthBtnIcon:  { fontSize: 28 },
  healthBtnTxt:   { fontSize: 17, fontWeight: '700', color: '#5C6BC0', marginBottom: 2 },
  healthBtnSub:   { fontSize: 13, color: '#90A4AE' },
  healthBtnArrow: { fontSize: 22, color: '#5C6BC0' },

  saveBtn: {
    backgroundColor: '#5C6BC0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },

});
