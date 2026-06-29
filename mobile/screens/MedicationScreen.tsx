import React, { useState, useEffect, useRef } from 'react';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
  Image, Animated, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SeniorTabBar from '../components/SeniorTabBar';
import { useBob } from '../utils/useBob';
import Lumi from '../components/Lumi';

function PillImage({ source, isPending }: { source: any; isPending: boolean }) {
  const bobY = useBob();
  if (isPending) {
    return (
      <Animated.Image source={source} style={{ width: 92, height: 92, marginRight: 14, transform: [{ translateY: bobY }] }} resizeMode="contain" />
    );
  }
  return <Image source={source} style={{ width: 92, height: 92, marginRight: 14, opacity: 0.5 }} resizeMode="contain" />;
}
import { scheduleMedNotification } from '../utils/notifications';
import { speak } from '../utils/speech';

const API_URL = 'https://silverlieai.onrender.com';
const isDemo  = (uid: string) => !uid || uid === 'demo-user' || uid === 'guest';

const BLUE   = '#3B82F6';
const GREEN  = '#3BA559';  // 완료 상태 전용 (초록 의미색 유지)
const SKY    = '#F1ECE4';
const SKY2   = '#FBF8F3';
const CARD   = '#FFFFFF';
const INK    = '#0F1B2D';

const TIME_SLOTS = [
  { key: 'morning',  label: '아침',   icon: '🌅', defaultTime: '08:00' },
  { key: 'lunch',    label: '점심',   icon: '☀️',  defaultTime: '12:00' },
  { key: 'evening',  label: '저녁',   icon: '🌙',  defaultTime: '18:00' },
  { key: 'bedtime',  label: '취침전', icon: '🌛',  defaultTime: '21:00' },
];

const EMPTY_FORM  = { name: '', dosage: '', method: '', timeSlot: 'morning', stock: '' };

// 약 이름 키워드 → 캐릭터 이미지 매핑
const PILL_IMAGES: { keywords: string[]; img: any }[] = [
  { keywords: ['혈압', 'bp', '아토르', '로수', '암로'], img: require('../assets/pill-bp.png') },
  { keywords: ['당뇨', '혈당', 'dm', '메트', '글리', '인슐'], img: require('../assets/pill-dm.png') },
  { keywords: ['수면', '졸', '자', '수면제'], img: require('../assets/pill-sleep.png') },
  { keywords: ['관절', '무릎', '통증', '진통', '소염'], img: require('../assets/pill-joint.png') },
  { keywords: ['비타민', '영양', '철분', '칼슘', '오메가'], img: require('../assets/pill-vit.png') },
  { keywords: ['심장', '심박', '아스피린', '와파'], img: require('../assets/pill-heart.png') },
  { keywords: ['치매', '인지', '아리셉', '도네'], img: require('../assets/pill-dementia.png') },
];

function getPillImage(name: string) {
  const lower = name.toLowerCase();
  for (const p of PILL_IMAGES) {
    if (p.keywords.some(k => lower.includes(k))) return p.img;
  }
  return require('../assets/pill-vit.png');
}

function SparkleEffect({ visible }: { visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.setValue(0);
    }
  }, [visible]);
  if (!visible) return null;
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return (
    <Animated.Text style={[{ fontSize: 20 }, { opacity }]}>✨</Animated.Text>
  );
}

function TearEffect({ visible }: { visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -4, duration: 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 4, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.setValue(0);
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.Text style={[{ fontSize: 20 }, { translateY: anim }]}>💧</Animated.Text>
  );
}

export default function MedicationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [userId,      setUserId]    = useState('');
  const [uname,       setUname]     = useState('');
  const [meds,        setMeds]      = useState<any[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [addModal,    setAddModal]  = useState(false);
  const [form,      setForm]     = useState<any>(EMPTY_FORM);
  const [editStrip, setEditStrip] = useState(false);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, string>>({});
  // 날별 복용 기록: { '2026-06-10': { medId: { name, taken, skipped, dosage } } }
  const [weekLogs, setWeekLogs] = useState<Record<string, Record<string, any>>>({});
  const [dayDetail, setDayDetail] = useState<{ date: string; logs: Record<string, any> } | null>(null);

  useEffect(() => {
    const init = async () => {
      const uid  = (await AsyncStorage.getItem('userId'))   || '';
      const name = (await AsyncStorage.getItem('userName')) || '';
      setUserId(uid);
      setUname(name);

      const today = localDate();
      const medKey = `medications.${uid}`;
      const stored = await AsyncStorage.getItem(medKey);
      if (stored) {
        try {
          const loaded: any[] = JSON.parse(stored);
          const storedDate = await AsyncStorage.getItem('medications_date');
          const isNewDay = storedDate !== today;
          const displayed = isNewDay
            ? loaded.map(m => ({ ...m, taken: false, skipped: false, takenDate: null }))
            : loaded;
          if (isNewDay) {
            await AsyncStorage.setItem(medKey, JSON.stringify(displayed));
            await AsyncStorage.setItem('medications_date', today);
          }
          setMeds(displayed);
          announceMeds(displayed);
        } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      }
      await AsyncStorage.setItem('medications_date', today);

      // 주간 override 로드
      const overrideKeys = await AsyncStorage.getAllKeys().catch(() => [] as string[]);
      const medOverrideKeys = overrideKeys.filter(k => k.startsWith(`medication-override.${uid}.`));
      if (medOverrideKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(medOverrideKeys);
        const map: Record<string, string> = {};
        pairs.forEach(([k, v]) => { if (v) map[k.split('.').pop()!] = v; });
        setWeekOverrides(map);
      }

      // 최근 7일 복용 기록 로드
      const logs: Record<string, Record<string, any>> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = localDate(d);
        const raw = await AsyncStorage.getItem(`medication-log.${uid}.${dateStr}`).catch(() => null);
        if (raw) logs[dateStr] = JSON.parse(raw);
      }
      setWeekLogs(logs);

      if (!isDemo(uid)) {
        setServerLoading(true);
        let synced = false;
        for (let attempt = 0; attempt < 3 && !synced; attempt++) {
          try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 4000 * attempt));
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 20000);
            const res = await apiFetch(`/medications/today/${uid}`, { signal: ctrl.signal });
            clearTimeout(timer);
            if (res.ok) {
              const serverData: any[] = await res.json();
              const localRaw = await AsyncStorage.getItem(medKey).catch(() => null);
              const localData: any[] = localRaw ? JSON.parse(localRaw) : [];
              const serverIds = new Set(serverData.map((m: any) => m.id));
              const localOnly = localData.filter((m: any) => !serverIds.has(m.id));
              const todayCheck = localDate();
              const storedDateCheck = await AsyncStorage.getItem('medications_date');
              const isNewDayNow = storedDateCheck !== todayCheck;
              const merged = [
                ...serverData.map((m: any) => ({
                  ...m,
                  taken: isNewDayNow ? false : (localData.find((l: any) => l.id === m.id)?.taken ?? false),
                  skipped: isNewDayNow ? false : (localData.find((l: any) => l.id === m.id)?.skipped ?? false),
                  takenDate: isNewDayNow ? null : (localData.find((l: any) => l.id === m.id)?.takenDate ?? null),
                })),
                ...localOnly,
              ];
              setMeds(merged);
              await AsyncStorage.setItem(medKey, JSON.stringify(merged));
              announceMeds(merged);
              synced = true;
            }
          } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
        }
        setServerLoading(false);
      }
    };
    init();
  }, []);

  const announceMeds = (medsData: any[]) => {
    if (!medsData.length) return;
    const h = new Date().getHours();
    const slot = h < 10 ? 'morning' : h < 14 ? 'lunch' : h < 20 ? 'evening' : 'bedtime';
    const slotLabel: Record<string, string> = { morning: '아침', lunch: '점심', evening: '저녁', bedtime: '취침 전' };
    const slotMeds = medsData.filter((m: any) => m.timeSlot === slot);
    const pending  = slotMeds.filter((m: any) => !m.taken && !m.skipped);
    if (pending.length > 0) {
      setTimeout(() => speak(
        `${slotLabel[slot]} 약이 ${pending.length}가지 남아있어요. ${pending[0].name} 잊지 마세요.`, 0.85
      ), 600);
    } else if (slotMeds.length > 0) {
      setTimeout(() => speak(`${slotLabel[slot]} 약은 모두 드셨어요. 잘 하셨어요!`, 0.85), 600);
    }
  };

  const saveMeds = async (updated: any[]) => {
    setMeds(updated);
    await AsyncStorage.setItem(`medications.${userId}`, JSON.stringify(updated));
  };

  const apiToggle = (uid: string, medId: string, field: string, value: boolean) => {
    if (isDemo(uid)) return;
    apiFetch(`/medications/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: uid, med_id: medId, field, value }),
    }).catch(() => {});
  };

  const toggleTaken = async (id: string) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const nowTaking = !med.taken;
    const today = localDate();
    if (nowTaking) speak(`${med.name} 복용 완료예요. 건강 챙기셨네요!`, 0.85);

    const curStock = med.stock ?? 0;
    const sameDay  = med.takenDate === today;
    const newStock = nowTaking
      ? Math.max(0, curStock - 1)
      : sameDay ? curStock + 1 : curStock;

    const updated = meds.map(m =>
      m.id === id
        ? { ...m, taken: nowTaking, skipped: false, stock: newStock, takenDate: nowTaking ? today : null }
        : m
    );
    saveMeds(updated);
    apiToggle(userId, id, 'taken', nowTaking);
    if (!nowTaking) apiToggle(userId, id, 'skipped', false);

    // 날별 복용 기록 저장
    const logKey = `medication-log.${userId}.${today}`;
    const logRaw = await AsyncStorage.getItem(logKey).catch(() => null);
    const dayLog: Record<string, any> = logRaw ? JSON.parse(logRaw) : {};
    dayLog[id] = { name: med.name, dosage: med.dosage || '1정', timeSlot: med.timeSlot, taken: nowTaking, skipped: false };
    await AsyncStorage.setItem(logKey, JSON.stringify(dayLog)).catch(() => {});
    setWeekLogs(prev => ({ ...prev, [today]: dayLog }));

    if (!isDemo(userId)) {
      apiFetch(`/medications/update-stock/${userId}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ stock: newStock }),
      }).catch(() => {});
    }
  };

  const toggleSkipped = async (id: string) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const nowSkipping = !med.skipped;
    const updated = meds.map(m => m.id === id ? { ...m, skipped: nowSkipping, taken: false } : m);
    saveMeds(updated);
    apiToggle(userId, id, 'skipped', nowSkipping);
    if (!nowSkipping) apiToggle(userId, id, 'taken', false);

    // 날별 복용 기록 저장
    const today = localDate();
    const logKey = `medication-log.${userId}.${today}`;
    const logRaw = await AsyncStorage.getItem(logKey).catch(() => null);
    const dayLog: Record<string, any> = logRaw ? JSON.parse(logRaw) : {};
    dayLog[id] = { name: med.name, dosage: med.dosage || '1정', timeSlot: med.timeSlot, taken: false, skipped: nowSkipping };
    await AsyncStorage.setItem(logKey, JSON.stringify(dayLog)).catch(() => {});
    setWeekLogs(prev => ({ ...prev, [today]: dayLog }));
  };

  const addMed = async () => {
    if (!form.name.trim()) {
      Alert.alert('입력 오류', '약 이름을 입력해 주세요.');
      return;
    }
    const tempId = Date.now().toString();
    const newMed = {
      id:       tempId,
      name:     form.name.trim(),
      dosage:   form.dosage.trim()  || '1정',
      method:   form.method.trim()  || '식후',
      timeSlot: form.timeSlot,
      stock:    parseInt(form.stock) || 0,
      taken:    false,
      skipped:  false,
    };
    const updatedMeds = [...meds, newMed];
    setMeds(updatedMeds);
    setForm(EMPTY_FORM);
    setAddModal(false);
    await AsyncStorage.setItem(`medications.${userId}`, JSON.stringify(updatedMeds)).catch(() => {});
    scheduleMedNotification(tempId, newMed.name, newMed.timeSlot);
    if (!isDemo(userId)) {
      try {
        const res = await apiFetch(`/medications/add-simple/${userId}`, {
          method: 'POST',
          body: JSON.stringify({
            name: newMed.name, dosage: newMed.dosage,
            method: newMed.method, time_slot: newMed.timeSlot, stock: newMed.stock,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.ok && result.id && result.id !== tempId) {
            const finalMeds = updatedMeds.map((m: any) =>
              m.id === tempId ? { ...m, id: result.id } : m
            );
            setMeds(finalMeds);
            await AsyncStorage.setItem(`medications.${userId}`, JSON.stringify(finalMeds)).catch(() => {});
          }
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    }
  };

  const deleteMed = (id: string) => {
    Alert.alert('약 삭제', '이 약을 목록에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => {
          saveMeds(meds.filter(m => m.id !== id));
          if (!isDemo(userId)) {
            apiFetch(`/medications/delete/${userId}/${id}`, { method: 'DELETE' }).catch(() => {});
          }
        }},
    ]);
  };

  const total     = meds.length;
  const takenCnt  = meds.filter(m => m.taken).length;
  const remaining = total - takenCnt;

  return (
    <LinearGradient colors={[SKY, SKY2, '#FFFFFF']} locations={[0, 0.5, 1]} style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── 헤더 ── */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
          <Text style={s.headerTitle}>💊 약 관리</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setAddModal(true)} activeOpacity={0.8}>
            <Text style={s.addBtnTxt}>+ 약 추가</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── 루미 말풍선 ── */}
          <View style={s.lumiRow}>
            <Lumi mood={remaining === 0 ? 'content' : 'happy'} size={72} bob />
            <View style={s.bubble}>
              <Text style={s.bubbleTxt}>
                {total === 0
                  ? '오늘 먹을 약을 등록해요!'
                  : remaining === 0
                    ? '오늘 약을 모두 드셨어요! 🎉'
                    : `오늘 약 ${remaining}개 남았어요`}
              </Text>
              <View style={s.bubbleTail} />
            </View>
          </View>

          {/* ── 주간 복용 스트립 ── */}
          {total > 0 && (
            <View style={s.stripCard}>
              <View style={s.stripHeader}>
                <Text style={s.stripTitle}>이번 주 복용 기록</Text>
                <TouchableOpacity onPress={() => setEditStrip(e => !e)}>
                  <Text style={s.stripEditBtn}>{editStrip ? '완료' : '편집'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.stripRow}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - 6 + i);
                  const dateStr = localDate(d);
                  const today = localDate();
                  const isFuture = dateStr > today;
                  const isToday = dateStr === today;
                  const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];

                  // 복용 기록에서 상태 계산
                  let status: 'all' | 'partial' | 'none' | 'future' = 'future';
                  if (!isFuture) {
                    if (weekOverrides[dateStr]) {
                      status = weekOverrides[dateStr] as any;
                    } else if (isToday) {
                      if (total === 0) status = 'none';
                      else if (takenCnt === total) status = 'all';
                      else if (takenCnt > 0) status = 'partial';
                      else status = 'none';
                    } else if (weekLogs[dateStr]) {
                      const log = weekLogs[dateStr];
                      const entries = Object.values(log);
                      const takenN = entries.filter((e: any) => e.taken).length;
                      if (takenN === entries.length && entries.length > 0) status = 'all';
                      else if (takenN > 0) status = 'partial';
                      else status = 'none';
                    } else {
                      status = 'none';
                    }
                  }

                  const dotColor = status === 'all' ? '#3BA559' : status === 'partial' ? '#F58A4D' : status === 'none' ? '#E5453C' : '#EAEDF2';
                  const dotLabel = status === 'all' ? '✓' : status === 'partial' ? '!' : status === 'none' ? '✕' : '—';

                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[s.stripDay, isToday && s.stripDayToday]}
                      onPress={() => {
                        if (isFuture) return;
                        if (editStrip) {
                          // 편집 모드: 상태 순환
                          const cycle: Record<string, string> = { all: 'partial', partial: 'none', none: 'all' };
                          const cur = weekOverrides[dateStr] || status;
                          const next = cycle[cur] || 'all';
                          const updated = { ...weekOverrides, [dateStr]: next };
                          setWeekOverrides(updated);
                          AsyncStorage.setItem(`medication-override.${userId}.${dateStr}`, next).catch(() => {});
                        } else {
                          // 일반 모드: 그날 복용 내역 팝업
                          const logs = isToday
                            ? meds.reduce((acc: any, m: any) => { acc[m.id] = { name: m.name, dosage: m.dosage || '1정', timeSlot: m.timeSlot, taken: m.taken, skipped: m.skipped }; return acc; }, {})
                            : weekLogs[dateStr] || {};
                          setDayDetail({ date: dateStr, logs });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={s.stripDayLabel}>{dayLabel}</Text>
                      <View style={[s.stripDot, { backgroundColor: dotColor }]}>
                        <Text style={s.stripDotLabel}>{dotLabel}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {editStrip && (
                <Text style={s.editHint}>날짜를 눌러 기록을 수정하세요</Text>
              )}
              <View style={s.stripLegend}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#3BA559' }]} /><Text style={s.legendTxt}>모두 복용</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#F58A4D' }]} /><Text style={s.legendTxt}>일부 누락</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#E5453C' }]} /><Text style={s.legendTxt}>미복용</Text></View>
              </View>
            </View>
          )}

          {/* ── 약 없을 때 ── */}
          {total === 0 && (
            <View style={s.emptyBox}>
              {serverLoading ? (
                <>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={s.emptySub}>서버에서 약 목록을 불러오는 중...{'\n'}(최대 30초 소요)</Text>
                </>
              ) : (
                <>
                  <Text style={s.emptyIcon}>💊</Text>
                  <Text style={s.emptyTitle}>아직 등록된 약이 없어요</Text>
                  <Text style={s.emptySub}>복용하는 약을 등록하면{'\n'}복용 현황을 관리할 수 있어요</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => setAddModal(true)}>
                    <Text style={s.emptyBtnTxt}>+ 약 추가하기</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ── 시간대별 목록 ── */}
          {TIME_SLOTS.map(slot => {
            const slotMeds = meds.filter(m => m.timeSlot === slot.key);
            if (slotMeds.length === 0) return null;
            const slotTaken = slotMeds.filter(m => m.taken).length;
            const allDone   = slotTaken === slotMeds.length;
            return (
              <View key={slot.key} style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionIcon}>{slot.icon}</Text>
                  <Text style={s.sectionLabel}>{slot.label}</Text>
                  <View style={[s.sectionBadge, allDone && s.sectionBadgeDone]}>
                    <Text style={[s.sectionBadgeTxt, allDone && s.sectionBadgeTxtDone]}>
                      {slotTaken}/{slotMeds.length}
                    </Text>
                  </View>
                  {allDone && <Text style={{ fontSize: 20 }}>✨</Text>}
                </View>

                {slotMeds.map(med => {
                  const lowStock = med.stock != null && med.stock > 0 && med.stock <= 7;
                  const pillImg  = getPillImage(med.name);
                  return (
                    <TouchableOpacity
                      key={med.id}
                      style={[
                        s.medCard,
                        med.taken   && s.medCardDone,
                        med.skipped && s.medCardSkip,
                      ]}
                      onLongPress={() => deleteMed(med.id)}
                      activeOpacity={0.85}
                    >
                      {/* 약 캐릭터 이미지 — pending 시 bob 애니메이션 */}
                      <PillImage source={pillImg} isPending={!med.taken && !med.skipped} />

                      {/* 약 정보 */}
                      <View style={s.medInfo}>
                        <View style={s.medNameRow}>
                          <Text style={[s.medName, (med.taken || med.skipped) && s.medNameGray]} numberOfLines={1}>
                            {med.name}
                          </Text>
                          <SparkleEffect visible={!!med.taken} />
                          <TearEffect    visible={!!med.skipped} />
                        </View>
                        <Text style={s.medDetail}>{med.dosage}  ·  {med.method}</Text>
                        {lowStock
                          ? <Text style={s.stockWarn}>⚠️ 재고 {med.stock}일 분 남음</Text>
                          : med.stock > 0
                            ? <Text style={s.stockOk}>재고 {med.stock}일 분</Text>
                            : null}
                        {med.taken   && <Text style={s.doneBadge}>✓ 복용 완료</Text>}
                        {med.skipped && <Text style={s.skipBadge}>건너뜀</Text>}
                      </View>

                      {/* 버튼 */}
                      <View style={s.medBtns}>
                        {!med.taken && !med.skipped && (
                          <>
                            <TouchableOpacity style={s.btnTake} onPress={() => toggleTaken(med.id)}>
                              <Text style={s.btnTakeTxt}>복용</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.btnSkip} onPress={() => toggleSkipped(med.id)}>
                              <Text style={s.btnSkipTxt}>건너뜀</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {(med.taken || med.skipped) && (
                          <TouchableOpacity
                            style={s.btnUndo}
                            onPress={() => med.taken ? toggleTaken(med.id) : toggleSkipped(med.id)}
                          >
                            <Text style={s.btnUndoTxt}>취소</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* ── 약 추가 모달 ── */}
        <Modal visible={addModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={s.modalBox}>
                <Text style={s.modalTitle}>💊 약 추가</Text>

                <Text style={s.fLabel}>약 이름</Text>
                <TextInput
                  style={s.fInputLg}
                  value={form.name}
                  onChangeText={t => setForm({ ...form, name: t })}
                  placeholder="예: 혈압약"
                  placeholderTextColor="#B0BEC5"
                />

                <Text style={s.fLabel}>복용량</Text>
                <TextInput
                  style={s.fInput}
                  value={form.dosage}
                  onChangeText={t => setForm({ ...form, dosage: t })}
                  placeholder="예: 1정"
                  placeholderTextColor="#B0BEC5"
                />

                <Text style={s.fLabel}>복용 시간대</Text>
                <View style={s.timeRow}>
                  {TIME_SLOTS.map(ts => (
                    <TouchableOpacity
                      key={ts.key}
                      style={[s.timeBtn, form.timeSlot === ts.key && s.timeBtnOn]}
                      onPress={() => setForm({ ...form, timeSlot: ts.key })}
                    >
                      <Text style={s.timeBtnIcon}>{ts.icon}</Text>
                      <Text style={[s.timeBtnTxt, form.timeSlot === ts.key && s.timeBtnTxtOn]}>
                        {ts.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.fLabel}>복용 방법</Text>
                <TextInput
                  style={s.fInput}
                  value={form.method}
                  onChangeText={t => setForm({ ...form, method: t })}
                  placeholder="예: 식후 30분"
                  placeholderTextColor="#B0BEC5"
                />

                <Text style={s.fLabel}>현재 재고 (일 수)</Text>
                <TextInput
                  style={s.fInput}
                  value={form.stock}
                  onChangeText={t => setForm({ ...form, stock: t })}
                  placeholder="예: 30"
                  placeholderTextColor="#B0BEC5"
                  keyboardType="numeric"
                />

                <TouchableOpacity style={s.saveBtn} onPress={addMed}>
                  <Text style={s.saveBtnTxt}>저장하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setForm(EMPTY_FORM); setAddModal(false); }}>
                  <Text style={s.cancelBtnTxt}>취소</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ── 날짜별 복용 상세 모달 ── */}
        <Modal visible={!!dayDetail} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDayDetail(null)}>
            <View style={s.dayDetailBox}>
              <Text style={s.dayDetailTitle}>
                {dayDetail ? `${dayDetail.date.slice(5).replace('-', '월 ')}일 복용 기록` : ''}
              </Text>
              {dayDetail && Object.values(dayDetail.logs).length === 0 && (
                <Text style={s.dayDetailEmpty}>기록된 복용 내역이 없어요</Text>
              )}
              {dayDetail && Object.values(dayDetail.logs).map((entry: any, idx: number) => {
                const slot = TIME_SLOTS.find(t => t.key === entry.timeSlot);
                return (
                  <View key={idx} style={s.dayDetailRow}>
                    <Text style={s.dayDetailSlot}>{slot?.icon || '💊'} {slot?.label || ''}</Text>
                    <View style={s.dayDetailInfo}>
                      <Text style={s.dayDetailName}>{entry.name}</Text>
                      <Text style={s.dayDetailDose}>{entry.dosage}</Text>
                    </View>
                    <Text style={[
                      s.dayDetailStatus,
                      entry.taken && { color: '#3BA559' },
                      entry.skipped && { color: '#9E9E9E' },
                      !entry.taken && !entry.skipped && { color: '#E5453C' },
                    ]}>
                      {entry.taken ? '✓ 복용' : entry.skipped ? '건너뜀' : '미복용'}
                    </Text>
                  </View>
                );
              })}
              <TouchableOpacity style={s.dayDetailClose} onPress={() => setDayDetail(null)}>
                <Text style={s.dayDetailCloseTxt}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <SeniorTabBar activeTab="med" userId={userId} name={uname} navigation={navigation} />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // 헤더
  header:    { backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center',
               justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0F1B2D' },
  addBtn:    { backgroundColor: '#EFF6FF', borderRadius: 16,
               paddingHorizontal: 20, paddingVertical: 12,
               minHeight: 64, justifyContent: 'center' },
  addBtnTxt: { fontSize: 18, fontWeight: '800', color: '#3B82F6' },

  // 스크롤
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },

  // 주간 스트립
  stripCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16,
               shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width:0, height:3 }, elevation: 2 },
  stripHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stripTitle:  { fontSize: 17, fontWeight: '800', color: '#1E2D3D' },
  stripEditBtn:{ fontSize: 15, fontWeight: '700', color: '#3B82F6' },
  stripRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stripDay:    { alignItems: 'center', gap: 6, flex: 1 },
  stripDayToday: { },
  stripDayLabel: { fontSize: 12, fontWeight: '700', color: '#7E8AA1' },
  stripDot:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stripDotLabel: { fontSize: 13, fontWeight: '900', color: '#fff' },
  stripLegend: { flexDirection: 'row', gap: 14, justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendTxt:   { fontSize: 12, fontWeight: '600', color: '#7E8AA1' },

  // 루미 말풍선
  lumiRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  lumiImg:   { width: 72, height: 72 },
  bubble:    { flex: 1, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 18,
               paddingVertical: 14, marginLeft: 12, position: 'relative',
               shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  bubbleTxt: { fontSize: 20, fontWeight: '800', color: INK, lineHeight: 28 },
  bubbleTail:{ position: 'absolute', left: -10, top: 20, width: 0, height: 0,
               borderTopWidth: 8, borderTopColor: 'transparent',
               borderBottomWidth: 8, borderBottomColor: 'transparent',
               borderRightWidth: 10, borderRightColor: '#fff' },

  // 빈 상태
  emptyBox:   { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon:  { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: INK },
  emptySub:   { fontSize: 20, color: '#90A4AE', textAlign: 'center', lineHeight: 30 },
  emptyBtn:   { backgroundColor: BLUE, borderRadius: 18, paddingHorizontal: 32, paddingVertical: 20, marginTop: 8 },
  emptyBtnTxt:{ fontSize: 22, fontWeight: '900', color: '#fff' },

  // 섹션
  section:         { marginBottom: 22 },
  sectionHead:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:     { fontSize: 26 },
  sectionLabel:    { fontSize: 22, fontWeight: '900', color: INK, flex: 1 },
  sectionBadge:    { backgroundColor: '#E3F2FD', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  sectionBadgeDone:{ backgroundColor: '#E8F5E9' },
  sectionBadgeTxt: { fontSize: 18, fontWeight: '700', color: '#1565C0' },
  sectionBadgeTxtDone: { color: GREEN },

  // 약 카드
  medCard:     { backgroundColor: CARD, borderRadius: 20, padding: 16, marginBottom: 10,
                 flexDirection: 'row', alignItems: 'center',
                 shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  medCardDone: { backgroundColor: '#F1F8F2', borderWidth: 1.5, borderColor: '#A5D6A7' },
  medCardSkip: { backgroundColor: '#F8F8F8', borderWidth: 1.5, borderColor: '#E0E0E0' },

  pillImg:     { width: 52, height: 52, marginRight: 12 },

  medInfo:     { flex: 1 },
  medNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  medName:     { fontSize: 22, fontWeight: '800', color: INK, flexShrink: 1 },
  medNameGray: { color: '#90A4AE' },
  doneBadge:   { fontSize: 16, fontWeight: '700', color: GREEN, marginTop: 4 },
  skipBadge:   { fontSize: 16, fontWeight: '700', color: '#9E9E9E', marginTop: 4 },
  medDetail:   { fontSize: 18, color: '#78909C', marginBottom: 4 },
  stockWarn:   { fontSize: 17, color: '#D32F2F', fontWeight: '700' },
  stockOk:     { fontSize: 16, color: '#B0BEC5' },

  // 버튼
  medBtns:    { flexDirection: 'column', gap: 8, marginLeft: 10 },
  btnTake:    { backgroundColor: BLUE, borderRadius: 14,
                paddingHorizontal: 18, paddingVertical: 18,
                minHeight: 64, justifyContent: 'center', alignItems: 'center' },
  btnTakeTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  btnSkip:    { backgroundColor: '#F0F4F8', borderRadius: 14,
                paddingHorizontal: 18, paddingVertical: 18,
                minHeight: 64, justifyContent: 'center', alignItems: 'center' },
  btnSkipTxt: { fontSize: 18, fontWeight: '700', color: '#78909C' },
  btnUndo:    { backgroundColor: '#E3F2FD', borderRadius: 14,
                paddingHorizontal: 18, paddingVertical: 18,
                borderWidth: 1, borderColor: '#90CAF9',
                minHeight: 64, justifyContent: 'center', alignItems: 'center' },
  btnUndoTxt: { fontSize: 18, fontWeight: '700', color: '#1565C0' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalScroll:  { justifyContent: 'flex-end', flexGrow: 1 },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
                  padding: 28, paddingBottom: 50 },
  modalTitle:   { fontSize: 28, fontWeight: '900', color: BLUE, textAlign: 'center', marginBottom: 22 },

  fLabel:   { fontSize: 20, fontWeight: '700', color: '#546E7A', marginBottom: 8, marginTop: 14 },
  fInputLg: { backgroundColor: '#F4F7FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#90CAF9',
              fontSize: 22, fontWeight: '700', color: INK,
              paddingVertical: 16, paddingHorizontal: 16 },
  fInput:   { backgroundColor: '#F4F7FC', borderRadius: 14, borderWidth: 1.5, borderColor: '#C8E6C9',
              fontSize: 20, fontWeight: '600', color: INK,
              paddingVertical: 14, paddingHorizontal: 16 },

  timeRow:      { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timeBtn:      { flex: 1, alignItems: 'center', backgroundColor: '#F4F7FC',
                  borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: '#E0E0E0' },
  timeBtnOn:    { backgroundColor: '#EFF6FF', borderColor: BLUE },
  timeBtnIcon:  { fontSize: 22, marginBottom: 4 },
  timeBtnTxt:   { fontSize: 16, fontWeight: '700', color: '#78909C' },
  timeBtnTxtOn: { color: BLUE },

  saveBtn:     { backgroundColor: BLUE, borderRadius: 18, paddingVertical: 22,
                 alignItems: 'center', marginTop: 22, minHeight: 64, justifyContent: 'center' },
  saveBtnTxt:  { fontSize: 22, fontWeight: '900', color: '#fff' },
  cancelBtn:   { padding: 18, alignItems: 'center' },
  cancelBtnTxt:{ fontSize: 20, color: '#90A4AE', fontWeight: '700' },

  editHint: { fontSize: 14, fontWeight: '600', color: BLUE, textAlign: 'center', marginBottom: 8 },

  dayDetailBox: {
    backgroundColor: '#fff', borderRadius: 24, margin: 24, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  dayDetailTitle:  { fontSize: 22, fontWeight: '900', color: INK, marginBottom: 16, textAlign: 'center' },
  dayDetailEmpty:  { fontSize: 18, color: '#90A4AE', textAlign: 'center', paddingVertical: 20 },
  dayDetailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dayDetailSlot:   { fontSize: 16, color: INK, width: 52 },
  dayDetailInfo:   { flex: 1 },
  dayDetailName:   { fontSize: 20, fontWeight: '800', color: INK },
  dayDetailDose:   { fontSize: 15, color: '#78909C', marginTop: 2 },
  dayDetailStatus: { fontSize: 18, fontWeight: '800', minWidth: 52, textAlign: 'right' },
  dayDetailClose: {
    marginTop: 18, backgroundColor: '#F4F7FC', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  dayDetailCloseTxt: { fontSize: 18, fontWeight: '800', color: INK },
});
