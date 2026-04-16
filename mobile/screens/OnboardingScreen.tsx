import React, { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Platform,
} from 'react-native';

const { width } = Dimensions.get('window');
type Props = { navigation: any };

const SLIDES = [
  {
    icon: '👪',
    title: '자녀가 부모님 건강을\n걱정하고 있지 않나요?',
    desc: '가족이 언제든 건강 상태와\n동선을 확인할 수 있어요',
    color: '#1A4A8A',
  },
  {
    icon: '🚨',
    title: '혼자 있을 때\n갑자기 아프면 어떡하죠?',
    desc: 'SOS 한 번으로 119와\n가족에게 즉시 연락돼요',
    color: '#D32F2F',
  },
  {
    icon: '💊',
    title: '약 먹는 시간\n자주 잊으시나요?',
    desc: '복약 시간을 알려드리고\n가족에게도 전달해요',
    color: '#2E7D32',
  },
  {
    icon: '🐝',
    title: '이제 걱정 마세요\nSilver Life AI가 함께합니다',
    desc: '꿀비가 매일 건강을\n지켜드릴게요',
    color: '#7B1FA2',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goNext = async () => {
    if (idx < SLIDES.length - 1) {
      const next = idx + 1;
      setIdx(next);
      scrollRef.current?.scrollTo({ x: width * next, animated: true });
    } else {
      await AsyncStorage.setItem('onboarding_seen', 'true');
      navigation.replace('Login');
    }
  };

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    setIdx(Math.round(x / width));
  };

  const slide = SLIDES[idx];

  return (
    <View style={s.root}>

      {/* 슬라이드 영역 */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}>
        {SLIDES.map((sl, i) => (
          <View key={i} style={[s.slide, { width }]}>
            <View style={[s.iconWrap, { backgroundColor: sl.color + '18' }]}>
              <Text style={s.icon}>{sl.icon}</Text>
            </View>
            <Text style={[s.title, { color: sl.color }]}>{sl.title}</Text>
            <Text style={s.desc}>{sl.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 하단 영역 */}
      <View style={s.bottom}>
        {/* 점 인디케이터 */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === idx && { ...s.dotOn, backgroundColor: slide.color }]} />
          ))}
        </View>

        {/* 다음 버튼 */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: slide.color }]}
          onPress={goNext} activeOpacity={0.85}>
          <Text style={s.btnTxt}>{idx < SLIDES.length - 1 ? '다음' : '시작하기'}</Text>
        </TouchableOpacity>

        {/* 건너뛰기 */}
        {idx < SLIDES.length - 1 && (
          <TouchableOpacity onPress={async () => { await AsyncStorage.setItem('onboarding_seen', 'true'); navigation.replace('Login'); }}>
            <Text style={s.skip}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#fff' },
  slide: { alignItems: 'center', justifyContent: 'center', padding: 32 },

  iconWrap: { width: 160, height: 160, borderRadius: 80,
              alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  icon:  { fontSize: 80 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  desc:  { fontSize: 20, color: '#555', textAlign: 'center', lineHeight: 32 },

  bottom: { padding: 24, paddingBottom: 36, alignItems: 'center', gap: 16 },
  dots:   { flexDirection: 'row', gap: 8 },
  dot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0E4F7' },
  dotOn:  { width: 26, borderRadius: 5 },

  btn:    { width: '100%', paddingVertical: 20, borderRadius: 22, alignItems: 'center' },
  btnTxt: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  skip:   { fontSize: 16, color: '#B0BEC5', textDecorationLine: 'underline' },
});
