import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INDIGO       = '#5C6BC0';
const BG           = '#F8F7FF';
const STORAGE_KEY  = 'health_profile';
const API_URL      = 'https://silverlieai.onrender.com';

const GENDER_OPTS  = ['남성', '여성'];
const SMOKE_OPTS   = ['안함', '과거흡연', '현재흡연'];
const DRINK_OPTS   = ['안함', '가끔', '자주'];

const emptyProfile = () => ({
  age: '', gender: '',
  diseases: '', allergies: '',
  smoking: '', drinking: '',
});

export default function HealthProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const fromRegister = route?.params?.fromRegister ?? false;
  const [profile, setProfile] = useState<any>(emptyProfile());
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored) {
        try {
          const p = JSON.parse(stored);
          // migrate old array format → string
          setProfile({
            age:      p.age      || '',
            gender:   p.gender   || '',
            diseases: Array.isArray(p.diseases) ? p.diseases.join(', ') : (p.diseases || ''),
            allergies: [
              ...(Array.isArray(p.drugAllergies) ? p.drugAllergies : []),
              ...(Array.isArray(p.foodAllergies) ? p.foodAllergies : []),
              p.allergyNote || '',
            ].filter(Boolean).join(', ') || (p.allergies || ''),
            smoking:  p.smoking  || '',
            drinking: p.drinking || '',
          });
        } catch {}
      }
    });
  }, []);

  const set = (key: string, val: string) =>
    setProfile((p: any) => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      const uid = route?.params?.userId || (await AsyncStorage.getItem('userId')) || '';
      if (uid) {
        fetch(`${API_URL}/users/${uid}/health-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile }),
        }).catch(() => {});
      }
      setSaved(true);
      setTimeout(() => {
        if (fromRegister) {
          navigation.replace('SeniorHome', {
            userId: uid,
            name: route?.params?.name || (AsyncStorage.getItem('userName') as any) || '',
          });
        } else {
          navigation.goBack();
        }
      }, 800);
    } catch {}
    setSaving(false);
  };

  const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[s.chip, selected && s.chipOn]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={[s.chipTxt, selected && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        {!fromRegister && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>건강 프로필</Text>
        <View style={{ width: fromRegister ? 0 : 72 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* 나이 */}
        <Text style={s.label}>나이</Text>
        <TextInput
          style={s.input}
          value={profile.age}
          onChangeText={v => set('age', v.replace(/[^0-9]/g, ''))}
          placeholder="예: 72"
          placeholderTextColor="#B0BEC5"
          keyboardType="number-pad"
          maxLength={3}
        />

        {/* 성별 */}
        <Text style={s.label}>성별</Text>
        <View style={s.chipRow}>
          {GENDER_OPTS.map(g => (
            <Chip key={g} label={g} selected={profile.gender === g} onPress={() => set('gender', g)} />
          ))}
        </View>

        {/* 만성질환 */}
        <Text style={s.label}>만성질환</Text>
        <Text style={s.hint}>예: 고혈압, 당뇨, 관절염</Text>
        <TextInput
          style={[s.input, s.inputMulti]}
          value={profile.diseases}
          onChangeText={v => set('diseases', v)}
          placeholder="질환명을 쉼표로 구분해서 입력하세요"
          placeholderTextColor="#B0BEC5"
          multiline
          numberOfLines={3}
        />

        {/* 알레르기 */}
        <Text style={s.label}>알레르기</Text>
        <Text style={s.hint}>예: 페니실린, 견과류, 해산물</Text>
        <TextInput
          style={[s.input, s.inputMulti]}
          value={profile.allergies}
          onChangeText={v => set('allergies', v)}
          placeholder="없으면 비워두세요"
          placeholderTextColor="#B0BEC5"
          multiline
          numberOfLines={2}
        />

        {/* 흡연 */}
        <Text style={s.label}>흡연</Text>
        <View style={s.chipRow}>
          {SMOKE_OPTS.map(o => (
            <Chip key={o} label={o} selected={profile.smoking === o} onPress={() => set('smoking', o)} />
          ))}
        </View>

        {/* 음주 */}
        <Text style={s.label}>음주</Text>
        <View style={s.chipRow}>
          {DRINK_OPTS.map(o => (
            <Chip key={o} label={o} selected={profile.drinking === o} onPress={() => set('drinking', o)} />
          ))}
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[s.saveBtn, (saving || saved) && { opacity: 0.7 }]}
          onPress={save}
          disabled={saving || saved}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveTxt}>{saved ? '저장됐습니다 ✓' : '저장하기'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: INDIGO,
    paddingBottom: 18, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { paddingVertical: 4 },
  backTxt:     { color: '#fff', fontSize: 20, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },

  body: { padding: 24, paddingBottom: 60 },

  label: {
    fontSize: 22, fontWeight: '800', color: '#2C3E50',
    marginTop: 24, marginBottom: 6,
  },
  hint: {
    fontSize: 17, color: '#90A4AE', marginBottom: 10,
  },

  input: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 22, color: '#16273E',
    borderWidth: 1.5, borderColor: '#C5CAE9',
  },
  inputMulti: {
    minHeight: 80, textAlignVertical: 'top',
    paddingTop: 16,
  },

  chipRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 30, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#C5CAE9',
  },
  chipOn:    { backgroundColor: INDIGO, borderColor: INDIGO },
  chipTxt:   { fontSize: 20, fontWeight: '600', color: '#7A90A8' },
  chipTxtOn: { color: '#fff', fontWeight: '800' },

  saveBtn: {
    backgroundColor: INDIGO, borderRadius: 20,
    paddingVertical: 24, alignItems: 'center',
    marginTop: 36,
    shadowColor: INDIGO, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3,
  },
  saveTxt: { color: '#fff', fontSize: 26, fontWeight: '900' },
});
