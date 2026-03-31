import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Dimensions, TextInput,
} from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

const { width } = Dimensions.get('window');

type Props = { route: any; navigation: any };

const CATEGORIES = ['전체', '🚶걷기', '🏌️골프', '🍳요리', '📚독서', '🎵노래', '🧘요가'];

const HOT_POSTS = [
  { rank: 1, text: '한강 걷기 6,500보 인증합니다! 🎉', cnt: 32 },
  { rank: 2, text: '혈압약 새로 처방받았는데 많이 좋아졌어요', cnt: 18 },
  { rank: 3, text: '골프 레슨 같이 하실 분 구해요~', cnt: 11 },
];

const FEED_POSTS = [
  {
    avatar: '👴', author: '김철수 님', time: '10분 전',
    groupTag: '🚶 걷기모임', groupColor: '#e3f2fd', groupTextColor: '#1565c0',
    body: '오늘 한강공원 6,500보 달성! 무릎이 많이 좋아진 것 같아요 😊',
    img: null, likes: 12, comments: 3,
  },
  {
    avatar: '👵', author: '박영희 님', time: '1시간 전',
    groupTag: '🍳 요리교실', groupColor: '#fff8e1', groupTextColor: '#f57f17',
    body: '저염 비빔밥 — 혈압에 좋은 재료로 만든 레시피입니다',
    img: '🥗', likes: 28, comments: 7,
  },
  {
    avatar: '🧑', author: '이민준 님', time: '3시간 전',
    groupTag: '🏌️ 골프', groupColor: '#e8f5e9', groupTextColor: '#2e7d32',
    body: '이번 주 토요일 9홀 함께 하실 분 2명 구합니다. 경기도 광주 예정.',
    img: null, likes: 5, comments: 9,
  },
];

const MY_GROUPS = [
  {
    icon: '🚶', name: '새벽 걷기 모임', meta: '멤버 24명 · 방 3개', bg: '#e3f2fd',
    newCount: 3,
    rooms: [
      { dot: '#1565c0', name: '💬 일반 대화방', cnt: 24 },
      { dot: '#43a047', name: '🗓 모임 일정방', cnt: 24 },
    ],
  },
  {
    icon: '🎵', name: '노래 교실', meta: '멤버 18명 · 방 2개 · 오늘 수업 오후 2시', bg: '#f3e5f5',
    newCount: 0, rooms: [],
  },
];

const EXPLORE_GROUPS = [
  { icon: '🏌️', name: '골프 동호회',    meta: '멤버 56명 · 방 4개', bg: '#e8f5e9' },
  { icon: '🍳', name: '건강 요리교실',   meta: '멤버 31명 · 방 2개', bg: '#fff8e1' },
  { icon: '📚', name: '독서 모임',       meta: '멤버 22명 · 방 2개', bg: '#e3f2fd' },
  { icon: '🧘', name: '요가·명상 클래스', meta: '멤버 15명 · 방 1개', bg: '#fce4ec' },
];

export default function CommunityScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};
  const [activeTab, setActiveTab] = useState<'feed' | 'mygroup' | 'explore'>('feed');
  const [activeCat, setActiveCat] = useState('전체');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('새벽 걷기 모임');

  return (
    <SafeAreaView style={styles.safe}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>👥 함께하자</Text>
            <Text style={styles.headerSub}>커뮤니티</Text>
          </View>
          <TouchableOpacity style={styles.writeBtn}
            onPress={() => {}}>
            <Text style={styles.writeBtnText}>✏️ 글쓰기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tabs}>
          {(['feed','mygroup','explore'] as const).map((t, i) => {
            const labels = ['피드', '내 그룹', '그룹 탐색'];
            return (
              <TouchableOpacity key={t} style={styles.tab} onPress={() => setActiveTab(t)}>
                <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                  {labels[i]}
                </Text>
                {activeTab === t && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── 피드 탭 ─── */}
      {activeTab === 'feed' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}
            contentContainerStyle={styles.catContent}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[styles.catChip, activeCat === c && styles.catChipOn]}
                onPress={() => setActiveCat(c)}>
                <Text style={[styles.catText, activeCat === c && styles.catTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}>
            {/* 인기글 */}
            <View style={styles.hotBox}>
              <Text style={styles.hotTitle}>🔥 지금 뜨거운 이야기</Text>
              {HOT_POSTS.map(h => (
                <View key={h.rank} style={styles.hotItem}>
                  <View style={styles.hotRank}><Text style={styles.hotRankText}>{h.rank}</Text></View>
                  <Text style={styles.hotText} numberOfLines={1}>{h.text}</Text>
                  <Text style={styles.hotCnt}>💬 {h.cnt}</Text>
                </View>
              ))}
            </View>
            {/* 피드 */}
            {FEED_POSTS.map((post, i) => (
              <View key={i} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{post.avatar}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postAuthor}>{post.author}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                  </View>
                  <View style={[styles.groupTag, { backgroundColor: post.groupColor }]}>
                    <Text style={[styles.groupTagText, { color: post.groupTextColor }]}>{post.groupTag}</Text>
                  </View>
                </View>
                {post.img && (
                  <View style={styles.postImg}><Text style={{ fontSize: 36 }}>{post.img}</Text></View>
                )}
                <Text style={styles.postBody}>{post.body}</Text>
                <View style={styles.postFooter}>
                  <TouchableOpacity style={styles.react}><Text style={styles.reactText}>❤️ {post.likes}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.react}><Text style={styles.reactText}>💬 {post.comments}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.react}><Text style={styles.reactText}>📤 공유</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* ─── 내 그룹 탭 ─── */}
      {activeTab === 'mygroup' && (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <Text style={styles.secTitle}>참여 중인 그룹 {MY_GROUPS.length}개</Text>
          {MY_GROUPS.map(g => (
            <View key={g.name}>
              <TouchableOpacity style={styles.groupCard}
                onPress={() => setExpandedGroup(expandedGroup === g.name ? null : g.name)}>
                <View style={[styles.gBadge, { backgroundColor: g.bg }]}>
                  <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gName}>{g.name}</Text>
                  <Text style={styles.gMeta}>{g.meta}</Text>
                </View>
                {g.newCount > 0 && (
                  <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW {g.newCount}</Text></View>
                )}
                {g.rooms.length === 0 && (
                  <TouchableOpacity style={styles.enterBtn}><Text style={styles.enterBtnText}>입장 →</Text></TouchableOpacity>
                )}
              </TouchableOpacity>
              {/* 방 목록 — 그룹 펼쳐졌을 때 */}
              {expandedGroup === g.name && g.rooms.length > 0 && (
                <View style={styles.roomList}>
                  {g.rooms.map((r, ri) => (
                    <TouchableOpacity key={ri} style={styles.roomCard}>
                      <View style={[styles.roomDot, { backgroundColor: r.dot }]} />
                      <Text style={styles.roomName}>{r.name}</Text>
                      <Text style={styles.roomCnt}>{r.cnt}명</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.roomCard, { backgroundColor: '#f8f9fa' }]}>
                    <View style={[styles.roomDot, { backgroundColor: '#bdbdbd' }]} />
                    <Text style={[styles.roomName, { color: '#90a4ae' }]}>＋ 새 방 만들기</Text>
                    <Text style={[styles.roomCnt, { color: '#1565c0', fontWeight: '700' }]}>그룹원만</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          {/* 그룹 만들기 배너 */}
          <View style={styles.createBanner}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🌱</Text>
            <Text style={styles.createTitle}>새 그룹을 만들어 보세요</Text>
            <Text style={styles.createSub}>관심사가 맞는 5명 이상 모이면{'\n'}그룹 + 채팅방을 자유롭게 생성</Text>
            <TouchableOpacity style={styles.createBtn}>
              <Text style={styles.createBtnText}>+ 그룹 만들기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ─── 그룹 탐색 탭 ─── */}
      {activeTab === 'explore' && (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <View style={styles.searchBox}>
            <Text style={styles.searchPlaceholder}>🔍 그룹 검색...</Text>
          </View>
          <Text style={styles.secTitle}>🔥 인기 그룹</Text>
          {EXPLORE_GROUPS.map(g => (
            <View key={g.name} style={styles.groupCard}>
              <View style={[styles.gBadge, { backgroundColor: g.bg }]}>
                <Text style={{ fontSize: 22 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gName}>{g.name}</Text>
                <Text style={styles.gMeta}>{g.meta}</Text>
              </View>
              <TouchableOpacity style={styles.joinBtn}><Text style={styles.joinBtnText}>가입</Text></TouchableOpacity>
            </View>
          ))}
          {/* 새 그룹 만들기 배너 */}
          <View style={styles.newGroupBanner}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🌱</Text>
            <Text style={styles.newGroupTitle}>원하는 그룹이 없으신가요?</Text>
            <Text style={styles.newGroupSub}>직접 그룹을 만드세요.{'\n'}5명 이상 모이면 채팅방도 자유롭게 생성</Text>
            <TouchableOpacity style={styles.newGroupBtn}>
              <Text style={styles.newGroupBtnText}>+ 새 그룹 만들기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <BottomTabBar navigation={navigation} activeTab="community" userId={userId} name={name} />
    </SafeAreaView>
  );
}

const BLUE = '#1565c0';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flex: 1 },

  /* Header */
  header: { backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#263238' },
  headerSub: { fontSize: 13, color: '#546e7a', fontWeight: '600', marginTop: 3 },
  writeBtn: { backgroundColor: BLUE, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  writeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Tabs */
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabText: { fontSize: 13, color: '#90a4ae', fontWeight: '600' },
  tabTextActive: { color: BLUE, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2, backgroundColor: BLUE, borderRadius: 1 },

  /* Category */
  catScroll: { maxHeight: 46, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
  catContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 7, flexDirection: 'row' },
  catChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f4f8' },
  catChipOn: { backgroundColor: BLUE },
  catText: { fontSize: 12, fontWeight: '600', color: '#607d8b' },
  catTextOn: { color: '#fff' },

  /* Hot box */
  hotBox: { margin: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  hotTitle: { fontSize: 13, fontWeight: '700', color: '#1a237e', marginBottom: 10 },
  hotItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  hotRank: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center' },
  hotRankText: { fontSize: 11, fontWeight: '800', color: BLUE },
  hotText: { flex: 1, fontSize: 12, color: '#37474f' },
  hotCnt: { fontSize: 11, color: '#90a4ae' },

  /* Post card */
  postCard: { backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18 },
  postAuthor: { fontSize: 13, fontWeight: '700', color: '#37474f' },
  postTime: { fontSize: 11, color: '#b0bec5' },
  groupTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  groupTagText: { fontSize: 10, fontWeight: '700' },
  postImg: { borderRadius: 10, height: 80, backgroundColor: '#f3e5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  postBody: { fontSize: 13, color: '#455a64', lineHeight: 20, marginBottom: 10 },
  postFooter: { flexDirection: 'row', gap: 16 },
  react: {},
  reactText: { fontSize: 12, color: '#90a4ae' },

  /* Group card */
  secTitle: { fontSize: 13, color: '#78909c', fontWeight: '700', marginBottom: 10 },
  groupCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  gBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  gName: { fontSize: 14, fontWeight: '700', color: '#263238', marginBottom: 2 },
  gMeta: { fontSize: 11, color: '#90a4ae' },
  newBadge: { backgroundColor: '#f44336', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  enterBtn: { backgroundColor: '#e3f2fd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  enterBtnText: { color: BLUE, fontSize: 11, fontWeight: '700' },

  /* Room list */
  roomList: { marginLeft: 20, marginBottom: 10 },
  roomCard: { backgroundColor: '#fff', borderRadius: 10, padding: 11, marginBottom: 5, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  roomDot: { width: 8, height: 8, borderRadius: 4 },
  roomName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#37474f' },
  roomCnt: { fontSize: 11, color: '#90a4ae' },

  /* Create banner */
  createBanner: { backgroundColor: '#e3f2fd', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 8 },
  createTitle: { fontSize: 15, fontWeight: '800', color: BLUE, marginBottom: 6 },
  createSub: { fontSize: 12, color: '#546e7a', textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  createBtn: { backgroundColor: BLUE, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Search */
  searchBox: { backgroundColor: '#f0f4f8', borderRadius: 12, padding: 12, marginBottom: 14 },
  searchPlaceholder: { fontSize: 13, color: '#90a4ae' },

  /* Join btn */
  joinBtn: { backgroundColor: BLUE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* New group banner */
  newGroupBanner: { backgroundColor: BLUE, borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 8 },
  newGroupTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 6 },
  newGroupSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  newGroupBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  newGroupBtnText: { color: BLUE, fontSize: 13, fontWeight: '800' },
});
