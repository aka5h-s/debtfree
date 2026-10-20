import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { C, FONT } from '@/theme/neo';
import { NeoCard } from './NeoCard';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    opacity.value = withTiming(1, { duration: 150 });
    translateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });

    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(-100, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
    }, 2000);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toastContainer,
          { top: Math.max(insets.top, 16) + 8 },
          animatedStyle,
        ]}
      >
        <NeoCard
          depth={4}
          face="poli"
          bg={C.poli}
          innerPadding={12}
          style={styles.toastCard}
        >
          <Text style={styles.toastText} numberOfLines={2}>
            {message}
          </Text>
        </NeoCard>
      </Animated.View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 400,
  },
  toastText: {
    fontFamily: FONT.sansBold,
    fontSize: 14,
    color: C.ink,
    textAlign: 'center',
  },
});
