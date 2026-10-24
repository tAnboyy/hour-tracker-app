import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { exportCsv } from '../src/export';
import { getStats } from '../src/repo';
import { useApp } from '../src/store';
import { colors, radius, spacing } from '../src/theme';
import { hourLabel } from '../src/time';
import { Button, Card, Label } from '../src/ui';

export default function Dashboard() {
  const settings = useApp((s) => s.settings);
  const version = useApp((s) => s.version);
  const stats = useMemo(() => getStats(settings), [settings, version]);
  const [exporting, setExporting] = useState(false);

  const maxDay = Math.max(1, ...stats.days.map((d) => d.active));
  const maxHour = Math.max(1, ...stats.hourCounts.map((h) => h.count));
  const maxTag = Math.max(1, ...stats.tags.map((t) => t.count));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statRow}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{stats.streak}🔥</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(stats.complianceWeek * 100)}%</Text>
          <Text style={styles.statLabel}>logged (7d)</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(stats.backfilledRatio * 100)}%</Text>
          <Text style={styles.statLabel}>backfilled</Text>
        </Card>
      </View>

      <Card>
        <Label>Hours logged — last 14 days</Label>
        <View style={styles.barChart}>
          {stats.days.map((d) => (
            <View key={d.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                {d.active > 0 && (
                  <>
                    <View style={{ height: `${(d.skipped / maxDay) * 100}%`, backgroundColor: colors.muted }} />
                    <View style={{ height: `${(d.logged / maxDay) * 100}%`, backgroundColor: colors.accent }} />
                  </>
                )}
              </View>
              <Text style={styles.barLabel}>{d.date.slice(8)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.hint}>
          <Text style={{ color: colors.accent }}>■</Text> logged  <Text style={{ color: colors.muted }}>■ skipped</Text>
        </Text>
      </Card>

      <Card>
        <Label>Top #tags — last 30 days</Label>
        {stats.tags.length === 0 && <Text style={styles.empty}>No tags yet. Write #deepwork, #email… in your logs.</Text>}
        {stats.tags.map((t) => (
          <View key={t.tag} style={styles.tagRow}>
            <Text style={styles.tagName}>#{t.tag}</Text>
            <View style={styles.tagTrack}>
              <View style={[styles.tagFill, { width: `${(t.count / maxTag) * 100}%` }]} />
            </View>
            <Text style={styles.tagCount}>{t.count}h</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Label>Most logged hours — last 30 days</Label>
        {stats.hourCounts.length === 0 && <Text style={styles.empty}>Nothing logged yet.</Text>}
        <View style={styles.heatRow}>
          {stats.hourCounts.map((h) => (
            <View key={h.hour} style={styles.heatCol}>
              <View
                style={[
                  styles.heatCell,
                  { backgroundColor: colors.accent, opacity: 0.15 + 0.85 * (h.count / maxHour) },
                ]}
              />
              <Text style={styles.heatLabel}>{hourLabel(h.hour).split('–')[0]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button
        title={exporting ? 'Exporting…' : 'Export CSV'}
        variant="ghost"
        disabled={exporting}
        onPress={async () => {
          setExporting(true);
          try {
            await exportCsv();
          } finally {
            setExporting(false);
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4, marginTop: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end', borderRadius: 3, overflow: 'hidden' },
  barLabel: { color: colors.muted, fontSize: 9 },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  empty: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  tagName: { color: colors.text, width: 100, fontSize: 13 },
  tagTrack: { flex: 1, height: 10, backgroundColor: colors.cardAlt, borderRadius: radius.sm },
  tagFill: { height: 10, backgroundColor: colors.blue, borderRadius: radius.sm },
  tagCount: { color: colors.muted, width: 36, fontSize: 12, textAlign: 'right' },
  heatRow: { flexDirection: 'row', gap: 3, marginTop: spacing.sm },
  heatCol: { flex: 1, alignItems: 'center', gap: 4 },
  heatCell: { width: '100%', height: 28, borderRadius: 4 },
  heatLabel: { color: colors.muted, fontSize: 8 },
});
