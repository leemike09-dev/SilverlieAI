import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, StatusBar, Alert, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { route: any; navigation: any };

const C = {
  purple1: '#7B1FA2',
  purple2: '#9C27B0',
  purpleCard: '#F3E5F5',
  bg:   '#FFFFFF',
  text: '#1A1A1A',
  sub:  '#666666',
  line: '#E0E0E0',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
};

export default function DoctorMemoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = route?.params ?? {};
  const [memo, setMemo]       = useState('');
  const [memoDate, setMemoDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText]   = useState('');
  const [toastMsg, setToastMsg]   = useState('');
  const toastTimer = React.useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2500);
  };

  const loadMemo = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('doctor_memo');
      const savedDate = await AsyncStorage.getItem('doctor_memo_date');
      if (saved) {
        setMemo(saved);
        setEditText(saved);
      }
      if (savedDate) {
        const d = new Date(savedDate);
        setMemoDate(`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`);
      }
    } catch {}
  }, []);

  useEffect(() => { loadMemo(); }, [loadMemo]);

  const handleSaveEdit = async () => {
    try {
      await AsyncStorage.setItem('doctor_memo', editText);
      setMemo(editText);
      setIsEditing(false);
      showToast('수정사항이 저장되었습니다 ✅');
    } catch {
      showToast('저장에 실패했습니다');
    }
  };

  const handleShare = async () => {
    if (!memo) { showToast('저장된 메모가 없습니다'); return; }
    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: '의사 전달 메모', text: memo });
        } else {
          await (navigator as any).clipboard?.writeText(memo);
          showToast('클립보드에 복사되었습니다 📋');
        }
      } else {
        await Share.share({ message: memo, title: '의사 전달 메모' });
      }
    } catch {}
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      showToast('인솤은 웹 버전에서 사용해주세요');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '메모 삭제',
      '저장된 메모를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('doctor_memo');
          await AsyncStorage.removeItem('doctor_memo_date');
          setMemo(''); setEditText(''); setMemoDate('');
          showToast('삭제되었습니다');
        }},
      ]
    );
  };

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>📋 의사 전달 메모</Text>
          <Text style={s.headerSub}>병원에서 보여주세요</Text>
        </View>
        {memo ? (
          <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
            <Text style={s.deleteBtnTxt}>삭제</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 44 }} />}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {memoDate ? (
          <Text style={s.dateLabel}>📅 {memoDate} 작성</Text>
        ) : null}

        {memo ? (
          isEditing ? (
            <TextInput
              style={s.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
          ) : (
            <View style={s.memoBox}>
              <Text style={s.memoText}>{memo}</Text>
            </View>
          )
        ) : (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>📋 저장된 메모가 없습니다</Text>
            <Text style={s.emptyDesc}>
              AI 상담 중 병원 방문 권유 답변이{'\n'}
              있을 때 메모를 저장할 수 있어요
            </Text>
            <TouchableOpacity style={s.goAIBtn}
              onPress={() => navigation.navigate('AIChat', { userId })}>
              <Text style={s.goAIBtnTxt}>🤖 AI 상담 시작하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      {memo && (
        <View style={s.btnRow}>
          {isEditing ? (
            <>
              <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={handleSaveEdit} activeOpacity={0.85}>
                <Text style={s.btnTxt}>✅ 저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnGray]} onPress={() => { setIsEditing(false); setEditText(memo); }} activeOpacity={0.85}>
                <Text style={s.btnTxtDark}>취소</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[s.btn, s.btnShare]} onPress={handleShare} activeOpacity={0.85}>
                <Text style={s.btnTxt}>📱 공유</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnPrint]} onPress={handlePrint} activeOpacity={0.85}>
                <Text style={s.btnTxt}>🖨️ 인솤</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnEdit]} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
                <Text style={s.btnTxt}>✏️ 수정</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {toastMsg ? <View style={s.toast}><Text style={s.toastTxt}>{toastMsg}</Text></View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 16, gap: 12,
    backgroundColor: C.purple1,
  },
  backBtn:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backTxt:      { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 28, fontWeight: '900', color: '#fff' },
  headerSub:    { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  deleteBtn:    { paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnTxt: { color: '#FFCDD2', fontSize: 16, fontWeight: '700' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 120 },

  dateLabel: { fontSize: 16, color: C.sub, marginBottom: 16, textAlign: 'center' },

  memoBox: {
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: C.line,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  memoText: { fontSize: 22, color: C.text, lineHeight: 38, fontWeight: '500' },

  editInput: {
    fontSize: 22, color: C.text, lineHeight: 38,
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 24,
    borderWidth: 2, borderColor: C.purple1, minHeight: 400,
    textAlignVertical: 'top',
  },

  emptyBox:   { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 26, fontWeight: '800', color: C.sub, marginBottom: 12 },
  emptyDesc:  { fontSize: 20, color: C.sub, textAlign: 'center', lineHeight: 32, marginBottom: 32 },
  goAIBtn:    { backgroundColor: C.purple1, borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 28 },
  goAIBtnTxt: { fontSize: 20, color: '#fff', fontWeight: '800' },

  btnRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, padding: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line,
  },
  btn:      { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnShare: { backgroundColor: C.purple1 },
  btnPrint: { backgroundColor: '#1565C0' },
  btnEdit:  { backgroundColor: '#F57C00' },
  btnGreen: { backgroundColor: C.green, flex: 2 },
  btnGray:  { backgroundColor: '#E0E0E0' },
  btnTxt:     { fontSize: 18, color: '#fff', fontWeight: '800' },
  btnTxtDark: { fontSize: 18, color: '#333', fontWeight: '800' },

  toast: { position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10 },
  toastTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
