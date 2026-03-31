import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';

type FilterValue = Priority | 'all';

const filters: { label: string; value: FilterValue; activeColor: string }[] = [
  { label: 'All', value: 'all', activeColor: theme.colors.accent },
  { label: 'High', value: 'high', activeColor: theme.colors.priorityHigh },
  { label: 'Medium', value: 'medium', activeColor: theme.colors.priorityMed },
  { label: 'Low', value: 'low', activeColor: theme.colors.priorityLow },
];

export function PriorityFilter() {
  const priorityFilter = useNoteStore((s) => s.priorityFilter);
  const setPriorityFilter = useNoteStore((s) => s.setPriorityFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((f) => {
        const isActive = priorityFilter === f.value;
        return (
          <Pressable
            key={f.value}
            onPress={() => setPriorityFilter(f.value)}
            style={[
              styles.chip,
              isActive
                ? { backgroundColor: f.activeColor }
                : {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#fff' : theme.colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.radius.chip,
  },
  chipText: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: theme.typography.label.fontWeight,
  },
});
