import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, T, haptic } from './tokens';
import { NeoButton, ButtonVariant } from './NeoButton';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  variant?: ButtonVariant;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  style?: object;
}

export function Segmented<T extends string = string>({
  options,
  selectedId,
  onSelect,
  style,
}: SegmentedProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;

        if (isSelected) {
          return (
            <View key={opt.id} style={{ flex: 1 }}>
              <NeoButton
                label={opt.label}
                variant={opt.variant || 'white'}
                size="sm"
                fullWidth
                depth={2}
                onPress={() => onSelect(opt.id)}
              />
            </View>
          );
        }

        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              haptic('light');
              onSelect(opt.id);
            }}
            style={styles.unselectedItem}
          >
            <Text numberOfLines={1} style={styles.unselectedText}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 3,
    gap: 4,
  },
  unselectedItem: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unselectedText: {
    ...T.caps,
    fontSize: 11,
    color: C.mutedFg,
  },
});
