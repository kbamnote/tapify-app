import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { fetchApi } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// Android notification channels
// Must be created BEFORE requesting permissions so the channel exists
// when the system shows the permission dialog.
// ─────────────────────────────────────────────────────────────────────────────
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Silent fallback channel (kept for backward compat)
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#153e3f',
  });

  // Primary channel — heads-up popup, custom sound, max importance
  await Notifications.setNotificationChannelAsync('tapify_alerts', {
    name: 'Tapify Alerts',
    description: 'Important alerts from Tapify',
    importance: Notifications.AndroidImportance.MAX,   // MAX = heads-up popup
    sound: 'notification_sound.mpeg',                  // filename only, no path
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#153e3f',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission request — handles Android 13+ POST_NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!Device.isDevice) {
    // Emulators/simulators can't receive push notifications
    console.log('[Notifications] Physical device required for push notifications.');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') return true;

  if (existingStatus === 'denied') {
    // User previously denied — show alert to go to settings
    Alert.alert(
      'Notifications Disabled',
      'To receive alerts for new inquiries, appointments, and reviews, please enable notifications in your device settings.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
    return false;
  }

  // Status is 'undetermined' — show system dialog
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowDisplayInCarPlay: false,
      allowCriticalAlerts: false,
      provideAppNotificationSettings: false,
      allowProvisional: false,
    },
  });

  if (status !== 'granted') {
    console.log('[Notifications] Permission denied by user.');
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Register for push notifications — full flow
// Call this once after login or on app start
// ─────────────────────────────────────────────────────────────────────────────
export async function registerForPushNotificationsAsync() {
  // Step 1: Create channels first (Android)
  await setupNotificationChannels();

  // Step 2: Request permission
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Step 3: Get Expo Push Token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    });

    const token = tokenData.data;
    console.log('[Notifications] Expo Push Token:', token);
    return token;
  } catch (e) {
    console.log('[Notifications] Failed to get push token:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Save token to backend
// ─────────────────────────────────────────────────────────────────────────────
export async function sendTokenToBackend(token) {
  if (!token) return;
  try {
    await fetchApi('/api/notifications/update-token.php', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    console.log('[Notifications] Push token saved to backend.');
  } catch (e) {
    console.log('[Notifications] Error saving push token:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification listeners
// Call this after login and clean up on logout
// ─────────────────────────────────────────────────────────────────────────────
export function setupNotificationListeners(onNavigate) {
  // Foreground: notification received while app is open
  const foregroundSub = Notifications.addNotificationReceivedListener(notification => {
    console.log('[Notifications] Foreground notification:', notification);
    // The setNotificationHandler in index.js ensures the popup shows.
    // You can update badge count or refresh data here if needed.
  });

  // Tap: user tapped a notification (foreground, background, or killed state)
  const tapSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('[Notifications] Notification tapped, data:', data);

    if (!data?.redirect_url || !onNavigate) return;

    const url = data.redirect_url;
    if (url.includes('appointment'))  onNavigate('appointments');
    else if (url.includes('inquiry')) onNavigate('inquiries');
    else if (url.includes('review'))  onNavigate('reviews-funnel');
    else if (url.includes('order'))   onNavigate('whatsapp-orders');
  });

  // Return cleanup function — call this on logout or unmount
  return () => {
    foregroundSub.remove();
    tapSub.remove();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle notification that LAUNCHED the app (killed state tap)
// Call this once on app start
// ─────────────────────────────────────────────────────────────────────────────
export async function handleLaunchNotification(onNavigate) {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;

  const data = response.notification.request.content.data;
  if (!data?.redirect_url || !onNavigate) return;

  const url = data.redirect_url;
  if (url.includes('appointment'))  onNavigate('appointments');
  else if (url.includes('inquiry')) onNavigate('inquiries');
  else if (url.includes('review'))  onNavigate('reviews-funnel');
  else if (url.includes('order'))   onNavigate('whatsapp-orders');
}
