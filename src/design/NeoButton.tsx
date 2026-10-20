import React from 'react';
import { Text, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { NeoCard } from './NeoCard';
import { C, FACE, DEPTH } from './tokens';

export type ButtonVariant = 'poli' | 'white' | 'dark' | 'green' | 'red';
export type ButtonSize = 'sm' | 'md' | 'chip';

export interface NeoButtonProps {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  onPress?: () => void;
  fullWidth?: boolean;
  depth?: number;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function NeoButton({
  label,
  variant = 'poli',
  size = 'md',
  icon,
  onPress,
  fullWidth = false,
  depth,
  style,
  labelStyle,
  containerStyle,
  disabled = false,
}: NeoButtonProps) {
  const getBg = () => {
    switch (variant) {
      case 'poli':
        return C.primary;
      case 'white':
        return C.foreground;
      case 'dark':
        return C.surface2;
      case 'green':
        return C.positive;
      case 'red':
        return C.negative;
      default:
        return C.primary;
    }
  };

  const getFace = (): keyof typeof FACE => {
    switch (variant) {
      case 'poli':
        return 'poli';
      case 'white':
        return 'white';
      case 'dark':
        return 'dark';
      case 'green':
        return 'green';
      case 'red':
        return 'red';
      default:
        return 'poli';
    }
  };

  const getTextColor = () => {
    if (variant === 'poli' || variant === 'white' || variant === 'green') {
      return C.background;
    }
    return C.foreground;
  };

  const getHeight = () => {
    if (size === 'chip') return 32;
    if (size === 'sm') return 36;
    return 48;
  };

  const getTextSize = () => {
    if (size === 'chip') return 10;
    if (size === 'sm') return 12;
    return 13;
  };

  const resolvedDepth = depth !== undefined ? depth : (size === 'chip' ? 3 : DEPTH.normal);

  return (
    <NeoCard
      face={getFace()}
      depth={resolvedDepth}
      press={!disabled}
      onPress={disabled ? undefined : onPress}
      containerStyle={fullWidth ? [{ width: '100%' }, containerStyle] : containerStyle}
      style={[
        {
          height: getHeight(),
          backgroundColor: getBg(),
          paddingHorizontal: size === 'chip' ? 12 : (label ? 16 : 8),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'dark' ? 1 : 0,
          borderColor: C.border,
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: label ? 8 : 0 }}>
        {icon}
        {label ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[
              {
                fontFamily: 'Manrope_800ExtraBold',
                fontSize: getTextSize(),
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: getTextColor(),
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </NeoCard>
  );
}
