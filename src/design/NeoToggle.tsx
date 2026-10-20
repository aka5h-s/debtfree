import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { haptic } from './tokens';

export interface NeoToggleProps {
  checked?: boolean;
  value?: boolean;
  onChange?: (checked: boolean) => void;
  onValueChange?: (val: boolean) => void;
  disabled?: boolean;
}

export function NeoToggle({
  checked,
  value,
  onChange,
  onValueChange,
  disabled = false,
}: NeoToggleProps) {
  const isChecked = Boolean(checked ?? value ?? false);
  const x = useRef(new Animated.Value(isChecked ? 18 : 0)).current;
  const trackAnim = useRef(new Animated.Value(isChecked ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, {
        toValue: isChecked ? 18 : 0,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(trackAnim, {
        toValue: isChecked ? 1 : 0,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isChecked]);

  const trackBg = trackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0A0A0A', '#B4EDD4'],
  });

  const handlePress = () => {
    if (disabled) return;
    haptic('light');
    const next = !isChecked;
    onChange?.(next);
    onValueChange?.(next);
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityState={{ checked: isChecked }}
      style={[
        styles.trackOuter,
        {
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Animated.View style={[styles.trackInner, { backgroundColor: trackBg }]}>
        <Animated.View
          style={[
            styles.knob,
            {
              backgroundColor: isChecked ? '#38B36F' : '#FFFFFF',
              borderColor: isChecked ? '#B4EDD4' : '#0A0A0A',
              transform: [{ translateX: x }],
            },
          ]}
        >
          <View
            style={[
              styles.mark,
              { backgroundColor: isChecked ? '#FFFFFF' : '#E0E0E0' },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trackOuter: {
    width: 40,
    height: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 0,
    overflow: 'hidden',
  },
  trackInner: {
    flex: 1,
    borderRadius: 0,
    justifyContent: 'center',
  },
  knob: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
});
