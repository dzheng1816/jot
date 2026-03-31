import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export interface ReminderPickerHandle {
  expand: () => void;
  close: () => void;
}

interface Props {
  currentReminder: string | null;
  onSelect: (isoString: string | null) => void;
}

export const ReminderPicker = forwardRef<ReminderPickerHandle, Props>(
  ({ currentReminder, onSelect }, ref) => {
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      expand: () => setVisible(true),
      close: () => setVisible(false),
    }));

    const selectAndClose = (date: Date | null) => {
      if (date && date.getTime() <= Date.now()) {
        Alert.alert('Invalid time', 'Please pick a time in the future.');
        return;
      }
      onSelect(date ? date.toISOString() : null);
      setVisible(false);
    };

    const inOneHour = () => {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      selectAndClose(d);
    };

    const tonight = () => {
      const d = new Date();
      d.setHours(21, 0, 0, 0);
      if (d.getTime() <= Date.now()) {
        d.setDate(d.getDate() + 1);
      }
      selectAndClose(d);
    };

    const tomorrow = () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      selectAndClose(d);
    };

    const nextWeek = () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      selectAndClose(d);
    };

    const formatQuickTime = (date: Date) =>
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    const inOneHourDate = new Date(Date.now() + 60 * 60 * 1000);

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
            <Text style={styles.title}>Remind me</Text>

            <Pressable onPress={inOneHour} style={styles.option}>
              <Text style={styles.optionLabel}>In 1 hour</Text>
              <Text style={styles.optionMeta}>
                {formatQuickTime(inOneHourDate)}
              </Text>
            </Pressable>

            <Pressable onPress={tonight} style={styles.option}>
              <Text style={styles.optionLabel}>Tonight</Text>
              <Text style={styles.optionMeta}>9:00 PM</Text>
            </Pressable>

            <Pressable onPress={tomorrow} style={styles.option}>
              <Text style={styles.optionLabel}>Tomorrow</Text>
              <Text style={styles.optionMeta}>9:00 AM</Text>
            </Pressable>

            <Pressable onPress={nextWeek} style={styles.option}>
              <Text style={styles.optionLabel}>Next week</Text>
              <Text style={styles.optionMeta}>Mon 9:00 AM</Text>
            </Pressable>

            {currentReminder && (
              <Pressable
                onPress={() => selectAndClose(null)}
                style={[styles.option, styles.removeOption]}
              >
                <Text style={styles.removeText}>Remove reminder</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);
ReminderPicker.displayName = 'ReminderPicker';

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
  optionLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  optionMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  removeOption: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  removeText: {
    fontSize: 14,
    color: theme.colors.danger,
  },
});
