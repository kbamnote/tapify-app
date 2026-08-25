import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Switch, Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { getAttributes, setAttributes } from '../services/googleBusinessApi';

/**
 * Business attributes — the tick-box facts customers filter by.
 *
 * Edits are held locally and saved in one call, because each save is a write to
 * the live listing and Google rate-limits them. Only what actually changed is
 * sent, so a save never touches an attribute the customer did not look at.
 */
export default function BusinessAttributesScreen() {
  const { navigate } = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});   // id → bool, only what changed

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getAttributes());
      setEdits({});
    } catch (e) {
      setError(e?.message || 'Could not load attributes.');
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

  const dirty = useMemo(() => Object.keys(edits).length, [edits]);

  const toggle = (item, next) => {
    setEdits((prev) => {
      const out = { ...prev };
      // Toggling back to the stored value is not a change — drop it, so the
      // save button reflects reality and we never write a no-op.
      if (next === item.value) delete out[item.id];
      else out[item.id] = next;
      return out;
    });
  };

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      setData(await setAttributes(edits));
      setEdits({});
      Alert.alert('Saved', 'Your attributes are updated on Google.');
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
        <Text style={styles.bigIcon}>☑️</Text>
        <Text style={styles.errTitle}>Could not load attributes</Text>
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

  const groups = data?.groups || [];
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: dirty ? 100 : 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <TouchableOpacity style={styles.backRow} onPress={() => navigate('google-business')}>
          <Text style={styles.backText}>← Google Business Profile</Text>
        </TouchableOpacity>

        <Text style={styles.intro}>
          These are the filters customers narrow by on Maps — parking, accessibility, payment
          methods. Turn on everything that is true of you. Anything left off is a search you
          will not appear in.
        </Text>

        {totalItems === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.bigIcon}>☑️</Text>
            <Text style={styles.errText}>
              Google offers no yes/no attributes for your category yet. This depends on your
              primary category, so it may appear once that is set more specifically.
            </Text>
          </View>
        ) : groups.map((g) => (
          <View key={g.group} style={styles.group}>
            <Text style={styles.groupTitle}>{g.group}</Text>
            {g.items.map((item) => {
              const value = item.id in edits ? edits[item.id] : item.value;
              return (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Switch value={!!value} onValueChange={(v) => toggle(item, v)} disabled={saving} />
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {dirty > 0 && (
        <View style={styles.saveBar}>
          <Text style={styles.saveCount}>
            {dirty} change{dirty === 1 ? '' : 's'}
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
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },

  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6,
  },
  rowLabel: { flex: 1, fontSize: 13.5, color: COLORS.text, lineHeight: 19 },

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
