import React, { useState, useRef, useEffect, useCallback } from 'react';
import { speak, stopSpeech } from '../utils/speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Linking, Platform, StatusBar, AppState, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API = 'https://silverlieai.onrender.com';

const RELATION_EMOJI: Record<string, string> = {
  father: '👴', mother: '👵', spouse: '💑',
  son: '👦', daughter: '👧', sibling: '👫', other: '👤',
};
const RELATION_LABEL: Record<string, string> = {
  father: '아버지', mother: '어머니', spouse: '배우자',
  son: '아들', daughter: '딸', sibling: '형제/자매', other: '가족',
};

type FamilyMember = { id: string; name: string; phone: string; relation: string };
type Props = { navigation: any; route: any };

export default function SOSScreen({ navigation, route }: Props) {
  const { userId, name } = route?.params ?? {};
  const insets = useSafeAreaInsets();
  const [counting,  setCounting]  = useState(false);
  const [count,     setCount]     = useState(5);
  const [family,    setFamily]    = useState<FamilyMember[]>([]);
  const [callIdx,   setCallIdx]   = useState(0);   // 현재 순차 전화 인덱스
  const [afterCall, setAfterCall] = useState(false); // 전화 후 복귀 상태
  const [smsSent,   setSmsSent]   = useState(false);
  const [sosActive, setSosActive] = useState(false); // SOS 순차전화 진행 중
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const timerRef    = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const callingRef  = useRef(false);
  const familyRef   = useRef<FamilyMember[]>([]);  // 카운트다운 클로저용

  // 앱 연결 가족 + 중요연락처(가족/응급) 합산 로드
  const loadContacts = useCallback(async () => {
    const uid = (await AsyncStorage.getItem('userId')) || userId || '';

    // 1. AsyncStorage family_members (앱 연결된 가족)
    const raw = await AsyncStorage.getItem('family_members');
    const appFamily: FamilyMember[] = raw ? JSON.parse(raw) : [];

    // 2. API important_contacts 중 '가족' / '응급' 타입
    let apiContacts: FamilyMember[] = [];
    if (uid && uid !== 'guest') {
      try {
        const r = await fetch(`${API}/users/${uid}`);
        if (r.ok) {
          const d = await r.json();
          const list: { type: string; name: string; phone: string }[] = d.important_contacts || [];
          apiContacts = list
            .filter(c => (c.type === '가족' || c.type === '응급') && c.phone)
            .map(c => ({ id: `ic-${c.phone}`, name: c.name, phone: c.phone, relation: 'other' }));
        }
      } catch {}
    }

    // 3. 합산 (phone 중복 제거), 최대 3명
    const seen = new Set(appFamily.map(m => m.phone).filter(Boolean));
    const extra = apiContacts.filter(c => !seen.has(c.phone));
    const merged = [...appFamily, ...extra].slice(0, 3);
    setFamily(merged);
    familyRef.current = merged;
  }, [userId]);

  useEffect(() => {
    loadContacts();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    ).start();
    setTimeout(() => speak('괜찮으세요? 큰 빨간 버튼을 누르시면 일일구로 바로 연결돼요.', 0.85), 600);

    const sub = AppState.addEventListener('change', next => {
      if (appStateRef.current !== 'active' && next === 'active' && callingRef.current) {
        callingRef.current = false;
        setAfterCall(true);
      }
      appStateRef.current = next;
    });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
      sub.remove();
    };
  }, []);

  // GPS → 주소 텍스트
  const getLocationText = (): Promise<string> =>
    new Promise(resolve => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(''); return; }
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
              { headers: { 'User-Agent': 'SilverLifeAI/1.0' } }
            );
            const d = await r.json();
            const a = d.address || {};
            const addr = [a.road || a.suburb || a.neighbourhood, a.city || a.town || a.county]
              .filter(Boolean).join(' ');
            resolve(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } catch { resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`); }
        },
        () => resolve(''),
        { timeout: 6000 }
      );
    });

  // 가족 전원에게 위치 포함 SMS
  const sendSMSToAll = useCallback(async (familyList: FamilyMember[], senderName: string) => {
    const phones = familyList.filter(m => m.phone).map(m => m.phone);
    if (phones.length === 0) return;
    const loc = await getLocationText();
    const body = loc
      ? `[Silver Life AI 긴급] ${senderName}님 비상상황!\n현재 위치: ${loc}\n앱에서 동선도 확인해주세요.`
      : `[Silver Life AI 긴급] ${senderName}님 비상상황!\n앱에서 동선을 확인해주세요.`;
    const sep = Platform.OS === 'ios' ? ',' : ';';
    Linking.openURL(`sms:${phones.join(sep)}?body=${encodeURIComponent(body)}`).catch(() => {});
    setSmsSent(true);
  }, []);

  // 백엔드 푸시
  const notifyBackend = useCallback(() => {
    if (!userId) return;
    fetch(`${API}/notifications/sos-push`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name: name || '' }),
    }).catch(() => {});
  }, [userId, name]);

  // 순차 전화 실행
  const callByIdx = useCallback((idx: number, fam: FamilyMember[]) => {
    if (idx >= fam.length) {
      // 모든 가족 불발 → 119
      speak('가족과 연결이 안 됐어요. 일일구로 연결할게요.', 0.85);
      setTimeout(() => Linking.openURL('tel:119'), 1000);
      setSosActive(false);
      return;
    }
    const m = fam[idx];
    if (!m.phone) { callByIdx(idx + 1, fam); return; } // 번호 없으면 다음으로
    const label = RELATION_LABEL[m.relation] || m.name;
    speak(`${label}에게 전화할게요.`, 0.85);
    setCallIdx(idx);
    setAfterCall(false);
    callingRef.current = true;
    setTimeout(() => Linking.openURL(`tel:${m.phone}`), 700);
  }, []);

  // SOS 카운트다운
  const startCountdown = () => {
    if (counting) return;
    if (userId === 'guest') {
      if (Platform.OS === 'web') {
        window.alert('로그인 후 이용할 수 있는 기능입니다.\n119 긴급 연락은 로그인 회원에게만 제공됩니다.');
      } else {
        Alert.alert('로그인 필요', '119 긴급 연락은 로그인 회원에게만 제공됩니다.', [
          { text: '로그인하기', onPress: () => navigation.navigate('Login') },
          { text: '닫기', style: 'cancel' },
        ]);
      }
      return;
    }
    setCounting(true);
    setAfterCall(false);
    setSmsSent(false);
    setCallIdx(0);
    setSosActive(false);
    setCount(5);
    speak('걱정 마세요. 5초 후 연결할게요.', 0.85);
    notifyBackend();
    const COUNT_WORDS = ['', '하나', '둘', '셋', '넷', '다섯'];
    let c = 5;
    timerRef.current = setInterval(() => {
      c--;
      setCount(c);
      if (c > 0) {
        speak(COUNT_WORDS[c], 0.9, 1.15);
      } else {
        clearInterval(timerRef.current);
        setCounting(false);
        setCount(5);
        speak('지금 연결해요.', 0.85);
        setTimeout(() => {
          const fam = familyRef.current;
          if (fam.filter(m => m.phone).length > 0) {
            setSosActive(true);
            sendSMSToAll(fam, name || '');
            setTimeout(() => callByIdx(0, fam), 1500);
          } else {
            Linking.openURL('tel:119');
          }
        }, 800);
      }
    }, 1000);
  };

  // 다음 가족 연결 (앱 복귀 후 배너 탭)
  const callNext = () => {
    callByIdx(callIdx + 1, family);
  };

  // 가족 카드 버튼 — 1순위 전화만 (SMS 없음)
  const callFirstFamily = () => {
    const first = family.find(m => m.phone);
    if (!first) return;
    const label = RELATION_LABEL[first.relation] || first.name;
    speak(`${label}에게 전화할게요.`, 0.85);
    callingRef.current = true;
    setTimeout(() => Linking.openURL(`tel:${first.phone}`), 600);
  };

  const cancelSOS = () => {
    stopSpeech();
    setTimeout(() => speak('취소되었어요. 필요하시면 언제든지 다시 눌러 주세요.', 0.85), 200);
    if (timerRef.current) clearInterval(timerRef.current);
    setCounting(false);
    setCount(5);
    setAfterCall(false);
    setSosActive(false);
    navigation.navigate('SeniorHome', { userId, name });
  };

  // 다음 가족 배너 표시 조건: SOS 순차전화 중 + 앱 복귀 + 다음 가족 있음
  const nextMember = sosActive && afterCall
    ? family.slice(callIdx + 1).find(m => m.phone) ?? null
    : null;

  const firstFamily = family.find(m => m.phone) ?? null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#B71C1C" />
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 28) }]}>
        <Text style={s.headerSub}>EMERGENCY</Text>
        <Text style={s.headerTitle}>긴급 호출</Text>
      </View>

      <View style={s.body}>
        {/* SOS 버튼 */}
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

        {/* 카운트다운 / 상태 영역 */}
        <View style={s.cdWrap}>
          {counting && (
            <>
              <Text style={s.cdNum}>{count}</Text>
              <Text style={s.cdTxt}>초 후 연결</Text>
            </>
          )}
          {smsSent && !counting && (
            <Text style={s.smsSentTxt}>✉️ 가족에게 위치 문자를 보냈어요</Text>
          )}
          {nextMember && (
            <TouchableOpacity style={s.nextBanner} onPress={callNext} activeOpacity={0.85}>
              <Text style={s.nextBannerTxt}>통화 안 됐나요?  다음 가족에게 연결 →</Text>
              <Text style={s.nextBannerName}>
                {RELATION_EMOJI[nextMember.relation] || '👤'} {nextMember.name}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 카드 2개: 가족 | 119 */}
        <View style={s.cardRow}>
          {/* 가족 카드 — 탭 시 1순위 가족 전화 (문자 없음) */}
          <TouchableOpacity
            style={[s.famCard, { flex: firstFamily ? 2 : 1 }]}
            onPress={firstFamily ? callFirstFamily : () => navigation.navigate('FamilyConnect', { userId, name })}
            activeOpacity={0.8}>
            <Text style={s.cardTitle}>👪 가족에게 연락</Text>
            {firstFamily ? (
              <View style={s.famPreview}>
                <Text style={s.famPreviewName}>{firstFamily.name}</Text>
                <Text style={s.famCall}>📞</Text>
              </View>
            ) : (
              <Text style={s.famConnectTxt}>가족 연결하기 +</Text>
            )}
          </TouchableOpacity>

          {/* 119 카드 */}
          <TouchableOpacity style={s.emergCard} onPress={() => Linking.openURL('tel:119')} activeOpacity={0.8}>
            <Text style={s.emergEmoji}>📞</Text>
            <Text style={s.emergLabel}>119</Text>
            <Text style={s.emergSub}>직접 연결</Text>
          </TouchableOpacity>
        </View>

        {/* 취소 */}
        <TouchableOpacity style={s.cancelBtn} onPress={cancelSOS} activeOpacity={0.8}>
          <Text style={s.cancelTxt}>취소</Text>
        </TouchableOpacity>

        {/* AI 상담 */}
        <TouchableOpacity style={s.aiBtn}
          onPress={() => navigation.navigate('AIChat', { userId, name })} activeOpacity={0.8}>
          <Text style={s.aiBtnTxt}>✨ 증상이 확실하지 않으세요? AI에게 여쭤보기 →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#C62828' },
  header:      { paddingBottom: 14, alignItems: 'center' },
  headerSub:   { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 3 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
  body:        { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, justifyContent: 'space-between' },
  guide:       { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.95)', textAlign: 'center', width: '100%' },
  sosBtn:      { width: 180, height: 180, borderRadius: 90, backgroundColor: '#fff',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 6, borderColor: 'rgba(255,255,255,0.25)' },
  sosLabel:    { fontSize: 36, fontWeight: '900', color: '#C62828', letterSpacing: 3 },
  sosSub:      { fontSize: 14, fontWeight: '700', color: '#C62828', marginTop: 2 },
  sos119:      { fontSize: 36, fontWeight: '900', color: '#C62828', marginTop: 2, letterSpacing: 2 },
  cdWrap:      { alignItems: 'center', minHeight: 72, justifyContent: 'center', width: '100%' },
  cdNum:       { fontSize: 56, fontWeight: '900', color: '#FFD600', lineHeight: 60 },
  cdTxt:       { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  smsSentTxt:  { fontSize: 18, fontWeight: '700', color: '#FFD600' },
  nextBanner:  { backgroundColor: '#FFD600', borderRadius: 14, paddingVertical: 12,
                  paddingHorizontal: 20, alignItems: 'center', width: '100%', gap: 4 },
  nextBannerTxt:  { fontSize: 16, fontWeight: '800', color: '#3A1D00' },
  nextBannerName: { fontSize: 22, fontWeight: '900', color: '#3A1D00' },
  cardRow:     { flexDirection: 'row', gap: 10, width: '100%' },
  famCard:     { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18,
                 borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', padding: 22, justifyContent: 'center' },
  cardTitle:   { fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginBottom: 14, textAlign: 'center' },
  famPreview:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  famPreviewName:  { fontSize: 26, fontWeight: '900', color: '#fff' },
  famCall:     { fontSize: 28 },
  famConnectTxt: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  emergCard:   { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18,
                 borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
                 alignItems: 'center', justifyContent: 'center', padding: 14 },
  emergEmoji:  { fontSize: 32, marginBottom: 6 },
  emergLabel:  { fontSize: 28, fontWeight: '900', color: '#fff' },
  emergSub:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '600' },
  cancelBtn:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, width: '100%',
                 paddingVertical: 16, alignItems: 'center' },
  cancelTxt:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  aiBtn:       { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, width: '100%',
                 paddingVertical: 18, alignItems: 'center' },
  aiBtnTxt:    { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
});
