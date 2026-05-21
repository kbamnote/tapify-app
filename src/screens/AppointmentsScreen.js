import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, FlatList } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

const dayNames = {1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT', 0: 'SUN'};
const order = [1, 2, 3, 4, 5, 6, 0];

const generateTimeSlots = () => {
  const slots = [];
  ['AM', 'PM'].forEach(meridiem => {
    slots.push(`12:00 ${meridiem}`);
    slots.push(`12:30 ${meridiem}`);
    for (let h = 1; h <= 11; h++) {
      let hh = h.toString().padStart(2, '0');
      slots.push(`${hh}:00 ${meridiem}`);
      slots.push(`${hh}:30 ${meridiem}`);
    }
  });
  return slots;
};
const TIME_OPTIONS = generateTimeSlots();

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Availability state (Weekly Schedule)
  const [showAvailability, setShowAvailability] = useState(false);
  const [vcardId, setVcardId] = useState(null);
  const [weeklyData, setWeeklyData] = useState({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: [] });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlots, setSavingSlots] = useState(false);
  
  // Time Picker State
  const [pickerConfig, setPickerConfig] = useState(null); // { day, idx, field }

  useEffect(() => {
    loadAppointments();
    loadMyVcard();
  }, []);

  const loadMyVcard = async () => {
    try {
      const me = await fetchApi('/api/me.php');
      if (me.data?.vcard?.id) setVcardId(me.data.vcard.id);
    } catch (error) {}
  };

  const loadSlots = async () => {
    if (!vcardId) return;
    try {
      setLoadingSlots(true);
      const res = await fetchApi(`/api/appointments/slots_manage.php?vcard_id=${vcardId}`);
      if (res.success && res.data) {
        let newWeeklyData = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: [] };
        
        const formatTo12h = (timeStr) => {
          const [h, m] = timeStr.split(':');
          const hours = parseInt(h, 10);
          const suffix = hours >= 12 ? 'PM' : 'AM';
          const hours12 = ((hours + 11) % 12 + 1).toString().padStart(2, '0');
          return `${hours12}:${m} ${suffix}`;
        };

        res.data.forEach(row => {
          newWeeklyData[row.day_of_week].push({ start: formatTo12h(row.start_time), end: formatTo12h(row.end_time) });
        });
        setWeeklyData(newWeeklyData);
      }
    } catch (error) {
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleOpenAvailability = () => {
    if (!vcardId) {
      Alert.alert('Error', 'No vCard found for your account.');
      return;
    }
    setShowAvailability(true);
    loadSlots();
  };

  const saveSchedule = async () => {
    let flatSchedule = [];
    Object.keys(weeklyData).forEach(day => {
        weeklyData[day].forEach(slot => {
            if (slot.start && slot.end) {
                flatSchedule.push({ day: parseInt(day), start: slot.start, end: slot.end });
            }
        });
    });

    try {
      setSavingSlots(true);
      const res = await fetchApi('/api/appointments/slots_manage.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'save_week', vcard_id: vcardId, schedule: flatSchedule })
      });
      if (res.success) {
        Alert.alert('Success', 'Weekly schedule saved!');
        setShowAvailability(false);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setSavingSlots(false);
    }
  };

  const toggleDay = (day, isChecked) => {
    setWeeklyData(prev => {
      let newData = { ...prev };
      if (isChecked && newData[day].length === 0) {
        newData[day] = [{ start: '09:00 AM', end: '05:00 PM' }];
      } else if (!isChecked) {
        newData[day] = [];
      }
      return newData;
    });
  };

  const updateSlot = (day, index, field, val) => {
    setWeeklyData(prev => {
      const newDayArray = [...prev[day]];
      newDayArray[index] = { ...newDayArray[index], [field]: val };
      return { ...prev, [day]: newDayArray };
    });
  };

  const addDaySlot = (day) => {
    setWeeklyData(prev => {
      return { ...prev, [day]: [...prev[day], { start: '09:00 AM', end: '05:00 PM' }] };
    });
  };

  const deleteDaySlot = (day, index) => {
    setWeeklyData(prev => {
      const newDayArray = [...prev[day]];
      newDayArray.splice(index, 1);
      return { ...prev, [day]: newDayArray };
    });
  };



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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Manage Bookings</Text>
          <TouchableOpacity style={styles.manageBtn} onPress={handleOpenAvailability}>
            <Text style={styles.manageBtnText}>Availability ⏰</Text>
          </TouchableOpacity>
        </View>
      
      {appointments.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No appointments found.</Text>
      ) : (
        appointments.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.clientName} numberOfLines={2}>{item.customer_name}</Text>
                <Text style={styles.service} numberOfLines={1}>{item.service_name || 'No specific service'}</Text>
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

    <Modal visible={showAvailability} animationType="fade" transparent={true} onRequestClose={() => setShowAvailability(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Weekly Schedule</Text>
            <TouchableOpacity onPress={() => setShowAvailability(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingSlots ? <ActivityIndicator color={COLORS.primary} style={{marginVertical: 20}} /> : (
            <ScrollView style={styles.slotsList} contentContainerStyle={{paddingBottom: 20}} keyboardShouldPersistTaps="always">
              {order.map(day => {
                const slots = weeklyData[day] || [];
                const isChecked = slots.length > 0;
                return (
                  <View key={day} style={{ borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 15, flexDirection: 'row' }}>
                    <View style={{ width: 80, flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity 
                        onPress={() => toggleDay(day, !isChecked)}
                        style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: isChecked ? COLORS.primary : '#ccc', backgroundColor: isChecked ? COLORS.primary : 'transparent', marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
                      >
                        {isChecked && <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>✓</Text>}
                      </TouchableOpacity>
                      <Text style={{ fontWeight: '600', color: COLORS.text, fontSize: 13 }}>{dayNames[day]}</Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      {slots.length === 0 ? (
                        <Text style={{ color: COLORS.textMuted, fontStyle: 'italic', fontSize: 13, marginTop: 2 }}>Unavailable</Text>
                      ) : (
                        slots.map((s, idx) => (
                          <View key={`slot-${day}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <TouchableOpacity 
                              style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, alignItems: 'center' }}
                              onPress={() => setPickerConfig({ day, idx, field: 'start' })}
                            >
                              <Text style={{ fontSize: 13, color: COLORS.text }}>{s.start || '09:00 AM'}</Text>
                            </TouchableOpacity>
                            
                            <Text style={{ marginHorizontal: 8, color: COLORS.textMuted, fontSize: 12 }}>To</Text>
                            
                            <TouchableOpacity 
                              style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, alignItems: 'center' }}
                              onPress={() => setPickerConfig({ day, idx, field: 'end' })}
                            >
                              <Text style={{ fontSize: 13, color: COLORS.text }}>{s.end || '05:00 PM'}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity onPress={() => deleteDaySlot(day, idx)} style={{ padding: 5, marginLeft: 5 }}>
                              <Text style={{ color: COLORS.error, fontSize: 16 }}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                    
                    <View style={{ width: 40, alignItems: 'flex-end' }}>
                      <TouchableOpacity onPress={() => addDaySlot(day)} style={{ padding: 5 }}>
                        <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={[styles.addBtn, { marginTop: 15 }]} onPress={saveSchedule} disabled={savingSlots}>
            <Text style={styles.addBtnText}>{savingSlots ? 'Saving...' : 'Save Schedule'}</Text>
          </TouchableOpacity>
        </View>

        {/* Time Picker Overlay */}
        {!!pickerConfig && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }]}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
              <View style={[styles.modalHeader, { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 0 }]}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setPickerConfig(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList 
                data={TIME_OPTIONS}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', alignItems: 'center' }}
                    onPress={() => {
                      updateSlot(pickerConfig.day, pickerConfig.idx, pickerConfig.field, item);
                      setPickerConfig(null);
                    }}
                  >
                    <Text style={{ fontSize: 16, color: COLORS.text }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        )}

      </View>
    </Modal>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manageBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  addSlotForm: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  slotsList: {
    maxHeight: 250,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  slotText: {
    color: COLORS.text,
    fontWeight: '500',
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
