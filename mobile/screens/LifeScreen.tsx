import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Dimensions,
} from 'react-native';
import BottomTabBar from '../components/BottomTabBar';

const { width } = Dimensions.get('window');

type Props = { route: any; navigation: any };

const GRID_ITEMS = [
  { icon: '🥗', title: '레시피', sub: '시니어 맞춤 건강 요리' },
  { icon: '🧘', title: '운동',   sub: '집에서 하는 가벼운 스트레칭' },
  { icon: '🧩', title: '치매예방\n두뇌게임', sub: '매일 10분 두뇌 트레이닝' },
  { icon: '🎭', title: '문화·공연', sub: '이번 주 추천 문화 행사' },
];

const LECTURES = [
  { icon: '⛳', title: '인터넷 골프 레슨', sub: '시니어를 위한 최적의 강의', color: '#388e3c' },
  { icon: '🤖', title: 'AI 인터넷 강의',   sub: '시니어를 위한 쉬운 강의',   color: '#1565c0' },
];

export default function LifeScreen({ route, navigation }: Props) {
  const { name = '회원', userId = 'demo-user' } = route?.params ?? {};

  return (
    <SafeAreaView style={styles.safe}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>즐거운 시니어 라이프</Text>
        <Text style={styles.headerTitle}>🌿 라이프</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ─── AI 히어로 배너 ─── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTag}><Text style={styles.heroTagText}>✈️ AI 여행 맞춤</Text></View>
          <Text style={styles.heroTitle}>봄 건강 여행</Text>
          <Text style={styles.heroSub}>경주 온천 1박 2일</Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>🌡 온천 치료  •  🍱 한식 건강식  •  🚌 편의 이동</Text>
          </View>
          <TouchableOpacity style={styles.heroBtn}>
            <Text style={styles.heroBtnText}>자세히 보기 →</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 섹션 제목 ─── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>라이프 스타일</Text>
          <TouchableOpacity><Text style={styles.sectionMore}>전체보기</Text></TouchableOpacity>
        </View>

        {/* ─── 2×2 그리드 ─── */}
        <View style={styles.grid}>
          {GRID_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={styles.gridCard} activeOpacity={0.82}>
              <Text style={styles.gridIcon}>{item.icon}</Text>
              <Text style={styles.gridTitle}>{item.title}</Text>
              <Text style={styles.gridSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── 인터넷 강의 ─── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>인터넷 강의</Text>
          <TouchableOpacity><Text style={styles.sectionMore}>전체보기</Text></TouchableOpacity>
        </View>

        {LECTURES.map((lec, i) => (
          <TouchableOpacity key={i} style={styles.lectureCard} activeOpacity={0.85}>
            <View style={[styles.lectureAccent, { backgroundColor: lec.color }]} />
            <View style={styles.lectureIconWrap}>
              <Text style={styles.lectureIcon}>{lec.icon}</Text>
            </View>
            <View style={styles.lectureText}>
              <Text style={styles.lectureTitle}>{lec.title}</Text>
              <Text style={styles.lectureSub}>{lec.sub}</Text>
            </View>
            <Text style={styles.lectureArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BottomTabBar navigation={navigation} activeTab="life" userId={userId} name={name} />
    </SafeAreaView>
  );
}

const GREEN = '#558b2f';
const GREEN_LIGHT = '#7cb342';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f1f8e9' },
  scroll: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  /* Hero Banner */
  heroBanner: {
    margin: 16, borderRadius: 18,
    backgroundColor: GREEN_LIGHT,
    padding: 20, overflow: 'hidden',
  },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  heroTagText:  { color: '#fff', fontSize: 11, fontWeight: '600' },
  heroTitle:    { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroSub:      { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 12 },
  heroMeta:     { backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: 8, marginBottom: 14 },
  heroMetaText: { color: '#fff', fontSize: 11 },
  heroBtn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  heroBtnText: { color: GREEN, fontWeight: '700', fontSize: 13 },

  /* Section header */
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2e7d32' },
  sectionMore:  { fontSize: 12, color: '#7cb342' },

  /* 2×2 Grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, gap: 10, marginBottom: 16 },
  gridCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    shadowColor: '#2e7d32', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 3,
  },
  gridIcon:  { fontSize: 28, marginBottom: 8 },
  gridTitle: { fontSize: 14, fontWeight: '700', color: '#2e7d32', marginBottom: 4 },
  gridSub:   { fontSize: 11, color: '#78909c', lineHeight: 15 },

  /* Lecture Cards */
  lectureCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
    elevation: 2,
  },
  lectureAccent: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
  lectureIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f1f8e9',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  lectureIcon:  { fontSize: 22 },
  lectureText:  { flex: 1 },
  lectureTitle: { fontSize: 14, fontWeight: '700', color: '#263238', marginBottom: 3 },
  lectureSub:   { fontSize: 12, color: '#78909c' },
  lectureArrow: { fontSize: 22, color: '#b0bec5', marginLeft: 8 },
});
