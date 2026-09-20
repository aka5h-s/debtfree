import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/lib/fonts';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function range(start: number, end: number): number[] {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

interface WheelPickerProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function WheelPicker({ items, selectedIndex, onSelect }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (scrollRef.current && !initialized) {
      scrollRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current && initialized) {
      scrollRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true });
    }
  }, [selectedIndex]);

  const handleScroll = (y: number) => {
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (clamped !== selectedIndex) {
      onSelect(clamped);
    }
  };

  return (
    <View style={styles.wheelContainer}>
      {/* Selection highlight */}
      <View style={styles.selectionBar} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        style={{ height: PICKER_HEIGHT }}
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Pressable
              key={`${item}-${idx}`}
              style={styles.wheelItem}
              onPress={() => {
                onSelect(idx);
                scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              }}
            >
              <Text style={[styles.wheelItemText, isSelected && styles.wheelItemSelected]}>
                {String(item).padStart(typeof item === 'number' ? 2 : 0, '0')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, value, onConfirm, onClose }: DatePickerModalProps) {
  const today = new Date();
  const minYear = today.getFullYear() - 10;
  const maxYear = today.getFullYear();
  const years = range(minYear, maxYear);

  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(value.getDate() - 1); // 0-indexed

  // Recalculate valid days when month/year changes
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = range(1, daysInMonth);

  // Clamp day if needed
  useEffect(() => {
    if (selectedDay >= daysInMonth) {
      setSelectedDay(daysInMonth - 1);
    }
  }, [selectedMonth, selectedYear, daysInMonth]);

  const handleConfirm = () => {
    const d = selectedDay < daysInMonth ? selectedDay : daysInMonth - 1;
    const date = new Date(selectedYear, selectedMonth, d + 1);
    // Don't allow future dates
    const capped = date > today ? today : date;
    onConfirm(capped);
  };

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedYear(value.getFullYear());
      setSelectedMonth(value.getMonth());
      setSelectedDay(value.getDate() - 1);
    }
  }, [visible]);

  const yearIndex = years.indexOf(selectedYear);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>SELECT DATE</Text>

        <View style={styles.pickers}>
          {/* Day */}
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>DAY</Text>
            <WheelPicker
              items={days}
              selectedIndex={Math.min(selectedDay, daysInMonth - 1)}
              onSelect={setSelectedDay}
            />
          </View>

          {/* Month */}
          <View style={[styles.pickerColumn, { flex: 2 }]}>
            <Text style={styles.pickerLabel}>MONTH</Text>
            <WheelPicker
              items={MONTHS}
              selectedIndex={selectedMonth}
              onSelect={setSelectedMonth}
            />
          </View>

          {/* Year */}
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>YEAR</Text>
            <WheelPicker
              items={years}
              selectedIndex={yearIndex >= 0 ? yearIndex : years.length - 1}
              onSelect={(idx) => setSelectedYear(years[idx])}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>CONFIRM</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  pickers: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 9,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  wheelContainer: {
    position: 'relative',
    width: '100%',
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(229, 254, 64, 0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.2)',
    borderRadius: 6,
    zIndex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  wheelItemSelected: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
});
