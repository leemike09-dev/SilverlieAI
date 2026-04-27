import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://silverlieai.onrender.com';

const INTERESTS = [
  { key: 'health',  icon: '🫀', label: '건강·의료' },
  { key: 'sports',  icon: '🏃', label: '스포츠·운동' },
  { key: 'diet',    icon: '🥗', label: '식단·영양' },
  { key: 'arts',    icon: '🎨', label: '예술·문화' },
  { key: 'it',      icon: '💻', label: 'IT·스마트기기' },
  { key: 'travel',  icon: '✈️', label: '여행·나들이' },
  { key: 'brain',   icon: '🧠', label: '치매예방·두뇌' },
  { key: 'garden',  icon: '🌿', label: '원예·반려식물' },
];

export default function ProfileSetupScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { name = '', userId = '' } = route?.params ?? {};

  const [age,      setAge]      = useState('');
  const [height,   setHeight]   = useState('');
  const [weight,   setWeight]   = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [custom,   setCustom]   = useState('');
  const [saving,   setSaving]   = useState(false);

  const toggleInterest = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const interests = [...selected, ...(custom.trim() ? [custom.trim()] : [])];
      if (userId) {
        await fetch(`${API_URL}/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            age:       age ? parseInt(age) : null,
            height:    height ? parseFloat(height) : null,
            weight:    weight ? parseFloat(weight) : null,
            interests: interests.join(','),
          }),
        });
      }
      await AsyncStorage.setItem('onboarded', 'true');
    } catch { /* 저장 실패해도 홈으로 이동 */ }
    finally { setSaving(false); }
    navigation.replace('SeniorHome', { name, userId, isGuest: false });
  };

  const handleSkip = () => {
    navigation.replace('SeniorHome', { name, userId, isGuest: false });
  };

  return (
    <View style={s.root}>

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <Text style={s.headerIcon}>🤖</Text>
        <Text style={s.headerTitle}>AI 맞춤 설정</Text>
        <Text style={s.headerSub}>더 정확한 건강 추천을 위해</Text>
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        {/* AI 안내 배너 */}
        <View style={s.aiBanner}>
          <Text style={s.aiBannerIcon}>🤖</Text>
          <Text style={s.aiBannerTxt}>
            안녕하세요 <Text style={s.aiBannerHl}>{name || '회원'}님</Text>!{' '}
            AI 맞춤 추천을 위해 기본 정보를 알려주세요. 건너뛰어도 됩니다.
          </Text>
        </View>

        {/* 신체 정보 */}
        <Text style={s.sectionTitle}>📏 기본 신체 정보</Text>
        <View style={s.bodyRow}>
          <View style={s.bodyField}>
            <TextInput style={s.bodyInput} placeholder="65" value={age}
              onChangeText={setAge} keyboardType="numeric" maxLength={3} />
            <Text style={s.bodyUnit}>세</Text>
            <Text style={s.bodyLabel}>나이</Text>
          </View>
          <View style={s.bodyField}>
            <TextInput style={s.bodyInput} placeholder="168" value={height}
              onChangeText={setHeight} keyboardType="numeric" maxLength={3} />
            <Text style={s.bodyUnit}>cm</Text>
            <Text style={s.bodyLabel}>키</Text>
          </View>
          <View style={s.bodyField}>
            <TextInput style={s.bodyInput} placeholder="68" value={weight}
              onChangeText={setWeight} keyboardType="numeric" maxLength={3} />
            <Text style={s.bodyUnit}>kg</Text>
            <Text style={s.bodyLabel}>체중</Text>
          </View>
        </View>

        {/* 관심사항 */}
        <Text style={s.sectionTitle}>🎯 관심 분야 선택 (복수 가능)</Text>
        <View style={s.interestGrid}>
          {INTERESTS.map(item => {
            const on = selected.includes(item.key);
            return (
              <TouchableOpacity key={item.key}
                style={[s.interestChip, on && s.interestChipOn]}
                onPress={() => toggleInterest(item.key)}
                activeOpacity={0.75}>
                <Text style={s.interestIcon}>{item.icon}</Text>
                <Text style={[s.interestLabel, on && s.interestLabelOn]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 직접 입력 */}
        <TextInput
          style={s.customInput}
          placeholder="✏️ 직접 입력 (예: 바둑, 낚시, 합창...)"
          value={custom}
          onChangeText={setCustom}
          placeholderTextColor="#b0bec5"
        />

        {/* 버튼 */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
            <Text style={s.skipTxt}>건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.completeBtn}
            onPress={handleComplete}
            disabled={saving}
            activeOpacity={0.85}>
            <Text style={s.completeTxt}>{saving ? '저장 중...' : '설정 완료 →'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f0f2f7' },
  header:       {
    backgroundColor: '#1a5fbc', alignItems: 'center',
    paddingBottom: 24,
  },
  headerIcon:   { fontSize: 30, marginBottom: 6 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 18, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  body:         { flex: 1 },
  bodyContent:  { padding: 18, gap: 14, paddingBottom: 40 },

  aiBanner:     { backgroundColor: '#1a3a5c', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBannerIcon: { fontSize: 22 },
  aiBannerTxt:  { flex: 1, fontSize: 18, color: '#c5dff0', lineHeight: 20 },
  aiBannerHl:   { color: '#ffd700', fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a2a3a' },

  bodyRow:      { flexDirection: 'row', gap: 10 },
  bodyField:    { flex: 1, backgroundColor: '#fff', borderRadius: 13, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e8f8' },
  bodyInput:    { fontSize: 20, fontWeight: '800', color: '#1a2a3a', textAlign: 'center', width: '100%' },
  bodyUnit:     { fontSize: 18, color: '#90a4ae', marginTop: 2 },
  bodyLabel:    { fontSize: 18, color: '#78909c', marginTop: 2 },

  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e8f8', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  interestChipOn: { backgroundColor: '#e8f0fe', borderColor: '#1a5fbc' },
  interestIcon: { fontSize: 16 },
  interestLabel: { fontSize: 18, fontWeight: '600', color: '#546e7a' },
  interestLabelOn: { color: '#1a5fbc' },

  customInput:  { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e8f8', borderStyle: 'dashed', borderRadius: 13, padding: 14, fontSize: 18, color: '#1a2a3a' },

  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  skipBtn:      { paddingVertical: 14, paddingHorizontal: 20 },
  skipTxt:      { fontSize: 18, color: '#90a4ae', borderBottomWidth: 1, borderBottomColor: '#cfd8dc' },
  completeBtn:  { flex: 1, backgroundColor: '#1a5fbc', borderRadius: 13, paddingVertical: 15, alignItems: 'center', shadowColor: '#1a5fbc', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  completeTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },
});
