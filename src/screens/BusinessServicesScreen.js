import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { getServices, setServices } from '../services/googleBusinessApi';

/**
 * The service list on the Google listing.
 *
 * Google has no per-service endpoint — a save replaces the whole list. The
 * screen therefore holds the entire list in state and sends all of it, and
 * removing a row here really does delete it from the listing on save.
 */
export default function BusinessServicesScreen() {
  const { navigate } = useNavigation();

  const [data, setData] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await getServices();
      setData(d);
      setList(d.services || []);
      setDirty(false);
    } catch (e) {
      setError(e?.message || 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const edit = (i, patch) => {
    setList((p) => p.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const remove = (i) => {
    setList((p) => p.filter((_, j) => j !== i));
    setDirty(true);
  };

  const addFree = () => {
    const name = newName.trim();
    if (!name) return;
    setList((p) => [...p, { type: 'free', name, description: '', price: null }]);
    setNewName('');
    setDirty(true);
  };

  const addSuggested = (s) => {
    if (list.some((x) => x.service_type_id === s.service_type_id)) return;
    setList((p) => [...p, {
      type: 'structured', service_type_id: s.service_type_id, name: s.name, description: '', price: null,
    }]);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = list.map((s) => ({
        name: s.name,
        service_type_id: s.service_type_id || '',
        description: s.description || '',
        price: s.price === '' || s.price === null || s.price === undefined ? null : Number(s.price),
      }));
      const d = await setServices(payload);
      setData(d);
      setList(d.services || []);
      setDirty(false);
      Alert.alert('Saved', 'Your services are updated on Google.');
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>🛠</Text>
        <Text style={styles.errTitle}>Could not load services</Text>
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.errBtn} onPress={load}>
          <Text style={styles.errBtnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate('google-business')}>
          <Text style={styles.errLink}>Check your Google connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unused = (data?.suggested || []).filter(
    (s) => !list.some((x) => x.service_type_id === s.service_type_id)
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: dirty ? 100 : 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backRow} onPress={() => navigate('google-business')}>
          <Text style={styles.backText}>← Google Business Profile</Text>
        </TouchableOpacity>

        <Text style={styles.intro}>
          Google matches searches against this list, so each service you add is another search
          you can turn up in — "root canal near me" rather than only "dentist".
          {data?.category ? ` Suggestions below come from your category, ${data.category}.` : ''}
        </Text>

        {/* Current list */}
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.bigIcon}>🛠</Text>
            <Text style={styles.errText}>No services listed yet. Add your first one below.</Text>
          </View>
        ) : list.map((s, i) => (
          <View key={`${s.service_type_id || s.name}-${i}`} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardName}>{s.name || s.service_type_id}</Text>
              <TouchableOpacity onPress={() => remove(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
            {s.type === 'structured' && <Text style={styles.badge}>Suggested by Google</Text>}

            <TextInput
              style={styles.input}
              value={s.description || ''}
              onChangeText={(v) => edit(i, { description: v })}
              placeholder="What it involves (optional)"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>₹</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={s.price === null || s.price === undefined ? '' : String(s.price)}
                onChangeText={(v) => edit(i, { price: v.replace(/[^0-9.]/g, '') })}
                placeholder="Price (optional)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ))}

        {/* Add your own */}
        <Text style={styles.sectionHead}>Add a service</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Root canal treatment"
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={addFree}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, !newName.trim() && { opacity: 0.4 }]}
            onPress={addFree}
            disabled={!newName.trim()}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Google's suggestions */}
        {unused.length > 0 && (
          <>
            <Text style={styles.sectionHead}>Suggested for your category</Text>
            <View style={styles.chips}>
              {unused.slice(0, 40).map((s) => (
                <TouchableOpacity key={s.service_type_id} style={styles.chip} onPress={() => addSuggested(s)}>
                  <Text style={styles.chipText}>+ {s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {dirty && (
        <View style={styles.saveBar}>
          <Text style={styles.saveCount}>
            {list.length} service{list.length === 1 ? '' : 's'}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save to Google'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: COLORS.background },
  bigIcon: { fontSize: 34, marginBottom: 10 },
  errTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  errBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  errBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  errLink: { marginTop: 12, fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline' },

  backRow: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  intro: { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 18, marginBottom: 18 },
  empty: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 20 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text },
  remove: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  badge: { fontSize: 10.5, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 13.5, color: COLORS.text,
    backgroundColor: COLORS.background, marginTop: 10,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceLabel: { fontSize: 15, fontWeight: '800', color: COLORS.textMuted, marginTop: 10 },
  priceInput: { flex: 1 },

  sectionHead: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8,
  },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 11, marginTop: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary },

  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20,
  },
  saveCount: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});
