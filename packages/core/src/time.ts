import type { UserSettings } from './types.ts';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  if (!DATE_KEY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date {
  if (!isDateKey(value)) throw new RangeError(`Invalid local date key: ${value}`);
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number): string {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function activeHours(settings: Pick<UserSettings, 'startHour' | 'endHour' | 'activeDays'>, day: string): number[] {
  const weekday = parseDateKey(day).getDay();
  if (!settings.activeDays.includes(weekday)) return [];
  return Array.from({ length: settings.endHour - settings.startHour }, (_, index) => settings.startHour + index);
}

export function hourStart(day: string, hour: number): Date {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError(`Invalid hour: ${hour}`);
  const date = parseDateKey(day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export function hourHasEnded(day: string, hour: number, now = new Date()): boolean {
  const end = hourStart(day, hour);
  end.setHours(end.getHours() + 1);
  return end.getTime() <= now.getTime();
}

export function hourIsCurrent(day: string, hour: number, now = new Date()): boolean {
  return dateKey(now) === day && now.getHours() === hour;
}

export function hourLabel(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError(`Invalid hour: ${hour}`);
  const format = (value: number) => `${value % 12 === 0 ? 12 : value % 12}${value < 12 ? 'am' : 'pm'}`;
  return `${format(hour)}–${format((hour + 1) % 24)}`;
}
