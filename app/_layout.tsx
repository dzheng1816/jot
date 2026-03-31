import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useFonts, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { getDatabase } from '../db/schema';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({ Fredoka_700Bold });

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
      } catch (e) {
        console.warn('DB init error:', e);
      } finally {
        setDbReady(true);
      }
    }
    init();
  }, []);

  // Defer notification setup to avoid crashing in Expo Go
  useEffect(() => {
    if (!dbReady) return;

    async function setupNotifications() {
      try {
        const { requestPermissions, setupNotificationResponseListener } =
          require('../utils/notifications');
        await requestPermissions();
        setupNotificationResponseListener();

        const { scheduleNextResurfacing } = require('../utils/resurfacing');
        await scheduleNextResurfacing();
      } catch (e) {
        console.warn('Notification setup error:', e);
      }
    }
    setupNotifications();
  }, [dbReady]);

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C6BF0" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="note/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
