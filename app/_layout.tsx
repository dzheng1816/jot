import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '../db/schema';
import {
  setupNotificationResponseListener,
  requestPermissions,
} from '../utils/notifications';
import { scheduleNextResurfacing } from '../utils/resurfacing';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      await getDatabase();
      await requestPermissions();
      setupNotificationResponseListener();
      scheduleNextResurfacing();
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="note/[id]"
          options={{ presentation: 'card', animation: 'slide_from_right' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
