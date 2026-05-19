import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

export default function WhatsappStoresScreen() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStore, setEditingStore] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Store fields for editing
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/stores/list.php');
      if (response.success && response.data?.stores) {
        setStores(response.data.stores);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async (id, currentStatus) => {
    try {
      // Optimistic update
      setStores(prev => prev.map(s => s.id === id ? { ...s, status: !currentStatus } : s));
      
      const response = await fetchApi('/api/stores/toggle-status.php', {
        method: 'POST',
        body: JSON.stringify({ id, status: !currentStatus })
      });
      
      if (!response.success) {
        // Revert on failure
        setStores(prev => prev.map(s => s.id === id ? { ...s, status: currentStatus } : s));
        Alert.alert('Error', 'Failed to toggle status');
      }
    } catch (error) {
      setStores(prev => prev.map(s => s.id === id ? { ...s, status: currentStatus } : s));
    }
  };

  const startEditing = (store) => {
    setEditingStore(store);
    setEditName(store.store_name);
    setEditPhone(store.whatsapp_number);
  };

  const saveEdit = async () => {
    try {
      setSaving(true);
      const response = await fetchApi('/api/stores/update.php', {
        method: 'POST',
        body: JSON.stringify({ 
          id: editingStore.id, 
          store_name: editName, 
          whatsapp_number: editPhone 
        })
      });
      
      if (response.success) {
        setStores(prev => prev.map(s => s.id === editingStore.id ? { ...s, store_name: editName, whatsapp_number: editPhone } : s));
        setEditingStore(null);
      } else {
        Alert.alert('Error', response.message || 'Failed to update store');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update store');
    } finally {
      setSaving(false);
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
      <Text style={styles.sectionTitle}>Assigned WhatsApp Stores</Text>
      <Text style={styles.subtitle}>You can modify existing configurations for your assigned stores.</Text>

      {editingStore ? (
        <GlassCard style={styles.card}>
          <Text style={styles.editTitle}>Edit Store Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Store Name</Text>
            <TextInput 
              style={styles.input} 
              value={editName} 
              onChangeText={setEditName} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Business Phone</Text>
            <TextInput 
              style={styles.input} 
              value={editPhone} 
              onChangeText={setEditPhone}
              keyboardType="phone-pad" 
            />
          </View>

          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingStore(null)} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      ) : (
        stores.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No stores found.</Text>
        ) : (
          stores.map((store) => (
            <GlassCard key={store.id} style={styles.card}>
              <View style={styles.header}>
                <View style={styles.storeMain}>
                  <Text style={styles.storeName}>{store.store_name}</Text>
                  <Text style={styles.storeAlias}>tapify.co/{store.url_alias}</Text>
                </View>
                <Switch 
                  value={store.status} 
                  onValueChange={() => toggleStoreStatus(store.id, store.status)}
                  trackColor={{ false: '#767577', true: COLORS.success }}
                  thumbColor={store.status ? COLORS.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Total Views</Text>
                  <Text style={styles.statValue}>👁️ {store.view_count}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Orders</Text>
                  <Text style={styles.statValue}>📦 {store.order_count}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>WhatsApp Phone</Text>
                  <Text style={styles.statValue}>📞 {store.whatsapp_number}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.editBtn} onPress={() => startEditing(store)}>
                <Text style={styles.editBtnText}>Edit Configuration</Text>
              </TouchableOpacity>
            </GlassCard>
          ))
        )
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeMain: {
    flex: 1,
    paddingRight: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  storeAlias: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(21, 62, 63, 0.04)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
