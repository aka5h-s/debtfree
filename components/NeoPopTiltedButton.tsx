import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface NeoPopTiltedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  color?: string;
  plunkColor?: string;
  showShimmer?: boolean;
  disabled?: boolean;
}

export function NeoPopTiltedButton({
  onPress, children, color = Colors.primary, plunkColor = Colors.primaryDark,
  showShimmer = true, disabled = false,
}: NeoPopTiltedButtonProps) {
  const pressed = useSharedValue(0);
  const shimmerX = useSharedValue(-1);

  useEffect(() => {
    if (showShimmer) {
      shimmerX.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 0 }),
          withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 1500 }),
        ),
        -1,
        false
      );
    }
  }, [showShimmer]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { skewY: '-2deg' as any },
      { translateY: pressed.value * 2 },
    ],
  }));

  const plunkStyle = useAnimatedStyle(() => ({
    height: Math.max(0, 6 - pressed.value * 4),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value * 200 }],
    opacity: 0.3,
  }));

  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: 80 });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    pressed.value = withTiming(0, { duration: 120 });
  };

  const isDark = color === Colors.background || color === '#0D0D0D';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View style={styles.wrapper}>
        <Animated.View style={[styles.shadow, { backgroundColor: Colors.shadow }]} />
        <View style={styles.main}>
          <Animated.View style={[styles.button, { backgroundColor: color, transform: [{ skewY: '-2deg' }] }, buttonStyle]}>
            <View style={styles.content}>
              {children}
            </View>
            {showShimmer && (
              <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <View style={[styles.shimmerInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]} />
              </Animated.View>
            )}
          </Animated.View>
          <Animated.View style={[styles.plunk, { backgroundColor: plunkColor, transform: [{ skewY: '-2deg' }] }, plunkStyle]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: -2,
    left: 4,
    right: 4,
    height: 8,
    borderRadius: 2,
    transform: [{ skewY: '-2deg' }],
  },
  main: {
    width: '100%',
  },
  button: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  plunk: {
    height: 6,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 60,
  },
  shimmerInner: {
    flex: 1,
    width: '100%',
  },
});
