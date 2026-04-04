import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useFonts, Gluten_700Bold } from '@expo-google-fonts/gluten';
import { getDatabase } from '../db/schema';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({ Gluten_700Bold });

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

  const appContent = (
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

  // On web, wrap in a phone-sized frame
  if (Platform.OS === 'web') {
    return (
      <View style={frameStyles.desktopBackground}>
        <View style={frameStyles.phoneFrame}>
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
}

const frameStyles = StyleSheet.create({
  desktopBackground: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: 393,
    maxWidth: '100%',
    height: '100%',
    maxHeight: 852,
    backgroundColor: '#FFF0E8',
    borderRadius: Platform.OS === 'web' ? 40 : 0,
    overflow: 'hidden',
    // Subtle phone shadow on desktop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
});
