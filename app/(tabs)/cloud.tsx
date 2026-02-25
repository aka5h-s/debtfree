import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, Pressable, Alert, TextInput, ActivityIndicator, ScrollView } from 'react-native';
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
  const { user, signOut, updateUserProfile } = useAuth();
  const { people, transactions, cards } = useData();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const topPad = Math.max(insets.top, webTopInset);
  const bottomPad = Math.max(insets.bottom, webBottomInset) + 80;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

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

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditError('Name cannot be empty');
      return;
    }
    setEditError('');
    setSaving(true);
    const result = await updateUserProfile({ displayName: editName.trim() });
    setSaving(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleStartEdit = () => {
    setEditName(user?.displayName || '');
    setEditError('');
    setIsEditing(true);
  };

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  const providerIds = user?.providerData?.map(p => p.providerId) || [];
  const hasGoogle = providerIds.includes('google.com');
  const hasPassword = providerIds.includes('password');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            {isEditing ? (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={(t) => { setEditName(t); setEditError(''); }}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />

                {editError ? (
                  <Text style={styles.editErrorText}>{editError}</Text>
                ) : null}

                <View style={styles.editActions}>
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Pressable onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={handleSaveProfile} style={styles.saveBtn}>
                        <Text style={styles.saveText}>Save</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.userName}>{user?.displayName || 'DebtFree User'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>

                <View style={styles.providerRow}>
                  {hasGoogle && (
                    <View style={styles.providerBadge}>
                      <Icon name="logo-google" size={12} color={Colors.white} />
                      <Text style={styles.providerText}>Google</Text>
                    </View>
                  )}
                  {hasPassword && (
                    <View style={styles.providerBadge}>
                      <Icon name="mail" size={12} color={Colors.white} />
                      <Text style={styles.providerText}>Email</Text>
                    </View>
                  )}
                </View>

                <Pressable onPress={handleStartEdit} style={styles.editProfileBtn}>
                  <Icon name="create-outline" size={16} color={Colors.primary} />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </Pressable>
              </>
            )}
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
    </ScrollView>
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
    fontFamily: Fonts.bold, fontWeight: "700" as const,
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
    backgroundColor: 'rgba(229, 254, 64, 0.15)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  providerText: {
    fontSize: 11,
    fontFamily: Fonts.medium, fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editProfileText: {
    fontSize: 13,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.primary,
  },
  editSection: {
    width: '100%',
    paddingHorizontal: 4,
  },
  editLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  editErrorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.negative,
    marginTop: 6,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Fonts.medium, fontWeight: "500" as const,
    color: Colors.textMuted,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveText: {
    fontSize: 14,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: '#000',
  },
  statsCard: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 11,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
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
    fontFamily: Fonts.bold, fontWeight: "700" as const,
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
    fontFamily: Fonts.medium, fontWeight: "500" as const,
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
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.negative,
    letterSpacing: 1,
  },
});
