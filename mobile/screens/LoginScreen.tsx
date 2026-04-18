import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KAKAO_CLIENT_ID  = 'c102ef257f29dfc4ca9f2062a0c1442d';
const NAVER_CLIENT_ID  = 'YOUR_NAVER_CLIENT_ID';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const REDIRECT_BASE    = 'https://leemike09-dev.github.io/SilverlieAI/';

const PROVIDERS = [
  { key: 'kakao',  label: '카카오',  icon: '💬', bg: '#FEE500', color: '#3C1E1E', border: '#E6D200' },
  { key: 'naver',  label: '네이버',  icon: '🟢', bg: '#03C75A', color: '#FFFFFF', border: '#02A84A' },
  { key: 'apple',  label: 'Apple',   icon: '🍎', bg: '#000000', color: '#FFFFFF', border: '#333333' },
  { key: 'google', label: 'Google',  icon: '🔵', bg: '#FFFFFF', color: '#444444', border: '#DADCE0' },
];

function getOAuthUrl(key: string, mode: 'login' | 'register') {
  const state = key + '_' + mode;
  if (key === 'kakao')  return 'https://kauth.kakao.com/oauth/authorize?client_id=' + KAKAO_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_BASE) + '&response_type=code&state=' + state;
  if (key === 'naver')  return 'https://nid.naver.com/oauth2.0/authorize?client_id=' + NAVER_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_BASE) + '&response_type=code&state=' + state;
  if (key === 'apple')  return 'https://appleid.apple.com/auth/authorize?client_id=' + REDIRECT_BASE + '&redirect_uri=' + encodeURIComponent(REDIRECT_BASE) + '&response_type=code id_token&scope=name email&response_mode=form_post';
  if (key === 'google') return 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + GOOGLE_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_BASE) + '&response_type=code&scope=openid email profile&state=' + state;
  return '';
}

export default function LoginScreen({ navigation }: any) {
  const [mode,    setMode]    = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSocial = async (key: string) => {
    setLoading(key);
    try {
      const url = getOAuthUrl(key, mode);
      if (Platform.OS === 'web') {
        (window as any).location.href = url;
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      setLoading(null);
    }
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;
  const modeLabel = mode === 'login' ? '로 로그인' : '로 가입';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={[s.header, { paddingTop: PT }]}>
          <Text style={s.appName}>🌿 Silver Life</Text>
          <Text style={s.appSub}>시니어를 위한 AI 건강 파트너</Text>
        </View>

        <View style={s.body}>

          {/* 탭 */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, mode === 'login' && s.tabActive]}
              onPress={() => { setMode('login'); setLoading(null); }}>
              <Text style={[s.tabTxt, mode === 'login' && s.tabTxtActive]}>기존 회원 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, mode === 'register' && s.tabActive]}
              onPress={() => { setMode('register'); setLoading(null); }}>
              <Text style={[s.tabTxt, mode === 'register' && s.tabTxtActive]}>신규 회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 소셜 카드 */}
          {PROVIDERS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.card, { backgroundColor: p.bg, borderColor: p.border }]}
              onPress={() => handleSocial(p.key)}
              activeOpacity={0.82}
              disabled={loading !== null}
            >
              {loading === p.key ? (
                <ActivityIndicator color={p.color} />
              ) : (
                <>
                  <Text style={s.cardIcon}>{p.icon}</Text>
                  <Text style={[s.cardLabel, { color: p.color }]}>{p.label + modeLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}

          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divTxt}>또는</Text>
            <View style={s.divLine} />
          </View>

          {/* 이메일 카드 */}
          <TouchableOpacity
            style={[s.card, s.emailCard]}
            onPress={() => navigation.navigate('EmailAuth')}
            activeOpacity={0.85}
          >
            <Text style={s.cardIcon}>📧</Text>
            <Text style={[s.cardLabel, { color: '#1A4A8A' }]}>이메일로 {mode === 'login' ? '로그인' : '회원가입'}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F6F2' },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  header:  { backgroundColor: '#1A4A8A', paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  appName: { fontSize: 38, fontWeight: '900', color: '#fff', marginBottom: 8 },
  appSub:  { fontSize: 22, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  body: { padding: 20 },

  tabs:         { flexDirection: 'row', backgroundColor: '#E8EEF8', borderRadius: 18, padding: 4, marginBottom: 24 },
  tab:          { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  tabActive:    { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:       { fontSize: 22, fontWeight: '700', color: '#ABABAB' },
  tabTxtActive: { color: '#1A4A8A', fontWeight: '900' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 2,
    paddingVertical: 18, paddingHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
    minHeight: 68,
  },
  cardIcon:  { fontSize: 30, marginRight: 16 },
  cardLabel: { fontSize: 24, fontWeight: '800', flex: 1 },
  emailCard: { backgroundColor: '#EBF3FB', borderColor: '#1A4A8A' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  divLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', borderRadius: 1 },
  divTxt:  { fontSize: 18, color: '#ABABAB', fontWeight: '600' },
});
