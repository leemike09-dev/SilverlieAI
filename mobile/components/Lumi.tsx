import React from 'react';
import { Animated, StyleProp, ImageStyle } from 'react-native';
import { useBob } from '../utils/useBob';

export type LumiMood = 'happy' | 'worried' | 'content' | 'focused';

const IMAGES: Record<LumiMood, any> = {
  happy:   require('../assets/lumi-happy.png'),
  worried: require('../assets/lumi-worried.png'),
  content: require('../assets/lumi-content.png'),
  focused: require('../assets/lumi-focused.png'),
};

interface LumiProps {
  mood?: LumiMood;
  size?: number;
  bob?: boolean;
  style?: StyleProp<ImageStyle>;
}

export default function Lumi({ mood = 'happy', size = 120, bob = true, style }: LumiProps) {
  const bobY = useBob();
  return (
    <Animated.Image
      source={IMAGES[mood]}
      style={[
        { width: size, height: size, resizeMode: 'contain' },
        style,
        bob ? { transform: [{ translateY: bobY }] } : undefined,
      ]}
    />
  );
}
