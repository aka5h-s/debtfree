import React, { useState } from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { C, FACE, DEPTH, haptic } from './tokens';

export interface NeoCardProps {
  face?: keyof typeof FACE;
  depth?: number;
  press?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function NeoCard({
  face = 'dark',
  depth = DEPTH.normal,
  press,
  onPress,
  style,
  containerStyle,
  children,
}: NeoCardProps) {
  const [s, setS] = useState({ w: 0, h: 0 });
  const p = useSharedValue(0); // 0 = up, 1 = pressed
  const f = FACE[face] || FACE.dark;

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.value * depth },
      { translateY: p.value * depth },
    ],
  }));

  const faces = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
  }));

  const inner = (
    <View style={[{ paddingRight: depth, paddingBottom: depth }, containerStyle]}>
      {s.w > 0 && s.h > 0 && (
        <Animated.View
          style={[{ position: 'absolute', left: 0, top: 0 }, faces]}
          pointerEvents="none"
        >
          <Svg width={s.w + depth} height={s.h + depth}>
            <Polygon
              points={`${s.w},0 ${s.w + depth},${depth} ${s.w + depth},${s.h + depth} ${s.w},${s.h}`}
              fill={f.r}
            />
            <Polygon
              points={`0,${s.h} ${s.w},${s.h} ${s.w + depth},${s.h + depth} ${depth},${s.h + depth}`}
              fill={f.b}
            />
          </Svg>
        </Animated.View>
      )}
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== s.w || height !== s.h) {
            setS({ w: width, h: height });
          }
        }}
        style={[
          {
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
          },
          style,
          body,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );

  if (!press && !onPress) return inner;

  return (
    <Pressable
      onPressIn={() => {
        haptic('light');
        p.value = withTiming(1, { duration: 120 });
      }}
      onPressOut={() => {
        p.value = withTiming(0, { duration: 120 });
      }}
      onPress={onPress}
    >
      {inner}
    </Pressable>
  );
}
