import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { C } from '@/theme/neo';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 20,
  style,
}: SkeletonProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setContainerWidth(w);
    }
  };

  const bandWidth = containerWidth > 0 ? containerWidth * 0.5 : 80;
  const animatedBandStyle = useAnimatedStyle(() => {
    if (containerWidth === 0) return { opacity: 0 };
    const translateX = -bandWidth + (containerWidth + bandWidth * 2) * progress.value;
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.skeleton,
        { width: width as any, height },
        style,
      ]}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.band,
            { width: bandWidth },
            animatedBandStyle,
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.06)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 0,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});
