import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../../constants/theme';
import { Note, Priority } from '../../types/note';
import { useNoteStore } from '../../store/useNoteStore';
import { getNoteById } from '../../db/queries';
import { PriorityPicker } from '../../components/PriorityPicker';
import { ReminderPicker } from '../../components/ReminderPicker';
import { relativeTime, formatReminderTime } from '../../utils/time';
import {
  scheduleReminderNotification,
  cancelNotification,
} from '../../utils/notifications';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priorityRef = useRef<BottomSheet>(null);
  const reminderRef = useRef<BottomSheet>(null);
  const notificationIdRef = useRef<string | null>(null);

  const { updateBody, togglePin, updatePriority, updateReminder, deleteNote } =
    useNoteStore();

  // Load note
  useEffect(() => {
    if (!id) return;
    getNoteById(id).then((n) => {
      if (n) {
        setNote(n);
        setBody(n.body);
      }
    });
  }, [id]);

  // Auto-save on text change
  const handleChangeText = useCallback(
    (value: string) => {
      setBody(value);
      if (!note) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await updateBody(note.id, value);
        setNote((prev) =>
          prev
            ? { ...prev, body: value, updated_at: new Date().toISOString() }
            : prev
        );
      }, 300);
    },
    [note, updateBody]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!note) return;
    const newPinned = !note.is_pinned;
    await togglePin(note.id, newPinned);
    setNote((prev) => (prev ? { ...prev, is_pinned: newPinned } : prev));
  }, [note, togglePin]);

  const handlePrioritySelect = useCallback(
    async (p: Priority) => {
      if (!note) return;
      await updatePriority(note.id, p);
      setNote((prev) => (prev ? { ...prev, priority: p } : prev));
    },
    [note, updatePriority]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      if (!note) return;

      // Cancel old notification
      if (notificationIdRef.current) {
        await cancelNotification(notificationIdRef.current);
        notificationIdRef.current = null;
      }

      await updateReminder(note.id, isoString);
      setNote((prev) =>
        prev ? { ...prev, reminder_at: isoString } : prev
      );

      // Schedule new notification
      if (isoString) {
        const nId = await scheduleReminderNotification(
          note.id,
          body.substring(0, 50),
          new Date(isoString)
        );
        notificationIdRef.current = nId;
      }
    },
    [note, body, updateReminder]
  );

  const handleDelete = useCallback(() => {
    if (!note) return;
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
          }
          await deleteNote(note.id);
          router.back();
        },
      },
    ]);
  }, [note, deleteNote]);

  if (!note) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const pColor = priorityColor(note.priority);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.editedText}>
            Edited {relativeTime(note.updated_at)}
          </Text>
        </View>

        {/* Editor */}
        <ScrollView
          style={styles.editorScroll}
          keyboardDismissMode="interactive"
        >
          <TextInput
            style={styles.editor}
            value={body}
            onChangeText={handleChangeText}
            multiline
            autoFocus={false}
            textAlignVertical="top"
            placeholder="Start typing..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </ScrollView>

        {/* Action pills */}
        <View style={styles.actionsContainer}>
          <View style={styles.pills}>
            <Pressable
              onPress={handleTogglePin}
              style={[
                styles.pill,
                note.is_pinned
                  ? { backgroundColor: theme.colors.accentLight }
                  : { backgroundColor: theme.colors.background },
              ]}
            >
              <Ionicons
                name="pin"
                size={14}
                color={
                  note.is_pinned
                    ? theme.colors.accent
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.pillText,
                  {
                    color: note.is_pinned
                      ? theme.colors.accent
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {note.is_pinned ? 'Pinned' : 'Pin'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => priorityRef.current?.expand()}
              style={[
                styles.pill,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <View
                style={[
                  styles.pillDot,
                  { backgroundColor: pColor || theme.colors.border },
                ]}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {note.priority === 'none'
                  ? 'Priority'
                  : note.priority.charAt(0).toUpperCase() +
                    note.priority.slice(1)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => reminderRef.current?.expand()}
              style={[
                styles.pill,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Ionicons
                name="alarm-outline"
                size={14}
                color={
                  note.reminder_at
                    ? theme.colors.accent
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.pillText,
                  {
                    color: note.reminder_at
                      ? theme.colors.accent
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {note.reminder_at
                  ? formatReminderTime(note.reminder_at)
                  : 'Remind'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PriorityPicker
        ref={priorityRef}
        currentPriority={note.priority}
        onSelect={handlePrioritySelect}
      />
      <ReminderPicker
        ref={reminderRef}
        currentReminder={note.reminder_at}
        onSelect={handleReminderSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: {
    textAlign: 'center',
    marginTop: 100,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  editedText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  editorScroll: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  editor: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    lineHeight: 24,
    paddingTop: theme.spacing.md,
    minHeight: 200,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  pillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
