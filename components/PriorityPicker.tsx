import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../constants/theme';
import { Priority } from '../types/note';

export interface PriorityPickerHandle {
  expand: () => void;
  close: () => void;
}

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

export const PriorityPicker = forwardRef<PriorityPickerHandle, Props>(
  ({ currentPriority, onSelect }, ref) => {
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      expand: () => setVisible(true),
      close: () => setVisible(false),
    }));

    const handleSelect = (value: Priority) => {
      onSelect(value);
      setVisible(false);
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
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
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);
PriorityPicker.displayName = 'PriorityPicker';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
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
