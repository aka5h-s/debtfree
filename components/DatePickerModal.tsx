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

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Returns an array of Date | null for the grid (6 weeks × 7 days)
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

  // Trailing empty cells to fill 6 rows
  while (cells.length < 42) cells.push(null);

  return cells;
}

// ── DatePickerModal (Calendar) ────────────────────────────────────────────────
interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, value, onConfirm, onClose }: DatePickerModalProps) {
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
  }, [visible]);

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNext = () => {
    // Don't allow navigating past current month
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextFirst = new Date(nextYear, nextMonth, 1);
    if (nextFirst > today) return;

    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const isNextDisabled = (() => {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    return new Date(nextYear, nextMonth, 1) > today;
  })();

  const grid = buildCalendarGrid(viewYear, viewMonth);

  const handleDayPress = (date: Date) => {
    if (date > today) return; // no future dates
    setSelected(date);
  };

  const handleConfirm = () => {
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
        <View style={styles.dayLabels}>
          {DAY_LABELS.map(d => (
            <Text key={d} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {grid.map((date, idx) => {
            if (!date) {
              return <View key={`empty-${idx}`} style={styles.cell} />;
            }

            const isFuture = date > today;
            const isToday = date.getTime() === today.getTime();
            const isSelected = date.getTime() === selected.getTime();

            return (
              <Pressable
                key={date.toISOString()}
                style={[
                  styles.cell,
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
            );
          })}
        </View>

        {/* Selected date label + confirm */}
        <View style={styles.footer}>
          <Text style={styles.selectedLabel}>
            {selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.actions}>
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
const CELL_SIZE = 44;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontFamily: Fonts.semibold,
    lineHeight: 26,
  },
  navArrowDisabled: {
    color: Colors.textMuted,
  },
  calTitle: {
    fontSize: 17,
    fontFamily: Fonts.serif,
    color: Colors.white,
    letterSpacing: 0.5,
  },

  // Day labels row
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
    marginVertical: 2,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  cellText: {
    fontSize: 16,
    fontFamily: Fonts.serif,
    color: Colors.textSecondary,
  },
  cellTextSelected: {
    color: '#000',
    fontFamily: Fonts.serif,
  },
  cellTextToday: {
    color: Colors.primary,
    fontFamily: Fonts.serif,
  },
  cellTextFuture: {
    color: Colors.border,
  },

  // Footer
  footer: {
    marginTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  selectedLabel: {
    fontSize: 15,
    fontFamily: Fonts.serif,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
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
