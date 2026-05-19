import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';

const INITIAL_APPOINTMENTS = [
  { id: 1, name: 'John Doe', service: 'Business Consultation', date: 'May 20, 2026', time: '10:00 AM', status: 'Pending' },
  { id: 2, name: 'Alice Smith', service: 'Card Customization Help', date: 'May 21, 2026', time: '02:30 PM', status: 'Approved' },
  { id: 3, name: 'Bob Johnson', service: 'SaaS Platform Demo', date: 'May 22, 2026', time: '11:15 AM', status: 'Approved' },
  { id: 4, name: 'Emma Watson', service: 'Enterprise Store Setup', date: 'May 23, 2026', time: '04:00 PM', status: 'Cancelled' },
];

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return COLORS.success;
      case 'Pending': return COLORS.accent;
      case 'Cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const approveAppointment = (id) => {
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: 'Approved' } : app));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Manage Bookings</Text>
      
      {appointments.map((item) => (
        <GlassCard key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.service}>{item.service}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTimeText}>📅 {item.date}</Text>
            <Text style={styles.dateTimeText}>🕒 {item.time}</Text>
          </View>

          {item.status === 'Pending' && (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.approveBtn} 
                onPress={() => approveAppointment(item.id)}
              >
                <Text style={styles.approveBtnText}>Approve Request</Text>
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>
      ))}
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
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  service: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(21, 62, 63, 0.1)',
    marginVertical: 14,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  actions: {
    marginTop: 14,
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
