import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

// 카카오 REST API 키 — developers.kakao.com 에서 발급 후 입력
const KAKAO_CLIENT_ID = 'c102ef257f29dfc4ca9f2062a0c1442d';
const KAKAO_REDIRECT_URI = Platform.OS === 'web'
  ? 'https://leemike09-dev.github.io/SilverlieAI/'
  : 'exp://localhost:8081';

export default function LoginScreen({ navigation, route }: any) {
  const initTab = route?.params?.tab === 'signup' ? 'register' : 'login';
  const [mode,      setMode]      = useState<'login' | 'register'>(initTab);
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [role,      setRole]      = useState<'senior' | 'family'>('senior');

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
        : { email, name, password, language: 'ko' };
      const res  = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.detail || '오류가 발생했습니다.'); return; }

      await AsyncStorage.setItem('userId', data.id);
      await AsyncStorage.setItem('userName', data.name);

      if (mode === 'register') {
        navigation.replace('Onboarding', { name: data.name, userId: data.id });
      } else {
        navigation.replace('SeniorHome', { name: data.name, userId: data.id, isGuest: false });
      }
    } catch {
      setErrorMsg('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const goHome = () =>
    navigation.replace('SeniorHome', { name: '게스트', userId: '', isGuest: true });

  const handleKakaoLogin = () => {
    if (KAKAO_CLIENT_ID === 'YOUR_KAKAO_REST_API_KEY') {
      alert('카카오 로그인 준비 중입니다.\n이메일로 로그인해 주세요.');
      return;
    }
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
    if (Platform.OS === 'web') {
      (window as any).location.href = url;
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 헤더 */}
          <View style={s.header}>
<Text style={s.appName}>🌿 Silver Life</Text>
            <Text style={s.appSub}>시니어를 위한 AI 건강 파트너</Text>
          </View>

          <View style={s.body}>
            {/* 로그인 / 회원가입 탭 */}
            <View style={s.tabs}>
              <TouchableOpacity style={[s.tab, mode === 'login' && s.tabActive]} onPress={() => { setMode('login'); setErrorMsg(''); }}>
                <Text style={[s.tabTxt, mode === 'login' && s.tabTxtActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, mode === 'register' && s.tabActive]} onPress={() => { setMode('register'); setErrorMsg(''); }}>
                <Text style={[s.tabTxt, mode === 'register' && s.tabTxtActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            {/* 입력 필드 */}
            {mode === 'register' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[s.label, { marginBottom: 8 }]}>나는 누구인가요?</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[s.roleBtn, role === 'senior' && s.roleBtnOn]}
                    onPress={() => setRole('senior')}>
                    <Text style={[s.roleTxt, role === 'senior' && s.roleTxtOn]}>👴 시니어 (본인)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.roleBtn, role === 'family' && s.roleBtnOn]}
                    onPress={() => setRole('family')}>
                    <Text style={[s.roleTxt, role === 'family' && s.roleTxtOn]}>👨‍👩‍👧 가족 (보호자)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
        {mode === 'register' && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>이름</Text>
                <TextInput style={s.input} placeholder="이름을 입력하세요" placeholderTextColor="#b0bec5"
                  value={name} onChangeText={setName} />
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>이메일</Text>
              <TextInput style={s.input} placeholder="이메일을 입력하세요" placeholderTextColor="#b0bec5"
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>비밀번호</Text>
              <TextInput style={s.input} placeholder="비밀번호 (6자 이상)" placeholderTextColor="#b0bec5"
                value={password} onChangeText={setPassword} secureTextEntry />
            </View>
            {mode === 'register' && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>비밀번호 확인</Text>
                <TextInput style={s.input} placeholder="비밀번호를 다시 입력하세요" placeholderTextColor="#b0bec5"
                  value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
              </View>
            )}

            {errorMsg ? (
              <View style={s.errorBox}><Text style={s.errorTxt}>{errorMsg}</Text></View>
            ) : null}

            {/* 메인 버튼 */}
            <TouchableOpacity style={s.mainBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.mainBtnTxt}>{mode === 'login' ? '로그인' : '가입 완료'}</Text>}
            </TouchableOpacity>

            {/* 소셜 로그인 */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>또는 소셜 로그인</Text>
              <View style={s.divLine} />
            </View>
            <View style={s.socialRow}>
              <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#FEE500' }]} onPress={handleKakaoLogin}>
                <Text style={s.socialTxt}>카카오</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#03C75A' }]}>
                <Text style={[s.socialTxt, { color: '#fff' }]}>네이버</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#000' }]}>
                <Text style={[s.socialTxt, { color: '#fff' }]}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* 이메일/비밀번호 찾기 */}
            {mode === 'login' && (
              <View style={s.findRow}>
                <TouchableOpacity><Text style={s.findTxt}>이메일 찾기</Text></TouchableOpacity>
                <Text style={s.findSep}>|</Text>
                <TouchableOpacity><Text style={s.findTxt}>비밀번호 찾기</Text></TouchableOpacity>
              </View>
            )}

            {/* 홈으로 박스 */}
            <TouchableOpacity style={s.homeBtn} onPress={goHome} activeOpacity={0.85}>
              <Text style={s.homeBtnTxt}>← 홈으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f2f7',
    ...(Platform.OS === 'web' ? { flex: 1 } : {}),
  },
  scroll:      { flexGrow: 1 },
  // 헤더
  header:      { backgroundColor: '#1a5fbc', paddingTop: Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 28) + 8, paddingBottom: 28, paddingHorizontal: 22, alignItems: 'center' },
  appName:     { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  appSub:      { fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  // 바디
  body:        { padding: 22, paddingTop: 20 },
  // 탭
  tabs:        { flexDirection: 'row', backgroundColor: '#e8ecf5', borderRadius: 14, padding: 3, marginBottom: 20 },
  tab:         { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  tabActive:   { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:      { fontSize: 15, fontWeight: '700', color: '#90a4ae' },
  tabTxtActive:{ color: '#1a5fbc' },
  // 필드
  fieldWrap:   { marginBottom: 14 },
  label:       { fontSize: 12, fontWeight: '700', color: '#1a5fbc', marginBottom: 6 },
  input:       { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e8f8', borderRadius: 13, padding: 14, fontSize: 15, color: '#1a2a3a' },
  errorBox:    { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 10 },
  errorTxt:    { color: '#c0392b', fontSize: 13, textAlign: 'center' },
  // 버튼
  mainBtn:     { backgroundColor: '#1a5fbc', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 18, shadowColor: '#1a5fbc', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 5 },
  mainBtnTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },
  // 소셜
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  divLine:     { flex: 1, height: 1, backgroundColor: '#dde3ee' },
  divTxt:      { fontSize: 11, color: '#b0bec5' },
  socialRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  socialBtn:   { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  socialTxt:   { fontSize: 13, fontWeight: '700', color: '#333' },
  // 찾기
  findRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  findTxt:     { fontSize: 13, color: '#78909c' },
  findSep:     { fontSize: 13, color: '#dde3ee' },
  homeBtn:     { marginTop: 14, backgroundColor: '#f0f2f7', borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#dde3ee' },
  homeBtnTxt:  { fontSize: 15, fontWeight: '700', color: '#546e7a' },
  roleBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f0f4f8', alignItems: 'center', borderWidth: 2, borderColor: '#f0f4f8' },
  roleBtnOn:  { backgroundColor: '#e8f0fe', borderColor: '#1a5fbc' },
  roleTxt:    { fontSize: 14, fontWeight: '600', color: '#666' },
  roleTxtOn:  { color: '#1a5fbc' },
});
