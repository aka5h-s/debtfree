import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { C } from '@/theme/neo';
import { Extruded } from './Extruded';
import { tap } from '@/lib/tap';

export interface BackButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function BackButton({ onPress, style }: BackButtonProps) {
  const handlePress = () => {
    tap('light');
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <Extruded
      depth={4}
      face="dark"
      bg={C.surface2}
      pressable
      onPress={handlePress}
      style={style}
      contentStyle={styles.buttonContent}
    >
      <ChevronLeft size={20} color={C.text} strokeWidth={2.5} />
    </Extruded>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
});
