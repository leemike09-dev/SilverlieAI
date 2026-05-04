import React, { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  bg:    '#FDFAF6', card:  '#FFFFFF', sage:  '#6BAE8F',
  peach: '#F4956A', red:   '#E05C5C', text:  '#2C2C2C',
  sub:   '#8A8A8A', line:  '#F0EDE8', sky:   '#6BA8C8',
};

const KAKAO_MAP_URL = 'https://leemike09-dev.github.io/SilverlieAI/kakao-map.html';

export default function LocationMapScreen({ route, navigation }: any) {
  const insets     = useSafeAreaInsets();
  const logs       = route?.params?.logs       || [];
  const seniorName = route?.params?.seniorName || '';
  const totalDist  = route?.params?.totalDist  || 0;
  const webViewRef = useRef<WebView>(null);

  const distStr      = totalDist >= 1000 ? `${(totalDist / 1000).toFixed(1)}km` : `${totalDist}m`;
  const outdoorCount = logs.filter((l: any) => l.activity === 'outdoor').length;
  const currentActivity = logs.length > 0 ? logs[logs.length - 1].activity : 'unknown';

  const safeLogsJson = useMemo(() => {
    const safe = logs.map((l: any) => ({
      lat: l.lat,
      lng: l.lng,
      activity: l.activity,
      created_at: l.created_at,
      address: (l.address || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"),
    }));
    return JSON.stringify(safe);
  }, [logs]);

  const handleLoadEnd = () => {
    webViewRef.current?.injectJavaScript(
      `window.initMap(${safeLogsJson}); true;`
    );
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>← 돌아가기</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>📍 {seniorName}님 오늘 동선</Text>
          <Text style={s.headerSub}>총 {distStr} 이동 · {logs.length}개 지점</Text>
        </View>
        <View style={s.statusBadge}>
          <Text style={[s.statusTxt, { color: currentActivity === 'outdoor' ? C.peach : C.sage }]}>
            {currentActivity === 'outdoor' ? '🚶 외출' : '🏡 귀가'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: KAKAO_MAP_URL }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onLoadEnd={handleLoadEnd}
        />
      </View>

      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statVal}>{distStr}</Text>
          <Text style={s.statLbl}>총 이동거리</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statVal}>{logs.length}곳</Text>
          <Text style={s.statLbl}>방문 지점</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statVal}>{outdoorCount}회</Text>
          <Text style={s.statLbl}>외출 횟수</Text>
        </View>
      </View>

      <View style={s.legend}>
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
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                    paddingBottom: 8, backgroundColor: C.card,
                    borderBottomWidth: 1, borderBottomColor: C.line, gap: 8 },
  backBtn:        { paddingVertical: 6, paddingHorizontal: 10 },
  backTxt:        { fontSize: 20, color: C.sky, fontWeight: '700' },
  headerCenter:   { flex: 1 },
  headerTitle:    { fontSize: 22, fontWeight: '900', color: C.text },
  headerSub:      { fontSize: 16, color: C.sub, marginTop: 3 },
  statusBadge:    { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  statusTxt:      { fontSize: 20, fontWeight: '800' },
  statsBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
                    backgroundColor: C.card, paddingVertical: 14,
                    borderTopWidth: 1, borderTopColor: C.line },
  statItem:       { alignItems: 'center', gap: 4 },
  statVal:        { fontSize: 28, fontWeight: '900', color: C.text },
  statLbl:        { fontSize: 16, color: C.sub },
  statDiv:        { width: 1, height: 40, backgroundColor: C.line },
  legend:         { flexDirection: 'row', justifyContent: 'center', gap: 20,
                    backgroundColor: C.card, paddingVertical: 12,
                    borderTopWidth: 1, borderTopColor: C.line },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot:      { width: 14, height: 14, borderRadius: 7 },
  legendTxt:      { fontSize: 20, color: C.sub, fontWeight: '600' },
});
