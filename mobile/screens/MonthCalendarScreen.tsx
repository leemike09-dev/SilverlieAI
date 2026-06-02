import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';

const BLUE    = '#3B82F6';
const BLUE_DK = '#1E40AF';
const ORANGE  = '#E0972B';
const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const INK      = '#0F1B2D';
const INK_SOFT = '#3D4B62';
const INK_MUTE = '#7E8AA1';

const TYPE = {
  hospital: { tint: '#E6EDF7', ink: BLUE_DK,  icon: '🏥', label: '병원' },
  memo:     { tint: '#FBEFD9', ink: ORANGE,    icon: '📝', label: '메모' },
};
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthCalendarScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;
  const [appointments, setAppointments] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  useEffect(() => {
    AsyncStorage.getItem(`appointments.${userId}`).then(raw => {
      if (raw) setAppointments(JSON.parse(raw));
    });
  }, []);

  const apptMap: Record<string, any[]> = {};
  appointments.forEach(a => {
    if (!apptMap[a.date]) apptMap[a.date] = [];
    apptMap[a.date].push(a);
  });

  const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selAppts = selectedDate ? (apptMap[selectedDate] || []) : [];
  const monthLabel = `${calMonth.year} / ${calMonth.month + 1}월`;

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>월간 일정표</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}>
            <Text style={s.addBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 캘린더 카드 */}
        <View style={s.calCard}>
          {/* 월 네비 */}
          <View style={s.calNav}>
            <TouchableOpacity onPress={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>
              <Text style={s.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={s.calTitle}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>
              <Text style={s.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 요일 헤더 */}
          <View style={s.weekRow}>
            {DAYS_KO.map((d, i) => (
              <Text key={d} style={[s.weekDay, i === 0 && { color: '#D9847F' }, i === 6 && { color: '#7FA6E0' }]}>{d}</Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          {rows.map((row, ri) => (
            <View key={ri} style={s.calRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={s.calCell} />;
                const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === today;
                const isSel = dateStr === selectedDate;
                const dayAppts = apptMap[dateStr] || [];
                const hasH = dayAppts.some(a => !a.type || a.type === 'hospital');
                const hasM = dayAppts.some(a => a.type === 'memo');
                return (
                  <TouchableOpacity key={ci} style={[s.calCell, isToday && s.calCellToday, isSel && s.calCellSel]}
                    onPress={() => setSelectedDate(isSel ? null : dateStr)}>
                    <Text style={[s.calDay,
                      ci === 0 && { color: '#D9847F' }, ci === 6 && { color: '#7FA6E0' },
                      isSel && { color: '#fff' }, isToday && !isSel && { color: BLUE, fontWeight: '900' },
                    ]}>{day}</Text>
                    <View style={s.calBars}>
                      {hasH && <View style={[s.calBar, { backgroundColor: isSel ? '#fff' : BLUE }]} />}
                      {hasM && <View style={[s.calBar, { backgroundColor: isSel ? '#fff' : ORANGE }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* 범례 */}
          <View style={s.legend}>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: BLUE }]} /><Text style={s.legendTxt}>병원</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: ORANGE }]} /><Text style={s.legendTxt}>메모</Text></View>
          </View>
        </View>

        {/* 선택 날짜 아젠다 */}
        {selectedDate && (
          <View style={s.agenda}>
            <Text style={s.agendaDate}>
              {selectedDate.slice(5, 7)}월 {selectedDate.slice(8, 10)}일 ({DAYS_KO[new Date(selectedDate).getDay()]})
            </Text>
            {selAppts.length === 0 ? (
              <Text style={s.agendaEmpty}>이 날은 일정이 없어요</Text>
            ) : (
              selAppts.map(apt => {
                const tc = TYPE[apt.type as 'hospital' | 'memo'] || TYPE.hospital;
                return (
                  <View key={apt.id} style={[s.agendaCard, { borderLeftColor: tc.ink }]}>
                    <View style={s.agendaInfo}>
                      <View style={s.agendaNameRow}>
                        <Text style={s.agendaName}>{apt.hospital || apt.name}</Text>
                        <View style={[s.agendaBadge, { backgroundColor: tc.tint }]}>
                          <Text style={[s.agendaBadgeTxt, { color: tc.ink }]}>{tc.icon} {tc.label}</Text>
                        </View>
                      </View>
                      {apt.time ? <Text style={s.agendaTime}>{apt.time} {apt.dept ? `· ${apt.dept}` : ''}</Text> : null}
                      {apt.scheduleNote ? <Text style={s.agendaNote} numberOfLines={1}>{apt.scheduleNote}</Text> : null}
                    </View>
                    <TouchableOpacity style={s.editBtn}
                      onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, appointmentId: apt.id })}>
                      <Text style={s.editBtnTxt}>수정</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <TouchableOpacity style={s.addDayBtn}
              onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, prefillDate: selectedDate })}>
              <Text style={s.addDayBtnTxt}>+ 이 날에 일정·메모 추가</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <SeniorTabBar navigation={navigation} activeTab="sched" userId={userId} name={name} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 12 },
  backBtn: { paddingRight: 12 },
  backTxt: { fontSize: 18, fontWeight: '700', color: BLUE_DK },
  headerTitle: { flex: 1, fontSize: 26, fontWeight: '900', color: INK },
  addBtn: { backgroundColor: BLUE, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt: { fontSize: 28, fontWeight: '300', color: '#fff', lineHeight: 34 },

  calCard: {
    marginHorizontal: 18, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 26, padding: 18,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navArrow: { fontSize: 28, color: BLUE, paddingHorizontal: 8 },
  calTitle: { fontSize: 22, fontWeight: '900', color: INK },
  weekRow:  { flexDirection: 'row', marginBottom: 8 },
  weekDay:  { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: INK_MUTE },
  calRow:   { flexDirection: 'row', marginBottom: 4 },
  calCell:  { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 14, minHeight: 50, justifyContent: 'center' },
  calCellToday: { borderWidth: 2, borderColor: BLUE },
  calCellSel:   { backgroundColor: BLUE },
  calDay:   { fontSize: 17, fontWeight: '700', color: INK },
  calBars:  { flexDirection: 'row', gap: 2, marginTop: 2 },
  calBar:   { width: 16, height: 4, borderRadius: 2 },
  legend:   { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(15,27,45,0.06)' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendTxt:  { fontSize: 13, fontWeight: '600', color: INK_MUTE },

  agenda: { marginHorizontal: 18 },
  agendaDate: { fontSize: 18, fontWeight: '900', color: INK, marginBottom: 12 },
  agendaEmpty:{ fontSize: 16, fontWeight: '600', color: INK_MUTE, paddingVertical: 16, textAlign: 'center' },
  agendaCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#1C3C6E', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  agendaInfo:    { flex: 1 },
  agendaNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  agendaName:    { flex: 1, fontSize: 18, fontWeight: '800', color: INK },
  agendaBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  agendaBadgeTxt:{ fontSize: 12, fontWeight: '700' },
  agendaTime:    { fontSize: 15, fontWeight: '600', color: INK_SOFT, marginBottom: 2 },
  agendaNote:    { fontSize: 14, fontWeight: '500', color: INK_MUTE },
  editBtn:  { backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, justifyContent: 'center' },
  editBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  addDayBtn: {
    marginTop: 8, paddingVertical: 16, borderRadius: 14,
    borderWidth: 2, borderStyle: 'dashed', borderColor: BLUE,
    alignItems: 'center',
  },
  addDayBtnTxt: { fontSize: 17, fontWeight: '700', color: BLUE },
});
