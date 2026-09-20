import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import * as SystemUI from "expo-system-ui";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync('#0D0D0D').catch(() => {});

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0D0D0D',
    card: '#0D0D0D',
    text: '#FFFFFF',
    border: '#1A1A1A',
  },
};

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
  const isAndroid = Platform.OS === 'android';

  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D0D' },
          animation: 'ios_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="signup" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="person/[id]" />
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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    DMSerifDisplay_400Regular,
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
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
          <ThemeProvider value={AppDarkTheme}>
            <KeyboardProvider>
              <AuthProvider>
                <DataProvider>
                  <StatusBar style="light" />
                  <RootLayoutNav />
                </DataProvider>
              </AuthProvider>
            </KeyboardProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
