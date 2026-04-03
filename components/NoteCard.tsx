import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { confirmAction } from '../utils/confirm';
import { Note } from '../types/note';
import { PriorityDot } from './PriorityDot';
import { theme, priorityColor } from '../constants/theme';
import { relativeTime, formatReminderTime } from '../utils/time';
import { useNoteStore } from '../store/useNoteStore';

interface Props {
  note: Note;
  index?: number;
  onOpenPriority?: (noteId: string) => void;
  onOpenReminder?: (noteId: string) => void;
  isArchived?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (noteId: string) => void;
  selectMode?: boolean;
}

export function NoteCard({ note, index = 0, onOpenPriority, onOpenReminder, isArchived, isSelected, onToggleSelect, selectMode }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const restoreNote = useNoteStore((s) => s.restoreNote);
  const permanentlyDeleteNote = useNoteStore((s) => s.permanentlyDeleteNote);

  useEffect(() => {
    const delay = Math.min(index * 50, 300);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    if (selectMode && onToggleSelect) {
      onToggleSelect(note.id);
      return;
    }
    if (isArchived) return;
    router.push(`/note/${note.id}`);
  };

  const handleDelete = () => {
    if (isArchived) {
      permanentlyDeleteNote(note.id);
    } else {
      deleteNote(note.id);
    }
  };

  const handleRestore = () => {
    restoreNote(note.id);
  };

  const handleTogglePin = async () => {
    await togglePin(note.id, !note.is_pinned);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const opacity = dragX.interpolate({
      inputRange: [-200, -100, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });
    return (
      <View style={styles.deleteAction}>
        <Animated.Text style={[styles.deleteText, { opacity }]}>
          Delete
        </Animated.Text>
      </View>
    );
  };

  const pColor = priorityColor(note.priority);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={1.5}
        rightThreshold={200}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') handleDelete();
        }}
      >
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
          ]}
        >
          {/* Top row: preview + timestamp */}
          <View style={styles.row}>
            {selectMode && (
              <Pressable
                onPress={() => onToggleSelect?.(note.id)}
                hitSlop={6}
                style={styles.checkbox}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isSelected ? theme.colors.accent : theme.colors.textSecondary}
                />
              </Pressable>
            )}
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
            {isArchived ? (
              <>
                <Pressable
                  onPress={handleRestore}
                  hitSlop={6}
                  style={[styles.actionChip, styles.actionChipActive]}
                >
                  <Ionicons name="arrow-undo-outline" size={13} color={theme.colors.accent} />
                  <Text style={[styles.actionLabel, { color: theme.colors.accent }]}>Restore</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    confirmAction('Delete permanently?', 'This cannot be undone.', handleDelete, 'Delete');
                  }}
                  hitSlop={6}
                  style={styles.actionChip}
                >
                  <Ionicons name="trash-outline" size={13} color={theme.colors.danger} />
                  <Text style={[styles.actionLabel, { color: theme.colors.danger }]}>Delete</Text>
                </Pressable>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.composer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 8,
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
    alignItems: 'flex-end',
    paddingRight: 24,
    flex: 1,
    borderRadius: theme.radius.composer,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
