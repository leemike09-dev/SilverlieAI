import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, Linking, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

const TYPES = [
  { label: '🏥 병원',    value: '병원' },
  { label: '👨‍⚕️ 주치의', value: '주치의' },
  { label: '💊 약국',    value: '약국' },
  { label: '🚑 응급',    value: '응급' },
  { label: '👨‍👩‍👧 가족',   value: '가족' },
  { label: '📋 기타',    value: '기타' },
];

const TYPE_ICON: Record<string, string> = {
  '병원': '🏥', '주치의': '👨‍⚕️', '약국': '💊',
  '응급': '🚑', '가족': '👨‍👩‍👧', '기타': '📋',
};

interface Contact { type: string; name: string; phone: string; }

export default function ImportantContactsScreen({ navigation, route }: any) {
  const { userId: paramUserId } = route?.params ?? {};
  const [userId,   setUserId]   = useState(paramUserId || '');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selType,  setSelType]  = useState('병원');
  const [newName,  setNewName]  = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => { if (id) setUserId(id); });
  }, []);

  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(d => { if (d.important_contacts) setContacts(d.important_contacts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const saveContacts = async (updated: Contact[]) => {
    if (!userId || userId === 'demo-user') return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ important_contacts: updated }),
      });
    } catch {} finally { setSaving(false); }
  };

  const handleAdd = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('알림', '이름과 전화번호를 모두 입력해주세요.'); return;
    }
    const updated = [...contacts, { type: selType, name: newName.trim(), phone: newPhone.trim() }];
    setContacts(updated);
    saveContacts(updated);
    setNewName(''); setNewPhone(''); setShowForm(false);
  };

  const handleDelete = (idx: number) => {
    Alert.alert('삭제', `${contacts[idx].name} 연락처를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => {
        const updated = contacts.filter((_, i) => i !== idx);
        setContacts(updated);
        saveContacts(updated);
      }},
    ]);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/-/g, '')}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F5FB' }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>중요 연락처</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {loading ? <ActivityIndicator size="large" color="#1A4A8A" style={{ marginTop: 60 }} /> : (
          <>
            {/* 안내 */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>💡 병원·약국·주치의 번호를 저장해두면{'\n'}필요할 때 바로 전화할 수 있어요</Text>
            </View>

            {/* 연락처 목록 */}
            {contacts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>아직 저장된 연락처가 없어요{'\n'}아래 버튼으로 추가해보세요</Text>
              </View>
            ) : (
              <View style={styles.listBlock}>
                {contacts.map((c, i) => (
                  <View key={i} style={[styles.contactRow, i === contacts.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.contactIcon}>{TYPE_ICON[c.type] || '📋'}</Text>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactType}>{c.type}</Text>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <Text style={styles.contactPhone}>{c.phone}</Text>
                    </View>
                    <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(c.phone)}>
                      <Text style={styles.callBtnTxt}>📞 전화</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(i)}>
                      <Text style={styles.deleteBtnTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* 추가 폼 */}
            {showForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>연락처 추가</Text>

                <Text style={styles.formLabel}>종류</Text>
                <View style={styles.chipRow}>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t.value}
                      style={[styles.chip, selType === t.value && styles.chipOn]}
                      onPress={() => setSelType(t.value)}>
                      <Text style={[styles.chipTxt, selType === t.value && styles.chipTxtOn]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>이름 / 기관명</Text>
                <TextInput style={styles.input} value={newName} onChangeText={setNewName}
                  placeholder="예: 서울성모병원, 김철수 원장님" placeholderTextColor="#7A90A8" maxLength={30} />

                <Text style={styles.formLabel}>전화번호</Text>
                <TextInput style={styles.input} value={newPhone} onChangeText={setNewPhone}
                  placeholder="예: 02-1234-5678" placeholderTextColor="#7A90A8"
                  keyboardType="phone-pad" maxLength={15} />

                <View style={styles.formBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setNewName(''); setNewPhone(''); }}>
                    <Text style={styles.cancelTxt}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addConfirmBtn} onPress={handleAdd}>
                    <Text style={styles.addConfirmTxt}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.addBtnTxt}>+ 연락처 추가</Text>
              </TouchableOpacity>
            )}

            {saving && <ActivityIndicator color="#1A4A8A" style={{ marginTop: 12 }} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1A4A8A',
    paddingTop: Platform.OS === 'web' ? 30 : (StatusBar.currentHeight ?? 28) + 8,
    paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backTxt:     { color: '#fff', fontSize: 18, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },

  body: { padding: 16, paddingBottom: 60 },

  infoBox: {
    backgroundColor: '#EBF3FB', borderRadius: 12, padding: 16,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1A4A8A',
  },
  infoText: { fontSize: 20, color: '#1A4A8A', lineHeight: 28, fontWeight: '600' },

  emptyBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 40,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#DDE8F4',
  },
  emptyText: { fontSize: 22, color: '#7A90A8', textAlign: 'center', lineHeight: 30 },

  listBlock: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#DDE8F4', marginBottom: 16, overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#EEF4FB', gap: 10,
  },
  contactIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  contactInfo: { flex: 1 },
  contactType:  { fontSize: 18, color: '#7A90A8', fontWeight: '600', marginBottom: 2 },
  contactName:  { fontSize: 22, fontWeight: '800', color: '#16273E', marginBottom: 2 },
  contactPhone: { fontSize: 20, color: '#2272B8', fontWeight: '600' },
  callBtn: {
    backgroundColor: '#1A4A8A', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  callBtnTxt: { color: '#fff', fontSize: 19, fontWeight: '700' },
  deleteBtn: { padding: 8 },
  deleteBtnTxt: { fontSize: 18, color: '#B8CCE0', fontWeight: '700' },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#DDE8F4', marginBottom: 16,
  },
  formTitle: { fontSize: 24, fontWeight: '800', color: '#16273E', marginBottom: 16 },
  formLabel: { fontSize: 20, fontWeight: '700', color: '#16273E', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#F0F5FB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 20, color: '#16273E',
    borderWidth: 1, borderColor: '#DDE8F4',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
             backgroundColor: '#F0F5FB', borderWidth: 1, borderColor: '#DDE8F4' },
  chipOn:  { backgroundColor: '#1A4A8A', borderColor: '#1A4A8A' },
  chipTxt:   { fontSize: 19, fontWeight: '600', color: '#7A90A8' },
  chipTxtOn: { color: '#fff' },
  formBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', borderWidth: 2, borderColor: '#DDE8F4',
  },
  cancelTxt: { fontSize: 20, fontWeight: '700', color: '#7A90A8' },
  addConfirmBtn: {
    flex: 1, backgroundColor: '#1A4A8A', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  addConfirmTxt: { fontSize: 20, fontWeight: '700', color: '#fff' },

  addBtn: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', borderWidth: 2, borderColor: '#1A4A8A',
  },
  addBtnTxt: { fontSize: 22, fontWeight: '800', color: '#1A4A8A' },
});
