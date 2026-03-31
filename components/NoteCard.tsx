import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Note } from '../types/note';
import { PriorityDot } from './PriorityDot';
import { theme, priorityColor } from '../constants/theme';
import { relativeTime, formatReminderTime } from '../utils/time';
import { useNoteStore } from '../store/useNoteStore';

interface Props {
  note: Note;
  onOpenPriority?: (noteId: string) => void;
  onOpenReminder?: (noteId: string) => void;
}

export function NoteCard({ note, onOpenPriority, onOpenReminder }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);

  const handlePress = () => {
    router.push(`/note/${note.id}`);
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote(note.id),
      },
    ]);
  };

  const handleTogglePin = async () => {
    await togglePin(note.id, !note.is_pinned);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    return (
      <Pressable onPress={handleDelete} style={styles.deleteAction}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    );
  };

  const pColor = priorityColor(note.priority);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Pressable onPress={handlePress} style={styles.card}>
        {/* Top row: preview + timestamp */}
        <View style={styles.row}>
          <View style={styles.bodyRow}>
            <PriorityDot priority={note.priority} />
            <Text style={styles.body} numberOfLines={1}>
              {note.body || 'Empty note'}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {relativeTime(note.updated_at)}
          </Text>
        </View>

        {/* Bottom row: inline actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleTogglePin}
            hitSlop={6}
            style={[
              styles.actionChip,
              note.is_pinned && styles.actionChipActive,
            ]}
          >
            <Ionicons
              name={note.is_pinned ? 'pin' : 'pin-outline'}
              size={13}
              color={note.is_pinned ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.actionLabel,
                note.is_pinned && { color: theme.colors.accent },
              ]}
            >
              {note.is_pinned ? 'Pinned' : 'Pin'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onOpenPriority?.(note.id)}
            hitSlop={6}
            style={styles.actionChip}
          >
            <View
              style={[
                styles.miniDot,
                { backgroundColor: pColor || theme.colors.border },
              ]}
            />
            <Text style={styles.actionLabel}>
              {note.priority === 'none'
                ? 'Priority'
                : note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onOpenReminder?.(note.id)}
            hitSlop={6}
            style={styles.actionChip}
          >
            <Ionicons
              name={note.reminder_at ? 'alarm' : 'alarm-outline'}
              size={13}
              color={note.reminder_at ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.actionLabel,
                note.reminder_at && { color: theme.colors.accent },
              ]}
            >
              {note.reminder_at
                ? formatReminderTime(note.reminder_at)
                : 'Remind'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  body: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  actionChipActive: {
    backgroundColor: theme.colors.accentLight,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteAction: {
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
