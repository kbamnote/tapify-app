import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';

export default function SettingsScreen() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
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

      <GlassCard style={[styles.card, styles.planCard]}>
        <View style={styles.planHeader}>
          <Text style={styles.planBadge}>PRO PLAN</Text>
          <Text style={styles.planPrice}>₹999 / yr</Text>
        </View>
        <Text style={styles.planTitle}>Tapify SaaS Membership</Text>
        <Text style={styles.planRenewal}>Next billing date: Jan 15, 2027</Text>
        
        <TouchableOpacity style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>Manage Subscription</Text>
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
    marginTop: 10,
  },
  card: {
    marginBottom: 20,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
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
});
