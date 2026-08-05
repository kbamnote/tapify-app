import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, FlatList, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { API_BASE } from '../config';

/**
 * WhatsApp — the business's own number.
 *
 * Everything goes through the PHP proxy, which authenticates the session and
 * forwards to the CRM that actually holds the inbox. The CRM is private and is
 * never contacted from the device.
 *
 * Connecting a number is NOT done here: Meta's Embedded Signup needs a browser
 * popup running their JS SDK, which React Native cannot host reliably. An
 * unconnected user is pointed at the dashboard instead of being shown a flow
 * that would fail.
 */

const PROXY = `${API_BASE}/api/whatsapp/proxy.php`;
const DASHBOARD_URL = 'https://tapify.co.in/dashboard/whatsapp.html';
const POLL_MS = 20000;

/**
 * fetchApi throws a bare Error on non-2xx, which loses the status — but the
 * proxy passes the CRM's 409 codes through (`not_connected`, `window_closed`)
 * and the UI needs to tell those apart from a real failure.
 */
async function waApi(action, { method = 'GET', body, qs = '' } = {}) {
  const res = await fetch(`${PROXY}?action=${encodeURIComponent(action)}${qs}`, {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || json.error || 'Request failed');
    err.code = json.error;
    err.status = res.status;
    throw err;
  }
  return json;
}

const initial = (s) => (String(s || '?').trim().charAt(0) || '?').toUpperCase();
const fmtTime = (v) => {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const TICKS = { read: '✓✓', delivered: '✓✓', sent: '✓', queued: '🕓', failed: '⚠' };

export default function WhatsAppScreen() {
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState(null);
  const [error, setError]       = useState(null);

  const [convos, setConvos]     = useState([]);
  const [refreshing, setRefresh] = useState(false);

  const [active, setActive]     = useState(null);   // { phone, name }
  const [msgs, setMsgs]         = useState([]);
  const [threadBusy, setThreadBusy] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);

  const pollRef = useRef(null);

  useEffect(() => {
    boot();
    return () => clearInterval(pollRef.current);
  }, []);

  const boot = async () => {
    try {
      setError(null);
      const s = await waApi('status');
      setStatus(s);
      if (s.connected) await loadConvos();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadConvos = useCallback(async () => {
    try {
      setConvos(await waApi('conversations'));
    } catch (e) {
      if (e.code !== 'not_connected') setError(e.message);
    }
  }, []);

  // Poll only while the list is showing; a thread refreshes on its own.
  useEffect(() => {
    clearInterval(pollRef.current);
    if (status?.connected && !active) {
      pollRef.current = setInterval(loadConvos, POLL_MS);
    }
    return () => clearInterval(pollRef.current);
  }, [status, active, loadConvos]);

  const openThread = async (c) => {
    setActive(c);
    setThreadBusy(true);
    setReply('');
    try {
      const list = await waApi('thread', { qs: `&phone=${encodeURIComponent(c.phone)}` });
      setMsgs(list);
      // Free text only delivers within 24h of their last inbound message —
      // work it out before showing a box that would silently fail.
      const lastIn = [...list].reverse().find((m) => m.direction === 'in');
      setWindowOpen(!!lastIn && Date.now() - new Date(lastIn.createdAt).getTime() < 24 * 3600 * 1000);
    } catch (e) {
      Alert.alert('Could not open', e.message);
      setActive(null);
    } finally {
      setThreadBusy(false);
    }
  };

  const send = async () => {
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await waApi('send', { method: 'POST', body: { phone: active.phone, body } });
      setReply('');
      await openThread(active);
      loadConvos();
    } catch (e) {
      Alert.alert(
        e.code === 'window_closed' ? 'Cannot reply yet' : 'Could not send',
        e.message
      );
    } finally {
      setSending(false);
    }
  };

  /* ── loading / error ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error && !status?.connected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={boot}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── not connected ───────────────────────────────────────────────────── */
  if (!status?.connected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.title}>Connect your WhatsApp number</Text>
        <Text style={styles.body}>
          Send order confirmations, appointment reminders and enquiry replies from your own
          WhatsApp Business number — and reply to customers here.
        </Text>
        <Text style={[styles.body, { marginTop: 10 }]}>
          Connecting needs a one-time setup in your browser. Open the Tapify dashboard on a
          computer and go to WhatsApp → Connect.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openURL(DASHBOARD_URL)}>
          <Text style={styles.primaryBtnText}>Open the dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={boot} style={{ marginTop: 14 }}>
          <Text style={styles.link}>I have already connected — refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── thread ──────────────────────────────────────────────────────────── */
  if (active) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.threadHead}>
          <TouchableOpacity onPress={() => { setActive(null); loadConvos(); }} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.threadName} numberOfLines={1}>{active.name || active.phone}</Text>
            <Text style={styles.threadPhone}>{active.phone}</Text>
          </View>
        </View>

        {threadBusy ? (
          <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>
        ) : (
          <FlatList
            data={msgs}
            keyExtractor={(m, i) => String(m._id || i)}
            contentContainerStyle={styles.msgList}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.direction === 'out' ? styles.out : styles.in]}>
                <Text style={styles.bubbleText}>{item.body || ''}</Text>
                <Text style={styles.bubbleMeta}>
                  {fmtTime(item.createdAt)} {item.direction === 'out' ? (TICKS[item.status] || '') : ''}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No messages yet</Text>}
          />
        )}

        {windowOpen ? (
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Type a reply…"
              placeholderTextColor={COLORS.textMuted}
              value={reply}
              onChangeText={setReply}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!reply.trim() || sending) && styles.sendBtnOff]}
              onPress={send}
              disabled={!reply.trim() || sending}
            >
              <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedBox}>
            <Text style={styles.closedTitle}>24-hour window closed</Text>
            <Text style={styles.closedText}>
              This contact has not messaged you in the last 24 hours, so WhatsApp will not deliver a
              typed reply. Send an approved template from the dashboard instead.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  /* ── conversation list ───────────────────────────────────────────────── */
  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={styles.dot} />
        <Text style={styles.statusNum}>{status.displayPhone || 'Connected'}</Text>
        <Text style={styles.statusBiz} numberOfLines={1}>{status.name || ''}</Text>
      </View>

      <FlatList
        data={convos}
        keyExtractor={(c) => c.phone}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={async () => { setRefresh(true); await loadConvos(); setRefresh(false); }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => openThread(item)}>
            <GlassCard style={styles.convo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial(item.name || item.phone)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.convoName} numberOfLines={1}>{item.name || item.phone}</Text>
                <Text style={styles.convoLast} numberOfLines={1}>
                  {item.lastDirection === 'out' ? '↩ ' : ''}{item.lastMessage || ''}
                </Text>
              </View>
              {item.unread > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
              )}
            </GlassCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySub}>Messages sent from your website will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  body:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  link:  { fontSize: 13.5, fontWeight: '700', color: COLORS.primary },

  primaryBtn: { marginTop: 20, backgroundColor: '#25D366', paddingHorizontal: 26, paddingVertical: 13, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 11,
               borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#16a34a' },
  statusNum: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  statusBiz: { fontSize: 12.5, color: COLORS.textMuted, flex: 1 },

  convo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37,211,102,0.14)',
            alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
  convoName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  convoLast: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#25D366',
           alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  threadHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  backText: { fontSize: 30, lineHeight: 34, color: COLORS.primary, fontWeight: '700' },
  threadName: { fontSize: 15.5, fontWeight: '800', color: COLORS.text },
  threadPhone: { fontSize: 11.5, color: COLORS.textMuted },

  msgList: { padding: 14, paddingBottom: 20 },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 9 },
  out: { alignSelf: 'flex-end', backgroundColor: '#dcf8c6', borderBottomRightRadius: 4 },
  in:  { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14.5, color: '#111827', lineHeight: 20 },
  bubbleMeta: { fontSize: 10.5, color: '#6b7280', marginTop: 4, textAlign: 'right' },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, padding: 11,
              borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  input: { flex: 1, maxHeight: 110, minHeight: 42, borderWidth: 1.5, borderColor: COLORS.border,
           borderRadius: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
           fontSize: 14.5, color: COLORS.text, backgroundColor: COLORS.background },
  sendBtn: { backgroundColor: '#25D366', borderRadius: 12, paddingHorizontal: 18, height: 42, justifyContent: 'center' },
  sendBtnOff: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  closedBox: { margin: 12, padding: 13, borderRadius: 12, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  closedTitle: { fontSize: 13.5, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  closedText: { fontSize: 12.5, color: '#92400e', lineHeight: 18 },

  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  emptySub: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', marginTop: 6, opacity: 0.8 },
});
