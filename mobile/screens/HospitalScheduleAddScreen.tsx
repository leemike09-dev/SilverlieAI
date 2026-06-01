import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Image, TextInput, Alert, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import DateTimePicker from '@react-native-community/datetimepicker';

const BLUE = '#3B82F6';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const RED = '#E5453C';
const INPUT_BG = '#fff';
const INPUT_PLACEHOLDER = '#7E8AA1';

export default function HospitalScheduleAddScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name, appointmentId } = route.params;
  const isEditMode = !!appointmentId;

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '14:30',
    hospital: '',
    dept: '',
    doctor: '',
    address: '',
    scheduleNote: '',
    hospitalNote: '',
    notifyDayMorning: true,
    notifyHourBefore: true,
    notifyDayBefore: false,
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
      if (existing) {
        setForm(existing);
      }
    } catch {}
  };

  const handleDateChange = (event: any, selectedDate: any) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm(f => ({ ...f, date: selectedDate.toISOString().slice(0, 10) }));
    }
  };

  const handleTimeChange = (event: any, selectedTime: any) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const h = String(selectedTime.getHours()).padStart(2, '0');
      const m = String(selectedTime.getMinutes()).padStart(2, '0');
      setForm(f => ({ ...f, time: `${h}:${m}` }));
    }
  };

  const handleSave = async () => {
    if (!form.date || !form.time || !form.hospital) {
      Alert.alert('', '필수 항목을 채워주세요');
      return;
    }

    const apt = {
      id: appointmentId || `apt-${Date.now()}`,
      ...form,
    };

    try {
      const raw = await AsyncStorage.getItem(`appointments.${userId}`);
      let list = raw ? JSON.parse(raw) : [];

      if (isEditMode) {
        list = list.map((a: any) => a.id === appointmentId ? apt : a);
      } else {
        list = [...list, apt];
      }

      await AsyncStorage.setItem(`appointments.${userId}`, JSON.stringify(list));
      navigation.replace('HospitalSchedule', { userId, name });
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다');
    }
  };

  const dateObj = new Date(form.date);
  const dateLabel = dateObj.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
  const [timeH, timeM] = form.time.split(':');
  const timeLabel = `${parseInt(timeH) >= 12 ? '오후' : '오전'} ${parseInt(timeH) % 12 || 12}:${timeM}`;

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>{isEditMode ? '일정 수정' : '병원 일정 추가'}</Text>
        </View>

        {/* Lumi Greeting */}
        <View style={s.lumiGreeting}>
          <Image source={require('../assets/lumi-happy.png')} style={s.lumiSmall} />
          <Text style={s.greetingText}>새 일정을 알려주세요.{'\n'}제가 기억할게요 💜</Text>
        </View>

        {/* Date & Time Pickers */}
        <View style={s.pickerRow}>
          <TouchableOpacity
            style={[s.pickerTile, { flex: 1 }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={s.pickerLabel}>📅 날짜</Text>
            <Text style={s.pickerValue}>{dateLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.pickerTile, { flex: 1 }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={s.pickerLabel}>🕒 시간</Text>
            <Text style={s.pickerValue}>{timeLabel}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(form.date)}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={new Date(`2000-01-01 ${form.time}`)}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}

        {/* Hospital Name */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>병원 이름 <Text style={s.required}>*</Text></Text>
          <TextInput
            style={s.input}
            placeholder="예: 서울튼튼내과"
            placeholderTextColor={INPUT_PLACEHOLDER}
            value={form.hospital}
            onChangeText={(v) => setForm(f => ({ ...f, hospital: v }))}
          />
        </View>

        {/* Dept + Doctor */}
        <View style={s.row}>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <Text style={s.fieldLabel}>진료과</Text>
            <TextInput
              style={s.input}
              placeholder="예: 내과"
              placeholderTextColor={INPUT_PLACEHOLDER}
              value={form.dept}
              onChangeText={(v) => setForm(f => ({ ...f, dept: v }))}
            />
          </View>
          <View style={[s.fieldGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={s.fieldLabel}>의사</Text>
            <TextInput
              style={s.input}
              placeholder="예: 김의사"
              placeholderTextColor={INPUT_PLACEHOLDER}
              value={form.doctor}
              onChangeText={(v) => setForm(f => ({ ...f, doctor: v }))}
            />
          </View>
        </View>

        {/* Address */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>병원 주소</Text>
          <View style={s.addressInput}>
            <Text style={s.addressIcon}>📍</Text>
            <TextInput
              style={[s.input, s.addressInputField]}
              placeholder="주소를 입력하세요"
              placeholderTextColor={INPUT_PLACEHOLDER}
              value={form.address}
              onChangeText={(v) => setForm(f => ({ ...f, address: v }))}
            />
            <TouchableOpacity>
              <Text style={s.searchChevron}>검색 →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule Note */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>이번 방문 메모</Text>
          <TextInput
            style={[s.input, s.textareaInput]}
            placeholder="예: 공복으로 가야함"
            placeholderTextColor={INPUT_PLACEHOLDER}
            value={form.scheduleNote}
            onChangeText={(v) => setForm(f => ({ ...f, scheduleNote: v }))}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Hospital Note */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>이 병원에 항상 적용</Text>
          <TextInput
            style={[s.input, s.textareaInput]}
            placeholder="예: 처방약국 위치, 주차 정보"
            placeholderTextColor={INPUT_PLACEHOLDER}
            value={form.hospitalNote}
            onChangeText={(v) => setForm(f => ({ ...f, hospitalNote: v }))}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Notification Settings */}
        <View style={s.notifCard}>
          <Text style={s.notifTitle}>알림 설정</Text>

          <View style={s.notifItem}>
            <View>
              <Text style={s.notifLabel}>당일 아침 (08:00)</Text>
              <Text style={s.notifDesc}>예약 당일 아침 8시에 알려드려요</Text>
            </View>
            <Switch
              value={form.notifyDayMorning}
              onValueChange={(v) => setForm(f => ({ ...f, notifyDayMorning: v }))}
              trackColor={{ false: '#ccc', true: '#3B82F6' }}
            />
          </View>

          <View style={s.notifItem}>
            <View>
              <Text style={s.notifLabel}>1시간 전</Text>
              <Text style={s.notifDesc}>예약 1시간 전에 알려드려요</Text>
            </View>
            <Switch
              value={form.notifyHourBefore}
              onValueChange={(v) => setForm(f => ({ ...f, notifyHourBefore: v }))}
              trackColor={{ false: '#ccc', true: '#3B82F6' }}
            />
          </View>

          <View style={[s.notifItem, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={s.notifLabel}>전날 저녁 (20:00)</Text>
              <Text style={s.notifDesc}>예약 전날 저녁 8시에 알려드려요</Text>
            </View>
            <Switch
              value={form.notifyDayBefore}
              onValueChange={(v) => setForm(f => ({ ...f, notifyDayBefore: v }))}
              trackColor={{ false: '#ccc', true: '#3B82F6' }}
            />
          </View>
        </View>

        {/* CTA Buttons */}
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

  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: INK,
  },

  lumiGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 24,
    gap: 12,
  },
  lumiSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'contain',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    flex: 1,
    lineHeight: 26,
  },

  pickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 20,
  },
  pickerTile: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: INK_SOFT,
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE,
  },

  fieldGroup: {
    marginHorizontal: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    marginBottom: 6,
  },
  required: {
    color: RED,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: INPUT_BG,
    fontSize: 16,
    fontWeight: '600',
    color: INK,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textareaInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  row: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 16,
  },

  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  addressIcon: {
    fontSize: 16,
  },
  addressInputField: {
    flex: 1,
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  searchChevron: {
    fontSize: 14,
    fontWeight: '800',
    color: BLUE,
  },

  notifCard: {
    marginHorizontal: 18,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
    marginBottom: 12,
  },
  notifItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notifLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  notifDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: INK_MUTE,
  },

  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 24,
  },
  btnCancel: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '800',
    color: INK_SOFT,
  },
  btnSave: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});
