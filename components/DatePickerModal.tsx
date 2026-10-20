import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/lib/fonts';
import { haptic } from '@/src/design/tokens';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Returns an array of Date | null for the grid (7 equal columns)
function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push(null);

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  // Trailing empty cells to pad row to 7
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

// ── DatePickerModal (Calendar) ────────────────────────────────────────────────
export interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  allowFuture?: boolean;
  showClear?: boolean;
  onClear?: () => void;
}

export function DatePickerModal({
  visible,
  value,
  onConfirm,
  onClose,
  allowFuture = false,
  showClear = false,
  onClear,
}: DatePickerModalProps) {
  const today = startOfDay(new Date());

  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected] = useState<Date>(startOfDay(value));

  // Re-sync when modal opens
  useEffect(() => {
    if (visible) {
      const d = startOfDay(value);
      setSelected(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, value]);

  const goToPrev = () => {
    haptic('light');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNext = () => {
    if (!allowFuture) {
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextFirst = new Date(nextYear, nextMonth, 1);
      if (nextFirst > today) return;
    }

    haptic('light');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const isNextDisabled = !allowFuture && (() => {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    return new Date(nextYear, nextMonth, 1) > today;
  })();

  const grid = buildCalendarGrid(viewYear, viewMonth);

  const handleDayPress = (date: Date) => {
    if (!allowFuture && date > today) return;
    haptic('light');
    setSelected(date);
  };

  const handleConfirm = () => {
    haptic('light');
    onConfirm(selected);
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

        {/* Month / Year header */}
        <View style={styles.calHeader}>
          <Pressable onPress={goToPrev} style={styles.navBtn} hitSlop={12}>
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={styles.calTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <Pressable
            onPress={goToNext}
            style={[styles.navBtn, isNextDisabled && styles.navBtnDisabled]}
            hitSlop={12}
            disabled={isNextDisabled}
          >
            <Text style={[styles.navArrow, isNextDisabled && styles.navArrowDisabled]}>›</Text>
          </Pressable>
        </View>

        {/* Day of week labels */}
        <View style={styles.daysRow}>
          {DAY_LABELS.map(d => (
            <View key={d} style={styles.headerCell}>
              <Text style={styles.dayLabel}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {grid.map((date, idx) => {
            if (!date) {
              return <View key={`empty-${idx}`} style={styles.cellWrapper} />;
            }

            const isFuture = !allowFuture && date > today;
            const isToday = date.getTime() === today.getTime();
            const isSelected = date.getTime() === selected.getTime();

            return (
              <View key={date.toISOString()} style={styles.cellWrapper}>
                <Pressable
                  style={[
                    styles.cellInner,
                    isSelected && styles.cellSelected,
                    !isSelected && isToday && styles.cellToday,
                  ]}
                  onPress={() => handleDayPress(date)}
                  disabled={isFuture}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                      isToday && !isSelected && styles.cellTextToday,
                      isFuture && styles.cellTextFuture,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Selected date label + confirm */}
        <View style={styles.footer}>
          <Text style={styles.selectedLabel}>
            {selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.actions}>
            {showClear && onClear && (
              <Pressable
                style={styles.clearBtn}
                onPress={() => {
                  haptic('light');
                  onClear();
                }}
                hitSlop={8}
              >
                <Text style={styles.clearText}>CLEAR</Text>
              </Pressable>
            )}
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>CONFIRM</Text>
            </Pressable>
          </View>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: 2,
    borderTopColor: '#E3FF46',
    borderRadius: 0,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A3A',
    borderRadius: 0,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Month/year nav
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navArrow: {
    fontSize: 22,
    color: Colors.white,
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 26,
  },
  navArrowDisabled: {
    color: '#8A8A8A',
  },
  calTitle: {
    fontSize: 18,
    fontFamily: 'Fraunces_900Black',
    color: Colors.white,
    letterSpacing: 0,
  },

  // Day labels row
  daysRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  headerCell: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#8A8A8A',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  cellWrapper: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  cellSelected: {
    backgroundColor: '#E3FF46',
  },
  cellToday: {
    borderWidth: 1,
    borderColor: '#E3FF46',
  },
  cellText: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cellTextSelected: {
    color: '#0D0D0D',
    fontFamily: 'Manrope_700Bold',
  },
  cellTextToday: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  cellTextFuture: {
    color: '#3A3A3A',
  },

  // Footer
  footer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 14,
  },
  selectedLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#8A8A8A',
    letterSpacing: 1.5,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cancelText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#8A8A8A',
    letterSpacing: 1.5,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#E3FF46',
    borderRadius: 0,
  },
  confirmText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#0D0D0D',
    letterSpacing: 1.5,
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
