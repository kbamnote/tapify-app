import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';

import App from './App';

// Must be registered here (module scope of the entry file) so the handler is
// active even when the app is launched from a background/killed-state notification.
// See: https://docs.expo.dev/versions/v55.0.0/sdk/notifications/
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
