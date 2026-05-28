import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchApi } from '../config'; // Uses session-cookie auth, same as the rest of the app

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    // Default channel (silent fallback — kept for backward compatibility)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    // Primary alerts channel — plays the custom notification sound
    await Notifications.setNotificationChannelAsync('tapify_alerts', {
      name: 'Tapify Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'tapify-notification.mp3',   // filename only, no path
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#153e3f',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied.');
      return null;
    }

    // projectId must match extra.eas.projectId in app.json
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    })).data;

    console.log('Expo Push Token:', token);
  } else {
    console.log('Push notifications require a physical device.');
  }

  return token;
}

// BUG FIX: Was using AsyncStorage.getItem('userToken') which is never set in this app.
// The app authenticates via PHP session cookies — use fetchApi which sends credentials: 'include'.
export async function sendTokenToBackend(token) {
  if (!token) return;
  try {
    await fetchApi('/api/notifications/update-token.php', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    console.log('Push token saved to backend successfully.');
  } catch (e) {
    console.log('Error saving push token to backend:', e);
  }
}

export function setupNotificationListeners(navigationRef) {
  // Foreground listener
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    // Optionally update badge count or refresh data here
    console.log("Foreground notification received:", notification);
  });

  // Background / Tap listener
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data && data.redirect_url) {
      // E.g. if redirect is '/appointments', navigate to 'Appointments'
      let screen = null;
      if (data.redirect_url.includes('appointment')) screen = 'Appointments';
      else if (data.redirect_url.includes('lead')) screen = 'Leads';
      else if (data.redirect_url.includes('review')) screen = 'Reviews';
      
      if (screen && navigationRef.current) {
         navigationRef.current.navigate(screen);
      }
    }
  });

  return { notificationListener, responseListener };
}
