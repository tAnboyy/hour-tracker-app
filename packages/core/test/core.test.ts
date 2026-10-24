import assert from 'node:assert/strict';
import test from 'node:test';
import { activeHours, addDays, assertEntitySlot, assertSettings, hourLabel, isDateKey, parseTags } from '../src/index.ts';

test('date validation rejects normalized impossible dates', () => {
  assert.equal(isDateKey('2026-02-28'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.throws(() => assertEntitySlot('2026-02-30', 9));
});

test('addDays follows local calendar boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('activeHours respects day selection and exclusive end hour', () => {
  const settings = { startHour: 8, endHour: 11, activeDays: [5] };
  assert.deepEqual(activeHours(settings, '2026-10-23'), [8, 9, 10]);
  assert.deepEqual(activeHours(settings, '2026-10-24'), []);
});

test('settings validation covers hour, weekday, and timezone boundaries', () => {
  assert.doesNotThrow(() => assertSettings({ startHour: 8, endHour: 24, activeDays: [1, 2], timezone: 'America/New_York' }));
  assert.throws(() => assertSettings({ startHour: 8, endHour: 8, activeDays: [1], timezone: 'UTC' }));
  assert.throws(() => assertSettings({ startHour: 8, endHour: 9, activeDays: [1, 1], timezone: 'UTC' }));
  assert.throws(() => assertSettings({ startHour: 8, endHour: 9, activeDays: [1], timezone: 'Not/A_Zone' }));
});

test('hour labels wrap midnight and invalid values fail', () => {
  assert.equal(hourLabel(23), '11pm–12am');
  assert.throws(() => hourLabel(24));
});

test('tag parsing is unique, case-insensitive, and unicode-aware', () => {
  assert.deepEqual(parseTags('Built #PWA and #pwa with #café'), ['pwa', 'café']);
});
