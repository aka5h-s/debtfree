import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { NeoButton, NeoButtonVariant } from './NeoButton';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  tone?: 'pos' | 'neg' | 'default';
  icon?: LucideIcon;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  style,
}: SegmentedProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        let variant: NeoButtonVariant = 'dark';

        if (isSelected) {
          if (opt.tone === 'pos') variant = 'green';
          else if (opt.tone === 'neg') variant = 'red';
          else variant = 'white';
        }

        return (
          <View key={opt.value} style={styles.buttonWrapper}>
            <NeoButton
              size="sm"
              variant={variant}
              icon={opt.icon}
              onPress={() => onChange(opt.value)}
              fullWidth
            >
              {opt.label}
            </NeoButton>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
  },
});
