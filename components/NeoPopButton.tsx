import React, { useRef } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface NeoPopButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  depth?: number;
}

export function NeoPopButton({ onPress, children, variant = 'primary', disabled = false, depth = 3 }: NeoPopButtonProps) {
  const pressed = useSharedValue(0);

  const colors = {
    primary: { bg: Colors.white, rightShadow: '#CCCCCC', bottomShadow: '#999999' },
    secondary: { bg: Colors.surface, rightShadow: Colors.accentDark, bottomShadow: Colors.accentDarker },
    danger: { bg: '#2E0A0A', rightShadow: '#661111', bottomShadow: '#441111' },
  };

  const c = colors[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * depth * 0.5 },
      { translateY: pressed.value * depth * 0.5 },
    ],
  }));

  const rightShadowStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.8,
  }));

  const bottomShadowStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.8,
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.rightShadow, { backgroundColor: c.rightShadow, width: depth }, rightShadowStyle]} />
        <Animated.View style={[styles.bottomShadow, { backgroundColor: c.bottomShadow, height: depth }, bottomShadowStyle]} />
        <Animated.View style={[
          styles.button,
          { backgroundColor: c.bg },
          variant === 'secondary' && { borderWidth: 0.5, borderColor: Colors.borderGreen },
          variant === 'danger' && { borderWidth: 0.5, borderColor: Colors.negative },
          animatedStyle,
        ]}>
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    marginRight: 3,
  },
  button: {
    position: 'relative',
    zIndex: 2,
  },
  rightShadow: {
    position: 'absolute',
    right: -3,
    top: 3,
    bottom: 0,
    zIndex: 1,
  },
  bottomShadow: {
    position: 'absolute',
    left: 3,
    bottom: -3,
    right: 0,
    zIndex: 1,
  },
});
