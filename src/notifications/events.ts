import notifee, { EventType, type Event } from '@notifee/react-native';
import { getLog, saveLog, setGoalOverride } from '../repo';
import { addDays } from '../time';
import { pruneStalePingActions, rescheduleAll, updateGoalNotification } from './index';

/**
 * Shared handler for foreground and background (headless) Notifee events.
 * Quick-reply actions write straight to SQLite so logging works without
 * opening the app.
 */
export async function handleNotifeeEvent({ type, detail }: Event) {
  const data = (detail.notification?.data ?? {}) as Record<string, string>;

  if (type === EventType.DELIVERED && data.kind === 'ping') {
    // A new hour started: refresh the lock-screen goal, keep the trigger
    // queue topped up, and retire the "Next goal" action on the ping(s)
    // this new hour just made stale.
    await updateGoalNotification();
    await rescheduleAll();
    await pruneStalePingActions();
    return;
  }

  // Swiped away without logging (possible on Android 14+ despite `ongoing`):
  // put it right back until the hour is actually logged or skipped.
  if (type === EventType.DISMISSED && data.kind === 'ping' && detail.notification) {
    const d = data.date;
    const h = Number(data.hour);
    if (d && !Number.isNaN(h) && !getLog(d, h)) {
      await notifee.displayNotification(detail.notification);
      await pruneStalePingActions();
    }
    return;
  }

  // Same for the lock-screen goal notification — re-post it while its hour
  // is still current so it stays pinned.
  if (type === EventType.DISMISSED && data.kind === 'goal') {
    await updateGoalNotification();
    return;
  }

  if (type !== EventType.ACTION_PRESS || data.kind !== 'ping') return;

  const pressId = detail.pressAction?.id;
  const input = (detail.input ?? '').toString().trim();
  const date = data.date;
  const hour = Number(data.hour);
  if (!date || Number.isNaN(hour)) return;

  if (pressId === 'log' && input) {
    saveLog({ date, hour, did: input, next: '' });
  } else if (pressId === 'goal' && input) {
    // The ping for hour H fires at H+1:00, so "the plan now" belongs to H+1.
    const nextHour = (hour + 1) % 24;
    const nextDate = nextHour === 0 ? addDays(date, 1) : date;
    setGoalOverride(nextDate, nextHour, input);
  }

  if (detail.notification?.id) {
    await notifee.cancelNotification(detail.notification.id);
  }
  await updateGoalNotification();
}
