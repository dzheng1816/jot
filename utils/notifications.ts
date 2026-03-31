import * as Notifications from 'expo-notifications';
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
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminderNotification(
  noteId: string,
  bodyPreview: string,
  triggerDate: Date
): Promise<string> {
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
}

export async function scheduleResurfacingNotification(
  noteId: string,
  bodyPreview: string
): Promise<string> {
  // Random time between 10am and 8pm tomorrow
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
}

export async function cancelNotification(
  notificationId: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function setupNotificationResponseListener(): void {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.noteId) {
      router.push(`/note/${data.noteId}`);
    }
  });
}
