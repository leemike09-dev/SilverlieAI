import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

export default function LoginScreen({ navigation, route }: any) {
  const initTab = route?.params?.tab === 'signup' ? 'register' : 'login';
  const [mode, setMode]               = useState<'login' | 'register'>(initTab);
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email || !password) { setErrorMsg('이메일과 비밀번호를 입력해주세요.'); return; }
    if (mode === 'register') {
      if (!name)              { setErrorMsg('이름을 입력해주세요.'); return; }
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
        navigation.replace('Home', { name: data.name, userId: data.id, isGuest: false });
      }
    } catch {
      setErrorMsg('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* 헤더 */}
        <SafeAreaView style={s.header}>
          <View style={s.headerInner}>
            <Text style={s.appName}>🌿 Silver Life</Text>
            <Text style={s.appSub}>건강한 시니어 라이프</Text>
          </View>
        </SafeAreaView>

        <View style={s.body}>
          {/* 탭 */}
          <View style={s.tabs}>
            <TouchableOpacity style={[s.tab, mode === 'login' && s.tabActive]} onPress={() => setMode('login')}>
              <Text style={[s.tabTxt, mode === 'login' && s.tabTxtActive]}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, mode === 'register' && s.tabActive]} onPress={() => setMode('register')}>
              <Text style={[s.tabTxt, mode === 'register' && s.tabTxtActive]}>회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 입력 필드 */}
          {mode === 'register' && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>이름</Text>
              <TextInput style={s.input} placeholder="이름을 입력하세요" value={name} onChangeText={setName} />
            </View>
          )}
          <View style={s.fieldWrap}>
            <Text style={s.label}>이메일</Text>
            <TextInput style={s.input} placeholder="이메일을 입력하세요"
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.label}>비밀번호</Text>
            <TextInput style={s.input} placeholder="비밀번호를 입력하세요"
              value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          {mode === 'register' && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>비밀번호 확인</Text>
              <TextInput style={s.input} placeholder="비밀번호를 다시 입력하세요"
                value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
            </View>
          )}

          {errorMsg ? <View style={s.errorBox}><Text style={s.errorTxt}>{errorMsg}</Text></View> : null}

          {/* 메인 버튼 */}
          <TouchableOpacity style={s.mainBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.mainBtnTxt}>{mode === 'login' ? '로그인' : '가입 완료'}</Text>}
          </TouchableOpacity>

          {/* 소셜 로그인 */}
          <View style={s.divider}>
            <View style={s.divLine} /><Text style={s.divTxt}>또는 소셜 로그인</Text><View style={s.divLine} />
          </View>
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialBtn}><Text style={s.socialTxt}>🟡 카카오</Text></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn}><Text style={s.socialTxt}>🟢 네이버</Text></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn}><Text style={s.socialTxt}>⚫ 애플</Text></TouchableOpacity>
          </View>

          {/* 찾기 링크 */}
          {mode === 'login' && (
            <View style={s.findRow}>
              <TouchableOpacity><Text style={s.findTxt}>이메일 찾기</Text></TouchableOpacity>
              <Text style={s.findSep}>|</Text>
              <TouchableOpacity><Text style={s.findTxt}>비밀번호 찾기</Text></TouchableOpacity>
            </View>
          )}

          {/* 홈으로 */}
          <TouchableOpacity style={s.homeLink}
            onPress={() => navigation.replace('Home', { name: '게스트', userId: '', isGuest: true })}>
            <Text style={s.homeLinkTxt}>← 홈으로 돌아가기</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:      { flexGrow: 1, backgroundColor: '#f0f2f7' },
  header:      { backgroundColor: '#1a5fbc', paddingBottom: 28, paddingTop: 12 },
  headerInner: { alignItems: 'center', paddingTop: 16 },
  appName:     { fontSize: 24, fontWeight: '800', color: '#fff' },
  appSub:      { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  body:        { flex: 1, padding: 22, paddingTop: 20 },
  tabs:        { flexDirection: 'row', backgroundColor: '#e8ecf5', borderRadius: 14, padding: 3, marginBottom: 20 },
  tab:         { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabActive:   { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:      { fontSize: 14, fontWeight: '700', color: '#90a4ae' },
  tabTxtActive:{ color: '#1a5fbc' },
  fieldWrap:   { marginBottom: 14 },
  label:       { fontSize: 12, fontWeight: '700', color: '#1a5fbc', marginBottom: 5 },
  input:       { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e8f8', borderRadius: 13, padding: 14, fontSize: 15, color: '#1a2a3a' },
  errorBox:    { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 10 },
  errorTxt:    { color: '#c0392b', fontSize: 13, textAlign: 'center' },
  mainBtn:     { backgroundColor: '#1a5fbc', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, shadowColor: '#1a5fbc', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  mainBtnTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  divLine:     { flex: 1, height: 1, backgroundColor: '#dde3ee' },
  divTxt:      { fontSize: 11, color: '#b0bec5' },
  socialRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  socialBtn:   { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e8ecef', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  socialTxt:   { fontSize: 12, color: '#546e7a', fontWeight: '600' },
  findRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  findTxt:     { fontSize: 12, color: '#90a4ae', borderBottomWidth: 1, borderBottomColor: '#cfd8dc', paddingBottom: 1 },
  findSep:     { fontSize: 12, color: '#dde3ee' },
  homeLink:    { alignItems: 'center', marginTop: 4 },
  homeLinkTxt: { fontSize: 13, color: '#1a5fbc', fontWeight: '600' },
});
