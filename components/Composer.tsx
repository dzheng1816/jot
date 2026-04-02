import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, Animated } from 'react-native';
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
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const priorityRef = useRef<PriorityPickerHandle>(null);
  const reminderRef = useRef<ReminderPickerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExpandingRef = useRef(false);
  const isOpeningPickerRef = useRef(false);
  const shadowAnim = useRef(new Animated.Value(0.05)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const {
    createNote,
    updateBody,
    togglePin,
    updatePriority,
    updateReminder,
    loadFeed,
  } = useNoteStore();

  const resetComposer = useCallback(() => {
    setText('');
    setActiveNote(null);
    setPriority('none');
    setIsPinned(false);
    setReminderAt(null);
    setNotificationId(null);
    setIsFocused(false);
  }, []);

  // "Jot" (done) button — save, dismiss, reset
  const handleDone = useCallback(async () => {
    isExpandingRef.current = true; // prevent blur cleanup
    Keyboard.dismiss();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (activeNote) {
      if (text.trim() === '') {
        const { deleteNote } = useNoteStore.getState();
        await deleteNote(activeNote.id);
      } else {
        await updateBody(activeNote.id, text);
      }
      await loadFeed();
    }

    resetComposer();
    isExpandingRef.current = false;
  }, [activeNote, text, updateBody, loadFeed, resetComposer]);

  const handleChangeText = useCallback(
    async (value: string) => {
      if (isExpandingRef.current) return;

      setText(value);

      if (!activeNote && value.length > 0) {
        const note = await createNote(value);
        setActiveNote(note);
        loadFeed();

        // Pasted text > 100 chars: expand immediately
        if (value.length > 100) {
          isExpandingRef.current = true;
          await updateBody(note.id, value);
          await loadFeed();
          inputRef.current?.blur();
          setTimeout(() => {
            resetComposer();
            isExpandingRef.current = false;
            router.push(`/note/${note.id}?autoFocus=true`);
          }, 50);
        }
        return;
      }

      if (activeNote) {
        // Auto-expand to full screen at 100 characters
        if (value.length > 100) {
          isExpandingRef.current = true;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          // Save current text immediately
          await updateBody(activeNote.id, value);
          await loadFeed();
          const noteId = activeNote.id;
          inputRef.current?.blur();
          setTimeout(() => {
            resetComposer();
            isExpandingRef.current = false;
            router.push(`/note/${noteId}?autoFocus=true`);
          }, 50);
          return;
        }

        // Debounced save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          await updateBody(activeNote.id, value);
          loadFeed();
        }, 300);
      }
    },
    [activeNote, createNote, updateBody, loadFeed, resetComposer]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.12,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBlur = useCallback(async () => {
    // Skip blur cleanup when expanding to full screen or opening a picker
    if (isExpandingRef.current || isOpeningPickerRef.current) {
      isOpeningPickerRef.current = false;
      return;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.05,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (activeNote) {
      if (text.trim() === '') {
        const { deleteNote } = useNoteStore.getState();
        await deleteNote(activeNote.id);
      } else {
        await updateBody(activeNote.id, text);
      }
      await loadFeed();
    }
    resetComposer();
  }, [activeNote, text, updateBody, loadFeed, resetComposer]);

  const handlePinToggle = useCallback(async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (activeNote) {
      await togglePin(activeNote.id, newPinned);
    }
  }, [isPinned, activeNote, togglePin]);

  const openPriorityPicker = useCallback(() => {
    isOpeningPickerRef.current = true;
    Keyboard.dismiss();
    // Small delay to ensure blur fires first with the guard set
    setTimeout(() => {
      priorityRef.current?.expand();
    }, 100);
  }, []);

  const openReminderPicker = useCallback(() => {
    isOpeningPickerRef.current = true;
    Keyboard.dismiss();
    setTimeout(() => {
      reminderRef.current?.expand();
    }, 100);
  }, []);

  const handlePrioritySelect = useCallback(
    async (p: Priority) => {
      setPriority(p);
      if (activeNote) {
        await updatePriority(activeNote.id, p);
        await loadFeed();
      }
      // Re-focus the input so user can keep typing
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [activeNote, updatePriority, loadFeed]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      setReminderAt(isoString);

      if (notificationId) {
        await cancelNotification(notificationId);
        setNotificationId(null);
      }

      if (activeNote) {
        await updateReminder(activeNote.id, isoString);

        if (isoString) {
          const nId = await scheduleReminderNotification(
            activeNote.id,
            text.substring(0, 50),
            new Date(isoString)
          );
          setNotificationId(nId);
        }
        await loadFeed();
      }
      // Re-focus the input so user can keep typing
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [activeNote, notificationId, text, updateReminder, loadFeed]
  );

  const pColor = priorityColor(priority);
  const showDoneButton = isFocused || text.length > 0;

  return (
    <>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
            shadowOpacity: shadowAnim,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
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

          {showDoneButton && (
            <Pressable onPress={handleDone} style={styles.jotButton}>
              <Text style={styles.jotButtonText}>Jot</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

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
