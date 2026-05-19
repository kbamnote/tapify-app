import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';
import { useNavigation } from '../context/NavigationContext';

const PRIVACY_POLICY = `Last Updated: May 2026

1. INTRODUCTION
Welcome to Tapify. We are committed to protecting your personal data and your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.

2. INFORMATION WE COLLECT
- Personal Data: Name, email address, phone number, and profile picture.
- vCard Profile Information: Contact links, social media handles, services, and galleries you choose to publish on your public vCard link.
- Store & Order Data: Products, categories, prices, and order details from your WhatsApp store.
- Usage Data: Information about device interactions and total views.

3. HOW WE USE YOUR INFORMATION
- To provide, operate, and maintain our services.
- To process vCard creations and publish live alias links.
- To facilitate appointment bookings and notify you of customer inquiries.
- To comply with legal obligations and prevent fraudulent activity.

4. DATA DELETION & RETENTION
We retain your data for as long as your account is active. You can request complete deletion of your account and all associated vCards, stores, and appointments directly from the "Danger Zone" in the app settings, which will instantly and permanently erase your records from our active databases.

5. CONTACT US
If you have any questions or suggestions about this Privacy Policy, please contact us at support@tapify.com.`;

const TERMS_CONDITIONS = `Last Updated: May 2026

1. AGREEMENT TO TERMS
By accessing or using Tapify, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the application.

2. USER ACCOUNTS
- You must provide accurate, current, and complete information during registration.
- You are responsible for safeguarding your login credentials.
- You must notify us immediately of any unauthorized use of your account.

3. ACCEPTABLE USE
You agree not to use Tapify for any unlawful purpose or to publish content that:
- Is fraudulent, false, or misleading.
- Infringes on intellectual property rights.
- Promotes harassment, spam, or malicious software.

4. SUBSCRIPTIONS & PAYMENTS
Certain features are billed on a subscription basis. Subscriptions automatically renew unless canceled before the billing date.

5. LIMITATION OF LIABILITY
Tapify is provided "as is" without warranties of any kind. In no event shall Tapify be liable for any indirect, incidental, or consequential damages.

6. TERMINATION
We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that violates these Terms.`;

export default function SettingsScreen() {
  const { logout } = useNavigation();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyType, setPolicyType] = useState('privacy'); // 'privacy' or 'terms'

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/me.php');
      if (response.success && response.data?.user) {
        setPlanData(response.data.user);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openPolicy = (type) => {
    setPolicyType(type);
    setPolicyModalVisible(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your Tapify account? This will erase all your vCards, stores, and appointments. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetchApi('/api/profile/delete.php', {
                method: 'POST',
              });
              if (response.success) {
                Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                logout();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete account');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'An error occurred');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Account & Privacy</Text>

        <GlassCard style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Alerts</Text>
              <Text style={styles.settingDesc}>Receive daily store order summaries</Text>
            </View>
            <Switch 
              value={emailAlerts} 
              onValueChange={setEmailAlerts} 
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={emailAlerts ? COLORS.accent : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Alerts on direct appointments</Text>
            </View>
            <Switch 
              value={pushNotifications} 
              onValueChange={setPushNotifications}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={pushNotifications ? COLORS.accent : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              <Text style={styles.settingDesc}>Add extra layer of login security</Text>
            </View>
            <Switch 
              value={twoFactor} 
              onValueChange={setTwoFactor}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={twoFactor ? COLORS.accent : '#f4f3f4'}
            />
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Tapify Plan</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <GlassCard style={[styles.card, styles.planCard]}>
            <View style={styles.planHeader}>
              <Text style={styles.planBadge}>{planData?.plan_name ? planData.plan_name.toUpperCase() : 'FREE PLAN'}</Text>
              <Text style={styles.planPrice}>{planData?.plan_name ? 'Active' : 'N/A'}</Text>
            </View>
            <Text style={styles.planTitle}>Tapify SaaS Membership</Text>
            <Text style={styles.planRenewal}>
              {planData?.subscription_expires ? `Next billing date: ${formatDate(planData.subscription_expires)}` : 'No active subscription'}
            </Text>
            
            <TouchableOpacity style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Manage Subscription</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        <Text style={styles.sectionTitle}>Legal & Policies</Text>

        <GlassCard style={styles.card}>
          <TouchableOpacity style={styles.policyRow} onPress={() => openPolicy('privacy')}>
            <View style={styles.policyInfo}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDesc}>How we handle and protect your personal data</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.policyRow} onPress={() => openPolicy('terms')}>
            <View style={styles.policyInfo}>
              <Text style={styles.settingLabel}>Terms & Conditions</Text>
              <Text style={styles.settingDesc}>Rules and agreements for using Tapify</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Danger Zone</Text>

        <GlassCard style={[styles.card, styles.dangerCard]}>
          <View style={styles.dangerRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: COLORS.error }]}>Delete Account</Text>
              <Text style={styles.settingDesc}>Permanently delete your profile and all associated data</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Policy Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={policyModalVisible}
        onRequestClose={() => setPolicyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setPolicyModalVisible(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {policyType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </Text>
              <TouchableOpacity onPress={() => setPolicyModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <Text style={styles.policyText}>
                {policyType === 'privacy' ? PRIVACY_POLICY : TERMS_CONDITIONS}
              </Text>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setPolicyModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    marginTop: 14,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(21, 62, 63, 0.08)',
    marginVertical: 12,
  },
  planCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planBadge: {
    backgroundColor: COLORS.accent,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  planPrice: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  planTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  planRenewal: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 20,
  },
  manageBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  // Policy List Items
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  policyInfo: {
    flex: 1,
  },
  arrowIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
    paddingLeft: 10,
  },

  // Danger Zone
  dangerCard: {
    borderColor: '#fca5a5',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 62, 63, 0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  modalBody: {
    marginBottom: 20,
  },
  policyText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    whiteSpace: 'pre-wrap', // React Native doesn't use whiteSpace, but we write it formatted
  },
  modalCloseBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
