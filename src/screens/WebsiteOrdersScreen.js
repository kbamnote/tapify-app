import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking, ScrollView,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

/**
 * Website Orders — orders placed on the user's website-builder sites.
 * GET  /api/sites/orders.php            -> { orders, counts }
 * POST /api/sites/orders.php {id,status} -> update status (also WhatsApps the customer)
 */

const STATUSES = ['new', 'confirmed', 'completed', 'cancelled'];
const STATUS_COLOR = {
  new: COLORS.accent,
  confirmed: COLORS.primary,
  completed: COLORS.success,
  cancelled: COLORS.error,
};

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return String(s);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function WebsiteOrdersScreen() {
  const [orders, setOrders]       = useState([]);
  const [counts, setCounts]       = useState({ all: 0 });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [filter, setFilter]       = useState('');   // '' = all
  const [busyId, setBusyId]       = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/sites/orders.php');
      setOrders(res.data?.orders || []);
      setCounts(res.data?.counts || { all: 0 });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefresh(true); await load(); setRefresh(false); };

  const setStatus = async (order, status) => {
    if (order.status === status) return;
    if (status === 'cancelled') {
      Alert.alert('Cancel order?', `Mark order #${order.id} as cancelled? The customer will be notified.`, [
        { text: 'No' },
        { text: 'Yes, cancel', style: 'destructive', onPress: () => doSet(order, status) },
      ]);
      return;
    }
    doSet(order, status);
  };

  const doSet = async (order, status) => {
    try {
      setBusyId(order.id);
      await fetchApi('/api/sites/orders.php', {
        method: 'POST',
        body: JSON.stringify({ id: order.id, status }),
      });
      // Optimistic local update + refresh counts.
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      setCounts((c) => {
        const n = { ...c };
        if (n[order.status] != null) n[order.status] = Math.max(0, n[order.status] - 1);
        if (n[status] != null) n[status] += 1;
        return n;
      });
    } catch (e) {
      Alert.alert('Could not update', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const call = (p) => p && Linking.openURL(`tel:${p}`);
  const whatsapp = (p) => p && Linking.openURL(`https://wa.me/${String(p).replace(/\D/g, '')}`);

  const shown = filter ? orders.filter((o) => o.status === filter) : orders;

  const renderItem = ({ item }) => (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{item.item_title || 'Order'}</Text>
        <Text style={styles.idBadge}>#{item.id}</Text>
      </View>

      <View style={styles.metaRow}>
        {item.price ? <Text style={styles.price}>{item.price}</Text> : null}
        {item.quantity > 1 ? <Text style={styles.qty}>× {item.quantity}</Text> : null}
        {item.option_value ? <Text style={styles.opt}>{item.option_label || 'Option'}: {item.option_value}</Text> : null}
      </View>

      <Text style={styles.site}>🌐 {item.site_name || item.site_slug}</Text>
      <Text style={styles.cust}>{item.customer_name || 'Customer'}{item.customer_phone ? ` · ${item.customer_phone}` : ''}</Text>
      {item.customer_email ? <Text style={styles.custMuted}>{item.customer_email}</Text> : null}
      {item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}
      <Text style={styles.time}>{fmtDate(item.created_at)}</Text>

      {/* Status chips */}
      <View style={styles.chipRow}>
        {STATUSES.map((s) => {
          const active = item.status === s;
          return (
            <TouchableOpacity
              key={s}
              disabled={busyId === item.id}
              onPress={() => setStatus(item, s)}
              style={[styles.chip, active && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] }]}
            >
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {item.customer_phone ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actBtn, styles.callBtn]} onPress={() => call(item.customer_phone)}>
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, styles.waBtn]} onPress={() => whatsapp(item.customer_phone)}>
            <Text style={styles.waText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </GlassCard>
  );

  const tabs = [['', 'All'], ...STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)])];

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(([val, label]) => {
            const active = filter === val;
            const n = val === '' ? counts.all : counts[val];
            return (
              <TouchableOpacity key={val || 'all'} onPress={() => setFilter(val)} style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {label}{n != null ? ` (${n})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={renderItem}
          ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No orders yet</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  listContent: { padding: 16, paddingBottom: 40 },

  tabsWrap: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabs: { paddingHorizontal: 12, gap: 8 },
  tab: { paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff' },

  card: { padding: 16, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  idBadge: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginLeft: 8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  qty:   { fontSize: 13, color: COLORS.textMuted },
  opt:   { fontSize: 12, color: COLORS.textMuted },

  site: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 8 },
  cust: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  custMuted: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },
  note: { fontSize: 13, color: COLORS.text, fontStyle: 'italic', marginTop: 6 },
  time: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted, textTransform: 'capitalize' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actBtn: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  callBtn: { backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  callText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  waBtn: { backgroundColor: COLORS.success },
  waText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
