import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  BackHandler,
} from 'react-native';
import { C, FONT } from '@/theme/neo';
import { NeoCard } from './NeoCard';
import { NeoButton } from './NeoButton';
import { tap } from '@/lib/tap';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = true,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onCancel();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.container}>
        <NeoCard depth={6} face="dark" innerPadding={24} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <View style={styles.buttonCol}>
              <NeoButton
                size="md"
                variant="dark"
                onPress={onCancel}
                fullWidth
              >
                {cancelLabel}
              </NeoButton>
            </View>
            <View style={styles.buttonCol}>
              <NeoButton
                size="md"
                variant={destructive ? 'red' : 'poli'}
                onPress={() => {
                  if (destructive) tap('heavy');
                  else tap('medium');
                  onConfirm();
                }}
                fullWidth
              >
                {confirmLabel}
              </NeoButton>
            </View>
          </View>
        </NeoCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    width: '100%',
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 22,
    lineHeight: 26,
    color: C.text,
    marginBottom: 8,
  },
  message: {
    fontFamily: FONT.sans,
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonCol: {
    flex: 1,
  },
});
