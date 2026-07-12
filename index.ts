// Register Notifee background handler before the app mounts so quick-reply
// actions work while the app is killed.
import './src/notifications/background';
import 'expo-router/entry';
