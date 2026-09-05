import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, FlatList, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { API_BASE } from '../config';
import { useNavigation } from '../context/NavigationContext';

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
  const { navigate } = useNavigation();
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

  // Approved templates, for when the 24-hour window has closed. WhatsApp will
  // not deliver free text then, so without these the thread is a dead end and
  // the only way to answer a customer is to find a laptop.
  const [templates, setTemplates] = useState(null);   // null = not loaded yet
  const [tplName, setTplName]     = useState('');
  const [tplParams, setTplParams] = useState([]);     // one string per {{n}}

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

  /** Approved templates for this number. Fetched once, then reused. */
  const loadTemplates = useCallback(async () => {
    try {
      const list = await waApi('templates');
      setTemplates(Array.isArray(list) ? list : []);
    } catch (e) {
      // Not fatal — the thread still works, the picker just says so.
      console.log('[WA] templates failed:', e.message);
      setTemplates([]);
    }
  }, []);

  const openThread = async (c) => {
    setActive(c);
    setThreadBusy(true);
    setReply('');
    setTplName('');
    setTplParams([]);
    try {
      const list = await waApi('thread', { qs: `&phone=${encodeURIComponent(c.phone)}` });
      setMsgs(list);
      // Free text only delivers within 24h of their last inbound message —
      // work it out before showing a box that would silently fail.
      const lastIn = [...list].reverse().find((m) => m.direction === 'in');
      const open = !!lastIn && Date.now() - new Date(lastIn.createdAt).getTime() < 24 * 3600 * 1000;
      setWindowOpen(open);
      // Only pay for the Graph call when a template is the only way to reply.
      if (!open && templates === null) loadTemplates();
    } catch (e) {
      Alert.alert('Could not open', e.message);
      setActive(null);
    } finally {
      setThreadBusy(false);
    }
  };

  /** Selecting a template resizes the parameter list to match its {{n}} count. */
  const pickTemplate = (t) => {
    setTplName(t.name === tplName ? '' : t.name);
    setTplParams(t.name === tplName ? [] : new Array(t.paramCount || 0).fill(''));
  };

  const sendTemplate = async () => {
    if (!tplName || sending) return;
    const chosen = (templates || []).find((t) => t.name === tplName);
    const need = chosen?.paramCount || 0;
    // Meta rejects the send outright if a placeholder is left empty, with an
    // error the customer cannot act on. Catch it here instead.
    if (tplParams.slice(0, need).some((p) => !String(p || '').trim())) {
      Alert.alert('Fill every field', 'This template has blanks that must be filled before it can be sent.');
      return;
    }
    setSending(true);
    try {
      await waApi('send', {
        method: 'POST',
        body: { phone: active.phone, templateName: tplName, params: tplParams.slice(0, need) },
      });
      setTplName('');
      setTplParams([]);
      await openThread(active);
      loadConvos();
    } catch (e) {
      Alert.alert('Could not send', e.message);
    } finally {
      setSending(false);
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
              typed reply. Send one of your approved templates instead.
            </Text>

            {templates === null ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 14 }} />
            ) : templates.length === 0 ? (
              <Text style={styles.closedHint}>
                No approved templates on this number yet. Templates are created and approved in
                WhatsApp Manager, and usually clear within a day.
              </Text>
            ) : (
              <>
                <Text style={styles.tplLabel}>Choose a template</Text>
                {templates.map((t) => {
                  const on = t.name === tplName;
                  return (
                    <TouchableOpacity
                      key={t.name}
                      style={[styles.tplRow, on && styles.tplRowOn]}
                      onPress={() => pickTemplate(t)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.tplName, on && styles.tplNameOn]}>{t.name}</Text>
                      {!!t.body && (
                        <Text style={[styles.tplBody, on && styles.tplBodyOn]} numberOfLines={3}>
                          {t.body}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* One input per {{n}}, in order. The preview above shows where
                    each one lands, so the numbering is not a guessing game. */}
                {tplParams.map((v, i) => (
                  <TextInput
                    key={i}
                    style={styles.tplInput}
                    value={v}
                    onChangeText={(txt) => {
                      const next = [...tplParams];
                      next[i] = txt;
                      setTplParams(next);
                    }}
                    placeholder={`Value for {{${i + 1}}}`}
                    placeholderTextColor="#9aa5a1"
                  />
                ))}

                <TouchableOpacity
                  style={[styles.tplSend, (!tplName || sending) && styles.tplSendOff]}
                  onPress={sendTemplate}
                  disabled={!tplName || sending}
                >
                  <Text style={styles.tplSendText}>
                    {sending ? 'Sending…' : 'Send template'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
        <TouchableOpacity
          style={styles.autoBtn}
          onPress={() => navigate('whatsapp-broadcast')}
          hitSlop={6}
        >
          <Text style={styles.autoBtnText}>Broadcast</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.autoBtn, { marginLeft: 6 }]}
          onPress={() => navigate('whatsapp-auto-replies')}
          hitSlop={6}
        >
          <Text style={styles.autoBtnText}>Auto-replies</Text>
        </TouchableOpacity>
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
  autoBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7,
             backgroundColor: 'rgba(21,62,63,0.07)' },
  autoBtnText: { fontSize: 11.5, fontWeight: '700', color: COLORS.primary },

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

  // Template picker, shown inside the amber closed-window box. Colours stay in
  // that family so it reads as one panel rather than a second UI bolted on.
  closedHint: { fontSize: 12.5, color: '#92400e', lineHeight: 18, marginTop: 10, fontStyle: 'italic' },
  tplLabel: { fontSize: 11.5, fontWeight: '800', color: '#92400e', letterSpacing: 0.6,
              textTransform: 'uppercase', marginTop: 14, marginBottom: 7 },
  tplRow: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
            borderRadius: 9, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 7 },
  tplRowOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tplName: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  tplNameOn: { color: '#ffffff' },
  tplBody: { fontSize: 11.5, color: '#a16207', marginTop: 3, lineHeight: 16 },
  tplBodyOn: { color: 'rgba(255,255,255,0.85)' },
  tplInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fde68a', borderRadius: 9,
              paddingHorizontal: 11, paddingVertical: 9, fontSize: 13.5, color: '#1f2937',
              marginBottom: 7 },
  tplSend: { backgroundColor: COLORS.primary, borderRadius: 9, paddingVertical: 12,
             alignItems: 'center', marginTop: 4 },
  tplSendOff: { opacity: 0.45 },
  tplSendText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  emptySub: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', marginTop: 6, opacity: 0.8 },
});
