import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Image, Alert, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const KAKAO_CLIENT_ID    = 'c102ef257f29dfc4ca9f2062a0c1442d';
const REDIRECT_WEB       = 'https://leemike09-dev.github.io/SilverlieAI/';
const REDIRECT_NATIVE    = 'silverlifeai://oauth';
const BACKEND            = 'https://silverlieai.onrender.com';

const bgImage = require('../assets/lumi15.png');

function getOAuthUrl(mode: 'login' | 'register', isNative: boolean) {
  const redirect = isNative ? REDIRECT_NATIVE : REDIRECT_WEB;
  const state = 'kakao_' + mode;
  return 'https://kauth.kakao.com/oauth/authorize?client_id=' + KAKAO_CLIENT_ID +
    '&redirect_uri=' + encodeURIComponent(redirect) +
    '&response_type=code&state=' + state;
}

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [mode,    setMode]    = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState<string | null>(null);

  const handleKakao = async () => {
    setLoading('kakao');
    try {
      if (Platform.OS === 'web') {
        fetch(BACKEND + '/').catch(() => {});
        (window as any).location.href = getOAuthUrl(mode, false);
        return;
      }
      // 네이티브: 외부 브라우저로 열어 카카오 앱 인터셉트 방지
      // GitHub Pages → silverlifeai://oauth?code=XXX → App.tsx 딥링크 핸들러가 처리
      const url = getOAuthUrl(mode, false);
      await Linking.openURL(url);
      // 로그인 완료는 App.tsx의 Linking 이벤트 리스너가 처리
      return;
    } catch {
      Alert.alert('오류', '카카오 로그인 중 문제가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(' ') || undefined;
      const res = await fetch(`${BACKEND}/users/apple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_token: credential.identityToken,
          name: fullName,
          email: credential.email ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('서버 오류');
      const data = await res.json();
      await AsyncStorage.setItem('userId',   String(data.id));
      await AsyncStorage.setItem('userName', data.name || 'Apple 사용자');
      navigation.replace('SeniorHome', { userId: String(data.id), name: data.name });
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('오류', 'Apple 로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(null);
    }
  };

  const modeLabel = mode === 'login' ? '로그인' : '가입';

  return (
    <View style={s.root}>

      {/* 배경 이미지 고정 */}
      <Image source={bgImage} style={s.bg} resizeMode="cover" />

      {/* 오버레이 */}
      <View style={s.overlay} />

      {/* 카드 영역 */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>

        {/* 로그인 / 회원가입 탭 */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, mode === 'login' && s.tabActive]}
            onPress={() => { setMode('login'); setLoading(null); }}>
            <Text style={[s.tabTxt, mode === 'login' && s.tabTxtActive]}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, mode === 'register' && s.tabActive]}
            onPress={() => { setMode('register'); setLoading(null); }}>
            <Text style={[s.tabTxt, mode === 'register' && s.tabTxtActive]}>회원가입</Text>
          </TouchableOpacity>
        </View>

        {/* 카카오 */}
        <TouchableOpacity
          style={[s.card, s.kakaoCard]}
          onPress={handleKakao}
          activeOpacity={0.85}
          disabled={loading !== null}
        >
          {loading === 'kakao' ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <>
              <Text style={s.cardIcon}>💬</Text>
              <Text style={[s.cardLabel, { color: '#3C1E1E' }]}>카카오로 {modeLabel}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 이메일 */}
        <TouchableOpacity
          style={[s.card, s.emailCard]}
          onPress={() => navigation.navigate('EmailAuth')}
          activeOpacity={0.85}
        >
          <Text style={s.cardIcon}>📧</Text>
          <Text style={[s.cardLabel, { color: '#1A4A8A' }]}>이메일로 {modeLabel}</Text>
        </TouchableOpacity>

        {/* Apple — iOS 전용 */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[s.card, s.appleCard]}
            onPress={handleApple}
            activeOpacity={0.85}
            disabled={loading !== null}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.cardIcon}></Text>
                <Text style={[s.cardLabel, { color: '#fff' }]}>Apple로 {modeLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg:   { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  bottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 4,
  },
  tab:          { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive:    { backgroundColor: '#fff' },
  tabTxt:       { fontSize: 17, fontWeight: '700', color: 'rgba(30,30,30,0.45)' },
  tabTxtActive: { color: '#1A4A8A', fontWeight: '900' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 52,
  },
  cardIcon:  { fontSize: 24, marginRight: 12 },
  cardLabel: { fontSize: 19, fontWeight: '800', flex: 1 },

  kakaoCard: { backgroundColor: '#FEE500', borderColor: '#E6D200' },
  emailCard: { backgroundColor: 'rgba(235,243,251,0.95)', borderColor: '#1A4A8A' },
  appleCard: { backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#555' },
});
