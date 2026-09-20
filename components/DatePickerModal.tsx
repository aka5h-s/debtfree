import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/lib/fonts';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function range(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// ── Wheel Column ──────────────────────────────────────────────────────────────
interface WheelColumnProps {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
}

function WheelColumn({ data, selectedIndex, onSelect, width }: WheelColumnProps) {
  const flatRef = useRef<FlatList<any>>(null);
  const scrolling = useRef(false);

  // Scroll to selected when it changes externally
  useEffect(() => {
    if (!scrolling.current && flatRef.current) {
      flatRef.current.scrollToOffset({ offset: selectedIndex * ITEM_HEIGHT, animated: false });
    }
  }, [selectedIndex]);

  const handleMomentumEnd = useCallback((e: any) => {
    scrolling.current = false;
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, data.length - 1));
    onSelect(clamped);
  }, [data.length, onSelect]);

  const handleScrollBegin = useCallback(() => {
    scrolling.current = true;
  }, []);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<string | number>) => {
    const isSelected = index === selectedIndex;
    return (
      <Pressable
        style={styles.wheelItem}
        onPress={() => {
          onSelect(index);
          flatRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
        }}
      >
        <Text
          style={[
            styles.wheelItemText,
            isSelected && styles.wheelItemSelected,
          ]}
          numberOfLines={1}
        >
          {String(item)}
        </Text>
      </Pressable>
    );
  }, [selectedIndex, onSelect]);

  return (
    <View style={[styles.wheelContainer, width ? { width } : { flex: 1 }]}>
      {/* Centre highlight bar */}
      <View style={styles.selectionBar} pointerEvents="none" />
      <FlatList
        ref={flatRef}
        data={data as any[]}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        style={{ height: PICKER_HEIGHT }}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={selectedIndex}
      />
    </View>
  );
}

// ── DatePickerModal ───────────────────────────────────────────────────────────
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
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate() - 1); // 0-indexed

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = range(1, daysInMonth);

  // Clamp day if needed when month/year changes
  const clampedDay = Math.min(selectedDay, daysInMonth - 1);

  // Re-sync when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedYear(value.getFullYear());
      setSelectedMonth(value.getMonth());
      setSelectedDay(value.getDate() - 1);
    }
  }, [visible]);

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth, clampedDay + 1, 12, 0, 0);
    const capped = date > today ? today : date;
    onConfirm(capped);
  };

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
          <WheelColumn
            data={days}
            selectedIndex={clampedDay}
            onSelect={setSelectedDay}
            width={56}
          />

          {/* Month */}
          <WheelColumn
            data={MONTHS}
            selectedIndex={selectedMonth}
            onSelect={setSelectedMonth}
          />

          {/* Year */}
          <WheelColumn
            data={years}
            selectedIndex={Math.max(0, years.indexOf(selectedYear))}
            onSelect={(idx) => setSelectedYear(years[idx])}
            width={72}
          />
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

// ── NoteModal ─────────────────────────────────────────────────────────────────
interface NoteModalProps {
  visible: boolean;
  note: string;
  onClose: () => void;
}

export function NoteModal({ visible, note, onClose }: NoteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.noteBackdrop} onPress={onClose} />
      <View style={styles.noteSheet}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle}>NOTE</Text>
          <Pressable onPress={onClose} style={styles.noteCloseBtn}>
            <Text style={styles.noteCloseText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.noteBody}>
          <Text style={styles.noteText} selectable>{note || '(no note)'}</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
    paddingHorizontal: 16,
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
    marginBottom: 12,
  },
  pickers: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  wheelContainer: {
    alignItems: 'center',
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(229, 254, 64, 0.07)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.18)',
    borderRadius: 6,
    zIndex: 1,
    pointerEvents: 'none',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wheelItemText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  wheelItemSelected: {
    color: Colors.white,
    fontSize: 16,
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
  // Note modal
  noteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  noteSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  noteTitle: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  noteCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  noteCloseText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  noteBody: {
    padding: 20,
  },
  noteText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
});
