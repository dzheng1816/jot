import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../constants/theme';
import { Note, Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';
import { PriorityPicker, PriorityPickerHandle } from './PriorityPicker';
import { ReminderPicker, ReminderPickerHandle } from './ReminderPicker';
import {
  scheduleReminderNotification,
  cancelNotification,
} from '../utils/notifications';

export function Composer() {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [isPinned, setIsPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const priorityRef = useRef<PriorityPickerHandle>(null);
  const reminderRef = useRef<ReminderPickerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const textRef = useRef('');
  const isPickerOpen = useRef(false);
  const isNavigating = useRef(false);

  const {
    createNote,
    updateBody,
    togglePin,
    updatePriority,
    updateReminder,
    deleteNote,
    loadFeed,
  } = useNoteStore();

  const resetComposer = useCallback(() => {
    setText('');
    textRef.current = '';
    noteIdRef.current = null;
    setPriority('none');
    setIsPinned(false);
    setReminderAt(null);
    setNotificationId(null);
    isNavigating.current = false;
  }, []);

  // Ensure a note record exists, return its ID
  const ensureNote = useCallback(async (currentText: string): Promise<string> => {
    if (noteIdRef.current) return noteIdRef.current;
    const note = await createNote(currentText);
    noteIdRef.current = note.id;
    loadFeed();
    return note.id;
  }, [createNote, loadFeed]);

  // "Jot" (done) button
  const handleDone = useCallback(async () => {
    Keyboard.dismiss();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const id = noteIdRef.current;
    const currentText = textRef.current.trim();

    if (id) {
      if (currentText === '') {
        await deleteNote(id);
      } else {
        await updateBody(id, textRef.current);
      }
      await loadFeed();
    }
    resetComposer();
  }, [updateBody, deleteNote, loadFeed, resetComposer]);

  const handleChangeText = useCallback(
    async (value: string) => {
      // Ignore if we're navigating away
      if (isNavigating.current) return;

      setText(value);
      textRef.current = value;

      if (value.length === 0) return;

      // Ensure note exists
      const id = await ensureNote(value);

      // Auto-expand to full screen at 100 characters
      if (value.length > 100) {
        isNavigating.current = true;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        // Save the text before navigating
        await updateBody(id, value);
        await loadFeed();
        // Navigate first, THEN reset — so the note detail picks up the saved text
        router.push(`/note/${id}?autoFocus=true`);
        // Delay reset so navigation completes
        setTimeout(() => {
          resetComposer();
        }, 300);
        return;
      }

      // Debounced save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (noteIdRef.current) {
          await updateBody(noteIdRef.current, textRef.current);
          loadFeed();
        }
      }, 300);
    },
    [ensureNote, updateBody, loadFeed, resetComposer]
  );

  // On blur: save but DON'T reset if picker is open
  const handleBlur = useCallback(async () => {
    // Don't do anything if a picker modal is open — user is just switching focus
    if (isPickerOpen.current) return;
    if (isNavigating.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (noteIdRef.current && textRef.current.length > 0) {
      await updateBody(noteIdRef.current, textRef.current);
      loadFeed();
    }
  }, [updateBody, loadFeed]);

  const handlePinToggle = useCallback(async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (noteIdRef.current) {
      await togglePin(noteIdRef.current, newPinned);
    }
  }, [isPinned, togglePin]);

  const openPriorityPicker = useCallback(() => {
    isPickerOpen.current = true;
    priorityRef.current?.expand();
  }, []);

  const openReminderPicker = useCallback(() => {
    isPickerOpen.current = true;
    reminderRef.current?.expand();
  }, []);

  const handlePrioritySelect = useCallback(
    async (p: Priority) => {
      isPickerOpen.current = false;
      setPriority(p);
      if (noteIdRef.current) {
        await updatePriority(noteIdRef.current, p);
        await loadFeed();
      }
      // Re-focus input after picker closes
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [updatePriority, loadFeed]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      isPickerOpen.current = false;
      setReminderAt(isoString);

      if (notificationId) {
        await cancelNotification(notificationId);
        setNotificationId(null);
      }

      if (noteIdRef.current) {
        await updateReminder(noteIdRef.current, isoString);

        if (isoString) {
          const nId = await scheduleReminderNotification(
            noteIdRef.current,
            textRef.current.substring(0, 50),
            new Date(isoString)
          );
          setNotificationId(nId);
        }
        await loadFeed();
      }
      // Re-focus input after picker closes
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [notificationId, updateReminder, loadFeed]
  );

  // When picker modal closes without selection (tap overlay)
  const handlePriorityPickerClose = useCallback(() => {
    isPickerOpen.current = false;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleReminderPickerClose = useCallback(() => {
    isPickerOpen.current = false;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const pColor = priorityColor(priority);
  const showJotButton = text.length > 0;

  return (
    <>
      <View style={styles.card}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.actionsRow}>
          <View style={styles.actions}>
            <Pressable onPress={handlePinToggle} hitSlop={8}>
              <Ionicons
                name={isPinned ? 'pin' : 'pin-outline'}
                size={20}
                color={isPinned ? theme.colors.accent : theme.colors.textSecondary}
              />
            </Pressable>
            <Pressable onPress={openPriorityPicker} hitSlop={8}>
              <View
                style={[
                  styles.priorityButton,
                  { backgroundColor: pColor || theme.colors.border },
                ]}
              />
            </Pressable>
            <Pressable onPress={openReminderPicker} hitSlop={8}>
              <Ionicons
                name={reminderAt ? 'alarm' : 'alarm-outline'}
                size={20}
                color={reminderAt ? theme.colors.accent : theme.colors.textSecondary}
              />
            </Pressable>
          </View>

          {showJotButton && (
            <Pressable onPress={handleDone} style={styles.jotButton}>
              <Text style={styles.jotButtonText}>Jot</Text>
            </Pressable>
          )}
        </View>
      </View>

      <PriorityPicker
        ref={priorityRef}
        currentPriority={priority}
        onSelect={handlePrioritySelect}
        onClose={handlePriorityPickerClose}
      />
      <ReminderPicker
        ref={reminderRef}
        currentReminder={reminderAt}
        onSelect={handleReminderSelect}
        onClose={handleReminderPickerClose}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.composer,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    minHeight: 40,
    maxHeight: 120,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
  },
  priorityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  jotButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  jotButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Gluten_700Bold',
  },
});
