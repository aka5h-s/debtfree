import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { Asset } from "expo-asset";
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

const fontModules = {
  GilroyBold: require('../assets/fonts/Gilroy-Bold.ttf'),
  GilroyBlack: require('../assets/fonts/Gilroy-Black.ttf'),
  CirkaBold: require('../assets/fonts/Cirka-Bold.otf'),
  CirkaRegular: require('../assets/fonts/Cirka-Regular.ttf'),
};

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        const entries = Object.entries(fontModules);
        const assets = entries.map(([, mod]) => Asset.fromModule(mod));
        await Promise.all(assets.map((a) => a.downloadAsync()));
        console.log('Font assets downloaded. URIs:');
        
        const fontMap: Record<string, { uri: string }> = {};
        entries.forEach(([name], i) => {
          const localUri = assets[i].localUri || assets[i].uri;
          console.log(`  ${name}: ${localUri}`);
          fontMap[name] = { uri: localUri };
        });

        await Font.loadAsync(fontMap);
        console.log('Fonts loaded via URI. Status:');
        entries.forEach(([name]) => {
          console.log(`  ${name}: loaded=${Font.isLoaded(name)}`);
        });
        setFontsLoaded(true);
      } catch (e: any) {
        console.error('Font loading error:', e);
        setFontError(e);
      }
    }
    loadFonts();
  }, []);

  useEffect(() => {
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
