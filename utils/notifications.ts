import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function checkPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleReminderNotification(
  noteId: string,
  bodyPreview: string,
  triggerDate: Date
): Promise<string> {
  if (Platform.OS === 'web') return 'web-noop';
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Jot Reminder',
        body: bodyPreview || 'You have a note to check',
        data: { noteId, type: 'reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return id;
  } catch (e) {
    console.warn('Failed to schedule reminder:', e);
    return 'error-noop';
  }
}

export async function scheduleResurfacingNotification(
  noteId: string,
  bodyPreview: string
): Promise<string> {
  if (Platform.OS === 'web') return 'web-noop';
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hour = 10 + Math.floor(Math.random() * 10);
    const minute = Math.floor(Math.random() * 60);
    tomorrow.setHours(hour, minute, 0, 0);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Remember this?',
        body: bodyPreview || 'You had a thought...',
        data: { noteId, type: 'resurfacing' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });
    return id;
  } catch (e) {
    console.warn('Failed to schedule resurfacing:', e);
    return 'error-noop';
  }
}

export async function cancelNotification(
  notificationId: string
): Promise<void> {
  if (Platform.OS === 'web' || notificationId.endsWith('-noop')) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Failed to cancel notification:', e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel all notifications:', e);
  }
}

export function setupNotificationResponseListener(): void {
  if (Platform.OS === 'web') return;
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.noteId) {
      router.push(`/note/${data.noteId}`);
    }
  });
}
