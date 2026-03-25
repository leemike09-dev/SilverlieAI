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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name || !email) {
      Alert.alert('', t.fillAll);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, language }),
      });
      const data = await response.json();
      navigation.navigate('Home', { name, userId: data.id });
    } catch (error) {
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

      <TextInput
        style={styles.input}
        placeholder={t.namePlaceholder}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder={t.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.startButton}</Text>}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 40,
    textAlign: 'center',
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
