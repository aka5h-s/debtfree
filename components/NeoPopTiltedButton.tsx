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
  const shimmerOpacity = useSharedValue(0);

  useEffect(() => {
    if (showShimmer) {
      shimmerOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1400 }),
        ),
        -1,
        false
      );
    }
  }, [showShimmer]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressed.value * 3 },
    ],
  }));

  const plunkStyle = useAnimatedStyle(() => ({
    height: Math.max(0, 5 - pressed.value * 4),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
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
          <Animated.View style={[styles.button, { backgroundColor: color }, buttonStyle]}>
            <View style={styles.content}>
              {children}
            </View>
            {showShimmer && (
              <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <View style={[styles.shimmerInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)' }]} />
              </Animated.View>
            )}
          </Animated.View>
          <Animated.View style={[styles.plunk, { backgroundColor: plunkColor }, plunkStyle]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  shadow: {
    position: 'absolute',
    bottom: -2,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: 2,
  },
  main: {
    width: '100%',
  },
  button: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  plunk: {
    height: 5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerInner: {
    flex: 1,
    width: '100%',
  },
});
