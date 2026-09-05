import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Image, Animated, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProvider, useNavigation } from './src/context/NavigationContext';
import { COLORS } from './src/theme/colors';
import {
  registerForPushNotificationsAsync,
  sendTokenToBackend,
  setupNotificationListeners,
  handleLaunchNotification,
} from './src/services/NotificationService';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { PAID_ADS_ENABLED } from './src/config/paidAds';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import InquiriesScreen from './src/screens/InquiriesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VcardsEditScreen from './src/screens/VcardsEditScreen';
import WhatsappStoresScreen from './src/screens/WhatsappStoresScreen';
import WhatsappOrdersScreen from './src/screens/WhatsappOrdersScreen';
import MyDesignsScreen from './src/screens/MyDesignsScreen';
import DesignCustomizeScreen from './src/screens/DesignCustomizeScreen';
import AiGrowthScreen from './src/screens/AiGrowthScreen';
import GoogleBusinessScreen from './src/screens/GoogleBusinessScreen';
import GoogleReviewsScreen from './src/screens/GoogleReviewsScreen';
import RequestReviewScreen from './src/screens/RequestReviewScreen';
import BusinessInsightsScreen from './src/screens/BusinessInsightsScreen';
import GoogleQuestionsScreen from './src/screens/GoogleQuestionsScreen';
import GooglePostsScreen from './src/screens/GooglePostsScreen';
import BusinessAttributesScreen from './src/screens/BusinessAttributesScreen';
import BusinessServicesScreen from './src/screens/BusinessServicesScreen';
import SocialScreen from './src/screens/SocialScreen';
import WalletScreen from './src/screens/WalletScreen';
import BoostAdsScreen from './src/screens/BoostAdsScreen';
import AdInsightsScreen from './src/screens/AdInsightsScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import BusinessesScreen from './src/screens/BusinessesScreen';
import TitaniumScreen from './src/screens/TitaniumScreen';
import AdminTitaniumScreen from './src/screens/AdminTitaniumScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import AdminBroadcastScreen from './src/screens/AdminBroadcastScreen';
import AdminLeadsScreen from './src/screens/AdminLeadsScreen';
import WebsiteOrdersScreen from './src/screens/WebsiteOrdersScreen';
import WebsiteAppointmentsScreen from './src/screens/WebsiteAppointmentsScreen';
import WebsiteInquiriesScreen from './src/screens/WebsiteInquiriesScreen';
import WebsiteFeedbackScreen from './src/screens/WebsiteFeedbackScreen';
import WhatsAppScreen from './src/screens/WhatsAppScreen';
import WhatsAppAutoRepliesScreen from './src/screens/WhatsAppAutoRepliesScreen';
import WhatsAppBroadcastScreen from './src/screens/WhatsAppBroadcastScreen';
import WebsiteBuilderScreen from './src/screens/WebsiteBuilderScreen';
import SiteEditorScreen from './src/screens/SiteEditorScreen';

// Components
import Header from './src/components/Header';
import Sidebar from './src/components/Sidebar';
import TabBar from './src/components/TabBar';
import UpdatePopup from './src/components/UpdatePopup';

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
    case 'ai-growth':
      return <AiGrowthScreen />;
    case 'google-business':
      return <GoogleBusinessScreen />;
    case 'google-reviews':
      return <GoogleReviewsScreen />;
    case 'request-review':
      return <RequestReviewScreen />;
    case 'business-insights':
      return <BusinessInsightsScreen />;
    case 'google-questions':
      return <GoogleQuestionsScreen />;
    case 'google-posts':
      return <GooglePostsScreen />;
    case 'business-attributes':
      return <BusinessAttributesScreen />;
    case 'business-services':
      return <BusinessServicesScreen />;
    case 'social':
      return <SocialScreen />;
    // Paid-ads routes are absent on iOS, not merely hidden from the menu. A
    // reviewer reached the Razorpay top-up through Boost Ads once already
    // (Guideline 3.1.1), so the screens must not render even if something
    // navigates to them directly. See src/config/paidAds.js.
    case 'wallet':
      return PAID_ADS_ENABLED ? <WalletScreen /> : <DashboardScreen />;
    case 'boost-ads':
      return PAID_ADS_ENABLED ? <BoostAdsScreen /> : <DashboardScreen />;
    case 'ad-insights':
      return PAID_ADS_ENABLED ? <AdInsightsScreen /> : <DashboardScreen />;
    case 'reviews-funnel':
      return <ReviewsScreen />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'businesses':
      return <BusinessesScreen />;
    case 'titanium':
      return <TitaniumScreen />;
    case 'admin-titanium':
      return <AdminTitaniumScreen />;
    case 'admin-dashboard':
      return <AdminDashboardScreen />;
    case 'admin-users':
      return <AdminUsersScreen />;
    case 'admin-broadcast':
      return <AdminBroadcastScreen />;
    case 'admin-leads':
      return <AdminLeadsScreen />;
    case 'website-orders':
      return <WebsiteOrdersScreen />;
    case 'website-appointments':
      return <WebsiteAppointmentsScreen />;
    case 'website-inquiries':
      return <WebsiteInquiriesScreen />;
    case 'website-feedback':
      return <WebsiteFeedbackScreen />;
    case 'whatsapp':
      return <WhatsAppScreen />;
    case 'whatsapp-auto-replies':
      return <WhatsAppAutoRepliesScreen />;
    case 'whatsapp-broadcast':
      return <WhatsAppBroadcastScreen />;
    case 'website-builder':
      return <WebsiteBuilderScreen />;
    case 'site-editor':
      return <SiteEditorScreen />;
    default:
      return <DashboardScreen />;
  }
}

function MainLayout() {
  const { currentScreen, user, navigate, params } = useNavigation();

  // ALL HOOKS MUST COME BEFORE ANY EARLY RETURN — Rules of Hooks
  // The `if (!user) return` guard lives inside the effect body, not before it.
  useEffect(() => {
    if (!user) return;

    // Register channels + permission + get token, then save to backend
    registerForPushNotificationsAsync().then(token => {
      if (token) sendTokenToBackend(token);
    });

    // Handle notification that launched the app from killed state
    handleLaunchNotification(navigate);

    // Wire foreground + tap listeners → in-app navigation
    const cleanup = setupNotificationListeners(navigate);

    return cleanup;
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
      case 'vcards-edit': return 'Edit';
      case 'whatsapp-stores': return 'Web Store';
      case 'whatsapp-orders': return 'Web Orders';
      case 'my-designs': return 'My Designs';
      case 'design-customize': return 'Customize Design';
      case 'ai-growth': return 'AI Growth Center';
      case 'google-business': return 'Google Business Profile';
      case 'google-reviews': return 'Google Reviews';
      case 'request-review': return 'Request a Review';
      case 'business-insights': return 'Performance';
      case 'google-questions': return 'Questions & Answers';
      case 'business-attributes': return 'Business Attributes';
      case 'business-services': return 'Services';
      case 'social': return 'Social Media';
      case 'wallet': return 'Wallet';
      case 'boost-ads': return 'Boost Ads';
      case 'ad-insights': return 'Ad Insights';
      case 'reviews-funnel': return 'Reviews Funnel';
      case 'notifications': return 'Notification Center';
      case 'businesses':      return 'Business Directory';
      case 'titanium':        return '♛ Titanium Member';
      case 'admin-titanium':  return 'Manage Titanium Members';
      case 'admin-dashboard': return '🛡️ Admin Dashboard';
      case 'admin-users':     return '👥 Users';
      case 'admin-broadcast': return '📣 Send Notification';
      case 'admin-leads':     return '📥 Website Leads';
      case 'website-orders':       return '🛒 Website Orders';
      case 'website-appointments': return '📆 Website Appointments';
      case 'website-inquiries':    return '📨 Website Inquiries';
      case 'website-feedback':     return '⭐ Website Feedback';
      case 'whatsapp':             return '💬 WhatsApp';
      case 'whatsapp-auto-replies': return '🤖 Auto-replies';
      case 'whatsapp-broadcast':   return '📢 Broadcast';
      case 'website-builder':      return '🌐 Website Builder';
      case 'site-editor':          return params?.name ? `✎ ${params.name}` : 'Edit Website';
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
          <>
            <MainLayout />
            <UpdatePopup />
          </>
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
    width: 180,
    height: 120,
  },
});
