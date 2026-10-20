import React, { useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { C, FACE, FONT, FaceVariant } from '@/theme/neo';
import { Extruded } from './Extruded';
import { tap } from '@/lib/tap';

export type NeoButtonVariant = 'poli' | 'white' | 'dark' | 'green' | 'red' | 'ghost';
export type NeoButtonSize = 'sm' | 'md' | 'lg';

export interface NeoButtonProps {
  variant?: NeoButtonVariant;
  size?: NeoButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
  onPress?: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function NeoButton({
  variant = 'poli',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  children,
  onPress,
  fullWidth = false,
  disabled = false,
  style,
}: NeoButtonProps) {
  const [ghostPressed, setGhostPressed] = useState(false);

  if (variant === 'ghost') {
    return (
      <Pressable
        disabled={disabled}
        onPress={() => {
          tap('light');
          onPress?.();
        }}
        onPressIn={() => setGhostPressed(true)}
        onPressOut={() => setGhostPressed(false)}
        style={[
          styles.ghost,
          fullWidth && { width: '100%', alignItems: 'center' },
          style,
        ]}
      >
        <View style={styles.contentRow}>
          {Icon && iconPosition === 'left' && (
            <Icon
              size={16}
              color={ghostPressed ? C.text : C.muted}
              strokeWidth={2.5}
            />
          )}
          {typeof children === 'string' ? (
            <Text
              style={[
                styles.ghostText,
                { color: ghostPressed ? C.text : C.muted },
                disabled && { color: '#666' },
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {Icon && iconPosition === 'right' && (
            <Icon
              size={16}
              color={ghostPressed ? C.text : C.muted}
              strokeWidth={2.5}
            />
          )}
        </View>
      </Pressable>
    );
  }

  const height = size === 'sm' ? 36 : size === 'md' ? 48 : 56;
  const paddingHorizontal = size === 'sm' ? 12 : 20;
  const fontSize = size === 'sm' ? 11 : 13;

  let bg: string = C.poli;
  let face: FaceVariant = 'poli';
  let textColor: string = C.ink;

  switch (variant) {
    case 'poli':
      bg = C.poli;
      face = 'poli';
      textColor = C.ink;
      break;
    case 'white':
      bg = C.white;
      face = 'white';
      textColor = C.ink;
      break;
    case 'dark':
      bg = C.surface2;
      face = 'dark';
      textColor = C.text;
      break;
    case 'green':
      bg = C.green;
      face = 'green';
      textColor = C.ink;
      break;
    case 'red':
      bg = C.red;
      face = 'red';
      textColor = C.white;
      break;
  }

  const iconColor = disabled ? '#666666' : textColor;

  return (
    <Extruded
      depth={4}
      face={face}
      bg={bg}
      pressable={!disabled}
      disabled={disabled}
      onPress={() => {
        tap('light');
        onPress?.();
      }}
      style={[
        fullWidth && { width: '100%' },
        style,
      ]}
      contentStyle={[
        styles.buttonContent,
        {
          height,
          paddingHorizontal,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {Icon && iconPosition === 'left' && (
          <Icon size={18} color={iconColor} strokeWidth={2.5} />
        )}
        {typeof children === 'string' ? (
          <Text
            numberOfLines={1}
            style={[
              styles.buttonText,
              {
                fontSize,
                color: disabled ? '#666666' : textColor,
              },
            ]}
          >
            {children}
          </Text>
        ) : (
          children
        )}
        {Icon && iconPosition === 'right' && (
          <Icon size={18} color={iconColor} strokeWidth={2.5} />
        )}
      </View>
    </Extruded>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontFamily: FONT.sansX,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  ghost: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  ghostText: {
    fontFamily: FONT.sansX,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
});
