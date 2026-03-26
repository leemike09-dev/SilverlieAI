import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

const API_URL = 'https://silverlieai.onrender.com';

const LANGUAGES: { code: Language; flag: string }[] = [
  { code: 'ko', flag: '🇰🇷' },
  { code: 'zh', flag: '🇨🇳' },
  { code: 'en', flag: '🇺🇸' },
  { code: 'ja', flag: '🇯🇵' },
];

export default function LoginScreen({ navigation }: any) {
  const { t, language, setLanguage } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg(t.emailPasswordRequired);
      return;
    }
    if (mode === 'register') {
      if (!name) {
        setErrorMsg(t.nameRequired);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t.passwordMismatch);
        return;
      }
      if (password.length < 6) {
        setErrorMsg(t.passwordMinLength);
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/users/login' : '/users/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, name, password, language };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.detail || '오류가 발생했습니다.');
        return;
      }

      await AsyncStorage.setItem('userId', data.id);
      await AsyncStorage.setItem('userName', data.name);

      navigation.navigate('Home', { name: data.name, userId: data.id });
    } catch {
      setErrorMsg(t.serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>{t.appName}</Text>
        <Text style={styles.subtitle}>{t.appSubtitle}</Text>

        {/* 로그인 / 회원가입 탭 */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>{t.loginTab}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>{t.registerTab}</Text>
          </TouchableOpacity>
        </View>

        {/* 회원가입 전용: 이름 */}
        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder={t.namePlaceholder}
            value={name}
            onChangeText={setName}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={t.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder={t.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* 회원가입 전용: 비밀번호 확인 */}
        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder={t.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        {errorMsg ? <Text style={styles.errorMsg}>{errorMsg}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{mode === 'login' ? t.loginTab : t.registerTab}</Text>
          }
        </TouchableOpacity>

        <View style={styles.demoSection}>
          <Text style={styles.demoLabel}>👀 {t.demoLabel}</Text>
          <View style={styles.demoFlagRow}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={styles.demoFlagBtn}
                onPress={() => {
                  setLanguage(lang.code);
                  const guestNames: Record<string, string> = {
                    ko: '게스트', zh: '访客', en: 'Guest', ja: 'ゲスト',
                  };
                  navigation.navigate('Home', { name: guestNames[lang.code], userId: 'demo-user' });
                }}
              >
                <Text style={styles.demoFlagText}>{lang.flag}</Text>
                <Text style={styles.demoFlagLang}>{lang.code.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F4EF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#E8E4DC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: '#2D6A4F',
  },
  modeBtnText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  demoSection: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#2D6A4F',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  demoLabel: {
    color: '#2D6A4F',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  demoFlagRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  demoFlagBtn: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F7F4EF',
    minWidth: 60,
  },
  demoFlagText: {
    fontSize: 28,
  },
  demoFlagLang: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
  errorMsg: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#C0392B',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
