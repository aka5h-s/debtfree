import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/contexts/DataContext';
import { C, FONT } from '@/theme/neo';
import {
  BackButton,
  Field,
  TiltButton,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';

export default function EditPersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { people, updatePerson } = useData();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const person = people.find((p) => p.id === personId);

  const [name, setName] = useState(person?.name || '');
  const [phone, setPhone] = useState(person?.phone || '');
  const [notes, setNotes] = useState(person?.notes || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!person) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) + 16, paddingHorizontal: 20 }]}>
        <BackButton />
        <Text style={[styles.title, { marginTop: 24 }]}>Person not found</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }

    const isDuplicate = people.some(
      (p) => p.id !== person.id && p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setError(`Another contact named "${trimmed}" already exists.`);
      return;
    }

    setSubmitting(true);
    try {
      await updatePerson({
        ...person,
        name: trimmed,
        phone: phone.trim(),
        notes: notes.trim(),
      });
      showToast('Person updated');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to update person');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <BackButton />
        </View>

        <Text style={styles.title}>Edit Person</Text>
        <Text style={styles.subtitle}>Update contact details for {person.name}</Text>

        <View style={styles.form}>
          <Field
            label="FULL NAME"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            placeholder="Contact name"
            error={error}
          />

          <Field
            label="PHONE NUMBER (OPTIONAL)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
          />

          <Field
            label="NOTES (OPTIONAL)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes..."
          />

          <TiltButton
            disabled={submitting}
            onPress={handleSave}
            style={{ marginTop: 12 }}
          >
            {submitting ? 'SAVING…' : 'SAVE CHANGES'}
          </TiltButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBar: {
    marginBottom: 20,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: C.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONT.sans,
    fontSize: 14,
    color: C.muted,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
});
