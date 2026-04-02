import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, Alert, ActivityIndicator,
} from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';
const HealthConnect: any = null; // EAS 네이티브 빌드 시 연동

type Props = { route: any; navigation: any };

type SyncResult = {
  steps?: number;
  heart_rate?: number;
  systolic?: number;
  diastolic?: number;
  blood_sugar?: number;
  syncedAt: string;
};

const DEVICES = [
  { icon: '⌚', name: 'Apple Watch',     platform: 'ios',     desc: 'HealthKit 연동', color: '#1a3a5c' },
  { icon: '📱', name: 'Samsung Health',  platform: 'android', desc: 'Health Connect 연동', color: '#1a3a1a' },
  { icon: '🏃', name: 'Google Fit',      platform: 'android', desc: 'Google Health Connect', color: '#1a2a3a' },
  { icon: '💪', name: 'Fitbit',          platform: 'both',    desc: '곧 지원 예정', color: '#2a1a1a' },
];

const DATA_TYPES = [
  { icon: '🚶', label: '걸음수',   key: 'steps',        unit: '보' },
  { icon: '💓', label: '심박수',   key: 'heart_rate',   unit: 'bpm' },
  { icon: '💗', label: '혈압',     key: 'blood_pressure', unit: '' },
  { icon: '🩸', label: '혈당',     key: 'blood_sugar',  unit: 'mg' },
];

export default function WearableScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [connected, setConnected] = useState<string | null>(null);
  const [syncing, setSyncing]     = useState(false);
  const [lastSync, setLastSync]   = useState<SyncResult | null>(null);

  const isAndroid = Platform.OS === 'android';
  const isIOS     = Platform.OS === 'ios';

  const handleConnect = (device: typeof DEVICES[0]) => {
    if (device.desc.includes('예정')) {
      Alert.alert('준비 중', '곧 지원될 예정입니다.');
      return;
    }
    if (device.platform === 'ios' && !isIOS && Platform.OS !== 'web') {
      Alert.alert('', 'Apple Watch는 iPhone에서만 연결 가능합니다.');
      return;
    }
    Alert.alert(
      `${device.name} 연결`,
      '연결하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '연결', onPress: () => setConnected(device.name) },
      ]
    );
  };

  const handleSync = async () => {
    if (!connected) {
      Alert.alert('', '먼저 기기를 연결해주세요.');
      return;
    }
    setSyncing(true);
    // 데모 데이터 (실제는 HealthConnect API)
    await new Promise(r => setTimeout(r, 1500));
    const demo: SyncResult = {
      steps: 6240,
      heart_rate: 72,
      systolic: 118,
      diastolic: 78,
      blood_sugar: 98,
      syncedAt: new Date().toISOString(),
    };
    setLastSync(demo);
    // 백엔드 저장
    try {
      await fetch(`${API_URL}/health/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          steps: demo.steps,
          heart_rate: demo.heart_rate,
          blood_pressure: `${demo.systolic}/${demo.diastolic}`,
          blood_sugar: demo.blood_sugar,
        }),
      });
    } catch {}
    setSyncing(false);
  };

  const getVal = (key: string): string => {
    if (!lastSync) return '—';
    if (key === 'steps') return lastSync.steps ? lastSync.steps.toLocaleString() : '—';
    if (key === 'heart_rate') return lastSync.heart_rate ? `${lastSync.heart_rate}` : '—';
    if (key === 'blood_pressure') return (lastSync.systolic && lastSync.diastolic) ? `${lastSync.systolic}/${lastSync.diastolic}` : '—';
    if (key === 'blood_sugar') return lastSync.blood_sugar ? `${lastSync.blood_sugar}` : '—';
    return '—';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← 내 정보</Text>
        </TouchableOpacity>
        <Text style={styles.title}>웨어러블 연결</Text>
        <Text style={styles.sub}>건강 기기 자동 동기화</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* 연결 상태 배너 */}
        <View style={[styles.statusBanner, connected ? styles.statusOn : styles.statusOff]}>
          <Text style={styles.statusIcon}>{connected ? '✅' : '📡'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {connected ? `${connected} 연결됨` : '기기 미연결'}
            </Text>
            <Text style={styles.statusSub}>
              {connected ? '자동 동기화 준비 완료' : '아래에서 기기를 선택하세요'}
            </Text>
          </View>
          {connected && (
            <TouchableOpacity onPress={() => { setConnected(null); setLastSync(null); }}>
              <Text style={styles.disconnectBtn}>해제</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 기기 선택 */}
        <View style={styles.aiTag}><Text style={styles.aiTagTxt}>SUPPORTED DEVICES</Text></View>
        {DEVICES.map((d, i) => {
          const isConn = connected === d.name;
          const comingSoon = d.desc.includes('예정');
          return (
            <TouchableOpacity key={i} style={[styles.deviceCard, isConn && styles.deviceCardOn]}
              onPress={() => handleConnect(d)} activeOpacity={0.8}>
              <View style={[styles.deviceIcon, { backgroundColor: d.color }]}>
                <Text style={{ fontSize: 22 }}>{d.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{d.name}</Text>
                <Text style={styles.deviceDesc}>{d.desc}</Text>
              </View>
              {isConn
                ? <View style={styles.connBadge}><Text style={styles.connBadgeTxt}>연결됨</Text></View>
                : comingSoon
                ? <View style={styles.soonBadge}><Text style={styles.soonBadgeTxt}>준비중</Text></View>
                : <Text style={styles.deviceArrow}>›</Text>
              }
            </TouchableOpacity>
          );
        })}

        {/* 동기화 버튼 */}
        <TouchableOpacity style={[styles.syncBtn, !connected && styles.syncBtnOff]}
          onPress={handleSync} disabled={!connected || syncing}>
          {syncing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.syncBtnTxt}>🔄 지금 동기화</Text>
          }
        </TouchableOpacity>

        {/* 마지막 동기화 데이터 */}
        {lastSync && (
          <View style={styles.dataBox}>
            <View style={styles.aiTag2}>
              <Text style={styles.aiTagTxt}>LAST SYNC — {new Date(lastSync.syncedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <View style={styles.dataGrid}>
              {DATA_TYPES.map(dt => (
                <View key={dt.key} style={styles.dataCard}>
                  <Text style={styles.dataIcon}>{dt.icon}</Text>
                  <Text style={styles.dataVal}>{getVal(dt.key)}</Text>
                  {dt.unit ? <Text style={styles.dataUnit}>{dt.unit}</Text> : null}
                  <Text style={styles.dataLbl}>{dt.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn}
              onPress={() => Alert.alert('저장 완료', '건강 기록에 저장됐습니다.')}>
              <Text style={styles.saveBtnTxt}>💾 건강 기록에 저장</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 안내 */}
        <View style={styles.infoBox}>
          <View style={styles.aiTag2}><Text style={styles.aiTagTxt}>HOW IT WORKS</Text></View>
          {[
            '기기를 연결하면 매일 자동으로 건강 데이터를 가져옵니다',
            'Apple Watch는 HealthKit, Android는 Health Connect를 통해 연동됩니다',
            '데이터는 AI 분석 및 주간 리포트에 자동 반영됩니다',
          ].map((txt, i) => (
            <View key={i} style={styles.infoItem}>
              <View style={styles.infoDot} />
              <Text style={styles.infoTxt}>{txt}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      
  {/* ── 탭바 ── */}
  <View style={{flexDirection:'row', backgroundColor:'#FFFFFF', borderTopWidth:1, borderTopColor:'#F0EDE8', paddingTop:10, paddingBottom:14}}>
    {[
      {{ icon:'🏠', lbl:'오늘',    screen:'SeniorHome', active: 'home' === 'home' }},
      {{ icon:'💊', lbl:'내 약',   screen:'Medication',  active: 'home' === 'med'  }},
      {{ icon:'🤖', lbl:'AI 상담', screen:'AIChat',      active: 'home' === 'ai'   }},
      {{ icon:'👤', lbl:'내 정보', screen:'Settings',    active: 'home' === 'info' }},
    ].map(tab => (
      <TouchableOpacity key={{tab.lbl}} style={{flex:1, alignItems:'center', gap:3}}
        onPress={() => !tab.active && tab.screen && navigation.navigate(tab.screen, {{ userId, name }})}
        activeOpacity={{0.7}}>
        <Text style={{fontSize:22, opacity: tab.active ? 1 : 0.3}}>{tab.icon}</Text>
        <Text style={{fontSize:10, color: tab.active ? '#6BAE8F' : '#8A8A8A', fontWeight: tab.active ? '700' : '500'}}>{tab.lbl}</Text>
        {tab.active && <View style={{width:4,height:4,borderRadius:2,backgroundColor:'#6BAE8F',marginTop:1}} />}
      </TouchableOpacity>
    ))}
  </View>
    </SafeAreaView>
  );
}

const BG = '#0a1628'; const CARD = '#0e1e35'; const BORDER = '#1a2a3a';
const BLUE = '#1565c0'; const ACCENT = '#4fc3f7';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, padding: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  back:   { fontSize: 12, color: ACCENT, marginBottom: 8 },
  title:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  sub:    { fontSize: 11, color: '#607d8b', marginTop: 3 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  statusOn:     { backgroundColor: '#0d3b1a' },
  statusOff:    { backgroundColor: CARD },
  statusIcon:   { fontSize: 24 },
  statusTitle:  { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  statusSub:    { fontSize: 11, color: '#607d8b' },
  disconnectBtn:{ color: '#ef5350', fontSize: 12, fontWeight: '700' },

  aiTag:    { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  aiTag2:   { marginBottom: 12 },
  aiTagTxt: { color: ACCENT, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  deviceCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 14,
                  marginBottom: 8, backgroundColor: CARD, borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: BORDER },
  deviceCardOn: { borderColor: BLUE, backgroundColor: '#0d1e35' },
  deviceIcon:   { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  deviceName:   { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3 },
  deviceDesc:   { fontSize: 11, color: '#607d8b' },
  connBadge:    { backgroundColor: '#0d3b1a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  connBadgeTxt: { color: '#69f0ae', fontSize: 11, fontWeight: '700' },
  soonBadge:    { backgroundColor: '#1a1a2a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  soonBadgeTxt: { color: '#546e7a', fontSize: 11, fontWeight: '600' },
  deviceArrow:  { color: BORDER, fontSize: 22 },

  syncBtn:    { margin: 18, backgroundColor: BLUE, borderRadius: 14, padding: 16, alignItems: 'center' },
  syncBtnOff: { backgroundColor: '#1a2a3a' },
  syncBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

  dataBox:  { marginHorizontal: 14, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  dataCard: { width: '47%', backgroundColor: '#1a2a3a', borderRadius: 10, padding: 12, alignItems: 'center' },
  dataIcon: { fontSize: 20, marginBottom: 4 },
  dataVal:  { fontSize: 16, fontWeight: '800', color: ACCENT },
  dataUnit: { fontSize: 9, color: '#607d8b', marginTop: 1 },
  dataLbl:  { fontSize: 10, color: '#546e7a', marginTop: 3 },
  saveBtn:    { backgroundColor: BLUE, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  infoBox:  { marginHorizontal: 14, marginBottom: 14, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  infoItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  infoDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginTop: 5, flexShrink: 0 },
  infoTxt:  { flex: 1, fontSize: 12, color: '#b0bec5', lineHeight: 18 },
});
