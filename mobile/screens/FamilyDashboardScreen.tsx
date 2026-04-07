import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Animated, Alert,
} from 'react-native';
import { DEMO_MODE } from '../App';
import SeniorTabBar from '../components/SeniorTabBar';

const API = 'https://silverlieai.onrender.com';

const C = {
  blue1:   '#1A4A8A',
  blue2:   '#2272B8',
  blueCard:'#EBF3FB',
  card:    '#FFFFFF',
  bg:      '#F0F5FB',
  sage:    '#3DAB7B',
  sageLt:  '#E6F7EF',
  amber:   '#E8960A',
  amberLt: '#FEF6E0',
  red:     '#D94040',
  redLt:   '#FDEAEA',
  text:    '#16273E',
  sub:     '#7A90A8',
  line:    '#DDE8F4',
};

type AlertLevel = 'good' | 'warn' | 'danger';
const ALERT_CFG: Record<AlertLevel, { icon: string; title: string; desc: string; color: string; bg: string; border: string }> = {
  good:   { icon:'✅', title:'오늘 건강 상태 양호',  desc:'복용 잘 하고 있어요. 수고하셨어요!',           color: C.sage,  bg: C.sageLt,  border: C.sage  },
  warn:   { icon:'⚠️', title:'복용 알림',             desc:'아직 드시지 않은 약이 있어요.',                color: C.amber, bg: C.amberLt, border: C.amber },
  danger: { icon:'🚨', title:'복용 확인 필요',         desc:'오늘 복용 기록이 많이 부족해요. 확인해주세요.', color: C.red,   bg: C.redLt,   border: C.red   },
};

const DEMO_STATUS = {
  medications: [
    { id:'1', name:'혈압약', dosage:'1정', times:['08:00','20:00'], color:'#e57373' },
    { id:'2', name:'당뇨약', dosage:'1정', times:['08:00','12:00'], color:'#64b5f6' },
    { id:'3', name:'관절약', dosage:'2정', times:['12:00'],         color:'#81c784' },
  ],
  today_logs: [
    { medication_id:'1', scheduled_time:'08:00', taken: true,  status:'taken'   },
    { medication_id:'2', scheduled_time:'08:00', taken: true,  status:'taken'   },
    { medication_id:'2', scheduled_time:'12:00', taken: false, status:'skipped' },
  ],
  summary: { total: 4, taken: 2, skipped: 1, missed: [{ med_name:'혈압약', time:'20:00' }], alert_level:'warn', pct: 50 },
};

const DEMO_LOGS = {
  point_count: 5,
  current_activity: 'home',
  total_distance_m: 1240,
  logs: [
    { lat:37.4979, lng:127.0276, activity:'home',    address:'역삼동',      created_at:'2026-04-03T07:30:00Z' },
    { lat:37.4985, lng:127.0290, activity:'outdoor', address:'역삼공원',    created_at:'2026-04-03T09:10:00Z' },
    { lat:37.5001, lng:127.0310, activity:'outdoor', address:'강남역 근처', created_at:'2026-04-03T09:45:00Z' },
    { lat:37.4992, lng:127.0295, activity:'outdoor', address:'이마트',      created_at:'2026-04-03T10:20:00Z' },
    { lat:37.4981, lng:127.0280, activity:'home',    address:'역삼동',      created_at:'2026-04-03T11:05:00Z' },
  ],
};

function getTodayStr() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
}

function loadLeaflet(cb: () => void) {
  if ((window as any).L) { cb(); return; }
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css'; link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  const s = document.createElement('script');
  s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.onload = cb;
  document.head.appendChild(s);
}

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const seniorId   = route?.params?.seniorId   || (DEMO_MODE ? 'demo-senior' : '');
  const seniorName = route?.params?.seniorName || (DEMO_MODE ? '홍길동' : '');
  const userId     = route?.params?.userId     || (DEMO_MODE ? 'demo-user'   : '');
  const name       = route?.params?.name       || (DEMO_MODE ? '홍길동' : '');

  const [status,     setStatus]    = useState<any>(null);
  const [locData,    setLocData]   = useState<any>(null);
  const [refreshing, setRefreshing]= useState(false);
  const [mapReady,   setMapReady]  = useState(false);

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const inlineMapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchStatus();
    const timer = setInterval(fetchStatus, 120000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!locData?.logs?.length) return;
    const t = setTimeout(() => initInlineMap(locData.logs), 300);
    return () => clearTimeout(t);
  }, [locData, mapReady]);

  const initInlineMap = (logs: any[]) => {
    if (!inlineMapRef.current) return;
    loadLeaflet(() => {
      const L = (window as any).L;
      if (!L) return;
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
      const el = inlineMapRef.current;
      if (el._leaflet_id) el._leaflet_id = undefined;

      const coords: [number, number][] = logs.map((l: any) => [l.lat, l.lng]);
      const center = coords[Math.floor(coords.length / 2)];

      const map = L.map(el, {
        zoomControl: false, scrollWheelZoom: false,
        dragging: true, attributionControl: false,
      }).setView(center, 15);
      leafletMapRef.current = map;

      // CartoDB Positron — 깔끔한 흰 배경, 불필요한 정보 없음
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(map);

      // 이동 경로 — 굵고 선명한 파란 실선
      L.polyline(coords, {
        color: '#2272B8', weight: 6, opacity: 0.9,
      }).addTo(map);

      // 마커 — 크고 읽기 쉬운 DivIcon
      logs.forEach((log: any, i: number) => {
        const t = new Date(log.created_at);
        const timeStr = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
        const isFirst = i === 0;
        const isLast  = i === logs.length - 1;
        const isHome  = log.activity === 'home';

        let bgColor = '#F4956A';
        let emoji   = '🚶';
        if (isFirst)      { bgColor = '#3DAB7B'; emoji = '🏡'; }
        else if (isLast)  { bgColor = '#D94040'; emoji = '📍'; }
        else if (isHome)  { bgColor = '#3DAB7B'; emoji = '🏡'; }

        const size = isFirst || isLast ? 52 : 40;
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${size}px; height:${size}px; border-radius:50%;
            background:${bgColor}; border:3px solid #fff;
            box-shadow:0 3px 10px rgba(0,0,0,0.25);
            display:flex; flex-direction:column;
            align-items:center; justify-content:center;
            font-size:${isFirst || isLast ? 20 : 16}px; line-height:1;
          ">
            <span>${emoji}</span>
            <span style="
              font-size:9px; color:#fff; font-weight:700;
              font-family:sans-serif; margin-top:1px;
            ">${timeStr}</span>
          </div>`,
          iconSize:   [size, size],
          iconAnchor: [size/2, size/2],
        });

        const label = isFirst ? '🏡 출발' : isLast ? '📍 현재위치' : isHome ? '🏡 귀가' : '🚶 외출';
        L.marker([log.lat, log.lng], { icon })
          .bindPopup(`<div style="font-size:15px;font-weight:700;line-height:1.6">
            ${label}<br>
            <span style="font-size:13px;color:#666">${timeStr}${log.address ? ' · '+log.address : ''}</span>
          </div>`, { maxWidth: 180 })
          .addTo(map);
      });

      if (coords.length > 1) map.fitBounds(L.latLngBounds(coords), { padding: [32, 32] });
    });
  };

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`${API}/family/status/${seniorId}`);
      if (r.ok) {
        const d = await r.json();
        setStatus(d);
        try {
          const lr = await fetch(`${API}/location/today/${seniorId}`);
          if (lr.ok) {
            const ld = await lr.json();
            setLocData(ld.point_count > 0 ? ld : (DEMO_MODE ? DEMO_LOGS : null));
          } else if (DEMO_MODE) setLocData(DEMO_LOGS);
        } catch { if (DEMO_MODE) setLocData(DEMO_LOGS); }
      } else if (DEMO_MODE) {
        setStatus(DEMO_STATUS);
        setLocData(DEMO_LOGS);
      }
    } catch {
      if (DEMO_MODE) { setStatus(DEMO_STATUS); setLocData(DEMO_LOGS); }
    } finally { setRefreshing(false); }
  }, [seniorId]);

  const s            = status || DEMO_STATUS;
  const summary: any = s.summary || {};
  const meds: any[]  = (s.medications || []).filter((m: any) => !m.med_type || m.med_type === '처방약');
  const logs: any[]  = s.today_logs  || [];

  // 복용하지 않은 약 목록
  const notTaken = meds.flatMap(med =>
    (med.times || [])
      .filter((t: string) => {
        const log = logs.find((l: any) => l.medication_id === med.id && l.scheduled_time === t);
        return !log?.taken;
      })
      .map((t: string) => ({ name: med.name, time: t, color: med.color }))
  );

  const locLogs    = locData?.logs || [];
  const currentAct = locData?.current_activity || '';
  const distStr    = locData?.total_distance_m >= 1000
    ? `${(locData.total_distance_m / 1000).toFixed(1)}km`
    : `${locData?.total_distance_m || 0}m`;

  const webHeaderBg: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(135deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: C.blue1 };

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.blue1} />

      {/* ── 헤더 ── */}
      <View style={[ss.header, webHeaderBg]}>
        <View style={ss.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn}>
            <Text style={ss.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={ss.headerCenter}>
            <Text style={ss.headerDate}>{getTodayStr()}</Text>
            <Text style={ss.headerName}>{seniorName}님의 오늘</Text>
          </View>
          <TouchableOpacity style={ss.sosBtn}
            onPress={() => Alert.alert('긴급 연락', `${seniorName}님께 전화를 연결합니다`)}>
            <Text style={ss.sosTxt}>📞</Text>
          </TouchableOpacity>
        </View>

      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 복용 상태 배너 ── */}
          <TouchableOpacity
            style={[ss.medBanner,
              notTaken.length === 0
                ? { backgroundColor: C.sageLt, borderColor: C.sage }
                : { backgroundColor: C.amberLt, borderColor: C.amber }
            ]}
            onPress={() => navigation.navigate('Medication', { userId, name })}
            activeOpacity={0.82}>
            <Text style={ss.medBannerIcon}>
              {notTaken.length === 0 ? '✅' : '🔔'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[ss.medBannerTxt, {
                color: notTaken.length === 0 ? C.sage : C.amber,
              }]}>
                {notTaken.length === 0
                  ? '오늘 약을 모두 복용하셨어요'
                  : `아직 드시지 않은 약이 있어요 (${notTaken.length}건)`}
              </Text>
            </View>
            <Text style={[ss.medBannerArrow, {
              color: notTaken.length === 0 ? C.sage : C.amber,
            }]}>›</Text>
          </TouchableOpacity>

          {/* ── 오늘 동선 ── */}
          <View style={ss.card}>
            <View style={ss.locHeader}>
              <Text style={ss.cardTitle}>📍 오늘 동선</Text>
              {locData && (
                <View style={[ss.actChip, {
                  backgroundColor: currentAct === 'outdoor' ? C.amberLt : C.sageLt,
                }]}>
                  <Text style={[ss.actChipTxt, {
                    color: currentAct === 'outdoor' ? C.amber : C.sage,
                  }]}>
                    {currentAct === 'outdoor' ? '🚶 외출 중' : '🏡 집 근처'}
                  </Text>
                </View>
              )}
            </View>

            {locData && (
              <Text style={ss.distTxt}>오늘 총 {distStr} 이동 · {locLogs.length}개 지점</Text>
            )}

            {Platform.OS === 'web' ? (
              locData && locLogs.length > 0 ? (
                <View style={ss.mapContainer} onLayout={() => setMapReady(true)}>
                  {/* @ts-ignore */}
                  <div ref={inlineMapRef} style={{ width:'100%', height:'100%', borderRadius:14, overflow:'hidden' }} />
                  <View style={ss.legend}>
                    {[
                      { color: C.sage,    label: '🏡 집' },
                      { color: '#F4956A', label: '🚶 외출' },
                      { color: C.red,     label: '📍 현재' },
                    ].map(it => (
                      <View key={it.label} style={ss.legendItem}>
                        <View style={[ss.legendDot, { backgroundColor: it.color }]} />
                        <Text style={ss.legendTxt}>{it.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={ss.mapEmpty}>
                  <Text style={ss.mapEmptyIcon}>🗺️</Text>
                  <Text style={ss.mapEmptyTxt}>아직 위치 정보가 없어요</Text>
                  <Text style={ss.mapEmptySub}>앱을 열면 자동으로 기록됩니다</Text>
                </View>
              )
            ) : (
              <View style={ss.mapEmpty}>
                <Text style={ss.mapEmptyIcon}>🗺️</Text>
                <Text style={ss.mapEmptyTxt}>지도는 웹 데모에서 확인 가능합니다</Text>
              </View>
            )}

            {locData && locLogs.length > 0 && (
              <TouchableOpacity
                style={ss.fullMapBtn}
                onPress={() => navigation.navigate('LocationMap', {
                  logs: locLogs, seniorName, totalDist: locData.total_distance_m,
                })}
                activeOpacity={0.8}>
                <Text style={ss.fullMapBtnTxt}>⛶  전체화면으로 보기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── 빠른 연락 ── */}
          <View style={ss.card}>
            <Text style={ss.cardTitle}>📲 빠른 연락</Text>
            <View style={ss.contactRow}>
              {[
                { icon:'📞', label:'전화하기',   color: C.sage,  bg: C.sageLt  },
                { icon:'💬', label:'문자 보내기', color: C.blue2, bg: C.blueCard },
                { icon:'🚨', label:'긴급 신고',   color: C.red,   bg: C.redLt   },
              ].map(btn => (
                <TouchableOpacity key={btn.label}
                  style={[ss.contactBtn, { backgroundColor: btn.bg, borderColor: btn.color }]}
                  onPress={() => Alert.alert(btn.label, `${seniorName}님에게 ${btn.label}`)}
                  activeOpacity={0.75}>
                  <Text style={ss.contactIcon}>{btn.icon}</Text>
                  <Text style={[ss.contactLabel, { color: btn.color }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>

      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 16 },

  // 헤더
  header:       { paddingTop: Platform.OS==='web' ? 20 : (StatusBar.currentHeight??28)+8,
                  paddingHorizontal: 18, paddingBottom: 12 },
  headerTop:    { flexDirection:'row', alignItems:'center', marginBottom: 4, gap: 10 },
  backBtn:      { width:36, height:36, alignItems:'center', justifyContent:'center' },
  backTxt:      { color:'#fff', fontSize:28, fontWeight:'300', lineHeight:32 },
  headerCenter: { flex: 1 },
  headerDate:   { fontSize:13, color:'rgba(255,255,255,0.65)', marginBottom:2 },
  headerName:   { fontSize:26, fontWeight:'800', color:'#fff', letterSpacing:-0.3 },
  sosBtn:       { width:40, height:40, borderRadius:20,
                  backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center' },
  sosTxt:       { fontSize:18 },
  refreshBtn:   { width:32, height:32, alignItems:'center', justifyContent:'center' },
  refreshIcon:  { fontSize:20, color: C.sub },

  // 카드 공통
  card:      { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
               shadowColor:'#2272B8', shadowOpacity:0.08, shadowRadius:14,
               shadowOffset:{width:0,height:4}, elevation:3 },
  cardTitle: { fontSize:17, fontWeight:'800', color: C.text, marginBottom:14 },

  // 복용 배너
  medBanner:      { flexDirection:'row', alignItems:'center', borderRadius:16, borderWidth:1.5,
                    paddingHorizontal:16, paddingVertical:14, marginBottom:14, gap:12 },
  medBannerIcon:  { fontSize:22 },
  medBannerTxt:   { fontSize:16, fontWeight:'700' },
  medBannerArrow: { fontSize:26, fontWeight:'300' },

  // 동선
  locHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  actChip:      { borderRadius:12, paddingHorizontal:10, paddingVertical:4 },
  actChipTxt:   { fontSize:14, fontWeight:'700' },
  distTxt:      { fontSize:14, color: C.sub, marginBottom:12 },
  mapContainer: { height:260, borderRadius:14, overflow:'hidden', marginBottom:10,
                  backgroundColor: C.blueCard, position:'relative' },
  legend:       { position:'absolute', bottom:8, left:8, flexDirection:'row', gap:10,
                  backgroundColor:'rgba(255,255,255,0.92)', borderRadius:10,
                  paddingHorizontal:10, paddingVertical:5 },
  legendItem:   { flexDirection:'row', alignItems:'center', gap:4 },
  legendDot:    { width:8, height:8, borderRadius:4 },
  legendTxt:    { fontSize:12, color: C.text, fontWeight:'600' },
  mapEmpty:     { height:140, alignItems:'center', justifyContent:'center', gap:8 },
  mapEmptyIcon: { fontSize:36 },
  mapEmptyTxt:  { fontSize:16, color: C.sub, fontWeight:'600' },
  mapEmptySub:  { fontSize:14, color:'#BABABA' },
  fullMapBtn:   { backgroundColor: C.blueCard, borderRadius:12, paddingVertical:11, alignItems:'center' },
  fullMapBtnTxt:{ fontSize:15, fontWeight:'700', color: C.blue2 },

  // 연락
  contactRow:   { flexDirection:'row', gap:10 },
  contactBtn:   { flex:1, alignItems:'center', paddingVertical:14, borderRadius:16,
                  borderWidth:1.5, gap:5 },
  contactIcon:  { fontSize:22 },
  contactLabel: { fontSize:13, fontWeight:'700' },
});
