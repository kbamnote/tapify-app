import React from 'react';
import { StyleSheet, View, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
  const { width } = useWindowDimensions();

  // If on login page, don't show header/sidebar
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
        {/* Sidebar Component handles absolute overlay on mobile */}
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

export default function App() {
  return (
    <NavigationProvider>
      <MainLayout />
    </NavigationProvider>
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
});
