import React, { useEffect } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';

interface ShimmerTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  shimmerColor?: string;
}

export function ShimmerText({ text, style }: ShimmerTextProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={style}>{text}</Text>
    </Animated.View>
  );
}
