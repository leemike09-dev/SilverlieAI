import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = 'https://silverlieai.onrender.com';

type FamilyMember = {
  connection_id: string;
  family_id: string;
  family_name: string;
  family_email: string;
  relationship: string;
  status: string;
};

type PendingInvitation = {
  invitation_id: string;
  family_name: string;
  family_email: string;
  relationship: string;
  created_at: string;
};

const RELATIONSHIP_OPTIONS = [
  { value: 'mother', label: { ko: '어머니', zh: '母亲', en: 'Mother', ja: '母' } },
  { value: 'father', label: { ko: '아버지', zh: '父亲', en: 'Father', ja: '父' } },
  { value: 'son', label: { ko: '아들', zh: '儿子', en: 'Son', ja: '息子' } },
  { value: 'daughter', label: { ko: '딸', zh: '女儿', en: 'Daughter', ja: '娘' } },
  { value: 'sibling', label: { ko: '형제자매', zh: '兄弟姐妹', en: 'Sibling', ja: 'きょうだい' } },
  { value: 'spouse', label: { ko: '배우자', zh: '配偶', en: 'Spouse', ja: '配偶者' } },
  { value: 'other', label: { ko: '기타', zh: '其他', en: 'Other', ja: 'その他' } },
];

export default function FamilyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  
  const [userId, setUserId] = useState<string>('');
  const [familyList, setFamilyList] = useState<FamilyMember[]>([]);
  const [pendingList, setPendingList] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('other');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    initScreen();
  }, []);

  const initScreen = async () => {
    try {
      const id = await AsyncStorage.getItem('userId');
      if (id) {
        setUserId(id);
        await Promise.all([fetchFamilyList(id), fetchPendingList(id)]);
      }
    } catch (e) {
      console.log('초기화 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyList = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}/family`);
      const data = await res.json();
      setFamilyList(data.family || []);
    } catch (e) {
      console.log('가족 목록 조회 실패:', e);
    }
  };

  const fetchPendingList = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}/family/pending`);
      const data = await res.json();
      setPendingList(data.pending || []);
    } catch (e) {
      console.log('대기중인 초대 조회 실패:', e);
    }
  };

  const handleInviteFamily = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('오류', '이메일을 입력하세요');
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/family/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_email: inviteEmail,
          relationship: selectedRelationship,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('성공', data.message);
        setInviteEmail('');
        setSelectedRelationship('other');
        setShowInviteModal(false);
        await fetchPendingList(userId);
      } else {
        Alert.alert('오류', data.detail || '초대 실패');
      }
    } catch (e) {
      Alert.alert('오류', '초대 전송 실패');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveFamily = async (familyId: string) => {
    Alert.alert('확인', '이 가족 연결을 삭제하시겠습니까?', [
      { text: '취소', onPress: () => {} },
      {
        text: '삭제',
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/users/${userId}/family/${familyId}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              await fetchFamilyList(userId);
              Alert.alert('확인', '삭제되었습니다');
            }
          } catch (e) {
            Alert.alert('오류', '삭제 실패');
          }
        },
      },
    ]);
  };

  const getRelationshipLabel = (value: string) => {
    const rel = RELATIONSHIP_OPTIONS.find(r => r.value === value);
    return rel ? rel.label[language as keyof typeof rel.label] : value;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 돌아가기</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👨‍👩‍👧‍👦 가족 연결</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 초대하기 버튼 */}
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => setShowInviteModal(true)}
        >
          <Text style={styles.inviteBtnText}>+ 가족 초대하기</Text>
        </TouchableOpacity>

        {/* 수락된 가족 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            내 가족 ({familyList.length})
          </Text>
          {familyList.length === 0 ? (
            <Text style={styles.emptyText}>아직 연결된 가족이 없습니다</Text>
          ) : (
            familyList.map(member => (
              <View key={member.connection_id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.family_name}</Text>
                  <Text style={styles.memberEmail}>{member.family_email}</Text>
                  <Text style={styles.memberRelationship}>
                    {getRelationshipLabel(member.relationship)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveFamily(member.family_id)}
                >
                  <Text style={styles.removeBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* 대기중인 초대 */}
        {pendingList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              대기중인 초대 ({pendingList.length})
            </Text>
            {pendingList.map(pending => (
              <View key={pending.invitation_id} style={styles.pendingCard}>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingName}>{pending.family_name}</Text>
                  <Text style={styles.pendingEmail}>{pending.family_email}</Text>
                  <Text style={styles.pendingRelationship}>
                    {getRelationshipLabel(pending.relationship)}
                  </Text>
                </View>
                <Text style={styles.pendingStatus}>대기중 ⏳</Text>
              </View>
            ))}
          </View>
        )}

        {/* 안내 텍스트 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 가족 연결이란?</Text>
          <Text style={styles.infoText}>
            가족 멤버와 연결하여 서로의 건강 정보를 공유하고 관심 있는 활동을 추천받을 수 있습니다.
          </Text>
        </View>
      </ScrollView>

      {/* 초대 모달 */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>가족 초대</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="family@example.com"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                editable={!inviting}
              />

              <Text style={styles.label}>관계</Text>
              {RELATIONSHIP_OPTIONS.map(rel => (
                <TouchableOpacity
                  key={rel.value}
                  style={[
                    styles.relationshipOption,
                    selectedRelationship === rel.value && styles.relationshipOptionSelected,
                  ]}
                  onPress={() => setSelectedRelationship(rel.value)}
                >
                  <View
                    style={[
                      styles.radioBtn,
                      selectedRelationship === rel.value && styles.radioBtnSelected,
                    ]}
                  />
                  <Text style={styles.relationshipLabel}>
                    {rel.label[language as keyof typeof rel.label]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowInviteModal(false)}
                disabled={inviting}
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleInviteFamily}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>초대하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    fontSize: 14,
    color: '#2D6A4F',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inviteBtn: {
    backgroundColor: '#2D6A4F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  inviteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#2D6A4F',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  memberRelationship: {
    fontSize: 12,
    color: '#2D6A4F',
    fontWeight: '500',
    marginTop: 4,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  removeBtnText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#ffa500',
    opacity: 0.8,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pendingEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pendingRelationship: {
    fontSize: 12,
    color: '#ffa500',
    fontWeight: '500',
    marginTop: 4,
  },
  pendingStatus: {
    fontSize: 12,
    color: '#ffa500',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f0f8f5',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2D6A4F',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D6A4F',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  relationshipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  relationshipOptionSelected: {
    borderColor: '#2D6A4F',
    backgroundColor: '#f0f8f5',
  },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 10,
  },
  radioBtnSelected: {
    borderColor: '#2D6A4F',
    backgroundColor: '#2D6A4F',
  },
  relationshipLabel: {
    fontSize: 14,
    color: '#333',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
