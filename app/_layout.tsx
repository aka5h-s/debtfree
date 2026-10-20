import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import { useFonts } from "expo-font";
import {
  Fraunces_900Black,
  Fraunces_900Black_Italic,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ToastProvider } from "@/components/neo/Toast";
import { registerNotificationResponseListener } from "@/lib/notifications";
import { C } from "@/theme/neo";

LogBox.ignoreLogs([
  "Unable to activate keep awake",
  "Error: Unable to activate keep awake",
  "`setBackgroundColorAsync` is not supported with edge-to-edge enabled.",
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'android') {
  NavigationBar.setButtonStyleAsync('light').catch(() => {});
}

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bg,
    card: C.surface,
    text: C.text,
    border: C.border,
  },
};

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      overflow-x: hidden !important;
      max-width: 100vw !important;
      background-color: ${C.bg} !important;
    }
    * {
      -webkit-overflow-scrolling: touch;
    }
  `;
  document.head.appendChild(style);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === 'login' || segments[0] === 'signup';
    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  useEffect(() => {
    const unsubscribe = registerNotificationResponseListener((personId) => {
      router.push({ pathname: '/person/[id]', params: { id: personId } });
    });
    return unsubscribe;
  }, []);

  // Pre-bundle and prefetch standalone routes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        router.prefetch('/person/[id]');
        router.prefetch('/add-transaction');
        router.prefetch('/add-person');
        router.prefetch('/edit-person');
        router.prefetch('/edit-transaction');
        router.prefetch('/add-card');
        router.prefetch('/edit-card');
        router.prefetch('/account/[id]');
        router.prefetch('/transaction-history');
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="signup" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="person/[id]" />
        <Stack.Screen name="account/[id]" />
        <Stack.Screen name="add-person" />
        <Stack.Screen name="edit-person" />
        <Stack.Screen name="add-transaction" />
        <Stack.Screen name="edit-transaction" />
        <Stack.Screen name="add-card" />
        <Stack.Screen name="edit-card" />
        <Stack.Screen name="transaction-history" />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_900Black,
    Fraunces_900Black_Italic,
    Fraunces_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
          <ThemeProvider value={AppDarkTheme}>
            <KeyboardProvider>
              <AuthProvider>
                <DataProvider>
                  <ToastProvider>
                    <StatusBar style="light" backgroundColor={C.bg} />
                    <RootLayoutNav />
                  </ToastProvider>
                </DataProvider>
              </AuthProvider>
            </KeyboardProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
