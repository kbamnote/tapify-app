import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '../context/NavigationContext';

export default function DashboardScreen() {
  const { navigate } = useNavigation();

  const metrics = [
    { title: 'Total vCard Views', value: '12,458', icon: '👁️', diff: '+12.4%', screen: 'profile' },
    { title: 'WhatsApp Stores', value: '3 Active', icon: '🏪', diff: '1 Pending', screen: 'whatsapp-stores' },
    { title: 'Appointments', value: '18 Today', icon: '📅', diff: '3 Pending', screen: 'appointments' },
    { title: 'Store Orders', value: '₹14,950', icon: '🛍️', diff: '+28 Orders', screen: 'whatsapp-orders' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Overview Metrics</Text>
      
      <View style={styles.grid}>
        {metrics.map((m, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.gridItem} 
            onPress={() => navigate(m.screen)}
          >
            <GlassCard style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{m.icon}</Text>
                <Text style={styles.diffText}>{m.diff}</Text>
              </View>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricTitle}>{m.title}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      
      <GlassCard style={styles.activityCard}>
        <View style={styles.activityRow}>
          <Text style={styles.bullet}>🟢</Text>
          <View style={styles.activityDetails}>
            <Text style={styles.activityText}>New appointment scheduled by John Doe</Text>
            <Text style={styles.activityTime}>10 minutes ago</Text>
          </View>
        </View>

        <View style={styles.activityRow}>
          <Text style={styles.bullet}>🔵</Text>
          <View style={styles.activityDetails}>
            <Text style={styles.activityText}>WhatsApp Store Order #1084 received</Text>
            <Text style={styles.activityTime}>1 hour ago</Text>
          </View>
        </View>

        <View style={styles.activityRow}>
          <Text style={styles.bullet}>🟣</Text>
          <View style={styles.activityDetails}>
            <Text style={styles.activityText}>Inquiry received: "Partnership opportunities"</Text>
            <Text style={styles.activityTime}>3 hours ago</Text>
          </View>
        </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  metricCard: {
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activityCard: {
    padding: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bullet: {
    fontSize: 12,
    marginRight: 12,
    marginTop: 2,
  },
  activityDetails: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
