import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Image, Animated, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProvider, useNavigation } from './src/context/NavigationContext';
import { COLORS } from './src/theme/colors';
import {
  registerForPushNotificationsAsync,
  sendTokenToBackend,
  setupNotificationListeners,
} from './src/services/NotificationService';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import InquiriesScreen from './src/screens/InquiriesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VcardsEditScreen from './src/screens/VcardsEditScreen';
import WhatsappStoresScreen from './src/screens/WhatsappStoresScreen';
import WhatsappOrdersScreen from './src/screens/WhatsappOrdersScreen';
import MyDesignsScreen from './src/screens/MyDesignsScreen';
import DesignCustomizeScreen from './src/screens/DesignCustomizeScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import BusinessesScreen from './src/screens/BusinessesScreen';

// Components
import Header from './src/components/Header';
import Sidebar from './src/components/Sidebar';
import TabBar from './src/components/TabBar';

// Keep the native splash visible while JS loads
SplashScreen.preventAutoHideAsync();

function ScreenRenderer() {
  const { currentScreen } = useNavigation();

  switch (currentScreen) {
    case 'login':
      return <LoginScreen />;
    case 'dashboard':
      return <DashboardScreen />;
    case 'appointments':
      return <AppointmentsScreen />;
    case 'inquiries':
      return <InquiriesScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'vcards-edit':
      return <VcardsEditScreen />;
    case 'whatsapp-stores':
      return <WhatsappStoresScreen />;
    case 'whatsapp-orders':
      return <WhatsappOrdersScreen />;
    case 'my-designs':
      return <MyDesignsScreen />;
    case 'design-customize':
      return <DesignCustomizeScreen />;
    case 'reviews-funnel':
      return <ReviewsScreen />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'businesses':
      return <BusinessesScreen />;
    default:
      return <DashboardScreen />;
  }
}

function MainLayout() {
  const { currentScreen, user, navigate } = useNavigation();

  // ALL HOOKS MUST COME BEFORE ANY EARLY RETURN — Rules of Hooks
  // The `if (!user) return` guard lives inside the effect body, not before it.
  useEffect(() => {
    if (!user) return;

    // Register and save the Expo push token to backend
    registerForPushNotificationsAsync().then(token => {
      if (token) sendTokenToBackend(token);
    });

    // Wire notification tap → in-app navigation
    const navRef = { current: { navigate: (screen) => navigate(screen) } };
    const { notificationListener, responseListener } = setupNotificationListeners(navRef);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [user]);

  if (currentScreen === 'login' || !user) {
    return <LoginScreen />;
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'dashboard': return 'Dashboard';
      case 'appointments': return 'Appointments';
      case 'inquiries': return 'Inquiries';
      case 'profile': return 'Profile Settings';
      case 'settings': return 'Platform Settings';
      case 'vcards-edit': return 'Edit vCard';
      case 'whatsapp-stores': return 'Web Store';
      case 'whatsapp-orders': return 'Web Orders';
      case 'my-designs': return 'My Designs';
      case 'design-customize': return 'Customize Design';
      case 'reviews-funnel': return 'Reviews Funnel';
      case 'notifications': return 'Notification Center';
      case 'businesses':    return 'Business Directory';
      default: return 'Tapify';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.layout}>
        <Sidebar />
        <View style={styles.mainContent}>
          <Header title={getScreenTitle()} />
          <View style={styles.pageContainer}>
            <ScreenRenderer />
          </View>
          <TabBar />
        </View>
      </View>
    </SafeAreaView>
  );
}

// Custom splash screen with controlled logo size
function CustomSplash({ onFinish }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native splash immediately
    SplashScreen.hideAsync();

    // Pop the logo in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // After 1.5s, massively zoom in and fade out
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 25, // Zoom massively
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 400,
          delay: 150, // Fade out slightly after zoom starts
          useNativeDriver: true,
        })
      ]).start(() => onFinish());
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
      <StatusBar style="dark" />
      <Animated.Image
        source={require('./assets/app-icon.png')}
        style={[
          styles.splashLogo, 
          { 
            opacity: logoOpacity,
            transform: [{ scale: logoScale }]
          }
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <NavigationProvider>
        {showSplash ? (
          <CustomSplash onFinish={() => setShowSplash(false)} />
        ) : (
          <MainLayout />
        )}
      </NavigationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    height: '100%',
  },
  pageContainer: {
    flex: 1,
  },
  // Custom splash styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 120,
    height: 120,
  },
});
