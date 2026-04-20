import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INDIGO  = '#5C6BC0';
const LINDIGO = '#E8EAF6';
const BG      = '#F8F7FF';
const STORAGE_KEY = 'health_profile';

// ── 선택 항목 정의 ──
const DISEASES = [
  '고혈압', '당뇨', '고지혈증', '심장질환',
  '뇌졸중', '관절염', '신장질환', '갑상선',
  '골다공증', '치매·인지장애', '암', '기타',
];
const DRUG_ALLERGIES  = ['페니실린', '아스피린', '설파제', '조영제', '기타'];
const FOOD_ALLERGIES  = ['견과류', '해산물', '유제품', '밀·글루텐', '달걀', '기타'];
const BLOOD_TYPES     = ['A', 'B', 'AB', 'O'];
const BLOOD_RH        = ['+', '-'];
const SMOKE_OPTS      = ['비흡연', '과거흡연', '현재흡연'];
const DRINK_OPTS      = ['안마심', '가끔', '자주'];
const EXERCISE_OPTS   = ['거의안함', '주1~2회', '주3회이상'];
const MEAL_OPTS       = ['소식', '보통', '과식경향'];
const GENDER_OPTS     = ['남성', '여성'];
const TOTAL_STEPS     = 5;

const emptyProfile = () => ({
  age: '', height: '', weight: '',
  gender: '',
  bloodType: '', bloodRh: '',
  diseases: [] as string[],
  familyDiseases: [] as string[],
  surgeries: [] as { name: string; year: string }[],
  drugAllergies: [] as string[],
  foodAllergies: [] as string[],
  allergyNote: '',
  smoking: '', drinking: '', exercise: '', meal: '',
});

export default function HealthProfileScreen({ navigation, route }: any) {
  const fromRegister = route?.params?.fromRegister ?? false;
  const [step,    setStep]    = useState(1);
  const [profile, setProfile] = useState<any>(emptyProfile());
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState('');

  // ── 로드 ──
  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setProfile(JSON.parse(stored));
    };
    load();
  }, []);

  const set = (key: string, val: any) => setProfile((p: any) => ({ ...p, [key]: val }));

  const toggleArr = (key: string, val: string) => {
    setProfile((p: any) => {
      const arr: string[] = p[key] || [];
      return { ...p, [key]: arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val] };
    });
  };

  // ── 수술 경력 ──
  const addSurgery = () =>
    setProfile((p: any) => ({ ...p, surgeries: [...(p.surgeries || []), { name: '', year: '' }] }));

  const setSurgery = (idx: number, field: string, val: string) =>
    setProfile((p: any) => {
      const arr = [...(p.surgeries || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, surgeries: arr };
    });

  const delSurgery = (idx: number) =>
    setProfile((p: any) => ({ ...p, surgeries: p.surgeries.filter((_: any, i: number) => i !== idx) }));

  // ── 저장 ──
  const save = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      // TODO: Supabase health_profiles 저장
      // await supabase.from('health_profiles').upsert({ userId, ...profile });
      showToast('프로필이 저장됐습니다');
      setTimeout(() => {
        if (fromRegister) {
          const uid  = route?.params?.userId || '';
          const uname = route?.params?.name  || '';
          navigation.replace('SeniorHome', { userId: uid, name: uname });
        } else {
          navigation.goBack();
        }
      }, 1200);
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
    setSaving(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const canNext = () => {
    if (step === 1) return profile.age && profile.gender;
    return true;
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      {/* ── 헤더 ── */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>🏥 건강 프로필</Text>
            <Text style={s.headerSub}>AI 상담에 활용되는 나의 건강 정보</Text>
          </View>
          <View style={{ width: 64 }} />
        </View>

        {/* 진행 도트 */}
        <View style={s.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setStep(i + 1)}>
              <View style={i + 1 === step ? [s.dot, s.dotOn] : i + 1 < step ? [s.dot, s.dotDone] : s.dot} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 웨이브 */}
        {Platform.OS === 'web' ? (
          <View style={s.waveWrap}>
            {/* @ts-ignore */}
            <svg width="100%" height="20" viewBox="0 0 100 20"
              preserveAspectRatio="none"
              style={{ width: '100%', display: 'block', marginBottom: '-1px' }}>
              <path d="M0 20 Q25 0 50 12 Q75 24 100 5 L100 20 L0 20 Z" fill={BG} />
            </svg>
          </View>
        ) : (
          <View style={s.waveNative} />
        )}
      </View>

      {/* ── 단계 제목 ── */}
      <View style={s.stepTitle}>
        <Text style={s.stepNum}>{step} / {TOTAL_STEPS}</Text>
        <Text style={s.stepLabel}>
          {['기본 정보', '만성질환', '수술 경력', '알레르기', '생활 습관'][step - 1]}
        </Text>
      </View>

      {/* ── 콘텐츠 ── */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ══ 1단계: 기본 정보 ══ */}
        {step === 1 && (
          <View>
            {/* 성별 */}
            <Text style={s.sLabel}>성별</Text>
            <View style={s.optRow}>
              {GENDER_OPTS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={profile.gender === g ? [s.optBtn, s.optBtnOn] : s.optBtn}
                  onPress={() => set('gender', g)}
                >
                  <Text style={profile.gender === g ? [s.optTxt, s.optTxtOn] : s.optTxt}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 나이/키/체중 */}
            {[
              { key: 'age',    label: '나이',  unit: '세', kbType: 'numeric' },
              { key: 'height', label: '키',    unit: 'cm', kbType: 'numeric' },
              { key: 'weight', label: '체중',  unit: 'kg', kbType: 'decimal-pad' },
            ].map(({ key, label, unit, kbType }) => (
              <View key={key} style={s.numCard}>
                <Text style={s.numLabel}>{label}</Text>
                <View style={s.numRow}>
                  <TextInput
                    style={s.numInput}
                    value={profile[key]}
                    onChangeText={t => set(key, t)}
                    keyboardType={kbType as any}
                    placeholder="--"
                    placeholderTextColor="#B0BEC5"
                    maxLength={5}
                  />
                  <Text style={s.numUnit}>{unit}</Text>
                </View>
              </View>
            ))}

            {/* 혈액형 */}
            <Text style={s.sLabel}>혈액형</Text>
            <View style={s.optRow}>
              {BLOOD_TYPES.map(b => (
                <TouchableOpacity
                  key={b}
                  style={profile.bloodType === b ? [s.optBtn, s.optBtnOn] : s.optBtn}
                  onPress={() => set('bloodType', b)}
                >
                  <Text style={profile.bloodType === b ? [s.optTxt, s.optTxtOn] : s.optTxt}>{b}형</Text>
                </TouchableOpacity>
              ))}
              {BLOOD_RH.map(r => (
                <TouchableOpacity
                  key={r}
                  style={profile.bloodRh === r ? [s.optBtn, s.optBtnOn] : s.optBtn}
                  onPress={() => set('bloodRh', r)}
                >
                  <Text style={profile.bloodRh === r ? [s.optTxt, s.optTxtOn] : s.optTxt}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ══ 2단계: 만성질환 ══ */}
        {step === 2 && (
          <View>
            <Text style={s.sLabel}>나의 만성질환</Text>
            <View style={s.checkGrid}>
              {DISEASES.map(d => {
                const on = profile.diseases?.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={on ? [s.checkItem, s.checkItemOn] : s.checkItem}
                    onPress={() => toggleArr('diseases', d)}
                  >
                    <Text style={s.checkBox}>{on ? '✓' : '○'}</Text>
                    <Text style={on ? [s.checkTxt, s.checkTxtOn] : s.checkTxt}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.sLabel, { marginTop: 24 }]}>가족력</Text>
            <Text style={s.sHint}>부모·형제자매의 질환을 선택해 주세요</Text>
            <View style={s.checkGrid}>
              {DISEASES.map(d => {
                const on = profile.familyDiseases?.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={on ? [s.checkItem, s.checkItemOn] : s.checkItem}
                    onPress={() => toggleArr('familyDiseases', d)}
                  >
                    <Text style={s.checkBox}>{on ? '✓' : '○'}</Text>
                    <Text style={on ? [s.checkTxt, s.checkTxtOn] : s.checkTxt}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ══ 3단계: 수술 경력 ══ */}
        {step === 3 && (
          <View>
            <Text style={s.sLabel}>수술 경력</Text>
            <Text style={s.sHint}>받으신 수술명과 연도를 입력해 주세요</Text>

            {(profile.surgeries || []).map((sur: any, i: number) => (
              <View key={i} style={s.surgeryCard}>
                <View style={s.surgeryInputs}>
                  <TextInput
                    style={[s.surgInput, { flex: 2 }]}
                    value={sur.name}
                    onChangeText={t => setSurgery(i, 'name', t)}
                    placeholder="수술명 (예: 무릎 인공관절)"
                    placeholderTextColor="#B0BEC5"
                  />
                  <TextInput
                    style={[s.surgInput, { flex: 1 }]}
                    value={sur.year}
                    onChangeText={t => setSurgery(i, 'year', t)}
                    placeholder="연도"
                    placeholderTextColor="#B0BEC5"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
                <TouchableOpacity style={s.delBtn} onPress={() => delSurgery(i)}>
                  <Text style={s.delBtnTxt}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={s.addBtn} onPress={addSurgery}>
              <Text style={s.addBtnTxt}>+ 수술 경력 추가</Text>
            </TouchableOpacity>

            {(profile.surgeries || []).length === 0 && (
              <View style={s.emptyHint}>
                <Text style={s.emptyHintTxt}>수술 경력이 없으면{`\n`}다음 단계로 넘어가세요</Text>
              </View>
            )}
          </View>
        )}

        {/* ══ 4단계: 알레르기 ══ */}
        {step === 4 && (
          <View>
            <Text style={s.sLabel}>약물 알레르기</Text>
            <View style={s.tagWrap}>
              {DRUG_ALLERGIES.map(a => {
                const on = profile.drugAllergies?.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={on ? [s.tag, s.tagOn] : s.tag}
                    onPress={() => toggleArr('drugAllergies', a)}
                  >
                    <Text style={on ? [s.tagTxt, s.tagTxtOn] : s.tagTxt}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.sLabel, { marginTop: 24 }]}>음식 알레르기</Text>
            <View style={s.tagWrap}>
              {FOOD_ALLERGIES.map(a => {
                const on = profile.foodAllergies?.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={on ? [s.tag, s.tagOn] : s.tag}
                    onPress={() => toggleArr('foodAllergies', a)}
                  >
                    <Text style={on ? [s.tagTxt, s.tagTxtOn] : s.tagTxt}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.sLabel, { marginTop: 24 }]}>기타 알레르기 직접 입력</Text>
            <TextInput
              style={s.noteInput}
              value={profile.allergyNote}
              onChangeText={t => set('allergyNote', t)}
              placeholder="예: 라텍스, 특정 식품 등"
              placeholderTextColor="#B0BEC5"
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* ══ 5단계: 생활 습관 ══ */}
        {step === 5 && (
          <View>
            {[
              { key: 'smoking',  label: '🚬 흡연',  opts: SMOKE_OPTS },
              { key: 'drinking', label: '🍶 음주',  opts: DRINK_OPTS },
              { key: 'exercise', label: '🏃 운동',  opts: EXERCISE_OPTS },
              { key: 'meal',     label: '🍚 식사',  opts: MEAL_OPTS },
            ].map(({ key, label, opts }) => (
              <View key={key} style={s.habitBlock}>
                <Text style={s.sLabel}>{label}</Text>
                <View style={s.optRow}>
                  {opts.map(o => (
                    <TouchableOpacity
                      key={o}
                      style={profile[key] === o ? [s.optBtn, s.optBtnOn] : s.optBtn}
                      onPress={() => set(key, o)}
                    >
                      <Text style={profile[key] === o ? [s.optTxt, s.optTxtOn] : s.optTxt}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── 하단 버튼 ── */}
      <View style={s.footer}>
        {step > 1 && (
          <TouchableOpacity style={s.prevBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={s.prevBtnTxt}>← 이전</Text>
          </TouchableOpacity>
        )}
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={canNext() ? [s.nextBtn, { flex: step > 1 ? 1 : undefined }] : [s.nextBtn, s.nextBtnOff, { flex: step > 1 ? 1 : undefined }]}
            onPress={() => setStep(st => st + 1)}
          >
            <Text style={s.nextBtnTxt}>다음 →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={saving ? [s.nextBtn, s.nextBtnOff, { flex: 1 }] : [s.nextBtn, { flex: 1 }]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.nextBtnTxt}>저장하기 ✓</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* ── 토스트 ── */}
      {toast !== '' && (
        <View style={s.toast}>
          <Text style={s.toastTxt}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // 헤더
  header:       { backgroundColor: INDIGO, paddingHorizontal: 20, paddingBottom: 0 },
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 14 },
  backBtn:      { paddingVertical: 6, paddingRight: 12 },
  backTxt:      { fontSize: 18, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub:    { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  // 진행 도트
  dots:    { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingBottom: 14 },
  dot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn:   { width: 28, backgroundColor: '#fff', borderRadius: 6 },
  dotDone: { backgroundColor: 'rgba(255,255,255,0.75)' },

  // 웨이브
  waveWrap:   { height: 20, overflow: 'hidden' },
  waveNative: { height: 22, backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22 },

  // 단계 제목
  stepTitle: { flexDirection: 'row', alignItems: 'center', gap: 10,
               paddingHorizontal: 20, paddingVertical: 14 },
  stepNum:   { fontSize: 18, color: '#9FA8DA', fontWeight: '700' },
  stepLabel: { fontSize: 22, fontWeight: '900', color: INDIGO },

  // 스크롤
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  // 섹션 라벨
  sLabel: { fontSize: 20, fontWeight: '800', color: '#37474F', marginBottom: 12, marginTop: 8 },
  sHint:  { fontSize: 17, color: '#90A4AE', marginBottom: 12, marginTop: -6 },

  // 선택 버튼 행
  optRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  optBtn:    { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14,
               backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#C5CAE9',
               minHeight: 56, justifyContent: 'center' },
  optBtnOn:  { backgroundColor: INDIGO, borderColor: INDIGO },
  optTxt:    { fontSize: 18, fontWeight: '700', color: '#546E7A' },
  optTxtOn:  { color: '#fff' },

  // 숫자 입력 카드
  numCard:  { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  numLabel: { fontSize: 18, color: '#546E7A', fontWeight: '700', marginBottom: 8 },
  numRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  numInput: { fontSize: 34, fontWeight: '900', color: INDIGO,
              borderBottomWidth: 2.5, borderBottomColor: INDIGO,
              minWidth: 100, paddingVertical: 4 },
  numUnit:  { fontSize: 20, color: '#90A4AE', marginBottom: 6 },

  // 체크 그리드
  checkGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  checkItem:   { flexDirection: 'row', alignItems: 'center', gap: 8,
                 backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                 borderWidth: 1.5, borderColor: '#C5CAE9', minHeight: 56 },
  checkItemOn: { backgroundColor: LINDIGO, borderColor: INDIGO },
  checkBox:    { fontSize: 20, color: '#9FA8DA', width: 24, textAlign: 'center' },
  checkTxt:    { fontSize: 18, fontWeight: '700', color: '#546E7A' },
  checkTxtOn:  { color: INDIGO },

  // 수술
  surgeryCard:   { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
                   shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                   shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  surgeryInputs: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  surgInput:     { backgroundColor: BG, borderRadius: 12, borderWidth: 1.5, borderColor: '#C5CAE9',
                   fontSize: 18, fontWeight: '600', color: '#37474F',
                   paddingVertical: 14, paddingHorizontal: 14 },
  delBtn:        { backgroundColor: '#FFEBEE', borderRadius: 12, paddingVertical: 12,
                   paddingHorizontal: 16, alignItems: 'center' },
  delBtnTxt:     { fontSize: 18, fontWeight: '700', color: '#C62828' },

  addBtn:    { backgroundColor: LINDIGO, borderRadius: 18, paddingVertical: 20, alignItems: 'center',
               borderWidth: 2, borderColor: INDIGO, borderStyle: 'dashed', marginTop: 8 },
  addBtnTxt: { fontSize: 20, fontWeight: '800', color: INDIGO },

  emptyHint:    { alignItems: 'center', paddingVertical: 30 },
  emptyHintTxt: { fontSize: 18, color: '#90A4AE', textAlign: 'center', lineHeight: 28 },

  // 태그
  tagWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tag:      { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30,
              backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#C5CAE9', minHeight: 56, justifyContent: 'center' },
  tagOn:    { backgroundColor: INDIGO, borderColor: INDIGO },
  tagTxt:   { fontSize: 18, fontWeight: '700', color: '#546E7A' },
  tagTxtOn: { color: '#fff' },

  noteInput: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#C5CAE9',
               fontSize: 18, color: '#37474F', padding: 16, minHeight: 90,
               textAlignVertical: 'top' },

  // 생활습관
  habitBlock: { marginBottom: 18 },

  // 하단 버튼
  footer:     { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 32,
                backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8EAF6' },
  prevBtn:    { backgroundColor: '#ECEFF1', borderRadius: 16, paddingVertical: 18,
                paddingHorizontal: 24, alignItems: 'center', minHeight: 62 },
  prevBtnTxt: { fontSize: 20, fontWeight: '700', color: '#546E7A' },
  nextBtn:    { flex: 1, backgroundColor: INDIGO, borderRadius: 16, paddingVertical: 18,
                alignItems: 'center', minHeight: 62 },
  nextBtnOff: { backgroundColor: '#9FA8DA' },
  nextBtnTxt: { fontSize: 22, fontWeight: '900', color: '#fff' },

  // 토스트
  toast:    { position: 'absolute', bottom: 110, left: 40, right: 40,
              backgroundColor: '#37474F', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
              alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  toastTxt: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
