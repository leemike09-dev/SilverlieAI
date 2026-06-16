import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE       = '#3B82F6';
const INK        = '#0F1B2D';
const INK_SOFT   = '#3D4B62';
const INK_MUTE   = '#7E8AA1';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const GREEN      = '#3BA559';
const PURPLE     = '#7C5BE3';
const CHIP_ON_BG = '#1E40AF';

const STORAGE_KEY = 'health_profile';
const API_URL     = 'https://silverlieai.onrender.com';

// ─── 타입 ──────────────────────────────────────────────────────────────────
type PastCategory = 'cancer' | 'cardiac' | 'stroke' | 'fracture' | 'surgery' | 'other';
type PastStatus   = 'resolved' | 'ongoing';

interface PastEvent {
  label:    string;
  category: PastCategory;
  year?:    number;
  status?:  PastStatus;
}

interface DeepProfile {
  // 기존 유지
  age:           string;
  gender:        string;
  allergies:     string;
  smoking:       string;
  drinking:      string;
  conditions:    string[];
  diseases:      string;        // 백엔드 하위 호환
  pastHistory:   PastEvent[];
  familyHistory: string[];
  living:        string;
  guardianOptIn: boolean;
  // 신규 — 의료 정보
  bloodType:     string;
  bloodRh:       string;
  // 신규 — 생활 맥락
  routine:       { wakeAt?: string; sleepAt?: string };
  // 신규 — 소통 취향
  address:       string;        // 호칭
  speechStyle:   string;
  interests:     string[];
  worries:       string[];
  // 메타
  completeness:  number;
  fieldSources:  Record<string, string>;
  updatedAt:     string;
  locale:        string;
}

// ─── 선택지 상수 ────────────────────────────────────────────────────────────
const GENDER_OPTS  = ['남성', '여성'];
const BLOOD_OPTS   = ['A형', 'B형', 'O형', 'AB형'];
const RH_OPTS      = ['+ (Rh+)', '- (Rh-)'];
const SMOKE_OPTS   = ['안함', '과거흡연', '현재흡연'];
const DRINK_OPTS   = ['안함', '가끔', '자주'];
const LIVING_OPTS  = ['혼자', '가족과'];
const STYLE_OPTS   = ['정중하게', '친근하게'];

const CONDITIONS_OPTS = ['고혈압', '당뇨', '관절염', '고지혈증', '심장질환', '신장질환', '폐질환'];

const PAST_HISTORY_OPTS: Array<{ label: string; category: PastCategory }> = [
  { label: '암·종양',          category: 'cancer'   },
  { label: '뇌졸중',           category: 'stroke'   },
  { label: '심근경색·심장수술', category: 'cardiac'  },
  { label: '골절·낙상',        category: 'fracture' },
  { label: '기타 수술',         category: 'surgery'  },
];

const FAMILY_HISTORY_OPTS = ['당뇨', '심장질환', '암', '뇌졸중', '고혈압'];

const INTEREST_OPTS = [
  '산책·걷기', '등산', '텃밭·원예', '독서', '바둑·장기',
  'TV·영화', '요리', '손자녀', '종교활동', '음악 감상', '그림·서예', '여행',
];

const WORRY_OPTS = [
  '낙상 걱정', '기억력 감소', '만성질환 악화', '외로움',
  '약 챙기기', '병원 가기', '가족 걱정',
];

// ─── 완성도 계산 (0~1) ──────────────────────────────────────────────────────
function calcCompleteness(
  p: Partial<DeepProfile>,
  conditions: string[],
  pastHistory: PastEvent[],
  guardianExists: boolean,
): number {
  const checks = [
    !!p.age,
    !!p.gender,
    !!p.bloodType,
    !!p.allergies,
    conditions.length > 0,
    pastHistory.length > 0,
    guardianExists,
    !!p.living,
    !!(p.routine?.wakeAt || p.routine?.sleepAt),
    !!p.speechStyle,
    (p.interests?.length ?? 0) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

export default function HealthProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const fromRegister = route?.params?.fromRegister ?? false;

  const [userId,        setUserId]        = useState('');
  const [userName,      setUserName]      = useState('');
  const [profile,       setProfile]       = useState<Partial<DeepProfile>>({
    age: '', gender: '', allergies: '', smoking: '', drinking: '',
    bloodType: '', bloodRh: '', living: '', address: '', speechStyle: '',
    routine: {}, interests: [], worries: [],
  });
  const [conditions,     setConditions]    = useState<string[]>([]);
  const [pastHistory,    setPastHistory]   = useState<PastEvent[]>([]);
  const [familyHistory,  setFamilyHistory] = useState<string[]>([]);
  const [guardianExists, setGuardianExists] = useState(false);
  const [saving,         setSaving]        = useState(false);
  const [saved,          setSaved]         = useState(false);

  useEffect(() => {
    (async () => {
      const uid  = route?.params?.userId || (await AsyncStorage.getItem('userId')) || '';
      const name = route?.params?.name   || (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUserName(name);

      // 보호자 존재 여부 확인
      if (uid) {
        const gRaw = await AsyncStorage.getItem(`guardians.${uid}`);
        const gArr = gRaw ? JSON.parse(gRaw) : [];
        setGuardianExists(Array.isArray(gArr) && gArr.length > 0);
      }

      // 저장된 프로필 로드
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      try {
        const p = JSON.parse(stored);

        // 기존 allergies 병합: 구형(drugAllergies/foodAllergies/allergyNote) → 신형 단일 문자열
        const allergyStr = p.allergies || [
          ...(Array.isArray(p.drugAllergies) ? p.drugAllergies : []),
          ...(Array.isArray(p.foodAllergies) ? p.foodAllergies : []),
          p.allergyNote || '',
        ].filter(Boolean).join(', ');

        // bloodType 마이그레이션: 구형 'A' → 신형 'A형'
        const btRaw = p.bloodType || '';
        const bt    = btRaw && !btRaw.includes('형') ? btRaw + '형' : btRaw;

        setProfile({
          age:        p.age        || '',
          gender:     p.gender     || '',
          allergies:  allergyStr,
          smoking:    p.smoking    || '',
          drinking:   p.drinking   || '',
          bloodType:  bt,
          bloodRh:    p.bloodRh    || '',
          living:     p.living     || '',
          address:    p.address    || '',
          speechStyle: p.speechStyle || '',
          routine:    p.routine    || {},
          interests:  Array.isArray(p.interests) ? p.interests : [],
          worries:    Array.isArray(p.worries)   ? p.worries   : [],
        });

        // 만성질환 — 신규 배열 or 구 문자열
        if (Array.isArray(p.conditions) && p.conditions.length > 0) {
          setConditions(p.conditions);
        } else if (p.diseases) {
          const str = Array.isArray(p.diseases) ? p.diseases.join(', ') : p.diseases;
          setConditions(CONDITIONS_OPTS.filter(c => str.includes(c)));
        }

        // 과거 병력 — 신규 PastEvent[] or 구 string[]
        if (Array.isArray(p.pastHistory) && p.pastHistory.length > 0) {
          setPastHistory(p.pastHistory);
        } else if (Array.isArray(p.history) && p.history.length > 0) {
          setPastHistory(p.history.map((h: string) => ({ label: h, category: 'other' as PastCategory, status: 'resolved' as PastStatus })));
        }

        if (Array.isArray(p.familyHistory)) setFamilyHistory(p.familyHistory);
      } catch {}
    })();
  }, []);

  const set = (key: string, val: any) => setProfile(p => ({ ...p, [key]: val }));
  const setRoutine = (key: string, val: string) =>
    setProfile(p => ({ ...p, routine: { ...(p.routine || {}), [key]: val } }));

  const toggleCondition = (c: string) =>
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const togglePastHistory = (opt: typeof PAST_HISTORY_OPTS[0]) => {
    setPastHistory(prev => {
      const exists = prev.find(e => e.label === opt.label);
      if (exists) return prev.filter(e => e.label !== opt.label);
      return [...prev, { label: opt.label, category: opt.category }];
    });
  };
  const updatePastEvent = (label: string, field: keyof PastEvent, value: any) =>
    setPastHistory(prev => prev.map(e => e.label === label ? { ...e, [field]: value } : e));

  const toggleFamily   = (f: string) => setFamilyHistory(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleInterest = (i: string) => set('interests', (profile.interests || []).includes(i) ? (profile.interests || []).filter((x: string) => x !== i) : [...(profile.interests || []), i]);
  const toggleWorry    = (w: string) => set('worries',   (profile.worries   || []).includes(w) ? (profile.worries   || []).filter((x: string) => x !== w) : [...(profile.worries   || []), w]);

  const completeness = calcCompleteness(profile, conditions, pastHistory, guardianExists);

  const save = async () => {
    setSaving(true);
    try {
      const profileToSave: DeepProfile = {
        ...profile as any,
        conditions,
        diseases: conditions.join(', '),   // 백엔드 하위 호환
        pastHistory,
        familyHistory,
        guardianOptIn: true,
        completeness,
        fieldSources: { _all: 'self' },
        updatedAt: new Date().toISOString(),
        locale: 'ko',
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profileToSave));
      if (userId) {
        fetch(`${API_URL}/users/${userId}/health-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: profileToSave }),
        }).catch(() => {});
      }
      setSaved(true);
      const uname = userName || (await AsyncStorage.getItem('userName')) || '';
      setTimeout(() => {
        if (fromRegister) navigation.replace('SeniorHome', { userId, name: uname });
        else navigation.goBack();
      }, 800);
    } catch {}
    setSaving(false);
  };

  // ─── 공통 칩 컴포넌트 ────────────────────────────────────────────────────
  const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[s.chip, selected && s.chipOn]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[s.chipTxt, selected && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  const pct = Math.round(completeness * 100);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>

        {/* ── 헤더 ── */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          {!fromRegister && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={s.backTxt}>← 뒤로</Text>
            </TouchableOpacity>
          )}
          <Text style={s.headerTitle}>건강 프로필</Text>
          <View style={{ width: fromRegister ? 0 : 72 }} />
        </View>

        {/* ── 완성도 바 ── */}
        <View style={s.completenessBox}>
          <View style={s.completenessRow}>
            <Text style={s.completenessTxt}>프로필 완성도</Text>
            <Text style={s.completenessNum}>{pct}%</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={s.completenessHint}>더 알려주실수록 루미가 더 잘 도와드려요 ✨</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ══════════════ 섹션 1: 기본 정보 ══════════════ */}
          <Text style={s.sectionHeader}>📋 기본 정보</Text>

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

          <Text style={s.label}>성별</Text>
          <View style={s.chipRow}>
            {GENDER_OPTS.map(g => <Chip key={g} label={g} selected={profile.gender === g} onPress={() => set('gender', g)} />)}
          </View>

          {/* ══════════════ 섹션 2: 의료 정보 (우선) ══════════════ */}
          <Text style={[s.sectionHeader, { marginTop: 36 }]}>🩺 의료 정보</Text>
          <Text style={s.sectionHint}>응급 상황·복약 추천에 바로 쓰여요</Text>

          {/* 혈액형 */}
          <Text style={s.label}>혈액형 <Text style={s.priorityBadge}>응급 시 중요</Text></Text>
          <View style={s.chipRow}>
            {BLOOD_OPTS.map(b => <Chip key={b} label={b} selected={profile.bloodType === b} onPress={() => set('bloodType', b)} />)}
          </View>
          {profile.bloodType ? (
            <View style={[s.chipRow, { marginTop: 10 }]}>
              {RH_OPTS.map(r => <Chip key={r} label={r} selected={profile.bloodRh === r} onPress={() => set('bloodRh', r)} />)}
            </View>
          ) : null}

          {/* 알레르기 */}
          <Text style={s.label}>알레르기 <Text style={s.priorityBadge}>복약 추천 필터</Text></Text>
          <Text style={s.hint}>약물·음식·기타 알레르기. 예: 페니실린, 견과류</Text>
          <TextInput
            style={[s.input, s.inputMulti]}
            value={profile.allergies}
            onChangeText={v => set('allergies', v)}
            placeholder="없으면 '없음' 입력"
            placeholderTextColor="#B0BEC5"
            multiline
            numberOfLines={2}
          />

          {/* 만성질환 */}
          <Text style={s.label}>현재 만성질환</Text>
          <Text style={s.hint}>지금 관리 중인 질환 모두 선택</Text>
          <View style={s.chipRow}>
            {CONDITIONS_OPTS.map(c => (
              <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => toggleCondition(c)} />
            ))}
          </View>

          {/* 과거 병력 */}
          <Text style={s.label}>과거 병력</Text>
          <Text style={s.hint}>완치됐어도 루미가 더 꼼꼼히 살펴드려요</Text>
          <View style={s.chipRow}>
            {PAST_HISTORY_OPTS.map(opt => (
              <Chip
                key={opt.label}
                label={opt.label}
                selected={!!pastHistory.find(e => e.label === opt.label)}
                onPress={() => togglePastHistory(opt)}
              />
            ))}
          </View>
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

          {/* 가족력 */}
          <Text style={s.label}>가족력 <Text style={s.optional}>(선택)</Text></Text>
          <Text style={s.hint}>부모·형제 중 해당 질환이 있으면 선택</Text>
          <View style={s.chipRow}>
            {FAMILY_HISTORY_OPTS.map(f => (
              <Chip key={f} label={f} selected={familyHistory.includes(f)} onPress={() => toggleFamily(f)} />
            ))}
          </View>

          {/* 흡연·음주 */}
          <Text style={s.label}>흡연</Text>
          <View style={s.chipRow}>
            {SMOKE_OPTS.map(o => <Chip key={o} label={o} selected={profile.smoking === o} onPress={() => set('smoking', o)} />)}
          </View>

          <Text style={s.label}>음주</Text>
          <View style={s.chipRow}>
            {DRINK_OPTS.map(o => <Chip key={o} label={o} selected={profile.drinking === o} onPress={() => set('drinking', o)} />)}
          </View>

          {/* ══════════════ 섹션 3: 생활 맥락 ══════════════ */}
          <Text style={[s.sectionHeader, { marginTop: 36 }]}>🏠 생활 맥락</Text>
          <Text style={s.sectionHint}>일상 패턴을 알면 루미가 더 알맞은 시간에 도움드려요</Text>

          <Text style={s.label}>생활 형태</Text>
          <View style={s.chipRow}>
            {LIVING_OPTS.map(o => <Chip key={o} label={o} selected={profile.living === o} onPress={() => set('living', o)} />)}
          </View>

          <Text style={s.label}>기상 시간 <Text style={s.optional}>(선택)</Text></Text>
          <TextInput
            style={s.input}
            value={profile.routine?.wakeAt || ''}
            onChangeText={v => setRoutine('wakeAt', v)}
            placeholder="예: 06:30"
            placeholderTextColor="#B0BEC5"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <Text style={s.label}>취침 시간 <Text style={s.optional}>(선택)</Text></Text>
          <TextInput
            style={s.input}
            value={profile.routine?.sleepAt || ''}
            onChangeText={v => setRoutine('sleepAt', v)}
            placeholder="예: 22:00"
            placeholderTextColor="#B0BEC5"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          {/* 비상 연락처 → GuardianScreen 연결 */}
          <Text style={s.label}>비상 연락처 <Text style={s.priorityBadge}>SOS 필수</Text></Text>
          <TouchableOpacity
            style={[s.linkBtn, guardianExists && s.linkBtnDone]}
            onPress={() => navigation.navigate('Guardian', { userId })}
            activeOpacity={0.8}
          >
            <Text style={[s.linkBtnTxt, guardianExists && s.linkBtnTxtDone]}>
              {guardianExists ? '✓ 보호자 등록됨 — 수정하기' : '보호자·비상연락처 등록하기 →'}
            </Text>
          </TouchableOpacity>

          {/* ══════════════ 섹션 4: 루미 소통 방식 ══════════════ */}
          <Text style={[s.sectionHeader, { marginTop: 36 }]}>💜 루미 소통 방식</Text>
          <Text style={s.sectionHint}>루미가 어르신 취향에 맞게 대화할 수 있어요</Text>

          {/* 호칭 */}
          <Text style={s.label}>루미가 부를 호칭 <Text style={s.optional}>(선택)</Text></Text>
          <View style={s.chipRow}>
            {[
              '어르신',
              userName ? `${userName}님` : null,
              '편하게',
            ].filter(Boolean).map(o => (
              <Chip key={o!} label={o!} selected={profile.address === o} onPress={() => set('address', o)} />
            ))}
          </View>
          <TextInput
            style={[s.input, { marginTop: 10 }]}
            value={profile.address && !['어르신', `${userName}님`, '편하게'].includes(profile.address) ? profile.address : ''}
            onChangeText={v => set('address', v)}
            placeholder="직접 입력 (예: 할머니, 김선생님)"
            placeholderTextColor="#B0BEC5"
          />

          {/* 말투 */}
          <Text style={s.label}>선호 말투 <Text style={s.optional}>(선택)</Text></Text>
          <View style={s.chipRow}>
            {STYLE_OPTS.map(o => <Chip key={o} label={o} selected={profile.speechStyle === o} onPress={() => set('speechStyle', o)} />)}
          </View>

          {/* 관심사 */}
          <Text style={s.label}>관심사·취미 <Text style={s.optional}>(선택)</Text></Text>
          <Text style={s.hint}>루미가 대화 주제로 참고해요</Text>
          <View style={s.chipRow}>
            {INTEREST_OPTS.map(i => (
              <Chip key={i} label={i} selected={(profile.interests || []).includes(i)} onPress={() => toggleInterest(i)} />
            ))}
          </View>

          {/* 걱정거리 */}
          <Text style={s.label}>요즘 걱정거리 <Text style={s.optional}>(선택)</Text></Text>
          <Text style={s.hint}>루미가 특히 더 신경 써드려요</Text>
          <View style={s.chipRow}>
            {WORRY_OPTS.map(w => (
              <Chip key={w} label={w} selected={(profile.worries || []).includes(w)} onPress={() => toggleWorry(w)} />
            ))}
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

          <Text style={s.privacyNote}>모든 항목은 선택사항입니다. 언제든 수정·삭제하실 수 있어요.</Text>

        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { paddingVertical: 4 },
  backTxt:     { color: INK_SOFT, fontSize: 20, fontWeight: '600' },
  headerTitle: { color: INK, fontSize: 26, fontWeight: '900' },

  // 완성도
  completenessBox: {
    marginHorizontal: 20, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  completenessRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  completenessTxt:  { fontSize: 17, fontWeight: '700', color: INK_SOFT },
  completenessNum:  { fontSize: 20, fontWeight: '900', color: PURPLE },
  progressBg:       { height: 10, backgroundColor: '#EDE9F5', borderRadius: 8, overflow: 'hidden' },
  progressFill:     { height: 10, backgroundColor: PURPLE, borderRadius: 8 },
  completenessHint: { fontSize: 14, color: INK_MUTE, marginTop: 6 },

  body: { padding: 20, paddingBottom: 60 },

  sectionHeader: {
    fontSize: 20, fontWeight: '900', color: INK,
    marginTop: 28, marginBottom: 4,
  },
  sectionHint: { fontSize: 14, color: INK_MUTE, marginBottom: 14 },

  label:    { fontSize: 21, fontWeight: '800', color: INK, marginTop: 22, marginBottom: 6 },
  optional: { fontSize: 15, fontWeight: '500', color: INK_MUTE },
  hint:     { fontSize: 15, color: INK_MUTE, marginBottom: 10, lineHeight: 22 },

  priorityBadge: {
    fontSize: 12, fontWeight: '800', color: '#E5453C',
    backgroundColor: '#FFF0EE', paddingHorizontal: 6, borderRadius: 6,
  },

  input: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 21, color: INK,
    borderWidth: 1.5, borderColor: '#D1CCBC',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 },

  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip:    {
    paddingHorizontal: 20, paddingVertical: 13,
    borderRadius: 30, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#D1CCBC',
  },
  chipOn:    { backgroundColor: CHIP_ON_BG, borderColor: CHIP_ON_BG },
  chipTxt:   { fontSize: 19, fontWeight: '600', color: INK_SOFT },
  chipTxtOn: { color: '#fff', fontWeight: '800' },

  // 과거 병력 상세
  pastDetailBox: {
    marginTop: 12, padding: 16,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E7FF',
  },
  pastDetailLabel: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 10 },
  pastDetailRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  yearInput: {
    flex: 1, minWidth: 120,
    backgroundColor: '#F8F9FF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 18, color: INK, borderWidth: 1.5, borderColor: '#D1CCBC',
  },
  statusChip:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#D1D5DB' },
  statusChipOn:    { backgroundColor: '#E0F2E9', borderColor: '#3BA559' },
  statusChipRed:   { backgroundColor: '#FFE6DC', borderColor: '#E5453C' },
  statusChipTxt:   { fontSize: 16, fontWeight: '700', color: INK_MUTE },
  statusChipTxtOn: { color: '#1F7A3A' },
  statusChipTxtRed:{ color: '#E5453C' },

  // 비상연락처 링크 버튼
  linkBtn: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 20,
    borderWidth: 2, borderColor: '#D1CCBC',
    alignItems: 'center',
  },
  linkBtnDone:    { borderColor: GREEN, backgroundColor: '#F0FAF3' },
  linkBtnTxt:     { fontSize: 19, fontWeight: '700', color: BLUE },
  linkBtnTxtDone: { color: GREEN },

  saveBtn: {
    backgroundColor: BLUE, borderRadius: 20,
    paddingVertical: 22, alignItems: 'center',
    marginTop: 36,
    shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3,
  },
  saveTxt: { color: '#fff', fontSize: 24, fontWeight: '900' },

  privacyNote: {
    fontSize: 14, color: INK_MUTE, textAlign: 'center', marginTop: 16,
  },
});
