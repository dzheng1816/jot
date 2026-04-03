import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useNoteStore } from '../../store/useNoteStore';
import {
  checkPermissions,
  cancelAllNotifications,
} from '../../utils/notifications';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const settings = useNoteStore((s) => s.settings);
  const loadSettings = useNoteStore((s) => s.loadSettings);
  const setResurfacing = useNoteStore((s) => s.setResurfacing);
  const deleteAllNotes = useNoteStore((s) => s.deleteAllNotes);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
    checkPermissions().then(setNotificationsEnabled);
  }, []);

  const handleDeleteAll = () => {
    Alert.alert("Delete all notes?", "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelAllNotifications();
          await deleteAllNotes();
        },
      },
    ]);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Resurfacing reminders</Text>
            <Text style={styles.rowDescription}>
              Occasionally remind you about older notes
            </Text>
          </View>
          <Switch
            value={settings.resurfacing_enabled}
            onValueChange={setResurfacing}
            trackColor={{ true: theme.colors.accent, false: '#ccc' }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Notifications</Text>
            <Text style={styles.rowDescription}>
              {notificationsEnabled
                ? 'Notifications enabled'
                : 'Notifications disabled'}
            </Text>
          </View>
          {!notificationsEnabled && (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={styles.linkText}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable onPress={handleDeleteAll} style={styles.row}>
          <Text style={styles.dangerText}>Delete all notes</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Jot v{version}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.card,
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  rowDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  dangerText: {
    fontSize: 16,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
});
