import React, { useState, useRef, useEffect } from 'react';
import { speak, stopSpeech } from '../utils/speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Linking, Platform, StatusBar,
} from 'react-native';

const API = 'https://silverlieai.onrender.com';

const RELATION_EMOJI: Record<string, string> = {
  father: '\u{1F474}', mother: '\u{1F475}', spouse: '\u{1F491}',
  son: '\u{1F466}', daughter: '\u{1F467}', sibling: '\u{1F46B}', other: '\u{1F464}',
};
const RELATION_LABEL: Record<string, string> = {
  father: '아버지', mother: '어머니', spouse: '배우자',
  son: '아들', daughter: '딸', sibling: '형제/자매', other: '가족',
};

type FamilyMember = { id: string; name: string; phone: string; relation: string };

type Props = { navigation: any; route: any };

export default function SOSScreen({ navigation, route }: Props) {
  const { userId, name } = route?.params ?? {};
  const [counting,  setCounting]  = useState(false);
  const [count,     setCount]     = useState(5);
  const [family,    setFamily]    = useState<FamilyMember[]>([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef<any>(null);

  useEffect(() => {
    // AsyncStorage 에서 가족 연락체 로드
    AsyncStorage.getItem('family_members').then(raw => {
      if (raw) {
        try { setFamily(JSON.parse(raw).slice(0, 3)); } catch {}
      }
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      speak('괜찮으세요? 큰 빨간 버튼을 누르시면 일일구로 바로 연결돼요.', 0.85);
    }, 600);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
    };
  }, []);

  // SOS 트리거 시 백엔드에 가족 푸시 알림 요청
  const notifyFamily = () => {
    if (!userId) return;
    fetch(`${API}/sos/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name: name || '' }),
    }).catch(() => {});
  };

  const startCountdown = () => {
    if (counting) return;
    setCounting(true);
    setCount(5);
    speak('걱정 마세요. 5초 후 일일구로 연결할게요.', 0.85);
    notifyFamily();

    const COUNT_WORDS = ['', '하나', '둘', '셋', '넷', '다섯'];
    let c = 5;
    timerRef.current = setInterval(() => {
      c--;
      setCount(c);
      if (c > 0) {
        speak(COUNT_WORDS[c], 0.9, 1.15);
      } else {
        clearInterval(timerRef.current);
        speak('지금 연결해요. 조금만 기다려 주세요.', 0.85);
        setTimeout(() => Linking.openURL('tel:119'), 800);
        setCounting(false);
        setCount(5);
      }
    }, 1000);
  };

  const cancelSOS = () => {
    stopSpeech();
    setTimeout(() => speak('취소됐어요. 필요하시면 언제든지 다시 눌러 주세요.', 0.85), 200);
    if (timerRef.current) clearInterval(timerRef.current);
    setCounting(false);
    setCount(5);
    navigation.navigate('SeniorHome', { userId, name });
  };

  const callFamily = (member: FamilyMember) => {
    if (!member.phone) return;
    const label = RELATION_LABEL[member.relation] || member.name;
    speak(`${label}에게 전화할게요.`, 0.85);
    setTimeout(() => Linking.openURL(`tel:${member.phone}`), 600);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#B71C1C" />

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerSub}>EMERGENCY</Text>
        <Text style={s.headerTitle}>긴급 호출</Text>
      </View>

      <View style={s.body}>
        {/* SOS 큰 버튼 */}
        <TouchableOpacity onPress={startCountdown} activeOpacity={0.85}>
          <Animated.View style={[s.sosBtn, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={s.sosLabel}>SOS</Text>
            <Text style={s.sosSub}>탭하여 호출</Text>
            <Text style={s.sos119}>119</Text>
          </Animated.View>
        </TouchableOpacity>

        <Text style={s.guide} numberOfLines={1} adjustsFontSizeToFit>
          큰 버튼을 누르면 자동으로 신고됩니다
        </Text>

        {/* 카운트다운 */}
        <View style={s.cdWrap}>
          {counting && (
            <>
              <Text style={s.cdNum}>{count}</Text>
              <Text style={s.cdTxt}>초 후 119 자동 연결</Text>
            </>
          )}
        </View>

        {/* 가족 연락 버튼 */}
        <View style={s.famRow}>
          {family.length > 0 ? (
            <>
              {family.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.famBtn, !m.phone && s.famBtnDisabled]}
                  onPress={() => callFamily(m)}
                  activeOpacity={m.phone ? 0.8 : 1}>
                  <Text style={s.famEmoji}>{RELATION_EMOJI[m.relation] || '\u{1F464}'}</Text>
                  <Text style={s.famLabel}>{m.name}</Text>
                  <Text style={s.famSub}>
                    {m.phone ? RELATION_LABEL[m.relation] || '가족' : '번호 없음'}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <TouchableOpacity
              style={[s.famBtn, s.famBtnAdd]}
              onPress={() => navigation.navigate('FamilyConnect', { userId, name })}
              activeOpacity={0.8}>
              <Text style={s.famEmoji}>👨‍👩‍👧</Text>
              <Text style={s.famLabel}>가족 연결하기</Text>
            </TouchableOpacity>
          )}
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
          <Text style={s.cancelTxt}>✕ 취소하고 홈으로</Text>
        </TouchableOpacity>

        {/* AI 상담 보조 링크 */}
        <TouchableOpacity
          style={s.aiLink}
          onPress={() => navigation.navigate('AIChat', { userId, name })}
          activeOpacity={0.8}>
          <Text style={s.aiLinkTxt}>🐝 응급인지 확실하지 않으세요?</Text>
          <Text style={s.aiLinkSub}>AI에게 증상을 말씀해주세요 →</Text>
        </TouchableOpacity>

        {family.length > 0 && (
          <Text style={s.locationTxt}>📍 가족에게 알림을 전송하고 있어요</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#C62828' },
  header: { paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
            paddingBottom: 14, alignItems: 'center' },
  headerSub:   { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 3 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },

  body:  { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, justifyContent: 'space-between' },
  guide: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.95)', textAlign: 'center', width: '100%' },

  sosBtn: { width: 180, height: 180, borderRadius: 90,
            backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
            borderWidth: 6, borderColor: 'rgba(255,255,255,0.25)' },
  sosLabel: { fontSize: 36, fontWeight: '900', color: '#C62828', letterSpacing: 3 },
  sosSub:   { fontSize: 14, fontWeight: '700', color: '#C62828', marginTop: 2 },
  sos119:   { fontSize: 36, fontWeight: '900', color: '#C62828', marginTop: 2, letterSpacing: 2 },

  cdWrap: { alignItems: 'center', minHeight: 60, justifyContent: 'center' },
  cdNum:  { fontSize: 56, fontWeight: '900', color: '#FFD600', lineHeight: 60 },
  cdTxt:  { fontSize: 16, color: 'rgba(255,255,255,0.85)' },

  famRow:        { flexDirection: 'row', gap: 10, width: '100%' },
  famBtn:        { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5,
                   borderColor: 'rgba(255,255,255,0.4)', borderRadius: 18,
                   paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
  famBtnDisabled:{ opacity: 0.45 },
  famBtnAdd:     { flex: 2 },
  famEmoji:      { fontSize: 28, marginBottom: 4 },
  famLabel:      { fontSize: 17, color: '#fff', fontWeight: '800', textAlign: 'center' },
  famSub:        { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },

  cancelBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 12,
               paddingVertical: 10, paddingHorizontal: 32, alignItems: 'center' },
  cancelTxt: { fontSize: 20, fontWeight: '900', color: '#fff' },

  aiLink:    { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
               padding: 12, alignItems: 'center', width: '100%' },
  aiLinkTxt: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  aiLinkSub: { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  locationTxt: { fontSize: 18, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});
