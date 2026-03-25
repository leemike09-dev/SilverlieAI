import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function IntroScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 페이드 인
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start(() => {
      // 1.5초 유지 후 페이드 아웃
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          navigation.replace('Login');
        });
      }, 1500);
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/intro-bg.JPG')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>안녕하세요!</Text>
        <Text style={styles.tagline}>당신의 건강을 함께 돌봅니다</Text>
        <Text style={styles.appName}>Silver Life AI</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  bgImage: {
    position: 'absolute',
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    width,
    height,
    backgroundColor: 'rgba(0, 60, 90, 0.45)',
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 22,
    color: '#e8f4f8',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  appName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
  },
});
