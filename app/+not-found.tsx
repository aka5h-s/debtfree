import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { C, FONT } from '@/theme/neo';
import { NeoButton } from '@/components/neo';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen Not Found</Text>
        <Text style={styles.subtitle}>This screen does not exist.</Text>
        <NeoButton
          variant="poli"
          size="md"
          onPress={() => router.replace('/')}
          style={{ marginTop: 20 }}
        >
          GO TO HOME
        </NeoButton>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    padding: 24,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 24,
    color: C.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONT.sans,
    fontSize: 14,
    color: C.muted,
  },
});
