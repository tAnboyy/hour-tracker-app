import { kvDelete, kvGet, kvSet } from './db';
import { activeHours, addDays, hourHasEnded, todayKey } from './time';
import { DEFAULT_SETTINGS, type DayStatus, type HourLog, type LogStatus, type Settings } from './types';

const LOGS_KEY = 'web:hourLogs';

function allRows(): HourLog[] {
  const raw = kvGet(LOGS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HourLog[];
  } catch {
    return [];
  }
}

function writeRows(rows: HourLog[]): void {
  kvSet(LOGS_KEY, JSON.stringify(rows));
}

export function getSettings(): Settings {
  const raw = kvGet('settings');
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  kvSet('settings', JSON.stringify(settings));
}

export function getFirstDate(): string {
  const existing = kvGet('firstDate');
  if (existing) return existing;
  const today = todayKey();
  kvSet('firstDate', today);
  return today;
}

export function parseTags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

export interface SaveLogInput {
  date: string;
  hour: number;
  did: string;
  next?: string;
  goal?: string;
  status?: LogStatus;
}

export function saveLog(input: SaveLogInput): HourLog {
  const rows = allRows();
  const index = rows.findIndex((row) => row.date === input.date && row.hour === input.hour);
  const existing = index >= 0 ? rows[index] : null;
  const now = new Date().toISOString();
  const log: HourLog = {
    id: existing?.id ?? crypto.randomUUID(),
    date: input.date,
    hour: input.hour,
    did: input.did.trim(),
    next: (input.next ?? existing?.next ?? '').trim(),
    goal: (input.goal ?? existing?.goal ?? getGoalFor(input.date, input.hour)).trim(),
    tags: parseTags(input.did).join(','),
    status: input.status ?? 'logged',
    backfilled: existing?.backfilled ?? (hourHasEnded(input.date, input.hour, new Date(Date.now() - 5 * 60_000)) ? 1 : 0),
    logged_at: existing?.logged_at ?? now,
    updated_at: now,
    synced_at: null,
  };
  if (index >= 0) rows[index] = log;
  else rows.push(log);
  writeRows(rows);
  return log;
}

export function saveLogBlock(input: { date: string; hours: number[]; did: string; goal?: string; status?: LogStatus }): void {
  input.hours.forEach((hour) => saveLog({ ...input, hour }));
}

export function getLog(date: string, hour: number): HourLog | null {
  return allRows().find((row) => row.date === date && row.hour === hour) ?? null;
}

export function getDay(date: string): HourLog[] {
  return allRows().filter((row) => row.date === date).sort((a, b) => a.hour - b.hour);
}

export function getGoalFor(date: string, hour: number): string {
  const explicit = kvGet(`goal:${date}:${hour}`);
  if (explicit !== null) return explicit;
  const previous = hour > 0 ? getLog(date, hour - 1) : getLog(addDays(date, -1), 23);
  return previous?.next ?? '';
}

export function setGoalOverride(date: string, hour: number, text: string): void {
  const value = text.trim();
  if (value) kvSet(`goal:${date}:${hour}`, value);
  else kvDelete(`goal:${date}:${hour}`);
}

export function getCurrentGoal(now = new Date()): string {
  return getGoalFor(todayKey(), now.getHours());
}

export function dayStatus(settings: Settings, date: string): DayStatus {
  const active = activeHours(settings, date);
  const rows = getDay(date);
  const byHour = new Map(rows.map((row) => [row.hour, row]));
  return {
    date,
    missing: active.filter((hour) => !byHour.has(hour) && hourHasEnded(date, hour)),
    logged: rows.filter((row) => row.status === 'logged').length,
    skipped: rows.filter((row) => row.status === 'skipped').length,
    active: active.length,
  };
}

export function getBacklogDays(settings: Settings): DayStatus[] {
  const first = getFirstDate();
  const today = todayKey();
  const result: DayStatus[] = [];
  let date = addDays(today, -1);
  for (let index = 0; index < 14 && date >= first; index += 1, date = addDays(date, -1)) {
    const status = dayStatus(settings, date);
    if (status.missing.length) result.push(status);
  }
  return result.reverse();
}

export function todayMissedCount(settings: Settings): number {
  return dayStatus(settings, todayKey()).missing.length;
}

export interface Stats {
  days: { date: string; logged: number; skipped: number; active: number }[];
  complianceWeek: number;
  streak: number;
  tags: { tag: string; count: number }[];
  hourCounts: { hour: number; count: number }[];
  backfilledRatio: number;
}

export function getStats(settings: Settings): Stats {
  const today = todayKey();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    const status = dayStatus(settings, date);
    return { date, logged: status.logged, skipped: status.skipped, active: status.active };
  });
  let done = 0;
  let possible = 0;
  for (const day of days.slice(-7)) {
    const elapsed = activeHours(settings, day.date).filter((hour) => hourHasEnded(day.date, hour)).length;
    possible += elapsed;
    done += Math.min(day.logged + day.skipped, elapsed);
  }
  let streak = 0;
  const first = getFirstDate();
  let date = dayStatus(settings, today).missing.length === 0 && dayStatus(settings, today).logged > 0 ? today : addDays(today, -1);
  while (date >= first) {
    const status = dayStatus(settings, date);
    if (status.active > 0 && status.missing.length === 0 && status.logged > 0) streak += 1;
    else if (status.active > 0) break;
    date = addDays(date, -1);
  }
  const recent = allRows().filter((row) => row.date >= addDays(today, -29) && row.status === 'logged');
  const tags = new Map<string, number>();
  const hours = new Map<number, number>();
  recent.forEach((row) => {
    row.tags.split(',').filter(Boolean).forEach((tag) => tags.set(tag, (tags.get(tag) ?? 0) + 1));
    hours.set(row.hour, (hours.get(row.hour) ?? 0) + 1);
  });
  return {
    days,
    complianceWeek: possible === 0 ? 1 : done / possible,
    streak,
    tags: [...tags].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    hourCounts: [...hours].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour),
    backfilledRatio: recent.length === 0 ? 0 : recent.filter((row) => row.backfilled).length / recent.length,
  };
}

export function getAllLogs(): HourLog[] {
  return allRows().sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
}

export function getUnsynced(): HourLog[] {
  return allRows().filter((row) => row.synced_at === null);
}

export function markSynced(ids: string[], at: string): void {
  const wanted = new Set(ids);
  writeRows(allRows().map((row) => wanted.has(row.id) ? { ...row, synced_at: at } : row));
}

export function applyRemote(row: HourLog): void {
  const rows = allRows();
  const index = rows.findIndex((item) => item.date === row.date && item.hour === row.hour);
  if (index >= 0 && rows[index].updated_at >= row.updated_at) return;
  if (index >= 0) rows[index] = row;
  else rows.push(row);
  writeRows(rows);
}
