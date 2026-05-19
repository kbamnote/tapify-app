import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Alert } from 'react-native';
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>WhatsApp Sales Orders</Text>

      {orders.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No orders found.</Text>
      ) : (
        orders.map((order) => (
          <GlassCard key={order.id} style={styles.card}>
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

            <TouchableOpacity style={styles.whatsappBtn} onPress={() => handleContact(order.customer_phone)}>
              <Text style={styles.whatsappBtnText}>💬 Chat on WhatsApp</Text>
            </TouchableOpacity>
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
  whatsappBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
