import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { API_BASE } from '../config';
import { useNavigation } from '../context/NavigationContext';

/**
 * Bulk template send on the business's own WhatsApp number.
 *
 * TEMPLATES ONLY, by necessity. Free text is deliverable only inside a
 * contact's own 24-hour window, which for a broadcast is nearly nobody — so
 * offering it would mean most of the send silently vanishing.
 *
 * {{1}} IS ALWAYS THE RECIPIENT'S NAME, filled per person by the server. The
 * inputs here therefore start at {{2}}; labelling them 1,2,3 would put every
 * value in the wrong slot.
 *
 * The server answers 202 straight away and works through the list in the
 * background, so this screen polls for progress rather than waiting.
 */

const PROXY = `${API_BASE}/api/whatsapp/proxy.php`;
const POLL_MS = 3000;
const MAX_RECIPIENTS = 500;

async function waApi(action, { method = 'GET', body } = {}) {
  const res = await fetch(`${PROXY}?action=${encodeURIComponent(action)}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || data.error || `Request failed (${res.status})`);
    err.code = data.code || data.error;
    throw err;
  }
  return data.data !== undefined ? data.data : data;
}

export default function WhatsAppBroadcastScreen() {
  const { navigate } = useNavigation();
  const pollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [templates, setTemplates] = useState([]);
  const [tplName, setTplName]     = useState('');
  const [extras, setExtras]       = useState([]);   // {{2}} onwards

  const [contacts, setContacts]   = useState([]);   // from conversations
  const [picked, setPicked]       = useState({});   // phone -> true

  const [sending, setSending] = useState(false);
  const [runs, setRuns]       = useState([]);

  const loadRuns = useCallback(async () => {
    try { setRuns(await waApi('broadcasts')); } catch (_) { /* non-fatal */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tpl, convos] = await Promise.all([waApi('templates'), waApi('conversations')]);
      setTemplates(Array.isArray(tpl) ? tpl : []);
      setContacts(Array.isArray(convos) ? convos : []);
      await loadRuns();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadRuns]);

  useEffect(() => { load(); }, [load]);

  // Poll only while something is actually running.
  useEffect(() => {
    clearInterval(pollRef.current);
    if (runs.some((r) => r.status === 'running')) {
      pollRef.current = setInterval(loadRuns, POLL_MS);
    }
    return () => clearInterval(pollRef.current);
  }, [runs, loadRuns]);

  const chosen = templates.find((t) => t.name === tplName);
  // paramCount counts {{1}} too, and {{1}} is filled automatically.
  const extrasNeeded = Math.max(0, (chosen?.paramCount || 0) - 1);

  const pickTemplate = (t) => {
    const same = t.name === tplName;
    setTplName(same ? '' : t.name);
    setExtras(same ? [] : new Array(Math.max(0, (t.paramCount || 0) - 1)).fill(''));
  };

  const pickedList = contacts.filter((c) => picked[c.phone]);
  const allOn = contacts.length > 0 && pickedList.length === contacts.length;
  const toggleAll = () => {
    if (allOn) return setPicked({});
    const next = {};
    contacts.slice(0, MAX_RECIPIENTS).forEach((c) => { next[c.phone] = true; });
    setPicked(next);
  };

  const send = async () => {
    if (!tplName) { Alert.alert('Choose a template', 'Pick the template you want to send.'); return; }
    if (!pickedList.length) { Alert.alert('No recipients', 'Select at least one contact.'); return; }
    if (extras.slice(0, extrasNeeded).some((v) => !String(v || '').trim())) {
      Alert.alert('Fill every field', 'This template has blanks that must be filled before sending.');
      return;
    }
    Alert.alert(
      'Send broadcast?',
      `This sends "${tplName}" to ${pickedList.length} contact${pickedList.length === 1 ? '' : 's'}. `
      + 'It cannot be undone once it starts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            try {
              await waApi('broadcast', {
                method: 'POST',
                body: {
                  templateName: tplName,
                  params: extras.slice(0, extrasNeeded),
                  recipients: pickedList.map((c) => ({ phone: c.phone, name: c.name || '' })),
                },
              });
              setPicked({});
              setTplName('');
              setExtras([]);
              await loadRuns();
            } catch (e) {
              Alert.alert('Could not start', e.message);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── template ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>1. Choose a template</Text>
        <Text style={styles.sectionHint}>
          Broadcasts must use an approved template — WhatsApp will not deliver typed messages to
          people who have not written to you in the last 24 hours.
        </Text>

        {templates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No approved templates on this number yet. Templates are created in WhatsApp Manager
              and usually clear within a day.
            </Text>
          </View>
        ) : templates.map((t) => {
          const on = t.name === tplName;
          return (
            <TouchableOpacity
              key={t.name}
              style={[styles.tplRow, on && styles.tplRowOn]}
              onPress={() => pickTemplate(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tplName, on && styles.tplOnText]}>{t.name}</Text>
              {!!t.body && (
                <Text style={[styles.tplBody, on && styles.tplOnBody]} numberOfLines={3}>{t.body}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {!!chosen && (
          <View style={styles.paramBox}>
            <Text style={styles.paramNote}>
              {'{{1}}'} is filled with each contact's own name automatically.
            </Text>
            {extrasNeeded === 0 ? (
              <Text style={styles.paramNote}>Nothing else to fill in for this template.</Text>
            ) : extras.slice(0, extrasNeeded).map((v, i) => (
              <TextInput
                key={i}
                style={styles.input}
                value={v}
                onChangeText={(t) => { const n = [...extras]; n[i] = t; setExtras(n); }}
                placeholder={`Value for {{${i + 2}}} — same for everyone`}
                placeholderTextColor="#9aa5a1"
              />
            ))}
          </View>
        )}

        {/* ── recipients ────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2. Choose who receives it</Text>
        <Text style={styles.sectionHint}>
          These are people who have messaged your number. Up to {MAX_RECIPIENTS} per broadcast.
        </Text>

        {contacts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No conversations yet, so there is nobody to send to.</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.allRow} onPress={toggleAll}>
              <Text style={styles.allText}>{allOn ? 'Clear selection' : 'Select all'}</Text>
              <Text style={styles.allCount}>{pickedList.length} of {contacts.length} selected</Text>
            </TouchableOpacity>

            {contacts.map((c) => {
              const on = !!picked[c.phone];
              return (
                <TouchableOpacity
                  key={c.phone}
                  style={[styles.person, on && styles.personOn]}
                  onPress={() => setPicked((p) => ({ ...p, [c.phone]: !p[c.phone] }))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.box, on && styles.boxOn]}>
                    {on && <Text style={styles.tick}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{c.name || c.phone}</Text>
                    {!!c.name && <Text style={styles.personPhone}>{c.phone}</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, (sending || !tplName || !pickedList.length) && styles.sendOff]}
          onPress={send}
          disabled={sending || !tplName || !pickedList.length}
        >
          <Text style={styles.sendText}>
            {sending ? 'Starting…' : `Send to ${pickedList.length} contact${pickedList.length === 1 ? '' : 's'}`}
          </Text>
        </TouchableOpacity>

        {/* ── history ───────────────────────────────────────────────────── */}
        {runs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 26 }]}>Recent broadcasts</Text>
            {runs.map((r) => {
              const done = r.sent + r.failed;
              const pct = r.total ? Math.round((done / r.total) * 100) : 0;
              return (
                <View key={r.id} style={styles.runCard}>
                  <View style={styles.runHead}>
                    <Text style={styles.runName} numberOfLines={1}>{r.templateName}</Text>
                    <Text style={[
                      styles.runBadge,
                      r.status === 'running' && styles.badgeRun,
                      r.status === 'done' && styles.badgeDone,
                      r.status === 'stopped' && styles.badgeStop,
                    ]}>
                      {r.status === 'running' ? `${pct}%` : r.status}
                    </Text>
                  </View>
                  <Text style={styles.runStats}>
                    {r.sent} sent{r.failed ? ` · ${r.failed} failed` : ''} of {r.total}
                  </Text>
                  {r.status === 'running' && (
                    <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                  )}
                  {!!r.error && <Text style={styles.runErr}>{r.error}</Text>}
                </View>
              );
            })}
          </>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('whatsapp')}>
          <Text style={styles.backText}>← Back to inbox</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 14, paddingBottom: 40 },

  errText: { color: COLORS.text, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 9 },
  retryText: { color: '#fff', fontWeight: '700' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 5 },
  sectionHint: { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 18, marginBottom: 12 },

  emptyBox: { backgroundColor: '#fff', borderRadius: 11, padding: 16, marginBottom: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  tplRow: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6ece9', borderRadius: 11,
            padding: 12, marginBottom: 8 },
  tplRowOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tplName: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  tplBody: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 17 },
  tplOnText: { color: '#fff' },
  tplOnBody: { color: 'rgba(255,255,255,0.85)' },

  paramBox: { backgroundColor: '#f0fdf4', borderLeftWidth: 3, borderLeftColor: '#25D366',
              borderRadius: 0, padding: 12, marginTop: 4, marginBottom: 4 },
  paramNote: { fontSize: 12.5, color: '#14532d', lineHeight: 18, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d7e8dd', borderRadius: 9,
           paddingHorizontal: 11, paddingVertical: 10, fontSize: 13.5, color: COLORS.text, marginBottom: 8 },

  allRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: 9, paddingHorizontal: 4, marginBottom: 4 },
  allText: { fontSize: 13.5, fontWeight: '700', color: COLORS.primary },
  allCount: { fontSize: 12.5, color: COLORS.textMuted },

  person: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
            borderRadius: 10, padding: 11, marginBottom: 6 },
  personOn: { backgroundColor: '#f0fdf4' },
  box: { width: 21, height: 21, borderRadius: 5, borderWidth: 1.8, borderColor: '#c8d5cf',
         marginRight: 11, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tick: { color: '#fff', fontSize: 13, fontWeight: '900' },
  personName: { fontSize: 13.5, fontWeight: '600', color: COLORS.text },
  personPhone: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 },

  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 11, paddingVertical: 14,
             alignItems: 'center', marginTop: 16 },
  sendOff: { opacity: 0.45 },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  runCard: { backgroundColor: '#fff', borderRadius: 11, padding: 12, marginBottom: 8 },
  runHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runName: { fontSize: 13.5, fontWeight: '700', color: COLORS.text, flex: 1, paddingRight: 10 },
  runBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3,
              borderRadius: 6, overflow: 'hidden', textTransform: 'uppercase' },
  badgeRun:  { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeDone: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeStop: { backgroundColor: '#fee2e2', color: '#991b1b' },
  runStats: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 5 },
  bar: { height: 5, borderRadius: 3, backgroundColor: '#eef2f0', marginTop: 8, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: COLORS.primary },
  runErr: { fontSize: 12, color: '#991b1b', marginTop: 5 },

  backBtn: { paddingVertical: 16, alignItems: 'center' },
  backText: { color: COLORS.textMuted, fontSize: 13.5, fontWeight: '600' },
});
