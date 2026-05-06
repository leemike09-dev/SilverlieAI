import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

const BACKEND = 'https://silverlieai.onrender.com';

const C = {
  bg: '#FDFAF6', card: '#FFFFFF', sage: '#6BAE8F',
  peach: '#F4956A', red: '#E05C5C', text: '#2C2C2C',
  sub: '#6A6A6A', line: '#E8E4DF', sky: '#4A90C8', navy: '#1A4A8A',
};

export default function LocationMapScreen({ route, navigation }: any) {
  const insets          = useSafeAreaInsets();
  const logs            = route?.params?.logs       || [];
  const seniorName      = route?.params?.seniorName || '';
  const totalDist       = route?.params?.totalDist  || 0;
  const userId          = route?.params?.userId     || '';
  const [fullscreen, setFullscreen] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!userId || userId === 'guest') return;
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
        setTimeout(() => webViewRef.current?.reload(), 2500);
      } catch {}
    })();
  }, [userId]);

  const distStr         = totalDist >= 1000 ? `${(totalDist / 1000).toFixed(1)}km` : `${totalDist}m`;
  const outdoorCount    = logs.filter((l: any) => l.activity === 'outdoor').length;
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
            <Text style={s.headerTitle} numberOfLines={1}>📍 {seniorName}님 오늘 동선</Text>
            <Text style={s.headerSub}>
              {distStr} 이동 · {logs.length}개 지점
            </Text>
          </View>
          <View style={[s.statusChip, { backgroundColor: isOutdoor ? '#FFF0E8' : '#EBF7F1' }]}>
            <Text style={[s.statusTxt, { color: isOutdoor ? C.peach : C.sage }]}>
              {isOutdoor ? '🚶 외출 중' : '🏡 귀가'}
            </Text>
          </View>
        </View>
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
        {/* 전체화면 토글 버튼 */}
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
              { val: distStr,           lbl: '총 이동거리', color: C.navy },
              { val: `${logs.length}곳`, lbl: '방문 지점',  color: C.sage },
              { val: `${outdoorCount}회`, lbl: '외출 횟수', color: C.peach },
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

          <View style={[s.legend, { paddingBottom: Math.max(insets.bottom + 8, 14) }]}>
            {[
              { color: C.sage,  label: '🏡 집 근처' },
              { color: C.peach, label: '🚶 외출 중' },
              { color: C.red,   label: '📍 현재 위치' },
            ].map(item => (
              <View key={item.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: item.color }]} />
                <Text style={s.legendTxt}>{item.label}</Text>
              </View>
            ))}
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

  fullBtn:     { position: 'absolute', bottom: 16, right: 14,
                 width: 40, height: 40,
                 backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
                 alignItems: 'center', justifyContent: 'center' },
  fullBtnTxt:  { color: '#fff', fontSize: 18, lineHeight: 22 },

  statsBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
                 backgroundColor: C.card, paddingVertical: 16,
                 borderTopWidth: 1.5, borderTopColor: C.line },
  statItem:    { alignItems: 'center', gap: 4, flex: 1 },
  statVal:     { fontSize: 26, fontWeight: '900' },
  statLbl:     { fontSize: 13, color: C.sub, fontWeight: '600' },
  statDiv:     { width: 1.5, height: 44, backgroundColor: C.line },

  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 18,
                 backgroundColor: C.card, paddingVertical: 10,
                 borderTopWidth: 1, borderTopColor: C.line },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 12, height: 12, borderRadius: 6 },
  legendTxt:   { fontSize: 13, color: C.sub, fontWeight: '600' },
});
