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
      { translateY: pressed.value * 2 },
    ],
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
      <Animated.View style={[styles.button, { backgroundColor: color, borderBottomColor: plunkColor, borderBottomWidth: 4 }, buttonStyle]}>
        <View style={styles.content}>
          {children}
        </View>
        {showShimmer && (
          <Animated.View style={[styles.shimmer, shimmerStyle]}>
            <View style={[styles.shimmerInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)' }]} />
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
