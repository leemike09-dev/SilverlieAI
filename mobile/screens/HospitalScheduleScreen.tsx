import React, { useState, useEffect, useCallback } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, Modal, TextInput,
} from 'react-native';
import Lumi from '../components/Lumi';
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
const ORANGE = '#E0972B';
const CARD_MEMO = '#FBEFD9';

const TYPE_CONFIG: Record<string, { tint: string; ink: string; icon: string; label: string }> = {
  hospital: { tint: CARD_HOSPITAL, ink: BLUE_DK, icon: '🏥', label: '병원' },
  memo:     { tint: CARD_MEMO,     ink: ORANGE,  icon: '📝', label: '메모' },
  travel:   { tint: '#E8F4FD',     ink: '#1565C0', icon: '✈️', label: '여행' },
};

function condGlyph(type: string) {
  if (type === 'clear') return '☀️';
  if (type === 'cloud') return '☁️';
  return '🌧️';
}
function packAdvice(condType: string, isTravel: boolean): string {
  if (condType === 'rain') return isTravel ? '🧳 우산과 비옷 꼭 챙기세요' : '☂️ 우산 꼭 챙기세요';
  if (condType === 'cloud') return isTravel ? '🧳 가벼운 겉옷 챙기세요' : '🌥️ 가벼운 겉옷 추천';
  return isTravel ? '🧳 햇볕 가릴 모자 챙기세요' : '🌤️ 나들이하기 좋아요';
}
function WeatherStrip({ appt, forecast }: { appt: any; forecast: any[] }) {
  const today = new Date();
  const apptDate = new Date(appt.date);
  const diffDays = Math.floor((apptDate.getTime() - today.getTime()) / 86400000);
  const isTravel = !!appt.travel;
  const dest = appt.dest || appt.hospital || '목적지';

  if (diffDays > 5) {
    if (!isTravel) return null;
    return (
      <View style={ws.strip}>
        <Text style={ws.stripTxt}>✈️ 여행이 가까워지면 {dest} 날씨를 알려드릴게요</Text>
      </View>
    );
  }
  const dayForecast = forecast.find(f => f.date === appt.date);
  if (!dayForecast) return null;
  const ct = dayForecast.cond_type;
  return (
    <View style={[ws.strip, { backgroundColor: ct === 'rain' ? '#EBF4FF' : '#EDFAF3' }]}>
      <Text style={ws.stripLine1}>
        {condGlyph(ct)} {dest}은 {dayForecast.condition} {dayForecast.temp_max}°/{dayForecast.temp_min}°
      </Text>
      <Text style={ws.stripLine2}>{packAdvice(ct, isTravel)}</Text>
    </View>
  );
}
import { StyleSheet as WS } from 'react-native';
const ws = WS.create({
  strip:     { backgroundColor: '#EBF4FF', borderRadius: 10, padding: 10, marginTop: 10 },
  stripTxt:  { fontSize: 15, fontWeight: '600', color: '#1565C0' },
  stripLine1:{ fontSize: 15, fontWeight: '700', color: '#0F1B2D', marginBottom: 3 },
  stripLine2:{ fontSize: 14, fontWeight: '600', color: '#3D4B62' },
});

export default function HospitalScheduleScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'hospital' | 'memo'>('all');
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [doctorMemos, setDoctorMemos] = useState<any[]>([]);
  const [memoModal, setMemoModal] = useState<any | null>(null);
  const [editingMemo, setEditingMemo] = useState('');
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);

  useEffect(() => {
    loadAppointments();
    loadDoctorMemos();
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      let lat = 37.5665, lng = 126.9780;
      const cached = await AsyncStorage.getItem(`location.${userId}.current`);
      if (cached) { const p = JSON.parse(cached); if (p.lat) { lat = p.lat; lng = p.lng; } }
      const res = await fetch(`https://silverlieai.onrender.com/weather?lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const d = await res.json();
        setWeatherForecast(d.forecast || []);
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const loadDoctorMemos = async () => {
    try {
      const raw = await AsyncStorage.getItem('doctor_memos');
      setDoctorMemos(raw ? JSON.parse(raw) : []);
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
  };

  const BACKEND = 'https://silverlieai.onrender.com';

  const sortAppts = (list: any[]) => list.sort((a, b) =>
    new Date(a.date + ' ' + (a.time || '00:00')).getTime() -
    new Date(b.date + ' ' + (b.time || '00:00')).getTime()
  );

  const loadAppointments = async () => {
    try {
      const raw = await AsyncStorage.getItem(`appointments.${userId}`);
      const local: any[] = raw ? JSON.parse(raw) : [];
      setAppointments(sortAppts(local));

      // 서버에서 최신 목록 병합
      if (userId && userId !== 'guest') {
        try {
          const res = await fetch(`${BACKEND}/appointments/${userId}`);
          if (res.ok) {
            const server: any[] = await res.json();
            if (server.length > 0) {
              // 서버 기준으로 병합 (로컬에만 있는 것 유지)
              const serverIds = new Set(server.map(a => a.id));
              const localOnly = local.filter(a => !serverIds.has(a.id));
              const merged = sortAppts([...server, ...localOnly]);
              setAppointments(merged);
              await AsyncStorage.setItem(`appointments.${userId}`, JSON.stringify(merged));
            }
          }
        } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      }
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    setLoading(false);
  };

  const today = localDate();
  const upcomingAll = appointments.filter(a => a.date >= today);
  const upcomingAppts = filterType === 'all' ? upcomingAll
    : upcomingAll.filter(a => (a.type || 'hospital') === filterType);
  const heroAppt = upcomingAppts[0] || null;
  const isToday = heroAppt?.date === today;

  if (appointments.length === 0) {
    return <EmptyState userId={userId} name={name} navigation={navigation} insets={insets} />;
  }

  const formatTimeKo = (time: string) => {
    const [h, m] = (time || '00:00').split(':').map(Number);
    return `${h >= 12 ? '오후' : '오전'} ${h > 12 ? h - 12 : h || 12}시${m > 0 ? ` ${m}분` : ''}`;
  };

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <Text style={s.headerTitle}>내 일정 / 병원 일정</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}>
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 필터 세그먼트 */}
        <View style={s.filterRow}>
          {([['all','전체'],['hospital','🏥 병원'],['memo','📝 메모']] as const).map(([key,label]) => (
            <TouchableOpacity key={key}
              style={[s.filterBtn, filterType === key && s.filterBtnActive]}
              onPress={() => setFilterType(key)} activeOpacity={0.8}>
              <Text style={[s.filterBtnTxt, filterType === key && s.filterBtnTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 루미 인사 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12, gap: 12 }}>
          <Lumi mood="happy" size={72} bob />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#3D4B62', flex: 1 }}>
            {isToday ? '오늘 병원 가는 날이에요!\n같이 다녀와요 💜' : '다음 일정을 확인해요'}
          </Text>
        </View>

        {/* 필터 결과 없음 */}
        {!heroAppt && filterType !== 'all' && (
          <View style={s.filterEmpty}>
            <Text style={s.filterEmptyTxt}>
              {filterType === 'hospital' ? '예정된 병원 일정이 없어요' : '예정된 메모가 없어요'}
            </Text>
          </View>
        )}

        {/* 동적 HERO 카드 */}
        {heroAppt && (
          <TouchableOpacity
            style={[s.heroCard, { backgroundColor: TYPE_CONFIG[heroAppt.type || 'hospital'].tint }]}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, appointmentId: heroAppt.id })}
          >
            <View style={s.heroBadgeRow}>
              <View style={[s.typeBadge, { backgroundColor: TYPE_CONFIG[heroAppt.type || 'hospital'].ink }]}>
                <Text style={s.typeBadgeTxt}>{isToday ? '오늘' : `${heroAppt.date.slice(5, 7)}월 ${heroAppt.date.slice(8, 10)}일`}</Text>
              </View>
              <Text style={s.typeIcon}>{TYPE_CONFIG[heroAppt.type || 'hospital'].icon}</Text>
            </View>
            <Text style={s.heroTime}>{heroAppt.time}</Text>
            <Text style={s.heroTimeKorean}>{formatTimeKo(heroAppt.time)}</Text>
            <Text style={s.hospitalName}>{heroAppt.hospital || heroAppt.name}</Text>
            {heroAppt.dept ? <Text style={s.deptDoctor}>{heroAppt.dept}{heroAppt.doctor ? ` · ${heroAppt.doctor}` : ''}</Text> : null}

            {heroAppt.address ? (
              <View style={s.addressRow}>
                <Text style={s.addressIcon}>📍</Text>
                <Text style={s.addressText}>{heroAppt.address}</Text>
                <Text style={s.addressChevron}>›</Text>
              </View>
            ) : null}

            {heroAppt.type !== 'memo' && heroAppt.address ? (
              <View style={s.ctaRow}>
                <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => {
                  Linking.openURL(`kakaomap://search?query=${encodeURIComponent(heroAppt.address)}`).catch(() => {});
                }}>
                  <Text style={s.btnPrimaryText}>길 찾기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnOutline]}>
                  <Text style={s.btnOutlineText}>알림 받기</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <WeatherStrip appt={heroAppt} forecast={weatherForecast} />
          </TouchableOpacity>
        )}

        {/* 다음 일정 목록 */}
        {upcomingAppts.length > 1 && (
          <>
            <Text style={s.nextTitle}>다음 일정</Text>
            {upcomingAppts.slice(1).map(apt => {
              const tc = TYPE_CONFIG[apt.type || 'hospital'];
              return (
                <TouchableOpacity key={apt.id} style={s.apptCard}
                  onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name, appointmentId: apt.id })}>
                  <View style={[s.dateBox, { backgroundColor: tc.tint }]}>
                    <Text style={[s.dateMonth, { color: tc.ink }]}>{apt.date.slice(5, 7)}</Text>
                    <Text style={[s.dateDay, { color: tc.ink }]}>{apt.date.slice(8, 10)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.apptHospital}>{apt.hospital || apt.title || apt.name}</Text>
                    <Text style={s.apptTime}>{apt.time}{apt.dept ? ` · ${apt.dept}` : ''}</Text>
                    <WeatherStrip appt={apt} forecast={weatherForecast} />
                  </View>
                  <Text style={s.typeIcon}>{tc.icon}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* 일정 추가 */}
        <TouchableOpacity style={s.addCard} onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}>
          <Text style={s.addCardText}>+ 일정·메모 추가하기</Text>
        </TouchableOpacity>

        {/* 월간 일정표 버튼 */}
        <TouchableOpacity style={s.monthCalBtn} onPress={() => navigation.navigate('MonthCalendar', { userId, name })}>
          <Text style={s.monthCalIcon}>🗓️</Text>
          <Text style={s.monthCalTxt}>월간 일정표 보기</Text>
          <Text style={s.monthCalArrow}>›</Text>
        </TouchableOpacity>

        {/* 병원전달 메모 카드 — 전체·병원 필터에서만 표시 */}
        {doctorMemos.length > 0 && filterType !== 'memo' && (
          <View style={s.doctorMemoCard}>
            <View style={s.doctorMemoHeader}>
              <View style={s.doctorMemoChip}>
                <Text style={s.doctorMemoChipTxt}>🩺 병원전달 메모</Text>
              </View>
              <Text style={s.doctorMemoCount}>{doctorMemos.length}개</Text>
            </View>
            {doctorMemos.slice(0, 3).map((item: any, idx: number) => {
              const dateLabel = item.localDate
                ? `${parseInt(item.localDate.split('-')[1])}월 ${parseInt(item.localDate.split('-')[2])}일`
                : (() => { const d = new Date(item.createdAt); return `${d.getMonth()+1}월 ${d.getDate()}일`; })();
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.7}
                  style={[s.doctorMemoItem, idx < Math.min(doctorMemos.length,3)-1 && s.doctorMemoItemBorder]}
                  onPress={() => { setMemoModal(item); setEditingMemo(item.memo); }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={s.doctorMemoDate}>{dateLabel}</Text>
                    <Text style={{ fontSize: 12, color: INK_MUTE }}>눌러서 전체보기</Text>
                  </View>
                  <Text style={s.doctorMemoText} numberOfLines={3}>{item.memo}</Text>
                </TouchableOpacity>
              );
            })}
            {doctorMemos.length > 3 && (
              <Text style={s.doctorMemoMore}>+ {doctorMemos.length - 3}개 더 있어요</Text>
            )}
          </View>
        )}
      </ScrollView>

      <SeniorTabBar navigation={navigation} activeTab="sched" userId={userId} name={name} />

      {/* 병원전달 메모 전체보기 모달 */}
      <Modal visible={!!memoModal} transparent animationType="fade" onRequestClose={() => setMemoModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setMemoModal(null)}>
          <TouchableOpacity activeOpacity={1} style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHeader}>
              <View style={s.doctorMemoChip}>
                <Text style={s.doctorMemoChipTxt}>🩺 병원전달 메모</Text>
              </View>
              <Text style={s.modalDate}>
                {memoModal ? (memoModal.localDate
                ? `${parseInt(memoModal.localDate.split('-')[1])}월 ${parseInt(memoModal.localDate.split('-')[2])}일`
                : (() => { const d = new Date(memoModal.createdAt); return `${d.getMonth()+1}월 ${d.getDate()}일`; })()
              ) : ''}
              </Text>
            </View>
            <TextInput
              style={s.modalTextInput}
              value={editingMemo}
              onChangeText={setEditingMemo}
              multiline
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[s.modalCloseBtn, { flex: 1, backgroundColor: '#F0F0F0' }]} onPress={() => setMemoModal(null)}>
                <Text style={[s.modalCloseTxt, { color: INK_MUTE }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalCloseBtn, { flex: 1, backgroundColor: '#FDECEA' }]} onPress={() => {
                Alert.alert('메모 삭제', '이 메모를 삭제할까요?', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: async () => {
                    try {
                      const updated = doctorMemos.filter(m => m.id !== memoModal.id);
                      await AsyncStorage.setItem('doctor_memos', JSON.stringify(updated));
                      setDoctorMemos(updated);
                      setMemoModal(null);
                    } catch { Alert.alert('오류', '삭제에 실패했습니다.'); }
                  }},
                ]);
              }}>
                <Text style={[s.modalCloseTxt, { color: '#E5453C' }]}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalCloseBtn, { flex: 1 }]} onPress={async () => {
                try {
                  const updated = doctorMemos.map(m => m.id === memoModal.id ? { ...m, memo: editingMemo } : m);
                  await AsyncStorage.setItem('doctor_memos', JSON.stringify(updated));
                  setDoctorMemos(updated);
                  setMemoModal(null);
                } catch { Alert.alert('오류', '저장에 실패했습니다.'); }
              }}>
                <Text style={s.modalCloseTxt}>저장</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
          <Text style={s.headerTitle}>내 일정 / 병원 일정</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('HospitalScheduleAdd', { userId, name })}
          >
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 루미 인사 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12, gap: 12 }}>
          <Lumi mood="happy" size={72} bob />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#3D4B62', flex: 1, lineHeight: 30 }}>
            {'아직 일정이 없어요.\n같이 등록해볼까요?'}
          </Text>
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

  filterRow: {
    flexDirection: 'row', marginHorizontal: 18, marginBottom: 16, gap: 8,
  },
  filterBtn: {
    flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(15,27,45,0.08)',
  },
  filterBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterBtnTxt:    { fontSize: 18, fontWeight: '700', color: '#7E8AA1' },
  filterBtnTxtActive: { color: '#fff' },
  filterEmpty: {
    marginHorizontal: 18, marginVertical: 24, alignItems: 'center',
  },
  filterEmptyTxt: { fontSize: 20, fontWeight: '600', color: '#7E8AA1' },

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

  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  typeIcon: { fontSize: 20 },

  monthCalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginTop: 16, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  monthCalIcon: { fontSize: 24 },
  monthCalTxt:  { flex: 1, fontSize: 20, fontWeight: '800', color: INK },
  monthCalArrow:{ fontSize: 24, color: INK_MUTE },

  doctorMemoCard: {
    marginHorizontal: 18, marginTop: 14,
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  doctorMemoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  doctorMemoChip: { backgroundColor: '#EEE8F8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  doctorMemoChipTxt: { fontSize: 15, fontWeight: '800', color: '#5B3DB5' },
  doctorMemoCount: { fontSize: 14, fontWeight: '700', color: INK_MUTE },
  doctorMemoItem: { paddingVertical: 12 },
  doctorMemoItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  doctorMemoDate: { fontSize: 13, fontWeight: '700', color: INK_MUTE, marginBottom: 4 },
  doctorMemoText: { fontSize: 17, fontWeight: '500', color: INK_SOFT, lineHeight: 24 },
  doctorMemoMore: { fontSize: 14, fontWeight: '700', color: '#7C5BE3', textAlign: 'center', marginTop: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalDate: { fontSize: 15, fontWeight: '700', color: INK_MUTE },
  modalMemoText: { fontSize: 19, color: INK_SOFT, lineHeight: 30, fontWeight: '500' },
  modalTextInput: {
    fontSize: 18, color: INK_SOFT, lineHeight: 28, fontWeight: '500',
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14,
    padding: 14, minHeight: 180, maxHeight: 340,
  },
  modalCloseBtn: { backgroundColor: '#EEE8F8', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  modalCloseTxt: { fontSize: 20, fontWeight: '800', color: '#5B3DB5' },

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
  const today = localDate();
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
