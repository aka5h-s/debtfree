import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      overflow-x: hidden !important;
      max-width: 100vw !important;
      background-color: #0D0D0D !important;
    }
    #root div {
      box-shadow: none !important;
    }
  `;

  const fixNavBg = () => {
    document.querySelectorAll('div').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg === 'rgb(242, 242, 242)') {
        el.style.backgroundColor = '#0D0D0D';
      }
    });
  };
  const observer = new MutationObserver(fixNavBg);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(fixNavBg, 100);
  setTimeout(fixNavBg, 500);
  setTimeout(fixNavBg, 1500);
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
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' }, cardStyle: { backgroundColor: '#0D0D0D' }, cardShadowEnabled: false, cardOverlayEnabled: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-person" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="edit-person" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="add-transaction" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="edit-transaction" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="add-card" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="edit-card" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="transaction-history" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, overflow: 'hidden' }}>
          <KeyboardProvider>
            <AuthProvider>
              <DataProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </DataProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
