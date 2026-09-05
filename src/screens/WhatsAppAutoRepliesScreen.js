import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { API_BASE } from '../config';
import { useNavigation } from '../context/NavigationContext';

/**
 * Auto-replies for the business's own WhatsApp number.
 *
 * Edits the same per-account config the web dashboard does, through the PHP
 * proxy (`bot` to read, `bot-save` to write).
 *
 * WHAT THIS SCREEN DOES NOT EDIT: the interactive list menu. Building a
 * ten-row menu with titles, descriptions and ids is a desk job, and it is set
 * up once — the dashboard keeps that. But the save endpoint REBUILDS the menu
 * from whatever it is sent, so omitting it would silently wipe a menu the
 * customer configured on the dashboard. The loaded menu is therefore held and
 * sent back untouched.
 */

const PROXY = `${API_BASE}/api/whatsapp/proxy.php`;
const MAX_REPLIES = 50;
const REPLY_MAX = 4000;

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

export default function WhatsAppAutoRepliesScreen() {
  const { navigate } = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const [enabled, setEnabled]                 = useState(false);
  const [greetingEnabled, setGreetingEnabled] = useState(true);
  const [replies, setReplies]                 = useState([]);
  // Held only so it survives the round trip — never edited here.
  const [menu, setMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await waApi('bot');
      setEnabled(!!cfg.enabled);
      setGreetingEnabled(cfg.greetingEnabled !== false);
      setReplies(Array.isArray(cfg.replies) ? cfg.replies.map((r) => ({ ...r })) : []);
      setMenu(cfg.menu || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setReply = (i, key, val) => {
    setReplies((prev) => prev.map((r, n) => (n === i ? { ...r, [key]: val } : r)));
  };
  const addReply = () => {
    if (replies.length >= MAX_REPLIES) {
      Alert.alert('Limit reached', `You can have up to ${MAX_REPLIES} auto-replies.`);
      return;
    }
    setReplies((prev) => [...prev, { match: '', reply: '' }]);
  };
  const removeReply = (i) => setReplies((prev) => prev.filter((_, n) => n !== i));

  const save = async () => {
    // The server drops any rule missing either half. Say so here instead of
    // letting rules quietly vanish on save.
    const half = replies.some(
      (r) => !!String(r.match || '').trim() !== !!String(r.reply || '').trim()
    );
    if (half) {
      Alert.alert('Incomplete rule', 'Every auto-reply needs both a keyword and a message.');
      return;
    }
    setSaving(true);
    try {
      await waApi('bot-save', {
        method: 'POST',
        body: {
          enabled,
          greetingEnabled,
          replies: replies.filter((r) => String(r.match || '').trim() && String(r.reply || '').trim()),
          // Sent back exactly as loaded — see the note at the top.
          ...(menu ? { menu } : {}),
        },
      });
      Alert.alert('Saved', 'Your auto-replies are live.');
      load();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Auto-replies</Text>
              <Text style={styles.switchDesc}>
                Reply automatically when a customer messages you.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#cbd5d1', true: COLORS.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Greeting</Text>
              <Text style={styles.switchDesc}>
                Send a welcome message the first time someone writes.
              </Text>
            </View>
            <Switch
              value={greetingEnabled}
              onValueChange={setGreetingEnabled}
              disabled={!enabled}
              trackColor={{ false: '#cbd5d1', true: COLORS.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Keyword replies</Text>
        <Text style={styles.sectionHint}>
          When a customer's message contains the keyword, they get your message back.
          Capitals, emoji and punctuation are ignored when matching.
        </Text>

        {replies.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No keyword replies yet.</Text>
          </View>
        )}

        {replies.map((r, i) => (
          <View key={i} style={styles.replyCard}>
            <View style={styles.replyHead}>
              <Text style={styles.replyNum}>#{i + 1}</Text>
              <TouchableOpacity onPress={() => removeReply(i)} hitSlop={10}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={r.match}
              onChangeText={(t) => setReply(i, 'match', t)}
              placeholder="If the message contains… e.g. price"
              placeholderTextColor="#9aa5a1"
            />
            <TextInput
              style={[styles.input, styles.inputArea]}
              value={r.reply}
              onChangeText={(t) => setReply(i, 'reply', t.slice(0, REPLY_MAX))}
              placeholder="Reply with…"
              placeholderTextColor="#9aa5a1"
              multiline
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addReply}>
          <Text style={styles.addText}>+ Add a keyword reply</Text>
        </TouchableOpacity>

        {!!menu && (
          <Text style={styles.menuNote}>
            This number also has an interactive menu with {(menu.rows || []).length} option
            {(menu.rows || []).length === 1 ? '' : 's'}. It is edited on the Tapify web dashboard
            and is left unchanged when you save here.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnOff]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>

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

  errorText: { color: COLORS.text, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 9 },
  retryText: { color: '#fff', fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 13, padding: 15, marginBottom: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { flex: 1, paddingRight: 14 },
  switchTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.text },
  switchDesc: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 3, lineHeight: 17 },
  divider: { height: 1, backgroundColor: 'rgba(21,62,63,0.08)', marginVertical: 14 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 5 },
  sectionHint: { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 18, marginBottom: 13 },

  emptyBox: { backgroundColor: '#fff', borderRadius: 11, padding: 18, alignItems: 'center', marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },

  replyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 11 },
  replyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  replyNum: { fontSize: 11.5, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  removeText: { fontSize: 12.5, fontWeight: '700', color: '#b91c1c' },

  input: { backgroundColor: '#f7faf9', borderWidth: 1.5, borderColor: '#e3ebe8', borderRadius: 9,
           paddingHorizontal: 11, paddingVertical: 10, fontSize: 13.5, color: COLORS.text, marginBottom: 8 },
  inputArea: { height: 84, textAlignVertical: 'top', marginBottom: 0 },

  addBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 10,
            paddingVertical: 12, alignItems: 'center', marginTop: 3, marginBottom: 18 },
  addText: { color: COLORS.primary, fontWeight: '700', fontSize: 13.5 },

  menuNote: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 18, fontStyle: 'italic' },

  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 11, paddingVertical: 14, alignItems: 'center' },
  saveBtnOff: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  backBtn: { paddingVertical: 15, alignItems: 'center' },
  backText: { color: COLORS.textMuted, fontSize: 13.5, fontWeight: '600' },
});
