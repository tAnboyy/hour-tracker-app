import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cancelPingFor } from '../src/notifications';
import { getBacklogDays, saveLogBlock } from '../src/repo';
import { useApp } from '../src/store';
import { trySync } from '../src/sync';
import { colors, radius, spacing } from '../src/theme';
import { hourLabel } from '../src/time';
import { Button, Card, Input, Label } from '../src/ui';

/**
 * Blocking screen: previous days must be fully logged (or explicitly skipped)
 * before the rest of the app is usable. Hours are selectable chips so a block
 * of hours (e.g. asleep) can be resolved with a single entry.
 */
export default function BacklogScreen() {
  const router = useRouter();
  const settings = useApp((s) => s.settings);
  const bump = useApp((s) => s.bump);
  const [refresh, setRefresh] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, number[]>>({}); // date → hours

  const days = useMemo(() => getBacklogDays(settings), [settings, refresh]);

  const done = useCallback(() => {
    trySync();
    bump();
    if (getBacklogDays(settings).length === 0) {
      router.replace('/log');
    } else {
      setRefresh((r) => r + 1);
    }
  }, [settings, router, bump]);

  const toggle = (date: string, h: number) =>
    setSelected((s) => {
      const cur = s[date] ?? [];
      return {
        ...s,
        [date]: cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h].sort((a, b) => a - b),
      };
    });

  const resolve = (date: string, hours: number[], skip: boolean) => {
    const text = (drafts[date] ?? '').trim();
    saveLogBlock({
      date,
      hours,
      did: skip ? '' : text,
      status: skip ? 'skipped' : 'logged',
    });
    for (const h of hours) cancelPingFor(date, h);
    setSelected((s) => ({ ...s, [date]: [] }));
    setDrafts((d) => ({ ...d, [date]: '' }));
    done();
  };

  if (days.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.doneText}>All caught up 🎉</Text>
        <Button title="Go to today" onPress={() => router.replace('/log')} />
      </View>
    );
  }

  const total = days.reduce((n, d) => n + d.missing.length, 0);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        {total} unlogged {total === 1 ? 'hour' : 'hours'} from previous days. Select one or more hours,
        write one entry for the whole block, then Log it — or Skip it (asleep, meeting…). Honest skips
        beat fake logs.
      </Text>
      {days.map((day) => {
        const sel = selected[day.date] ?? [];
        const allSelected = sel.length === day.missing.length;
        return (
          <Card key={day.date} style={{ gap: spacing.sm }}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{day.date}</Text>
              <Pressable
                onPress={() =>
                  setSelected((s) => ({ ...s, [day.date]: allSelected ? [] : [...day.missing] }))
                }
              >
                <Text style={styles.selectAll}>{allSelected ? 'Clear' : 'Select all'}</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {day.missing.map((h) => {
                const on = sel.includes(h);
                return (
                  <Pressable
                    key={h}
                    onPress={() => toggle(day.date, h)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{hourLabel(h)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {sel.length > 0 && (
              <>
                <Label>{sel.length === 1 ? hourLabel(sel[0]) : `${sel.length} hours as one entry`}</Label>
                <Input
                  value={drafts[day.date] ?? ''}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [day.date]: t }))}
                  placeholder="What did you do? Use #tags"
                />
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={sel.length > 1 ? `Log ${sel.length} hours` : 'Log'}
                      onPress={() => resolve(day.date, sel, false)}
                      disabled={!(drafts[day.date] ?? '').trim()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={sel.length > 1 ? `Skip ${sel.length}` : 'Skip'}
                      variant="ghost"
                      onPress={() => resolve(day.date, sel, true)}
                    />
                  </View>
                </View>
              </>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  selectAll: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 12, fontVariant: ['tabular-nums'] },
  chipTextOn: { color: '#1A1200', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  doneText: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: spacing.md },
});
