import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://silverlieai.onrender.com';

const C = {
  indigo:    '#5C6BC0',
  indigoLt:  '#7986CB',
  bg:        '#F0F0F8',
  card:      '#FFFFFF',
  text:      '#16273E',
  sub:       '#7A90A8',
  line:      '#D1D5F0',
  reason:    '#E8EAF6',
};

const CHAT_OPTIONS      = ['\uc9e7\uace0 \ud575\uc2ec\ub9cc', '\uc790\uc138\ud558\uac8c'];
const INTERESTS_OPTIONS = [
  '\uac74\uac15\u00b7\uc6b4\ub3d9', '\uc694\ub9ac\u00b7\uc2dd\ub2e8', '\uc5ec\ud589', '\ub3c5\uc11c',
  '\uc74c\uc545\u00b7\uc601\ud654', '\uc190\uc8fc\u00b7\uac00\uc871', '\uc885\uad50\u00b7\uba85\uc0c1', '\uc0ac\uad50\ubaa8\uc784',
];

export default function ProfileScreen({ navigation, route }: any) {
  const { userId: paramUserId, name: paramName } = route?.params ?? {};
  const [userId,  setUserId]  = useState(paramUserId || '');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // \uae30\ubcf8 \uc815\ubcf4
  const [name,   setName]   = useState(paramName || '');
  const [phone,  setPhone]  = useState('');
  const [region, setRegion] = useState('');

  // AI \uc131\ud5a5
  const [chatStyle, setChatStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => { if (id) setUserId(id); });
  }, []);

  useEffect(() => {
    if (!userId || userId === 'demo-user') return;
    setLoading(true);
    fetch(`${API_URL}/users/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.name)       setName(d.name);
        if (d.phone)      setPhone(d.phone);
        if (d.region)     setRegion(d.region);
        if (d.chat_style) setChatStyle(d.chat_style);
        if (d.interests)  setInterests(d.interests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    if (!userId || userId === 'demo-user') {
      Alert.alert('\uc54c\ub9bc', '\ub85c\uadf8\uc778 \ud6c4 \ud504\ub85c\ud544\uc744 \uc800\uc7a5\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'); return;
    }
    setSaving(true);
    try {
      const body: any = {};
      if (name.trim())   body.name   = name.trim();
      if (phone.trim())  body.phone  = phone.trim();
      if (region.trim()) body.region = region.trim();
      if (chatStyle)     body.chat_style = chatStyle;
      if (interests.length > 0) body.interests = interests;

      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (name.trim()) await AsyncStorage.setItem('userName', name.trim());
        Alert.alert('\uc800\uc7a5 \uc644\ub8cc', '\ud504\ub85c\ud544\uc774 \uc800\uc7a5\ub418\uc5c8\uc2b5\ub2c8\ub2e4!', [
          { text: '\ud655\uc778', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('\uc624\ub958', '\uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.');
      }
    } catch {
      Alert.alert('\uc624\ub958', '\uc11c\ubc84 \uc5f0\uacb0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.');
    } finally {
      setSaving(false);
    }
  };

  const renderChip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label}
      style={[styles.chip, selected && styles.chipOn]}
      onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.chipTxt, selected && styles.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* \ud5e4\ub354 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>\u2190 \ub4a4\ub85c</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>\ub0b4 \ud504\ub85c\ud544</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading
          ? <ActivityIndicator size="large" color={C.indigo} style={{ marginTop: 60 }} />
          : (
          <>
            {/* \uae30\ubcf8 \uc815\ubcf4 */}
            <Text style={styles.sectionTitle}>\uae30\ubcf8 \uc815\ubcf4</Text>
            <View style={styles.card}>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTxt}>
                  \U0001f4a1 \uc774\ub984\uacfc \uc5f0\ub77d\ucc98\ub294 \uac00\uc871 \uc5f0\uacb0\uacfc SOS \ub3c4\uc6c0 \uc694\uccad \uc2dc \uc0ac\uc6a9\ub429\ub2c8\ub2e4
                </Text>
              </View>
              <Text style={styles.label}>\uc774\ub984</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="\uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694" placeholderTextColor={C.sub} maxLength={20} />
              <Text style={styles.label}>\uc804\ud654\ubc88\ud638</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="\uc608: 010-1234-5678" placeholderTextColor={C.sub}
                keyboardType="phone-pad" maxLength={15} />
              <Text style={styles.label}>\uac70\uc8fc \uc9c0\uc5ed</Text>
              <TextInput style={styles.input} value={region} onChangeText={setRegion}
                placeholder="\uc608: \uc11c\uc6b8 \uac15\ub0a8\uad6c" placeholderTextColor={C.sub} maxLength={20} />
            </View>

            {/* AI \uc0c1\ub2f4 \uc124\uc815 */}
            <Text style={styles.sectionTitle}>AI \uc0c1\ub2f4 \uc124\uc815</Text>
            <View style={styles.card}>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTxt}>
                  \U0001f4a1 \uad00\uc2ec\uc0ac\uc640 \ub300\ud654 \uc2a4\ud0c0\uc77c\uc744 \uc54c\uba74 \uaf2d\ube44\uac00 \ub354 \ub9de\uce68\ud615\uc73c\ub85c \ub300\ud654\ud560 \uc218 \uc788\uc5b4\uc694
                </Text>
              </View>
              <Text style={styles.label}>AI \ub300\ud654 \uc2a4\ud0c0\uc77c</Text>
              <View style={styles.chipRow}>
                {CHAT_OPTIONS.map(c => renderChip(c, chatStyle === c, () => setChatStyle(c)))}
              </View>
              <Text style={styles.label}>\uad00\uc2ec \ubd84\uc57c (\uc5ec\ub7ec \uac1c \uc120\ud0dd)</Text>
              <View style={styles.chipRow}>
                {INTERESTS_OPTIONS.map(i => renderChip(i, interests.includes(i), () => toggleInterest(i)))}
              </View>
            </View>

            {/* \uac74\uac15 \ud504\ub85c\ud544 \uc548\ub0b4 */}
            <TouchableOpacity
              style={styles.healthProfileBtn}
              onPress={() => navigation.navigate('HealthProfile', { userId })}
              activeOpacity={0.85}>
              <Text style={styles.healthProfileIco}>\U0001f3e5</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.healthProfileTxt}>\uac74\uac15 \ud504\ub85c\ud544 \ud3b8\uc9d1</Text>
                <Text style={styles.healthProfileSub}>\ub098\uc774\u00b7\ud0f4\u00b7\uccb4\uc911\u00b7\uc9c8\ud658\u00b7\uc54c\ub808\ub974\uae30 \ub4f1</Text>
              </View>
              <Text style={styles.healthProfileArrow}>\u203a</Text>
            </TouchableOpacity>

            {/* \uc800\uc7a5 \ubc84\ud2bc */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveTxt}>\uc800\uc7a5\ud558\uae30</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#5C6BC0',
    paddingTop: Platform.OS === 'web' ? 30 : (StatusBar.currentHeight ?? 28) + 8,
    paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backTxt:     { color: '#fff', fontSize: 18, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },

  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 },

  sectionTitle: {
    fontSize: 16, color: '#7A90A8', fontWeight: '700',
    marginBottom: 10, letterSpacing: 0.5, marginTop: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#D1D5F0', marginBottom: 20,
  },
  reasonBox: {
    backgroundColor: '#E8EAF6', borderRadius: 12,
    padding: 14, marginBottom: 18, borderLeftWidth: 4, borderLeftColor: '#5C6BC0',
  },
  reasonTxt: { fontSize: 16, color: '#5C6BC0', lineHeight: 23, fontWeight: '600' },

  label: { fontSize: 18, fontWeight: '700', color: '#16273E', marginBottom: 10, marginTop: 14 },
  input: {
    backgroundColor: '#F0F0F8', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 19, color: '#16273E', borderWidth: 1, borderColor: '#D1D5F0',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#F0F0F8', borderWidth: 1, borderColor: '#D1D5F0',
  },
  chipOn:     { backgroundColor: '#5C6BC0', borderColor: '#5C6BC0' },
  chipTxt:    { fontSize: 17, fontWeight: '600', color: '#7A90A8' },
  chipTxtOn:  { color: '#fff' },

  healthProfileBtn: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 18, borderWidth: 1.5, borderColor: '#5C6BC0',
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  healthProfileIco:   { fontSize: 30 },
  healthProfileTxt:   { fontSize: 20, fontWeight: '800', color: '#5C6BC0', marginBottom: 3 },
  healthProfileSub:   { fontSize: 16, color: '#7A90A8' },
  healthProfileArrow: { fontSize: 26, color: '#5C6BC0', fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#5C6BC0', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
