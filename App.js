import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, SafeAreaView, Image, Animated, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationProvider, useNavigation } from './src/context/NavigationContext';
import { COLORS } from './src/theme/colors';

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
    default:
      return <DashboardScreen />;
  }
}

function MainLayout() {
  const { currentScreen, user } = useNavigation();

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
      case 'whatsapp-stores': return 'WhatsApp Stores';
      case 'whatsapp-orders': return 'WhatsApp Orders';
      case 'my-designs': return 'My Designs';
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
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native splash immediately
    SplashScreen.hideAsync();

    // Fade the logo in
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // After 2s, fade the whole splash out and call onFinish
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
      <StatusBar style="dark" />
      <Animated.Image
        source={require('./assets/tapify-logo-green.png')}
        style={[styles.splashLogo, { opacity: logoOpacity }]}
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
    width: 200,
    height: 90,
  },
});
