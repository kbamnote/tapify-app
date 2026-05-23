import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Alert, Modal } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

export default function WhatsappOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/store-orders/list.php');
      if (response.success && response.data?.orders) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'pending':
      case 'new': 
        return COLORS.accent;
      case 'shipped':
      case 'processing': 
        return '#3b5998';
      case 'delivered': 
      case 'confirmed':
        return COLORS.success;
      case 'cancelled':
        return COLORS.error;
      default: 
        return COLORS.textMuted;
    }
  };

  const handleContact = (phone) => {
    if (phone) {
      Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
    }
  };

  const formatItems = (items) => {
    if (!items || !Array.isArray(items)) return 'No items details';
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
  };

  const capitalize = (str) => {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  const handleUpdateStatus = async (status) => {
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      const response = await fetchApi('/api/store-orders/update-status.php', {
        method: 'POST',
        body: JSON.stringify({ id: selectedOrder.id, status })
      });
      
      if (response.success) {
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status } : o));
        setSelectedOrder(prev => ({ ...prev, status }));
        Alert.alert('Success', `Order status updated to ${capitalize(status)}`);
      } else {
        Alert.alert('Error', response.message || 'Failed to update order status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
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
    <ScrollView style={{flex: 1}} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>WhatsApp Sales Orders</Text>

      {orders.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No orders found.</Text>
      ) : (
        orders.map((order) => (
          <TouchableOpacity key={order.id} onPress={() => setSelectedOrder(order)} activeOpacity={0.8}>
            <GlassCard style={styles.card}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <Text style={styles.customerName}>{order.customer_name}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(order.status) }]}>{capitalize(order.status)}</Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <Text style={styles.label}>Ordered Items:</Text>
                <Text style={styles.itemsValue}>{formatItems(order.items)}</Text>
                
                <View style={styles.metaRow}>
                  <View>
                    <Text style={styles.label}>Total Price:</Text>
                    <Text style={styles.priceValue}>₹{order.total_amount}</Text>
                  </View>
                  <View style={styles.rightAlign}>
                    <Text style={styles.label}>Order Date:</Text>
                    <Text style={styles.dateValue}>{order.created_at_formatted}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success, marginRight: 8 }]} onPress={() => handleContact(order.customer_phone)}>
                  <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => {
                  if (order.customer_phone) Linking.openURL(`tel:${order.customer_phone.replace(/\D/g, '')}`);
                }}>
                  <Text style={styles.actionBtnText}>📞 Call</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>

    <Modal visible={!!selectedOrder} animationType="slide" transparent={true} onRequestClose={() => setSelectedOrder(null)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedOrder && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order #{selectedOrder.id}</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionHeader}>Customer Details</Text>
              <View style={styles.modalInfoBox}>
                {Object.entries({
                  'Name': selectedOrder.customer_name,
                  'Phone': selectedOrder.customer_phone,
                  'Email': selectedOrder.customer_email || 'N/A',
                  'Address': selectedOrder.customer_address || selectedOrder.address || 'N/A',
                  'Notes/Message': selectedOrder.customer_message || selectedOrder.notes || 'None',
                  'Date': selectedOrder.created_at_formatted,
                  'Total': `₹${selectedOrder.total_amount}`
                }).map(([key, val]) => (
                  <View key={key} style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>{key}:</Text>
                    <Text style={styles.modalInfoValue}>{val}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionHeader}>Order Items</Text>
              <View style={styles.modalInfoBox}>
                {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item, idx) => (
                  <View key={idx} style={styles.modalItemRow}>
                    <Text style={styles.modalItemName}>{item.quantity}x {item.name}</Text>
                    <Text style={styles.modalItemPrice}>₹{item.price}</Text>
                  </View>
                )) : <Text style={styles.modalInfoValue}>No items found</Text>}
              </View>

              <Text style={styles.sectionHeader}>Update Status</Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map(status => {
                  const isActive = selectedOrder.status === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusOption, isActive && { backgroundColor: getStatusColor(status), borderColor: getStatusColor(status) }]}
                      onPress={() => handleUpdateStatus(status)}
                      disabled={updatingStatus}
                    >
                      <Text style={[styles.statusOptionText, isActive && { color: '#ffffff' }]}>{capitalize(status)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.actionButtons, { marginTop: 20 }]}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success, marginRight: 8 }]} onPress={() => handleContact(selectedOrder.customer_phone)}>
                  <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => {
                  if (selectedOrder.customer_phone) Linking.openURL(`tel:${selectedOrder.customer_phone.replace(/\D/g, '')}`);
                }}>
                  <Text style={styles.actionBtnText}>📞 Call</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsBox: {
    backgroundColor: 'rgba(21, 62, 63, 0.04)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemsValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceValue: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  dateValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 62, 63, 0.08)',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeBtn: {
    padding: 5,
  },
  closeBtnText: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 10,
    marginBottom: 10,
  },
  modalInfoBox: {
    backgroundColor: 'rgba(21, 62, 63, 0.04)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  modalInfoLabel: {
    width: 100,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalInfoValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 62, 63, 0.05)',
    paddingBottom: 8,
  },
  modalItemName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    paddingRight: 10,
  },
  modalItemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.1)',
    backgroundColor: '#ffffff',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});
