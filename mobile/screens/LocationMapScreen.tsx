import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const APP_BG_TOP = '#F1ECE4';
const APP_BG_BOT = '#FBF8F3';
const GREEN     = '#3BA559';
const GREEN_DK  = '#1F7A3A';
const GREEN_BG  = '#E6F4E2';
const INK       = '#0F1B2D';
const INK_SOFT  = '#3D4B62';
const INK_MUTE  = '#7E8AA1';
const BACKEND   = 'https://silverlieai.onrender.com';

export default function LocationMapScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || '';
  const name   = route?.params?.name   || '';

  const [address,    setAddress]    = useState('위치 확인 중...');
  const [addrDetail, setAddrDetail] = useState('');
  const [homeSet,    setHomeSet]    = useState(false);
  const [settingHome, setSettingHome] = useState(false);
  const [sharingLoc,  setSharingLoc]  = useState(false);
  const [liveData,   setLiveData]   = useState<{ logs: any[]; total_distance_m: number; point_count: number }>({
    logs: [], total_distance_m: 0, point_count: 0,
  });
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!userId || userId === 'guest') return;
    AsyncStorage.getItem('home_set').then(v => { if (v === '1') setHomeSet(true); });
    fetchLocation();
    fetchStats();
  }, [userId]);

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 역지오코딩
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo.length > 0) {
        const g = geo[0];
        const city   = g.city || g.subregion || '';
        const dist   = g.district || g.subregion || '';
        const street = g.street || '';
        setAddress(`${city} ${dist}`.trim() || '위치 확인됨');
        setAddrDetail(street || '');
      }

      // AsyncStorage 저장 (가족 대시보드가 읽는 키와 동일)
      await AsyncStorage.setItem(
        `location.${userId}.current`,
        JSON.stringify({ lat, lng, address, updatedAt: new Date().toISOString() })
      );

      // 서버 업데이트
      await fetch(`${BACKEND}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lat, lng, activity: 'unknown' }),
      }).catch(() => {});
      setTimeout(() => { webViewRef.current?.reload(); fetchStats(); }, 2000);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const r = await fetch(`${BACKEND}/location/today/${userId}`);
      const d = await r.json();
      if (d.logs) setLiveData(d);
    } catch {}
  };

  const handleShareLocation = async () => {
    setSharingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('알림', '위치 권한이 필요합니다.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const addr = geo[0] ? `${geo[0].city || ''} ${geo[0].district || ''}`.trim() : '현재 위치';

      await AsyncStorage.setItem(
        `location.${userId}.current`,
        JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: addr, updatedAt: new Date().toISOString() })
      );
      await fetch(`${BACKEND}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lat: pos.coords.latitude, lng: pos.coords.longitude, activity: 'unknown', share: true }),
      }).catch(() => {});

      setAddress(addr);
      Alert.alert('완료', '가족에게 현재 위치를 알렸어요 📍');
      webViewRef.current?.reload();
      fetchStats();
    } catch {
      Alert.alert('오류', '위치를 가져오지 못했습니다.');
    } finally {
      setSharingLoc(false);
    }
  };

  const handleDirectionsHome = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const url = `kakaomap://route?sp=${pos.coords.latitude},${pos.coords.longitude}&ep=home&by=CAR`;
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://map.kakao.com/`).catch(() => {});
      }
    } catch {}
  };

  const handleSetHome = async () => {
    Alert.alert('🏡 집 위치 설정', '지금 계신 곳을 집으로 등록할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '설정', onPress: async () => {
        setSettingHome(true);
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const res = await fetch(`${BACKEND}/location/set-home`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          if (res.ok) {
            await AsyncStorage.setItem('home_set', '1');
            setHomeSet(true);
            Alert.alert('완료', '집 위치가 등록되었습니다!');
            webViewRef.current?.reload();
          }
        } catch {} finally { setSettingHome(false); }
      }},
    ]);
  };

  const logs     = liveData.logs;
  const mapUrl   = `${BACKEND}/location/map/${userId}`;
  const distStr  = liveData.total_distance_m >= 1000
    ? `${(liveData.total_distance_m / 1000).toFixed(1)}km`
    : `${liveData.total_distance_m}m`;

  return (
    <LinearGradient colors={[APP_BG_TOP, APP_BG_BOT]} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ── */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>내 위치</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* ── 지도 카드 (280px) ── */}
        <View style={s.mapCard}>
          <WebView
            ref={webViewRef}
            source={{ uri: mapUrl }}
            style={s.mapView}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
          />
          <View style={s.mapPinBubble}>
            <Text style={s.mapPinText}>지금 여기예요</Text>
          </View>
          {!homeSet && (
            <TouchableOpacity style={s.setHomeOverlay} onPress={handleSetHome} disabled={settingHome}>
              {settingHome
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.setHomeOverlayTxt}>🏡 집 위치 설정하기</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* ── 현재 위치 카드 ── */}
        <View style={s.addressCard}>
          <Text style={s.addressCaption}>현재 위치</Text>
          <Text style={s.addressMain} numberOfLines={1}>{address}</Text>
          {!!addrDetail && <Text style={s.addressDetail} numberOfLines={1}>{addrDetail}</Text>}
        </View>

        {/* ── 액션 버튼 2개 ── */}
        <View style={s.btnGroup}>
          <TouchableOpacity style={s.btnPrimary} onPress={handleShareLocation} disabled={sharingLoc}>
            {sharingLoc
              ? <ActivityIndicator color="#fff" />
              : <><Text style={s.btnPrimaryIcon}>🏠</Text><Text style={s.btnPrimaryTxt}>가족에게 내 위치 알리기</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={handleDirectionsHome}>
            <Text style={s.btnOutlineTxt}>집으로 가는 길 안내</Text>
          </TouchableOpacity>
        </View>

        {/* ── 오늘의 동선 ── */}
        {logs.length > 0 && (
          <View style={s.timelineCard}>
            <View style={s.timelineHeader}>
              <Text style={s.timelineTitle}>오늘의 동선</Text>
              <Text style={s.timelineSub}>{distStr} 이동 · {liveData.point_count}개 지점</Text>
            </View>
            {logs.slice(-6).reverse().map((log: any, idx: number) => {
              const isLatest = idx === 0;
              const t = new Date(log.recorded_at || log.timestamp || Date.now());
              const timeLabel = `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`;
              return (
                <View key={idx} style={s.timelineRow}>
                  <View style={[s.timelineDot, isLatest && s.timelineDotCurrent]} />
                  {idx < Math.min(logs.length, 6) - 1 && <View style={s.timelineLine} />}
                  <View style={s.timelineBody}>
                    <Text style={s.timelineTime}>{timeLabel}</Text>
                    <Text style={s.timelineLoc} numberOfLines={1}>
                      {log.activity === 'outdoor' ? '🚶 이동 중' : '🏡 집 근처'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
  },
  backBtn:     { paddingVertical: 6, paddingHorizontal: 2 },
  backTxt:     { fontSize: 18, fontWeight: '700', color: GREEN_DK },
  headerTitle: { fontSize: 26, fontWeight: '900', color: INK },

  mapCard: {
    marginHorizontal: 18, height: 280, borderRadius: 22, overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#1C3C6E', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  mapView: { flex: 1 },
  mapPinBubble: {
    position: 'absolute', top: 14, alignSelf: 'center',
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  mapPinText: { fontSize: 14, fontWeight: '800', color: GREEN_DK },
  setHomeOverlay: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
  },
  setHomeOverlayTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  addressCard: {
    marginHorizontal: 18, backgroundColor: '#fff', borderRadius: 18, padding: 18,
    marginBottom: 14,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  addressCaption: { fontSize: 13, fontWeight: '700', color: INK_MUTE, marginBottom: 6 },
  addressMain:    { fontSize: 26, fontWeight: '900', color: INK, marginBottom: 4 },
  addressDetail:  { fontSize: 16, fontWeight: '600', color: INK_SOFT },

  btnGroup:  { marginHorizontal: 18, gap: 12, marginBottom: 20 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: GREEN, borderRadius: 18, minHeight: 64, paddingHorizontal: 20,
  },
  btnPrimaryIcon: { fontSize: 22 },
  btnPrimaryTxt:  { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  btnOutline: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, minHeight: 64, borderWidth: 2, borderColor: GREEN, backgroundColor: '#fff',
  },
  btnOutlineTxt: { fontSize: 20, fontWeight: '800', color: GREEN_DK, letterSpacing: -0.3 },

  timelineCard: {
    marginHorizontal: 18, backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 },
  timelineTitle:  { fontSize: 18, fontWeight: '900', color: INK },
  timelineSub:    { fontSize: 13, fontWeight: '600', color: INK_MUTE },
  timelineRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10, position: 'relative' },
  timelineDot:    { width: 14, height: 14, borderRadius: 7, backgroundColor: INK_MUTE, marginTop: 4, flexShrink: 0 },
  timelineDotCurrent: { backgroundColor: '#E5453C', width: 16, height: 16, borderRadius: 8 },
  timelineLine: {
    position: 'absolute', left: 6, top: 18, width: 2, height: 20, backgroundColor: '#E5E7EB',
  },
  timelineBody: { flex: 1 },
  timelineTime: { fontSize: 14, fontWeight: '700', color: INK_MUTE, marginBottom: 2 },
  timelineLoc:  { fontSize: 17, fontWeight: '700', color: INK },
});
