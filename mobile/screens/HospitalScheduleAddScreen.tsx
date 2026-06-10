import React, { useState, useEffect } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, TextInput, Alert, Switch,
} from 'react-native';
import Lumi from '../components/Lumi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import KoreanLunarCalendar from 'korean-lunar-calendar';

const BLUE        = '#3B82F6';
const APP_BG_TOP  = '#F1ECE4';
const APP_BG_BOT  = '#FBF8F3';
const INK         = '#0F1B2D';
const INK_SOFT    = '#3D4B62';
const INK_MUTE    = '#7E8AA1';
const RED         = '#E5453C';
const INPUT_BG    = '#fff';
const INPUT_PH    = '#7E8AA1';
const LINE        = 'rgba(15,27,45,0.06)';

type AppType = 'hospital' | 'memo';

function solarToLunarStr(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const cal = new KoreanLunarCalendar();
    cal.setSolarDate(y, m, d);
    const l = cal.getLunarCalendar();
    return `음력 ${l.month}월 ${l.day}일`;
  } catch { return ''; }
}

export default function HospitalScheduleAddScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name, appointmentId, prefillDate } = route.params;
  const isEditMode = !!appointmentId;

  const [form, setForm] = useState({
    type:             'hospital' as AppType,
    date:             prefillDate || localDate(),
    time:             '14:30',
    isLunar:          false,
    title:            '',        // 메모 타입 제목
    hospital:         '',
    dept:             '',
    doctor:           '',
    address:          '',
    scheduleNote:     '',
    hospitalNote:     '',
    travel:           false,     // 여행 여부
    dest:             '',        // 목적지
    notifyDayMorning: true,
    notifyHourBefore: true,
    notifyDayBefore:  false,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (isEditMode) loadAppointment();
  }, []);

  const loadAppointment = async () => {
    try {
      const raw = await AsyncStorage.getItem(`appointments.${userId}`);
      const list = raw ? JSON.parse(raw) : [];
      const existing = list.find((a: any) => a.id === appointmentId);
      if (existing) setForm(existing);
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const handleDateChange = (_: any, selectedDate: any) => {
    setShowDatePicker(false);
    if (selectedDate) setForm(f => ({ ...f, date: localDate(selectedDate) }));
  };

  const handleTimeChange = (_: any, selectedTime: any) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const h = String(selectedTime.getHours()).padStart(2, '0');
      const m = String(selectedTime.getMinutes()).padStart(2, '0');
      setForm(f => ({ ...f, time: `${h}:${m}` }));
    }
  };

  const handleSave = async () => {
    const isHospital = form.type === 'hospital';
    if (!form.date || !form.time) {
      Alert.alert('', '날짜와 시간을 입력해 주세요'); return;
    }
    if (isHospital && !form.hospital.trim()) {
      Alert.alert('', '병원 이름을 입력해 주세요'); return;
    }
    if (!isHospital && !form.title.trim()) {
      Alert.alert('', '제목을 입력해 주세요'); return;
    }

    const apt = { id: appointmentId || `apt-${Date.now()}`, ...form };
    try {
      const raw = await AsyncStorage.getItem(`appointments.${userId}`);
      let list = raw ? JSON.parse(raw) : [];
      list = isEditMode
        ? list.map((a: any) => a.id === appointmentId ? apt : a)
        : [...list, apt];
      await AsyncStorage.setItem(`appointments.${userId}`, JSON.stringify(list));
      // 서버 동기화
      fetch('https://silverlieai.onrender.com/appointments/sync/' + userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointments: list }),
      }).catch(() => {});
      navigation.replace('HospitalSchedule', { userId, name });
    } catch {
      Alert.alert('오류', '저장에 실패했습니다');
    }
  };

  const dateObj   = new Date(form.date + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
  const [timeH, timeM] = form.time.split(':');
  const timeLabel = `${parseInt(timeH) >= 12 ? '오후' : '오전'} ${parseInt(timeH) % 12 || 12}:${timeM}`;

  const isHospital = form.type === 'hospital';

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>{isEditMode ? '일정 수정' : '일정 추가'}</Text>
        </View>

        {/* 타입 토글 — 🏥 병원 / 📝 일반 */}
        <View style={s.typeToggle}>
          {([['hospital', '🏥 병원'], ['memo', '📝 일반']] as [AppType, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[s.typeBtn, form.type === key && s.typeBtnActive]}
              onPress={() => setForm(f => ({ ...f, type: key }))}
              activeOpacity={0.8}
            >
              <Text style={[s.typeBtnTxt, form.type === key && s.typeBtnTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lumi Greeting */}
        <View style={s.lumiGreeting}>
          <Lumi mood="happy" size={72} bob />
          <Text style={s.greetingText}>
            {isHospital ? '새 일정을 알려주세요.\n제가 기억할게요 💜' : '메모를 남겨드릴게요.\n잊지 않게 알려드려요 📝'}
          </Text>
        </View>

        {/* ── 여행 토글 ── */}
        <TouchableOpacity
          style={s.travelToggle}
          onPress={() => setForm(f => ({ ...f, travel: !f.travel }))}
          activeOpacity={0.8}>
          <View style={[s.travelCheck, form.travel && s.travelCheckOn]}>
            {form.travel && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={s.travelToggleTxt}>✈️ 여행 일정이에요 (목적지 날씨 안내)</Text>
        </TouchableOpacity>

        {form.travel && (
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>목적지</Text>
            <TextInput
              style={s.input}
              placeholder="예) 부산, 제주도, 일본"
              placeholderTextColor="#B0BEC5"
              value={form.dest}
              onChangeText={v => setForm(f => ({ ...f, dest: v }))}
            />
          </View>
        )}

        {/* Date & Time */}
        <View style={s.pickerRow}>
          <TouchableOpacity style={[s.pickerTile, { flex: 1 }]} onPress={() => setShowDatePicker(true)}>
            <Text style={s.pickerLabel}>📅 날짜</Text>
            <Text style={s.pickerValue}>{dateLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.pickerTile, { flex: 1 }]} onPress={() => setShowTimePicker(true)}>
            <Text style={s.pickerLabel}>🕒 시간</Text>
            <Text style={s.pickerValue}>{timeLabel}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker value={new Date(form.date)} mode="date" display="spinner" onChange={handleDateChange} />
        )}
        {showTimePicker && (
          <DateTimePicker value={new Date(`2000-01-01T${form.time}:00`)} mode="time" display="spinner" onChange={handleTimeChange} />
        )}

        {/* 메모 타입: 제목 */}
        {!isHospital && (
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>제목 <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              placeholder="예: 병원 예약, 가족 모임"
              placeholderTextColor={INPUT_PH}
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
            />
          </View>
        )}

        {/* 병원 타입: 병원명 */}
        {isHospital && (
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>병원 이름 <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              placeholder="예: 서울튼튼내과"
              placeholderTextColor={INPUT_PH}
              value={form.hospital}
              onChangeText={v => setForm(f => ({ ...f, hospital: v }))}
            />
          </View>
        )}

        {/* 병원 타입 전용: 진료과 + 의사 */}
        {isHospital && (
          <View style={s.row}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>진료과</Text>
              <TextInput style={s.input} placeholder="예: 내과" placeholderTextColor={INPUT_PH}
                value={form.dept} onChangeText={v => setForm(f => ({ ...f, dept: v }))} />
            </View>
            <View style={[s.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={s.fieldLabel}>의사</Text>
              <TextInput style={s.input} placeholder="예: 김의사" placeholderTextColor={INPUT_PH}
                value={form.doctor} onChangeText={v => setForm(f => ({ ...f, doctor: v }))} />
            </View>
          </View>
        )}

        {/* 병원 타입 전용: 주소 */}
        {isHospital && (
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>병원 주소</Text>
            <View style={s.addressInput}>
              <Text style={s.addressIcon}>📍</Text>
              <TextInput
                style={[s.input, s.addressInputField]}
                placeholder="주소를 입력하세요"
                placeholderTextColor={INPUT_PH}
                value={form.address}
                onChangeText={v => setForm(f => ({ ...f, address: v }))}
              />
            </View>
          </View>
        )}

        {/* 메모 (방문/일반) */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>{isHospital ? '이번 방문 메모' : '메모'}</Text>
          <TextInput
            style={[s.input, s.textareaInput]}
            placeholder={isHospital ? '예: 공복으로 가야함' : '예: 준비물, 참고사항'}
            placeholderTextColor={INPUT_PH}
            value={form.scheduleNote}
            onChangeText={v => setForm(f => ({ ...f, scheduleNote: v }))}
            multiline numberOfLines={3}
          />
        </View>

        {/* 병원 타입 전용: 병원 메모 */}
        {isHospital && (
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>이 병원에 항상 적용</Text>
            <TextInput
              style={[s.input, s.textareaInput]}
              placeholder="예: 처방약국 위치, 주차 정보"
              placeholderTextColor={INPUT_PH}
              value={form.hospitalNote}
              onChangeText={v => setForm(f => ({ ...f, hospitalNote: v }))}
              multiline numberOfLines={3}
            />
          </View>
        )}

        {/* 알림 설정 */}
        <View style={s.notifCard}>
          <Text style={s.notifTitle}>알림 설정</Text>
          {[
            { key: 'notifyDayMorning', label: '당일 아침 (08:00)', desc: '예약 당일 아침 8시에 알려드려요' },
            { key: 'notifyHourBefore', label: '1시간 전',          desc: '예약 1시간 전에 알려드려요' },
            { key: 'notifyDayBefore',  label: '전날 저녁 (20:00)', desc: '예약 전날 저녁 8시에 알려드려요' },
          ].map((item, idx) => (
            <View key={item.key} style={[s.notifItem, idx === 2 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.notifLabel}>{item.label}</Text>
                <Text style={s.notifDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={(form as any)[item.key]}
                onValueChange={v => setForm(f => ({ ...f, [item.key]: v }))}
                trackColor={{ false: '#ccc', true: BLUE }}
              />
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={s.ctaRow}>
          <TouchableOpacity style={s.btnCancel} onPress={() => navigation.goBack()}>
            <Text style={s.btnCancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnSave, { flex: 2 }]} onPress={handleSave}>
            <Text style={s.btnSaveText}>일정 저장</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="sched" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingHorizontal: 18, paddingBottom: 12 },
  headerTitle: { fontSize: 30, fontWeight: '900', color: INK },

  typeToggle: {
    flexDirection: 'row', marginHorizontal: 18, marginBottom: 20, gap: 10,
  },
  typeBtn: {
    flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 2, borderColor: LINE,
  },
  typeBtnActive:    { backgroundColor: BLUE, borderColor: BLUE },
  typeBtnTxt:       { fontSize: 20, fontWeight: '800', color: INK_MUTE },
  typeBtnTxtActive: { color: '#fff' },

  lumiGreeting: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginBottom: 20, gap: 12,
  },
  greetingText: { fontSize: 18, fontWeight: '700', color: INK, flex: 1, lineHeight: 26 },

  travelToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 18, marginBottom: 16,
    backgroundColor: '#F0F7FF', borderRadius: 14, padding: 16,
  },
  travelCheck: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  travelCheckOn:  { backgroundColor: '#3B82F6' },
  travelToggleTxt:{ fontSize: 18, fontWeight: '700', color: '#1E40AF', flex: 1 },

  lunarRow: {
    flexDirection: 'row', marginHorizontal: 18, marginBottom: 10, gap: 8,
  },
  lunarBtn:       { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: LINE },
  lunarBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  lunarBtnTxt:    { fontSize: 16, fontWeight: '700', color: INK_MUTE },
  lunarBtnTxtActive: { color: '#fff' },
  lunarCaption:   { fontSize: 12, color: INK_MUTE, marginTop: 4, fontWeight: '600' },

  pickerRow: { flexDirection: 'row', gap: 12, marginHorizontal: 18, marginBottom: 20 },
  pickerTile: {
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  pickerLabel: { fontSize: 13, fontWeight: '700', color: INK_SOFT, marginBottom: 4 },
  pickerValue: { fontSize: 18, fontWeight: '800', color: BLUE },

  fieldGroup: { marginHorizontal: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: INK, marginBottom: 6 },
  required:   { color: RED },

  input: {
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: INPUT_BG, fontSize: 18, fontWeight: '600', color: INK,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  textareaInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 },

  row: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 16 },

  addressInput: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: '#e5e7eb', gap: 8,
  },
  addressIcon:       { fontSize: 18 },
  addressInputField: { flex: 1, borderWidth: 0, padding: 0, margin: 0, fontSize: 18, fontWeight: '600', color: INK },

  notifCard: {
    marginHorizontal: 18, marginBottom: 20, paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  notifTitle: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 12 },
  notifItem:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LINE,
  },
  notifLabel: { fontSize: 16, fontWeight: '700', color: INK, marginBottom: 2 },
  notifDesc:  { fontSize: 13, fontWeight: '500', color: INK_MUTE },

  ctaRow: { flexDirection: 'row', gap: 12, marginHorizontal: 18, marginBottom: 24 },
  btnCancel: {
    flex: 1, minHeight: 64, borderRadius: 16,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelText: { fontSize: 18, fontWeight: '800', color: INK_SOFT },
  btnSave: {
    minHeight: 64, borderRadius: 16, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSaveText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
