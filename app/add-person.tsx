import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { NeoPopButton } from '@/components/NeoPopButton';

export default function AddPersonScreen() {
  const { addPerson } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    await addPerson(name.trim(), phone.trim(), notes.trim());
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Person</Text>

        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          placeholder="Enter name"
          placeholderTextColor={Colors.textMuted}
          autoFocus
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>PHONE (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />

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
            <Text style={styles.ctaText}>SAVE</Text>
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
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_400Regular',
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
    fontFamily: 'Inter_400Regular',
    color: Colors.negative,
    marginTop: 6,
  },
  actions: {
    marginTop: 32,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
    letterSpacing: 1,
  },
});
