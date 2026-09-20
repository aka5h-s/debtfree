import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopCard } from '@/components/NeoPopCard';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { ShimmerText } from '@/components/ShimmerText';
import { formatCurrency } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';

function PersonItem({ person, balance }: { person: any; balance: number }) {
  const status = balance > 0 ? 'YOU LENT' : balance < 0 ? 'YOU OWE' : 'SETTLED';
  const statusColor = balance > 0 ? Colors.positive : balance < 0 ? Colors.negative : Colors.settled;
  const avatarColor = balance > 0 ? Colors.cardGreen : balance < 0 ? Colors.cardRed : Colors.surfaceLight;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/person/[id]', params: { id: person.id } });
      }}
      style={styles.personPressable}
    >
      <NeoPopCard color={Colors.surface} depth={2}>
        <View style={styles.personRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{person.name}</Text>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{status}</Text>
          </View>
          <View style={styles.personBalanceArea}>
            <Text style={[styles.personBalance, { color: statusColor }]}>
              {balance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(balance))}
            </Text>
            <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
          </View>
        </View>
      </NeoPopCard>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { people, isLoading, getPersonBalance, globalBalance, totalLent, totalBorrowed, isOnline, isSyncing, pendingSyncCount } = useData();
  const [search, setSearch] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const sortedPeople = useMemo(() => {
    return [...people]
      .filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q));
      })
      .sort((a, b) => {
        return Math.abs(getPersonBalance(b.id)) - Math.abs(getPersonBalance(a.id));
      });
  }, [people, search, getPersonBalance]);

  const balanceColor = globalBalance > 0 ? Colors.positive : globalBalance < 0 ? Colors.negative : Colors.settled;
  const contextMessage = globalBalance > 0
    ? `You will receive ${formatCurrency(globalBalance)}`
    : globalBalance < 0
    ? `You are in debt. Pay ${formatCurrency(Math.abs(globalBalance))} to be debt-free`
    : 'You are free of debt!';

  const renderHeader = useMemo(() => (
    <View>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.appTitle}>DebtFree</Text>
      </View>

      {(!isOnline || pendingSyncCount > 0 || isSyncing) && (
        <View style={[styles.offlineBanner, !isOnline && styles.offlineBannerRed]}>
          <Icon
            name={isSyncing ? 'sync' : !isOnline ? 'cloud-offline' : 'cloud-upload'}
            size={14}
            color={!isOnline ? Colors.negative : Colors.primary}
          />
          <Text style={[styles.offlineBannerText, !isOnline && { color: Colors.negative }]}>
            {isSyncing
              ? 'Backing up changes...'
              : !isOnline
              ? `Working offline • ${pendingSyncCount} changes not yet backed up`
              : `${pendingSyncCount} changes pending cloud backup`}
          </Text>
        </View>
      )}

      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>NET BALANCE</Text>
        <ShimmerText
          text={formatCurrency(Math.abs(globalBalance))}
          style={[styles.balanceAmount, { color: balanceColor }]}
        />
        <Text style={[styles.contextMessage, { color: balanceColor }]}>{contextMessage}</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <NeoPopCard color={Colors.cardGreen} depth={2}>
            <Text style={styles.summaryLabel}>YOU LENT</Text>
            <Text style={[styles.summaryAmount, { color: Colors.positive }]}>{formatCurrency(totalLent)}</Text>
          </NeoPopCard>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <NeoPopCard color={Colors.cardRed} depth={2}>
            <Text style={styles.summaryLabel}>YOU BORROWED</Text>
            <Text style={[styles.summaryAmount, { color: Colors.negative }]}>{formatCurrency(totalBorrowed)}</Text>
          </NeoPopCard>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>YOUR CIRCLE</Text>
        <Text style={styles.sectionCount}>{people.length}</Text>
      </View>
    </View>
  ), [topPad, isOnline, pendingSyncCount, isSyncing, globalBalance, balanceColor, contextMessage, totalLent, totalBorrowed, people.length]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyText}>Your circle is empty</Text>
      <Text style={styles.emptySubtext}>Add someone to start tracking</Text>
      <View style={{ marginTop: 20, width: '70%' }}>
        <NeoPopTiltedButton onPress={() => router.push('/add-person')} showShimmer>
          <Text style={styles.ctaText}>ADD SOMEONE</Text>
        </NeoPopTiltedButton>
      </View>
    </View>
  ), []);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PersonItem person={item} balance={getPersonBalance(item.id)} />
  ), [getPersonBalance]);

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedPeople}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            {renderHeader}
            {people.length > 0 && (
              <View style={styles.searchContainer}>
                <Icon name="search" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or phone..."
                  placeholderTextColor={Colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <Icon name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }]}
        showsVerticalScrollIndicator={false}
      />

      {people.length > 0 && (
        <View style={[styles.fab, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 }]}>
          <NeoPopTiltedButton onPress={() => router.push('/add-person')} showShimmer>
            <Icon name="add" size={24} color="#000" />
          </NeoPopTiltedButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 254, 64, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.2)',
    gap: 6,
  },
  offlineBannerRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  offlineBannerText: {
    fontSize: 12,
    fontFamily: Fonts.medium, fontWeight: "500" as const,
    color: Colors.primary,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontFamily: Fonts.serif,
    letterSpacing: -1,
  },
  contextMessage: {
    fontSize: 13,
    fontFamily: Fonts.medium, fontWeight: "500" as const,
    marginTop: 8,
    opacity: 0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 20,
    fontFamily: Fonts.serif,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 100,
  },
  personPressable: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: Colors.white,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    letterSpacing: 1,
  },
  personBalanceArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personBalance: {
    fontSize: 16,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: '#000',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
});
