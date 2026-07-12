import type { Settings } from './types';

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function hourLabel(hour: number): string {
  const fmt = (h: number) => {
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${ampm}`;
  };
  return `${fmt(hour)}–${fmt((hour + 1) % 24)}`;
}

/** Active hours for a given date under the current settings. */
export function activeHours(settings: Settings, dateStr: string): number[] {
  const day = parseDateKey(dateStr).getDay();
  if (!settings.activeDays.includes(day)) return [];
  const hours: number[] = [];
  for (let h = settings.startHour; h < settings.endHour; h++) hours.push(h);
  return hours;
}

/** Start-of-hour Date for a date key + hour. */
export function hourStart(dateStr: string, hour: number): Date {
  const d = parseDateKey(dateStr);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Has this date+hour fully elapsed? (its end is in the past) */
export function hourHasEnded(dateStr: string, hour: number, now = new Date()): boolean {
  const end = hourStart(dateStr, hour);
  end.setHours(end.getHours() + 1);
  return end.getTime() <= now.getTime();
}

export function hourIsCurrent(dateStr: string, hour: number, now = new Date()): boolean {
  return dateKey(now) === dateStr && now.getHours() === hour;
}
