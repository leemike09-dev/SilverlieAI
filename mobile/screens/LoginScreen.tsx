import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
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

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('', t.emailPasswordRequired);
      return;
    }
    if (mode === 'register') {
      if (!name) {
        Alert.alert('', t.nameRequired);
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('', t.passwordMismatch);
        return;
      }
      if (password.length < 6) {
        Alert.alert('', t.passwordMinLength);
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
        Alert.alert('', data.detail || '오류가 발생했습니다.');
        return;
      }

      await AsyncStorage.setItem('userId', data.id);
      await AsyncStorage.setItem('userName', data.name);

      navigation.navigate('Home', { name: data.name, userId: data.id });
    } catch {
      Alert.alert('', t.serverError);
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

        {/* 언어 전환 버튼 */}
        <View style={styles.langRow}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{mode === 'login' ? t.loginTab : t.registerTab}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  langRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  langBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  langBtnActive: {
    backgroundColor: '#2D6A4F',
  },
  langFlag: {
    fontSize: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
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
