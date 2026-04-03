import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
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
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [priority, setPriority] = useState<Priority>('none');
  const [isPinned, setIsPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const priorityRef = useRef<PriorityPickerHandle>(null);
  const reminderRef = useRef<ReminderPickerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteRef = useRef<Note | null>(null); // mirror for async callbacks
  const textRef = useRef(''); // mirror for async callbacks

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
    setActiveNote(null);
    activeNoteRef.current = null;
    setPriority('none');
    setIsPinned(false);
    setReminderAt(null);
    setNotificationId(null);
  }, []);

  // "Jot" (done) button — save, dismiss, reset
  const handleDone = useCallback(async () => {
    Keyboard.dismiss();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const note = activeNoteRef.current;
    const currentText = textRef.current;

    if (note) {
      if (currentText.trim() === '') {
        await deleteNote(note.id);
      } else {
        await updateBody(note.id, currentText);
      }
      await loadFeed();
    }

    resetComposer();
  }, [updateBody, deleteNote, loadFeed, resetComposer]);

  const handleChangeText = useCallback(
    async (value: string) => {
      setText(value);
      textRef.current = value;

      // First character typed — create a new note
      if (!activeNoteRef.current && value.length > 0) {
        const note = await createNote(value);
        setActiveNote(note);
        activeNoteRef.current = note;
        loadFeed();

        // If pasted text is already >100 chars, expand immediately
        if (value.length > 100) {
          await updateBody(note.id, value);
          await loadFeed();
          resetComposer();
          router.push(`/note/${note.id}?autoFocus=true`);
        }
        return;
      }

      if (activeNoteRef.current) {
        // Auto-expand to full screen at 100 characters
        if (value.length > 100) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          const noteId = activeNoteRef.current.id;
          await updateBody(noteId, value);
          await loadFeed();
          resetComposer();
          router.push(`/note/${noteId}?autoFocus=true`);
          return;
        }

        // Debounced save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          if (activeNoteRef.current) {
            await updateBody(activeNoteRef.current.id, textRef.current);
            loadFeed();
          }
        }, 300);
      }
    },
    [createNote, updateBody, loadFeed, resetComposer]
  );

  // On blur: just save, don't reset (user might tap priority/reminder)
  const handleBlur = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (activeNoteRef.current && textRef.current.length > 0) {
      await updateBody(activeNoteRef.current.id, textRef.current);
      loadFeed();
    }
  }, [updateBody, loadFeed]);

  const handlePinToggle = useCallback(async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (activeNoteRef.current) {
      await togglePin(activeNoteRef.current.id, newPinned);
    }
  }, [isPinned, togglePin]);

  // Open pickers WITHOUT dismissing keyboard — just show modal on top
  const openPriorityPicker = useCallback(() => {
    priorityRef.current?.expand();
  }, []);

  const openReminderPicker = useCallback(() => {
    reminderRef.current?.expand();
  }, []);

  const handlePrioritySelect = useCallback(
    async (p: Priority) => {
      setPriority(p);
      if (activeNoteRef.current) {
        await updatePriority(activeNoteRef.current.id, p);
        await loadFeed();
      }
    },
    [updatePriority, loadFeed]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      setReminderAt(isoString);

      if (notificationId) {
        await cancelNotification(notificationId);
        setNotificationId(null);
      }

      if (activeNoteRef.current) {
        await updateReminder(activeNoteRef.current.id, isoString);

        if (isoString) {
          const nId = await scheduleReminderNotification(
            activeNoteRef.current.id,
            textRef.current.substring(0, 50),
            new Date(isoString)
          );
          setNotificationId(nId);
        }
        await loadFeed();
      }
    },
    [notificationId, updateReminder, loadFeed]
  );

  const pColor = priorityColor(priority);
  const showActions = text.length > 0 || activeNote !== null;

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

          {showActions && (
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
      />
      <ReminderPicker
        ref={reminderRef}
        currentReminder={reminderAt}
        onSelect={handleReminderSelect}
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
