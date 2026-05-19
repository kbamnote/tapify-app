import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';

const MOCK_ORDERS = [
  { id: '#TAP-1024', customer: 'Rohan Sharma', phone: '9876543210', items: '1x Premium NFC Wood Card, 2x Epoxy Keychains', total: '₹2,499', date: 'May 18, 2026', status: 'New' },
  { id: '#TAP-1023', customer: 'Priya Patel', phone: '9112233445', items: '5x Metal Card Custom Engraving', total: '₹5,200', date: 'May 17, 2026', status: 'Delivered' },
  { id: '#TAP-1022', customer: 'Amit Kumar', phone: '8888877777', items: '1x Tapify Smart Band V2', total: '₹1,299', date: 'May 15, 2026', status: 'Shipped' },
];

export default function WhatsappOrdersScreen() {
  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return COLORS.accent;
      case 'Shipped': return '#3b5998';
      case 'Delivered': return COLORS.success;
      default: return COLORS.textMuted;
    }
  };

  const handleContact = (phone) => {
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>WhatsApp Sales Orders</Text>

      {MOCK_ORDERS.map((order) => (
        <GlassCard key={order.id} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.customerName}>{order.customer}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
            </View>
          </View>

          <View style={styles.detailsBox}>
            <Text style={styles.label}>Ordered Items:</Text>
            <Text style={styles.itemsValue}>{order.items}</Text>
            
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.label}>Total Price:</Text>
                <Text style={styles.priceValue}>{order.total}</Text>
              </View>
              <View style={styles.rightAlign}>
                <Text style={styles.label}>Order Date:</Text>
                <Text style={styles.dateValue}>{order.date}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.whatsappBtn} onPress={() => handleContact(order.phone)}>
            <Text style={styles.whatsappBtnText}>💬 Chat on WhatsApp</Text>
          </TouchableOpacity>
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
