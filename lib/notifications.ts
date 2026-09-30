import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

// In Expo SDK 53+, Android push notifications in the Expo Go client were deprecated/removed by Expo.
// We lazily require expo-notifications so Expo Go on Android runs cleanly without RedBox errors,
// while standalone/development builds and iOS have full notification support.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

function getNotifications(): any {
  if (Platform.OS === 'web' || (isExpoGo && Platform.OS === 'android')) {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (err) {
    return null;
  }
}

// Configure notification behavior when app is in foreground if supported
const Notifications = getNotifications();
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Ignore in unsupported environments
  }
}

/**
 * Request notification permissions if not already granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const notif = getNotifications();
  if (!notif || typeof notif.getPermissionsAsync !== 'function') return false;

  try {
    const { status: existingStatus } = await notif.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await notif.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Failed to get notification permissions:', err);
    return false;
  }
}

interface NotificationSlot {
  triggerDate: Date;
  title: string;
  body: string;
}

/**
 * Build reminder schedule (morning 9:00 AM & night 8:30 PM starting 2 days prior).
 */
function buildReminderSlots(
  tx: Transaction,
  personName: string,
  returnDateTimestamp: number
): NotificationSlot[] {
  const returnDate = new Date(returnDateTimestamp);
  const targetYear = returnDate.getFullYear();
  const targetMonth = returnDate.getMonth();
  const targetDay = returnDate.getDate();

  const formattedAmount = formatCurrency(tx.amount);
  const formattedDate = returnDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const isLent = tx.direction === 'YOU_LENT';
  const title = isLent ? `Repayment Reminder · ${personName}` : `Payment Due · ${personName}`;

  const slots: NotificationSlot[] = [];

  // Day -2
  const dayMinus2 = new Date(targetYear, targetMonth, targetDay - 2);
  const d2Morning = new Date(dayMinus2.getFullYear(), dayMinus2.getMonth(), dayMinus2.getDate(), 9, 0, 0);
  const d2Night = new Date(dayMinus2.getFullYear(), dayMinus2.getMonth(), dayMinus2.getDate(), 20, 30, 0);

  // Day -1
  const dayMinus1 = new Date(targetYear, targetMonth, targetDay - 1);
  const d1Morning = new Date(dayMinus1.getFullYear(), dayMinus1.getMonth(), dayMinus1.getDate(), 9, 0, 0);
  const d1Night = new Date(dayMinus1.getFullYear(), dayMinus1.getMonth(), dayMinus1.getDate(), 20, 30, 0);

  // Due Day
  const dueDay = new Date(targetYear, targetMonth, targetDay);
  const dueMorning = new Date(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate(), 9, 0, 0);
  const dueNight = new Date(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate(), 20, 30, 0);

  // Slot definitions with customized copy
  if (isLent) {
    slots.push(
      {
        triggerDate: d2Morning,
        title,
        body: `${personName} is expected to return ${formattedAmount} in 2 days (${formattedDate}).`,
      },
      {
        triggerDate: d2Night,
        title,
        body: `Upcoming: ${personName} owes ${formattedAmount}, due in 2 days on ${formattedDate}.`,
      },
      {
        triggerDate: d1Morning,
        title,
        body: `Tomorrow: ${personName} is expected to return ${formattedAmount}.`,
      },
      {
        triggerDate: d1Night,
        title,
        body: `Reminder: ${personName} repayment of ${formattedAmount} is due tomorrow.`,
      },
      {
        triggerDate: dueMorning,
        title,
        body: `Due Today: ${personName} is expected to return ${formattedAmount} today!`,
      },
      {
        triggerDate: dueNight,
        title,
        body: `Did ${personName} return ${formattedAmount}? Tap to view transaction in DebtFree.`,
      }
    );
  } else {
    slots.push(
      {
        triggerDate: d2Morning,
        title,
        body: `You need to send ${formattedAmount} to ${personName} in 2 days (${formattedDate}).`,
      },
      {
        triggerDate: d2Night,
        title,
        body: `Reminder: You owe ${formattedAmount} to ${personName}, due in 2 days on ${formattedDate}.`,
      },
      {
        triggerDate: d1Morning,
        title,
        body: `Tomorrow: You need to send ${formattedAmount} to ${personName}.`,
      },
      {
        triggerDate: d1Night,
        title,
        body: `Reminder: Your payment of ${formattedAmount} to ${personName} is due tomorrow.`,
      },
      {
        triggerDate: dueMorning,
        title,
        body: `Due Today: You need to send ${formattedAmount} to ${personName} today.`,
      },
      {
        triggerDate: dueNight,
        title,
        body: `Did you send ${formattedAmount} to ${personName}? Tap to view transaction in DebtFree.`,
      }
    );
  }

  return slots;
}

/**
 * Cancel previously scheduled notifications by ID list.
 */
export async function cancelTransactionReminders(notificationIds?: string[] | null): Promise<void> {
  const notif = getNotifications();
  if (!notif || !notificationIds || notificationIds.length === 0) return;

  for (const id of notificationIds) {
    try {
      await notif.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore if already dismissed or cancelled
    }
  }
}

/**
 * Schedule 6 reminder notifications (Day -2 morning/night, Day -1 morning/night, Due Day morning/night).
 * Returns array of scheduled notification IDs.
 */
export async function scheduleReturnDateReminders(
  tx: Transaction,
  personName: string
): Promise<string[]> {
  const notif = getNotifications();
  if (!notif || !tx.returnDate) return [];

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return [];

  const slots = buildReminderSlots(tx, personName, tx.returnDate);
  const now = Date.now();
  const scheduledIds: string[] = [];

  for (const slot of slots) {
    // Only schedule if the trigger time is in the future (at least 30s ahead)
    if (slot.triggerDate.getTime() > now + 30000) {
      try {
        const id = await notif.scheduleNotificationAsync({
          content: {
            title: slot.title,
            body: slot.body,
            data: { txId: tx.id, personId: tx.personId },
            sound: true,
          },
          trigger: {
            type: notif.SchedulableTriggerInputTypes?.DATE ?? 'date',
            date: slot.triggerDate,
          },
        });
        scheduledIds.push(id);
      } catch (err) {
        console.warn('Error scheduling notification slot:', err);
      }
    }
  }

  return scheduledIds;
}

/**
 * Trigger an immediate test notification (scheduled in 3 seconds) for verification.
 * Returns an object with status and message.
 */
export async function sendTestNotificationNow(): Promise<{ success: boolean; message: string; isExpoGoAndroid?: boolean }> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      message: 'Push notifications are not supported in web browser mode.',
    };
  }

  if (isExpoGo && Platform.OS === 'android') {
    return {
      success: false,
      isExpoGoAndroid: true,
      message:
        'Expo Go on Android (SDK 53+) has disabled system notification popups. To receive real system push notifications, a standalone APK or development build (`npx expo run:android`) is required. In-app due & overdue alerts are fully active!',
    } as any;
  }

  const notif = getNotifications();
  if (!notif) {
    return {
      success: false,
      message: 'Notification service is not available on this device.',
    };
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return {
      success: false,
      message: 'Notification permissions were denied. Please enable them in your device settings.',
    };
  }

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: '🔔 Repayment Reminder Test',
        body: 'Due soon: Rahul owes you ₹2,500 by tomorrow (Day -1 reminder)',
        sound: true,
      },
      trigger: {
        seconds: 3,
      },
    });
    return {
      success: true,
      message: 'Test notification scheduled! It will fire in 3 seconds.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to trigger notification: ${err?.message || 'Unknown error'}`,
    };
  }
}
