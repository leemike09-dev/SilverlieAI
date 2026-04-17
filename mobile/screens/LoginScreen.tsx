import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

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
  const state = `${key}_${mode}`;
  if (key === 'kakao')  return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code&state=${state}`;
  if (key === 'naver')  return `https://nid.naver.com/oauth2.0/authorize?client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code&state=${state}`;
  if (key === 'apple')  return `https://appleid.apple.com/auth/authorize?client_id=${REDIRECT_BASE}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code id_token&scope=name email&response_mode=form_post`;
  if (key === 'google') return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code&scope=openid email profile&state=${state}`;
  return '';
}

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSocial = async (key: string, mode: 'login' | 'register') => {
    setLoading(`${key}_${mode}`);
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

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={[s.header, { paddingTop: PT }]}>
          <Text style={s.appName}>🌿 Silver Life</Text>
          <Text style={s.appSub}>시니어를 위한 AI 건강 파트너</Text>
        </View>

        <View style={s.body}>

          {/* ── 로그인 섹션 ── */}
          <Text style={s.sectionTitle}>기존 회원 로그인</Text>
          <Text style={s.sectionDesc}>이미 가입하셨나요? 아래 버튼을 눌러주세요</Text>
          {PROVIDERS.map(p => (
            <TouchableOpacity
              key={`login_${p.key}`}
              style={[s.card, { backgroundColor: p.bg, borderColor: p.border }]}
              onPress={() => handleSocial(p.key, 'login')}
              activeOpacity={0.82}
              disabled={loading !== null}
            >
              {loading === `${p.key}_login` ? (
                <ActivityIndicator color={p.color} />
              ) : (
                <>
                  <Text style={s.cardIcon}>{p.icon}</Text>
                  <Text style={[s.cardLabel, { color: p.color }]}>{p.label}로 로그인</Text>
                </>
              )}
            </TouchableOpacity>
          ))}

          <View style={s.divider}>
            <View style={s.divLine} /><View style={s.divLine} />
          </View>

          {/* ── 회원가입 섹션 ── */}
          <Text style={s.sectionTitle}>신규 회원가입</Text>
          <Text style={s.sectionDesc}>처음 이용하시나요? 아래 버튼을 눌러주세요</Text>
          {PROVIDERS.map(p => (
            <TouchableOpacity
              key={`register_${p.key}`}
              style={[s.card, { backgroundColor: p.bg, borderColor: p.border }]}
              onPress={() => handleSocial(p.key, 'register')}
              activeOpacity={0.82}
              disabled={loading !== null}
            >
              {loading === `${p.key}_register` ? (
                <ActivityIndicator color={p.color} />
              ) : (
                <>
                  <Text style={s.cardIcon}>{p.icon}</Text>
                  <Text style={[s.cardLabel, { color: p.color }]}>{p.label}로 가입</Text>
                </>
              )}
            </TouchableOpacity>
          ))}

          <View style={s.divider}>
            <View style={s.divLine} /><View style={s.divLine} />
          </View>

          {/* ── 이메일 카드 ── */}
          <TouchableOpacity
            style={[s.card, s.emailCard]}
            onPress={() => navigation.navigate('EmailAuth')}
            activeOpacity={0.85}
          >
            <Text style={s.cardIcon}>📧</Text>
            <Text style={[s.cardLabel, { color: '#1A4A8A' }]}>이메일로 로그인 / 회원가입</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F6F2' },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  header:  { backgroundColor: '#1A4A8A', paddingHorizontal: 24, paddingBottom: 30, alignItems: 'center' },
  appName: { fontSize: 38, fontWeight: '900', color: '#fff', marginBottom: 8 },
  appSub:  { fontSize: 22, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  body: { padding: 20 },

  sectionTitle: { fontSize: 28, fontWeight: '900', color: '#1A4A8A', marginBottom: 6 },
  sectionDesc:  { fontSize: 20, color: '#888', marginBottom: 16 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 2,
    paddingVertical: 22, paddingHorizontal: 24,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    minHeight: 76,
  },
  cardIcon:  { fontSize: 34, marginRight: 18 },
  cardLabel: { fontSize: 26, fontWeight: '800', flex: 1 },
  emailCard: { backgroundColor: '#EBF3FB', borderColor: '#1A4A8A' },

  divider: { flexDirection: 'row', gap: 8, marginVertical: 24 },
  divLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', borderRadius: 1 },
});
