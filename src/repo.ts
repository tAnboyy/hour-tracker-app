import * as Crypto from 'expo-crypto';
import { db, kvDelete, kvGet, kvSet } from './db';
import { activeHours, addDays, hourHasEnded, todayKey } from './time';
import { DEFAULT_SETTINGS, type DayStatus, type HourLog, type LogStatus, type Settings } from './types';

// ---------- settings ----------

export function getSettings(): Settings {
  const raw = kvGet('settings');
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  kvSet('settings', JSON.stringify(s));
}

/** First day the app was used — the day gate never looks earlier than this. */
export function getFirstDate(): string {
  const existing = kvGet('firstDate');
  if (existing) return existing;
  const today = todayKey();
  kvSet('firstDate', today);
  return today;
}

// ---------- tags ----------

export function parseTags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

// ---------- hour logs ----------

export interface SaveLogInput {
  date: string;
  hour: number;
  did: string;
  /** Plan for the next hour — only ever set via the notification's "Next goal" action now. */
  next?: string;
  goal?: string;
  status?: LogStatus;
}

export function saveLog(input: SaveLogInput): HourLog {
  const now = new Date().toISOString();
  const existing = getLog(input.date, input.hour);
  const backfilled = existing
    ? existing.backfilled
    : hourHasEnded(input.date, input.hour, offsetNow(-5 * 60 * 1000))
      ? 1
      : 0;
  const log: HourLog = {
    id: existing?.id ?? Crypto.randomUUID(),
    date: input.date,
    hour: input.hour,
    did: input.did.trim(),
    next: (input.next ?? existing?.next ?? '').trim(),
    goal: (input.goal ?? existing?.goal ?? getGoalFor(input.date, input.hour) ?? '').trim(),
    tags: parseTags(input.did).join(','),
    status: input.status ?? 'logged',
    backfilled,
    logged_at: existing?.logged_at ?? now,
    updated_at: now,
    synced_at: null,
  };
  db().runSync(
    `INSERT INTO hour_logs (id, date, hour, did, next, goal, tags, status, backfilled, logged_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(date, hour) DO UPDATE SET
       did = excluded.did, next = excluded.next, goal = excluded.goal, tags = excluded.tags,
       status = excluded.status, updated_at = excluded.updated_at, synced_at = NULL`,
    [log.id, log.date, log.hour, log.did, log.next, log.goal, log.tags, log.status, log.backfilled, log.logged_at, log.updated_at]
  );
  return log;
}

/** Log the same content across several hours at once (combined slot). */
export function saveLogBlock(input: {
  date: string;
  hours: number[];
  did: string;
  goal?: string;
  status?: LogStatus;
}): void {
  for (const hour of input.hours) {
    saveLog({
      date: input.date,
      hour,
      did: input.did,
      goal: input.goal,
      status: input.status,
    });
  }
}

/** Grace: logging within 5 min after the hour ends still counts as live. */
function offsetNow(ms: number): Date {
  return new Date(Date.now() + ms);
}

export function getLog(date: string, hour: number): HourLog | null {
  return (
    db().getFirstSync<HourLog>('SELECT * FROM hour_logs WHERE date = ? AND hour = ?', [date, hour]) ?? null
  );
}

export function getDay(date: string): HourLog[] {
  return db().getAllSync<HourLog>('SELECT * FROM hour_logs WHERE date = ? ORDER BY hour', [date]);
}

// ---------- goal (current hour's plan) ----------

/**
 * The goal for date+hour: an explicitly planned goal if one was set (via the
 * notification "Edit goal" action, the log screen, or a future block plan),
 * otherwise the previous hour's "next" plan.
 */
export function getGoalFor(date: string, hour: number): string {
  const explicit = kvGet(`goal:${date}:${hour}`);
  if (explicit !== null) return explicit;
  const prev = hour > 0 ? getLog(date, hour - 1) : getLog(addDays(date, -1), 23);
  return prev?.next ?? '';
}

export function setGoalOverride(date: string, hour: number, text: string) {
  const t = text.trim();
  if (t) kvSet(`goal:${date}:${hour}`, t);
  else kvDelete(`goal:${date}:${hour}`);
}

export function getCurrentGoal(now = new Date()): string {
  return getGoalFor(todayKey(), now.getHours());
}

// ---------- day gate / backlog ----------

export function dayStatus(settings: Settings, date: string): DayStatus {
  const active = activeHours(settings, date);
  const rows = getDay(date);
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  const missing = active.filter((h) => !byHour.has(h) && hourHasEnded(date, h));
  return {
    date,
    missing,
    logged: rows.filter((r) => r.status === 'logged').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    active: active.length,
  };
}

/** Previous days (before today, since first use, max 14 back) with unlogged active hours. */
export function getBacklogDays(settings: Settings): DayStatus[] {
  const first = getFirstDate();
  const today = todayKey();
  const result: DayStatus[] = [];
  let d = addDays(today, -1);
  for (let i = 0; i < 14 && d >= first; i++, d = addDays(d, -1)) {
    const status = dayStatus(settings, d);
    if (status.missing.length > 0) result.push(status);
  }
  return result.reverse();
}

/** Unlogged elapsed hours today (for escalating ping copy). */
export function todayMissedCount(settings: Settings): number {
  return dayStatus(settings, todayKey()).missing.length;
}

// ---------- stats (dashboard) ----------

export interface Stats {
  days: { date: string; logged: number; skipped: number; active: number }[]; // last 14
  complianceWeek: number; // 0-1 over the last 7 days
  streak: number; // consecutive fully-logged days ending yesterday/today
  tags: { tag: string; count: number }[];
  hourCounts: { hour: number; count: number }[]; // logged rows per hour-of-day
  backfilledRatio: number; // 0-1 among logged rows
}

export function getStats(settings: Settings): Stats {
  const today = todayKey();
  const days: Stats['days'] = [];
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i);
    const s = dayStatus(settings, date);
    days.push({ date, logged: s.logged, skipped: s.skipped, active: s.active });
  }

  const last7 = days.slice(-7);
  let done = 0;
  let possible = 0;
  for (const d of last7) {
    const elapsed = activeHours(settings, d.date).filter((h) => hourHasEnded(d.date, h)).length;
    possible += elapsed;
    done += Math.min(d.logged + d.skipped, elapsed);
  }
  const complianceWeek = possible === 0 ? 1 : done / possible;

  let streak = 0;
  const first = getFirstDate();
  // Today counts toward the streak only once fully logged; otherwise start from yesterday.
  let d = dayStatus(settings, today).missing.length === 0 && dayStatus(settings, today).logged > 0 ? today : addDays(today, -1);
  while (d >= first) {
    const s = dayStatus(settings, d);
    if (s.active > 0 && s.missing.length === 0 && s.logged > 0) streak++;
    else if (s.active > 0) break;
    d = addDays(d, -1);
  }

  const since = addDays(today, -29);
  const rows = db().getAllSync<{ tags: string; hour: number; backfilled: number; status: string }>(
    "SELECT tags, hour, backfilled, status FROM hour_logs WHERE date >= ? AND status = 'logged'",
    [since]
  );
  const tagCounts = new Map<string, number>();
  const hourMap = new Map<number, number>();
  let backfilled = 0;
  for (const r of rows) {
    for (const t of r.tags ? r.tags.split(',') : []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    hourMap.set(r.hour, (hourMap.get(r.hour) ?? 0) + 1);
    if (r.backfilled) backfilled++;
  }
  const tags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const hourCounts = [...hourMap.entries()].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour);

  return {
    days,
    complianceWeek,
    streak,
    tags,
    hourCounts,
    backfilledRatio: rows.length === 0 ? 0 : backfilled / rows.length,
  };
}

// ---------- export ----------

export function getAllLogs(): HourLog[] {
  return db().getAllSync<HourLog>('SELECT * FROM hour_logs ORDER BY date, hour');
}

// ---------- sync helpers ----------

export function getUnsynced(): HourLog[] {
  return db().getAllSync<HourLog>('SELECT * FROM hour_logs WHERE synced_at IS NULL');
}

export function markSynced(ids: string[], at: string) {
  const d = db();
  for (const id of ids) d.runSync('UPDATE hour_logs SET synced_at = ? WHERE id = ?', [at, id]);
}

/** Apply a remote row if it is newer than the local one (last-write-wins). */
export function applyRemote(row: HourLog) {
  const local = getLog(row.date, row.hour);
  if (local && local.updated_at >= row.updated_at) return;
  db().runSync(
    `INSERT INTO hour_logs (id, date, hour, did, next, goal, tags, status, backfilled, logged_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, hour) DO UPDATE SET
       id = excluded.id, did = excluded.did, next = excluded.next, goal = excluded.goal,
       tags = excluded.tags, status = excluded.status, backfilled = excluded.backfilled,
       logged_at = excluded.logged_at, updated_at = excluded.updated_at, synced_at = excluded.synced_at`,
    [row.id, row.date, row.hour, row.did, row.next, row.goal, row.tags, row.status, row.backfilled, row.logged_at, row.updated_at, row.synced_at]
  );
}
