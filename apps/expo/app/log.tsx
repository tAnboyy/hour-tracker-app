import { Link, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { cancelPingFor, rescheduleAll, updateGoalNotification } from '../src/notifications';
import { getDay, getGoalFor, getLog, saveLog, setGoalOverride } from '../src/repo';
import { useApp } from '../src/store';
import { trySync } from '../src/sync';
import { colors, spacing } from '../src/theme';
import { activeHours, hourHasEnded, hourIsCurrent, hourLabel, todayKey } from '../src/time';
import { Input } from '../src/ui';

export default function LogScreen() {
  const params = useLocalSearchParams<{ date?: string; hour?: string }>();
  const navigation = useNavigation();
  const settings = useApp((s) => s.settings);
  const version = useApp((s) => s.version);
  const bump = useApp((s) => s.bump);

  const today = todayKey();
  const now = new Date();
  const deepLinkDate = params.date ?? today;
  const deepLinkHour = params.hour != null ? Number(params.hour) : null;

  const [expandedHour, setExpandedHour] = useState<number | null>(deepLinkHour !== null ? deepLinkHour : null);
  const [didOpenHour, setDidOpenHour] = useState<number | null>(null);
  const [didOpenDate, setDidOpenDate] = useState<string>(today);
  const [multi, setMulti] = useState<number[]>([]);
  const [multiGoalDraft, setMultiGoalDraft] = useState('');
  const [goalDrafts, setGoalDrafts] = useState<Record<number, string>>({});
  const [didDrafts, setDidDrafts] = useState<Record<number, string>>({});

  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const rowRefs = useRef<Record<string, View | null>>({});

  const scrollToRow = (date: string, hour: number) => {
    // Deferred so the did-box has mounted and the row's new (taller) layout
    // has settled before we measure it.
    requestAnimationFrame(() => {
      const node = rowRefs.current[`${date}:${hour}`];
      const scroll = scrollRef.current;
      if (!node || !scroll) return;
      node.measureLayout(
        scroll as unknown as View,
        (_x, y, _w, height) => {
          scroll.scrollTo({ y: Math.max(0, y + height - 400), animated: true });
        },
        () => {}
      );
    });
  };

  // Flush "what I did" for whichever row currently has it open, whenever we
  // navigate away or the row/screen changes — this is the only save trigger
  // for `did` (goal saves live on every keystroke instead).
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    if (didOpenHour === null) return;
    const date = didOpenDate;
    const did = didDrafts[didOpenHour] ?? '';
    const goal = goalDrafts[didOpenHour] ?? '';
    // Skip only if there's nothing to save and nothing existing to clear —
    // an edit down to empty text still needs to overwrite a previously saved did.
    if (!did.trim() && !getLog(date, didOpenHour)) return;
    saveLog({ date, hour: didOpenHour, did, goal });
    cancelPingFor(date, didOpenHour);
    updateGoalNotification();
    rescheduleAll(settings);
    trySync();
    bump();
  };

  useEffect(() => {
    const unsub = navigation.addListener('blur', () => flushRef.current());
    return () => {
      unsub();
      flushRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const rows = useMemo(() => {
    const logs = new Map(getDay(today).map((r) => [r.hour, r]));
    return activeHours(settings, today).map((h) => ({
      hour: h,
      log: logs.get(h) ?? null,
      ended: hourHasEnded(today, h, now),
      current: hourIsCurrent(today, h, now),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, today, version]);

  const deepLinkRow = useMemo(() => {
    if (deepLinkDate === today || deepLinkHour === null) return null;
    const log = getLog(deepLinkDate, deepLinkHour);
    return {
      hour: deepLinkHour,
      log,
      ended: hourHasEnded(deepLinkDate, deepLinkHour, now),
      current: hourIsCurrent(deepLinkDate, deepLinkHour, now),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkDate, deepLinkHour, version]);

  const expandRow = (date: string, hour: number) => {
    flushRef.current();
    setMulti([]);
    setDidOpenHour(null);
    if (expandedHour === hour) {
      setExpandedHour(null);
      return;
    }
    setExpandedHour(hour);
    setGoalDrafts((d) => ({ ...d, [hour]: d[hour] ?? getGoalFor(date, hour) }));
    setDidDrafts((d) => ({ ...d, [hour]: d[hour] ?? getLog(date, hour)?.did ?? '' }));
  };

  const toggleDid = (date: string, hour: number) => {
    if (didOpenHour === hour && didOpenDate === date) {
      flushRef.current();
      setDidOpenHour(null);
      return;
    }
    flushRef.current();
    setDidOpenHour(hour);
    setDidOpenDate(date);
    setDidDrafts((d) => ({ ...d, [hour]: d[hour] ?? getLog(date, hour)?.did ?? '' }));
    scrollToRow(date, hour);
  };

  const toggleMulti = (date: string, hour: number) => {
    setExpandedHour(null);
    setDidOpenHour(null);
    setMulti((m) => {
      const base = m.length === 0 ? [] : m;
      const next = base.includes(hour) ? base.filter((x) => x !== hour) : [...base, hour].sort((a, b) => a - b);
      if (next.length > 0 && base.length === 0) setMultiGoalDraft(getGoalFor(date, hour));
      return next;
    });
  };

  const onMultiGoalChange = (date: string, text: string) => {
    setMultiGoalDraft(text);
    for (const h of multi) setGoalOverride(date, h, text);
    bump();
  };

  const onGoalChange = (date: string, hour: number, text: string) => {
    setGoalDrafts((d) => ({ ...d, [hour]: text }));
    setGoalOverride(date, hour, text);
    bump();
  };

  const onGoalBlur = async (date: string, hour: number) => {
    if (!hourHasEnded(date, hour)) {
      await updateGoalNotification();
      await rescheduleAll(settings);
    }
  };

  const renderRow = (
    r: { hour: number; log: ReturnType<typeof getLog>; ended: boolean; current: boolean },
    date: string,
    i: number
  ) => {
    const isMulti = multi.includes(r.hour);
    const isExpanded = expandedHour === r.hour || isMulti;
    const isDidOpen = didOpenHour === r.hour;
    const status = r.log
      ? r.log.status === 'skipped'
        ? '⏭'
        : r.log.backfilled
          ? '🕓'
          : '✅'
      : r.current
        ? '▶️'
        : r.ended
          ? '❌'
          : '·';

    return (
      <View
        key={r.hour}
        ref={(node) => {
          rowRefs.current[`${date}:${r.hour}`] = node;
        }}
        style={[
          styles.rowWrap,
          i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
          r.current && { borderLeftWidth: 4, borderLeftColor: colors.accent },
          isMulti && styles.rowSelected,
        ]}
      >
        <Pressable
          onPress={() => expandRow(date, r.hour)}
          onLongPress={() => toggleMulti(date, r.hour)}
          delayLongPress={250}
          style={styles.row}
        >
          <Text style={styles.rowHour}>{hourLabel(r.hour)}</Text>
          <Text style={styles.rowStatus}>{isMulti ? '☑' : status}</Text>
          <View style={{ flex: 1 }}>
            {isExpanded ? (
              <Input
                value={isMulti ? multiGoalDraft : (goalDrafts[r.hour] ?? '')}
                onChangeText={(t) => (isMulti ? onMultiGoalChange(date, t) : onGoalChange(date, r.hour, t))}
                onBlur={() => onGoalBlur(date, r.hour)}
                placeholder="What's the plan?"
                autoFocus
                style={styles.goalInput}
              />
            ) : (
              <Text style={styles.rowText} numberOfLines={1}>
                {getGoalFor(date, r.hour) || '—'}
              </Text>
            )}
            {!isExpanded && (r.log?.did || (r.ended && !r.log)) && (
              <Text style={styles.rowDid} numberOfLines={1}>
                {r.log?.did || 'Not logged'}
              </Text>
            )}
            {!!r.log?.next && !isExpanded && (
              <Text style={styles.rowNext} numberOfLines={1}>
                → {r.log.next}
              </Text>
            )}
          </View>
          {isExpanded && !isMulti && (
            <Pressable hitSlop={8} onPress={() => toggleDid(date, r.hour)} style={styles.chevron}>
              <Text style={styles.chevronText}>{isDidOpen ? '▾' : '▸'}</Text>
            </Pressable>
          )}
        </Pressable>
        {isDidOpen && (
          <View style={styles.didWrap}>
            <Input
              value={didDrafts[r.hour] ?? ''}
              onChangeText={(t) => setDidDrafts((d) => ({ ...d, [r.hour]: t }))}
              onBlur={() => flushRef.current()}
              multiline
              placeholder="What happened this hour? Use #tags for analytics"
              style={styles.didInput}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Link href="/dashboard" style={styles.headerLink}>📊</Link>
              <Link href="/settings" style={styles.headerLink}>⚙️</Link>
            </View>
          ),
        }}
      />
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing.md}
      >
        {multi.length > 0 && (
          <Text style={styles.multiHint}>
            Typing a goal applies to all {multi.length} selected hours. Long-press to add/remove; tap a
            row to exit selection.
          </Text>
        )}
        {deepLinkRow && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{deepLinkDate}</Text>
            <View style={styles.table}>{renderRow(deepLinkRow, deepLinkDate, 0)}</View>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.table}>
            {rows.length === 0 && (
              <Text style={[styles.rowText, { padding: spacing.md, color: colors.muted }]}>
                No active hours today (check Settings).
              </Text>
            )}
            {rows.map((r, i) => renderRow(r, today, i))}
          </View>
          <Text style={styles.legend}>✅ logged · 🕓 backfilled · ⏭ skipped · ❌ missing · ▶️ current</Text>
          <Text style={styles.legend}>Tap a row to plan it, ▸ to log what happened. Long-press to select several.</Text>
        </View>
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  headerLink: { fontSize: 20, color: colors.text },
  multiHint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  table: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rowWrap: {},
  rowSelected: { backgroundColor: colors.cardAlt, borderLeftWidth: 3, borderLeftColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  rowHour: { color: colors.muted, width: 86, fontSize: 13, fontVariant: ['tabular-nums'] },
  rowStatus: { fontSize: 14, width: 24, textAlign: 'center' },
  rowText: { color: colors.text, fontSize: 14 },
  rowDid: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowNext: { color: colors.muted, fontSize: 12, marginTop: 2 },
  goalInput: { paddingVertical: 6, fontSize: 14 },
  chevron: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  chevronText: { color: colors.muted, fontSize: 16 },
  didWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  didInput: { minHeight: 72, textAlignVertical: 'top' },
  legend: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
