import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

/**
 * Admin → Leads
 * Website leads captured from the marketing site.
 * GET /api/admin/leads/list.php?search=&page=
 */
export default function AdminLeadsScreen() {
  const [leads,     setLeads]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [search,    setSearch]    = useState('');
  const [total,     setTotal]     = useState(0);
  const [unread,    setUnread]    = useState(0);
  const searchTimer = useRef(null);

  useEffect(() => { load(''); }, []);

  const load = async (q) => {
    try {
      setLoading(true);
      const res = await fetchApi(`/api/admin/leads/list.php?search=${encodeURIComponent(q)}`);
      setLeads(res.data?.leads || []);
      setTotal(res.data?.total ?? 0);
      setUnread(res.data?.unread ?? 0);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(search);
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(text), 400);
  };

  const call = (phone) => phone && Linking.openURL(`tel:${phone}`);
  const whatsapp = (phone) => {
    if (!phone) return;
    const digits = String(phone).replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${digits}`);
  };

  const renderItem = ({ item }) => (
    <GlassCard style={styles.leadCard}>
      <View style={styles.leadTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.leadName}>{item.name || 'Unknown'}</Text>
            {!item.is_read && <View style={styles.newDot} />}
          </View>
          {item.city ? <Text style={styles.leadCity}>📍 {item.city}</Text> : null}
        </View>
        {item.source ? <View style={styles.sourceTag}><Text style={styles.sourceTagText}>{item.source}</Text></View> : null}
      </View>

      {item.email ? <Text style={styles.leadMeta}>✉️ {item.email}</Text> : null}
      <Text style={styles.leadMeta}>📞 {item.phone || '—'}</Text>
      <Text style={styles.leadTime}>{item.created_at_formatted || ''}</Text>

      <View style={styles.leadActions}>
        <TouchableOpacity style={[styles.leadBtn, styles.callBtn]} onPress={() => call(item.phone)}>
          <Text style={styles.leadBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.leadBtn, styles.waBtn]} onPress={() => whatsapp(item.phone)}>
          <Text style={[styles.leadBtnText, { color: '#fff' }]}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
        {!loading && (
          <Text style={styles.countText}>{total} lead{total === 1 ? '' : 's'} · {unread} unread</Text>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={l => String(l.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={renderItem}
          ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No leads yet</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  listContent: { padding: 16, paddingBottom: 40 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  countText:   { fontSize: 12, color: COLORS.textMuted, marginTop: 8, marginLeft: 4 },

  leadCard: { padding: 16, marginBottom: 12 },
  leadTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  nameRow:  { flexDirection: 'row', alignItems: 'center' },
  leadName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  newDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, marginLeft: 8 },
  leadCity: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  sourceTag:{ backgroundColor: COLORS.primary + '15', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  sourceTagText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },

  leadMeta: { fontSize: 13.5, color: COLORS.text, marginTop: 2 },
  leadTime: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 },

  leadActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  leadBtn:  { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  callBtn:  { backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  waBtn:    { backgroundColor: COLORS.success },
  leadBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
