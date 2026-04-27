import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

const C = {
  indigo:    '#5C6BC0',
  indigoLt:  '#7986CB',
  bg:        '#F0F0F8',
  card:      '#FFFFFF',
  text:      '#16273E',
  sub:       '#7A90A8',
  line:      '#D1D5F0',
  reason:    '#E8EAF6',
};

const CHAT_OPTIONS      = ['짧고 핵심만', '자세하게'];
const INTERESTS_OPTIONS = [
  '건강·운동', '요리·식단', '여행', '독서',
  '음악·영화', '손주·가족', '종교·명상', '사교모임',
];

export default function ProfileScreen({ navigation, route }: any) {
  const { userId: paramUserId, name: paramName } = route?.params ?? {};
  const [userId,  setUserId]  = useState(paramUserId || '');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // 기본 정보
  const [name,   setName]   = useState(paramName || '');
  const [phone,  setPhone]  = useState('');
  const [region, setRegion] = useState('');

  // AI 성향
  const [chatStyle, setChatStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => { if (id) setUserId(id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.name)       setName(d.name);
        if (d.phone)      setPhone(d.phone);
        if (d.region)     setRegion(d.region);
        if (d.chat_style) setChatStyle(d.chat_style);
        if (d.interests)  setInterests(d.interests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('알림', '로그인 후 프로필을 저장할 수 있습니다.'); return;
    }
    setSaving(true);
    try {
      const body: any = {};
      if (name.trim())   body.name   = name.trim();
      if (phone.trim())  body.phone  = phone.trim();
      if (region.trim()) body.region = region.trim();
      if (chatStyle)     body.chat_style = chatStyle;
      if (interests.length > 0) body.interests = interests;

      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (name.trim()) await AsyncStorage.setItem('userName', name.trim());
        Alert.alert('저장 완료', '프로필이 저장되었습니다!', [
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

  const renderChip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label}
      style={[styles.chip, selected && styles.chipOn]}
      onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.chipTxt, selected && styles.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 프로필</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading
          ? <ActivityIndicator size="large" color={C.indigo} style={{ marginTop: 60 }} />
          : (
          <>
            {/* 기본 정보 */}
            <Text style={styles.sectionTitle}>기본 정보</Text>
            <View style={styles.card}>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTxt}>
                  💡 이름과 연락처는 가족 연결과 SOS 도움 요청 시 사용됩니다
                </Text>
              </View>
              <Text style={styles.label}>이름</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="이름을 입력하세요" placeholderTextColor={C.sub} maxLength={20} />
              <Text style={styles.label}>전화번호</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="예: 010-1234-5678" placeholderTextColor={C.sub}
                keyboardType="phone-pad" maxLength={15} />
              <Text style={styles.label}>거주 지역</Text>
              <TextInput style={styles.input} value={region} onChangeText={setRegion}
                placeholder="예: 서울 강남구" placeholderTextColor={C.sub} maxLength={20} />
            </View>

            {/* AI 상담 설정 */}
            <Text style={styles.sectionTitle}>AI 상담 설정</Text>
            <View style={styles.card}>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTxt}>
                  💡 관심사와 대화 스타일을 알면 꼭비가 더 맞침형으로 대화할 수 있어요
                </Text>
              </View>
              <Text style={styles.label}>AI 대화 스타일</Text>
              <View style={styles.chipRow}>
                {CHAT_OPTIONS.map(c => renderChip(c, chatStyle === c, () => setChatStyle(c)))}
              </View>
              <Text style={styles.label}>관심 분야 (여러 개 선택)</Text>
              <View style={styles.chipRow}>
                {INTERESTS_OPTIONS.map(i => renderChip(i, interests.includes(i), () => toggleInterest(i)))}
              </View>
            </View>

            {/* 건강 프로필 안내 */}
            <TouchableOpacity
              style={styles.healthProfileBtn}
              onPress={() => navigation.navigate('HealthProfile', { userId })}
              activeOpacity={0.85}>
              <Text style={styles.healthProfileIco}>🏥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.healthProfileTxt}>건강 프로필 편집</Text>
                <Text style={styles.healthProfileSub}>나이·탴·체중·질환·알레르기 등</Text>
              </View>
              <Text style={styles.healthProfileArrow}>›</Text>
            </TouchableOpacity>

            {/* 저장 버튼 */}
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
    backgroundColor: '#5C6BC0',
    paddingTop: Platform.OS === 'web' ? 30 : (StatusBar.currentHeight ?? 28) + 8,
    paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backTxt:     { color: '#fff', fontSize: 18, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },

  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 },

  sectionTitle: {
    fontSize: 16, color: '#7A90A8', fontWeight: '700',
    marginBottom: 10, letterSpacing: 0.5, marginTop: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#D1D5F0', marginBottom: 20,
  },
  reasonBox: {
    backgroundColor: '#E8EAF6', borderRadius: 12,
    padding: 14, marginBottom: 18, borderLeftWidth: 4, borderLeftColor: '#5C6BC0',
  },
  reasonTxt: { fontSize: 16, color: '#5C6BC0', lineHeight: 23, fontWeight: '600' },

  label: { fontSize: 18, fontWeight: '700', color: '#16273E', marginBottom: 10, marginTop: 14 },
  input: {
    backgroundColor: '#F0F0F8', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 19, color: '#16273E', borderWidth: 1, borderColor: '#D1D5F0',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#F0F0F8', borderWidth: 1, borderColor: '#D1D5F0',
  },
  chipOn:     { backgroundColor: '#5C6BC0', borderColor: '#5C6BC0' },
  chipTxt:    { fontSize: 17, fontWeight: '600', color: '#7A90A8' },
  chipTxtOn:  { color: '#fff' },

  healthProfileBtn: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 18, borderWidth: 1.5, borderColor: '#5C6BC0',
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  healthProfileIco:   { fontSize: 30 },
  healthProfileTxt:   { fontSize: 20, fontWeight: '800', color: '#5C6BC0', marginBottom: 3 },
  healthProfileSub:   { fontSize: 16, color: '#7A90A8' },
  healthProfileArrow: { fontSize: 26, color: '#5C6BC0', fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#5C6BC0', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
