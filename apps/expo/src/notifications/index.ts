import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  AuthorizationStatus,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import { getCurrentGoal, getGoalFor, getSettings, todayMissedCount } from '../repo';
import { activeHours, addDays, dateKey, hourHasEnded, hourLabel, hourStart, todayKey } from '../time';
import type { Settings } from '../types';

export const CHANNEL_HOURLY = 'hourly';
export const CHANNEL_GOAL = 'goal';
export const GOAL_NOTIFICATION_ID = 'current-goal';
const PING_PREFIX = 'ping-';
const MAX_TRIGGERS = 30;

export async function ensureChannels() {
  await notifee.createChannel({
    id: CHANNEL_HOURLY,
    name: 'Hourly check-in',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  await notifee.createChannel({
    id: CHANNEL_GOAL,
    name: 'Current goal',
    importance: AndroidImportance.DEFAULT,
    vibration: true,
  });
}

export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Android 12+: exact alarms may need a separate grant in system settings. */
export async function ensureExactAlarms() {
  const s = await notifee.getNotificationSettings();
  if (s.android.alarm !== AndroidNotificationSetting.ENABLED) {
    await notifee.openAlarmPermissionSettings();
  }
}

/**
 * Ping times: one at the END of each active hour (e.g. active hour 9-10am
 * pings at 10:00 asking to log it). Schedules the next MAX_TRIGGERS pings.
 */
function upcomingPings(settings: Settings, now = new Date()): { date: string; hour: number; fireAt: Date }[] {
  const out: { date: string; hour: number; fireAt: Date }[] = [];
  let d = todayKey();
  for (let i = 0; i < 14 && out.length < MAX_TRIGGERS; i++, d = addDays(d, 1)) {
    for (const h of activeHours(settings, d)) {
      const fireAt = hourStart(d, h);
      fireAt.setHours(fireAt.getHours() + 1);
      if (fireAt.getTime() > now.getTime() + 5000) {
        out.push({ date: d, hour: h, fireAt });
        if (out.length >= MAX_TRIGGERS) break;
      }
    }
  }
  return out;
}

export async function rescheduleAll(settings = getSettings()) {
  const existing = await notifee.getTriggerNotificationIds();
  const stale = existing.filter((id) => id.startsWith(PING_PREFIX));
  if (stale.length) await notifee.cancelTriggerNotifications(stale);

  const backlog = todayMissedCount(settings);
  for (const ping of upcomingPings(settings)) {
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: ping.fireAt.getTime(),
      alarmManager: { allowWhileIdle: true },
    };
    const nextGoal = getGoalFor(ping.date, (ping.hour + 1) % 24);
    await notifee.createTriggerNotification(
      {
        id: `${PING_PREFIX}${ping.date}-${ping.hour}`,
        title: `Log ${hourLabel(ping.hour)}`,
        body:
          (nextGoal ? `Next up: ${nextGoal}. ` : '') +
          'What did you do this hour?' +
          (backlog > 0 ? ` (${backlog} unlogged today)` : ''),
        data: { kind: 'ping', date: ping.date, hour: String(ping.hour) },
        android: {
          channelId: CHANNEL_HOURLY,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          // Not user-clearable on Android ≤13; on 14+ the DISMISSED handler
          // re-posts it until the hour is logged or skipped.
          ongoing: true,
          autoCancel: false,
          pressAction: { id: 'default', launchActivity: 'com.das.hourtracker.MainActivity' },
          actions: [
            {
              title: '✏️ Log it',
              pressAction: { id: 'log' },
              input: { placeholder: 'What did you do?', allowFreeFormInput: true },
            },
            {
              title: '🎯 Next goal',
              pressAction: { id: 'goal' },
              input: { placeholder: "What's the plan now?", allowFreeFormInput: true },
            },
          ],
          timestamp: ping.fireAt.getTime(),
          showTimestamp: true,
        },
      },
      trigger
    );
  }
}

/** Remove a displayed ping once its hour has been logged or skipped. */
export async function cancelPingFor(date: string, hour: number) {
  await notifee.cancelNotification(`${PING_PREFIX}${date}-${hour}`);
}

/** Fires a real ping ~10s from now so behavior can be checked without waiting an hour. */
export async function sendTestPing() {
  const now = new Date();
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + 10_000,
    alarmManager: { allowWhileIdle: true },
  };
  await notifee.createTriggerNotification(
    {
      id: 'test-ping',
      title: `Test — log ${hourLabel(now.getHours())}`,
      body: 'What did you do this hour?',
      data: { kind: 'ping', date: dateKey(now), hour: String(now.getHours()) },
      android: {
        channelId: CHANNEL_HOURLY,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        ongoing: true,
        autoCancel: false,
        pressAction: { id: 'default', launchActivity: 'com.das.hourtracker.MainActivity' },
        actions: [
          { title: '✏️ Log it', pressAction: { id: 'log' }, input: { placeholder: 'What did you do?', allowFreeFormInput: true } },
          { title: '🎯 Next goal', pressAction: { id: 'goal' }, input: { placeholder: "What's the plan now?", allowFreeFormInput: true } },
        ],
      },
    },
    trigger
  );
}

/** Persistent lock-screen notification showing the running hour's goal. */
export async function updateGoalNotification() {
  const goal = getCurrentGoal();
  const now = new Date();
  const settings = getSettings();
  const inWindow =
    activeHours(settings, dateKey(now)).includes(now.getHours());
  if (!inWindow) {
    await notifee.cancelNotification(GOAL_NOTIFICATION_ID);
    return;
  }
  await notifee.displayNotification({
    id: GOAL_NOTIFICATION_ID,
    title: `This hour (${hourLabel(now.getHours())})`,
    body: goal || 'No goal set — tap to plan this hour.',
    data: { kind: 'goal', date: dateKey(now), hour: String(now.getHours()) },
    android: {
      channelId: CHANNEL_GOAL,
      ongoing: true,
      autoCancel: false,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: { id: 'default', launchActivity: 'com.das.hourtracker.MainActivity' },
      smallIcon: 'ic_launcher',
    },
  });
}

/**
 * The "🎯 Next goal" action sets the goal for the hour right after the one
 * being logged — only meaningful while that hour is still current or ahead.
 * Once it's elapsed (e.g. an old ping that's still up because it was never
 * logged), strip the action so it can't be used to plan a goal for the past.
 */
export async function pruneStalePingActions() {
  const displayed = await notifee.getDisplayedNotifications();
  for (const { notification } of displayed) {
    const data = (notification.data ?? {}) as Record<string, string>;
    if (data.kind !== 'ping' || !notification.android?.actions) continue;
    const hasGoalAction = notification.android.actions.some((a) => a.pressAction.id === 'goal');
    if (!hasGoalAction) continue;

    const hour = Number(data.hour);
    if (!data.date || Number.isNaN(hour)) continue;
    const nextHour = (hour + 1) % 24;
    const nextDate = nextHour === 0 ? addDays(data.date, 1) : data.date;
    if (!hourHasEnded(nextDate, nextHour)) continue; // still current/future — keep it

    await notifee.displayNotification({
      ...notification,
      android: {
        ...notification.android,
        actions: notification.android.actions.filter((a) => a.pressAction.id !== 'goal'),
      },
    });
  }
}
