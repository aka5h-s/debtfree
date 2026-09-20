import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseConfig } from './firebase';

const FIREBASE_CONFIG_KEY = '@debtfree_firebase_config';

export async function getStoredFirebaseConfig(): Promise<FirebaseConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(FIREBASE_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveFirebaseConfig(config: FirebaseConfig): Promise<void> {
  await AsyncStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

export async function clearFirebaseConfig(): Promise<void> {
  await AsyncStorage.removeItem(FIREBASE_CONFIG_KEY);
}
