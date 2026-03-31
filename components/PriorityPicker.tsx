import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../constants/theme';
import { Priority } from '../types/note';

interface Props {
  currentPriority: Priority;
  onSelect: (priority: Priority) => void;
}

const options: { label: string; value: Priority }[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'None', value: 'none' },
];

export const PriorityPicker = forwardRef<BottomSheet, Props>(
  ({ currentPriority, onSelect }, ref) => {
    const snapPoints = useMemo(() => ['30%'], []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    const handleSelect = (value: Priority) => {
      onSelect(value);
      (ref as React.RefObject<BottomSheet | null>)?.current?.close();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Priority</Text>
          {options.map((opt) => {
            const color = priorityColor(opt.value);
            const isSelected = currentPriority === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleSelect(opt.value)}
                style={styles.option}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: color || theme.colors.border,
                      },
                    ]}
                  />
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.colors.accent}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    );
  }
);
PriorityPicker.displayName = 'PriorityPicker';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
});
