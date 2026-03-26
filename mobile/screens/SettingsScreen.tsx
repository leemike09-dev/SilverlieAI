import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';
import { Language } from '../i18n/translations';

const API_URL = 'https://silverlieai.onrender.com';

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

const INTEREST_KEYS = ['걷기', '등산', '수영', '요가', '독서', '음악', '요리', '원예', '사진', '여행'];

export default function SettingsScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { t, language, setLanguage } = useLanguage();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [notifHealth, setNotifHealth] = useState(true);
  const [notifCommunity, setNotifCommunity] = useState(true);
  const [notifAI, setNotifAI] = useState(false);
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveMsgType, setSaveMsgType] = useState<'success' | 'error'>('success');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 앱 시작 시 기존 사용자 데이터 로드
  useEffect(() => {
    if (userId && userId !== 'demo-user') {
      fetch(`${API_URL}/users/${userId}`)
        .then(r => r.json())
        .then(data => {
          if (data.age) setAge(String(data.age));
          if (data.interests) setSelectedInterests(data.interests);
        })
        .catch(() => {});
    }
  }, [userId]);

  const toggleInterest = (item: string) => {
    setSelectedInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    if (userId === 'demo-user') {
      setSaveMsgType('error');
      setSaveMsg('게스트 모드에서는 저장할 수 없습니다.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      const body: any = { language };
      if (age) body.age = parseInt(age, 10);
      if (selectedInterests.length > 0) body.interests = selectedInterests;

      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error();
      setSaveMsgType('success');
      setSaveMsg(t.updateSuccess);
    } catch {
      setSaveMsgType('error');
      setSaveMsg(t.saveError);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userName');
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.settingsTitle}</Text>
      </View>

      {/* 프로필 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settingsProfile}</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileIcon}>👤</Text>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileId}>ID: {userId?.slice(0, 8)}...</Text>
          </View>
        </View>
        <Text style={styles.label}>{t.settingsAge}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.settingsAgePlaceholder}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
      </View>

      {/* 언어 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settingsLanguage}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 관심사 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settingsInterests}</Text>
        <Text style={styles.sectionDesc}>{t.settingsInterestsDesc}</Text>
        <View style={styles.interestGrid}>
          {INTEREST_KEYS.map((key, index) => (
            <TouchableOpacity
              key={key}
              style={[styles.interestBtn, selectedInterests.includes(key) && styles.interestBtnActive]}
              onPress={() => toggleInterest(key)}
            >
              <Text style={[styles.interestText, selectedInterests.includes(key) && styles.interestTextActive]}>
                {t.interests[index]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 알림 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settingsNotifications}</Text>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>{t.notifHealthLabel}</Text>
          <Switch value={notifHealth} onValueChange={setNotifHealth} trackColor={{ true: '#2D6A4F' }} />
        </View>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>{t.notifCommunityLabel}</Text>
          <Switch value={notifCommunity} onValueChange={setNotifCommunity} trackColor={{ true: '#2D6A4F' }} />
        </View>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>{t.notifAILabel}</Text>
          <Switch value={notifAI} onValueChange={setNotifAI} trackColor={{ true: '#2D6A4F' }} />
        </View>
      </View>

      {/* 저장 메시지 */}
      {saveMsg ? (
        <View style={[styles.msgBox, saveMsgType === 'success' ? styles.msgSuccess : styles.msgError]}>
          <Text style={styles.msgText}>{saveMsg}</Text>
        </View>
      ) : null}

      {/* 저장 버튼 */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>💾 {t.updateButton}</Text>
        }
      </TouchableOpacity>

      {/* 로그아웃 */}
      {showLogoutConfirm ? (
        <View style={styles.logoutConfirmBox}>
          <Text style={styles.logoutConfirmTitle}>{t.logoutConfirmTitle}</Text>
          <Text style={styles.logoutConfirmMsg}>{t.logoutConfirmMsg}</Text>
          <View style={styles.logoutConfirmBtns}>
            <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutConfirm(false)}>
              <Text style={styles.logoutCancelText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutConfirmBtn} onPress={handleLogout}>
              <Text style={styles.logoutConfirmBtnText}>{t.logout}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutConfirm(true)}>
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  section: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1A17', marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: '#999', marginBottom: 12 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  profileIcon: { fontSize: 40 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#1C1A17' },
  profileId: { fontSize: 13, color: '#999', marginTop: 2 },
  label: { fontSize: 15, color: '#555', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#F7F4EF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  langBtn: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F7F4EF',
    minWidth: 72,
  },
  langBtnActive: { backgroundColor: '#2D6A4F' },
  langFlag: { fontSize: 26 },
  langLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  langLabelActive: { color: '#fff' },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  interestBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F7F4EF',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  interestBtnActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  interestText: { fontSize: 15, color: '#555' },
  interestTextActive: { color: '#fff' },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE7',
  },
  notifLabel: { fontSize: 16, color: '#1C1A17' },
  msgBox: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  msgSuccess: { backgroundColor: '#D1FAE5' },
  msgError: { backgroundColor: '#FEE2E2' },
  msgText: { fontSize: 15, textAlign: 'center', fontWeight: '600' },
  saveBtn: {
    margin: 16,
    marginTop: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C0392B',
  },
  logoutText: { color: '#C0392B', fontSize: 18, fontWeight: 'bold' },
  logoutConfirmBox: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#C0392B',
  },
  logoutConfirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1A17', marginBottom: 8 },
  logoutConfirmMsg: { fontSize: 15, color: '#666', marginBottom: 16 },
  logoutConfirmBtns: { flexDirection: 'row', gap: 12 },
  logoutCancelBtn: {
    flex: 1,
    backgroundColor: '#F7F4EF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutCancelText: { fontSize: 16, color: '#555', fontWeight: '600' },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: '#C0392B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutConfirmBtnText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});
