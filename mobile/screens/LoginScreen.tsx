import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

const KAKAO_CLIENT_ID  = 'c102ef257f29dfc4ca9f2062a0c1442d';
const NAVER_CLIENT_ID  = 'YOUR_NAVER_CLIENT_ID';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const REDIRECT_BASE    = 'https://leemike09-dev.github.io/SilverlieAI/';

const SOCIAL = [
  {
    key: 'kakao',
    label: '카카오로 시작하기',
    icon: '💬',
    bg: '#FEE500',
    color: '#3C1E1E',
    border: '#E6D200',
  },
  {
    key: 'naver',
    label: '네이버로 시작하기',
    icon: '🟢',
    bg: '#03C75A',
    color: '#FFFFFF',
    border: '#02A84A',
  },
  {
    key: 'apple',
    label: 'Apple로 시작하기',
    icon: '🍎',
    bg: '#000000',
    color: '#FFFFFF',
    border: '#333333',
  },
  {
    key: 'google',
    label: 'Google로 시작하기',
    icon: '🔵',
    bg: '#FFFFFF',
    color: '#444444',
    border: '#DADCE0',
  },
];

export default function LoginScreen({ navigation, route }: any) {
  const initTab = route?.params?.tab === 'signup' ? 'register' : 'login';
  const [mode,      setMode]      = useState<'login' | 'register'>(initTab);
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');

  const handleSocial = async (key: string) => {
    setSocialLoading(key);
    setErrorMsg('');
    try {
      let url = '';
      if (key === 'kakao') {
        url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code`;
      } else if (key === 'naver') {
        url = `https://nid.naver.com/oauth2.0/authorize?client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code&state=naver`;
      } else if (key === 'apple') {
        url = `https://appleid.apple.com/auth/authorize?client_id=${REDIRECT_BASE}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code id_token&scope=name email&response_mode=form_post`;
      } else if (key === 'google') {
        url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_BASE)}&response_type=code&scope=openid email profile`;
      }
      if (Platform.OS === 'web') {
        (window as any).location.href = url;
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      setErrorMsg('소셜 로그인 중 오류가 발생했습니다.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email || !password) { setErrorMsg('이메일과 비밀번호를 입력해주세요.'); return; }
    if (mode === 'register') {
      if (!name)                  { setErrorMsg('이름을 입력해주세요.'); return; }
      if (password !== confirmPw) { setErrorMsg('비밀번호가 일치하지 않습니다.'); return; }
      if (password.length < 6)   { setErrorMsg('비밀번호는 6자 이상이어야 합니다.'); return; }
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/users/login' : '/users/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, name, password, phone, language: 'ko' };
      const res  = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.detail || '오류가 발생했습니다.'); return; }

      await AsyncStorage.setItem('userId', data.id);
      await AsyncStorage.setItem('userName', data.name);

      if (mode === 'register') {
        navigation.replace('Settings', { userId: data.id, name: data.name });
      } else {
        navigation.replace('SeniorHome', { userId: data.id, name: data.name });
      }
    } catch {
      setErrorMsg('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const PT = Platform.OS === 'ios' ? 54 : 32;

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 헤더 */}
          <View style={[s.header, { paddingTop: PT }]}>
            <Text style={s.appName}>🌿 Silver Life</Text>
            <Text style={s.appSub}>시니어를 위한 AI 건강 파트너</Text>
          </View>

          <View style={s.body}>

            {/* 소셜 로그인 카드 4개 */}
            <Text style={s.sectionLabel}>간편 로그인 / 회원가입</Text>
            {SOCIAL.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.socialCard, { backgroundColor: item.bg, borderColor: item.border }]}
                onPress={() => handleSocial(item.key)}
                activeOpacity={0.82}
                disabled={socialLoading !== null}
              >
                {socialLoading === item.key ? (
                  <ActivityIndicator color={item.color} size="small" />
                ) : (
                  <>
                    <Text style={s.socialIcon}>{item.icon}</Text>
                    <Text style={[s.socialLabel, { color: item.color }]}>{item.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}

            {/* 구분선 */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>이메일로 계속하기</Text>
              <View style={s.divLine} />
            </View>

            {/* 이메일 로그인/회원가입 탭 */}
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, mode === 'login' && s.tabActive]}
                onPress={() => { setMode('login'); setErrorMsg(''); }}>
                <Text style={[s.tabTxt, mode === 'login' && s.tabTxtActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, mode === 'register' && s.tabActive]}
                onPress={() => { setMode('register'); setErrorMsg(''); }}>
                <Text style={[s.tabTxt, mode === 'register' && s.tabTxtActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>이름</Text>
                <TextInput style={s.input} placeholder="이름을 입력하세요" placeholderTextColor="#B0BEC5"
                  value={name} onChangeText={setName} />
              </View>
            )}
            {mode === 'register' && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>전화번호</Text>
                <TextInput style={s.input} placeholder="010-0000-0000" placeholderTextColor="#B0BEC5"
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>이메일</Text>
              <TextInput style={s.input} placeholder="이메일 주소" placeholderTextColor="#B0BEC5"
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>비밀번호</Text>
              <TextInput style={s.input} placeholder="비밀번호 (6자 이상)" placeholderTextColor="#B0BEC5"
                value={password} onChangeText={setPassword} secureTextEntry />
            </View>
            {mode === 'register' && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>비밀번호 확인</Text>
                <TextInput style={s.input} placeholder="비밀번호 재입력" placeholderTextColor="#B0BEC5"
                  value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
              </View>
            )}

            {errorMsg ? <Text style={s.errorTxt}>{errorMsg}</Text> : null}

            <TouchableOpacity style={s.mainBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.mainBtnTxt}>{mode === 'login' ? '로그인' : '회원가입'}</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F6F2' },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  header:  { backgroundColor: '#1A4A8A', paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  appName: { fontSize: 34, fontWeight: '900', color: '#fff', marginBottom: 6 },
  appSub:  { fontSize: 20, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  body: { padding: 20 },

  sectionLabel: { fontSize: 20, fontWeight: '700', color: '#555', marginBottom: 14, textAlign: 'center' },

  socialCard:  {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1.5,
    paddingVertical: 20, paddingHorizontal: 24,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  socialIcon:  { fontSize: 32, marginRight: 16 },
  socialLabel: { fontSize: 24, fontWeight: '800', flex: 1 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  divLine: { flex: 1, height: 1, backgroundColor: '#DDD' },
  divTxt:  { fontSize: 18, color: '#999', marginHorizontal: 14, fontWeight: '600' },

  tabs:       { flexDirection: 'row', backgroundColor: '#EFEFEF', borderRadius: 16, padding: 4, marginBottom: 20 },
  tab:        { flex: 1, paddingVertical: 14, borderRadius: 13, alignItems: 'center' },
  tabActive:  { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:     { fontSize: 22, fontWeight: '700', color: '#ABABAB' },
  tabTxtActive:{ color: '#1A4A8A', fontWeight: '800' },

  fieldWrap: { marginBottom: 16 },
  label:     { fontSize: 22, fontWeight: '700', color: '#444', marginBottom: 8 },
  input:     { height: 64, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 16,
               paddingHorizontal: 18, fontSize: 22, color: '#222', backgroundColor: '#fff' },

  errorTxt: { color: '#D32F2F', fontSize: 18, textAlign: 'center', marginBottom: 12, fontWeight: '600' },

  mainBtn:    { height: 68, backgroundColor: '#1A4A8A', borderRadius: 18,
                alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  mainBtnTxt: { fontSize: 26, fontWeight: '900', color: '#fff' },
});
