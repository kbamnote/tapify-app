import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/appointments/list.php');
      if (response.success && response.data?.appointments) {
        setAppointments(response.data.appointments);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'confirmed':
      case 'completed': 
        return COLORS.success;
      case 'pending': 
        return COLORS.accent;
      case 'cancelled':
      case 'no_show': 
        return COLORS.error;
      default: 
        return COLORS.textMuted;
    }
  };

  const approveAppointment = async (id) => {
    try {
      const response = await fetchApi('/api/appointments/update-status.php', {
        method: 'POST',
        body: JSON.stringify({ id, status: 'confirmed' })
      });
      if (response.success) {
        setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: 'confirmed' } : app));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Manage Bookings</Text>
      
      {appointments.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No appointments found.</Text>
      ) : (
        appointments.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.clientName}>{item.customer_name}</Text>
                <Text style={styles.service}>{item.service_name || 'No specific service'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status ? item.status.toUpperCase() : 'UNKNOWN'}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeText}>📅 {item.date_formatted}</Text>
              <Text style={styles.dateTimeText}>🕒 {item.time_formatted}</Text>
            </View>

            {item.status?.toLowerCase() === 'pending' && (
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
        ))
      )}
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
