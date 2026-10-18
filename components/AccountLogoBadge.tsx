import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/Icon';
import type { AccountType } from '@/lib/types';

interface AccountLogoBadgeProps {
  name: string;
  type: AccountType;
  size?: number;
}

export function AccountLogoBadge({ name, type, size = 48 }: AccountLogoBadgeProps) {
  const normalized = (name || '').toLowerCase().trim();
  const borderRadius = Math.round(size * 0.28); // smooth squircle ratio

  // 1. Specific Bank Logos
  if (normalized.includes('icici')) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius }]}>
        <Image
          source={require('@/assets/images/logos/icici_bank.png')}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (normalized.includes('hdfc')) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius }]}>
        <Image
          source={require('@/assets/images/logos/hdfc_bank.png')}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // 2. Type: CASH
  if (type === 'CASH') {
    return (
      <LinearGradient
        colors={['#064E3B', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { width: size, height: size, borderRadius }]}
      >
        <Icon name="cash" size={Math.round(size * 0.46)} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  // 3. Type: WALLET
  if (type === 'WALLET') {
    return (
      <LinearGradient
        colors={['#311B92', '#512DA8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { width: size, height: size, borderRadius }]}
      >
        <Icon name="wallet" size={Math.round(size * 0.44)} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  // 4. Type: OTHER
  if (type === 'OTHER') {
    return (
      <LinearGradient
        colors={['#27272A', '#3F3F46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { width: size, height: size, borderRadius }]}
      >
        <Icon name="menu" size={Math.round(size * 0.42)} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  // 5. Generic Bank (matches middle item in reference screenshot)
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }]}>
      <Image
        source={require('@/assets/images/logos/bank_generic.png')}
        style={{ width: size, height: size, borderRadius }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121215',
  },
});
