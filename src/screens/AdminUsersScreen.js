import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

/**
 * Admin → Users
 * List/search all users, activate/deactivate, reset password.
 *   GET  /api/admin/users/list.php
 *   POST /api/admin/users/set-status.php      { user_id, status }
 *   POST /api/admin/users/reset-password.php  { user_id, new_password }
 */
export default function AdminUsersScreen() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [busy,     setBusy]     = useState(false);
  const [newPass,  setNewPass]  = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/admin/users/list.php');
      setUsers(res.data?.users || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.phone || '').toLowerCase().includes(q);
  });

  const isActive = (u) => Number(u?.status) === 1;

  const openUser = (u) => { setSelected(u); setNewPass(''); };

  const toggleStatus = async () => {
    if (!selected) return;
    const nextStatus = isActive(selected) ? 0 : 1;
    try {
      setBusy(true);
      await fetchApi('/api/admin/users/set-status.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: selected.id, status: nextStatus }),
      });
      const updated = { ...selected, status: nextStatus };
      setSelected(updated);
      setUsers(list => list.map(u => (u.id === updated.id ? updated : u)));
      Alert.alert('Done', `Account ${nextStatus ? 'activated' : 'deactivated'}.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!selected) return;
    if (newPass.trim().length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setBusy(true);
      const res = await fetchApi('/api/admin/users/reset-password.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: selected.id, new_password: newPass.trim() }),
      });
      Alert.alert('Password reset', res.message || 'Password updated.');
      setNewPass('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  // ---- Detail view ----
  if (selected) {
    const active = isActive(selected);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to users</Text>
        </TouchableOpacity>

        <GlassCard style={styles.card}>
          <View style={styles.detailHead}>
            <View style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{(selected.name || selected.email || '?').substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailName}>{selected.name || 'Unnamed'}</Text>
              <Text style={styles.detailEmail}>{selected.email}</Text>
            </View>
            <View style={[styles.statePill, active ? styles.statePillOn : styles.statePillOff]}>
              <Text style={[styles.statePillText, active ? styles.statePillTextOn : styles.statePillTextOff]}>
                {active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <Meta label="Role" value={selected.role || 'user'} />
            <Meta label="vCards" value={String(selected.vcards_count ?? 0)} />
            <Meta label="Phone" value={selected.phone || '—'} onPress={selected.phone ? () => Linking.openURL(`tel:${selected.phone}`) : null} />
            <Meta label="Joined" value={fmtDate(selected.created_at)} />
            <Meta label="Last login" value={fmtDate(selected.last_login)} />
          </View>
        </GlassCard>

        {/* Activate / Deactivate */}
        <GlassCard style={styles.card}>
          <Text style={styles.blockTitle}>Account status</Text>
          <Text style={styles.blockHint}>
            {active
              ? 'Deactivating blocks this user from logging in. Their public vCards/stores stay live.'
              : 'Activating restores login access for this user.'}
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, active ? styles.dangerBtn : styles.primaryBtn]}
            onPress={toggleStatus}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" />
              : <Text style={styles.actionBtnText}>{active ? 'Deactivate account' : 'Activate account'}</Text>}
          </TouchableOpacity>
        </GlassCard>

        {/* Reset password */}
        <GlassCard style={styles.card}>
          <Text style={styles.blockTitle}>Reset password</Text>
          <Text style={styles.blockHint}>Set a new password for this user (min 6 characters). They are not notified automatically.</Text>
          <TextInput
            style={styles.input}
            value={newPass}
            onChangeText={setNewPass}
            placeholder="New password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={resetPassword} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" />
              : <Text style={styles.actionBtnText}>Set new password</Text>}
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    );
  }

  // ---- List view ----
  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or phone..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {!loading && (
          <Text style={styles.countText}>{filtered.length} user{filtered.length === 1 ? '' : 's'}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = isActive(item);
            return (
              <TouchableOpacity activeOpacity={0.8} onPress={() => openUser(item)}>
                <GlassCard style={styles.userCard}>
                  <View style={styles.userRow}>
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{(item.name || item.email || '?').substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName2}>{item.name || 'Unnamed'}</Text>
                      <Text style={styles.userEmail2}>{item.email}</Text>
                    </View>
                    <View style={styles.rightCol}>
                      {item.role && item.role !== 'user' ? (
                        <View style={styles.roleTag}><Text style={styles.roleTagText}>{item.role}</Text></View>
                      ) : null}
                      <View style={[styles.dot, active ? styles.dotOn : styles.dotOff]} />
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No users found</Text></View>}
        />
      )}
    </View>
  );
}

function Meta({ label, value, onPress }) {
  const body = (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, onPress && { color: COLORS.primary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress} style={{ width: '48%' }}>{body}</TouchableOpacity> : body;
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date((v || '').replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 16, paddingBottom: 48 },
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

  backBtn:     { marginBottom: 14 },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },

  card: { padding: 18, marginBottom: 14 },

  detailHead: { flexDirection: 'row', alignItems: 'center' },
  avatarLg: {
    width: 54, height: 54, borderRadius: 27, marginRight: 12,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarLgText: { fontWeight: '800', color: COLORS.primary, fontSize: 18 },
  detailName:  { fontSize: 18, fontWeight: '800', color: COLORS.text },
  detailEmail: { fontSize: 13, color: COLORS.textMuted },

  statePill:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statePillOn:    { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: COLORS.success },
  statePillOff:   { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: COLORS.border },
  statePillText:  { fontSize: 11, fontWeight: '700' },
  statePillTextOn:{ color: '#16a34a' },
  statePillTextOff:{ color: COLORS.textMuted },

  metaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    marginTop: 16, rowGap: 12,
  },
  metaItem:  { width: '48%' },
  metaLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  metaValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  blockTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  blockHint:  { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 18, marginBottom: 14 },

  input: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(21,62,63,0.15)',
    borderRadius: 8, paddingHorizontal: 16, marginBottom: 12,
    color: COLORS.text, fontSize: 15,
  },
  actionBtn:   { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryBtn:  { backgroundColor: COLORS.primary },
  dangerBtn:   { backgroundColor: COLORS.error },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  userCard: { padding: 14, marginBottom: 10 },
  userRow:  { flexDirection: 'row', alignItems: 'center' },
  avatarFallback: {
    width: 46, height: 46, borderRadius: 23, marginRight: 12,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontWeight: '700', color: COLORS.primary, fontSize: 15 },
  userInfo:   { flex: 1 },
  userName2:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  userEmail2: { fontSize: 12, color: COLORS.textMuted },
  rightCol:   { alignItems: 'flex-end', gap: 6 },
  roleTag:    { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleTagText:{ fontSize: 10, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  dotOn:      { backgroundColor: COLORS.success },
  dotOff:     { backgroundColor: '#cbd5e1' },
  emptyText:  { color: COLORS.textMuted, fontSize: 14 },
});
