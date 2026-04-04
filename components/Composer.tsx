import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../constants/theme';
import { Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';
import { PriorityPicker, PriorityPickerHandle } from './PriorityPicker';
import { ReminderPicker, ReminderPickerHandle } from './ReminderPicker';
import { scheduleReminderNotification } from '../utils/notifications';
import { processAutoList } from '../utils/autoList';

interface ComposerProps {
  onFocusChange?: (focused: boolean) => void;
}

export function Composer({ onFocusChange }: ComposerProps) {
  // All draft state — nothing touches the DB until "Jot" is tapped
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [isPinned, setIsPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const elevationAnim = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);
  const priorityRef = useRef<PriorityPickerHandle>(null);
  const reminderRef = useRef<ReminderPickerHandle>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(true);
    Animated.spring(elevationAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [onFocusChange, elevationAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onFocusChange?.(false);
    Animated.spring(elevationAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [onFocusChange, elevationAnim]);

  const { createNote, updateBody, togglePin, updatePriority, updateReminder, loadFeed } =
    useNoteStore();

  const resetComposer = useCallback(() => {
    setText('');
    setPriority('none');
    setIsPinned(false);
    setReminderAt(null);
  }, []);

  // "Jot" button — create the note in DB with all draft metadata, then reset
  const handleDone = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    // Create note
    const note = await createNote(trimmed);

    // Apply metadata if set
    if (isPinned) await togglePin(note.id, true);
    if (priority !== 'none') await updatePriority(note.id, priority);
    if (reminderAt) {
      await updateReminder(note.id, reminderAt);
      await scheduleReminderNotification(
        note.id,
        trimmed.substring(0, 50),
        new Date(reminderAt)
      );
    }

    resetComposer();
    await loadFeed();
  }, [text, isPinned, priority, reminderAt, createNote, togglePin, updatePriority, updateReminder, loadFeed, resetComposer]);

  // Auto-expand to full screen at 100 characters
  const handleChangeText = useCallback(
    async (rawValue: string) => {
      // Auto-list processing
      const { text: value } = processAutoList(text, rawValue);
      setText(value);

      if (value.length > 100) {
        // Create note in DB, apply metadata, then navigate
        const note = await createNote(value);
        if (isPinned) await togglePin(note.id, true);
        if (priority !== 'none') await updatePriority(note.id, priority);
        if (reminderAt) {
          await updateReminder(note.id, reminderAt);
          await scheduleReminderNotification(
            note.id,
            value.substring(0, 50),
            new Date(reminderAt)
          );
        }

        resetComposer();
        await loadFeed();
        router.push(`/note/${note.id}?autoFocus=true`);
      }
    },
    [isPinned, priority, reminderAt, createNote, togglePin, updatePriority, updateReminder, loadFeed, resetComposer]
  );

  const handlePinToggle = useCallback(() => {
    setIsPinned((prev) => !prev);
  }, []);

  const handlePrioritySelect = useCallback((p: Priority) => {
    setPriority(p);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const handleReminderSelect = useCallback((isoString: string | null) => {
    setReminderAt(isoString);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const handlePickerClose = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const pColor = priorityColor(priority);
  const showJotButton = text.length > 0;

  const animatedCardStyle = {
    shadowOpacity: elevationAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.05, 0.18],
    }),
    shadowRadius: elevationAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [4, 16],
    }),
    transform: [{
      scale: elevationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.015],
      }),
    }],
    elevation: elevationAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 12],
    }),
  };

  return (
    <>
      <Animated.View style={[styles.card, animatedCardStyle, isFocused && styles.cardFocused]}>
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
            <Pressable onPress={() => { Keyboard.dismiss(); setTimeout(() => priorityRef.current?.expand(), 150); }} hitSlop={8}>
              <View
                style={[
                  styles.priorityButton,
                  { backgroundColor: pColor || theme.colors.border },
                ]}
              />
            </Pressable>
            <Pressable onPress={() => { Keyboard.dismiss(); setTimeout(() => reminderRef.current?.expand(), 150); }} hitSlop={8}>
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
      </Animated.View>

      <PriorityPicker
        ref={priorityRef}
        currentPriority={priority}
        onSelect={handlePrioritySelect}
        onClose={handlePickerClose}
      />
      <ReminderPicker
        ref={reminderRef}
        currentReminder={reminderAt}
        onSelect={handleReminderSelect}
        onClose={handlePickerClose}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.composer,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
    position: 'relative',
  },
  cardFocused: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
  },
  input: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    minHeight: 80,
    maxHeight: 200,
    textAlignVertical: 'top',
    outlineStyle: 'none',
    borderWidth: 0,
    padding: 0,
  } as any,
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
    fontWeight: '700',
  },
});
