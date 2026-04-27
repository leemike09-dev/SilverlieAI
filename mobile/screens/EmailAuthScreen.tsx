import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestNotificationPermission, scheduleHealthDailyReminder } from '../utils/notifications';

const API_URL = 'https://silverlieai.onrender.com';

export default function EmailAuthScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [mode,      setMode]      = useState<'login' | 'register'>('login');
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

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
        await requestNotificationPermission();
        await scheduleHealthDailyReminder();
        navigation.replace('HealthProfile', { userId: data.id, name: data.name, fromRegister: true });
      } else {
        navigation.replace('SeniorHome', { userId: data.id, name: data.name });
      }
    } catch {
      setErrorMsg('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 헤더 */}
          <View style={[s.header, { paddingTop: Math.max(insets.top + 14, 28) }]}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Text style={s.backTxt}>← 돌아가기</Text>
            </TouchableOpacity>
            <Text style={s.appName}>📧 이메일 계정</Text>
            <Text style={s.appSub}>이메일로 로그인하거나 가입하세요</Text>
          </View>

          <View style={s.body}>
            {/* 탭 */}
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

  header:  { backgroundColor: '#1A4A8A', paddingHorizontal: 24, paddingBottom: 28 },
  backBtn: { marginBottom: 16 },
  backTxt: { fontSize: 22, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  appName: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 6 },
  appSub:  { fontSize: 20, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  body: { padding: 20 },

  tabs:        { flexDirection: 'row', backgroundColor: '#EFEFEF', borderRadius: 18, padding: 4, marginBottom: 24 },
  tab:         { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  tabActive:   { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:      { fontSize: 24, fontWeight: '700', color: '#ABABAB' },
  tabTxtActive:{ color: '#1A4A8A', fontWeight: '800' },

  fieldWrap: { marginBottom: 18 },
  label:     { fontSize: 22, fontWeight: '700', color: '#444', marginBottom: 8 },
  input:     { height: 68, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 16,
               paddingHorizontal: 20, fontSize: 22, color: '#222', backgroundColor: '#fff' },

  errorTxt:   { color: '#D32F2F', fontSize: 20, textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  mainBtn:    { height: 72, backgroundColor: '#1A4A8A', borderRadius: 20,
                alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  mainBtnTxt: { fontSize: 28, fontWeight: '900', color: '#fff' },
});
