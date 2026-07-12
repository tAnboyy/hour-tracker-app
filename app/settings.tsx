import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { rescheduleAll, sendTestPing, updateGoalNotification } from '../src/notifications';
import { useApp } from '../src/store';
import { supabase } from '../src/supabase';
import { trySync } from '../src/sync';
import { colors, radius, spacing } from '../src/theme';
import { Button, Card, Input, Label } from '../src/ui';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => value > min && onChange(value - 1)}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{`${value}`.padStart(2, '0')}:00</Text>
        <Pressable style={styles.stepBtn} onPress={() => value < max && onChange(value + 1)}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const bump = useApp((s) => s.bump);

  const client = supabase();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client?.auth.getSession().then(({ data }) => setSignedInAs(data.session?.user.email ?? null));
  }, [client]);

  const apply = async (next: typeof settings) => {
    setSettings(next);
    await rescheduleAll(next);
    await updateGoalNotification();
  };

  const toggleDay = (d: number) => {
    const days = settings.activeDays.includes(d)
      ? settings.activeDays.filter((x) => x !== d)
      : [...settings.activeDays, d].sort();
    apply({ ...settings, activeDays: days });
  };

  const sendOtp = async () => {
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) Alert.alert('Sign-in failed', error.message);
    else setOtpSent(true);
  };

  const verifyOtp = async () => {
    if (!client) return;
    setBusy(true);
    const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' });
    setBusy(false);
    if (error || !data.session) {
      Alert.alert('Verification failed', error?.message ?? 'No session');
      return;
    }
    setSignedInAs(data.session.user.email ?? null);
    setOtpSent(false);
    setOtp('');
    const changed = await trySync();
    if (changed) bump();
  };

  const signOut = async () => {
    await client?.auth.signOut();
    setSignedInAs(null);
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'Your cloud account and all synced logs are permanently deleted. Local data on this device is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!client) return;
            const { error } = await client.rpc('delete_account');
            if (error) {
              Alert.alert('Deletion failed', error.message);
              return;
            }
            await client.auth.signOut();
            setSignedInAs(null);
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: spacing.md }}>
        <Label>Active window</Label>
        <Stepper label="First hour" value={settings.startHour} min={0} max={settings.endHour - 1} onChange={(v) => apply({ ...settings, startHour: v })} />
        <Stepper label="Last hour ends" value={settings.endHour} min={settings.startHour + 1} max={24} onChange={(v) => apply({ ...settings, endHour: v })} />
        <Text style={styles.hint}>
          Pings fire at the end of each hour from {`${settings.startHour}`.padStart(2, '0')}:00 to {`${settings.endHour}`.padStart(2, '0')}:00.
        </Text>
        <View style={styles.daysRow}>
          {DAY_NAMES.map((name, d) => {
            const on = settings.activeDays.includes(d);
            return (
              <Pressable key={d} onPress={() => toggleDay(d)} style={[styles.dayChip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={[styles.dayChipText, on && { color: '#1A1200' }]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Label>Notifications</Label>
        <Button
          title="Send test ping (10s — lock your phone)"
          variant="ghost"
          onPress={async () => {
            await sendTestPing();
            Alert.alert('Scheduled', 'A test ping arrives in ~10 seconds.');
          }}
        />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Label>Cloud sync</Label>
        {!client && (
          <Text style={styles.hint}>
            Not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env (see
            .env.example and supabase/schema.sql), then rebuild.
          </Text>
        )}
        {client && signedInAs && (
          <>
            <Text style={styles.hint}>Signed in as {signedInAs}. Logs sync automatically.</Text>
            <Button title="Sync now" variant="ghost" onPress={async () => { const c = await trySync(); if (c) bump(); Alert.alert('Sync', 'Done.'); }} />
            <Button title="Sign out" variant="ghost" onPress={signOut} />
            <Button title="Delete account & cloud data" variant="danger" onPress={deleteAccount} />
          </>
        )}
        {client && !signedInAs && !otpSent && (
          <>
            <Input value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
            <Button title={busy ? 'Sending…' : 'Email me a code'} onPress={sendOtp} disabled={busy || !email.includes('@')} />
          </>
        )}
        {client && !signedInAs && otpSent && (
          <>
            <Text style={styles.hint}>Enter the 6-digit code sent to {email}.</Text>
            <Input value={otp} onChangeText={setOtp} placeholder="123456" keyboardType="number-pad" />
            <Button title={busy ? 'Verifying…' : 'Verify & sign in'} onPress={verifyOtp} disabled={busy || otp.trim().length < 6} />
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { color: colors.text, fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  stepValue: { color: colors.text, fontSize: 15, fontWeight: '700', width: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  daysRow: { flexDirection: 'row', gap: spacing.xs },
  dayChip: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, alignItems: 'center' },
  dayChipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
});
