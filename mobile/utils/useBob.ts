import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export function useBob(distance = 6, duration = 1750) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -distance, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0,         duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return y;
}
