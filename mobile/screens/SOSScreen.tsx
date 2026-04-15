import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Linking, Platform, StatusBar,
} from 'react-native';

type Props = { navigation: any; route: any };

const FAMILY = [
  { label: '딸에게 연락', emoji: '👧', phone: '' },
  { label: '아들에게 연락', emoji: '👦', phone: '' },
];

export default function SOSScreen({ navigation, route }: Props) {
  const { userId, name } = route?.params ?? {};
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(5);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef<any>(null);

  // SOS 버튼 맥박 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // 화면 진입 시 음성 안내
    setTimeout(() => {
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    if (counting) return;
    setCounting(true);
    setCount(5);

    let c = 5;
    timerRef.current = setInterval(() => {
      c--;
      setCount(c);
      if (c <= 0) {
        clearInterval(timerRef.current);
        Linking.openURL('tel:119');
        setCounting(false);
        setCount(5);
      }
    }, 1000);
  };

  const cancelSOS = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCounting(false);
    setCount(5);
    navigation.goBack();
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#B71C1C" />

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerSub}>EMERGENCY</Text>
        <Text style={s.headerTitle}>긴급 호출</Text>
      </View>

      {/* 메인 콘텐츠 */}
      <View style={s.body}>
        <Text style={s.guide}>큰 버튼을 누르면 자동으로 신고됩니다</Text>

        {/* SOS 큰 버튼 */}
        <TouchableOpacity onPress={startCountdown} activeOpacity={0.85}>
          <Animated.View style={[s.sosBtn, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={s.sosLabel}>SOS</Text>
            <Text style={s.sosSub}>탭하여 호출</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* 카운트다운 */}
        <View style={s.cdWrap}>
          {counting ? (
            <>
              <Text style={s.cdNum}>{count}</Text>
              <Text style={s.cdTxt}>초 후 119 자동 연결</Text>
            </>
          ) : (
            <Text style={s.cdGuide}>— 버튼을 누르세요 —</Text>
          )}
        </View>

        {/* 가족 연락 버튼 */}
        <View style={s.famRow}>
          {FAMILY.map(f => (
            <TouchableOpacity
              key={f.label}
              style={s.famBtn}
              onPress={() => f.phone && Linking.openURL(`tel:${f.phone}`)}
              activeOpacity={0.8}>
              <Text style={s.famEmoji}>{f.emoji}</Text>
              <Text style={s.famLabel}>{f.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={s.famBtn}
            onPress={() => Linking.openURL('tel:119')}
            activeOpacity={0.8}>
            <Text style={s.famEmoji}>📞</Text>
            <Text style={s.famLabel}>119 직접</Text>
          </TouchableOpacity>
        </View>

        {/* 취소 버튼 */}
        <TouchableOpacity style={s.cancelBtn} onPress={cancelSOS} activeOpacity={0.8}>
          <Text style={s.cancelTxt}>✕ 취소 (오작동)</Text>
        </TouchableOpacity>

        {/* AI 상담 보조 링크 */}
        <TouchableOpacity
          style={s.aiLink}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
          activeOpacity={0.8}>
          <Text style={s.aiLinkTxt}>🐝 응급인지 확실하지 않으세요?</Text>
          <Text style={s.aiLinkSub}>AI에게 증상을 말씀해주세요 →</Text>
        </TouchableOpacity>

        <Text style={s.locationTxt}>📍 현재 위치를 가족에게 전송 중</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#C62828' },
  header: { paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
            paddingBottom: 14, alignItems: 'center' },
  headerSub:   { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 3 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },

  body:  { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  guide: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 20, textAlign: 'center' },

  sosBtn: { width: 180, height: 180, borderRadius: 90,
            backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
            borderWidth: 6, borderColor: 'rgba(255,255,255,0.25)', marginBottom: 24 },
  sosLabel: { fontSize: 36, fontWeight: '900', color: '#C62828', letterSpacing: 3 },
  sosSub:   { fontSize: 14, fontWeight: '700', color: '#C62828', marginTop: 4 },

  cdWrap:  { alignItems: 'center', minHeight: 80, justifyContent: 'center', marginBottom: 20 },
  cdNum:   { fontSize: 56, fontWeight: '900', color: '#FFD600', lineHeight: 60 },
  cdTxt:   { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  cdGuide: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },

  famRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  famBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)', borderRadius: 18,
            paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', minWidth: 88 },
  famEmoji: { fontSize: 28, marginBottom: 6 },
  famLabel: { fontSize: 13, color: '#fff', fontWeight: '700', textAlign: 'center' },

  cancelBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16,
               paddingVertical: 12, paddingHorizontal: 40, marginBottom: 14 },
  cancelTxt: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  aiLink:    { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
               padding: 14, alignItems: 'center', width: '100%', marginBottom: 12 },
  aiLinkTxt: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  aiLinkSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  locationTxt: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});
