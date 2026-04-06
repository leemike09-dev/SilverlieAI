import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Animated, Alert, ActivityIndicator,
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
  good:   { icon:'✅', title:'오늘 건강 상태 양호',  desc:'복용 잘 하고 있어요. 수고하셨어요!',              color: C.sage,  bg: C.sageLt,  border: C.sage  },
  warn:   { icon:'⚠️', title:'복용 일부 누락',        desc:'일부 약을 아직 드시지 않았어요.',                  color: C.amber, bg: C.amberLt, border: C.amber },
  danger: { icon:'🚨', title:'복용 확인 필요',         desc:'오늘 복용 기록이 많이 부족해요. 확인해주세요.',     color: C.red,   bg: C.redLt,   border: C.red   },
};

const DEMO_STATUS = {
  medications: [
    { id:'1', name:'혈압약',  dosage:'1정', times:['08:00','20:00'], color:'#e57373' },
    { id:'2', name:'당뇨약',  dosage:'1정', times:['08:00','12:00'], color:'#64b5f6' },
    { id:'3', name:'관절약',  dosage:'2정', times:['12:00'],         color:'#81c784' },
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
    { lat:37.4985, lng:127.0290, activity:'역삼공원', address:'역삼공원',    created_at:'2026-04-03T09:10:00Z' },
    { lat:37.5001, lng:127.0310, activity:'outdoor', address:'강남역 근처', created_at:'2026-04-03T09:45:00Z' },
    { lat:37.4992, lng:127.0295, activity:'outdoor', address:'이마트',      created_at:'2026-04-03T10:20:00Z' },
    { lat:37.4981, lng:127.0280, activity:'home',    address:'역삼동',      created_at:'2026-04-03T11:05:00Z' },
  ],
};

const WEEKLY = [
  { day:'월', pct:90 }, { day:'화', pct:100 }, { day:'수', pct:70, ok:false },
  { day:'목', pct:60, ok:false }, { day:'금', pct:100 }, { day:'토', pct:80 },
  { day:'오늘', pct:50, ok:false },
];

const DEMO_TIMELINE = [
  { time:'08:00', icon:'💊', label:'혈압약·당뇨약 복용 완료', type:'ok' },
  { time:'09:10', icon:'🚶', label:'외출 — 역삼공원',          type:'ok' },
  { time:'10:20', icon:'🛒', label:'이마트 방문',               type:'ok' },
  { time:'11:05', icon:'🏡', label:'귀가',                      type:'ok' },
  { time:'12:00', icon:'💊', label:'당뇨약 건너뜀',             type:'skipped' },
  { time:'20:00', icon:'💊', label:'혈압약 복용 예정',          type:'pending' },
];

function getTodayStr() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
}

// Leaflet 로드 유틸
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
  const [aiResult,   setAiResult]  = useState<any>(null);
  const [analyzing,  setAnalyzing] = useState(false);
  const [refreshing, setRefreshing]= useState(false);
  const [lastUpdate, setLastUpdate]= useState('');
  const [showWeekly, setShowWeekly]= useState(false);
  const [mapReady,   setMapReady]  = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inlineMapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);  // Leaflet map instance

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    startPulse();
    fetchStatus();
    const timer = setInterval(fetchStatus, 120000);
    return () => clearInterval(timer);
  }, []);

  // locData 변경 시 지도 초기화
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!locData || !locData.logs?.length) return;
    // 약간 지연해서 DOM이 준비된 후 초기화
    const t = setTimeout(() => initInlineMap(locData.logs), 300);
    return () => clearTimeout(t);
  }, [locData, mapReady]);

  const initInlineMap = (logs: any[]) => {
    if (!inlineMapRef.current) return;
    loadLeaflet(() => {
      const L = (window as any).L;
      if (!L) return;

      // 기존 인스턴스 제거
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      // leaflet이 이미 초기화한 div면 id 초기화
      const el = inlineMapRef.current;
      if (el._leaflet_id) { el._leaflet_id = undefined; }

      const coords: [number, number][] = logs.map((l: any) => [l.lat, l.lng]);
      const center = coords[Math.floor(coords.length / 2)];

      const map = L.map(el, {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: true,
        attributionControl: false,
      }).setView(center, 15);

      leafletMapRef.current = map;

      // 지도 타일
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // 경로 선 (딥블루)
      L.polyline(coords, {
        color:     '#2272B8',
        weight:    4,
        opacity:   0.85,
        dashArray: '10, 5',
      }).addTo(map);

      // 마커
      logs.forEach((log: any, i: number) => {
        const t = new Date(log.created_at);
        const timeStr = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
        const isFirst = i === 0;
        const isLast  = i === logs.length - 1;

        let color = '#F4956A';  // 외출
        if (isFirst || log.activity === 'home') color = '#3DAB7B';  // 집
        if (isLast) color = '#D94040';  // 현재위치

        const radius = isFirst || isLast ? 12 : 8;
        L.circleMarker([log.lat, log.lng], {
          radius, color: '#FFFFFF', fillColor: color,
          weight: 2.5, fillOpacity: 1,
        }).bindPopup(
          `<b>${isFirst ? '🏡 출발' : isLast ? '📍 현재위치' : log.activity === 'home' ? '🏡 귀가' : '🚶 외출'}</b><br>${timeStr}${log.address ? '<br>' + log.address : ''}`
        ).addTo(map);
      });

      // 경로 전체 보이게
      if (coords.length > 1) {
        map.fitBounds(L.latLngBounds(coords), { padding: [28, 28] });
      }
    });
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 900, useNativeDriver: true }),
      ])
    ).start();
  };

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`${API}/family/status/${seniorId}`);
      if (r.ok) {
        const d = await r.json();
        setStatus(d);
        setLastUpdate(new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }));
        try {
          const lr = await fetch(`${API}/location/today/${seniorId}`);
          if (lr.ok) {
            const ld = await lr.json();
            setLocData(ld.point_count > 0 ? ld : (DEMO_MODE ? DEMO_LOGS : null));
          } else if (DEMO_MODE) setLocData(DEMO_LOGS);
        } catch { if (DEMO_MODE) setLocData(DEMO_LOGS); }
        if (d.summary?.alert_level !== 'good') autoAnalyze(d.summary);
      } else if (DEMO_MODE) {
        setStatus(DEMO_STATUS);
        setLocData(DEMO_LOGS);
        setLastUpdate(new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }));
      }
    } catch {
      if (DEMO_MODE) {
        setStatus(DEMO_STATUS);
        setLocData(DEMO_LOGS);
        setLastUpdate(new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }));
      }
    } finally { setRefreshing(false); }
  }, [seniorId]);

  const autoAnalyze = async (sum: any) => {
    if (aiResult) return;
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/family/ai-check`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ senior_name: seniorName, med_taken: sum.taken, med_total: sum.total }),
      });
      setAiResult(await r.json());
    } catch {
      setAiResult({ level:'warn', message:`${seniorName}님 오늘 복용 일부 누락\n확인 후 직접 연락해보세요.` });
    } finally { setAnalyzing(false); }
  };

  const runAiAnalysis = () => { setAiResult(null); autoAnalyze(summary); };

  const s           = status || DEMO_STATUS;
  const summary: any    = s.summary || {};
  const meds: any[]     = s.medications || [];
  const logs: any[]     = s.today_logs  || [];
  const alertLevel: AlertLevel = summary.alert_level || 'good';
  const cfg    = ALERT_CFG[alertLevel];
  const medPct = summary.total > 0 ? summary.taken / summary.total : 0;
  const missed: any[]   = summary.missed  || [];
  const skipped: number = summary.skipped || 0;

  const medDetail = meds.map(med => ({
    ...med,
    takenCount:   logs.filter((l:any) => l.medication_id===med.id && l.taken).length,
    skippedCount: logs.filter((l:any) => l.medication_id===med.id && l.status==='skipped').length,
    total: (med.times||[]).length,
  }));

  const aiColor = aiResult
    ? aiResult.level==='danger' ? C.red : aiResult.level==='warn' ? C.amber : C.sage
    : C.blue2;
  const aiBg = aiResult
    ? aiResult.level==='danger' ? C.redLt : aiResult.level==='warn' ? C.amberLt : C.sageLt
    : C.blueCard;

  const webHeaderBg: any = Platform.OS==='web'
    ? { background: 'linear-gradient(135deg, #1A4A8A 0%, #2272B8 100%)' }
    : { backgroundColor: C.blue1 };

  const locLogs     = locData?.logs || [];
  const currentAct  = locData?.current_activity || '';
  const distStr     = locData?.total_distance_m >= 1000
    ? `${(locData.total_distance_m/1000).toFixed(1)}km`
    : `${locData?.total_distance_m || 0}m`;

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

        {/* 상태 배너 */}
        <View style={[ss.headerBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Animated.Text style={[ss.bannerIcon,
            alertLevel==='danger' && { transform:[{ scale: pulseAnim }] }]}>
            {cfg.icon}
          </Animated.Text>
          <View style={{ flex: 1 }}>
            <Text style={[ss.bannerTitle, { color: cfg.color }]}>{cfg.title}</Text>
            <Text style={[ss.bannerDesc,  { color: cfg.color }]}>{cfg.desc}</Text>
          </View>
          <TouchableOpacity onPress={fetchStatus} style={ss.refreshBtn}>
            {refreshing
              ? <ActivityIndicator size="small" color={cfg.color} />
              : <Text style={ss.refreshIcon}>↻</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 복용 경고 ── */}
          {(missed.length > 0 || skipped > 0) && (
            <View style={ss.warnCard}>
              <Text style={ss.warnTitle}>⚠️ 복용 알림</Text>
              {missed.map((m:any, i:number) => (
                <View key={i} style={ss.warnRow}>
                  <View style={[ss.warnDot, { backgroundColor: C.red }]} />
                  <Text style={ss.warnTxt}><Text style={{ fontWeight:'800' }}>{m.med_name}</Text>{` ${m.time} 복용 기록 없음`}</Text>
                </View>
              ))}
              {skipped > 0 && (
                <View style={ss.warnRow}>
                  <View style={[ss.warnDot, { backgroundColor: C.amber }]} />
                  <Text style={ss.warnTxt}>오늘 {skipped}번 건너뜀</Text>
                </View>
              )}
            </View>
          )}

          {/* ── 오늘 복용 현황 ── */}
          <View style={ss.card}>
            <Text style={ss.cardTitle}>💊 오늘 복용 현황</Text>
            <View style={ss.pctRow}>
              <View style={ss.barBg}>
                <View style={[ss.barFill, {
                  width: `${Math.round(medPct*100)}%` as any,
                  backgroundColor: medPct>=1 ? C.sage : medPct>=0.5 ? C.amber : C.red,
                }]} />
              </View>
              <Text style={[ss.pctTxt, { color: medPct>=1 ? C.sage : medPct>=0.5 ? C.amber : C.red }]}>
                {summary.taken||0}/{summary.total||0}
              </Text>
            </View>
            {medDetail.map((med:any, i:number) => (
              <View key={i} style={ss.medRow}>
                <View style={[ss.medDot, { backgroundColor: med.color }]} />
                <Text style={ss.medName}>{med.name}</Text>
                <Text style={ss.medDosage}>{med.dosage}</Text>
                <View style={ss.medBadges}>
                  {(med.times||[]).map((t:string, j:number) => {
                    const log = logs.find((l:any) => l.medication_id===med.id && l.scheduled_time===t);
                    const st = log?.status;
                    return (
                      <View key={j} style={[ss.badge,
                        st==='taken'   && { backgroundColor: C.sageLt },
                        st==='skipped' && { backgroundColor: C.amberLt },
                        !st            && { backgroundColor: C.line },
                      ]}>
                        <Text style={[ss.badgeTxt,
                          st==='taken'   && { color: C.sage  },
                          st==='skipped' && { color: C.amber },
                          !st            && { color: C.sub   },
                        ]}>{t}{st==='taken' ? ' ✓' : st==='skipped' ? ' ⏭' : ' ?'}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* ── 오늘 동선 (인라인 지도) ── */}
          <View style={ss.card}>
            {/* 카드 헤더 */}
            <View style={ss.locHeader}>
              <Text style={ss.cardTitle}>📍 오늘 동선</Text>
              {locData && (
                <View style={[ss.actChip, {
                  backgroundColor: currentAct==='outdoor' ? C.amberLt : C.sageLt,
                }]}>
                  <Text style={[ss.actChipTxt, {
                    color: currentAct==='outdoor' ? C.amber : C.sage,
                  }]}>
                    {currentAct==='outdoor' ? '🚶 외출 중' : '🏡 집 근처'}
                  </Text>
                </View>
              )}
            </View>

            {/* 이동 거리 */}
            {locData && (
              <Text style={ss.distTxt}>
                오늘 총 {distStr} 이동 · {locLogs.length}개 지점
              </Text>
            )}

            {/* 인라인 지도 */}
            {Platform.OS === 'web' ? (
              locData && locLogs.length > 0 ? (
                <View
                  style={ss.mapContainer}
                  onLayout={() => setMapReady(true)}>
                  {/* @ts-ignore */}
                  <div
                    ref={inlineMapRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}
                  />
                  {/* 범례 오버레이 */}
                  <View style={ss.legend}>
                    {[
                      { color: C.sage, label: '🏡 집' },
                      { color: '#F4956A', label: '🚶 외출' },
                      { color: C.red,  label: '📍 현재' },
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

            {/* 전체화면 버튼 */}
            {locData && locLogs.length > 0 && (
              <TouchableOpacity
                style={ss.fullMapBtn}
                onPress={() => navigation.navigate('LocationMap', {
                  logs: locLogs, seniorName,
                  totalDist: locData.total_distance_m,
                })}
                activeOpacity={0.8}>
                <Text style={ss.fullMapBtnTxt}>⛶  전체화면으로 보기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── AI 건강 분석 ── */}
          <View style={ss.card}>
            <View style={ss.aiHeader}>
              <Text style={ss.cardTitle}>🤖 AI 건강 분석</Text>
              {lastUpdate ? <Text style={ss.updateTime}>{lastUpdate} 업데이트</Text> : null}
            </View>
            {aiResult ? (
              <View style={[ss.aiResult, { backgroundColor: aiBg, borderColor: aiColor }]}>
                <Text style={[ss.aiResultTxt, { color: aiColor }]}>{aiResult.message}</Text>
              </View>
            ) : (
              <View style={ss.aiEmpty}>
                <Text style={ss.aiEmptyTxt}>
                  {alertLevel !== 'good' ? '이상이 감지됐어요. 분석을 눌러 확인하세요.' : '오늘 건강 상태를 AI가 분석합니다.'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={[ss.aiBtn, analyzing && { opacity: 0.6 }]}
              onPress={runAiAnalysis} disabled={analyzing} activeOpacity={0.8}>
              {analyzing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={ss.aiBtnTxt}>🔍 {aiResult ? '재분석' : '지금 분석하기'}</Text>}
            </TouchableOpacity>
          </View>

          {/* ── 오늘 활동 타임라인 ── */}
          <View style={ss.card}>
            <Text style={ss.cardTitle}>🕐 오늘 활동 기록</Text>
            {DEMO_TIMELINE.map((item, idx) => (
              <View key={idx} style={ss.tlRow}>
                <View style={ss.tlLeft}>
                  <Text style={ss.tlTime}>{item.time}</Text>
                  {idx < DEMO_TIMELINE.length-1 && <View style={ss.tlLine} />}
                </View>
                <View style={[ss.tlDot, {
                  backgroundColor:
                    item.type==='ok'      ? C.sage  :
                    item.type==='skipped' ? C.amber :
                    item.type==='pending' ? C.line  : C.red,
                }]} />
                <Text style={[ss.tlLabel,
                  item.type==='pending' && { color: C.sub },
                  item.type==='skipped' && { color: C.amber },
                ]}>
                  {item.icon} {item.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── 주간 복용 패턴 ── */}
          <View style={ss.card}>
            <TouchableOpacity style={ss.weeklyHeader}
              onPress={() => setShowWeekly(!showWeekly)} activeOpacity={0.7}>
              <Text style={ss.cardTitle}>📊 주간 복용 패턴</Text>
              <Text style={ss.chevron}>{showWeekly ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <View style={ss.chartRow}>
              {WEEKLY.map((d, i) => {
                const isToday = d.day==='오늘';
                const barColor = d.ok===false ? C.amber : isToday ? C.blue2 : C.sage;
                return (
                  <View key={i} style={ss.chartCol}>
                    <View style={ss.chartBarWrap}>
                      <View style={[ss.chartBar, { height:`${d.pct}%` as any, backgroundColor: barColor, opacity: isToday ? 1 : 0.7 }]} />
                    </View>
                    <Text style={[ss.chartDay, isToday && { color: C.blue2, fontWeight:'800' }]}>{d.day}</Text>
                    {d.ok===false && <Text style={{ fontSize:9 }}>⚠️</Text>}
                  </View>
                );
              })}
            </View>
            {showWeekly && <Text style={ss.weeklyNote}>이번 주 평균 복용률 78% · 수·목요일 누락 있었음</Text>}
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
                  paddingHorizontal: 18, paddingBottom: 16 },
  headerTop:    { flexDirection:'row', alignItems:'center', marginBottom: 14, gap: 10 },
  backBtn:      { width:36, height:36, alignItems:'center', justifyContent:'center' },
  backTxt:      { color:'#fff', fontSize:28, fontWeight:'300', lineHeight:32 },
  headerCenter: { flex: 1 },
  headerDate:   { fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:2 },
  headerName:   { fontSize:22, fontWeight:'800', color:'#fff', letterSpacing:-0.3 },
  sosBtn:       { width:40, height:40, borderRadius:20,
                  backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center' },
  sosTxt:       { fontSize:18 },
  headerBanner: { flexDirection:'row', alignItems:'center', borderRadius:16, borderWidth:1.5,
                  paddingHorizontal:14, paddingVertical:12, gap:10 },
  bannerIcon:   { fontSize:24 },
  bannerTitle:  { fontSize:14, fontWeight:'800', marginBottom:1 },
  bannerDesc:   { fontSize:12, opacity:0.8 },
  refreshBtn:   { width:32, height:32, alignItems:'center', justifyContent:'center' },
  refreshIcon:  { fontSize:20, color: C.sub },

  // 카드 공통
  card:      { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
               shadowColor:'#2272B8', shadowOpacity:0.08, shadowRadius:14,
               shadowOffset:{width:0,height:4}, elevation:3 },
  cardTitle: { fontSize:15, fontWeight:'800', color: C.text, marginBottom:12 },

  // 경고
  warnCard:  { backgroundColor: C.redLt, borderRadius:16, padding:16, marginBottom:14,
               borderWidth:1.5, borderColor: C.red },
  warnTitle: { fontSize:14, fontWeight:'800', color: C.red, marginBottom:10 },
  warnRow:   { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
  warnDot:   { width:7, height:7, borderRadius:4 },
  warnTxt:   { fontSize:13, color: C.text, flex:1 },

  // 복용
  pctRow:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:14 },
  barBg:     { flex:1, height:8, backgroundColor: C.line, borderRadius:4, overflow:'hidden' },
  barFill:   { height:8, borderRadius:4 },
  pctTxt:    { fontSize:14, fontWeight:'800', minWidth:36, textAlign:'right' },
  medRow:    { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' },
  medDot:    { width:10, height:10, borderRadius:5 },
  medName:   { fontSize:14, fontWeight:'700', color: C.text },
  medDosage: { fontSize:12, color: C.sub },
  medBadges: { flexDirection:'row', gap:6, flexWrap:'wrap', flex:1, justifyContent:'flex-end' },
  badge:     { borderRadius:10, paddingHorizontal:8, paddingVertical:3 },
  badgeTxt:  { fontSize:11, fontWeight:'700' },

  // 동선 카드
  locHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  actChip:      { borderRadius:12, paddingHorizontal:10, paddingVertical:4 },
  actChipTxt:   { fontSize:12, fontWeight:'700' },
  distTxt:      { fontSize:12, color: C.sub, marginBottom:12 },
  mapContainer: {
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: C.blueCard,
    position: 'relative',
  },
  legend:       { position:'absolute', bottom:8, left:8, flexDirection:'row', gap:10,
                  backgroundColor:'rgba(255,255,255,0.92)', borderRadius:10,
                  paddingHorizontal:10, paddingVertical:5 },
  legendItem:   { flexDirection:'row', alignItems:'center', gap:4 },
  legendDot:    { width:8, height:8, borderRadius:4 },
  legendTxt:    { fontSize:10, color: C.text, fontWeight:'600' },
  mapEmpty:     { height:140, alignItems:'center', justifyContent:'center', gap:8 },
  mapEmptyIcon: { fontSize:36 },
  mapEmptyTxt:  { fontSize:14, color: C.sub, fontWeight:'600' },
  mapEmptySub:  { fontSize:12, color:'#BABABA' },
  fullMapBtn:   { backgroundColor: C.blueCard, borderRadius:12, paddingVertical:11,
                  alignItems:'center' },
  fullMapBtnTxt:{ fontSize:13, fontWeight:'700', color: C.blue2 },

  // AI
  aiHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  updateTime:  { fontSize:11, color: C.sub },
  aiResult:    { borderRadius:14, borderWidth:1.5, padding:14, marginBottom:12 },
  aiResultTxt: { fontSize:14, fontWeight:'600', lineHeight:22 },
  aiEmpty:     { backgroundColor: C.blueCard, borderRadius:14, padding:14, marginBottom:12 },
  aiEmptyTxt:  { fontSize:13, color: C.sub, textAlign:'center' },
  aiBtn:       { borderRadius:14, paddingVertical:14, alignItems:'center', backgroundColor: C.blue2 },
  aiBtnTxt:    { color:'#fff', fontSize:14, fontWeight:'700' },

  // 타임라인
  tlRow:  { flexDirection:'row', alignItems:'flex-start', marginBottom:2 },
  tlLeft: { width:44, alignItems:'center' },
  tlTime: { fontSize:11, color: C.sub, fontWeight:'600', marginTop:2 },
  tlLine: { width:1, flex:1, minHeight:20, backgroundColor: C.line, marginTop:3 },
  tlDot:  { width:10, height:10, borderRadius:5, marginTop:3, marginHorizontal:8 },
  tlLabel:{ flex:1, fontSize:13, fontWeight:'500', color: C.text, paddingBottom:14 },

  // 주간 차트
  weeklyHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  chevron:      { fontSize:13, color: C.sub },
  chartRow:     { flexDirection:'row', alignItems:'flex-end', height:72, gap:4, marginBottom:6 },
  chartCol:     { flex:1, alignItems:'center', gap:3 },
  chartBarWrap: { flex:1, width:'100%', justifyContent:'flex-end', borderRadius:6, overflow:'hidden', backgroundColor: C.line },
  chartBar:     { width:'100%', borderRadius:6 },
  chartDay:     { fontSize:10, color: C.sub },
  weeklyNote:   { fontSize:12, color: C.sub, marginTop:8, lineHeight:18 },

  // 연락
  contactRow:   { flexDirection:'row', gap:10 },
  contactBtn:   { flex:1, alignItems:'center', paddingVertical:14, borderRadius:16, borderWidth:1.5, gap:5 },
  contactIcon:  { fontSize:22 },
  contactLabel: { fontSize:11, fontWeight:'700' },
});
