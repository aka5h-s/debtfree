import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { C, T } from './tokens';

export interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  isSearch?: boolean;
}

export function Field({
  label,
  error,
  containerStyle,
  isSearch = false,
  style,
  onFocus,
  onBlur,
  ...props
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error ? C.negative : focused ? C.primary : C.border,
            paddingLeft: isSearch ? 10 : 12,
          },
        ]}
      >
        {isSearch && (
          <Search size={16} color={C.mutedFg} style={{ marginRight: 8 }} />
        )}

        <TextInput
          placeholderTextColor={C.mutedFg}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  label: {
    ...T.caps,
    fontSize: 10,
    color: C.mutedFg,
    letterSpacing: 2.2,
  },
  inputContainer: {
    height: 48,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    ...T.body,
    fontSize: 14,
    color: C.foreground,
    padding: 0,
  },
  errorText: {
    ...T.body,
    fontSize: 11,
    color: C.negative,
    marginTop: 2,
  },
});
