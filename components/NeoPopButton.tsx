import React from 'react';
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
    primary: { bg: Colors.white, border: '#CCCCCC' },
    secondary: { bg: Colors.surface, border: Colors.borderGreen },
    danger: { bg: '#2E0A0A', border: Colors.negative },
  };

  const c = colors[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * depth * 0.5 },
      { translateY: pressed.value * depth * 0.5 },
    ],
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
        <Animated.View style={[
          styles.button,
          {
            backgroundColor: c.bg,
            borderWidth: 0.5,
            borderColor: c.border,
            borderRightWidth: depth,
            borderBottomWidth: depth,
            borderRightColor: c.border,
            borderBottomColor: c.border,
          },
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
    overflow: 'hidden',
  },
  button: {
    zIndex: 2,
  },
});
