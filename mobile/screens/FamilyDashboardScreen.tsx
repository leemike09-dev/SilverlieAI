import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { DEMO_MODE } from '../App';

const API = 'https://silverlieai.onrender.com';

const C = {
  bg:      '#F0F6FB',
  card:    '#FFFFFF',
  sky:     '#6BA8C8',
  skyLt:   '#E8F4FB',
  skyDk:   '#4A87A8',
  sage:    '#6BAE8F',
  sageLt:  '#EAF5EF',
  peach:   '#F4956A',
  peachLt: '#FEF0E8',
  amber:   '#F5A623',
  amberLt: '#FEF6E7',
  red:     '#E05C5C',
  redLt:   '#FDEAEA',
  text:    '#1E2D3D',
  sub:     '#7A8FA0',
  line:    '#DDE8F0',
};

// 데모 데이터 (API 실패 시 fallback)
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

const DEMO_TIMELINE = [
  { time:'07:45', icon:'🌅', label:'기상 감지',         type:'ok'      },
  { time:'08:00', icon:'💊', label:'혈압약 복용 ✅',    type:'ok'      },
  { time:'08:00', icon:'💊', label:'당뇨약 복용 ✅',    type:'ok'      },
  { time:'09:30', icon:'🚶', label:'산책 출발',          type:'ok'      },
  { time:'10:20', icon:'🏠', label:'귀가 확인',          type:'ok'      },
  { time:'12:00', icon:'💊', label:'당뇨약 건너뜀 ⏭',  type:'skipped' },
  { time:'20:00', icon:'💊', label:'저녁 혈압약 (예정)', type:'pending' },
];

const WEEKLY = [
  { day:'월', pct:100, ok:true  },
  { day:'화', pct:75,  ok:true  },
  { day:'수', pct:100, ok:true  },
  { day:'목', pct:50,  ok:false },
  { day:'금', pct:100, ok:true  },
  { day:'토', pct:75,  ok:true  },
  { day:'오늘', pct:50, ok:null },
];

type AlertLevel = 'good' | 'warn' | 'danger';

const ALERT_CFG = {
  good:   { color: C.sage,  bg: C.sageLt,  border: C.sage,  icon: '✅', title: '이상 없음',     desc: '오늘도 잘 지내고 계세요!' },
  warn:   { color: C.amber, bg: C.amberLt, border: C.amber, icon: '⚠️', title: '확인 필요',     desc: '일부 복용이 누락됐어요' },
  danger: { color: C.red,   bg: C.redLt,   border: C.red,   icon: '🚨', title: '즉시 확인 필요', desc: '복용 누락 또는 이상 감지됨!' },
};

export default function FamilyDashboardScreen({ route, navigation }: any) {
  const userId     = route?.params?.userId     || (DEMO_MODE ? 'demo-user'   : '');
  const name       = route?.params?.name       || (DEMO_MODE ? '이순희'       : '');
  const seniorId   = route?.params?.seniorId   || (DEMO_MODE ? 'demo-senior' : '');
  const seniorName = route?.params?.seniorName || (DEMO_MODE ? '홍길동'       : '부모님');

  const [status,    setStatus]    = useState<any>(null);
  const [aiResult,  setAiResult]  = useState<{ level: string; message: string } | null>(null);
  const [locData,   setLocData]   = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing,setRefreshing]= useState(false);
  const [showPat,   setShowPat]   = useState(false);
  const [lastUpdate,setLastUpdate]= useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    startPulse();
    fetchStatus();
    // 2분마다 자동 갱신
    const timer = setInterval(fetchStatus, 120000);
    return () => clearInterval(timer);
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
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
        setLastUpdate(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
        // 오늘 동선 조회
        try {
          const lr = await fetch(`${API}/location/today/${seniorId}`);
          if (lr.ok) { const ld = await lr.json(); setLocData(ld); }
        } catch {}
        // 경고/위험 레벨이면 AI 자동 분석
        if (d.summary?.alert_level !== 'good') {
          autoAnalyze(d.summary);
        }
      } else {
        if (DEMO_MODE) setStatus(DEMO_STATUS);
      }
    } catch {
      if (DEMO_MODE) setStatus(DEMO_STATUS);
    } finally {
      setRefreshing(false);
    }
  }, [seniorId]);

  const autoAnalyze = async (summary: any) => {
    if (aiResult) return; // 이미 분석됨
    try {
      const r = await fetch(`${API}/anomaly/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senior_name: seniorName,
          med_taken: summary.taken,
          med_total: summary.total,
          steps: 2840,
          location_safe: true,
          last_active_hour: new Date().getHours(),
        }),
      });
      const d = await r.json();
      setAiResult(d);
    } catch {}
  };

  const runAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const sum = status?.summary || DEMO_STATUS.summary;
      const r = await fetch(`${API}/anomaly/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senior_name: seniorName,
          med_taken: sum.taken, med_total: sum.total,
          steps: 2840, location_safe: true,
          last_active_hour: new Date().getHours(),
        }),
      });
      const d = await r.json();
      setAiResult(d);
    } catch {
      setAiResult({ level: 'warn', message: `⚠️ 확인 필요\n${seniorName}님 오늘 복용 일부 누락\n직접 연락해 확인해보세요.` });
    } finally {
      setAnalyzing(false);
    }
  };

  const s = status || DEMO_STATUS;
  const summary: any     = s.summary || {};
  const meds: any[]      = s.medications || [];
  const logs: any[]      = s.today_logs  || [];
  const alertLevel: AlertLevel = summary.alert_level || 'good';
  const cfg = ALERT_CFG[alertLevel];
  const medPct  = summary.total > 0 ? summary.taken / summary.total : 0;
  const missed: any[] = summary.missed || [];
  const skipped: number = summary.skipped || 0;

  // 오늘 복용 상세 (약별)
  const medDetail = meds.map(med => {
    const medLogs = logs.filter((l: any) => l.medication_id === med.id);
    const takenCount   = medLogs.filter((l: any) => l.taken).length;
    const skippedCount = medLogs.filter((l: any) => l.status === 'skipped').length;
    return { ...med, takenCount, skippedCount, total: (med.times || []).length };
  });

  const aiLevelColor = aiResult
    ? aiResult.level === 'danger' ? C.red : aiResult.level === 'warn' ? C.amber : C.sage
    : C.sky;
  const aiLevelBg = aiResult
    ? aiResult.level === 'danger' ? C.redLt : aiResult.level === 'warn' ? C.amberLt : C.sageLt
    : C.skyLt;

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.skyDk} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* 헤더 */}
        <View style={ss.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn}>
            <Text style={ss.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ss.headerSub}>가족 모니터링</Text>
            <Text style={ss.headerName}>{seniorName}님</Text>
          </View>
          <View style={ss.headerRight}>
            {refreshing && <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />}
            {lastUpdate ? <Text style={ss.headerTime}>{lastUpdate} 갱신</Text> : null}
            <TouchableOpacity
              onPress={() => Alert.alert('긴급 연락', `${seniorName}님께 전화를 연결합니다`)}
              style={ss.sosBtn}>
              <Text style={ss.sosTxt}>📞 SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 종합 상태 배너 ── */}
          <View style={[ss.alertBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Animated.Text style={[ss.alertIcon,
              alertLevel === 'danger' && { transform: [{ scale: pulseAnim }] }]}>
              {cfg.icon}
            </Animated.Text>
            <View style={{ flex: 1 }}>
              <Text style={[ss.alertTitle, { color: cfg.color }]}>{cfg.title}</Text>
              <Text style={[ss.alertDesc, { color: cfg.color + 'CC' }]}>{cfg.desc}</Text>
            </View>
            <TouchableOpacity onPress={fetchStatus} style={ss.refreshBtn}>
              <Text style={{ fontSize: 18 }}>🔄</Text>
            </TouchableOpacity>
          </View>

          {/* ── 오늘 동선 ── */}
          <View style={ss.section}>
            <Text style={ss.sectionTitle}>📍 오늘 동선</Text>
            {!locData || locData.point_count === 0 ? (
              <View style={[ss.locEmpty]}>
                <Text style={ss.locEmptyTxt}>아직 위치 정보가 없어요</Text>
                <Text style={ss.locEmptySub}>{seniorName}님 앱을 열면 자동 기록됩니다</Text>
              </View>
            ) : (
              <View style={ss.locCard}>
                <View style={[ss.locStatusRow, {
                  backgroundColor: locData.current_activity === 'outdoor' ? C.peachLt : C.sageLt
                }]}>
                  <Text style={{fontSize:22}}>
                    {locData.current_activity === 'outdoor' ? '🚶' : locData.current_activity === 'home' ? '🏡' : '❓'}
                  </Text>
                  <Text style={[ss.locStatusTxt, {
                    color: locData.current_activity === 'outdoor' ? C.peach : C.sage
                  }]}>
                    {locData.current_activity === 'outdoor' ? '외출 중' : locData.current_activity === 'home' ? '집 근처' : '확인 중'}
                  </Text>
                  <Text style={ss.locDistTxt}>
                    {locData.total_distance_m >= 1000
                      ? `오늘 ${(locData.total_distance_m/1000).toFixed(1)}km 이동`
                      : `오늘 ${locData.total_distance_m}m 이동`}
                  </Text>
                </View>
                {(locData.logs || []).slice(-5).reverse().map((log: any, i: number) => {
                  const t = new Date(log.created_at);
                  const timeStr = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
                  const isOut = log.activity === 'outdoor';
                  return (
                    <View key={i} style={ss.locRow}>
                      <Text style={ss.locTime}>{timeStr}</Text>
                      <View style={[ss.locDotIcon, {backgroundColor: isOut ? C.peach : C.sage}]} />
                      <Text style={ss.locAct}>{isOut ? '🚶 외출' : '🏡 집 근처'}</Text>
                      {log.address ? <Text style={ss.locAddr} numberOfLines={1}>{log.address}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── 누락/건너뜀 경고 카드 ── */}
          {(missed.length > 0 || skipped > 0) && (
            <View style={ss.missedCard}>
              <Text style={ss.missedTitle}>⚠️ 복용 알림</Text>
              {missed.map((m: any, i: number) => (
                <View key={i} style={ss.missedRow}>
                  <View style={ss.missedDot} />
                  <Text style={ss.missedTxt}>
                    <Text style={{ fontWeight: '800' }}>{m.med_name}</Text>
                    {` ${m.time} 복용 기록 없음`}
                  </Text>
                </View>
              ))}
              {skipped > 0 && (
                <View style={ss.missedRow}>
                  <View style={[ss.missedDot, { backgroundColor: C.amber }]} />
                  <Text style={ss.missedTxt}>오늘 {skipped}번 건너뛰기 처리됨</Text>
                </View>
              )}
            </View>
          )}

          {/* ── 복용 현황 카드 ── */}
          <View style={ss.medStatusCard}>
            <Text style={ss.cardTitle}>💊 오늘 복용 현황</Text>

            {/* 전체 진행바 */}
            <View style={ss.medPctRow}>
              <View style={ss.medBarBg}>
                <View style={[ss.medBarFill, {
                  width: `${Math.round(medPct * 100)}%` as any,
                  backgroundColor: medPct >= 1 ? C.sage : medPct > 0.5 ? C.amber : C.red,
                }]} />
              </View>
              <Text style={[ss.medPctTxt, { color: medPct >= 1 ? C.sage : medPct > 0.5 ? C.amber : C.red }]}>
                {summary.taken}/{summary.total} ({summary.pct || 0}%)
              </Text>
            </View>

            {/* 약별 상세 */}
            {medDetail.map((med: any, i: number) => (
              <View key={i} style={ss.medDetailRow}>
                <View style={[ss.medDot, { backgroundColor: med.color }]} />
                <Text style={ss.medDetailName}>{med.name}</Text>
                <Text style={ss.medDetailDosage}>{med.dosage}</Text>
                <View style={ss.medDetailBadges}>
                  {[...(med.times || [])].map((t: string, j: number) => {
                    const log = logs.find((l: any) => l.medication_id === med.id && l.scheduled_time === t);
                    const st = log?.status;
                    return (
                      <View key={j} style={[
                        ss.timeBadge,
                        st === 'taken'   && { backgroundColor: C.sageLt },
                        st === 'skipped' && { backgroundColor: C.amberLt },
                        !st              && { backgroundColor: C.line },
                      ]}>
                        <Text style={[
                          ss.timeBadgeTxt,
                          st === 'taken'   && { color: C.sage  },
                          st === 'skipped' && { color: C.amber },
                          !st              && { color: C.sub   },
                        ]}>
                          {t}{st === 'taken' ? ' ✓' : st === 'skipped' ? ' ⏭' : ' ?'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* ── AI 이상감지 ── */}
          <View style={ss.aiCard}>
            <View style={ss.aiHeader}>
              <Text style={ss.aiTitle}>🤖 AI 이상감지 분석</Text>
              {alertLevel !== 'good' && !aiResult && (
                <View style={ss.aiAutoBadge}>
                  <Text style={ss.aiAutoTxt}>자동 분석 중</Text>
                </View>
              )}
            </View>

            {aiResult ? (
              <View style={[ss.aiResult, { backgroundColor: aiLevelBg, borderColor: aiLevelColor }]}>
                <Text style={[ss.aiResultTxt, { color: aiLevelColor }]}>{aiResult.message}</Text>
              </View>
            ) : (
              <View style={ss.aiPlaceholder}>
                <Text style={ss.aiPlaceholderTxt}>
                  {alertLevel !== 'good'
                    ? '이상 감지됨 — 분석 버튼을 눌러 자세히 확인하세요'
                    : '버튼을 누르면 AI가 종합 분석합니다'}
                </Text>
              </View>
            )}

            <TouchableOpacity style={[ss.aiBtn, analyzing && { opacity: 0.6 }]}
              onPress={runAiAnalysis} disabled={analyzing} activeOpacity={0.8}>
              {analyzing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={ss.aiBtnTxt}>🔍 {aiResult ? '재분석' : '지금 분석하기'}</Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── 위치 카드 ── */}
          <View style={ss.locationCard}>
            <View style={ss.locHeader}>
              <Text style={ss.cardTitle}>📍 현재 위치</Text>
              <View style={[ss.locBadge, { backgroundColor: C.sageLt }]}>
                <Text style={[ss.locBadgeTxt, { color: C.sage }]}>안전 구역</Text>
              </View>
            </View>
            <View style={ss.mapBox}>
              <View style={ss.mapBg}>
                {[...Array(4)].map((_,i) => <View key={i} style={[ss.mapLine, { top: `${25+i*20}%` as any }]} />)}
                {[...Array(5)].map((_,i) => <View key={i} style={[ss.mapLineV, { left: `${15+i*18}%` as any }]} />)}
                <View style={ss.mapRoadH} /><View style={ss.mapRoadV} />
                <Animated.View style={[ss.markerWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={ss.markerPulse} /><View style={ss.markerDot} />
                </Animated.View>
                <View style={ss.safeRadius} />
                <View style={ss.mapLabel}><Text style={ss.mapLabelTxt}>🏠 자택</Text></View>
              </View>
            </View>
            <Text style={ss.locName}>자택 (서울 서초구)</Text>
            <Text style={ss.locTime}>10분 전 · 반경 200m 이내</Text>
          </View>

          {/* ── 주간 패턴 ── */}
          <View style={ss.patternCard}>
            <TouchableOpacity style={ss.patternHeader} onPress={() => setShowPat(!showPat)}>
              <Text style={ss.cardTitle}>📊 주간 복용 패턴</Text>
              <Text style={ss.patternToggle}>{showPat ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <View style={ss.chartRow}>
              {WEEKLY.map((d, i) => {
                const isToday = d.day === '오늘';
                const barColor = d.ok === false ? C.amber : isToday ? C.sky : C.sage;
                return (
                  <View key={i} style={ss.chartCol}>
                    <View style={ss.chartBarWrap}>
                      <View style={[ss.chartBar, {
                        height: `${d.pct}%` as any,
                        backgroundColor: barColor,
                        opacity: isToday ? 1 : 0.65,
                      }]} />
                    </View>
                    <Text style={[ss.chartDay, isToday && { color: C.sky, fontWeight:'800' }]}>{d.day}</Text>
                    {d.ok === false && <Text style={{ fontSize: 9 }}>⚠️</Text>}
                  </View>
                );
              })}
            </View>
            {showPat && (
              <Text style={ss.patternNote}>
                이번 주 평균 복용률 78% · 목요일 복용 누락 있었음
              </Text>
            )}
          </View>

          {/* ── 오늘 타임라인 ── */}
          <View style={ss.timelineCard}>
            <Text style={ss.cardTitle}>오늘 활동 기록</Text>
            {DEMO_TIMELINE.map((item, idx) => (
              <View key={idx} style={ss.tlRow}>
                <View style={ss.tlLeft}>
                  <Text style={ss.tlTime}>{item.time}</Text>
                  {idx < DEMO_TIMELINE.length - 1 && <View style={ss.tlLine} />}
                </View>
                <View style={[ss.tlDot, {
                  backgroundColor: item.type === 'ok' ? C.sage
                    : item.type === 'skipped' ? C.amber
                    : item.type === 'pending' ? C.line : C.red,
                }]} />
                <Text style={[ss.tlLabel, item.type === 'pending' && { color: C.sub },
                  item.type === 'skipped' && { color: C.amber }]}>
                  {item.icon} {item.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── 빠른 연락 ── */}
          <View style={ss.contactCard}>
            <Text style={ss.cardTitle}>빠른 연락</Text>
            <View style={ss.contactRow}>
              {[
                { icon:'📞', label:'전화하기',   color: C.sage, bg: C.sageLt },
                { icon:'💬', label:'문자 보내기', color: C.sky,  bg: C.skyLt  },
                { icon:'🚨', label:'긴급 신고',   color: C.red,  bg: C.redLt  },
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

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },

  header:      { flexDirection:'row', alignItems:'center', backgroundColor: C.skyDk,
                 paddingHorizontal: 18,
                 paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8,
                 paddingBottom: 16, gap: 12 },
  backBtn:     { padding: 6 },
  backTxt:     { color:'#fff', fontSize:15, fontWeight:'600' },
  headerSub:   { fontSize:11, color:'rgba(255,255,255,0.65)', marginBottom:2 },
  headerName:  { fontSize:18, fontWeight:'800', color:'#fff' },
  headerRight: { alignItems:'flex-end', gap: 4 },
  headerTime:  { fontSize:10, color:'rgba(255,255,255,0.6)' },
  sosBtn:      { backgroundColor:'#FF4444', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  sosTxt:      { color:'#fff', fontSize:13, fontWeight:'800' },

  // 종합 배너
  alertBanner: { flexDirection:'row', alignItems:'center', borderRadius:18, borderWidth:2,
                 padding:16, gap:12, marginBottom:14, marginTop:4 },
  alertIcon:   { fontSize:32 },
  alertTitle:  { fontSize:16, fontWeight:'800', marginBottom:2 },
  alertDesc:   { fontSize:13 },
  refreshBtn:  { padding:6 },

  // 누락 경고
  missedCard:  { backgroundColor: C.redLt, borderRadius:16, padding:16, marginBottom:14,
                 borderWidth:1.5, borderColor: C.red },
  missedTitle: { fontSize:15, fontWeight:'800', color: C.red, marginBottom:10 },
  missedRow:   { flexDirection:'row', alignItems:'center', gap:10, marginBottom:6 },
  missedDot:   { width:8, height:8, borderRadius:4, backgroundColor: C.red },
  missedTxt:   { fontSize:14, color: C.text },

  // 복용 현황
  medStatusCard: { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
                   shadowColor:'#4A87A8', shadowOpacity:0.1, shadowRadius:12, elevation:3 },
  cardTitle:     { fontSize:16, fontWeight:'700', color: C.text, marginBottom:12 },
  medPctRow:     { flexDirection:'row', alignItems:'center', gap:10, marginBottom:14 },
  medBarBg:      { flex:1, height:8, backgroundColor: C.line, borderRadius:4 },
  medBarFill:    { height:8, borderRadius:4 },
  medPctTxt:     { fontSize:14, fontWeight:'800', minWidth:80 },
  medDetailRow:  { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' },
  medDot:        { width:10, height:10, borderRadius:5 },
  medDetailName: { fontSize:14, fontWeight:'700', color: C.text },
  medDetailDosage:{ fontSize:12, color: C.sub },
  medDetailBadges:{ flexDirection:'row', gap:6, flexWrap:'wrap', flex:1, justifyContent:'flex-end' },
  timeBadge:     { borderRadius:10, paddingHorizontal:8, paddingVertical:3 },
  timeBadgeTxt:  { fontSize:11, fontWeight:'700' },

  // AI 카드
  aiCard:         { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
                    shadowColor:'#4A87A8', shadowOpacity:0.12, shadowRadius:14, elevation:4 },
  aiHeader:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  aiTitle:        { fontSize:16, fontWeight:'800', color: C.text },
  aiAutoBadge:    { backgroundColor: C.amberLt, borderRadius:10, paddingHorizontal:10, paddingVertical:4 },
  aiAutoTxt:      { fontSize:11, color: C.amber, fontWeight:'700' },
  aiResult:       { borderRadius:14, borderWidth:1.5, padding:14, marginBottom:12 },
  aiResultTxt:    { fontSize:14, fontWeight:'600', lineHeight:22 },
  aiPlaceholder:  { backgroundColor: C.skyLt, borderRadius:14, padding:14, marginBottom:12 },
  aiPlaceholderTxt:{ fontSize:13, color: C.sub, textAlign:'center' },
  aiBtn:          { backgroundColor: C.sky, borderRadius:14, paddingVertical:14, alignItems:'center' },
  aiBtnTxt:       { color:'#fff', fontSize:15, fontWeight:'700' },

  // 위치
  locationCard: { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
                  shadowColor:'#4A87A8', shadowOpacity:0.1, shadowRadius:12, elevation:3 },
  locHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  locBadge:     { borderRadius:12, paddingHorizontal:12, paddingVertical:4 },
  locBadgeTxt:  { fontSize:12, fontWeight:'700' },
  mapBox:       { height:160, borderRadius:16, overflow:'hidden', marginBottom:12, backgroundColor:'#E8F0F8' },
  mapBg:        { flex:1, position:'relative' },
  mapLine:      { position:'absolute', left:0, right:0, height:1, backgroundColor:'#D0DCE8' },
  mapLineV:     { position:'absolute', top:0, bottom:0, width:1, backgroundColor:'#D0DCE8' },
  mapRoadH:     { position:'absolute', top:'45%', left:0, right:0, height:8, backgroundColor:'#fff', opacity:0.8 },
  mapRoadV:     { position:'absolute', left:'40%', top:0, bottom:0, width:8, backgroundColor:'#fff', opacity:0.8 },
  markerWrap:   { position:'absolute', top:'35%', left:'38%', alignItems:'center', justifyContent:'center' },
  markerPulse:  { position:'absolute', width:40, height:40, borderRadius:20, backgroundColor: C.sage, opacity:0.2 },
  markerDot:    { width:16, height:16, borderRadius:8, backgroundColor: C.sage, borderWidth:3, borderColor:'#fff' },
  safeRadius:   { position:'absolute', top:'18%', left:'26%', width:80, height:80, borderRadius:40,
                  borderWidth:2, borderColor: C.sage, borderStyle:'dashed', opacity:0.4 },
  mapLabel:     { position:'absolute', top:'60%', left:'43%', backgroundColor:'rgba(255,255,255,0.9)',
                  borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  mapLabelTxt:  { fontSize:11, fontWeight:'700', color: C.text },
  locName:      { fontSize:15, fontWeight:'700', color: C.text, marginBottom:4 },
  locTime:      { fontSize:12, color: C.sub },

  // 주간 패턴
  patternCard:   { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
                   shadowColor:'#4A87A8', shadowOpacity:0.08, shadowRadius:10, elevation:2 },
  patternHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  patternToggle: { fontSize:14, color: C.sub },
  chartRow:      { flexDirection:'row', alignItems:'flex-end', height:72, gap:4, marginBottom:6 },
  chartCol:      { flex:1, alignItems:'center', gap:3 },
  chartBarWrap:  { flex:1, width:'100%', justifyContent:'flex-end', borderRadius:6, overflow:'hidden', backgroundColor: C.line },
  chartBar:      { width:'100%', borderRadius:6 },
  chartDay:      { fontSize:10, color: C.sub },
  patternNote:   { fontSize:12, color: C.sub, marginTop:10, lineHeight:18 },

  // 타임라인
  timelineCard: { backgroundColor: C.card, borderRadius:20, padding:18, marginBottom:14,
                  shadowColor:'#4A87A8', shadowOpacity:0.08, shadowRadius:10, elevation:2 },
  tlRow:        { flexDirection:'row', alignItems:'flex-start', marginBottom:4 },
  tlLeft:       { width:46, alignItems:'center' },
  tlTime:       { fontSize:11, color: C.sub, fontWeight:'600', marginTop:2 },
  tlLine:       { width:1, flex:1, minHeight:22, backgroundColor: C.line, marginTop:4 },
  tlDot:        { width:10, height:10, borderRadius:5, marginTop:4, marginHorizontal:8 },
  tlLabel:      { flex:1, fontSize:13, fontWeight:'500', color: C.text, paddingBottom:16 },

  // 연락
  contactCard:  { backgroundColor: C.card, borderRadius:20, padding:18,
                  shadowColor:'#4A87A8', shadowOpacity:0.08, shadowRadius:10, elevation:2 },
  contactRow:   { flexDirection:'row', gap:10 },
  contactBtn:   { flex:1, alignItems:'center', paddingVertical:14, borderRadius:16, borderWidth:1.5, gap:5 },
  contactIcon:  { fontSize:22 },
  contactLabel: { fontSize:11, fontWeight:'700' },

  // 동선
  section:       { marginBottom: 20 },
  sectionTitle:  { fontSize:16, fontWeight:'700', color:C.text, marginBottom:12 },
  locEmpty:      { alignItems:'center', paddingVertical:24, backgroundColor:C.card, borderRadius:20 },
  locEmptyTxt:   { fontSize:15, color:C.sub, fontWeight:'600', marginBottom:4 },
  locEmptySub:   { fontSize:13, color:'#BABABA', textAlign:'center' },
  locCard:       { backgroundColor:C.card, borderRadius:20, overflow:'hidden' },
  locStatusRow:  { flexDirection:'row', alignItems:'center', padding:14, gap:10 },
  locStatusTxt:  { fontSize:15, fontWeight:'700', flex:1 },
  locDistTxt:    { fontSize:13, color:C.sub },
  locRow:        { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14,
                   paddingVertical:9, borderTopWidth:1, borderTopColor:C.line },
  locTime:       { fontSize:12, color:C.sub, width:38 },
  locDotIcon:    { width:9, height:9, borderRadius:5 },
  locAct:        { fontSize:13, fontWeight:'600', color:C.text, flex:1 },
  locAddr:       { fontSize:12, color:C.sub },
});
