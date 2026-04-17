import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, StatusBar, Platform, Linking,
} from 'react-native';

const INDIGO  = '#5C6BC0';
const LINDIGO = '#E8EAF6';
const BG      = '#F4F4FB';

interface QA { q: string; a: string; }
interface Category { icon: string; title: string; items: QA[]; }

const FAQ_DATA: Category[] = [
  {
    icon: '🚀', title: '시작하기',
    items: [
      {
        q: '회원가입은 어떻게 하나요?',
        a: '인트로 화면에서 시작하기 버튼을 누르면 온보딩 후 회원가입 화면으로 이동합니다. 이메일 또는 카카오/네이버로 가입할 수 있습니다.',
      },
      {
        q: '로그인 없이 사용할 수 있나요?',
        a: '로그인 화면에서 로그인 없이 둘러보기를 누르면 게스트로 앱을 체험할 수 있습니다. 단, 데이터 저장과 가족 연결은 로그인 후 사용 가능합니다.',
      },
      {
        q: '비밀번호를 잊어버렸어요',
        a: '로그인 화면에서 비밀번호 찾기를 누르면 등록된 이메일로 재설정 링크가 발송됩니다.',
      },
    ],
  },
  {
    icon: '📊', title: '건강 기록',
    items: [
      {
        q: '혁압 정상 수치가 어떻게 되나요?',
        a: '정상 혁압은 수축기 90~120 mmHg, 이완기 60~80 mmHg입니다. 130/80 이상이면 고혁압 전단계로 주의가 필요합니다.',
      },
      {
        q: '걸음수가 자동으로 측정되나요?',
        a: '네, 스마트폰을 들고 다니면 자동으로 걸음수가 측정됩니다. 더 정확한 측정을 위해 Apple Watch 또는 갤럭시 워치 연동을 설정화면에서 할 수 있습니다.',
      },
      {
        q: '기록한 데이터는 어디서 볼 수 있나요?',
        a: '건강기록 탭에서 기록 조회를 선택하면 날짜별 건강 기록을 확인할 수 있습니다.',
      },
    ],
  },
  {
    icon: '💊', title: '약 관리',
    items: [
      {
        q: '약을 추가하려면 어떻게 하나요?',
        a: '약관리 탭에서 상단 약 추가 버튼을 누르고 약 이름, 복용량, 복용 시간을 입력하면 됩니다. 등록 후 자동으로 복약 알림이 설정됩니다.',
      },
      {
        q: '복약 알림이 오지 않아요',
        a: '설정 화면에서 알림 설정을 확인해주세요. 스마트폰 설정에서 Silver Life AI 알림이 허용되어 있는지도 확인해주세요.',
      },
      {
        q: '재고가 부족하면 어떻게 알려주나요?',
        a: '남은 재고가 7일치 이하가 되면 빨간색으로 표시되고 가족에게도 알림이 전송됩니다.',
      },
    ],
  },
  {
    icon: '👨‍👩‍👧', title: '가족 연결',
    items: [
      {
        q: '가족을 연결하려면 어떻게 하나요?',
        a: '가족 탭에서 내 연결 코드를 가족에게 전달하거나, 가족에게 받은 코드를 입력하면 연결됩니다.',
      },
      {
        q: '가족이 내 정보를 수정할 수 있나요?',
        a: '아니요. 건강 데이터 수정은 본인만 가능합니다. 가족은 조회만 할 수 있습니다.',
      },
      {
        q: '가족이 몇 명까지 연결되나요?',
        a: '현재 최대 5명까지 연결할 수 있습니다.',
      },
    ],
  },
  {
    icon: '🐝', title: 'AI 상담 (꿀비)',
    items: [
      {
        q: '꿀비가 의사 대신인가요?',
        a: '아닙니다. 꿀비는 참고용 건강 조언을 드리는 AI입니다. 응급 상황이나 정확한 진단은 반드시 의사와 상담하세요.',
      },
      {
        q: '건강 프로필이 AI 상담에 어떻게 활용되나요?',
        a: '설정에서 입력한 만성질환, 수술 경력, 알레르기 정보가 AI 상담 시 자동으로 참고되어 더 정확한 맞춤 조언을 드립니다.',
      },
      {
        q: '대화 내용이 저장되나요?',
        a: '대화 내용은 서버에 저장되지 않으며 앱을 닫으면 초기화됩니다.',
      },
    ],
  },
  {
    icon: '🚨', title: 'SOS',
    items: [
      {
        q: 'SOS는 어떻게 작동하나요?',
        a: '홈화면의 SOS 버튼을 누르면 5초 카운트다운 후 119와 연결된 가족에게 동시에 연락됩니다. 5초 이내에 취소 버튼을 누르면 취소됩니다.',
      },
      {
        q: 'SOS를 실수로 뢌렀어요',
        a: '5초 카운트다운 중 취소 버튼을 누르면 됩니다. 이미 발송된 경우 가족에게 직접 연락하여 오발신임을 알려주세요.',
      },
    ],
  },
  {
    icon: '🔒', title: '개인정보',
    items: [
      {
        q: '내 건강 데이터는 안전한가요?',
        a: '모든 건강 데이터는 암호화되어 저장됩니다. Supabase 보안 인프라를 사용하며 제3자에게 개인 데이터를 제공하지 않습니다.',
      },
      {
        q: '연구 목적으로 데이터가 사용되나요?',
        a: '사용자가 명시적으로 동의한 경우에만 완전히 익명화된 데이터가 연구에 활용될 수 있습니다.',
      },
    ],
  },
];

export default function FAQScreen({ navigation }: any) {
  const [query,     setQuery]     = useState('');
  const [openCats,  setOpenCats]  = useState<Set<number>>(new Set([0]));
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const PT = Platform.OS === 'ios' ? 54 : Platform.OS === 'web' ? 20 : 32;

  const filtered = useMemo(() => {
    if (!query.trim()) return FAQ_DATA;
    const q = query.toLowerCase();
    return FAQ_DATA
      .map(cat => ({ ...cat, items: cat.items.filter(item =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length > 0);
  }, [query]);

  const toggleCat = (ci: number) => setOpenCats(prev => {
    const s = new Set(prev); s.has(ci) ? s.delete(ci) : s.add(ci); return s;
  });
  const toggleItem = (key: string) => setOpenItems(prev => {
    const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s;
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: PT }]}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backTxt}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>도움말 / FAQ</Text>
          <View style={{ width: 72 }} />
        </View>
        {Platform.OS === 'web' ? (
          <View style={s.waveWrap}>
            {/* @ts-ignore */}
            <svg width="100%" height="20" viewBox="0 0 100 20"
              preserveAspectRatio="none"
              style={{ width: '100%', display: 'block', marginBottom: '-1px' }}>
              <path d="M0 20 Q25 0 50 12 Q75 24 100 5 L100 20 L0 20 Z" fill={BG} />
            </svg>
          </View>
        ) : (
          <View style={s.waveNative} />
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 검색창 */}
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="궁금한 것을 검색해보세요"
            placeholderTextColor="#B0B8D8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 카테고리 아코디언 */}
        {filtered.map((cat, ci) => {
          const catOpen = query.trim() ? true : openCats.has(ci);
          return (
            <View key={ci} style={s.catBlock}>
              <TouchableOpacity style={s.catHeader} onPress={() => toggleCat(ci)} activeOpacity={0.75}>
                <Text style={s.catIcon}>{cat.icon}</Text>
                <Text style={s.catTitle}>{cat.title}</Text>
                <Text style={s.catArrow}>{catOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {catOpen && cat.items.map((item, ii) => {
                const key  = `${ci}-${ii}`;
                const open = openItems.has(key);
                return (
                  <View key={key}>
                    <TouchableOpacity
                      style={[s.qRow, ii === cat.items.length - 1 && !open && s.qRowLast]}
                      onPress={() => toggleItem(key)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.qMark}>Q</Text>
                      <Text style={s.qText}>{item.q}</Text>
                      <Text style={s.qArrow}>{open ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {open && (
                      <View style={[s.aBox, ii === cat.items.length - 1 && s.aBoxLast]}>
                        <Text style={s.aMark}>A</Text>
                        <Text style={s.aText}>{item.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>검색 결과가 없습니다</Text>
            <Text style={s.emptySub}>다른 키워드로 검색해보세요</Text>
          </View>
        )}

        {/* 문의하기 카드 */}
        <View style={s.contactCard}>
          <Text style={s.contactTitle}>추가 문의사항이 있으신가요?</Text>
          <TouchableOpacity
            style={s.contactBtn}
            onPress={() => Linking.openURL('mailto:support@silverlieai.com')}
            activeOpacity={0.85}
          >
            <Text style={s.contactBtnTxt}>📧 이메일 문의하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header:    { backgroundColor: INDIGO, paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn:   { paddingVertical: 4, paddingRight: 8 },
  backTxt:   { fontSize: 18, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  waveWrap:  { height: 20, overflow: 'hidden' },
  waveNative: {
    height: 18, backgroundColor: BG,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },

  body: { padding: 16, paddingBottom: 60 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
    borderWidth: 1.5, borderColor: LINDIGO,
    shadowColor: INDIGO, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  searchIcon:  { fontSize: 20, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 18, color: '#333', paddingVertical: 0 },
  searchClear: { fontSize: 18, color: '#B0B8D8', paddingLeft: 8 },

  catBlock: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: LINDIGO, overflow: 'hidden',
    shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  catHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
    backgroundColor: LINDIGO, gap: 10,
  },
  catIcon:  { fontSize: 22 },
  catTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: INDIGO },
  catArrow: { fontSize: 13, color: INDIGO, fontWeight: '700' },

  qRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 18, paddingVertical: 15,
    borderTopWidth: 1, borderTopColor: '#EEEEF8',
  },
  qRowLast: { borderBottomWidth: 0 },
  qMark: { fontSize: 16, fontWeight: '900', color: INDIGO, width: 24, textAlign: 'center', marginTop: 1 },
  qText: { flex: 1, fontSize: 18, fontWeight: '700', color: '#222', lineHeight: 26 },
  qArrow: { fontSize: 12, color: '#B0B8D8', marginTop: 4 },

  aBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16,
    backgroundColor: '#FAFAFE',
    borderTopWidth: 1, borderTopColor: '#EEEEF8',
  },
  aBoxLast: { borderBottomWidth: 0 },
  aMark: { fontSize: 16, fontWeight: '900', color: '#7986CB', width: 24, textAlign: 'center', marginTop: 2 },
  aText: { flex: 1, fontSize: 17, color: '#555', lineHeight: 28 },

  emptyBox:  { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#AAA', marginBottom: 8 },
  emptySub:  { fontSize: 16, color: '#C0C0C0' },

  contactCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: LINDIGO,
    padding: 24, alignItems: 'center', marginTop: 8,
  },
  contactTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
  contactBtn:   { backgroundColor: INDIGO, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 36 },
  contactBtnTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
