import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Landmark,
  Banknote,
  Wallet,
  CircleDot,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  ChevronLeft,
} from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/neo/Toast';
import {
  C,
  T,
  NeoCard,
  NeoButton,
  TiltButton,
  Eyebrow,
  Amount,
  DotGrid,
  Sheet,
  Field,
  haptic,
  formatRupees,
} from '@/src/design';
import { Account, AccountType, AccountLogType, AccountLogEntry } from '@/lib/types';
import { formatRelativeDate } from '@/lib/formatters';

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return 'Just now';
  const d = new Date(timestamp);
  const day = d.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = months[d.getMonth()];
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  return `${day} ${month}, ${strTime}`;
}

export default function AccountDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts, updateAccount, removeAccount, addAccountLog, deleteAccountLog } = useData();
  const { showToast } = useToast();

  const account = useMemo(
    () => accounts.find((a) => a.id === id),
    [accounts, id]
  );

  // Modals / Sheets
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [logType, setLogType] = useState<AccountLogType>('ADD_MONEY');
  const [logAmount, setLogAmount] = useState('');
  const [logNote, setLogNote] = useState('');

  // Edit Account Sheet
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AccountType>('BANK');
  const [editNotes, setEditNotes] = useState('');

  // Sort history newest first (called unconditionally on every render)
  const historyList = useMemo(() => {
    return [...(account?.history || [])].sort(
      (a, b) => (b.date || b.createdAt || 0) - (a.date || a.createdAt || 0)
    );
  }, [account?.history]);

  if (!account) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Text style={[T.display, { fontSize: 20, color: C.mutedFg }]}>
          Account not found.
        </Text>
        <View style={{ marginTop: 20 }}>
          <NeoButton
            label="GO BACK"
            variant="dark"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/cards');
              }
            }}
          />
        </View>
      </View>
    );
  }

  const renderAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'BANK':
        return <Landmark size={24} color={C.background} />;
      case 'CASH':
        return <Banknote size={24} color={C.background} />;
      case 'WALLET':
        return <Wallet size={24} color={C.background} />;
      default:
        return <CircleDot size={24} color={C.background} />;
    }
  };

  const getSubtypeLabel = (type: AccountType) => {
    switch (type) {
      case 'BANK':
        return 'Bank account';
      case 'CASH':
        return 'Cash';
      case 'WALLET':
        return 'Wallet';
      default:
        return 'Other';
    }
  };

  const handleDeleteAccount = () => {
    if (!account) return;
    haptic('heavy');
    Alert.alert(
      'Delete account',
      `Delete ${account.name}? This will move it to recently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const accId = account.id;
            try {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/cards');
              }
              await removeAccount(accId);
              showToast('Account deleted');
            } catch (e: any) {
              showToast(e.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    if (!account) return;
    setEditName(account.name);
    setEditType(account.type);
    setEditNotes(account.notes || '');
    setShowEditSheet(true);
  };

  const handleSaveEdit = async () => {
    if (!account) return;
    if (!editName.trim()) {
      showToast("Name can't be empty");
      return;
    }
    try {
      await updateAccount({
        ...account,
        name: editName.trim(),
        type: editType,
        notes: editNotes.trim(),
        updatedAt: Date.now(),
      });
      showToast('Account updated');
      setShowEditSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to update');
    }
  };

  const handleOpenLog = (type: AccountLogType) => {
    setLogType(type);
    setLogAmount('');
    setLogNote('');
    setShowLogSheet(true);
  };

  const handleSaveLog = async () => {
    if (!account) return;
    const val = parseFloat(logAmount);
    if (isNaN(val) || val <= 0) {
      showToast('Enter a valid amount');
      return;
    }

    try {
      await addAccountLog(account.id, {
        amount: val,
        type: logType,
        note: logNote.trim() || undefined,
        date: Date.now(),
      });
      showToast(logType === 'SET_BALANCE' ? 'Balance updated' : 'Money added');
      setShowLogSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to record');
    }
  };

  const handleDeleteLogEntry = (logId: string) => {
    if (!account) return;
    haptic('heavy');
    Alert.alert('Delete log entry', 'Remove this history entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccountLog(account.id, logId);
            showToast('Entry removed');
          } catch (e: any) {
            showToast(e.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 2a. Sticky top bar (page background at 90% with blur), 16px padding: only a 40x40 square back button */}
      <View
        style={[
          styles.topBar,
          { paddingTop: Math.max(insets.top, 16) + 4 },
        ]}
      >
        <NeoButton
          variant="dark"
          size="sm"
          icon={<ChevronLeft size={20} color={C.foreground} />}
          onPress={() => router.back()}
          style={{ width: 40, height: 40, paddingHorizontal: 0 }}
        />

        {/* Right-aligned row: small dark raised EDIT button and small dark raised icon-only trash button */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <NeoButton
            label="✎ EDIT"
            variant="dark"
            size="sm"
            onPress={handleOpenEdit}
          />
          <NeoButton
            variant="dark"
            size="sm"
            icon={<Trash2 size={16} color={C.negative} />}
            onPress={handleDeleteAccount}
            style={{ width: 36, height: 36, paddingHorizontal: 0 }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2b. Balance Card with DotGrid, 20px padding */}
        <NeoCard face="dark" depth={4} style={styles.heroCard}>
          <DotGrid opacity={0.09} />

          {/* Top row: 48x48 solid poli-yellow square with dark icon */}
          <View style={styles.heroTop}>
            <View style={styles.iconBox}>{renderAccountIcon(account.type)}</View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.heroTitle}>
                {account.name}
              </Text>
              <Text style={styles.heroSubtitle}>
                {getSubtypeLabel(account.type)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Current Balance */}
          <View style={{ gap: 6, paddingTop: 4 }}>
            <Eyebrow>CURRENT BALANCE</Eyebrow>
            <Text
              style={[
                styles.balanceDisplay,
                account.balance < 0 && { color: C.negative },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatRupees(account.balance)}
            </Text>
            <Text style={styles.updatedAtText}>
              Last updated {formatDateTime(account.updatedAt || account.history?.[0]?.date)}
            </Text>
          </View>
        </NeoCard>

        {/* 2c. Action Buttons: Add money (green) & Update balance (white) */}
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <NeoButton
              label="+ ADD MONEY"
              variant="green"
              size="md"
              fullWidth
              onPress={() => handleOpenLog('ADD_MONEY')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <NeoButton
              label="⟳ UPDATE"
              variant="white"
              size="md"
              fullWidth
              onPress={() => handleOpenLog('SET_BALANCE')}
            />
          </View>
        </View>

        {/* 2d. Balance & Money Log: count badge right next to title (12px gap) */}
        <View style={styles.sectionHeader}>
          <Eyebrow>BALANCE & MONEY LOG</Eyebrow>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{historyList.length}</Text>
          </View>
        </View>

        {historyList.length === 0 ? (
          <View style={styles.emptyDashedBox}>
            <Text style={styles.emptyText}>No money moves logged yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {historyList.map((entry) => {
              const isAdd = entry.type === 'ADD_MONEY';
              const isWithdraw = entry.type === 'WITHDRAW_MONEY';
              const barColor = isAdd
                ? C.positive
                : isWithdraw
                ? C.negative
                : '#FAFAFA';

              const titleText = isAdd
                ? 'Money added'
                : isWithdraw
                ? 'Money withdrawn'
                : 'Balance updated';

              return (
                <View key={entry.id} style={styles.flatLogRow}>
                  {/* Left: 4px wide colour stripe inside padding */}
                  <View
                    style={[styles.leftBar, { backgroundColor: barColor }]}
                  />

                  {/* Middle: icon + title + note + date/time */}
                  <View style={{ flex: 1, gap: 3, paddingLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isAdd ? (
                        <ArrowDownLeft size={14} color={C.positive} />
                      ) : isWithdraw ? (
                        <ArrowUpRight size={14} color={C.negative} />
                      ) : (
                        <RefreshCw size={13} color={C.mutedFg} />
                      )}
                      <Text style={styles.logTitle}>{titleText}</Text>
                    </View>
                    {entry.note ? (
                      <Text numberOfLines={1} style={styles.logNote}>
                        {entry.note}
                      </Text>
                    ) : null}
                    <Text style={styles.logDate}>
                      {formatDateTime(entry.date || entry.createdAt)}
                    </Text>
                  </View>

                  {/* Right column: stacked and right-aligned */}
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text
                      style={[
                        styles.logAmount,
                        {
                          color: isAdd
                            ? C.positive
                            : isWithdraw
                            ? C.negative
                            : C.foreground,
                        },
                      ]}
                    >
                      {isAdd ? '+' : isWithdraw ? '−' : ''}
                      {formatRupees(entry.amount)}
                    </Text>
                    <Text style={styles.logRunningBalNormal}>
                      Bal: {formatRupees(entry.newBalance)}
                    </Text>

                    {/* Trash icon under them */}
                    <Pressable
                      onPress={() => handleDeleteLogEntry(entry.id)}
                      style={{ padding: 4, marginTop: 2 }}
                    >
                      <Trash2 size={14} color={C.mutedFg} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Log Sheet (Add Money / Set Balance) */}
      <Sheet
        visible={showLogSheet}
        onClose={() => setShowLogSheet(false)}
        title={logType === 'SET_BALANCE' ? 'Set balance' : 'Add money'}
        subtitle={`Account: ${account.name}`}
        footer={
          <TiltButton onPress={handleSaveLog}>
            {logType === 'SET_BALANCE' ? 'UPDATE BALANCE' : 'ADD MONEY'}
          </TiltButton>
        }
      >
        <Field
          label="AMOUNT ₹"
          keyboardType="decimal-pad"
          placeholder="0"
          value={logAmount}
          onChangeText={setLogAmount}
        />
        <Field
          label="NOTE (OPTIONAL)"
          placeholder="e.g. Salary, ATM, Transfer"
          value={logNote}
          onChangeText={setLogNote}
        />
      </Sheet>

      {/* Edit Account Sheet */}
      <Sheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title="Edit account"
        footer={<TiltButton onPress={handleSaveEdit}>SAVE CHANGES</TiltButton>}
      >
        <Field
          label="ACCOUNT NAME"
          placeholder="e.g. HDFC Main, Cash in pocket"
          value={editName}
          onChangeText={setEditName}
        />

        <View style={{ gap: 8 }}>
          <Eyebrow>ACCOUNT TYPE</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(['BANK', 'CASH', 'WALLET', 'OTHER'] as AccountType[]).map((t) => (
              <View key={t} style={{ width: '48%' }}>
                <NeoButton
                  label={t}
                  variant={editType === t ? 'poli' : 'dark'}
                  size="sm"
                  fullWidth
                  depth={2}
                  onPress={() => setEditType(t)}
                />
              </View>
            ))}
          </View>
        </View>

        <Field
          label="NOTES (OPTIONAL)"
          placeholder="Account details or notes"
          value={editNotes}
          onChangeText={setEditNotes}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(13, 13, 13, 0.92)',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  heroCard: {
    padding: 20,
    backgroundColor: C.surface,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 24,
    color: C.foreground,
  },
  heroSubtitle: {
    ...T.body,
    fontSize: 14,
    color: C.mutedFg,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  balanceDisplay: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 48,
    color: C.foreground,
    letterSpacing: -0.5,
  },
  updatedAtText: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  countBadge: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: C.foreground,
  },
  emptyDashedBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...T.body,
    fontSize: 13,
    color: C.mutedFg,
  },
  flatLogRow: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  leftBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 0,
  },
  logTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  logNote: {
    ...T.body,
    fontSize: 14,
    color: C.mutedFg,
  },
  logDate: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
  logAmount: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 18,
  },
  logRunningBalNormal: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
});
