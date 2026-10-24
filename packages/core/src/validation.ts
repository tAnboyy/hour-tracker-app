import type { UserSettings } from './types.ts';
import { isDateKey } from './time.ts';

export function assertHour(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 23) throw new RangeError('Hour must be an integer from 0 through 23.');
}

export function assertSettings(settings: Pick<UserSettings, 'startHour' | 'endHour' | 'activeDays' | 'timezone'>): void {
  if (!Number.isInteger(settings.startHour) || settings.startHour < 0 || settings.startHour > 23) {
    throw new RangeError('startHour must be an integer from 0 through 23.');
  }
  if (!Number.isInteger(settings.endHour) || settings.endHour < 1 || settings.endHour > 24) {
    throw new RangeError('endHour must be an integer from 1 through 24.');
  }
  if (settings.startHour >= settings.endHour) throw new RangeError('startHour must be earlier than endHour.');
  if (settings.activeDays.length === 0 || new Set(settings.activeDays).size !== settings.activeDays.length) {
    throw new RangeError('activeDays must contain at least one unique weekday.');
  }
  if (settings.activeDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new RangeError('activeDays values must be integers from 0 through 6.');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone }).format();
  } catch {
    throw new RangeError('timezone must be a valid IANA time zone.');
  }
}

export function assertEntitySlot(date: string, hour: number): void {
  if (!isDateKey(date)) throw new RangeError('date must be a real YYYY-MM-DD local date.');
  assertHour(hour);
}

export function parseTags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}
