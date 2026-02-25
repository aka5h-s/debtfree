import React from 'react';
import { StyleSheet, Text, View, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { NeoPopCard } from '@/components/NeoPopCard';
import { NeoPopButton } from '@/components/NeoPopButton';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Fonts } from '@/lib/fonts';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { people, transactions, cards } = useData();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const topPad = Math.max(insets.top, webTopInset);
  const bottomPad = Math.max(insets.bottom, webBottomInset) + 80;

  const handleSignOut = () => {
    const doSignOut = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      signOut();
    };
    if (Platform.OS === 'web') {
      if (confirm('Sign out of DebtFree?')) doSignOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={[styles.container, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.userName}>{user?.displayName || 'DebtFree User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </NeoPopCard>
      </View>

      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>YOUR DATA</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{people.length}</Text>
                <Text style={styles.statLabel}>People</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{transactions.length}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{cards.length}</Text>
                <Text style={styles.statLabel}>Cards</Text>
              </View>
            </View>
            <View style={styles.syncBadge}>
              <Icon name="cloud-done" size={14} color={Colors.positive} />
              <Text style={styles.syncText}>Synced with Firebase</Text>
            </View>
          </View>
        </NeoPopCard>
      </View>

      <View style={styles.section}>
        <NeoPopButton onPress={handleSignOut} variant="secondary">
          <View style={styles.signOutBtn}>
            <Icon name="log-out-outline" size={20} color={Colors.negative} />
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </View>
        </NeoPopButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  profileCard: {
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 235, 52, 0.15)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  statsCard: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.positive,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.negative,
    letterSpacing: 1,
  },
});
