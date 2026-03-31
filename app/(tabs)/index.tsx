import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { theme } from '../../constants/theme';
import { useNoteStore } from '../../store/useNoteStore';
import { Priority } from '../../types/note';
import { Composer } from '../../components/Composer';
import { NoteCard } from '../../components/NoteCard';
import { PriorityFilter } from '../../components/PriorityFilter';
import { PriorityPicker } from '../../components/PriorityPicker';
import { ReminderPicker } from '../../components/ReminderPicker';
import { EmptyState } from '../../components/EmptyState';
import {
  scheduleReminderNotification,
  cancelNotification,
} from '../../utils/notifications';
import { getNoteById } from '../../db/queries';

export default function HomeScreen() {
  const pinnedNotes = useNoteStore((s) => s.pinnedNotes);
  const recentNotes = useNoteStore((s) => s.recentNotes);
  const loadFeed = useNoteStore((s) => s.loadFeed);
  const updatePriority = useNoteStore((s) => s.updatePriority);
  const updateReminder = useNoteStore((s) => s.updateReminder);

  // Track which note the inline pickers are targeting
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNotePriority, setActiveNotePriority] = useState<Priority>('none');
  const [activeNoteReminder, setActiveNoteReminder] = useState<string | null>(null);
  const priorityPickerRef = useRef<BottomSheet>(null);
  const reminderPickerRef = useRef<BottomSheet>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const handleOpenPriority = useCallback(
    async (noteId: string) => {
      const note = await getNoteById(noteId);
      if (note) {
        setActiveNoteId(noteId);
        setActiveNotePriority(note.priority);
        priorityPickerRef.current?.expand();
      }
    },
    []
  );

  const handleOpenReminder = useCallback(
    async (noteId: string) => {
      const note = await getNoteById(noteId);
      if (note) {
        setActiveNoteId(noteId);
        setActiveNoteReminder(note.reminder_at);
        reminderPickerRef.current?.expand();
      }
    },
    []
  );

  const handlePrioritySelect = useCallback(
    async (priority: Priority) => {
      if (!activeNoteId) return;
      await updatePriority(activeNoteId, priority);
    },
    [activeNoteId, updatePriority]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      if (!activeNoteId) return;
      const note = await getNoteById(activeNoteId);

      // Cancel old reminder notification if any
      if (note?.reminder_at) {
        // We don't store notification IDs per-note in this flow,
        // but updateReminder handles the DB side
      }

      await updateReminder(activeNoteId, isoString);

      if (isoString && note) {
        await scheduleReminderNotification(
          activeNoteId,
          note.body.substring(0, 50),
          new Date(isoString)
        );
      }
    },
    [activeNoteId, updateReminder]
  );

  const sections = [
    ...(pinnedNotes.length > 0
      ? [{ title: 'Pinned', data: pinnedNotes }]
      : []),
    ...(recentNotes.length > 0
      ? [{ title: 'Recent', data: recentNotes }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Jot</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Composer />
            <PriorityFilter />
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onOpenPriority={handleOpenPriority}
            onOpenReminder={handleOpenReminder}
          />
        )}
        ListEmptyComponent={
          <EmptyState message="No notes yet. Start typing above!" />
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Shared bottom sheet pickers for inline card actions */}
      <PriorityPicker
        ref={priorityPickerRef}
        currentPriority={activeNotePriority}
        onSelect={handlePrioritySelect}
      />
      <ReminderPicker
        ref={reminderPickerRef}
        currentReminder={activeNoteReminder}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Fredoka_700Bold',
    color: theme.colors.accent,
  },
  sectionHeader: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  listContent: {
    paddingBottom: 100,
  },
});
