import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { kvSet } from '../src/db';
import { ensureChannels, ensureExactAlarms, requestPermissions, rescheduleAll, updateGoalNotification } from '../src/notifications';
import { getFirstDate } from '../src/repo';
import { useApp } from '../src/store';
import { colors, spacing } from '../src/theme';
import { Button, Card } from '../src/ui';

export default function Onboarding() {
  const router = useRouter();
  const settings = useApp((s) => s.settings);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      getFirstDate();
      await ensureChannels();
      await requestPermissions();
      await ensureExactAlarms();
      await rescheduleAll(settings);
      await updateGoalNotification();
      kvSet('onboarded', '1');
      router.replace('/log');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hour Tracker</Text>
      <Text style={styles.sub}>Every hour, on the hour: log what you did and plan the next one.</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.point}>🔔 High-priority ping at the end of every active hour — reply straight from the notification.</Text>
        <Text style={styles.point}>🔒 Your current hour's goal stays pinned on the lock screen.</Text>
        <Text style={styles.point}>⛔ Unlogged hours block the next day until you catch up.</Text>
        <Text style={styles.point}>📊 Dashboard: streaks, compliance, #tag breakdowns.</Text>
      </Card>
      <Text style={styles.note}>
        Next you'll be asked for notification permission, and possibly the "Alarms & reminders" permission
        so pings arrive exactly on the hour.
      </Text>
      <Button title={busy ? 'Setting up…' : 'Enable notifications & start'} onPress={start} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  point: { color: colors.text, fontSize: 14, lineHeight: 20 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
