import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
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
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' } }}>
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
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    GilroyBold: require('../assets/fonts/Gilroy-Bold.ttf'),
    GilroyBlack: require('../assets/fonts/Gilroy-Black.ttf'),
    CirkaBold: require('../assets/fonts/Cirka-Bold.otf'),
    CirkaRegular: require('../assets/fonts/Cirka-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
