import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking, ScrollView, Modal,
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

  // ---- reschedule ----
  const [reschedFor, setReschedFor] = useState(null);   // the appointment being moved
  const [rDate, setRDate] = useState('');
  const [rTime, setRTime] = useState('');
  const [rBusy, setRBusy] = useState(false);

  const openReschedule = (row) => {
    setReschedFor(row);
    setRDate(row.appointment_date || '');
    setRTime(row.time_formatted || '');
  };
  const doReschedule = async () => {
    if (!reschedFor) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rDate.trim())) { Alert.alert('Date', 'Enter the date as YYYY-MM-DD.'); return; }
    if (!rTime.trim()) { Alert.alert('Time', 'Enter a time (e.g. 10:30 AM).'); return; }
    try {
      setRBusy(true);
      const res = await fetchApi('/api/sites/appointments.php', {
        method: 'POST',
        body: JSON.stringify({ id: reschedFor.id, action: 'reschedule', date: rDate.trim(), time: rTime.trim() }),
      });
      const nd = res.data || {};
      setRows((prev) => prev.map((r) => (r.id === reschedFor.id
        ? { ...r, appointment_date: nd.appointment_date || rDate.trim(), status: 'confirmed', date_formatted: nd.appointment_date || rDate.trim(), time_formatted: rTime.trim() }
        : r)));
      setReschedFor(null);
      Alert.alert('Rescheduled', 'The appointment has been moved.');
    } catch (e) {
      Alert.alert('Could not reschedule', e.message);
    } finally {
      setRBusy(false);
    }
  };

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

      <TouchableOpacity style={styles.reschedBtn} onPress={() => openReschedule(item)}>
        <Text style={styles.reschedText}>🗓  Reschedule</Text>
      </TouchableOpacity>

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

      {/* Reschedule modal */}
      <Modal visible={!!reschedFor} transparent animationType="fade" onRequestClose={() => setReschedFor(null)}>
        <View style={styles.mBackdrop}>
          <View style={styles.mCard}>
            <Text style={styles.mTitle}>Reschedule appointment</Text>
            {reschedFor ? <Text style={styles.mSub}>{reschedFor.customer_name || 'Customer'}</Text> : null}
            <Text style={styles.mLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.mInput} value={rDate} onChangeText={setRDate}
              placeholder="2026-08-01" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
            <Text style={styles.mLabel}>Time</Text>
            <TextInput style={styles.mInput} value={rTime} onChangeText={setRTime}
              placeholder="10:30 AM" placeholderTextColor={COLORS.textMuted} />
            <View style={styles.mBtns}>
              <TouchableOpacity style={[styles.mBtn, styles.mCancel]} onPress={() => setReschedFor(null)} disabled={rBusy}>
                <Text style={styles.mCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mBtn, styles.mSave]} onPress={doReschedule} disabled={rBusy}>
                {rBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.mSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  reschedBtn: { marginTop: 12, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(21,62,63,0.04)' },
  reschedText: { fontSize: 13.5, fontWeight: '700', color: COLORS.primary },

  mBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  mCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  mTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  mSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  mLabel: { fontSize: 12.5, fontWeight: '700', color: COLORS.text, marginTop: 14, marginBottom: 6 },
  mInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  mBtns: { flexDirection: 'row', gap: 12, marginTop: 18 },
  mBtn: { flex: 1, height: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  mCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  mSave: { backgroundColor: COLORS.primary },
  mSaveText: { fontSize: 14, fontWeight: '800', color: '#fff' },

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
