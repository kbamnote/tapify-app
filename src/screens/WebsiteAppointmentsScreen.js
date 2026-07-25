import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking, ScrollView,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

/**
 * Website Appointments — appointments booked on the user's builder sites.
 * GET  /api/sites/appointments.php              -> { appointments, counts, stats }
 * POST /api/sites/appointments.php {id,status}  -> update status
 */

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const STATUS_COLOR = {
  pending: COLORS.accent,
  confirmed: COLORS.primary,
  completed: COLORS.success,
  cancelled: COLORS.error,
  no_show: '#8a7327',
};
const LABEL = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No show' };

export default function WebsiteAppointmentsScreen() {
  const [rows, setRows]          = useState([]);
  const [counts, setCounts]      = useState({ all: 0 });
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [filter, setFilter]      = useState('');
  const [busyId, setBusyId]      = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/sites/appointments.php');
      setRows(res.data?.appointments || []);
      setCounts(res.data?.counts || { all: 0 });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefresh(true); await load(); setRefresh(false); };

  const setStatus = (row, status) => {
    if (row.status === status) return;
    if (status === 'cancelled' || status === 'no_show') {
      Alert.alert(`Mark ${LABEL[status]}?`, `Set ${row.customer_name || 'this'} appointment to ${LABEL[status]}?`, [
        { text: 'No' },
        { text: 'Yes', style: 'destructive', onPress: () => doSet(row, status) },
      ]);
      return;
    }
    doSet(row, status);
  };

  const doSet = async (row, status) => {
    try {
      setBusyId(row.id);
      await fetchApi('/api/sites/appointments.php', {
        method: 'POST',
        body: JSON.stringify({ id: row.id, status }),
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      setCounts((c) => {
        const n = { ...c };
        if (n[row.status] != null) n[row.status] = Math.max(0, n[row.status] - 1);
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

  const shown = filter ? rows.filter((r) => r.status === filter) : rows;

  const renderItem = ({ item }) => (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.customer_name || 'Customer'}</Text>
            {!item.is_read && <View style={styles.newDot} />}
          </View>
          {item.service_name ? <Text style={styles.service}>{item.service_name}</Text> : null}
        </View>
        <View style={[styles.statusTag, { backgroundColor: (STATUS_COLOR[item.status] || COLORS.textMuted) + '18' }]}>
          <Text style={[styles.statusTagText, { color: STATUS_COLOR[item.status] || COLORS.textMuted }]}>{LABEL[item.status] || item.status}</Text>
        </View>
      </View>

      <Text style={styles.when}>📅 {item.date_formatted || item.appointment_date}{item.day_name ? ` (${item.day_name})` : ''}{item.time_formatted ? ` · ${item.time_formatted}` : ''}</Text>
      <Text style={styles.site}>🌐 {item.site_name || item.site_slug}</Text>
      {item.customer_phone ? <Text style={styles.meta}>📞 {item.customer_phone}</Text> : null}
      {item.customer_email ? <Text style={styles.metaMuted}>✉️ {item.customer_email}</Text> : null}
      {item.customer_notes ? <Text style={styles.note}>“{item.customer_notes}”</Text> : null}

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
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{LABEL[s]}</Text>
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

  const tabs = [['', 'All'], ...STATUSES.map((s) => [s, LABEL[s]])];

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(([val, label]) => {
            const active = filter === val;
            const n = val === '' ? counts.all : counts[val];
            return (
              <TouchableOpacity key={val || 'all'} onPress={() => setFilter(val)} style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}{n != null ? ` (${n})` : ''}</Text>
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
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={renderItem}
          ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No appointments yet</Text></View>}
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
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, marginLeft: 8 },
  service: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusTagText: { fontSize: 11, fontWeight: '800' },

  when: { fontSize: 13.5, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  site: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 4 },
  meta: { fontSize: 13.5, color: COLORS.text, marginTop: 4 },
  metaMuted: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },
  note: { fontSize: 13, color: COLORS.text, fontStyle: 'italic', marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actBtn: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  callBtn: { backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  callText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  waBtn: { backgroundColor: COLORS.success },
  waText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
