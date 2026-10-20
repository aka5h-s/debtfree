import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/contexts/DataContext';
import { C, FONT } from '@/theme/neo';
import {
  BackButton,
  Field,
  TiltButton,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';

export default function AddPersonScreen() {
  const { people, addPerson } = useData();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }

    const isDuplicate = people.some(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setError(`"${trimmed}" already exists in your contacts.`);
      return;
    }

    setSubmitting(true);
    try {
      await addPerson(trimmed, phone.trim(), notes.trim());
      showToast('Person added');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to add person');
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

        <Text style={styles.title}>Add Person</Text>
        <Text style={styles.subtitle}>Create a new contact to track loans and dues</Text>

        <View style={styles.form}>
          <Field
            label="FULL NAME"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            placeholder="e.g. Rahul Sharma"
            error={error}
            autoFocus
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
            placeholder="Roommate, colleague, etc."
          />

          <TiltButton
            disabled={submitting}
            onPress={handleSave}
            style={{ marginTop: 12 }}
          >
            {submitting ? 'SAVING…' : 'SAVE PERSON'}
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
