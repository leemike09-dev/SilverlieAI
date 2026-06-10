import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Lumi from '../components/Lumi';

const API = 'https://silverlieai.onrender.com';
const INK = '#0F1B2D';
const INK_SOFT = '#3D4B62';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function condGlyph(type: string) {
  if (type === 'clear') return '☀️';
  if (type === 'cloud') return '☁️';
  return '🌧️';
}

function condGradient(type: string): [string, string] {
  if (type === 'clear') return ['#4FA3E0', '#F9C74F'];
  if (type === 'cloud') return ['#8A9BB0', '#BDC8D5'];
  return ['#1A4A8A', '#3B6FBF'];
}

function condAdvice(type: string, rainProb?: number | null): { headline: string; action: string; color: string } {
  if (type === 'rain') {
    const prob = rainProb ? ` (강수 확률 ${rainProb}%)` : '';
    return { headline: `비가 올 수 있어요${prob}`, action: '외출하실 때 우산 꼭 챙기세요 ☔', color: '#3B82F6' };
  }
  if (type === 'cloud') {
    return { headline: '종일 흐릴 것 같아요', action: '나들이는 무난해요 🌥️', color: '#6B7280' };
  }
  return { headline: '오늘 날씨가 맑아요', action: '산책하기 딱 좋은 날이에요 🌤️', color: '#3BA559' };
}

function lumiComment(type: string): string {
  if (type === 'rain') return '비가 와요. 길이 미끄러우니 천천히 다녀오세요 💙';
  if (type === 'cloud') return '흐린 날씨예요. 따뜻하게 입고 나가세요 🌿';
  return '맑은 날이에요! 가볍게 바람 쐬러 나가보세요 😊';
}

function dayLabel(dateStr: string, idx: number): string {
  const d = new Date(dateStr);
  if (idx === 0) return '오늘';
  if (idx === 1) return `내일(${DAYS[d.getDay()]})`;
  return `모레(${DAYS[d.getDay()]})`;
}

function rowAdvice(type: string, isTravel: boolean): string {
  if (type === 'rain') return isTravel ? '🧳 우산과 비옷 챙기세요' : '☂️ 우산 꼭 챙기세요';
  if (type === 'cloud') return isTravel ? '🧳 가벼운 겉옷 챙기세요' : '🌥️ 가벼운 겉옷 추천';
  return isTravel ? '🧳 햇볕 가릴 모자 챙기세요' : '🌤️ 나들이하기 좋아요';
}

export default function WeatherScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId = '', name = '' } = route?.params ?? {};
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let lat = 37.5665, lng = 126.9780;
        const cached = await AsyncStorage.getItem(`location.${userId}.current`);
        if (cached) {
          const pos = JSON.parse(cached);
          if (pos.lat && pos.lng) { lat = pos.lat; lng = pos.lng; }
        }
        const WMO_KO: Record<number,string> = {
          0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',
          45:'안개',51:'가벼운 이슬비',61:'약한 비',63:'비',65:'강한 비',
          71:'약한 눈',73:'눈',80:'소나기',95:'뇌우',
        };
        const condType = (c:number) => c<=1?'clear':c<=3||c===45?'cloud':'rain';
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
          `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
          `&forecast_days=6&timezone=auto`
        );
        if (res.ok) {
          const d = await res.json();
          const cur = d.current ?? {};
          const daily = d.daily ?? {};
          const temp = cur.temperature_2m;
          const code = cur.weather_code ?? 0;
          const dates: string[] = daily.time ?? [];
          const forecast = dates.slice(0,6).map((date:string, i:number) => {
            const c = (daily.weather_code?.[i] ?? 0) as number;
            return {
              date, condition: WMO_KO[c]??'알 수 없음', cond_type: condType(c),
              temp_max: daily.temperature_2m_max?.[i] != null ? Math.round(daily.temperature_2m_max[i]) : 0,
              temp_min: daily.temperature_2m_min?.[i] != null ? Math.round(daily.temperature_2m_min[i]) : 0,
              rain_prob: daily.precipitation_probability_max?.[i] ?? null,
            };
          });
          setWeather({ temp, code, condition: WMO_KO[code]??'알 수 없음',
            cond_type: condType(code), summary: `${temp}°C ${WMO_KO[code]??''}`, forecast });
        }
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      setLoading(false);
    })();
  }, []);

  const todayType = weather?.cond_type ?? 'clear';
  const forecast: any[] = weather?.forecast ?? [];
  const advice = condAdvice(todayType, forecast[0]?.rain_prob);
  const [gradA, gradB] = condGradient(todayType);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── 오늘 HERO ── */}
        <LinearGradient colors={[gradA, gradB]} style={[s.hero, { paddingTop: Math.max(insets.top + 12, 32) }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>

          {/* 워터마크 */}
          <Text style={s.glyphWatermark}>{condGlyph(todayType)}</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
          ) : (
            <>
              <Text style={s.heroTemp}>{weather?.temp != null ? `${Math.round(weather.temp)}°` : '--°'}</Text>
              <Text style={s.heroCondition}>{weather?.condition ?? '날씨 정보 없음'}</Text>
              {forecast[0] && (
                <Text style={s.heroHighLow}>
                  최고 {forecast[0].temp_max}° / 최저 {forecast[0].temp_min}°
                </Text>
              )}
              <View style={s.adviceBox}>
                <Text style={s.adviceHeadline}>{advice.headline}</Text>
                <Text style={s.adviceAction}>{advice.action}</Text>
              </View>
            </>
          )}
        </LinearGradient>

        {/* ── 앞으로 이틀 ── */}
        <View style={s.forecastCard}>
          <Text style={s.forecastTitle}>앞으로 이틀</Text>
          {forecast.slice(1, 3).map((day, i) => (
            <View key={day.date} style={[s.forecastRow, i === 0 && s.forecastRowBorder]}>
              <View style={s.forecastRowTop}>
                <Text style={s.forecastDay}>{dayLabel(day.date, i + 1)}</Text>
                <Text style={s.forecastGlyph}>{condGlyph(day.cond_type)}</Text>
                <Text style={[s.forecastCond, { flex: 1 }]} numberOfLines={1}>{day.condition}</Text>
                <Text style={s.forecastTemp}>{day.temp_max}°/{day.temp_min}°</Text>
              </View>
              <Text style={s.forecastRowAdvice}>{rowAdvice(day.cond_type, false)}</Text>
            </View>
          ))}
          {forecast.length < 2 && !loading && (
            <Text style={{ fontSize: 18, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 }}>
              예보 정보를 불러오지 못했어요
            </Text>
          )}
        </View>

        {/* ── 루미 한마디 ── */}
        <View style={s.lumiCard}>
          <Lumi mood="content" size={64} bob={false} />
          <Text style={s.lumiTxt}>{lumiComment(todayType)}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1ECE4' },

  hero: { paddingHorizontal: 24, paddingBottom: 36, minHeight: 340 },
  backBtn: { marginBottom: 16 },
  backTxt: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  glyphWatermark: {
    position: 'absolute', top: 40, right: 20,
    fontSize: 140, opacity: 0.15,
  },
  heroTemp:      { fontSize: 80, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 8 },
  heroCondition: { fontSize: 26, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
  heroHighLow:   { fontSize: 20, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  adviceBox: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  adviceHeadline: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  adviceAction:   { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  forecastCard: {
    margin: 18, backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  forecastTitle:    { fontSize: 18, fontWeight: '900', color: INK, marginBottom: 16 },
  forecastRow:      { flexDirection: 'column', paddingVertical: 12 },
  forecastRowBorder:{ borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  forecastRowTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  forecastDay:      { fontSize: 15, fontWeight: '700', color: INK_SOFT, width: 68 },
  forecastGlyph:    { fontSize: 22, width: 28, textAlign: 'center' },
  forecastCond:     { fontSize: 15, fontWeight: '700', color: INK },
  forecastRowAdvice:{ fontSize: 13, color: '#6B7280', paddingLeft: 4 },
  forecastTemp:     { fontSize: 15, fontWeight: '700', color: INK_SOFT },

  lumiCard: {
    marginHorizontal: 18, backgroundColor: '#fff', borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#1C3C6E', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  lumiTxt: { flex: 1, fontSize: 20, fontWeight: '600', color: INK_SOFT, lineHeight: 30 },
});
