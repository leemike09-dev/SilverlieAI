import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

const API_URL = 'https://silverlieai.onrender.com';

type Group = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export default function CommunityScreen({ navigation, route }: any) {
  const { userId, name: userName } = route.params;
  const { t } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupCategory, setGroupCategory] = useState('');
  const [msgMap, setMsgMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/community/`);
      const data = await response.json();
      setGroups(data);
    } catch {}
    finally { setLoading(false); }
  };

  const createGroup = async () => {
    if (!groupName) return;
    try {
      await fetch(`${API_URL}/community/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDesc,
          category: groupCategory,
          created_by: userId,
        }),
      });
      setGroupName(''); setGroupDesc(''); setGroupCategory('');
      setShowCreate(false);
      fetchGroups();
    } catch {}
  };

  const joinGroup = async (groupId: string) => {
    try {
      await fetch(`${API_URL}/community/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: userId }),
      });
      setMsgMap(prev => ({ ...prev, [groupId]: '✅' }));
      setTimeout(() => setMsgMap(prev => ({ ...prev, [groupId]: '' })), 2000);
    } catch {}
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.communityTitle}</Text>
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>{t.createGroup}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder={t.groupNamePlaceholder}
            value={groupName}
            onChangeText={setGroupName}
          />
          <TextInput
            style={styles.input}
            placeholder={t.groupDescPlaceholder}
            value={groupDesc}
            onChangeText={setGroupDesc}
          />
          <TextInput
            style={styles.input}
            placeholder={t.groupCategoryPlaceholder}
            value={groupCategory}
            onChangeText={setGroupCategory}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={createGroup}>
            <Text style={styles.submitBtnText}>{t.create}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2D6A4F" style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <Text style={styles.emptyText}>{t.noGroups}</Text>
      ) : (
        groups.map(group => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.category && <Text style={styles.groupCategory}>{group.category}</Text>}
              {group.description && <Text style={styles.groupDesc}>{group.description}</Text>}
            </View>
            <View style={styles.groupActions}>
              <TouchableOpacity
                style={styles.boardBtn}
                onPress={() => navigation.navigate('GroupBoard', {
                  groupId: group.id,
                  groupName: group.name,
                  userId,
                  userName: userName || '익명',
                })}
              >
                <Text style={styles.boardBtnText}>📋 {t.communityBoard}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.joinBtn} onPress={() => joinGroup(group.id)}>
                <Text style={styles.joinBtnText}>
                  {msgMap[group.id] || t.join}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,,
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1B4332' },
  createBtn: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  createForm: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  groupInfo: { marginBottom: 12 },
  groupName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  groupCategory: { fontSize: 14, color: '#2D6A4F', marginTop: 4 },
  groupDesc: { fontSize: 15, color: '#888', marginTop: 6 },
  groupActions: { flexDirection: 'row', gap: 8 },
  boardBtn: {
    flex: 1,
    backgroundColor: '#E8F4F0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  boardBtnText: { color: '#2D6A4F', fontWeight: 'bold', fontSize: 14 },
  joinBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
