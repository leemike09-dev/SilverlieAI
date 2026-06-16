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

export default function SOSScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, name } = route.params;

  const [countdown,     setCountdown]    = useState(10);
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianFirst, setGuardianFirst] = useState('');
  const [statusMsg,     setStatusMsg]    = useState('위치를 확인하는 중...');

  const countdownRef = useRef<any>(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
      ])
    ).start();

    AsyncStorage.getItem(`guardians.${userId}`).then(raw => {
      if (!raw) return;
      try {
        const list: { name: string; relation: string; phoneNumber?: string }[] = JSON.parse(raw);
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
    // 카운트다운 즉시 시작 — 위치·알림은 백그라운드 병렬 처리
    startCountdown();

    // 백그라운드: 위치 확인 후 서버 기록 + 가족 알림 발송
    (async () => {
      let lat = '', lng = '';
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude.toFixed(4);
        lng = pos.coords.longitude.toFixed(4);
        await AsyncStorage.setItem(`location.${userId}.current`, JSON.stringify({ lat, lng }));
      } catch {}

      fetch('https://silverlieai.onrender.com/notifications/sos-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, name, lat, lng }),
      }).catch(() => {});
    })();
  };

  const startCountdown = () => {
    let count = 10;
    setStatusMsg(`${count}초 후 119에 자동 연결됩니다`);
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current);
        setStatusMsg('119에 연결 중...');
        Linking.openURL('tel:119').catch(() => {});
      } else {
        setStatusMsg(`${count}초 후 119에 자동 연결됩니다`);
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
    navigation.goBack();
  };

  return (
    <LinearGradient colors={[RED_LIGHT, RED, RED_DK]} style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[s.inner, { paddingTop: Math.max(insets.top + 16, 32), paddingBottom: Math.max(insets.bottom + 24, 40) }]}>

        {/* 사이렌 아이콘 */}
        <View style={s.sirenWrap}>
          <Animated.View style={[s.sirenRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={s.sirenIcon}>
            <Text style={s.sirenEmoji}>🚨</Text>
          </View>
        </View>

        {/* 상태 메시지 한 줄 */}
        <Text style={s.statusMsg}>{statusMsg}</Text>

        {/* 119 버튼 — 메인, 크게 */}
        <TouchableOpacity style={s.btn119} onPress={handleCall119} activeOpacity={0.85}>
          <Ionicons name="call" size={36} color={RED} />
          <Text style={s.btn119Txt}>지금 바로 119 전화</Text>
        </TouchableOpacity>

        {/* 보호자 전화 */}
        {guardianPhone ? (
          <TouchableOpacity style={s.btnGuardian} onPress={handleCallGuardian} activeOpacity={0.85}>
            <Ionicons name="call" size={26} color="#fff" />
            <Text style={s.btnGuardianTxt}>{guardianFirst || '보호자'}에게 전화</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.btnGuardianEmpty}>
            <Text style={s.btnGuardianEmptyTxt}>⚠️ 설정 › 보호자 관리에서 연락처를 등록해 주세요</Text>
          </View>
        )}

        {/* 취소 */}
        <TouchableOpacity style={s.btnCancel} onPress={handleCancel} activeOpacity={0.7}>
          <Text style={s.btnCancelTxt}>취소 — 괜찮아요</Text>
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },

  sirenWrap: {
    width: 140, height: 140,
    alignItems: 'center', justifyContent: 'center',
  },
  sirenRing: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
  },
  sirenIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  sirenEmoji: { fontSize: 48 },

  statusMsg: {
    fontSize: 20, fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center', lineHeight: 30,
  },

  btn119: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 14, backgroundColor: '#fff', borderRadius: 24,
    minHeight: 88, paddingVertical: 24,
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 12, elevation: 8,
  },
  btn119Txt: { fontSize: 28, fontWeight: '900', color: RED },

  btnGuardian: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, borderRadius: 20, minHeight: 72, paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
  },
  btnGuardianTxt: { fontSize: 22, fontWeight: '900', color: '#fff' },

  btnGuardianEmpty: {
    width: '100%',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20, minHeight: 64, paddingVertical: 16, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnGuardianEmptyTxt: {
    fontSize: 16, fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 24,
  },

  btnCancel: {
    paddingVertical: 16, paddingHorizontal: 32,
  },
  btnCancelTxt: {
    fontSize: 18, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
});
