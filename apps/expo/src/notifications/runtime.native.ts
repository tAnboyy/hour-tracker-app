import notifee, { EventType } from '@notifee/react-native';
import './background';
import { handleNotifeeEvent } from './events';

export async function getInitialNotificationRoute(): Promise<Record<string, string> | null> {
  const initial = await notifee.getInitialNotification();
  return (initial?.notification?.data as Record<string, string> | undefined) ?? null;
}

export function subscribeNotificationEvents(onRoute: (data: Record<string, string>) => void, onChanged: () => void): () => void {
  return notifee.onForegroundEvent(async (event) => {
    const data = event.detail.notification?.data as Record<string, string> | undefined;
    if (event.type === EventType.PRESS && data && (data.kind === 'ping' || data.kind === 'goal')) onRoute(data);
    else await handleNotifeeEvent(event);
    onChanged();
  });
}
