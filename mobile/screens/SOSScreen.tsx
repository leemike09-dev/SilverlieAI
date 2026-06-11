import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Linking, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const RED_LIGHT = '#FF6B6B';
const RED       = '#E53935';
const RED_DK    = '#B71C1C';

type SOSStatus = 'getting-location' | 'notifying' | 'calling';

// 각 단계의 완료 여부
function isDone(step: SOSStatus, current: SOSStatus) {
  const order: SOSStatus[] = ['getting-location', 'notifying', 'calling'];
  return order.indexOf(current) > order.indexOf(step);
}
function isActive(step: SOSStatus, current: SOSStatus) {
  return step === current;
}

export default function SOSScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;

  const [countdown,       setCountdown]      = useState(10);
  const [locationText,    setLocationText]   = useState('');
  const [guardianNames,   setGuardianNames]  = useState('');
  const [guardianPhone,   setGuardianPhone]  = useState('');
  const [guardianFirst,   setGuardianFirst]  = useState('');
  const [status,          setStatus]         = useState<SOSStatus>('getting-location');
  const [cancelled,       setCancelled]      = useState(false);

  const countdownRef = useRef<any>(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const spinAnim     = useRef(new Animated.Value(0)).current;

  // 맥박 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 스피너 애니메이션 (현재 진행 중인 단계)
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    // 보호자 정보 로드
    AsyncStorage.getItem(`guardians.${userId}`).then(raw => {
      if (!raw) return;
      try {
        const list: { name: string; relation: string; phoneNumber?: string }[] = JSON.parse(raw);
        const formatted = list
          .slice(0, 3)
          .map(g => `${g.name}(${g.relation})`)
          .join(' · ');
        if (formatted) setGuardianNames(formatted);
        if (list.length > 0) {
          setGuardianFirst(list[0].name);
          setGuardianPhone(list[0].phoneNumber || '');
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
    });

    runSOS();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const runSOS = async () => {
    // 1단계: 위치 확인
    setStatus('getting-location');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude.toFixed(4);
      const lng = pos.coords.longitude.toFixed(4);
      setLocationText(`위도 ${lat} · 경도 ${lng}`);
    } catch {
      setLocationText('위치 확인 완료');
    }

    // 2단계: 가족 알림
    setStatus('notifying');
    await fetch('https://silverlieai.onrender.com/notifications/sos-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name }),
    }).catch(() => {});

    // 3단계: 119 카운트다운
    setStatus('calling');
    startCountdown();
  };

  const startCountdown = () => {
    let count = 10;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        Linking.openURL('tel:119').catch(() => {});
      }
    }, 1000);
  };

  const handleCall119 = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    Linking.openURL('tel:119').catch(() => {});
  };

  const handleCallGuardian = () => {
    if (guardianPhone) Linking.openURL(`tel:${guardianPhone}`).catch(() => {});
  };

  const handleCancel = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCancelled(true);
    navigation.goBack();
  };

  const STEPS: { key: SOSStatus; label: string; sub: () => string }[] = [
    {
      key: 'getting-location',
      label: '내 위치 확인',
      sub: () => locationText || '위치 정보를 가져오는 중...',
    },
    {
      key: 'notifying',
      label: '보호자에게 알림 발송',
      sub: () => guardianNames || '지정된 보호자에게 SOS 알림 전송',
    },
    {
      key: 'calling',
      label: '119 응급 전화 연결',
      sub: () => `${countdown}초 후 자동 연결`,
    },
  ];

  return (
    <LinearGradient colors={[RED_LIGHT, RED, RED_DK]} style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <TouchableOpacity style={s.closeBtn} onPress={handleCancel}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>긴급 도움</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* 사이렌 아이콘 */}
      <View style={s.sirenWrap}>
        <Animated.View style={[s.sirenRing, s.sirenRingOuter, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[s.sirenRing, s.sirenRingInner, { transform: [{ scale: pulseAnim }] }]} />
        <View style={s.sirenIcon}>
          <Text style={s.sirenEmoji}>🚨</Text>
        </View>
      </View>

      {/* 카운트다운 */}
      {status === 'calling' && (
        <View style={s.countdownWrap}>
          <Text style={s.countdownNum}>{countdown}</Text>
          <Text style={s.countdownLabel}>초 후 119에 자동 연결</Text>
        </View>
      )}

      {/* 진행 상태 체크리스트 */}
      <View style={s.checkList}>
        {STEPS.map((step, idx) => {
          const done   = isDone(step.key, status);
          const active = isActive(step.key, status);
          const pending = !done && !active;
          return (
            <View key={step.key}>
              {idx > 0 && (
                <View style={[s.stepLine, done && s.stepLineDone]} />
              )}
              <View style={s.stepRow}>
                {/* 상태 아이콘 */}
                <View style={[
                  s.stepDot,
                  done    && s.stepDotDone,
                  active  && s.stepDotActive,
                  pending && s.stepDotPending,
                ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  ) : active ? (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="refresh" size={16} color="#fff" />
                    </Animated.View>
                  ) : (
                    <View style={s.stepDotInner} />
                  )}
                </View>

                {/* 텍스트 */}
                <View style={{ flex: 1 }}>
                  <Text style={[s.stepLabel, pending && s.stepLabelPending]}>
                    {step.label}
                  </Text>
                  {(done || active) && (
                    <Text style={[s.stepSub, active && { color: 'rgba(255,255,255,0.9)' }]}>
                      {step.sub()}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* 버튼 */}
      <View style={[s.btnArea, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        {guardianPhone ? (
          <TouchableOpacity style={s.btnGuardian} onPress={handleCallGuardian}>
            <Ionicons name="call" size={26} color="#fff" />
            <Text style={s.btnGuardianTxt}>{guardianFirst || '보호자'}에게 전화</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={s.btn119} onPress={handleCall119}>
          <Ionicons name="call" size={28} color={RED} />
          <Text style={s.btn119Txt}>지금 바로 119 전화</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnCancel} onPress={handleCancel}>
          <Text style={s.btnCancelTxt}>취소 — 괜찮아요</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8,
    width: '100%',
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },

  sirenWrap: {
    alignItems: 'center', justifyContent: 'center',
    width: 180, height: 180, marginTop: 24,
  },
  sirenRing: {
    position: 'absolute', borderRadius: 999,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  sirenRingOuter: { width: 180, height: 180 },
  sirenRingInner: { width: 140, height: 140 },
  sirenIcon: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  sirenEmoji: { fontSize: 52 },

  countdownWrap: { alignItems: 'center', marginTop: 16, marginBottom: 4 },
  countdownNum:  { fontSize: 64, fontWeight: '900', color: '#fff', lineHeight: 72 },
  countdownLabel:{ fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  checkList: {
    width: '100%', paddingHorizontal: 20,
    marginTop: 20, flex: 1,
  },

  stepRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 4 },
  stepLine:   {
    width: 3, height: 20, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 20, marginVertical: 2,
  },
  stepLineDone: { backgroundColor: 'rgba(255,255,255,0.7)' },

  stepDot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  stepDotDone:    { backgroundColor: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.8)' },
  stepDotActive:  { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: '#fff' },
  stepDotPending: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' },
  stepDotInner:   { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },

  stepLabel:        { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 10, lineHeight: 26 },
  stepLabelPending: { color: 'rgba(255,255,255,0.4)' },
  stepSub:          { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 20 },

  btnArea: { width: '100%', paddingHorizontal: 18, gap: 12, paddingTop: 16 },
  btn119: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: '#fff', borderRadius: 20,
    minHeight: 76, paddingVertical: 20,
  },
  btn119Txt: { fontSize: 24, fontWeight: '900', color: RED },
  btnGuardian: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
    minHeight: 72, paddingVertical: 18,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
  },
  btnGuardianTxt: { fontSize: 22, fontWeight: '900', color: '#fff' },
  btnCancel: {
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16, minHeight: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
