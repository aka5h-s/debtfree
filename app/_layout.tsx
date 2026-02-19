import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { DataProvider } from "@/contexts/DataContext";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="add-person" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.65], sheetGrabberVisible: true }} />
      <Stack.Screen name="add-transaction" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.7], sheetGrabberVisible: true }} />
      <Stack.Screen name="edit-transaction" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.7], sheetGrabberVisible: true }} />
      <Stack.Screen name="add-card" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85], sheetGrabberVisible: true }} />
      <Stack.Screen name="edit-card" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85], sheetGrabberVisible: true }} />
      <Stack.Screen name="transaction-history" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6], sheetGrabberVisible: true }} />
    </Stack>
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
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <DataProvider>
              <StatusBar style="light" />
              <RootLayoutNav />
            </DataProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
