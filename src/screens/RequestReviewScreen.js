import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, Platform, Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { getReviewRequests, logReviewRequest } from '../services/googleBusinessApi';
import { copyText } from '../utils/aiClipboard';

/**
 * Request a Review.
 *
 * The message is sent from the owner's OWN WhatsApp or SMS app — we hand the
 * text to the OS and it takes over. Nothing is sent from our servers, which
 * keeps this clear of bulk-messaging rules and of Google's prohibition on
 * soliciting reviews at scale. The backend only keeps the log.
 *
 * The contact picker is the system one, one contact at a time. That is a
 * deliberate limit: it needs no contacts permission on iOS, and asking people
 * individually is what Google's review policy expects anyway.
 */

// Loaded lazily so the screen still works on a build that predates the native
// module — manual entry needs no native code at all. Do not hoist this to a
// static import; that would turn a missing module into a white screen.
let Contacts = null;
try { Contacts = require('expo-contacts'); } catch (e) { Contacts = null; }

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const CHANNEL_ICON = { whatsapp: '💬', sms: '✉️', copy: '🔗' };

/** Mirror of GoogleBusinessService::normalisePhone, for previews and matching. */
function normalisePhone(raw) {
  let d = String(raw || '').replace(/\D+/g, '');
  if (!d) return '';
  if (d.length > 12 && d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d[0] === '0') d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 11 && d.length <= 15 ? d : '';
}

export default function RequestReviewScreen() {
  const { navigate } = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [touchedMessage, setTouchedMessage] = useState(false);

  // Bulk queue: [{ name, phone }] awaiting a send, plus which one is next.
  const [queue, setQueue] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await getReviewRequests(100);
      setData(d);
      // Seed the message once. Never overwrite an edit the owner has made —
      // a refresh silently replacing their wording would be maddening.
      if (!touchedMessage && d?.review_link) {
        setMessage(
          `Thanks for choosing ${d.business_name || 'us'}! If you have a minute, `
          + `a quick review on Google would mean a lot to us:\n${d.review_link}`
        );
      }
    } catch (e) {
      setError(e?.message || 'Could not load review requests.');
    } finally {
      setLoading(false);
    }
  }, [touchedMessage]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const normalised = normalisePhone(phone);

  // Has this person already been asked? Checked against the loaded log so the
  // warning appears as they type, before anything is sent.
  const alreadyAsked = useMemo(() => {
    if (!normalised) return null;
    return (data?.requests || []).find((r) => r.phone === normalised) || null;
  }, [normalised, data]);

  const pickContact = async () => {
    if (!Contacts?.presentContactPickerAsync) {
      Alert.alert(
        'Not available yet',
        'Choosing from contacts needs the latest version of the app. You can type the number in for now.'
      );
      return;
    }
    try {
      // System picker: it runs in the Contacts app and returns one contact, so
      // no contacts permission is requested and we never read the address book.
      const c = await Contacts.presentContactPickerAsync();
      if (!c) return;
      const num = c.phoneNumbers?.[0]?.number || '';
      if (!num) {
        Alert.alert('No number', `${c.name || 'That contact'} has no phone number saved.`);
        return;
      }
      setName(c.name || c.firstName || '');
      setPhone(num);
    } catch (e) {
      Alert.alert('Could not open contacts', e?.message || 'Type the number in instead.');
    }
  };

  /**
   * Parse a pasted blob into recipients. Accepts commas, spaces, newlines and
   * "Name 98765 43210" lines — people paste from wherever they keep the list,
   * and rejecting a format they already have just means they give up.
   */
  const addPasted = () => {
    const seen = new Set(queue.map((q) => q.phone));
    const added = [];
    const skipped = { dupe: 0, bad: 0 };

    for (const line of pasted.split(/[\n,;]+/)) {
      const raw = line.trim();
      if (!raw) continue;
      const digits = normalisePhone(raw);
      if (!digits) { skipped.bad += 1; continue; }
      if (seen.has(digits)) { skipped.dupe += 1; continue; }
      // Anything before the number is treated as the name.
      const label = raw.replace(/[+\d][\d\s()-]{6,}/, '').replace(/[^\p{L}\s.'-]/gu, '').trim();
      seen.add(digits);
      added.push({ name: label.slice(0, 60), phone: digits });
    }

    if (!added.length) {
      Alert.alert('Nothing added', 'No valid mobile numbers found in what you pasted.');
      return;
    }
    setQueue((q) => [...q, ...added]);
    setPasted('');
    const notes = [];
    if (skipped.dupe) notes.push(`${skipped.dupe} already in the list`);
    if (skipped.bad) notes.push(`${skipped.bad} not a valid number`);
    Alert.alert('Added', `${added.length} added.${notes.length ? ' Skipped: ' + notes.join(', ') + '.' : ''}`);
  };

  /** Add one contact from the system picker into the queue. */
  const addContactToQueue = async () => {
    if (!Contacts?.presentContactPickerAsync) {
      Alert.alert('Not available yet', 'Choosing from contacts needs the latest version of the app. Paste the numbers instead.');
      return;
    }
    try {
      const c = await Contacts.presentContactPickerAsync();
      if (!c) return;
      const digits = normalisePhone(c.phoneNumbers?.[0]?.number || '');
      if (!digits) {
        Alert.alert('No number', `${c.name || 'That contact'} has no usable phone number.`);
        return;
      }
      if (queue.some((q) => q.phone === digits)) {
        Alert.alert('Already added', 'That number is already in the list.');
        return;
      }
      setQueue((q) => [...q, { name: c.name || c.firstName || '', phone: digits }]);
    } catch (e) {
      Alert.alert('Could not open contacts', e?.message || 'Paste the numbers instead.');
    }
  };

  /** Who in the queue has already been asked before, from the log. */
  const askedBefore = useMemo(() => {
    const prev = new Set((data?.requests || []).map((r) => r.phone));
    return new Set(queue.filter((q) => prev.has(q.phone)).map((q) => q.phone));
  }, [queue, data]);

  /**
   * Send to the next person in the queue and remove them from it.
   * One at a time by necessity — the OS opens a single conversation per intent
   * — and by choice, because a human tap between each is what keeps this
   * personal outreach rather than a blast.
   */
  const sendNext = async (channel) => {
    const next = queue[0];
    if (!next) return;
    // Read from data, not the `link` const — that is declared further down the
    // component body, after the early returns, so closing over it here would be
    // a temporal-dead-zone hazard on any render that bails out early.
    if (!data?.review_link) {
      Alert.alert('No review link', 'Your Google review link is not available yet.');
      return;
    }
    setSending(true);
    try {
      const text = (next.name ? `Hi ${next.name}, ` : '') + message.trim();
      let url;
      if (channel === 'whatsapp') {
        url = `whatsapp://send?phone=${next.phone}&text=${encodeURIComponent(text)}`;
        const ok = await Linking.canOpenURL(url).catch(() => false);
        if (!ok) url = `https://wa.me/${next.phone}?text=${encodeURIComponent(text)}`;
      } else {
        const sep = Platform.OS === 'ios' ? '&' : '?';
        url = `sms:${next.phone}${sep}body=${encodeURIComponent(text)}`;
      }
      await Linking.openURL(url);
      await logReviewRequest({ name: next.name, phone: next.phone, channel });
      setQueue((q) => q.slice(1));
      await load();
    } catch (e) {
      Alert.alert('Could not send', e?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  /** Full text as the customer will receive it. */
  const buildText = () => (name.trim() ? `Hi ${name.trim()}, ` : '') + message.trim();

  const send = async (channel) => {
    if (!normalised) {
      Alert.alert('Check the number', 'Enter a valid mobile number, with the country code if it is not Indian.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Write a message', 'The message cannot be empty.');
      return;
    }
    const text = buildText();
    setSending(true);
    try {
      let url;
      if (channel === 'whatsapp') {
        url = `whatsapp://send?phone=${normalised}&text=${encodeURIComponent(text)}`;
        // Fall back to the web handler when WhatsApp is not installed.
        const ok = await Linking.canOpenURL(url).catch(() => false);
        if (!ok) url = `https://wa.me/${normalised}?text=${encodeURIComponent(text)}`;
      } else {
        // iOS separates the body with &, Android with ?. Getting this wrong
        // opens the composer with an empty message.
        const sep = Platform.OS === 'ios' ? '&' : '?';
        url = `sms:${normalised}${sep}body=${encodeURIComponent(text)}`;
      }
      await Linking.openURL(url);

      // Logged after the hand-off, so the log reflects what was actually sent
      // as closely as we can know it.
      await logReviewRequest({ name: name.trim(), phone: normalised, channel });
      setName('');
      setPhone('');
      await load();
    } catch (e) {
      Alert.alert('Could not send', e?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    const r = await copyText(data?.review_link || '');
    if (r?.ok) Alert.alert('Copied', 'Your Google review link is on the clipboard.');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>🙋</Text>
        <Text style={styles.errTitle}>Could not load</Text>
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

  const link = data?.review_link || '';
  const requests = data?.requests || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigate('google-reviews')}>
        <Text style={styles.backText}>← Google Reviews</Text>
      </TouchableOpacity>

      {/* The link itself */}
      {link ? (
        <View style={styles.linkCard}>
          <Text style={styles.linkLabel}>Your Google review link</Text>
          <Text style={styles.linkText} numberOfLines={2}>{link}</Text>
          <TouchableOpacity style={styles.linkBtn} onPress={copyLink}>
            <Text style={styles.linkBtnText}>📋 Copy link</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.warnCard}>
          <Text style={styles.warnTitle}>No review link yet</Text>
          <Text style={styles.warnText}>
            Google has not published a review link for this listing. This usually means the
            listing is still being verified. Once it is live the link appears here automatically.
          </Text>
        </View>
      )}

      {/* Bulk queue */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.bulkHead}
          onPress={() => setBulkOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Ask several customers</Text>
            <Text style={styles.bulkSub}>
              {queue.length
                ? `${queue.length} waiting${askedBefore.size ? ` · ${askedBefore.size} asked before` : ''}`
                : 'Paste a list of numbers, or add contacts one by one'}
            </Text>
          </View>
          <Text style={styles.bulkChevron}>{bulkOpen ? '\u2212' : '+'}</Text>
        </TouchableOpacity>

        {bulkOpen && (
          <>
            <Text style={styles.label}>Paste numbers</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={pasted}
              onChangeText={setPasted}
              multiline
              textAlignVertical="top"
              placeholder={'One per line, or separated by commas.\nA name before the number is picked up too:\nRahul 9876543210'}
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.bulkAddRow}>
              <TouchableOpacity
                style={[styles.addBtn, !pasted.trim() && { opacity: 0.4 }]}
                onPress={addPasted}
                disabled={!pasted.trim()}
              >
                <Text style={styles.addBtnText}>Add to list</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addGhost} onPress={addContactToQueue}>
                <Text style={styles.addGhostText}>👤 Add a contact</Text>
              </TouchableOpacity>
            </View>

            {queue.length > 0 && (
              <>
                <View style={styles.queueHead}>
                  <Text style={styles.queueTitle}>Next up</Text>
                  <TouchableOpacity onPress={() => setQueue([])}>
                    <Text style={styles.queueClear}>Clear all</Text>
                  </TouchableOpacity>
                </View>

                {queue.slice(0, 8).map((q, i) => (
                  <View key={q.phone} style={styles.queueRow}>
                    <Text style={[styles.queueIdx, i === 0 && styles.queueIdxNow]}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.queueName}>{q.name || q.phone}</Text>
                      <Text style={styles.queueMeta}>
                        {q.name ? q.phone : ''}
                        {askedBefore.has(q.phone) ? (q.name ? ' · ' : '') + 'asked before' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setQueue((list) => list.filter((x) => x.phone !== q.phone))}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.queueDrop}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {queue.length > 8 && (
                  <Text style={styles.queueMore}>and {queue.length - 8} more</Text>
                )}

                <View style={styles.sendRow}>
                  <TouchableOpacity
                    style={[styles.sendBtn, styles.waBtn, (!link || sending) && { opacity: 0.5 }]}
                    onPress={() => sendNext('whatsapp')}
                    disabled={!link || sending}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sendBtnText}>
                      {sending ? 'Opening…' : `💬  Send to ${queue[0]?.name || queue[0]?.phone}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendBtn, styles.smsBtn, { flex: 0, paddingHorizontal: 18 }, (!link || sending) && { opacity: 0.5 }]}
                    onPress={() => sendNext('sms')}
                    disabled={!link || sending}
                  >
                    <Text style={[styles.sendBtnText, { color: COLORS.primary }]}>✉️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  One at a time — WhatsApp opens a single chat per message, so you press send there and
                  come back. Each one is logged and drops off the list automatically.
                </Text>
              </>
            )}
          </>
        )}
      </View>

      {/* Compose */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ask a customer</Text>

        <TouchableOpacity style={styles.contactBtn} onPress={pickContact} activeOpacity={0.85}>
          <Text style={styles.contactBtnText}>👤  Choose from contacts</Text>
        </TouchableOpacity>
        <Text style={styles.orLine}>or enter the number yourself</Text>

        <Text style={styles.label}>Customer name <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rahul"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit number, or with country code"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />
        {!!phone.trim() && !normalised && (
          <Text style={styles.fieldWarn}>That is not enough digits for a mobile number.</Text>
        )}
        {!!alreadyAsked && (
          <Text style={styles.fieldWarn}>
            You already asked this number on {fmtDate(alreadyAsked.created_at)}. Asking again
            soon tends to annoy rather than persuade.
          </Text>
        )}

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={(v) => { setTouchedMessage(true); setMessage(v); }}
          multiline
          textAlignVertical="top"
          placeholder="Write the message your customer will receive…"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.hint}>
          {name.trim() ? `Sends as: “Hi ${name.trim()}, …”` : 'Add a name and it opens with “Hi <name>,”.'}
          {'  '}Never offer a discount or gift for a review — Google removes reviews obtained that way
          and can suspend the listing.
        </Text>

        <View style={styles.sendRow}>
          <TouchableOpacity
            style={[styles.sendBtn, styles.waBtn, (!link || sending) && { opacity: 0.5 }]}
            onPress={() => send('whatsapp')}
            disabled={!link || sending}
            activeOpacity={0.85}
          >
            <Text style={styles.sendBtnText}>{sending ? 'Opening…' : '💬  WhatsApp'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, styles.smsBtn, (!link || sending) && { opacity: 0.5 }]}
            onPress={() => send('sms')}
            disabled={!link || sending}
            activeOpacity={0.85}
          >
            <Text style={[styles.sendBtnText, { color: COLORS.primary }]}>✉️  SMS</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Opens your own WhatsApp or Messages app with the text ready — you press send there.
        </Text>
      </View>

      {/* Log */}
      <Text style={styles.logHeader}>
        Requests sent {requests.length > 0 ? `· ${requests.length}` : ''}
      </Text>
      {requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.bigIcon}>🙋</Text>
          <Text style={styles.errText}>
            No requests yet. Everyone you ask is listed here, so you can see who has already
            been contacted.
          </Text>
        </View>
      ) : requests.map((r) => (
        <View key={r.id} style={styles.logRow}>
          <Text style={styles.logIcon}>{CHANNEL_ICON[r.channel] || '💬'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.logName}>{r.customer_name || r.phone}</Text>
            <Text style={styles.logMeta}>
              {r.customer_name ? `${r.phone} · ` : ''}{fmtDate(r.created_at)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setName(r.customer_name || ''); setPhone(r.phone); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.logAgain}>Again</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
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

  linkCard: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, marginBottom: 14,
  },
  linkLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  linkText: { fontSize: 12.5, color: '#fff', marginTop: 4, lineHeight: 18 },
  linkBtn: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  linkBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  warnCard: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 12, padding: 14, marginBottom: 14,
  },
  warnTitle: { fontSize: 14, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  warnText: { fontSize: 12.5, color: '#92400e', lineHeight: 18 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },

  contactBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  contactBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  orLine: { fontSize: 11.5, color: COLORS.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 4 },

  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  optional: { fontWeight: '500', color: COLORS.textMuted },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background,
  },
  textarea: { minHeight: 110, paddingTop: 10 },
  fieldWarn: { fontSize: 11.5, color: '#b45309', marginTop: 6, lineHeight: 16 },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, lineHeight: 16 },

  sendRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sendBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  waBtn: { backgroundColor: '#25d366' },
  smsBtn: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.primary },
  sendBtnText: { fontSize: 13.5, fontWeight: '800', color: '#fff' },

  logHeader: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, marginBottom: 8,
  },
  logIcon: { fontSize: 18 },
  logName: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  logMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
  logAgain: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  bulkHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulkSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 17 },
  bulkChevron: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  bulkAddRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  addGhost: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  addGhostText: { color: COLORS.primary, fontWeight: '800', fontSize: 12.5 },

  queueHead: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 6 },
  queueTitle: {
    flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  queueClear: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  queueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 9,
  },
  queueIdx: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.border,
    color: COLORS.textMuted, fontSize: 11, fontWeight: '800',
    textAlign: 'center', lineHeight: 22, overflow: 'hidden',
  },
  queueIdxNow: { backgroundColor: COLORS.primary, color: '#fff' },
  queueName: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  queueMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 },
  queueDrop: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  queueMore: { fontSize: 12, color: COLORS.textMuted, paddingTop: 8 },
});
