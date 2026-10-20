import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type TapIntensity = 'light' | 'medium' | 'heavy' | 'warning' | 'success' | 'selection';

export function tap(type: TapIntensity = 'light') {
  // Fire and forget, never block event loop or UI thread
  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        break;
      case 'selection':
        Haptics.selectionAsync().catch(() => {});
        break;
    }
  } catch {
    // Ignore gracefully
  }
}
