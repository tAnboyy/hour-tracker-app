import notifee from '@notifee/react-native';
import { handleNotifeeEvent } from './events';

notifee.onBackgroundEvent(handleNotifeeEvent);
