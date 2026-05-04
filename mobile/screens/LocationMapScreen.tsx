import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  bg:    '#FDFAF6', card:  '#FFFFFF', sage:  '#6BAE8F',
  peach: '#F4956A', red:   '#E05C5C', text:  '#2C2C2C',
  sub:   '#8A8A8A', line:  '#F0EDE8', sky:   '#6BA8C8',
};

function buildMapHtml(logs: any[]) {
  const coords = logs.map((l: any) => ({
    lat: l.lat, lng: l.lng,
    activity: l.activity,
    created_at: l.created_at,
    address: (l.address || '').replace(/'/g, "\\'"),
  }));

  const centerLat = coords.length > 0 ? coords[Math.floor(coords.length / 2)].lat : 37.5665;
  const centerLng = coords.length > 0 ? coords[Math.floor(coords.length / 2)].lng : 126.9780;

  const markersJs = coords.map((c, i) => {
    const isFirst = i === 0;
    const isLast  = i === coords.length - 1;
    const color   = isFirst ? '#6BAE8F' : isLast ? '#E05C5C' : (c.activity === 'home' ? '#6BAE8F' : '#F4956A');
    const label   = isFirst ? '🏡' : isLast ? '📍' : '🚶';
    return `
      L.circleMarker([${c.lat}, ${c.lng}], {
        radius: ${isFirst || isLast ? 12 : 8},
        color: '#fff', fillColor: '${color}', weight: 2.5, fillOpacity: 1
      }).bindPopup('<b>${label}</b>${c.address ? '<br>' + c.address : ''}').addTo(map);`;
  }).join('\n');

  const pathJs = coords.length > 1
    ? `L.polyline([${coords.map(c => `[${c.lat},${c.lng}]`).join(',')}], {
        color:'#6BAE8F', weight:5, opacity:0.85, dashArray:'8,4'
       }).addTo(map);
       map.fitBounds([[${Math.min(...coords.map(c=>c.lat))},${Math.min(...coords.map(c=>c.lng))}],[${Math.max(...coords.map(c=>c.lat))},${Math.max(...coords.map(c=>c.lng))}]], {padding:[40,40]});`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* {margin:0;padding:0;} html,body,#map {width:100%;height:100%;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${centerLat},${centerLng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    ${markersJs}
    ${pathJs}
  </script>
</body>
</html>`;
}

export default function LocationMapScreen({ route, navigation }: any) {
  const insets     = useSafeAreaInsets();
  const logs       = route?.params?.logs       || [];
  const seniorName = route?.params?.seniorName || '';
  const totalDist  = route?.params?.totalDist  || 0;

  const mapHtml = useMemo(() => buildMapHtml(logs), [logs]);

  const distStr      = totalDist >= 1000 ? `${(totalDist / 1000).toFixed(1)}km` : `${totalDist}m`;
  const outdoorCount = logs.filter((l: any) => l.activity === 'outdoor').length;
  const currentActivity = logs.length > 0 ? logs[logs.length - 1].activity : 'unknown';

  const MapView = (
    <WebView
      source={{ html: mapHtml }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
    />
  );

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

      <View style={{ flex: 1 }}>{MapView}</View>

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
