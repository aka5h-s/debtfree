import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import { C, FONT } from '@/theme/neo';
import {
  BackButton,
  NeoCard,
  NeoButton,
  TiltButton,
  Eyebrow,
  Field,
  Sheet,
  ConfirmModal,
  DotGrid,
  Extruded,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';
import { DatePickerModal } from '@/components/DatePickerModal';
import { tap } from '@/lib/tap';
import type { Transaction, TransactionHistory } from '@/lib/types';

function formatDateDisplay(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatHistoryDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `changed ${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

function formatHistoryAmount(amount: number, direction: 'YOU_LENT' | 'YOU_BORROWED'): { text: string; color: string } {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
  if (direction === 'YOU_LENT') {
    return { text: `+₹${formatted}`, color: '#06C270' };
  } else {
    return { text: `−₹${formatted}`, color: '#EE4D37' };
  }
}

function formatLedgerDate(date: number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    people,
    getPersonTransactions,
    getPersonBalance,
    addTransaction,
    updateTransaction,
    removeTransaction,
    updatePerson,
    removePerson,
    getTransactionHistory,
  } = useData();

  const person = people.find((p) => p.id === id);
  const transactions = useMemo(
    () => (person ? getPersonTransactions(person.id) : []),
    [person, getPersonTransactions]
  );
  const balance = person ? getPersonBalance(person.id) : 0;

  // New / Edit Entry Sheet state
  const [showEntrySheet, setShowEntrySheet] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txDirection, setTxDirection] = useState<'YOU_LENT' | 'YOU_BORROWED'>('YOU_LENT');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [entryReturnDate, setEntryReturnDate] = useState<Date | null>(null);
  const [submittingTx, setSubmittingTx] = useState(false);
  const [savingEditTx, setSavingEditTx] = useState(false);

  // Edit history state
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<TransactionHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // DatePicker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickingDateType, setPickingDateType] = useState<'date' | 'returnDate'>('date');

  // Edit Person Sheet state
  const [showEditPersonSheet, setShowEditPersonSheet] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingPerson, setSavingPerson] = useState(false);

  // Confirm delete dialogs
  const [showDeletePersonModal, setShowDeletePersonModal] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);

  if (!person) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) + 16 }]}>
        <BackButton />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Person not found</Text>
        </View>
      </View>
    );
  }

  // Open New Entry sheet
  const openNewEntrySheet = (direction: 'YOU_LENT' | 'YOU_BORROWED' = 'YOU_LENT') => {
    tap('light');
    setEditingTx(null);
    setTxDirection(direction);
    setTxAmount('');
    setTxNote('');
    setEntryDate(new Date());
    setEntryReturnDate(null);
    setShowHistory(false);
    setHistoryList([]);
    setLoadingHistory(false);
    setShowEntrySheet(true);
  };

  // Open Edit Entry sheet
  const openEditEntrySheet = (tx: Transaction) => {
    tap('light');
    setEditingTx(tx);
    setTxDirection(tx.direction);
    setTxAmount(tx.amount.toString());
    setTxNote(tx.note || '');
    setEntryDate(new Date(tx.date));
    setEntryReturnDate(tx.returnDate ? new Date(tx.returnDate) : null);
    setShowHistory(false);
    setHistoryList([]);
    setLoadingHistory(false);
    setShowEntrySheet(true);
  };

  const handleOpenHistory = async () => {
    tap('light');
    setShowHistory(true);
    if (!editingTx) return;
    setLoadingHistory(true);
    try {
      const hist = await getTransactionHistory(editingTx.id);
      setHistoryList(hist);
    } catch {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!editingTx) return;
    tap('medium');
    try {
      await removeTransaction(editingTx.id);
      setShowEntrySheet(false);
      setEditingTx(null);
      showToast('Entry moved to trash');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete');
    }
  };

  const handleSaveEntry = async () => {
    const num = parseFloat(txAmount);
    if (!num || num <= 0) {
      showToast('Enter a valid amount');
      return;
    }

    if (editingTx) {
      setSavingEditTx(true);
      try {
        await updateTransaction(
          editingTx,
          num,
          txDirection,
          txNote.trim(),
          entryDate.getTime(),
          entryReturnDate ? entryReturnDate.getTime() : null
        );
        setShowEntrySheet(false);
        setEditingTx(null);
        showToast('Transaction updated');
      } catch (e: any) {
        showToast(e.message || 'Failed to update transaction');
      } finally {
        setSavingEditTx(false);
      }
    } else {
      setSubmittingTx(true);
      try {
        await addTransaction(
          person.id,
          num,
          txDirection,
          txNote.trim(),
          entryDate.getTime(),
          entryReturnDate ? entryReturnDate.getTime() : null
        );
        setShowEntrySheet(false);
        setTxAmount('');
        setTxNote('');
        showToast('Transaction added');
      } catch (e: any) {
        showToast(e.message || 'Failed to add transaction');
      } finally {
        setSubmittingTx(false);
      }
    }
  };

  const handleDeleteTxConfirm = async () => {
    if (!deleteTxId) return;
    try {
      await removeTransaction(deleteTxId);
      if (editingTx?.id === deleteTxId) {
        setShowEntrySheet(false);
        setEditingTx(null);
      }
      setDeleteTxId(null);
      showToast('Transaction deleted');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete');
    }
  };

  const handleSettleUp = async () => {
    if (balance === 0) return;
    const absAmount = Math.abs(balance);
    const settleDirection = balance > 0 ? 'YOU_BORROWED' : 'YOU_LENT';
    try {
      await addTransaction(person.id, absAmount, settleDirection, 'Settle up');
      showToast('Balance settled up!');
    } catch (e: any) {
      showToast(e.message || 'Failed to settle');
    }
  };

  const handleSavePerson = async () => {
    if (!editName.trim()) {
      showToast('Name is required');
      return;
    }
    setSavingPerson(true);
    try {
      await updatePerson({
        ...person,
        name: editName.trim(),
        phone: editPhone.trim(),
        notes: editNotes.trim(),
      });
      setShowEditPersonSheet(false);
      showToast('Person updated');
    } catch (e: any) {
      showToast(e.message || 'Failed to update person');
    } finally {
      setSavingPerson(false);
    }
  };

  const handleDeletePersonConfirm = async () => {
    setShowDeletePersonModal(false);
    try {
      router.back();
      setTimeout(async () => {
        await removePerson(person.id);
      }, 100);
      showToast('Person deleted');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete person');
    }
  };

  const balanceStatusLabel =
    balance > 0 ? 'OWES YOU' : balance < 0 ? 'YOU OWE' : 'SETTLED';

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Row: OWES YOU + Person name (left) | 2 square icon buttons (right) */}
      <View style={styles.headerTitleRow}>
        <View style={styles.headerTitleLeft}>
          <Eyebrow color={C.muted} style={{ marginBottom: 4 }}>
            {balanceStatusLabel}
          </Eyebrow>
          <Text numberOfLines={1} style={styles.personHeaderName}>
            {person.name}
          </Text>
        </View>

        <View style={styles.headerIconsRow}>
          <Extruded
            depth={4}
            face="dark"
            bg={C.surface2}
            pressable
            onPress={() => {
              setEditName(person.name);
              setEditPhone(person.phone || '');
              setEditNotes(person.notes || '');
              setShowEditPersonSheet(true);
            }}
            style={styles.iconBtnTile}
            contentStyle={styles.iconBtnContent}
          >
            <Pencil size={18} color={C.text} strokeWidth={2} />
          </Extruded>

          <Extruded
            depth={4}
            face="dark"
            bg={C.surface2}
            pressable
            onPress={() => setShowDeletePersonModal(true)}
            style={styles.iconBtnTile}
            contentStyle={styles.iconBtnContent}
          >
            <Trash2 size={18} color={C.text} strokeWidth={2} />
          </Extruded>
        </View>
      </View>

      {/* Balance Card: deep green #0B3D27 with green extrusion #0A6B42 when they owe */}
      <NeoCard
        depth={6}
        face={balance > 0 ? 'green' : balance < 0 ? 'red' : 'dark'}
        bg={balance > 0 ? C.greenDeep : balance < 0 ? C.redDeep : C.surface2}
        innerPadding={22}
        style={styles.balanceCard}
      >
        <DotGrid
          dotColor={
            balance > 0
              ? 'rgba(6, 194, 112, 0.16)'
              : balance < 0
              ? 'rgba(238, 77, 55, 0.16)'
              : 'rgba(255, 255, 255, 0.08)'
          }
        />
        <Eyebrow color={balance > 0 ? '#4ADE80' : balance < 0 ? '#FCA5A5' : C.muted}>
          BALANCE
        </Eyebrow>
        <Text
          numberOfLines={1}
          style={[
            styles.balanceAmountText,
            { color: balance > 0 ? C.green : balance < 0 ? C.red : C.text },
          ]}
        >
          ₹{Math.abs(balance).toLocaleString('en-IN')}
        </Text>
      </NeoCard>

      {/* Two Buttons Side by Side: + ENTRY (white) & SETTLE UP (green) */}
      <View style={styles.actionRowTwo}>
        <View style={styles.actionCol}>
          <NeoButton
            variant="white"
            size="lg"
            fullWidth
            onPress={() => openNewEntrySheet('YOU_LENT')}
          >
            + ENTRY
          </NeoButton>
        </View>

        <View style={styles.actionCol}>
          <NeoButton
            variant="green"
            size="lg"
            fullWidth
            onPress={handleSettleUp}
            disabled={balance === 0}
          >
            SETTLE UP
          </NeoButton>
        </View>
      </View>

      {/* Ledger Section Header */}
      <View style={styles.ledgerHeaderRow}>
        <Text style={styles.ledgerTitle}>Ledger</Text>
        <Eyebrow color={C.muted}>{transactions.length} ENTRIES</Eyebrow>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar with BackButton (44x44 square, surface-2) */}
      <View
        style={[
          styles.topBar,
          { paddingTop: Math.max(insets.top, 24) + 10 },
        ]}
      >
        <BackButton />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Math.max(insets.top, 24) + 64,
            paddingBottom: 110, // space above bottom tilted button
          },
        ]}
        renderItem={({ item: tx }) => {
          const isLent = tx.direction === 'YOU_LENT';
          const dateStr = formatLedgerDate(tx.date);

          return (
            <View style={styles.timelineItemWrap}>
              {/* 2px Vertical Timeline Line */}
              <View style={styles.verticalTimelineLine} />

              {/* 14px Diamond sitting on the line */}
              <View
                style={[
                  styles.timelineDiamond,
                  { backgroundColor: isLent ? C.green : C.red },
                ]}
              />

              {/* Extruded Dark Card */}
              <View style={styles.timelineCardWrap}>
                <NeoCard
                  depth={3}
                  face="dark"
                  bg={C.surface}
                  pressable
                  onPress={() => openEditEntrySheet(tx)}
                  innerPadding={14}
                  style={styles.txCard}
                >
                  {/* Top row: label & amount */}
                  <View style={styles.txTopRow}>
                    <Eyebrow color={isLent ? C.green : C.red}>
                      {isLent ? 'YOU LENT' : 'YOU BORROWED'}
                    </Eyebrow>
                    <Text
                      style={[
                        styles.txAmountText,
                        { color: isLent ? C.green : C.red },
                      ]}
                    >
                      {isLent ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {/* Note */}
                  <Text numberOfLines={1} style={styles.txNoteText}>
                    {tx.note || (isLent ? 'Lent' : 'Borrowed')}
                  </Text>

                  {/* Date */}
                  <Text style={styles.txDateText}>{dateStr}</Text>
                </NeoCard>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyLedger}>
            <Text style={styles.emptyLedgerText}>No transactions recorded</Text>
          </View>
        }
      />

      {/* Full-width Tilted Poli ADD ENTRY Button at Bottom */}
      <View
        style={[
          styles.bottomBarWrap,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <TiltButton onPress={() => openNewEntrySheet('YOU_LENT')}>
          ADD ENTRY
        </TiltButton>
      </View>

      {/* New / Edit Entry Sheet */}
      <Sheet
        visible={showEntrySheet}
        onClose={() => {
          setShowEntrySheet(false);
          setEditingTx(null);
        }}
        title={editingTx ? 'Edit entry' : 'New entry'}
      >
        {/* Segmented I LENT / I BORROWED */}
        <View style={styles.segmentedRow}>
          <View style={{ flex: 1 }}>
            <Extruded
              depth={3}
              face={txDirection === 'YOU_LENT' ? 'green' : 'dark'}
              bg={txDirection === 'YOU_LENT' ? C.green : C.surface2}
              pressable
              onPress={() => {
                tap('light');
                setTxDirection('YOU_LENT');
              }}
              contentStyle={styles.segmentContent}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: txDirection === 'YOU_LENT' ? C.ink : C.white },
                ]}
              >
                I LENT
              </Text>
            </Extruded>
          </View>

          <View style={{ flex: 1 }}>
            <Extruded
              depth={3}
              face={txDirection === 'YOU_BORROWED' ? 'red' : 'dark'}
              bg={txDirection === 'YOU_BORROWED' ? C.red : C.surface2}
              pressable
              onPress={() => {
                tap('light');
                setTxDirection('YOU_BORROWED');
              }}
              contentStyle={styles.segmentContent}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: C.white },
                ]}
              >
                I BORROWED
              </Text>
            </Extruded>
          </View>
        </View>

        {/* AMOUNT Section (₹ glyph + large 56px input with 2px bottom border) */}
        <View style={styles.amountInputSection}>
          <Eyebrow color={C.muted} style={{ marginBottom: 4 }}>
            AMOUNT
          </Eyebrow>
          <View style={styles.amountInputRow}>
            <Text style={styles.amountCurrencyGlyph}>₹</Text>
            <TextInput
              value={txAmount}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9.]/g, '');
                const parts = clean.split('.');
                const sanitized =
                  parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
                setTxAmount(sanitized);
              }}
              placeholder="0"
              placeholderTextColor={
                txDirection === 'YOU_LENT'
                  ? 'rgba(6, 194, 112, 0.45)'
                  : 'rgba(238, 77, 55, 0.45)'
              }
              keyboardType="numeric"
              selectionColor={C.poli}
              cursorColor={C.poli}
              style={[
                styles.amountBigInput,
                { color: txDirection === 'YOU_LENT' ? C.green : C.red },
              ]}
            />
          </View>
        </View>

        {/* NOTE Section */}
        <View style={{ marginBottom: 16 }}>
          <Field
            label="NOTE"
            value={txNote}
            onChangeText={setTxNote}
            placeholder="What was it for?"
          />
        </View>

        {/* DATE & RETURN BY Row */}
        <View style={styles.dateFieldsRow}>
          <View style={{ flex: 1 }}>
            <Eyebrow color={C.muted} style={{ marginBottom: 8 }}>
              DATE
            </Eyebrow>
            <Pressable
              onPress={() => {
                tap('light');
                setPickingDateType('date');
                setShowDatePicker(true);
              }}
              style={styles.datePickerBox}
            >
              <Text style={styles.datePickerValueText}>
                {formatDateDisplay(entryDate)}
              </Text>
              <Calendar size={18} color={C.muted} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <Eyebrow color={C.muted} style={{ marginBottom: 8 }}>
              RETURN BY
            </Eyebrow>
            <Pressable
              onPress={() => {
                tap('light');
                setPickingDateType('returnDate');
                setShowDatePicker(true);
              }}
              style={styles.datePickerBox}
            >
              <Text
                style={[
                  styles.datePickerValueText,
                  !entryReturnDate && { color: C.muted },
                ]}
              >
                {entryReturnDate ? formatDateDisplay(entryReturnDate) : 'dd/mm/yyyy'}
              </Text>
              <Calendar size={18} color={C.muted} />
            </Pressable>
          </View>
        </View>

        {/* Bottom Actions Area with 20px vertical gap */}
        <View style={{ gap: 20, marginBottom: 24 }}>
          {/* 1. SAVE ENTRY / ADD ENTRY */}
          <TiltButton
            disabled={submittingTx || savingEditTx}
            onPress={handleSaveEntry}
          >
            {submittingTx || savingEditTx
              ? 'SAVING…'
              : editingTx
              ? 'SAVE ENTRY'
              : 'ADD ENTRY'}
          </TiltButton>

          {/* 2. VIEW EDIT HISTORY (only when editing) */}
          {editingTx && (
            showHistory ? (
              <View style={styles.historyPanel}>
                <Text style={styles.historyTitle}>EDIT HISTORY</Text>
                {loadingHistory ? (
                  <Text style={styles.historyMutedText}>Loading…</Text>
                ) : historyList.length === 0 ? (
                  <Text style={styles.historyMutedText}>Never edited.</Text>
                ) : (
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {historyList.map((hist, idx) => {
                      const amountInfo = formatHistoryAmount(
                        hist.previousAmount,
                        hist.previousDirection
                      );
                      return (
                        <View
                          key={hist.id || idx}
                          style={[
                            styles.historyRow,
                            idx > 0 && styles.historyRowBorder,
                          ]}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={styles.historyNoteText}
                              numberOfLines={1}
                            >
                              {hist.previousNote || 'No note'}
                            </Text>
                            <Text style={styles.historyDateText}>
                              {formatHistoryDate(hist.changedAt)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.historyAmountText,
                              { color: amountInfo.color },
                            ]}
                          >
                            {amountInfo.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                onPress={handleOpenHistory}
                style={({ pressed }) => [
                  styles.viewHistoryBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.viewHistoryText,
                      { color: pressed ? '#FFFFFF' : '#8A8A8A' },
                    ]}
                  >
                    VIEW EDIT HISTORY
                  </Text>
                )}
              </Pressable>
            )
          )}

          {/* 3. DELETE ENTRY (only when editing) */}
          {editingTx && (
            <NeoButton
              variant="red"
              size="md"
              fullWidth
              onPress={handleDeleteEntry}
            >
              DELETE ENTRY
            </NeoButton>
          )}
        </View>
      </Sheet>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        value={pickingDateType === 'date' ? entryDate : entryReturnDate || new Date()}
        allowFuture={true}
        showClear={pickingDateType === 'returnDate'}
        onClear={() => {
          setEntryReturnDate(null);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(selectedDate) => {
          if (pickingDateType === 'date') {
            setEntryDate(selectedDate);
          } else {
            setEntryReturnDate(selectedDate);
          }
          setShowDatePicker(false);
        }}
      />

      {/* Edit Person Sheet */}
      <Sheet
        visible={showEditPersonSheet}
        onClose={() => setShowEditPersonSheet(false)}
        title="Edit person"
        subtitle="Update contact details"
        footer={
          <TiltButton
            disabled={savingPerson}
            onPress={handleSavePerson}
          >
            {savingPerson ? 'SAVING…' : 'SAVE CHANGES'}
          </TiltButton>
        }
      >
        <Field
          label="NAME"
          value={editName}
          onChangeText={setEditName}
          placeholder="Who is it?"
        />
        <Field
          label="PHONE"
          value={editPhone}
          onChangeText={setEditPhone}
          placeholder="Optional"
          keyboardType="phone-pad"
        />
        <Field
          label="NOTES"
          value={editNotes}
          onChangeText={setEditNotes}
          placeholder="Optional"
        />
      </Sheet>

      {/* Confirm Delete Person Modal */}
      <ConfirmModal
        visible={showDeletePersonModal}
        title="Delete Person"
        message={`Are you sure you want to delete ${person.name} and all their transactions? This can be restored from Trash later.`}
        confirmLabel="Delete"
        onConfirm={handleDeletePersonConfirm}
        onCancel={() => setShowDeletePersonModal(false)}
      />

      {/* Confirm Delete Transaction Modal */}
      <ConfirmModal
        visible={Boolean(deleteTxId)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? It will be moved to recently deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteTxConfirm}
        onCancel={() => setDeleteTxId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontFamily: FONT.display,
    fontSize: 20,
    color: C.muted,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(13, 13, 13, 0.92)',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleLeft: {
    flex: 1,
    marginRight: 12,
  },
  personHeaderName: {
    fontFamily: FONT.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: C.text,
  },
  headerIconsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtnTile: {
    width: 44,
    height: 44,
  },
  iconBtnContent: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    width: '100%',
    marginBottom: 16,
  },
  balanceAmountText: {
    fontFamily: FONT.display,
    fontSize: 60,
    lineHeight: 68,
    letterSpacing: -1,
    marginTop: 6,
  },
  actionRowTwo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  actionCol: {
    flex: 1,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 16,
  },
  ledgerTitle: {
    fontFamily: FONT.display,
    fontSize: 28,
    lineHeight: 32,
    color: C.text,
  },
  timelineItemWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingLeft: 20,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 7,
    top: -10,
    bottom: -10,
    width: 2,
    backgroundColor: C.border,
  },
  timelineDiamond: {
    width: 14,
    height: 14,
    position: 'absolute',
    left: 1,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  timelineCardWrap: {
    flex: 1,
  },
  txCard: {
    width: '100%',
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txAmountText: {
    fontFamily: FONT.display,
    fontSize: 22,
    lineHeight: 26,
  },
  txNoteText: {
    fontFamily: FONT.sansBold,
    fontSize: 15,
    lineHeight: 20,
    color: C.text,
    marginBottom: 4,
  },
  txDateText: {
    fontFamily: FONT.sans,
    fontSize: 12,
    color: C.muted,
  },
  emptyLedger: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyLedgerText: {
    fontFamily: FONT.sans,
    fontSize: 14,
    color: C.muted,
  },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(13, 13, 13, 0.95)',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  segmentContent: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: FONT.sansX,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  amountInputSection: {
    marginBottom: 20,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingBottom: 4,
  },
  amountCurrencyGlyph: {
    fontFamily: FONT.display,
    fontSize: 40,
    lineHeight: 46,
    color: C.muted,
    marginRight: 8,
  },
  amountBigInput: {
    flex: 1,
    fontFamily: FONT.display,
    fontSize: 56,
    lineHeight: 64,
    padding: 0,
  },
  dateFieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  datePickerBox: {
    height: 56,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  datePickerValueText: {
    fontFamily: FONT.sansBold,
    fontSize: 15,
    color: C.text,
  },
  viewHistoryBtn: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewHistoryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  historyPanel: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    borderRadius: 0,
  },
  historyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: '#8A8A8A',
  },
  historyMutedText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  historyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    marginTop: 8,
  },
  historyNoteText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  historyDateText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
  },
  historyAmountText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
