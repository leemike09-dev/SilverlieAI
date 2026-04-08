import React, { useState } from 'react';
import SeniorTabBar from '../components/SeniorTabBar';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform,
} from 'react-native';

type Props = { route: any; navigation: any };

const CATS = ['전체', '📢 공지', '🏥 건강정보', '🎉 이벤트', '💡 시니어팁'];

const POSTS = [
  {
    cat: '📢 공지', catColor: '#e3f2fd', catText: '#1565c0',
    title: 'Silver Life AI 서비스 오픈 안내',
    date: '2026.04.01', views: 128, likes: 34,
    body: `안녕하세요, Silver Life AI팀입니다.

시니어 여러분의 건강하고 활기찬 생활을 위해 Silver Life AI 서비스를 시작합니다.

• AI 건강 분석 — 매일 건강 수치를 기록하면 AI가 분석해드립니다
• AI 상담 — 24시간 건강 궁금증을 해결해드립니다
• 라이프 콘텐츠 — 맞춤 레시피, 운동, 여행 정보를 제공합니다

앞으로 더 좋은 서비스로 찾아뵙겠습니다. 감사합니다.`,
  },
  {
    cat: '🏥 건강정보', catColor: '#e8f5e9', catText: '#2e7d32',
    title: '봄철 시니어 건강 관리 5가지',
    date: '2026.04.01', views: 89, likes: 21,
    body: `봄이 되면 일교차가 크고 황사·미세먼지가 심해집니다. 시니어 건강 관리 핵심 5가지를 알려드립니다.

① 외출 시 마스크 착용 필수
② 하루 물 8잔 이상 마시기
③ 아침·저녁 실내 스트레칭 10분
④ 혈압약 복용 시간 지키기
⑤ 갑작스러운 기온 변화에 겉옷 준비

특히 고혈압·당뇨가 있는 분은 봄철 혈압 변동에 주의하세요.`,
  },
  {
    cat: '💡 시니어팁', catColor: '#fff8e1', catText: '#f57f17',
    title: 'AI 건강 상담 100% 활용하는 방법',
    date: '2026.03.31', views: 67, likes: 18,
    body: `Silver Life AI 건강 상담을 더 잘 활용하는 팁을 알려드립니다.

✅ 구체적으로 질문하세요
"혈압이 높아요" 보다 "수축기 145, 이완기 90인데 어떻게 해야 하나요?"처럼 수치를 포함하면 더 정확한 답변을 받을 수 있습니다.

✅ 건강 기록 후 상담하세요
기록 탭에서 오늘 수치를 먼저 입력하면 AI가 데이터를 바탕으로 더 개인화된 조언을 드립니다.

✅ 빠른 질문을 활용하세요
상담 화면 하단의 추천 질문을 탭하면 빠르게 시작할 수 있습니다.`,
  },
  {
    cat: '🎉 이벤트', catColor: '#fce4ec', catText: '#c62828',
    title: '오픈 기념 — 건강 기록 챌린지',
    date: '2026.03.31', views: 112, likes: 45,
    body: `🎉 Silver Life AI 오픈 기념 이벤트를 진행합니다!

【7일 건강 기록 챌린지】
4월 한 달간 7일 연속 건강 기록을 완료하신 분께 혜택을 드립니다.

참여 방법:
① 건강 탭 → 기록 탭에서 매일 수치 입력
② 7일 연속 기록 완료
③ 설정 → 이벤트 참여 확인

함께 건강한 봄을 만들어 가요! 💪`,
  },
  {
    cat: '🏥 건강정보', catColor: '#e8f5e9', catText: '#2e7d32',
    title: '고혈압 환자가 꼭 알아야 할 식품 목록',
    date: '2026.03.30', views: 203, likes: 67,
    body: `고혈압 관리에 도움이 되는 식품과 피해야 할 식품을 정리했습니다.

✅ 도움이 되는 식품
• 바나나, 고구마 — 칼륨 풍부, 혈압 조절
• 시금치, 브로콜리 — 마그네슘 함유
• 올리브오일 — 불포화지방산
• 귀리, 현미 — 식이섬유 풍부

❌ 피해야 할 식품
• 짠 음식 (라면, 김치찌개, 젓갈)
• 포화지방 높은 음식 (삼겹살, 버터)
• 카페인 과다 (커피 3잔 이상)

혈압약을 드시는 분은 자몽 주스를 피하세요. 약물 흡수에 영향을 줄 수 있습니다.`,
  },
];

export default function BoardScreen({ route, navigation }: any) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [activeCat, setActiveCat] = useState('전체');
  const [likes, setLikes] = useState<Record<number, number>>(
    Object.fromEntries(POSTS.map((p, i) => [i, p.likes]))
  );
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = activeCat === '전체'
    ? POSTS
    : POSTS.filter(p => p.cat === activeCat);

  const toggleLike = (i: number) => {
    setLiked(prev => ({ ...prev, [i]: !prev[i] }));
    setLikes(prev => ({ ...prev, [i]: prev[i] + (liked[i] ? -1 : 1) }));
  };

  const selectedPost = selected !== null ? POSTS[selected] : null;

  return (
    <View style={{flex: 1, backgroundColor: '#f5f7fa'}}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📋 게시판</Text>
        <Text style={s.headerSub}>Silver Life AI 공식 소식</Text>
      </View>

      {/* 카테고리 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.catScroll} contentContainerStyle={s.catContent}>
        {CATS.map(c => (
          <TouchableOpacity key={c}
            style={[s.catChip, activeCat === c && s.catChipOn]}
            onPress={() => setActiveCat(c)}>
            <Text style={[s.catTxt, activeCat === c && s.catTxtOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
        {filtered.map((post, i) => {
          const idx = POSTS.indexOf(post);
          return (
            <TouchableOpacity key={i} style={s.card} activeOpacity={0.85}
              onPress={() => setSelected(idx)}>
              <View style={s.cardTop}>
                <View style={[s.catBadge, { backgroundColor: post.catColor }]}>
                  <Text style={[s.catBadgeTxt, { color: post.catText }]}>{post.cat}</Text>
                </View>
                <Text style={s.date}>{post.date}</Text>
              </View>
              <Text style={s.title} numberOfLines={2}>{post.title}</Text>
              <View style={s.cardBottom}>
                <Text style={s.views}>👁 {post.views}</Text>
                <TouchableOpacity style={s.likeBtn}
                  onPress={(e) => { e.stopPropagation?.(); toggleLike(idx); }}>
                  <Text style={[s.likeTxt, liked[idx] && { color: '#e53935' }]}>
                    {liked[idx] ? '❤️' : '🤍'} {likes[idx]}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 게시글 상세 모달 */}
      <Modal visible={selected !== null} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={s.modalClose}>✕ 닫기</Text>
              </TouchableOpacity>
              {selectedPost && (
                <TouchableOpacity onPress={() => toggleLike(selected!)}>
                  <Text style={[s.modalLike, liked[selected!] && { color: '#e53935' }]}>
                    {liked[selected!] ? '❤️' : '🤍'} {likes[selected!]}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {selectedPost && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[s.catBadge, { backgroundColor: selectedPost.catColor, marginBottom: 12 }]}>
                  <Text style={[s.catBadgeTxt, { color: selectedPost.catText }]}>{selectedPost.cat}</Text>
                </View>
                <Text style={s.modalTitle}>{selectedPost.title}</Text>
                <Text style={s.modalDate}>{selectedPost.date} · 조회 {selectedPost.views}</Text>
                <View style={s.divider} />
                <Text style={s.modalBody}>{selectedPost.body}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    
      <SeniorTabBar navigation={navigation} activeTab="" userId={userId} name={name} />
    </View>
  );
}

const BLUE = '#1a5fbc';

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#f5f7fa' },
  header:     { backgroundColor: BLUE, paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 16 : (0 ?? 28) + 4, paddingBottom: 18 },
  headerTitle:{ fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  catScroll:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  catContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  catChip:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f4f8' },
  catChipOn:  { backgroundColor: BLUE },
  catTxt:     { fontSize: 12, fontWeight: '600', color: '#607d8b' },
  catTxtOn:   { color: '#fff' },

  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
                shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width:0, height:2 }, shadowRadius:6, elevation:2 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  catBadgeTxt:{ fontSize: 11, fontWeight: '700' },
  date:       { fontSize: 11, color: '#b0bec5' },
  title:      { fontSize: 15, fontWeight: '700', color: '#263238', lineHeight: 22, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  views:      { fontSize: 12, color: '#b0bec5' },
  likeBtn:    { marginLeft: 'auto' as any },
  likeTxt:    { fontSize: 13, color: '#b0bec5', fontWeight: '600' },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                 padding: 20, paddingBottom: 40, maxHeight: '85%' as any },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalClose:  { fontSize: 14, color: '#90a4ae', fontWeight: '600' },
  modalLike:   { fontSize: 15, color: '#b0bec5', fontWeight: '700' },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#263238', lineHeight: 26, marginBottom: 6 },
  modalDate:   { fontSize: 12, color: '#b0bec5', marginBottom: 14 },
  divider:     { height: 1, backgroundColor: '#eef2f7', marginBottom: 14 },
  modalBody:   { fontSize: 14, color: '#455a64', lineHeight: 24 },
});
