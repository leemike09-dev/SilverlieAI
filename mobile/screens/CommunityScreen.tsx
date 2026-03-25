import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

const API_URL = 'https://silverlieai.onrender.com';

type Group = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export default function CommunityScreen({ navigation, route }: any) {
  const { userId } = route.params;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupCategory, setGroupCategory] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/community/`);
      const data = await response.json();
      setGroups(data);
    } catch {
      Alert.alert('오류', '그룹 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName) {
      Alert.alert('알림', '그룹 이름을 입력해주세요.');
      return;
    }
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
      Alert.alert('완료', '그룹이 생성되었습니다.');
      setGroupName(''); setGroupDesc(''); setGroupCategory('');
      setShowCreate(false);
      fetchGroups();
    } catch {
      Alert.alert('오류', '그룹 생성에 실패했습니다.');
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      await fetch(`${API_URL}/community/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: userId }),
      });
      Alert.alert('완료', '그룹에 가입했습니다!');
    } catch {
      Alert.alert('오류', '가입에 실패했습니다.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👥 커뮤니티</Text>
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>+ 새 그룹 만들기</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="그룹 이름"
            value={groupName}
            onChangeText={setGroupName}
          />
          <TextInput
            style={styles.input}
            placeholder="설명 (선택)"
            value={groupDesc}
            onChangeText={setGroupDesc}
          />
          <TextInput
            style={styles.input}
            placeholder="카테고리 (예: 건강, 취미, 운동)"
            value={groupCategory}
            onChangeText={setGroupCategory}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={createGroup}>
            <Text style={styles.submitBtnText}>생성하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2e86ab" style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <Text style={styles.emptyText}>아직 그룹이 없습니다. 첫 번째 그룹을 만들어보세요!</Text>
      ) : (
        groups.map(group => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.category && <Text style={styles.groupCategory}>{group.category}</Text>}
              {group.description && <Text style={styles.groupDesc}>{group.description}</Text>}
            </View>
            <TouchableOpacity style={styles.joinBtn} onPress={() => joinGroup(group.id)}>
              <Text style={styles.joinBtnText}>가입</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  header: {
    backgroundColor: '#2e86ab',
    padding: 20,
    paddingTop: 60,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#cce8f4', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  createBtn: {
    margin: 16,
    backgroundColor: '#2e86ab',
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
    backgroundColor: '#2e86ab',
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
  },
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  groupCategory: {
    fontSize: 12,
    color: '#2e86ab',
    marginTop: 2,
  },
  groupDesc: { fontSize: 13, color: '#888', marginTop: 4 },
  joinBtn: {
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinBtnText: { color: '#2e86ab', fontWeight: 'bold' },
});
