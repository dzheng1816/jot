import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { theme } from '../../constants/theme';
import { useNoteStore } from '../../store/useNoteStore';
import { Priority } from '../../types/note';
import { JotLogo } from '../../components/JotLogo';
import { Composer } from '../../components/Composer';
import { NoteCard } from '../../components/NoteCard';
import { PriorityFilter } from '../../components/PriorityFilter';
import { PriorityPicker, PriorityPickerHandle } from '../../components/PriorityPicker';
import { ReminderPicker, ReminderPickerHandle } from '../../components/ReminderPicker';
import { EmptyState } from '../../components/EmptyState';
import {
  scheduleReminderNotification,
  cancelNotification,
} from '../../utils/notifications';
import { getNoteById } from '../../db/queries';

export default function HomeScreen() {
  const pinnedNotes = useNoteStore((s) => s.pinnedNotes);
  const recentNotes = useNoteStore((s) => s.recentNotes);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [thoughtsCollapsed, setThoughtsCollapsed] = useState(false);
  const loadFeed = useNoteStore((s) => s.loadFeed);
  const updatePriority = useNoteStore((s) => s.updatePriority);
  const updateReminder = useNoteStore((s) => s.updateReminder);

  // Track which note the inline pickers are targeting
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNotePriority, setActiveNotePriority] = useState<Priority>('none');
  const [activeNoteReminder, setActiveNoteReminder] = useState<string | null>(null);
  const priorityPickerRef = useRef<PriorityPickerHandle>(null);
  const reminderPickerRef = useRef<ReminderPickerHandle>(null);

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
      ? [{ title: 'Pinned', data: pinnedCollapsed ? [] : pinnedNotes, count: pinnedNotes.length }]
      : []),
    ...(recentNotes.length > 0
      ? [{ title: 'Thoughts', data: thoughtsCollapsed ? [] : recentNotes, count: recentNotes.length }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <JotLogo size={52} />
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
        renderSectionHeader={({ section }) => {
          const isCollapsed =
            section.title === 'Pinned' ? pinnedCollapsed : thoughtsCollapsed;
          const toggle =
            section.title === 'Pinned'
              ? () => setPinnedCollapsed((p) => !p)
              : () => setThoughtsCollapsed((p) => !p);
          return (
            <Pressable onPress={toggle} style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                {section.title} ({(section as any).count})
              </Text>
              <Ionicons
                name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          );
        }}
        renderItem={({ item, index }) => (
          <NoteCard
            note={item}
            index={index}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  sectionHeader: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 100,
  },
});
