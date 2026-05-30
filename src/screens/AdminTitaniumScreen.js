import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Image,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

export default function AdminTitaniumScreen() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null); // user being edited
  const [cardName,     setCardName]     = useState('');
  const [cardNumber,   setCardNumber]   = useState('');
  const [expiryDate,   setExpiryDate]   = useState('');
  const [isActive,     setIsActive]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const searchTimer    = useRef(null);

  useEffect(() => { loadUsers(''); }, []);

  const loadUsers = async (q) => {
    try {
      setLoading(true);
      const res = await fetchApi(`/api/admin/titanium/list.php?search=${encodeURIComponent(q)}`);
      setUsers(res.data?.users || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadUsers(text), 400);
  };

  const openEdit = (user) => {
    setSelected(user);
    setCardName(user.card_holder_name   || '');
    setCardNumber(user.card_number      || '');
    setExpiryDate(user.expiry_date      || '');
    setIsActive(user.titanium_active !== false);
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await fetchApi('/api/admin/titanium/save.php', {
        method: 'POST',
        body: JSON.stringify({
          user_id:          selected.id,
          card_holder_name: cardName,
          card_number:      cardNumber,
          expiry_date:      expiryDate,
          is_active:        isActive,
        }),
      });
      Alert.alert('Saved!', `Titanium membership ${isActive ? 'enabled' : 'disabled'} for ${selected.name}.`);
      setSelected(null);
      loadUsers(search);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Format: 6 digits · 4 digits · 7 digits  e.g. "290815 2026 2000000"
  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 17);
    const p1 = digits.slice(0, 6);
    const p2 = digits.slice(6, 10);
    const p3 = digits.slice(10, 17);
    return [p1, p2, p3].filter(Boolean).join(' ');
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  if (selected) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <GlassCard style={styles.card}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Titanium Card for</Text>
          <Text style={styles.userName}>{selected.name}</Text>
          <Text style={styles.userEmail}>{selected.email}</Text>

          {/* Status Toggle */}
          <TouchableOpacity
            style={[styles.statusToggle, isActive && styles.statusToggleActive]}
            onPress={() => setIsActive(v => !v)}
          >
            <Text style={[styles.statusToggleText, isActive && styles.statusToggleTextActive]}>
              {isActive ? '✦ Titanium Member — ACTIVE' : '✦ Titanium Member — INACTIVE'}
            </Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Card Holder Name</Text>
            <TextInput
              style={styles.input}
              value={cardName}
              onChangeText={setCardName}
              placeholder="e.g. RAHUL SHARMA"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Card Number</Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={t => setCardNumber(formatCardNumber(t))}
              placeholder="000000 0000 0000000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={19}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={t => setExpiryDate(formatExpiry(t))}
              placeholder="MM/YY"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Titanium Card</Text>
            }
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} activeOpacity={0.8}>
              <GlassCard style={styles.userCard}>
                <View style={styles.userRow}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {item.name?.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName2}>{item.name}</Text>
                    <Text style={styles.userEmail2}>{item.email}</Text>
                  </View>
                  {item.is_titanium ? (
                    <View style={[styles.badge, item.titanium_active ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={styles.badgeText}>
                        {item.titanium_active ? '✦ Active' : '✦ Inactive'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgeNone}>
                      <Text style={styles.badgeNoneText}>+ Add</Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 20, paddingBottom: 40 },
  card:      { padding: 24 },
  listContent: { padding: 16, paddingBottom: 40 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  backBtn:     { marginBottom: 20 },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  heading:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  userName:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  userEmail:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },

  statusToggle: {
    padding: 14, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center',
  },
  statusToggleActive: {
    backgroundColor: 'rgba(193,160,70,0.12)',
    borderColor: '#c1a046',
  },
  statusToggleText:       { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  statusToggleTextActive: { color: '#c1a046' },

  inputGroup: { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  input: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(21,62,63,0.15)',
    borderRadius: 8, paddingHorizontal: 16,
    color: COLORS.text, fontSize: 15,
  },
  saveBtn: {
    height: 50, backgroundColor: '#c1a046',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // User list
  userCard: { padding: 14, marginBottom: 10 },
  userRow:  { flexDirection: 'row', alignItems: 'center' },
  avatar:   { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
  avatarFallback: {
    width: 46, height: 46, borderRadius: 23, marginRight: 12,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontWeight: '700', color: COLORS.primary, fontSize: 15 },
  userInfo:   { flex: 1 },
  userName2:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  userEmail2: { fontSize: 12, color: COLORS.textMuted },
  badge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  badgeActive:   { backgroundColor: 'rgba(193,160,70,0.12)', borderColor: '#c1a046' },
  badgeInactive: { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: COLORS.border },
  badgeText:     { fontSize: 11, fontWeight: '700', color: '#c1a046' },
  badgeNone: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '10',
  },
  badgeNoneText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  emptyText:     { color: COLORS.textMuted, fontSize: 14 },
});
