import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { NeoPopButton } from '@/components/NeoPopButton';

export default function EditPersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { people, updatePerson } = useData();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const person = people.find(p => p.id === personId);

  const [name, setName] = useState(person?.name || '');
  const [phone, setPhone] = useState(person?.phone || '');
  const [notes, setNotes] = useState(person?.notes || '');
  const [error, setError] = useState('');

  if (!person) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { padding: 24 }]}>Person not found</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    await updatePerson({ ...person, name: name.trim(), phone: phone.trim(), notes: notes.trim() });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Edit Person</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </Pressable>
        </View>

        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          placeholder="Enter name"
          placeholderTextColor={Colors.textMuted}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>PHONE (OPTIONAL)</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.phonePrefix}>+91</Text>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phone}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '').slice(0, 10);
              setPhone(digits);
            }}
            placeholder="10-digit mobile number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        {phone.length > 0 && phone.length < 10 && (
          <Text style={styles.phoneHint}>{10 - phone.length} digits remaining</Text>
        )}

        <Text style={styles.label}>NOTES (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <NeoPopTiltedButton onPress={handleSave} showShimmer>
            <Text style={styles.ctaText}>UPDATE</Text>
          </NeoPopTiltedButton>
          <View style={{ height: 12 }} />
          <NeoPopButton onPress={() => router.back()} variant="secondary">
            <View style={styles.cancelBtn}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </View>
          </NeoPopButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden' as const,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    color: Colors.white,
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    color: Colors.white,
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.negative,
  },
  multiline: {
    height: 80,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: Colors.negative,
    marginTop: 6,
  },
  actions: {
    marginTop: 32,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.white,
    letterSpacing: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phonePrefix: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  phoneInput: {
    flex: 1,
  },
  phoneHint: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
});
