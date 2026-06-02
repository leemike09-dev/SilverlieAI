import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Image, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import * as Linking from 'expo-linking';

const BLUE = '#3B82F6';
const BLUE_DK = '#1E40AF';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';
const CARD_HOSPITAL = '#E8F1FC';

export default function HospitalScheduleScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const raw = await AsyncStorage.getItem(`appointments.${userId}`);
      const list = raw ? JSON.parse(raw) : [];
      setAppointments(list.sort((a: any, b: any) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateA.getTime() - dateB.getTime();
      }));
    } catch {}
    setLoading(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayAppt = appointments.find(a => a.date === today);

  if (appointments.length === 0) {
    return <EmptyState userId={userId} name={name} navigation={navigation} insets={insets} />;
  }

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>병원 일정</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}
          >
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Hero Card */}
        {todayAppt && (
          <TouchableOpacity
            style={[s.heroCard, { backgroundColor: CARD_HOSPITAL }]}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, appointmentId: todayAppt.id })}
          >
            <Text style={s.heroTime}>{todayAppt.time}</Text>
            <Text style={s.heroTimeKorean}>{(() => { const [h,m] = (todayAppt.time||'00:00').split(':').map(Number); return `${h>=12?'오후':'오전'} ${h>12?h-12:h||12}시 ${m>0?m+'분':''}`; })()}</Text>
            <Text style={s.hospitalName}>{todayAppt.hospital}</Text>
            <Text style={s.deptDoctor}>{todayAppt.dept} · {todayAppt.doctor}</Text>

            <View style={s.addressRow}>
              <Text style={s.addressIcon}>📍</Text>
              <Text style={s.addressText}>{todayAppt.address}</Text>
              <Text style={s.addressChevron}>›</Text>
            </View>

            <View style={s.ctaRow}>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary]}
                onPress={() => {
                  const query = encodeURIComponent(todayAppt.address);
                  Linking.openURL(`kakaomap://search?query=${query}`).catch(() => {});
                }}
              >
                <Text style={s.btnPrimaryText}>길 찾기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnOutline]}>
                <Text style={s.btnOutlineText}>알림 받기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Calendar Strip (week view) */}
        <View style={s.calendarStrip}>
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const isToday = dateStr === today;
            const hasAppt = appointments.some(a => a.date === dateStr);
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            const dayNum = date.getDate();

            return (
              <View key={i} style={[s.calendarDay, isToday && s.calendarDayActive]}>
                <Text style={[s.dayName, isToday && s.dayNameActive]}>{dayName}</Text>
                <Text style={[s.dayNum, isToday && s.dayNumActive]}>{dayNum}</Text>
                {hasAppt && <View style={s.apptDot} />}
              </View>
            );
          })}
        </View>

        {/* Next Appointments */}
        <Text style={s.nextTitle}>다음 일정</Text>
        {appointments.slice(1).map((apt) => (
          <TouchableOpacity
            key={apt.id}
            style={s.apptCard}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, appointmentId: apt.id })}
          >
            <View style={[s.dateBox, { backgroundColor: CARD_HOSPITAL }]}>
              <Text style={s.dateMonth}>{apt.date.slice(5, 7)}</Text>
              <Text style={s.dateDay}>{apt.date.slice(8, 10)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.apptHospital}>{apt.hospital}</Text>
              <Text style={s.apptTime}>{apt.time} · {apt.dept}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Add New */}
        <TouchableOpacity
          style={s.addCard}
          onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}
        >
          <Text style={s.addCardText}>+ 일정 추가하기</Text>
        </TouchableOpacity>

        {/* ── 월간 달력 ── */}
        <MonthlyCalendar
          year={calMonth.year}
          month={calMonth.month}
          appointments={appointments}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={() => setCalMonth(m => {
            const d = new Date(m.year, m.month - 1);
            return { year: d.getFullYear(), month: d.getMonth() };
          })}
          onNextMonth={() => setCalMonth(m => {
            const d = new Date(m.year, m.month + 1);
            return { year: d.getFullYear(), month: d.getMonth() };
          })}
          navigation={navigation}
          userId={userId}
          name={name}
        />
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="sched" userId={userId} name={name} />
    </LinearGradient>
  );
}

function EmptyState({ userId, name, navigation, insets }: any) {
  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>병원 일정</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}
          >
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Empty Hero */}
        <View style={[s.emptyHero, { backgroundColor: '#fff' }]}>
          <Text style={s.emptyIcon}>📅</Text>
          <Text style={s.emptyTitle}>병원 일정을{'\n'}등록해 보세요</Text>
          <Text style={s.emptySubtitle}>예약 시간을 잊지 않게{'\n'}제가 알려드릴게요</Text>

          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}
          >
            <Text style={s.emptyBtnText}>+ 첫 일정 추가하기</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 이런 점이 좋아요</Text>
          <Text style={s.tipItem}>✓ 예약 시간 전 자동 알림</Text>
          <Text style={s.tipItem}>✓ 가족과 일정 공유</Text>
          <Text style={s.tipItem}>✓ 병원 주소 자동 검색</Text>
        </View>
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="sched" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: INK,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
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
    fontSize: 22,
    fontWeight: '800',
    color: INK,
    flex: 1,
    lineHeight: 32,
  },

  heroCard: {
    marginHorizontal: 18,
    marginBottom: 24,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroTime: {
    fontSize: 44,
    fontWeight: '900',
    color: BLUE,
    lineHeight: 44,
  },
  heroTimeKorean: {
    fontSize: 16,
    fontWeight: '700',
    color: INK_SOFT,
    marginBottom: 12,
  },
  hospitalName: {
    fontSize: 26,
    fontWeight: '900',
    color: INK,
    marginBottom: 4,
  },
  deptDoctor: {
    fontSize: 22,
    fontWeight: '600',
    color: INK_SOFT,
    marginBottom: 16,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 12,
    marginBottom: 16,
  },
  addressIcon: {
    fontSize: 18,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: INK,
  },
  addressChevron: {
    fontSize: 18,
    color: INK_SOFT,
  },

  ctaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: BLUE,
    flex: 1.5,
  },
  btnPrimaryText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: BLUE,
    backgroundColor: '#fff',
  },
  btnOutlineText: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE_DK,
  },

  calendarStrip: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 24,
    gap: 10,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  calendarDayActive: {
    backgroundColor: BLUE,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    color: INK_SOFT,
    marginBottom: 4,
  },
  dayNameActive: {
    color: '#fff',
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '900',
    color: INK,
  },
  dayNumActive: {
    color: '#fff',
  },
  apptDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F58A4D',
    marginTop: 6,
  },

  nextTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    marginHorizontal: 18,
    marginBottom: 12,
  },

  apptCard: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: INK_SOFT,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: INK,
    marginTop: 2,
  },
  apptHospital: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
  },
  apptTime: {
    fontSize: 13,
    fontWeight: '600',
    color: INK_SOFT,
    marginTop: 4,
  },

  addCard: {
    marginHorizontal: 18,
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: INK_MUTE,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addCardText: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE,
  },

  emptyHero: {
    marginHorizontal: 18,
    marginVertical: 32,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: INK,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: INK_SOFT,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyBtn: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: BLUE,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },

  tipsCard: {
    marginHorizontal: 18,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    fontWeight: '600',
    color: INK_SOFT,
    lineHeight: 20,
  },

  // 월간 달력
  calCard: {
    marginHorizontal: 18, marginBottom: 24,
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calTitle:  { fontSize: 18, fontWeight: '900', color: INK },
  calArrow:  { fontSize: 22, color: BLUE, paddingHorizontal: 10, paddingVertical: 4 },
  calWeekRow:{ flexDirection: 'row', marginBottom: 6 },
  calWeekDay:{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: INK_MUTE },
  calGrid:   { },
  calRow:    { flexDirection: 'row', marginBottom: 4 },
  calCell:   { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
  calCellToday:   { borderWidth: 2, borderColor: BLUE },
  calCellSelected:{ backgroundColor: BLUE },
  calDayNum: { fontSize: 16, fontWeight: '700', color: INK },
  calDayNumSelected: { color: '#fff' },
  calDayNumToday: { color: BLUE, fontWeight: '900' },
  calDayNumOther: { color: INK_MUTE },
  calDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE, marginTop: 2 },
  calSelectedInfo: { marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(15,27,45,0.06)', paddingTop: 12 },
  calSelectedDate: { fontSize: 15, fontWeight: '800', color: INK, marginBottom: 8 },
  calApptRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               backgroundColor: '#F0F6FF', borderRadius: 12, padding: 12, marginBottom: 8 },
  calApptInfo: { flex: 1 },
  calApptHospital: { fontSize: 16, fontWeight: '800', color: INK },
  calApptTime: { fontSize: 14, fontWeight: '600', color: INK_MUTE, marginTop: 2 },
  calEditBtn:{ backgroundColor: BLUE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  calEditTxt:{ fontSize: 14, fontWeight: '800', color: '#fff' },
  calNoAppt: { fontSize: 15, fontWeight: '600', color: INK_MUTE, textAlign: 'center', paddingVertical: 8 },
});

// ── 월간 달력 컴포넌트 ──
function MonthlyCalendar({ year, month, appointments, selectedDate, onSelectDate,
  onPrevMonth, onNextMonth, navigation, userId, name }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 날짜→일정 맵
  const apptMap: Record<string, any[]> = {};
  appointments.forEach((a: any) => {
    if (!apptMap[a.date]) apptMap[a.date] = [];
    apptMap[a.date].push(a);
  });

  // 그리드 생성
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selectedAppts = selectedDate ? (apptMap[selectedDate] || []) : [];

  return (
    <View style={s.calCard}>
      <View style={s.calHeader}>
        <TouchableOpacity onPress={onPrevMonth}><Text style={s.calArrow}>‹</Text></TouchableOpacity>
        <Text style={s.calTitle}>{year}년 {month + 1}월</Text>
        <TouchableOpacity onPress={onNextMonth}><Text style={s.calArrow}>›</Text></TouchableOpacity>
      </View>

      <View style={s.calWeekRow}>
        {DAYS.map((d, i) => (
          <Text key={d} style={[s.calWeekDay, i === 0 && { color: '#E5453C' }, i === 6 && { color: BLUE }]}>{d}</Text>
        ))}
      </View>

      <View style={s.calGrid}>
        {rows.map((row, ri) => (
          <View key={ri} style={s.calRow}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={s.calCell} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasAppt = !!apptMap[dateStr];
              return (
                <TouchableOpacity key={ci} style={[s.calCell, isToday && s.calCellToday, isSelected && s.calCellSelected]}
                  onPress={() => onSelectDate(isSelected ? null : dateStr)}>
                  <Text style={[s.calDayNum,
                    isSelected && s.calDayNumSelected,
                    isToday && !isSelected && s.calDayNumToday,
                    ci === 0 && !isSelected && { color: '#E5453C' },
                  ]}>{day}</Text>
                  {hasAppt && !isSelected && <View style={s.calDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {selectedDate && (
        <View style={s.calSelectedInfo}>
          <Text style={s.calSelectedDate}>{selectedDate}</Text>
          {selectedAppts.length === 0 ? (
            <Text style={s.calNoAppt}>이날 일정이 없어요</Text>
          ) : (
            selectedAppts.map((apt: any) => (
              <View key={apt.id} style={s.calApptRow}>
                <View style={s.calApptInfo}>
                  <Text style={s.calApptHospital}>{apt.hospital}</Text>
                  <Text style={s.calApptTime}>{apt.time}{apt.dept ? ` · ${apt.dept}` : ''}</Text>
                </View>
                <TouchableOpacity style={s.calEditBtn}
                  onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, appointmentId: apt.id })}>
                  <Text style={s.calEditTxt}>수정</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}
