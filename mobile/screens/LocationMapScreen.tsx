import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = 'https://silverlieai.onrender.com';

const C = {
  bg: '#FDFAF6', card: '#FFFFFF', sage: '#6BAE8F',
  peach: '#F4956A', red: '#E05C5C', text: '#2C2C2C',
  sub: '#6A6A6A', line: '#E8E4DF', sky: '#4A90C8', navy: '#1A4A8A',
};

export default function LocationMapScreen({ route, navigation }: any) {
  const insets      = useSafeAreaInsets();
  const userId      = route?.params?.userId     || '';
  const [fullscreen, setFullscreen] = useState(false);
  const [liveData,  setLiveData]    = useState<{logs: any[], total_distance_m: number, point_count: number}>({ logs: [], total_distance_m: 0, point_count: 0 });
  const [homeSet,   setHomeSet]     = useState(false);
  const [settingHome, setSettingHome] = useState(false);
  const webViewRef  = useRef<WebView>(null);

  const fetchStats = async () => {
    try {
      const r = await fetch(`${BACKEND}/location/today/${userId}`);
      const d = await r.json();
      if (d.logs) setLiveData(d);
    } catch {}
  };

  useEffect(() => {
    if (!userId || userId === 'guest') return;
    // 집 설정 여부 확인
    AsyncStorage.getItem('home_set').then(v => { if (v === '1') setHomeSet(true); });
    fetchStats();
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await fetch(`${BACKEND}/location/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            activity: 'unknown',
          }),
        });
        setTimeout(() => { webViewRef.current?.reload(); fetchStats(); }, 2500);
      } catch {}
    })();
  }, [userId]);

  const handleSetHome = async () => {
    Alert.alert(
      '🏡 집 위치 설정',
      '지금 계신 곳을 집으로 등록할까요?\n앞으로 이 위치를 기준으로 외출을 판단합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '집으로 설정', onPress: async () => {
            setSettingHome(true);
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('알림', '위치 권한이 필요합니다.'); return;
              }
              const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
              const res = await fetch(`${BACKEND}/location/set-home`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: userId,
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              });
              if (res.ok) {
                await AsyncStorage.setItem('home_set', '1');
                setHomeSet(true);
                // 집 설정 직후 위치를 즉시 재전송해서 home/outdoor 재평가
                await fetch(`${BACKEND}/location/update`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_id: userId,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    activity: 'unknown',
                    force: true,
                  }),
                });
                setTimeout(() => { webViewRef.current?.reload(); fetchStats(); }, 1500);
                Alert.alert('완료', '집 위치가 등록되었습니다!\n이제 외출/귀가가 정확하게 표시됩니다.');
              } else {
                Alert.alert('오류', '저장에 실패했습니다. 다시 시도해 주세요.');
              }
            } catch {
              Alert.alert('오류', '위치를 가져오지 못했습니다.');
            } finally {
              setSettingHome(false);
            }
          },
        },
      ],
    );
  };

  const logs            = liveData.logs;
  const totalDist       = liveData.total_distance_m;
  const distStr         = totalDist >= 1000 ? `${(totalDist / 1000).toFixed(1)}km` : `${totalDist}m`;
  const outdoorLogs     = logs.filter((l: any) => l.activity === 'outdoor');
  const currentActivity = logs.length > 0 ? logs[logs.length - 1].activity : 'unknown';
  const isOutdoor       = currentActivity === 'outdoor';

  const mapUrl = `${BACKEND}/location/map/${userId}`;

  return (
    <View style={s.root}>
      {/* 헤더 */}
      {!fullscreen && (
        <View style={[s.header, { paddingTop: Math.max(insets.top + 6, 20) }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>📍 오늘 동선</Text>
            <Text style={s.headerSub}>
              {distStr} 이동 · {liveData.point_count ?? outdoorLogs.length}개 지점
            </Text>
          </View>
          <View style={[s.statusChip, { backgroundColor: isOutdoor ? '#FFF0E8' : '#EBF7F1' }]}>
            <Text style={[s.statusTxt, { color: isOutdoor ? C.peach : C.sage }]}>
              {isOutdoor ? '🚶 외출 중' : '🏡 귀가'}
            </Text>
          </View>
        </View>
      )}

      {/* 집 미설정 안내 배너 */}
      {!homeSet && !fullscreen && (
        <TouchableOpacity style={s.homeBanner} onPress={handleSetHome} activeOpacity={0.85}>
          <Text style={s.homeBannerTxt}>🏡 집 위치를 먼저 설정해 주세요 — 외출/귀가를 정확히 표시합니다</Text>
          <Text style={s.homeBannerBtn}>설정 →</Text>
        </TouchableOpacity>
      )}

      {/* 지도 */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: mapUrl }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
        <TouchableOpacity
          style={[s.fullBtn, fullscreen && { top: Math.max(insets.top + 10, 20), bottom: undefined }]}
          onPress={() => setFullscreen(v => !v)}
        >
          <Text style={s.fullBtnTxt}>{fullscreen ? '✕' : '⛶'}</Text>
        </TouchableOpacity>
      </View>

      {/* 통계바 */}
      {!fullscreen && (
        <>
          <View style={s.statsBar}>
            {[
              { val: distStr,                                           lbl: '총 이동거리', color: C.navy },
              { val: `${liveData.point_count ?? outdoorLogs.length}곳`, lbl: '방문 지점',  color: C.sage },
              { val: `${isOutdoor ? '외출 중' : '귀가'}`,               lbl: '현재 상태',  color: isOutdoor ? C.peach : C.sage },
            ].map((item, i, arr) => (
              <React.Fragment key={item.lbl}>
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: item.color }]}>{item.val}</Text>
                  <Text style={s.statLbl}>{item.lbl}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.statDiv} />}
              </React.Fragment>
            ))}
          </View>

          <View style={[s.legend, { paddingBottom: Math.max(insets.bottom + 4, 10) }]}>
            <View style={s.legendRow}>
              <Text style={s.legendTitle}>범례</Text>
              {[
                { color: C.sage,  label: '🏡 우리 집' },
                { color: C.peach, label: '🚶 이동 경유지' },
                { color: C.red,   label: '📍 현재 위치' },
              ].map(item => (
                <View key={item.label} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: item.color }]} />
                  <Text style={s.legendTxt}>{item.label}</Text>
                </View>
              ))}
            </View>
            {/* 집 설정 버튼 */}
            <TouchableOpacity style={s.setHomeBtn} onPress={handleSetHome} disabled={settingHome} activeOpacity={0.85}>
              {settingHome
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.setHomeBtnTxt}>{homeSet ? '🏡 집 위치 변경' : '🏡 집 위치 설정'}</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
                 paddingBottom: 10, backgroundColor: C.card, gap: 8,
                 borderBottomWidth: 1.5, borderBottomColor: C.line },
  backBtn:     { paddingVertical: 6, paddingHorizontal: 8 },
  backTxt:     { fontSize: 17, color: C.sky, fontWeight: '700' },
  headerCenter:{ flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: C.text },
  headerSub:   { fontSize: 13, color: C.sub, marginTop: 2 },
  statusChip:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:   { fontSize: 14, fontWeight: '800' },

  homeBanner: {
    backgroundColor: '#FFF3CD', paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  homeBannerTxt: { fontSize: 13, color: '#7A5800', fontWeight: '600', flex: 1 },
  homeBannerBtn: { fontSize: 14, color: '#7A5800', fontWeight: '800', marginLeft: 8 },

  fullBtn:     { position: 'absolute', bottom: 16, right: 14,
                 width: 40, height: 40,
                 backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
                 alignItems: 'center', justifyContent: 'center' },
  fullBtnTxt:  { color: '#fff', fontSize: 18, lineHeight: 22 },

  statsBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
                 backgroundColor: C.card, paddingVertical: 16,
                 borderTopWidth: 1.5, borderTopColor: C.line },
  statItem:    { alignItems: 'center', gap: 4, flex: 1 },
  statVal:     { fontSize: 22, fontWeight: '900' },
  statLbl:     { fontSize: 13, color: C.sub, fontWeight: '600' },
  statDiv:     { width: 1.5, height: 44, backgroundColor: C.line },

  legend:      { backgroundColor: C.card, paddingVertical: 8, paddingHorizontal: 12,
                 borderTopWidth: 1, borderTopColor: C.line, gap: 8 },
  legendRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                 gap: 14, flexWrap: 'wrap' },
  legendTitle: { fontSize: 12, color: C.sub, fontWeight: '700' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 11, height: 11, borderRadius: 6 },
  legendTxt:   { fontSize: 12, color: C.sub, fontWeight: '600' },

  setHomeBtn:  {
    backgroundColor: C.sage, borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
  },
  setHomeBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
