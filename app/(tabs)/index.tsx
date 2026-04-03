import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
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
} from '../../utils/notifications';
import { getNoteById } from '../../db/queries';
import { confirmAction } from '../../utils/confirm';

export default function HomeScreen() {
  const pinnedNotes = useNoteStore((s) => s.pinnedNotes);
  const recentNotes = useNoteStore((s) => s.recentNotes);
  const archivedNotes = useNoteStore((s) => s.archivedNotes);
  const priorityFilter = useNoteStore((s) => s.priorityFilter);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [thoughtsCollapsed, setThoughtsCollapsed] = useState(false);
  const loadFeed = useNoteStore((s) => s.loadFeed);
  const setPriorityFilter = useNoteStore((s) => s.setPriorityFilter);
  const updatePriority = useNoteStore((s) => s.updatePriority);
  const updateReminder = useNoteStore((s) => s.updateReminder);
  const permanentlyDeleteNotes = useNoteStore((s) => s.permanentlyDeleteNotes);
  const deleteAllArchivedNotes = useNoteStore((s) => s.deleteAllArchivedNotes);
  const isArchive = priorityFilter === 'archive';
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNotePriority, setActiveNotePriority] = useState<Priority>('none');
  const [activeNoteReminder, setActiveNoteReminder] = useState<string | null>(null);
  const priorityPickerRef = useRef<PriorityPickerHandle>(null);
  const reminderPickerRef = useRef<ReminderPickerHandle>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    if (!isArchive) {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [isArchive]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const handleOpenPriority = useCallback(
    async (noteId: string) => {
      Keyboard.dismiss();
      const note = await getNoteById(noteId);
      if (note) {
        setActiveNoteId(noteId);
        setActiveNotePriority(note.priority);
        setTimeout(() => priorityPickerRef.current?.expand(), 100);
      }
    },
    []
  );

  const handleOpenReminder = useCallback(
    async (noteId: string) => {
      Keyboard.dismiss();
      const note = await getNoteById(noteId);
      if (note) {
        setActiveNoteId(noteId);
        setActiveNoteReminder(note.reminder_at);
        setTimeout(() => reminderPickerRef.current?.expand(), 100);
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

  const sections = isArchive
    ? archivedNotes.length > 0
      ? [{ title: 'Archive', data: archivedNotes, count: archivedNotes.length }]
      : []
    : [
        ...(pinnedNotes.length > 0
          ? [{ title: 'Pinned', data: pinnedCollapsed ? [] : pinnedNotes, count: pinnedNotes.length }]
          : []),
        ...(recentNotes.length > 0
          ? [{ title: 'Thoughts', data: thoughtsCollapsed ? [] : recentNotes, count: recentNotes.length }]
          : []),
      ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header: logo left, settings right */}
      <View style={styles.header}>
        {isArchive ? (
          <Pressable onPress={() => setPriorityFilter('all')} hitSlop={12} style={styles.backRow}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
            <Text style={styles.backText}>Archive</Text>
          </Pressable>
        ) : (
          <JotLogo size={52} />
        )}
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <Ionicons
            name="settings-outline"
            size={24}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {!isArchive && <Composer />}
            <PriorityFilter />
            {isArchive && archivedNotes.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>
                    Archive ({archivedNotes.length})
                  </Text>
                </View>
                <View style={styles.archiveActions}>
                  <Pressable
                    onPress={() => {
                      if (selectMode) {
                        setSelectMode(false);
                        setSelectedIds(new Set());
                      } else {
                        setSelectMode(true);
                      }
                    }}
                    style={[styles.archiveBtn, selectMode && styles.archiveBtnActive]}
                  >
                    <Ionicons
                      name={selectMode ? 'close-outline' : 'checkmark-circle-outline'}
                      size={15}
                      color={selectMode ? theme.colors.accent : theme.colors.textSecondary}
                    />
                    <Text style={[styles.archiveBtnText, selectMode && { color: theme.colors.accent }]}>
                      {selectMode ? 'Cancel' : 'Select'}
                    </Text>
                  </Pressable>
                  {selectMode && selectedIds.size > 0 && (
                    <Pressable
                      onPress={() => {
                        const count = selectedIds.size;
                        const ids = Array.from(selectedIds);
                        confirmAction(
                          `Delete ${count} note${count > 1 ? 's' : ''}?`,
                          'This cannot be undone.',
                          async () => {
                            await permanentlyDeleteNotes(ids);
                            setSelectedIds(new Set());
                            setSelectMode(false);
                          },
                          'Delete'
                        );
                      }}
                      style={styles.archiveBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                      <Text style={[styles.archiveBtnText, { color: theme.colors.danger }]}>
                        Delete ({selectedIds.size})
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      confirmAction(
                        'Delete all archived notes?',
                        'This cannot be undone.',
                        async () => {
                          await deleteAllArchivedNotes();
                          setSelectMode(false);
                          setSelectedIds(new Set());
                        },
                        'Delete All'
                      );
                    }}
                    style={styles.archiveBtn}
                  >
                    <Ionicons name="trash-bin-outline" size={15} color={theme.colors.danger} />
                    <Text style={[styles.archiveBtnText, { color: theme.colors.danger }]}>
                      Delete All
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        }
        renderSectionHeader={({ section }) => {
          if (section.title === 'Archive') {
            return null;
          }
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
            onOpenPriority={isArchive ? undefined : handleOpenPriority}
            onOpenReminder={isArchive ? undefined : handleOpenReminder}
            isArchived={isArchive}
            selectMode={isArchive && selectMode}
            isSelected={selectedIds.has(item.id)}
            onToggleSelect={handleToggleSelect}
          />
        )}
        ListEmptyComponent={
          <EmptyState message={isArchive ? "No deleted notes." : "No notes yet. Start typing above!"} />
        }
        extraData={[selectMode, selectedIds.size, isArchive]}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  archiveActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
  },
  archiveBtnActive: {
    backgroundColor: theme.colors.accentLight,
  },
  archiveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingBottom: 100,
  },
});
