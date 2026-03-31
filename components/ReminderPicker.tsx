import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props {
  currentReminder: string | null;
  onSelect: (isoString: string | null) => void;
}

export const ReminderPicker = forwardRef<BottomSheet, Props>(
  ({ currentReminder, onSelect }, ref) => {
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customDate, setCustomDate] = useState(new Date());
    const snapPoints = useMemo(
      () => [showCustomPicker ? '55%' : '40%'],
      [showCustomPicker]
    );

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

    const selectAndClose = (date: Date | null) => {
      if (date && date.getTime() <= Date.now()) {
        Alert.alert('Invalid time', 'Please pick a time in the future.');
        return;
      }
      onSelect(date ? date.toISOString() : null);
      setShowCustomPicker(false);
      (ref as React.RefObject<BottomSheet | null>)?.current?.close();
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

    const formatQuickTime = (date: Date) =>
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    const inOneHourDate = new Date(Date.now() + 60 * 60 * 1000);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        onChange={(index) => {
          if (index === -1) setShowCustomPicker(false);
        }}
      >
        <View style={styles.content}>
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

          {!showCustomPicker ? (
            <Pressable
              onPress={() => setShowCustomPicker(true)}
              style={styles.option}
            >
              <Text style={styles.optionLabel}>Pick date & time</Text>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          ) : (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={customDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (date) setCustomDate(date);
                }}
                style={{ height: 120 }}
              />
              <Pressable
                onPress={() => selectAndClose(customDate)}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmText}>Set Reminder</Text>
              </Pressable>
            </View>
          )}

          {currentReminder && (
            <Pressable
              onPress={() => selectAndClose(null)}
              style={[styles.option, styles.removeOption]}
            >
              <Text style={styles.removeText}>Remove reminder</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>
    );
  }
);
ReminderPicker.displayName = 'ReminderPicker';

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
  optionLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  optionMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    marginTop: 8,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
