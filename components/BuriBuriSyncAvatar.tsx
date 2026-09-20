import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { Fonts } from '@/lib/fonts';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';

export function BuriBuriSyncAvatar() {
  const { isOnline, isSyncing, pendingSyncCount, reload } = useData();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);

  // States
  const isBackedUp = isOnline && pendingSyncCount === 0 && !isSyncing;
  const isOfflineOrPending = !isOnline || pendingSyncCount > 0;

  // Rotation animation for in-progress syncing
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isSyncing]);

  const animatedSpinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setModalVisible(true);
  };

  const handleManualSync = async () => {
    setManualSyncing(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      await reload();
    } finally {
      setManualSyncing(false);
    }
  };

  // Avatar image source: color when synced/syncing, black & white when offline/pending
  const avatarSource = isOfflineOrPending && !isSyncing
    ? require('@/assets/images/mascot-bw.png')
    : require('@/assets/images/mascot.png');

  // Ring styling
  const ringColor = isSyncing
    ? Colors.primary
    : isBackedUp
    ? '#10B981' // Vibrant emerald green complete circle
    : '#EF4444'; // Muted warning red / grey for offline/pending

  return (
    <>
      <Pressable onPress={handlePress} style={styles.avatarButton} hitSlop={10}>
        {/* Spinner / Ring Container */}
        <View style={styles.ringContainer}>
          {isSyncing ? (
            <Animated.View style={[StyleSheet.absoluteFillObject, animatedSpinnerStyle]}>
              <Svg width={44} height={44} viewBox="0 0 44 44">
                <Circle
                  cx={22}
                  cy={22}
                  r={19}
                  stroke={ringColor}
                  strokeWidth={2.5}
                  strokeDasharray="40 70"
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          ) : (
            <Svg width={44} height={44} viewBox="0 0 44 44">
              <Circle
                cx={22}
                cy={22}
                r={19}
                stroke={ringColor}
                strokeWidth={2.5}
                strokeDasharray={isOfflineOrPending ? '6 4' : undefined}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          )}

          {/* Buri Buri Zaemon Character */}
          <View style={styles.imageWrapper}>
            <Image
              source={avatarSource}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>

          {/* Small corner status badge */}
          {isBackedUp && (
            <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
              <Icon name="checkmark" size={9} color="#FFFFFF" />
            </View>
          )}
          {isOfflineOrPending && !isSyncing && (
            <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
              <Icon name={!isOnline ? "cloud-offline" : "alert"} size={9} color="#FFFFFF" />
            </View>
          )}
        </View>
      </Pressable>

      {/* Explanation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {/* Big Mascot with Status Ring */}
            <View style={styles.modalRingWrapper}>
              <Svg width={84} height={84} viewBox="0 0 84 84">
                <Circle
                  cx={42}
                  cy={42}
                  r={38}
                  stroke={ringColor}
                  strokeWidth={3.5}
                  strokeDasharray={isOfflineOrPending && !isSyncing ? '8 5' : undefined}
                  fill="none"
                />
              </Svg>
              <View style={styles.modalImageWrapper}>
                <Image
                  source={avatarSource}
                  style={styles.modalAvatarImage}
                  resizeMode="cover"
                />
              </View>
              <View
                style={[
                  styles.modalBadge,
                  {
                    backgroundColor: isSyncing
                      ? Colors.primary
                      : isBackedUp
                      ? '#10B981'
                      : '#EF4444',
                  },
                ]}
              >
                <Icon
                  name={
                    isSyncing
                      ? 'sync'
                      : isBackedUp
                      ? 'checkmark'
                      : !isOnline
                      ? 'cloud-offline'
                      : 'alert'
                  }
                  size={14}
                  color={isSyncing ? '#000' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Status Title & Description */}
            {isSyncing ? (
              <>
                <Text style={styles.modalTitle}>Backing up changes...</Text>
                <Text style={styles.modalDesc}>
                  Your latest debts, cards, and circle updates are uploading to the cloud.
                </Text>
              </>
            ) : isBackedUp ? (
              <>
                <Text style={[styles.modalTitle, { color: '#10B981' }]}>
                  Backup Complete
                </Text>
                <Text style={styles.modalDesc}>
                  All financial records, circle contacts, and cards are securely synced with your cloud account.
                </Text>
              </>
            ) : !isOnline ? (
              <>
                <Text style={[styles.modalTitle, { color: '#EF4444' }]}>
                  Offline Mode
                </Text>
                <Text style={styles.modalDesc}>
                  You're offline. All changes are saved safely on your device and will back up automatically once reconnected.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: '#EF4444' }]}>
                  {pendingSyncCount} {pendingSyncCount === 1 ? 'Change' : 'Changes'} Pending
                </Text>
                <Text style={styles.modalDesc}>
                  Recent changes are saved locally on your phone and waiting to sync with the cloud.
                </Text>
              </>
            )}

            {/* Account Info Pill */}
            <View style={styles.accountPill}>
              <Icon name="person-circle-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.accountText} numberOfLines={1}>
                {user?.email || user?.displayName || 'Local Account'}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              {isOfflineOrPending && !isSyncing && (
                <View style={{ width: '100%', marginBottom: 12 }}>
                  <NeoPopTiltedButton onPress={handleManualSync} showShimmer>
                    {manualSyncing ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.syncBtnText}>SYNC NOW</Text>
                    )}
                  </NeoPopTiltedButton>
                </View>
              )}

              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>DONE</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0D0D0D',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  modalRingWrapper: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 18,
  },
  modalImageWrapper: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#0D0D0D',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  modalBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  accountText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    maxWidth: 200,
  },
  modalActions: {
    width: '100%',
    alignItems: 'center',
  },
  syncBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 1,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
