import type { Settings } from '../types';

export async function ensureChannels(): Promise<void> {}
export async function ensureExactAlarms(): Promise<void> {}
export async function rescheduleAll(_settings?: Settings): Promise<void> {}
export async function updateGoalNotification(): Promise<void> {}
export async function pruneStalePingActions(): Promise<void> {}
export async function cancelPingFor(_date: string, _hour: number): Promise<void> {}

export async function requestPermissions(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function sendTestPing(): Promise<void> {
  if (typeof Notification === 'undefined') throw new Error('Browser notifications are not supported.');
  if (Notification.permission !== 'granted') throw new Error('Browser notification permission is not granted.');
  setTimeout(() => new Notification('Hour Tracker test', { body: 'Browser reminders are enabled.' }), 10_000);
}
