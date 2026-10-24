import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ensureChannels, ensureExactAlarms, pruneStalePingActions, rescheduleAll, updateGoalNotification } from '../src/notifications';
import { getInitialNotificationRoute, subscribeNotificationEvents } from '../src/notifications/runtime';
import { kvGet } from '../src/db';
import { getBacklogDays, getFirstDate } from '../src/repo';
import { useApp } from '../src/store';
import { trySync } from '../src/sync';
import { colors } from '../src/theme';

export default function RootLayout() {
  const router = useRouter();
  const settings = useApp((s) => s.settings);
  const bump = useApp((s) => s.bump);

  useEffect(() => {
    getFirstDate();

    const boot = async () => {
      if (!kvGet('onboarded')) return; // onboarding runs setup itself
      await ensureChannels();
      await ensureExactAlarms();
      await rescheduleAll(settings);
      await updateGoalNotification();
      await pruneStalePingActions();
      trySync().then((changed) => changed && bump());

      // Cold-started from a notification tap → jump straight to that hour.
      // Both the hourly ping (past hour) and the goal notification (current
      // hour) carry the exact date/hour they're about in their data.
      const data = await getInitialNotificationRoute();
      if (data?.kind === 'ping' || data?.kind === 'goal') {
        router.push(`/log?date=${encodeURIComponent(data.date)}&hour=${encodeURIComponent(data.hour)}`);
      }
    };
    boot();

    const unsubNotifee = subscribeNotificationEvents(
      (data) => {
        router.push(`/log?date=${encodeURIComponent(data.date)}&hour=${encodeURIComponent(data.hour)}`);
      },
      bump
    );

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !kvGet('onboarded')) return;
      updateGoalNotification();
      pruneStalePingActions();
      trySync().then((changed) => changed && bump());
      if (getBacklogDays(useApp.getState().settings).length > 0) {
        router.replace('/backlog');
      }
      bump();
    });

    return () => {
      unsubNotifee();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KeyboardProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="log" options={{ title: 'Log hours' }} />
        <Stack.Screen name="backlog" options={{ title: 'Catch up', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </KeyboardProvider>
  );
}
