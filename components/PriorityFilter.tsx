import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../constants/theme';
import { Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';

type FilterValue = Priority | 'all' | 'reminder' | 'archive';

export function PriorityFilter() {
  const priorityFilter = useNoteStore((s) => s.priorityFilter);
  const setPriorityFilter = useNoteStore((s) => s.setPriorityFilter);

  const isAll = priorityFilter === 'all';
  const isReminder = priorityFilter === 'reminder';
  const isArchive = priorityFilter === 'archive';

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {/* All chip */}
        <Pressable
          onPress={() => setPriorityFilter('all')}
          style={[
            styles.allChip,
            isAll
              ? { backgroundColor: theme.colors.accent }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.accent },
          ]}
        >
          <Text style={[styles.allText, { color: isAll ? '#fff' : theme.colors.accent }]}>
            All
          </Text>
        </Pressable>

        {/* Priority color chips */}
        {([
          { value: 'high' as FilterValue, color: theme.colors.priorityHigh },
          { value: 'medium' as FilterValue, color: theme.colors.priorityMed },
          { value: 'low' as FilterValue, color: theme.colors.priorityLow },
        ]).map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setPriorityFilter(f.value as any)}
            style={[
              styles.colorChip,
              { backgroundColor: f.color },
              priorityFilter !== f.value && { opacity: 0.3 },
            ]}
          />
        ))}

        {/* Reminder clock filter */}
        <Pressable
          onPress={() => setPriorityFilter('reminder' as any)}
          style={[
            styles.clockChip,
            isReminder
              ? { backgroundColor: theme.colors.accent }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.textSecondary },
          ]}
        >
          <Ionicons
            name="alarm-outline"
            size={14}
            color={isReminder ? '#fff' : theme.colors.textSecondary}
          />
        </Pressable>

        {/* Archive filter */}
        <Pressable
          onPress={() => setPriorityFilter('archive' as any)}
          style={[
            styles.clockChip,
            isArchive
              ? { backgroundColor: theme.colors.textSecondary }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.textSecondary },
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={14}
            color={isArchive ? '#fff' : theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/search')} hitSlop={8}>
        <Ionicons
          name="search-outline"
          size={22}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  allChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  allText: {
    fontSize: 13,
    fontWeight: '700',
  },
  colorChip: {
    width: 32,
    height: 20,
    borderRadius: 6,
  },
  clockChip: {
    width: 32,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
