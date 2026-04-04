import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Keyboard, Animated } from 'react-native';
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
  const newNoteId = useNoteStore((s) => s.newNoteId);
  const clearNewNoteId = useNoteStore((s) => s.clearNewNoteId);
  const isArchive = priorityFilter === 'archive';
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composerFocused, setComposerFocused] = useState(false);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const handleComposerFocusChange = useCallback((focused: boolean) => {
    setComposerFocused(focused);
    Animated.timing(overlayAnim, {
      toValue: focused ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [overlayAnim]);

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

  // Scroll to bottom when a new note is created, then clear the flag
  useEffect(() => {
    if (newNoteId) {
      const allNotes = [...pinnedNotes, ...recentNotes];
      if (allNotes.length > 0) {
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToEnd({ animated: true });
          } catch {}
        }, 100);
      }
      setTimeout(() => clearNewNoteId(), 600);
    }
  }, [newNoteId, recentNotes.length, pinnedNotes.length]);

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

  const hasPinned = !isArchive && pinnedNotes.length > 0;
  const hasThoughts = !isArchive && recentNotes.length > 0;
  const isEmpty = !isArchive && pinnedNotes.length === 0 && recentNotes.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed header */}
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

      {/* Fixed filter bar */}
      <PriorityFilter />

      {/* Archive toolbar (fixed, only in archive mode) */}
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

      {/* Notes area — fixed headers, scrollable content */}
      <View style={styles.notesList}>
        {isEmpty && (
          <EmptyState message="No notes yet. Start typing below!" />
        )}

        {isArchive && (
          <FlatList
            data={archivedNotes}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <NoteCard
                note={item}
                index={index}
                isArchived
                selectMode={selectMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={handleToggleSelect}
                isNew={item.id === newNoteId}
              />
            )}
            ListEmptyComponent={<EmptyState message="No deleted notes." />}
            extraData={[selectMode, selectedIds.size, newNoteId]}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            style={styles.sectionList}
          />
        )}

        {/* Pinned section */}
        {hasPinned && (
          <>
            <Pressable onPress={() => setPinnedCollapsed((p) => !p)} style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Pinned ({pinnedNotes.length})</Text>
              <Ionicons
                name={pinnedCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            {!pinnedCollapsed && (
              <FlatList
                data={pinnedNotes}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <NoteCard
                    note={item}
                    index={index}
                    onOpenPriority={handleOpenPriority}
                    onOpenReminder={handleOpenReminder}
                    isNew={item.id === newNoteId}
                  />
                )}
                extraData={[newNoteId]}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                style={styles.sectionList}
              />
            )}
          </>
        )}

        {/* Thoughts section */}
        {hasThoughts && (
          <>
            <Pressable onPress={() => setThoughtsCollapsed((p) => !p)} style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Thoughts ({recentNotes.length})</Text>
              <Ionicons
                name={thoughtsCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            {!thoughtsCollapsed && (
              <FlatList
                ref={flatListRef}
                data={recentNotes}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <NoteCard
                    note={item}
                    index={index}
                    onOpenPriority={handleOpenPriority}
                    onOpenReminder={handleOpenReminder}
                    isNew={item.id === newNoteId}
                  />
                )}
                extraData={[newNoteId]}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                style={styles.sectionList}
              />
            )}
          </>
        )}
      </View>

      {/* Dark overlay when composer is focused */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }),
            pointerEvents: composerFocused ? 'auto' : 'none',
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => Keyboard.dismiss()} />
      </Animated.View>

      {/* Fixed composer at bottom */}
      {!isArchive && <Composer onFocusChange={handleComposerFocusChange} />}

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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 2,
  },
  notesList: {
    flex: 1,
  },
  sectionList: {
    flex: 1,
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
});
