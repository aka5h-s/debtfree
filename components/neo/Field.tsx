import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Pressable,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { C, FONT } from '@/theme/neo';
import { Eyebrow } from './Eyebrow';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}

export function Field({
  label,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  error,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Eyebrow style={styles.label}>{label}</Eyebrow>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          Boolean(error) && styles.errorBorder,
          inputStyle,
        ]}
      >
        {LeftIcon && (
          <View style={styles.iconLeft}>
            <LeftIcon size={18} color={isFocused ? C.poli : C.muted} strokeWidth={2} />
          </View>
        )}

        <TextInput
          placeholderTextColor="rgba(154, 154, 154, 0.6)"
          selectionColor={C.poli}
          cursorColor={C.poli}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
          {...rest}
        />

        {RightIcon && (
          <Pressable
            disabled={!onRightIconPress}
            onPress={onRightIconPress}
            style={styles.iconRight}
          >
            <RightIcon size={18} color={C.muted} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    height: 56,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  focused: {
    borderColor: C.poli,
  },
  errorBorder: {
    borderColor: C.red,
  },
  input: {
    flex: 1,
    height: '100%',
    color: C.text,
    fontFamily: FONT.sansBold,
    fontSize: 15,
    padding: 0,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
    padding: 4,
  },
  errorText: {
    marginTop: 4,
    color: C.red,
    fontFamily: FONT.sansBold,
    fontSize: 12,
  },
});
