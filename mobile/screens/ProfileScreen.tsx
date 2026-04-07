import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

const C = {
  blue1:   '#1A4A8A',
  blue2:   '#2272B8',
  bg:      '#F0F5FB',
  card:    '#FFFFFF',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#DDE8F4',
  reason:  '#EBF3FB',
};

const SECTIONS = ['기본정보', '신체정보', '건강상태', '생활습관', 'AI성향'];

const CHRONIC_OPTIONS = ['당뇨', '고혈압', '심장질환', '관절염', '골다공증', '고지혈증', '갑상선', '기타'];
const EXERCISE_OPTIONS = ['거의 안함', '주 1~2회', '주 3~4회', '매일'];
const DRINKING_OPTIONS = ['안 함', '가끔 (월 1~2회)', '자주 (주 1회 이상)'];
const GENDER_OPTIONS = ['남성', '여성'];
const BLOOD_OPTIONS = ['A형', 'B형', 'O형', 'AB형', '모름'];
const CHAT_OPTIONS = ['짧고 핵심만', '자세하게'];
const INTERESTS_OPTIONS = ['건강·운동', '요리·식단', '여행', '독서', '음악·영화', '손주·가족', '종교·명상', '사교모임'];

export default function ProfileScreen({ navigation, route }: any) {
  const { userId: paramUserId, name: paramName } = route?.params ?? {};
  const [userId, setUserId] = useState(paramUserId || '');
  const [step,   setStep]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // 기본정보
  const [name,   setName]   = useState(paramName || '');
  const [age,    setAge]    = useState('');
  const [gender, setGender] = useState('');
  const [region, setRegion] = useState('');

  // 신체정보
  const [height,    setHeight]    = useState('');
  const [weight,    setWeight]    = useState('');
  const [bloodType, setBloodType] = useState('');

  // 건강상태
  const [chronicDiseases,  setChronicDiseases]  = useState<string[]>([]);
  const [takingMedication, setTakingMedication] = useState<boolean | null>(null);
  const [medicationList,   setMedicationList]   = useState('');

  // 생활습관
  const [exerciseFreq, setExerciseFreq] = useState('');
  const [sleepHours,   setSleepHours]   = useState('');
  const [smoking,      setSmoking]      = useState<boolean | null>(null);
  const [drinking,     setDrinking]     = useState('');

  // AI성향
  const [chatStyle, setChatStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => { if (id) setUserId(id); });
  }, []);

  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.name)               setName(d.name);
        if (d.phone)              setPhone(d.phone);
        if (d.age)                setAge(String(d.age));
        if (d.gender)             setGender(d.gender);
        if (d.region)             setRegion(d.region);
        if (d.height)             setHeight(String(d.height));
        if (d.weight)             setWeight(String(d.weight));
        if (d.blood_type)         setBloodType(d.blood_type);
        if (d.chronic_diseases)   setChronicDiseases(d.chronic_diseases);
        if (d.taking_medication != null) setTakingMedication(d.taking_medication);
        if (d.medication_list)    setMedicationList(d.medication_list);
        if (d.exercise_frequency) setExerciseFreq(d.exercise_frequency);
        if (d.sleep_hours)        setSleepHours(String(d.sleep_hours));
        if (d.smoking != null)    setSmoking(d.smoking);
        if (d.drinking)           setDrinking(d.drinking);
        if (d.chat_style)         setChatStyle(d.chat_style);
        if (d.interests)          setInterests(d.interests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const completedSections = () => {
    let count = 0;
    if (name && age && gender) count++;
    if (height && weight) count++;
    if (chronicDiseases.length > 0 || takingMedication != null) count++;
    if (exerciseFreq || sleepHours) count++;
    if (chatStyle || interests.length > 0) count++;
    return count;
  };

  const handleSave = async () => {
    if (userId === 'demo-user' || !userId) {
      Alert.alert('알림', '로그인 후 프로필을 저장할 수 있습니다.'); return;
    }
    setSaving(true);
    try {
      const body: any = {};
      if (name)              body.name = name.trim();
      if (phone)             body.phone = phone.trim();
      if (age)               body.age = parseInt(age);
      if (gender)            body.gender = gender;
      if (region)            body.region = region.trim();
      if (height)            body.height = parseFloat(height);
      if (weight)            body.weight = parseFloat(weight);
      if (bloodType)         body.blood_type = bloodType;
      if (chronicDiseases.length > 0) body.chronic_diseases = chronicDiseases;
      if (takingMedication != null)   body.taking_medication = takingMedication;
      if (medicationList)    body.medication_list = medicationList.trim();
      if (exerciseFreq)      body.exercise_frequency = exerciseFreq;
      if (sleepHours)        body.sleep_hours = parseFloat(sleepHours);
      if (smoking != null)   body.smoking = smoking;
      if (drinking)          body.drinking = drinking;
      if (chatStyle)         body.chat_style = chatStyle;
      if (interests.length > 0) body.interests = interests;

      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (name) await AsyncStorage.setItem('userName', name.trim());
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

  const pct = Math.round((completedSections() / 5) * 100);

  const renderReason = (text: string) => (
    <View style={styles.reasonBox}>
      <Text style={styles.reasonText}>💡 {text}</Text>
    </View>
  );

  const renderChip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}>
      <Text style={[styles.chipTxt, selected && styles.chipTxtSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderSection = () => {
    switch (step) {
      case 0: return (
        <View style={styles.card}>
          {renderReason('AI가 나를 이름으로 부르고, 지역 맞춤 건강 정보를 드려요')}
          <Text style={styles.label}>이름</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="이름을 입력하세요" placeholderTextColor={C.sub} maxLength={20} />
          <Text style={styles.label}>나이</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge}
            placeholder="예: 65" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={3} />
          <Text style={styles.label}>성별</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map(g => renderChip(g, gender === g, () => setGender(g)))}
          </View>
          <Text style={styles.label}>전화번호</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone}
            placeholder="예: 010-1234-5678" placeholderTextColor={C.sub}
            keyboardType="phone-pad" maxLength={15} />
          <Text style={styles.label}>거주 지역</Text>
          <TextInput style={styles.input} value={region} onChangeText={setRegion}
            placeholder="예: 서울 강남구" placeholderTextColor={C.sub} maxLength={20} />
        </View>
      );
      case 1: return (
        <View style={styles.card}>
          {renderReason('키·몸무게로 내 건강 적정 범위를 자동 계산하고 BMI를 알려드려요')}
          <Text style={styles.label}>키 (cm)</Text>
          <TextInput style={styles.input} value={height} onChangeText={setHeight}
            placeholder="예: 165" placeholderTextColor={C.sub} keyboardType="decimal-pad" maxLength={5} />
          <Text style={styles.label}>몸무게 (kg)</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight}
            placeholder="예: 60" placeholderTextColor={C.sub} keyboardType="decimal-pad" maxLength={5} />
          <Text style={styles.label}>혈액형</Text>
          <View style={styles.chipRow}>
            {BLOOD_OPTIONS.map(b => renderChip(b, bloodType === b, () => setBloodType(b)))}
          </View>
        </View>
      );
      case 2: return (
        <View style={styles.card}>
          {renderReason('내 질환을 알면 AI가 맞지 않는 조언은 제외하고 안전한 정보만 드려요')}
          <Text style={styles.label}>현재 앓고 있는 질환 (해당 항목 모두 선택)</Text>
          <View style={styles.chipRow}>
            {CHRONIC_OPTIONS.map(c => renderChip(c, chronicDiseases.includes(c),
              () => toggleItem(chronicDiseases, setChronicDiseases, c)))}
          </View>
          <Text style={styles.label}>현재 복용 중인 약이 있나요?</Text>
          <View style={styles.chipRow}>
            {renderChip('있음', takingMedication === true, () => setTakingMedication(true))}
            {renderChip('없음', takingMedication === false, () => setTakingMedication(false))}
          </View>
          {takingMedication && (
            <>
              <Text style={styles.label}>복용 중인 약 (간단히 적어주세요)</Text>
              <TextInput style={styles.input} value={medicationList} onChangeText={setMedicationList}
                placeholder="예: 혈압약, 당뇨약" placeholderTextColor={C.sub} maxLength={100} />
            </>
          )}
        </View>
      );
      case 3: return (
        <View style={styles.card}>
          {renderReason('생활 패턴을 알면 나에게 딱 맞는 현실적인 건강 목표를 세울 수 있어요')}
          <Text style={styles.label}>운동 빈도</Text>
          <View style={styles.chipRow}>
            {EXERCISE_OPTIONS.map(e => renderChip(e, exerciseFreq === e, () => setExerciseFreq(e)))}
          </View>
          <Text style={styles.label}>평균 수면 시간</Text>
          <TextInput style={styles.input} value={sleepHours} onChangeText={setSleepHours}
            placeholder="예: 7" placeholderTextColor={C.sub} keyboardType="decimal-pad" maxLength={3} />
          <Text style={styles.label}>흡연</Text>
          <View style={styles.chipRow}>
            {renderChip('흡연 중', smoking === true, () => setSmoking(true))}
            {renderChip('비흡연', smoking === false, () => setSmoking(false))}
          </View>
          <Text style={styles.label}>음주</Text>
          <View style={styles.chipRow}>
            {DRINKING_OPTIONS.map(d => renderChip(d, drinking === d, () => setDrinking(d)))}
          </View>
        </View>
      );
      case 4: return (
        <View style={styles.card}>
          {renderReason('AI 상담 스타일과 관심사를 맞추면 내가 원하는 방식으로 대화할 수 있어요')}
          <Text style={styles.label}>AI 대화 스타일</Text>
          <View style={styles.chipRow}>
            {CHAT_OPTIONS.map(c => renderChip(c, chatStyle === c, () => setChatStyle(c)))}
          </View>
          <Text style={styles.label}>관심 분야 (여러 개 선택 가능)</Text>
          <View style={styles.chipRow}>
            {INTERESTS_OPTIONS.map(i => renderChip(i, interests.includes(i),
              () => toggleItem(interests, setInterests, i)))}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 프로필</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color={C.blue1} style={{ marginTop: 60 }} /> : (
          <>
            {/* 완성도 카드 */}
            <View style={styles.progressCard}>
              <View style={styles.progressLeft}>
                <Text style={styles.progressName}>👤 {name || '이름을 입력해주세요'}</Text>
                <Text style={styles.progressPct}>프로필 완성도 {pct}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
              <View style={styles.progressRight}>
                <Text style={styles.progressHint}>{`완성할수록\nAI가\n더 정확하게\n도와드려요 ✨`}</Text>
              </View>
            </View>

            {/* 섹션 탭 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
              {SECTIONS.map((s, i) => (
                <TouchableOpacity key={s} style={[styles.tab, step === i && styles.tabActive]}
                  onPress={() => setStep(i)}>
                  <Text style={[styles.tabTxt, step === i && styles.tabTxtActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 섹션 내용 */}
            {renderSection()}

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
    backgroundColor: '#1A4A8A',
    paddingTop: Platform.OS === 'web' ? 30 : 52,
    paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backTxt:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },

  progressCard: {
    backgroundColor: '#1A4A8A', borderRadius: 16,
    padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  progressLeft:  { flex: 1, marginRight: 12 },
  progressRight: {
    width: 110, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10,
  },
  progressName: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  progressPct:  { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginBottom: 8 },
  progressBar:  { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  progressHint: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24 },

  tabScroll: { marginBottom: 14 },
  tabRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  tab:       { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 20,
               backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE8F4' },
  tabActive: { backgroundColor: '#1A4A8A', borderColor: '#1A4A8A' },
  tabTxt:    { fontSize: 16, fontWeight: '600', color: '#7A90A8' },
  tabTxtActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#DDE8F4', marginBottom: 16,
  },
  reasonBox: {
    backgroundColor: '#EBF3FB', borderRadius: 12,
    padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#1A4A8A',
  },
  reasonText: { fontSize: 16, color: '#1A4A8A', lineHeight: 24, fontWeight: '600' },

  label: { fontSize: 18, fontWeight: '700', color: '#16273E', marginBottom: 10, marginTop: 16 },
  input: {
    backgroundColor: '#F0F5FB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 19, color: '#16273E',
    borderWidth: 1, borderColor: '#DDE8F4',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:    { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20,
             backgroundColor: '#F0F5FB', borderWidth: 1, borderColor: '#DDE8F4' },
  chipSelected: { backgroundColor: '#1A4A8A', borderColor: '#1A4A8A' },
  chipTxt:      { fontSize: 17, fontWeight: '600', color: '#7A90A8' },
  chipTxtSelected: { color: '#fff' },

  saveBtn: {
    backgroundColor: '#1A4A8A', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center', marginTop: 4,
  },
  saveTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
