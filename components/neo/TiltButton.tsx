import React, { useState, useEffect } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { C, FACE, FONT } from '@/theme/neo';
import { tap } from '@/lib/tap';

export interface TiltButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TiltButton({
  children,
  onPress,
  disabled = false,
  style,
}: TiltButtonProps) {
  const [width, setWidth] = useState(0);
  const isPressed = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setWidth(w);
    }
  };

  useEffect(() => {
    // 2.8s cycle: 45% idle (1260ms), 55% sweep (1540ms) with ease-in-out
    shimmerProgress.value = withRepeat(
      withSequence(
        withDelay(
          1260,
          withTiming(1, { duration: 1540, easing: Easing.inOut(Easing.ease) })
        ),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const handlePressIn = () => {
    if (disabled) return;
    tap('medium');
    isPressed.value = withTiming(1, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    if (disabled) return;
    isPressed.value = withTiming(0, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  };

  const animatedSlabStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 400 },
        { rotateX: '18deg' },
        { translateY: 8 * isPressed.value },
      ],
    };
  });

  const animatedPlinthStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: 1 - 0.8 * isPressed.value }],
      opacity: 1 - 0.4 * isPressed.value,
    };
  });

  // ~15% of button width
  const shimmerWidth = width > 0 ? width * 0.15 : 55;
  const animatedShimmerStyle = useAnimatedStyle(() => {
    if (width === 0) return { opacity: 0 };
    const translateX = -shimmerWidth + (width + shimmerWidth * 2) * shimmerProgress.value;
    return {
      transform: [{ translateX }, { skewX: '-20deg' }],
    };
  });

  return (
    <View onLayout={onLayout} style={[styles.container, style]}>
      <Pressable
        disabled={disabled}
        onPress={() => {
          if (!disabled) onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        {/* Main Tilted Slab */}
        <Animated.View style={[styles.slab, animatedSlabStyle]}>
          {/* Shimmer sweep: sits above yellow, BELOW text */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBand,
              { width: shimmerWidth },
              animatedShimmerStyle,
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.55)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Text sits on TOP of shimmer */}
          {typeof children === 'string' ? (
            <Text numberOfLines={1} style={styles.text}>
              {children}
            </Text>
          ) : (
            children
          )}
        </Animated.View>

        {/* 10px Bottom Plinth */}
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.plinthWrapper,
              animatedPlinthStyle,
            ]}
          >
            <Svg width={width} height={10}>
              <Polygon
                points={`0,0 ${width},0 ${Math.max(0, width - 6)},10 6,10`}
                fill={FACE.poli.bottom}
              />
            </Svg>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 10,
  },
  pressable: {
    width: '100%',
  },
  slab: {
    height: 56,
    width: '100%',
    backgroundColor: C.poli,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FACE.poli.right,
  },
  text: {
    fontFamily: FONT.sansX,
    fontSize: 14,
    color: C.ink,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  shimmerBand: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: 0,
  },
  plinthWrapper: {
    width: '100%',
    height: 10,
    marginTop: -1,
  },
});
