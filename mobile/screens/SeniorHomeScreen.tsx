import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';

// ── 컬러 팔레트 (따뜻한 자연 톤) ──────────────────────
const C = {
  bg:      '#FDFAF6',   // 따뜻한 아이보리
  card:    '#FFFFFF',
  sage:    '#6BAE8F',   // 세이지 그린
  sageLt:  '#EAF5EF',   // 연한 세이지
  peach:   '#F4956A',   // 살구색 포인트
  peachLt: '#FEF0E8',   // 연한 살구
  lavender:'#A78BCA',   // 라벤더 (기분 나쁨)
  sky:     '#6BA8C8',   // 스카이 블루 (AI)
  skyLt:   '#E8F4FB',
  text:    '#2C2C2C',
  sub:     '#8A8A8A',
  line:    '#F0EDE8',
};

function getTodayStr() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
}

export default function SeniorHomeScreen({ route, navigation }: any) {
  const userId  = route?.params?.userId || (DEMO_MODE ? 'demo-user' : '');
  const name    = route?.params?.name   || (DEMO_MODE ? '홍길동' : '');

  const [meds,     setMeds]     = useState<any[]>([]);
  const [logs,     setLogs]     = useState<any[]>([]);
  const [mood,     setMood]     = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? '좋은 아침이에요 ☀️' : h < 18 ? '좋은 오후예요 🌤️' : '좋은 저녁이에요 🌙');
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    fetchMeds();
    loadMood();
    fetchFamilyLinks();
    sendLocation();
  }, []);

  const [familyLinks,    setFamilyLinks]    = useState<any[]>([]);
  const [locationStatus, setLocationStatus] = useState<'sharing'|'off'|'loading'>('off');
  const [locationAddr,   setLocationAddr]   = useState('');

  const fetchFamilyLinks = async () => {
    try {
      const r = await fetch(`${API}/family/links/${userId}`);
      const d = await r.json();
      setFamilyLinks(d.as_family || []);
    } catch {
      if (DEMO_MODE) setFamilyLinks([]);
    }
  };

  const sendLocation = async () => {
    if (!userId) return;
    try {
      setLocationStatus('loading');
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;

      // 역지오코딩 (Nominatim — 무료, API키 불필요)
      let address = '';
      try {
        const gr = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
          { headers: { 'User-Agent': 'SilverLifeAI/1.0' } }
        );
        const gd = await gr.json();
        const r = gd.address || {};
        address = r.road || r.suburb || r.neighbourhood || r.county || gd.display_name?.split(',')[0] || '';
      } catch {}

      await fetch(`${API}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lat, lng, address, activity: 'unknown' }),
      });
      setLocationStatus('sharing');
      setLocationAddr(address);
    } catch {
      setLocationStatus('off');
    }
  };

  const fetchMeds = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [mr, lr] = await Promise.all([
        fetch(`${API}/medications/${userId}`),
        fetch(`${API}/medications/log/${userId}/${today}`),
      ]);
      const md = await mr.json(); const ld = await lr.json();
      setMeds(Array.isArray(md) ? md : []);
      setLogs(Array.isArray(ld) ? ld : []);
    } catch {
      if (DEMO_MODE) {
        setMeds([
          { id:'1', name:'혈압약',  dosage:'1정', times:['08:00','20:00'], color:'#e57373' },
          { id:'2', name:'당뇨약',  dosage:'1정', times:['08:00','12:00'], color:'#64b5f6' },
          { id:'3', name:'관절약',  dosage:'2정', times:['12:00'],         color:'#81c784' },
        ]);
        setLogs([{ medication_id:'1', scheduled_time:'08:00', taken:true }]);
      }
    }
  };

  const loadMood = async () => {
    const k = `mood_${new Date().toISOString().split('T')[0]}`;
    const v = await AsyncStorage.getItem(k);
    if (v) setMood(v);
  };
  const saveMood = async (m: string) => {
    setMood(m);
    await AsyncStorage.setItem(`mood_${new Date().toISOString().split('T')[0]}`, m);
  };

  const totalDoses = meds.reduce((s, m) => s + (m.times?.length || 0), 0);
  const takenDoses = logs.filter(l => l.taken).length;
  const pct        = totalDoses > 0 ? takenDoses / totalDoses : 0;
  const allTaken   = totalDoses > 0 && takenDoses >= totalDoses;

  // 다음 복용 시간 찾기
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  let nextTime = '';
  let nextMed  = '';
  meds.forEach(med => {
    (med.times || []).forEach((t: string) => {
      if (logs.some(l => l.medication_id === med.id && l.scheduled_time === t && l.taken)) return;
      const [hh, mm] = t.split(':').map(Number);
      const tMin = hh * 60 + mm;
      if (tMin > now && (!nextTime || tMin < parseInt(nextTime.replace(':','')))) {
        nextTime = t; nextMed = med.name;
      }
    });
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 헤더 ── */}
          <View style={s.header}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.name}>{name}님</Text>
            <Text style={s.date}>{getTodayStr()}</Text>
          </View>

          {/* ── 위치 공유 상태 ── */}
          {locationStatus !== 'off' && (
            <View style={s.locBadge}>
              <Text style={s.locDot}>{locationStatus === 'sharing' ? '🟢' : '🟡'}</Text>
              <Text style={s.locTxt}>
                {locationStatus === 'loading'
                  ? '위치 확인 중...'
                  : `위치 공유 중${locationAddr ? ' · ' + locationAddr : ''}`}
              </Text>
            </View>
          )}

          {/* ── 약 복용 카드 ── */}
          <TouchableOpacity style={s.medCard}
            onPress={() => navigation.navigate('Medication', { userId, name })}
            activeOpacity={0.92}>

            {/* 원형 진행 표시 */}
            <View style={s.medCardInner}>
              <View style={s.circleWrap}>
                <View style={s.circleOuter}>
                  <View style={[s.circleFill, {
                    backgroundColor: allTaken ? C.sage : C.peach,
                    height: `${Math.round(pct * 100)}%` as any,
                  }]} />
                  <View style={s.circleContent}>
                    <Text style={s.circleNum}>
                      {totalDoses > 0 ? `${takenDoses}/${totalDoses}` : '-'}
                    </Text>
                    <Text style={s.circleLbl}>복용</Text>
                  </View>
                </View>
              </View>

              <View style={s.medInfo}>
                <Text style={s.medTitle}>오늘의 약 🌱</Text>
                {allTaken ? (
                  <Text style={s.medGood}>✅ 모두 드셨어요!</Text>
                ) : totalDoses === 0 ? (
                  <Text style={s.medSub}>등록된 약이 없어요</Text>
                ) : (
                  <>
                    <Text style={s.medSub}>{takenDoses}번 완료</Text>
                    {nextTime && (
                      <View style={s.nextBadge}>
                        <Text style={s.nextTxt}>다음 {nextTime} — {nextMed}</Text>
                      </View>
                    )}
                  </>
                )}
                <View style={s.medGoBtn}>
                  <Text style={s.medGoBtnTxt}>약 확인하기 →</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* ── 기분 체크 ── */}
          <View style={s.moodCard}>
            <Text style={s.sectionTitle}>오늘 기분이 어떠세요?</Text>
            <View style={s.moodRow}>
              {[
                ['🐥', '기분 좋아요!', C.sage],
                ['🐣', '그냥 그래요~', C.sky],
                ['🐢', '좀 힘드네요',  C.lavender],
              ].map(([emoji, label, color]) => (
                <TouchableOpacity key={emoji}
                  style={[s.moodBtn, mood === emoji && { backgroundColor: color + '22', borderColor: color }]}
                  onPress={() => saveMood(emoji as string)} activeOpacity={0.75}>
                  <Text style={s.moodEmoji}>{emoji}</Text>
                  <Text style={[s.moodLabel, mood === emoji && { color: color as string, fontWeight: '700' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── 바로가기 ── */}
          <Text style={s.sectionTitle}>바로가기</Text>
          <View style={s.shortcutRow}>
            {[
              { icon: '💝', label: '가족 연결',  color: C.peachLt, screen: familyLinks.length > 0 ? 'FamilyDashboard' : 'FamilyConnect' },
              { icon: '💬', label: 'AI 건강 상담', color: C.skyLt,   screen: 'AIChat' },
              { icon: '🌿', label: '건강 분석',    color: C.sageLt,  screen: 'Dashboard' },
              { icon: '🌺', label: '설정',         color: C.line,    screen: 'Settings' },
            ].map(item => (
              <TouchableOpacity key={item.screen}
                style={[s.shortcut, { backgroundColor: item.color }]}
                onPress={() => navigation.navigate(item.screen, { userId, name })}
                activeOpacity={0.8}>
                <Text style={s.shortcutIcon}>{item.icon}</Text>
                <Text style={s.shortcutLbl}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── 약 미리보기 ── */}
          {meds.length > 0 && (
            <View style={s.previewCard}>
              <Text style={s.sectionTitle}>등록된 약</Text>
              {meds.map(m => (
                <View key={m.id} style={s.previewRow}>
                  <View style={[s.dot, { backgroundColor: m.color }]} />
                  <Text style={s.previewName}>{m.name}</Text>
                  <Text style={s.previewDosage}>{m.dosage}</Text>
                  <Text style={s.previewTimes}>{m.times?.join(' · ')}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </Animated.View>

      {/* ── 탭바 ── */}
      <View style={s.tabbar}>
        {[
          { icon:'🌿', lbl:'오늘',    screen:'',            active: true  },
          { icon:'💊', lbl:'내 약',   screen:'Medication',  active: false },
          { icon:'💬', lbl:'AI 상담', screen:'AIChat',      active: false },
          { icon:'🌸', lbl:'내 정보', screen:'Settings',    active: false },
        ].map(tab => (
          <TouchableOpacity key={tab.lbl} style={s.tab}
            onPress={() => tab.screen && navigation.navigate(tab.screen, { userId, name })}
            activeOpacity={0.7}>
            <Text style={[s.tabIcon, tab.active && { opacity: 1 }]}>{tab.icon}</Text>
            <Text style={[s.tabLbl, tab.active && { color: C.sage, fontWeight: '700' }]}>{tab.lbl}</Text>
            {tab.active && <View style={s.tabDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  scroll:       { padding: 22, paddingTop: Platform.OS === 'web' ? 24 : (StatusBar.currentHeight ?? 28) + 12, paddingBottom: 24 },
  header:       { marginBottom: 28 },
  greeting:     { fontSize: 15, color: C.sub, marginBottom: 2 },
  name:         { fontSize: 34, fontWeight: '800', color: C.text, marginBottom: 4 },
  date:         { fontSize: 14, color: '#BABABA' },

  // 약 카드
  medCard:      { backgroundColor: C.card, borderRadius: 24, padding: 22, marginBottom: 16,
                  shadowColor: '#B8A898', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset:{width:0,height:6}, elevation: 5 },
  medCardInner: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  circleWrap:   { alignItems: 'center', justifyContent: 'center' },
  circleOuter:  { width: 80, height: 80, borderRadius: 40, backgroundColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  circleFill:   { position: 'absolute', bottom: 0, left: 0, right: 0 },
  circleContent:{ position: 'absolute', alignItems: 'center', justifyContent: 'center', top: 0, bottom: 0, left: 0, right: 0 },
  circleNum:    { fontSize: 18, fontWeight: '900', color: C.text },
  circleLbl:    { fontSize: 10, color: C.sub, fontWeight: '600' },
  medInfo:      { flex: 1 },
  medTitle:     { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 },
  medGood:      { fontSize: 14, color: C.sage, fontWeight: '600', marginBottom: 8 },
  medSub:       { fontSize: 13, color: C.sub, marginBottom: 6 },
  nextBadge:    { backgroundColor: C.peachLt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  nextTxt:      { fontSize: 12, color: C.peach, fontWeight: '700' },
  medGoBtn:     { backgroundColor: C.sageLt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  medGoBtnTxt:  { fontSize: 13, color: C.sage, fontWeight: '700' },

  // 기분
  moodCard:     { backgroundColor: C.card, borderRadius: 24, padding: 22, marginBottom: 16,
                  shadowColor: '#B8A898', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset:{width:0,height:4}, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  moodRow:      { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  moodBtn:      { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18,
                  borderWidth: 2, borderColor: C.line, backgroundColor: '#FAFAFA' },
  moodEmoji:    { fontSize: 32, marginBottom: 6 },
  moodLabel:    { fontSize: 12, color: C.sub, fontWeight: '500' },

  // 바로가기
  shortcutRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  shortcut:     { width: '47%', borderRadius: 20, padding: 18, alignItems: 'center', gap: 8 },
  shortcutIcon: { fontSize: 30 },
  shortcutLbl:  { fontSize: 13, fontWeight: '700', color: C.text },

  // 미리보기
  previewCard:  { backgroundColor: C.card, borderRadius: 24, padding: 22,
                  shadowColor: '#B8A898', shadowOpacity: 0.10, shadowRadius: 10, elevation: 2 },
  previewRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  previewName:  { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  previewDosage:{ fontSize: 13, color: C.sub, marginRight: 6 },
  previewTimes: { fontSize: 12, color: '#BABABA' },

  // 탭바
  tabbar:       { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, paddingBottom: 14 },
  tab:          { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon:      { fontSize: 22, opacity: 0.3 },
  tabLbl:       { fontSize: 10, color: '#BABABA', fontWeight: '500' },
  tabDot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: C.sage, marginTop: 1 },

  // 위치 배지
  locBadge:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.sageLt,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, gap: 6 },
  locDot:       { fontSize: 10 },
  locTxt:       { fontSize: 13, color: C.sage, fontWeight: '600', flex: 1 },
});
