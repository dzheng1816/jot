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
import { theme } from '../constants/theme';
import { relativeTime, formatReminderTime } from '../utils/time';
import { useNoteStore } from '../store/useNoteStore';

interface Props {
  note: Note;
}

export function NoteCard({ note }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const deleteNote = useNoteStore((s) => s.deleteNote);

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

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Pressable onPress={handlePress} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.bodyRow}>
            <PriorityDot priority={note.priority} />
            <Text style={styles.body} numberOfLines={1}>
              {note.body || 'Empty note'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            {note.is_pinned && (
              <Ionicons
                name="pin"
                size={12}
                color={theme.colors.accent}
                style={styles.pinIcon}
              />
            )}
            {note.reminder_at && (
              <Text style={styles.reminder}>
                {formatReminderTime(note.reminder_at)}
              </Text>
            )}
            <Text style={styles.timestamp}>
              {relativeTime(note.updated_at)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinIcon: {
    marginRight: 2,
  },
  reminder: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.accent,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
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
