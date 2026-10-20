import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { C, FONT } from '@/theme/neo';

export interface TextShimmerProps {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextShimmer({
  text,
  style,
  containerStyle,
}: TextShimmerProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, {
        duration: 3500,
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

  const bandWidth = 36;
  const animatedWindowStyle = useAnimatedStyle(() => {
    if (containerWidth === 0) return { opacity: 0 };
    const translateX = -bandWidth + (containerWidth + bandWidth * 2) * shimmerProgress.value;
    return {
      transform: [{ translateX }],
    };
  });

  const animatedInnerTextStyle = useAnimatedStyle(() => {
    if (containerWidth === 0) return {};
    const translateX = -bandWidth + (containerWidth + bandWidth * 2) * shimmerProgress.value;
    return {
      transform: [{ translateX: -translateX }],
    };
  });

  return (
    <View onLayout={onLayout} style={[styles.container, containerStyle]}>
      {/* Base Text in White */}
      <Text style={[styles.baseText, style]}>
        {text.toUpperCase()}
      </Text>

      {/* Sweeping Poli Band */}
      {containerWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerWindow,
            { width: bandWidth },
            animatedWindowStyle,
          ]}
        >
          <Animated.Text
            style={[
              styles.baseText,
              style,
              styles.poliText,
              { width: containerWidth },
              animatedInnerTextStyle,
            ]}
          >
            {text.toUpperCase()}
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  baseText: {
    fontFamily: FONT.sansX,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.2,
    color: C.white,
    textTransform: 'uppercase',
  },
  shimmerWindow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  poliText: {
    color: C.poli,
  },
});
