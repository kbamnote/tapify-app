import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import * as gbp from '../services/googleBusinessApi';
import GbpPhotoUploader from '../components/GbpPhotoUploader';

const EDITABLE_META = [
  { key: 'business_name', label: 'Business Name', multiline: false },
  { key: 'description', label: 'Description', multiline: true },
  { key: 'phone', label: 'Phone', multiline: false },
  { key: 'website', label: 'Website', multiline: false },
];

const READONLY_META = [
  { key: 'primary_category', label: 'Primary Category' },
  { key: 'address', label: 'Address' },
  { key: 'hours', label: 'Hours' },
];

export default function GoogleBusinessScreen() {
  const { navigate } = useNavigation();

  const [status, setStatus] = useState(null);   // { configured, connected, location }
  const [fields, setFields] = useState(null);   // live GBP fields
  const [editable, setEditable] = useState(EDITABLE_META.map((f) => f.key));
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);      // connect/save/disconnect in flight
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const originalRef = useRef({});

  // ── Load status, then fields if connected ─────────────────────────────────
  const load = useCallback(async () => {
    setError(null);
    try {
      const st = await gbp.getStatus();
      setStatus(st);
      if (st.connected && st.location) {
        const data = await gbp.getFields();
        setFields(data.fields);
        setEditable(data.editable || EDITABLE_META.map((f) => f.key));
        const seed = {};
        EDITABLE_META.forEach((f) => { seed[f.key] = data.fields?.[f.key] ?? ''; });
        setForm(seed);
        originalRef.current = seed;
      } else {
        setFields(null);
      }
    } catch (e) {
      setError(e.message || 'Could not load Google Business Profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Deep-link return from the OAuth browser flow ──────────────────────────
  useEffect(() => {
    const onUrl = ({ url }) => {
      if (!url || url.indexOf('gbp-connected') === -1) return;
      const ok = /[?&]status=success/.test(url);
      if (ok) {
        setLoading(true);
        load();
      } else {
        setError('Google connection was cancelled or failed. Please try again.');
      }
    };
    const sub = Linking.addEventListener('url', onUrl);
    // Handle the case where the app was reopened cold by the deep link.
    Linking.getInitialURL().then((url) => { if (url) onUrl({ url }); });
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await gbp.getConnectUrl();
      if (!url) throw new Error('Could not start Google sign-in.');
      await Linking.openURL(url);
    } catch (e) {
      setError(e.message || 'Could not open Google sign-in.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    // Send only changed editable fields.
    const changed = {};
    editable.forEach((k) => {
      if ((form[k] ?? '') !== (originalRef.current[k] ?? '')) changed[k] = form[k] ?? '';
    });
    if (Object.keys(changed).length === 0) {
      Alert.alert('No changes', 'Edit a field before saving.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await gbp.updateFields(changed);
      setFields(data.fields);
      const seed = {};
      EDITABLE_META.forEach((f) => { seed[f.key] = data.fields?.[f.key] ?? ''; });
      setForm(seed);
      originalRef.current = seed;
      Alert.alert('Saved', 'Your changes were updated on Google Business Profile.');
    } catch (e) {
      setError(e.message || 'Could not save to Google. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const doDisconnect = () => {
    Alert.alert('Disconnect', 'Remove the Google Business Profile connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await gbp.disconnect();
            await load();
          } catch (e) {
            setError(e.message || 'Could not disconnect.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const configured = status?.configured;
  const connected = status?.connected;
  const hasLocation = connected && status?.location;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigate('ai-growth')}>
        <Text style={styles.backText}>← AI Growth Center</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🔗</Text>
        <Text style={styles.heroTitle}>Google Business Profile</Text>
        <Text style={styles.heroSub}>Edit your Google listing right here. Changes sync straight to Google.</Text>
      </View>

      {!!error && (
        <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View>
      )}

      {/* Server not configured */}
      {!configured && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Not available yet</Text>
          <Text style={styles.noticeText}>
            Google Business Profile isn't configured on the server yet. Once the Google API keys are added, you'll be able to connect here.
          </Text>
        </View>
      )}

      {/* Configured but not connected */}
      {configured && !connected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect your Google Business Profile</Text>
          <Text style={styles.cardText}>
            Sign in with the Google account that manages your business to load and edit your listing.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={connect} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Connect Google Business Profile</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Connected but no location resolved */}
      {connected && !hasLocation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connected, but no business found</Text>
          <Text style={styles.cardText}>
            We couldn't find a business location on this Google account, or the Business Profile API access is still pending. Pull to refresh, or reconnect.
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={connect} disabled={busy}>
            <Text style={styles.secondaryBtnText}>Reconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={doDisconnect} disabled={busy}>
            <Text style={styles.linkBtnText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Connected + location resolved, but the live field load failed */}
      {hasLocation && !fields && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Couldn't load your listing</Text>
          <Text style={styles.cardText}>
            You're connected{status?.location?.title ? ` as “${status.location.title}”` : ''}, but we couldn't load the profile fields. This is common while Business Profile API access is still pending. Retry, reconnect, or disconnect.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setLoading(true); load(); }} disabled={busy} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={connect} disabled={busy}>
            <Text style={styles.secondaryBtnText}>Reconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={doDisconnect} disabled={busy}>
            <Text style={styles.linkBtnText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Connected with a location — editor */}
      {hasLocation && fields && (
        <View>
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedBadgeText}>✅ Connected · {status.location.title || 'Your business'}</Text>
          </View>

          {EDITABLE_META.map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={[styles.input, f.multiline && styles.textarea]}
                value={form[f.key] ?? ''}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                multiline={f.multiline}
                textAlignVertical={f.multiline ? 'top' : 'center'}
                autoCapitalize={f.key === 'website' ? 'none' : 'sentences'}
                keyboardType={f.key === 'phone' ? 'phone-pad' : f.key === 'website' ? 'url' : 'default'}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>💾 Save to Google</Text>}
          </TouchableOpacity>

          {/* Read-only info from Google */}
          <Text style={styles.roHeader}>From your Google listing</Text>
          {READONLY_META.map((f) => (
            <View key={f.key} style={styles.roRow}>
              <Text style={styles.roLabel}>{f.label}</Text>
              <Text style={styles.roValue}>{fields[f.key] ? fields[f.key] : '—'}</Text>
            </View>
          ))}

          {/* Parts of the listing that need their own editor rather than a
              text box — a toggle list and a repeating list respectively. */}
          {[
            { route: 'business-services', icon: '🛠', title: 'Services',
              sub: 'What you offer, with prices. Each one is another search you can appear in.' },
            { route: 'business-attributes', icon: '☑️', title: 'Attributes',
              sub: 'Parking, accessibility, payment methods — the filters customers narrow by.' },
          ].map((l) => (
            <TouchableOpacity
              key={l.route}
              style={styles.subLink}
              activeOpacity={0.85}
              onPress={() => navigate(l.route)}
            >
              <Text style={styles.subLinkIcon}>{l.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLinkTitle}>{l.title}</Text>
                <Text style={styles.subLinkSub}>{l.sub}</Text>
              </View>
              <Text style={styles.subLinkChevron}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Photos — the one profile field Google won't let us PATCH, so it
              gets its own uploader rather than a text input. */}
          <GbpPhotoUploader />

          <TouchableOpacity style={styles.linkBtn} onPress={doDisconnect} disabled={busy}>
            <Text style={styles.linkBtnText}>Disconnect Google Business Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 60 },
  center: { justifyContent: 'center', alignItems: 'center' },
  muted: { marginTop: 12, color: COLORS.textMuted },

  backRow: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  hero: { marginBottom: 18 },
  heroIcon: { fontSize: 34, marginBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  heroSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 19 },

  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  notice: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 14, padding: 16 },
  noticeTitle: { fontSize: 15, fontWeight: '800', color: '#92400e', marginBottom: 6 },
  noticeText: { fontSize: 13, color: '#92400e', lineHeight: 19 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  cardText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: 16 },

  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { backgroundColor: 'rgba(21,62,63,0.06)', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  secondaryBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  linkBtnText: { color: COLORS.error, fontSize: 13, fontWeight: '700' },

  connectedBadge: { backgroundColor: '#ecfdf5', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16 },
  connectedBadgeText: { color: '#059669', fontSize: 13, fontWeight: '700' },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(21,62,63,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  textarea: { minHeight: 110, paddingTop: 12 },

  subLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginTop: 10,
  },
  subLinkIcon: { fontSize: 20 },
  subLinkTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  subLinkSub: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  subLinkChevron: { fontSize: 24, color: COLORS.textMuted },

  roHeader: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },
  roRow: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  roLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 3 },
  roValue: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
