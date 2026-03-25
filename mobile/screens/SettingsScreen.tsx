import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

const INTERESTS = ['걷기', '등산', '수영', '요가', '독서', '음악', '요리', '원예', '사진', '여행'];

export default function SettingsScreen({ navigation, route }: any) {
  const { name, userId } = route.params;
  const { language, setLanguage } = useLanguage();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [notifHealth, setNotifHealth] = useState(true);
  const [notifCommunity, setNotifCommunity] = useState(true);
  const [notifAI, setNotifAI] = useState(false);
  const [age, setAge] = useState('');

  const toggleInterest = (item: string) => {
    setSelectedInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚙️ 설정</Text>
      </View>

      {/* 프로필 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프로필</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileIcon}>👤</Text>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileId}>ID: {userId?.slice(0, 8)}...</Text>
          </View>
        </View>
        <Text style={styles.label}>나이</Text>
        <TextInput
          style={styles.input}
          placeholder="나이를 입력하세요"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
      </View>

      {/* 언어 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>언어 설정</Text>
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
        <Text style={styles.sectionTitle}>관심사 선택</Text>
        <Text style={styles.sectionDesc}>AI 추천에 활용됩니다</Text>
        <View style={styles.interestGrid}>
          {INTERESTS.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.interestBtn, selectedInterests.includes(item) && styles.interestBtnActive]}
              onPress={() => toggleInterest(item)}
            >
              <Text style={[styles.interestText, selectedInterests.includes(item) && styles.interestTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 알림 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>건강 기록 알림</Text>
          <Switch value={notifHealth} onValueChange={setNotifHealth} trackColor={{ true: '#2D6A4F' }} />
        </View>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>커뮤니티 알림</Text>
          <Switch value={notifCommunity} onValueChange={setNotifCommunity} trackColor={{ true: '#2D6A4F' }} />
        </View>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>AI 추천 알림</Text>
          <Switch value={notifAI} onValueChange={setNotifAI} trackColor={{ true: '#2D6A4F' }} />
        </View>
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: () => navigation.replace('Login') },
          ]);
        }}
      >
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: 60,
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
  logoutBtn: {
    margin: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C0392B',
  },
  logoutText: { color: '#C0392B', fontSize: 18, fontWeight: 'bold' },
});
