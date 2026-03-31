import React, { useRef, useEffect } from 'react';
import { Text, Pressable, StyleSheet, ScrollView, Animated } from 'react-native';
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

function FilterChip({
  label,
  value,
  activeColor,
  isActive,
  onPress,
}: {
  label: string;
  value: FilterValue;
  activeColor: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', activeColor],
  });

  const textColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.textSecondary, '#ffffff'],
  });

  const borderColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, activeColor],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.chip,
            {
              backgroundColor,
              borderWidth: 1,
              borderColor,
            },
          ]}
        >
          <Animated.Text style={[styles.chipText, { color: textColor }]}>
            {label}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function PriorityFilter() {
  const priorityFilter = useNoteStore((s) => s.priorityFilter);
  const setPriorityFilter = useNoteStore((s) => s.setPriorityFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((f) => (
        <FilterChip
          key={f.value}
          label={f.label}
          value={f.value}
          activeColor={f.activeColor}
          isActive={priorityFilter === f.value}
          onPress={() => setPriorityFilter(f.value)}
        />
      ))}
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
    fontWeight: theme.typography.label.fontWeight as any,
  },
});
