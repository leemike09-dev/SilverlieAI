import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { DEMO_MODE } from '../App';

const C = {
  bg:    '#FDFAF6', card:  '#FFFFFF', sage:  '#6BAE8F',
  peach: '#F4956A', red:   '#E05C5C', text:  '#2C2C2C',
  sub:   '#8A8A8A', line:  '#F0EDE8', sky:   '#6BA8C8',
};

// 데모용 서울 강남 동선
const DEMO_LOGS = [
  { lat: 37.4979, lng: 127.0276, activity: 'home',    address: '역삼동',   created_at: '2026-04-03T07:30:00Z' },
  { lat: 37.4985, lng: 127.0290, activity: 'outdoor', address: '역삼공원', created_at: '2026-04-03T09:10:00Z' },
  { lat: 37.5001, lng: 127.0310, activity: 'outdoor', address: '강남역 근처', created_at: '2026-04-03T09:45:00Z' },
  { lat: 37.4992, lng: 127.0295, activity: 'outdoor', address: '이마트',   created_at: '2026-04-03T10:20:00Z' },
  { lat: 37.4981, lng: 127.0280, activity: 'home',    address: '역삼동',   created_at: '2026-04-03T11:05:00Z' },
];

export default function LocationMapScreen({ route, navigation }: any) {
  const logs      = route?.params?.logs       || (DEMO_MODE ? DEMO_LOGS : []);
  const seniorName = route?.params?.seniorName || (DEMO_MODE ? '홍길동' : '');
  const totalDist  = route?.params?.totalDist  || (DEMO_MODE ? 1240 : 0);
  const mapRef    = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!logs.length) return;

    // Leaflet CSS 로드
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Leaflet JS 로드 후 지도 초기화
    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      // 기존 지도 인스턴스 제거
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = null;
      }

      const coords: [number, number][] = logs.map((l: any) => [l.lat, l.lng]);
      const center = coords[Math.floor(coords.length / 2)] || [37.5665, 126.9780];

      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 15);

      // 부드러운 지도 타일
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // 이동 경로 선
      L.polyline(coords, {
        color:     '#6BAE8F',
        weight:    5,
        opacity:   0.85,
        dashArray: '8, 4',
      }).addTo(map);

      logs.forEach((log: any, i: number) => {
        const t = new Date(log.created_at);
        const timeStr = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
        const isHome    = log.activity === 'home';
        const isLast    = i === logs.length - 1;
        const isFirst   = i === 0;

        if (isFirst) {
          // 집 마커 (큰 초록 원)
          L.circleMarker([log.lat, log.lng], {
            radius: 14, color: '#FFFFFF', fillColor: '#6BAE8F',
            weight: 3,  fillOpacity: 1,
          }).bindPopup(`<b>🏡 집 (출발)</b><br>${timeStr}`)
            .addTo(map);
        } else if (isLast) {
          // 현재 위치 (빨간 원 + 펄스)
          L.circleMarker([log.lat, log.lng], {
            radius: 12, color: '#FFFFFF', fillColor: '#E05C5C',
            weight: 3,  fillOpacity: 1,
          }).bindPopup(`<b>📍 현재 위치</b><br>${timeStr}${log.address ? '<br>' + log.address : ''}`)
            .addTo(map);
        } else {
          // 중간 이동 지점
          L.circleMarker([log.lat, log.lng], {
            radius: 8,
            color:       '#FFFFFF',
            fillColor:   isHome ? '#6BAE8F' : '#F4956A',
            weight:      2,
            fillOpacity: 0.9,
          }).bindPopup(
            `<b>${isHome ? '🏡 집 근처' : '🚶 외출 중'}</b><br>${timeStr}${log.address ? '<br>' + log.address : ''}`
          ).addTo(map);
        }
      });

      // 전체 경로가 보이도록 fit
      if (coords.length > 1) {
        map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [logs]);

  const distStr = totalDist >= 1000
    ? `${(totalDist / 1000).toFixed(1)}km`
    : `${totalDist}m`;

  const outdoorCount = logs.filter((l: any) => l.activity === 'outdoor').length;
  const currentActivity = logs.length > 0 ? logs[logs.length - 1].activity : 'unknown';

  return (
    <View style={s.root}>
      

      {/* 헤더 */}
      <View style={s.header}>
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

      {/* 지도 */}
      {Platform.OS === 'web' ? (
        <View style={s.mapWrap}>
          {/* @ts-ignore */}
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </View>
      ) : (
        <View style={s.nativeMsg}>
          <Text style={s.nativeMsgTxt}>🗺️</Text>
          <Text style={s.nativeMsgTitle}>지도는 앱에서 지원됩니다</Text>
          <Text style={s.nativeMsgSub}>네이티브 앱 설치 후 이용해 주세요</Text>
        </View>
      )}

      {/* 범례 */}
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
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                    paddingTop: Platform.OS === 'web' ? 16 : 50, paddingBottom: 12,
                    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 },
  backBtn:        { paddingVertical: 6, paddingHorizontal: 10 },
  backTxt:        { fontSize: 17, color: C.sky, fontWeight: '600' },
  headerCenter:   { flex: 1 },
  headerTitle:    { fontSize: 19, fontWeight: '800', color: C.text },
  headerSub:      { fontSize: 15, color: C.sub, marginTop: 2 },
  statusBadge:    { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:      { fontSize: 16, fontWeight: '700' },
  mapWrap:        { flex: 1 },
  nativeMsg:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  nativeMsgTxt:   { fontSize: 60 },
  nativeMsgTitle: { fontSize: 22, fontWeight: '700', color: C.text },
  nativeMsgSub:   { fontSize: 17, color: C.sub },
  legend:         { flexDirection: 'row', justifyContent: 'center', gap: 20,
                    backgroundColor: C.card, paddingVertical: 12,
                    borderTopWidth: 1, borderTopColor: C.line },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:      { width: 12, height: 12, borderRadius: 6 },
  legendTxt:      { fontSize: 15, color: C.sub, fontWeight: '600' },
});
