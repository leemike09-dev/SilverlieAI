import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INDIGO      = '#5C6BC0';
const BLUE        = '#3B82F6';
const INK         = '#0F1B2D';
const INK_SOFT    = '#3D4B62';
const INK_MUTE    = '#7E8AA1';
const APP_BG_TOP  = '#F1ECE4';
const APP_BG_BOT  = '#FBF8F3';
const STORAGE_KEY = 'health_profile';
const API_URL     = 'https://silverlieai.onrender.com';

// ─── 타입 ──────────────────────────────────────────────
type PastCategory = 'cancer' | 'cardiac' | 'stroke' | 'fracture' | 'surgery' | 'other';
type PastStatus   = 'resolved' | 'ongoing';

interface PastEvent {
  label:    string;
  category: PastCategory;
  year?:    number;
  status?:  PastStatus;
}

// ─── 선택지 상수 ────────────────────────────────────────
const GENDER_OPTS  = ['남성', '여성'];
const SMOKE_OPTS   = ['안함', '과거흡연', '현재흡연'];
const DRINK_OPTS   = ['안함', '가끔', '자주'];

const CONDITIONS_OPTS = ['고혈압', '당뇨', '관절염', '고지혈증', '심장질환', '신장질환', '폐질환'];

const PAST_HISTORY_OPTS: Array<{ label: string; category: PastCategory }> = [
  { label: '암·종양',         category: 'cancer'   },
  { label: '뇌졸중',          category: 'stroke'   },
  { label: '심근경색·심장수술', category: 'cardiac'  },
  { label: '골절·낙상',       category: 'fracture' },
  { label: '기타 수술',        category: 'surgery'  },
];

const FAMILY_HISTORY_OPTS = ['당뇨', '심장질환', '암', '뇌졸중', '고혈압'];

const emptyProfile = () => ({ age: '', gender: '', allergies: '', smoking: '', drinking: '' });

export default function HealthProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const fromRegister = route?.params?.fromRegister ?? false;

  const [profile,       setProfile]       = useState<any>(emptyProfile());
  const [conditions,    setConditions]    = useState<string[]>([]);
  const [pastHistory,   setPastHistory]   = useState<PastEvent[]>([]);
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (!stored) return;
      try {
        const p = JSON.parse(stored);
        setProfile({
          age:      p.age      || '',
          gender:   p.gender   || '',
          allergies: p.allergies || [
            ...(Array.isArray(p.drugAllergies) ? p.drugAllergies : []),
            ...(Array.isArray(p.foodAllergies) ? p.foodAllergies : []),
            p.allergyNote || '',
          ].filter(Boolean).join(', '),
          smoking:  p.smoking  || '',
          drinking: p.drinking || '',
        });

        // 현재 만성질환 — 신규 배열 or 구 문자열 마이그레이션
        if (Array.isArray(p.conditions) && p.conditions.length > 0) {
          setConditions(p.conditions);
        } else if (p.diseases) {
          const str = Array.isArray(p.diseases) ? p.diseases.join(', ') : p.diseases;
          setConditions(CONDITIONS_OPTS.filter(c => str.includes(c)));
        }

        // 과거 병력 — 신규 PastEvent[] or 구 string[] 마이그레이션
        if (Array.isArray(p.pastHistory) && p.pastHistory.length > 0) {
          setPastHistory(p.pastHistory);
        } else if (Array.isArray(p.history) && p.history.length > 0) {
          setPastHistory(p.history.map((h: string) => ({ label: h, category: 'other' as PastCategory, status: 'resolved' as PastStatus })));
        }

        // 가족력
        if (Array.isArray(p.familyHistory)) setFamilyHistory(p.familyHistory);
      } catch (e: any) { if (__DEV__) console.warn('[HealthProfile load]', e); }
    });
  }, []);

  const set = (key: string, val: string) => setProfile((p: any) => ({ ...p, [key]: val }));

  // 현재 만성질환 토글
  const toggleCondition = (c: string) =>
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  // 과거 병력 토글
  const togglePastHistory = (opt: typeof PAST_HISTORY_OPTS[0]) => {
    setPastHistory(prev => {
      const exists = prev.find(e => e.label === opt.label);
      if (exists) return prev.filter(e => e.label !== opt.label);
      return [...prev, { label: opt.label, category: opt.category }];
    });
  };
  const updatePastEvent = (label: string, field: keyof PastEvent, value: any) => {
    setPastHistory(prev => prev.map(e => e.label === label ? { ...e, [field]: value } : e));
  };

  // 가족력 토글
  const toggleFamily = (f: string) =>
    setFamilyHistory(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const save = async () => {
    setSaving(true);
    try {
      const profileToSave = {
        ...profile,
        conditions,
        diseases: conditions.join(', '), // 백엔드 하위 호환
        pastHistory,
        familyHistory,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profileToSave));
      const uid = route?.params?.userId || (await AsyncStorage.getItem('userId')) || '';
      if (uid) {
        fetch(`${API_URL}/users/${uid}/health-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: profileToSave }),
        }).catch(() => {});
      }
      setSaved(true);
      const uname = route?.params?.name || (await AsyncStorage.getItem('userName')) || '';
      setTimeout(() => {
        if (fromRegister) navigation.replace('SeniorHome', { userId: uid, name: uname });
        else navigation.goBack();
      }, 800);
    } catch (e: any) { if (__DEV__) console.warn('[HealthProfile save]', e); }
    setSaving(false);
  };

  const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[s.chip, selected && s.chipOn]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[s.chipTxt, selected && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        {!fromRegister && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>건강 프로필</Text>
        <View style={{ width: fromRegister ? 0 : 72 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── 나이 ── */}
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

        {/* ── 성별 ── */}
        <Text style={s.label}>성별</Text>
        <View style={s.chipRow}>
          {GENDER_OPTS.map(g => <Chip key={g} label={g} selected={profile.gender === g} onPress={() => set('gender', g)} />)}
        </View>

        {/* ── 현재 만성질환 ── */}
        <Text style={s.label}>현재 만성질환</Text>
        <Text style={s.hint}>지금 관리 중인 질환을 모두 선택하세요</Text>
        <View style={s.chipRow}>
          {CONDITIONS_OPTS.map(c => (
            <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => toggleCondition(c)} />
          ))}
        </View>

        {/* ── 과거 병력 ── */}
        <Text style={s.label}>과거 병력</Text>
        <Text style={s.hint}>완치됐어도 루미가 더 꼼꼼히 살펴드려요</Text>
        <View style={s.chipRow}>
          {PAST_HISTORY_OPTS.map(opt => {
            const event = pastHistory.find(e => e.label === opt.label);
            const selected = !!event;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[s.chip, selected && s.chipOn]}
                onPress={() => togglePastHistory(opt)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipTxt, selected && s.chipTxtOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 선택된 과거 병력 상세 입력 */}
        {pastHistory.map(event => (
          <View key={event.label} style={s.pastDetailBox}>
            <Text style={s.pastDetailLabel}>{event.label}</Text>
            <View style={s.pastDetailRow}>
              <TextInput
                style={s.yearInput}
                value={event.year ? String(event.year) : ''}
                onChangeText={v => {
                  const yr = v.replace(/[^0-9]/g, '');
                  updatePastEvent(event.label, 'year', yr ? parseInt(yr) : undefined);
                }}
                placeholder="연도 (예: 2021)"
                placeholderTextColor="#B0BEC5"
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity
                style={[s.statusChip, event.status === 'resolved' && s.statusChipOn]}
                onPress={() => updatePastEvent(event.label, 'status', 'resolved')}
              >
                <Text style={[s.statusChipTxt, event.status === 'resolved' && s.statusChipTxtOn]}>완치됨</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.statusChip, event.status === 'ongoing' && s.statusChipRed]}
                onPress={() => updatePastEvent(event.label, 'status', 'ongoing')}
              >
                <Text style={[s.statusChipTxt, event.status === 'ongoing' && s.statusChipTxtRed]}>치료 중</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* ── 가족력 (선택) ── */}
        <Text style={s.label}>가족력 <Text style={s.optional}>(선택)</Text></Text>
        <Text style={s.hint}>부모·형제 중 해당 질환이 있으면 선택하세요</Text>
        <View style={s.chipRow}>
          {FAMILY_HISTORY_OPTS.map(f => (
            <Chip key={f} label={f} selected={familyHistory.includes(f)} onPress={() => toggleFamily(f)} />
          ))}
        </View>

        {/* ── 알레르기 ── */}
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

        {/* ── 흡연 ── */}
        <Text style={s.label}>흡연</Text>
        <View style={s.chipRow}>
          {SMOKE_OPTS.map(o => <Chip key={o} label={o} selected={profile.smoking === o} onPress={() => set('smoking', o)} />)}
        </View>

        {/* ── 음주 ── */}
        <Text style={s.label}>음주</Text>
        <View style={s.chipRow}>
          {DRINK_OPTS.map(o => <Chip key={o} label={o} selected={profile.drinking === o} onPress={() => set('drinking', o)} />)}
        </View>

        {/* ── 저장 ── */}
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
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_BG_BOT },

  header: {
    backgroundColor: INDIGO,
    paddingBottom: 18, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { paddingVertical: 4 },
  backTxt:     { color: '#fff', fontSize: 20, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },

  body: { padding: 24, paddingBottom: 60 },

  label: { fontSize: 22, fontWeight: '800', color: INK, marginTop: 28, marginBottom: 6 },
  optional: { fontSize: 16, fontWeight: '500', color: INK_MUTE },
  hint:  { fontSize: 16, color: INK_MUTE, marginBottom: 12, lineHeight: 22 },

  input: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 22, color: INK,
    borderWidth: 1.5, borderColor: '#C5CAE9',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 16 },

  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 30, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#C5CAE9',
  },
  chipOn:    { backgroundColor: INDIGO, borderColor: INDIGO },
  chipTxt:   { fontSize: 20, fontWeight: '600', color: INK_SOFT },
  chipTxtOn: { color: '#fff', fontWeight: '800' },

  // 과거 병력 상세
  pastDetailBox: {
    marginTop: 12, padding: 16,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0E7FF',
  },
  pastDetailLabel: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 10 },
  pastDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  yearInput: {
    flex: 1, minWidth: 120,
    backgroundColor: '#F8F9FF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 18, color: INK,
    borderWidth: 1.5, borderColor: '#C5CAE9',
  },
  statusChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#D1D5DB',
  },
  statusChipOn:    { backgroundColor: '#E0F2E9', borderColor: '#3BA559' },
  statusChipRed:   { backgroundColor: '#FFE6DC', borderColor: '#E5453C' },
  statusChipTxt:   { fontSize: 16, fontWeight: '700', color: INK_MUTE },
  statusChipTxtOn: { color: '#1F7A3A' },
  statusChipTxtRed:{ color: '#E5453C' },

  saveBtn: {
    backgroundColor: BLUE, borderRadius: 20,
    paddingVertical: 24, alignItems: 'center',
    marginTop: 36,
    shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3,
  },
  saveTxt: { color: '#fff', fontSize: 26, fontWeight: '900' },
});
