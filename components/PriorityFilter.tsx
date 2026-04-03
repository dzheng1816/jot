import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../constants/theme';
import { Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';

type FilterValue = Priority | 'all';

const filters: { value: FilterValue; color: string }[] = [
  { value: 'all', color: theme.colors.accent },
  { value: 'high', color: theme.colors.priorityHigh },
  { value: 'medium', color: theme.colors.priorityMed },
  { value: 'low', color: theme.colors.priorityLow },
];

export function PriorityFilter() {
  const priorityFilter = useNoteStore((s) => s.priorityFilter);
  const setPriorityFilter = useNoteStore((s) => s.setPriorityFilter);

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {filters.map((f) => {
          const isActive = priorityFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setPriorityFilter(f.value)}
              hitSlop={8}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: f.color },
                  isActive && styles.dotActive,
                  !isActive && styles.dotInactive,
                ]}
              />
            </Pressable>
          );
        })}
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
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  dotInactive: {
    opacity: 0.35,
  },
});
