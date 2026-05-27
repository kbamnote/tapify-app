import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure notifications show up when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8338ec',
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
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'c8ffb44e-62c6-434b-8109-ec5c66568151' // from app.json
    })).data;
    
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendTokenToBackend(token) {
  if (!token) return;
  try {
    const sessionToken = await AsyncStorage.getItem('userToken');
    if (!sessionToken) return;

    await fetch(`${API_BASE}/api/notifications/update-token.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ token })
    });
  } catch (e) {
    console.log('Error saving token to backend', e);
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
