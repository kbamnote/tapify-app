import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking, ScrollView,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

/**
 * Website Inquiries — enquiries from the Contact section of the user's builder sites.
 * GET  /api/sites/inquiries.php                        -> { inquiries, counts }
 * POST /api/sites/inquiries.php {id, is_read}          -> mark read / unread
 * POST /api/sites/inquiries.php {id, action:'delete'}  -> delete
 */

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return String(s);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function WebsiteInquiriesScreen() {
  const [rows, setRows]          = useState([]);
  const [counts, setCounts]      = useState({ all: 0, unread: 0, today: 0 });
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [filter, setFilter]      = useState('');   // '' = all, 'unread'
  const [busyId, setBusyId]      = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/sites/inquiries.php');
      setRows(res.data?.inquiries || []);
      setCounts(res.data?.counts || { all: 0, unread: 0, today: 0 });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefresh(true); await load(); setRefresh(false); };

  const setRead = async (row, isRead) => {
    try {
      await fetchApi('/api/sites/inquiries.php', {
        method: 'POST',
        body: JSON.stringify({ id: row.id, is_read: isRead ? 1 : 0 }),
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_read: isRead } : r)));
      setCounts((c) => ({ ...c, unread: Math.max(0, c.unread + (isRead ? -1 : 1)) }));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const remove = (row) => {
    Alert.alert('Delete enquiry?', `Delete the enquiry from ${row.name || 'this customer'}? This cannot be undone.`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setBusyId(row.id);
          await fetchApi('/api/sites/inquiries.php', {
            method: 'POST',
            body: JSON.stringify({ id: row.id, action: 'delete' }),
          });
          setRows((prev) => prev.filter((r) => r.id !== row.id));
          setCounts((c) => ({
            all: Math.max(0, c.all - 1),
            unread: Math.max(0, c.unread - (row.is_read ? 0 : 1)),
            today: c.today,
          }));
        } catch (e) {
          Alert.alert('Error', e.message);
        } finally {
          setBusyId(null);
        }
      } },
    ]);
  };

  const call = (p) => p && Linking.openURL(`tel:${p}`);
  const whatsapp = (p) => p && Linking.openURL(`https://wa.me/${String(p).replace(/\D/g, '')}`);
  const email = (e) => e && Linking.openURL(`mailto:${e}`);

  const shown = filter === 'unread' ? rows.filter((r) => !r.is_read) : rows;

  const renderItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => { if (!item.is_read) setRead(item, true); }}>
      <GlassCard style={[styles.card, !item.is_read && styles.cardUnread]}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name || 'Unknown'}</Text>
            {!item.is_read && <View style={styles.newDot} />}
          </View>
          <Text style={styles.time}>{fmtDate(item.created_at)}</Text>
        </View>

        {item.subject ? <Text style={styles.subject}>{item.subject}</Text> : null}
        {item.message ? <Text style={styles.message}>{item.message}</Text> : null}

        <Text style={styles.site}>🌐 {item.site_name || item.site_slug}</Text>
        {item.phone ? <Text style={styles.meta}>📞 {item.phone}</Text> : null}
        {item.email ? <Text style={styles.metaMuted}>✉️ {item.email}</Text> : null}

        <View style={styles.actions}>
          {item.phone ? (
            <>
              <TouchableOpacity style={[styles.actBtn, styles.callBtn]} onPress={() => call(item.phone)}>
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actBtn, styles.waBtn]} onPress={() => whatsapp(item.phone)}>
                <Text style={styles.waText}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : item.email ? (
            <TouchableOpacity style={[styles.actBtn, styles.callBtn]} onPress={() => email(item.email)}>
              <Text style={styles.callText}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.subActions}>
          <TouchableOpacity onPress={() => setRead(item, !item.is_read)}>
            <Text style={styles.subActionText}>{item.is_read ? 'Mark unread' : 'Mark read'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busyId === item.id} onPress={() => remove(item)}>
            <Text style={[styles.subActionText, { color: COLORS.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  const tabs = [['', `All (${counts.all})`], ['unread', `Unread (${counts.unread})`]];

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(([val, label]) => {
            const active = filter === val;
            return (
              <TouchableOpacity key={val || 'all'} onPress={() => setFilter(val)} style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
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
          ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No enquiries yet</Text></View>}
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
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, marginLeft: 8 },
  time: { fontSize: 11.5, color: COLORS.textMuted },

  subject: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  message: { fontSize: 13.5, color: COLORS.text, marginTop: 4, lineHeight: 19 },

  site: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 8 },
  meta: { fontSize: 13.5, color: COLORS.text, marginTop: 4 },
  metaMuted: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actBtn: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  callBtn: { backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  callText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  waBtn: { backgroundColor: COLORS.success },
  waText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  subActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  subActionText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },

  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
