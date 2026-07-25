import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Linking, Alert, Switch, Platform, Modal, StyleSheet, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../theme/colors';
import * as social from '../services/socialApi';

const PLATFORM_META = {
  facebook:  { icon: '📘', label: 'Facebook' },
  instagram: { icon: '📷', label: 'Instagram' },
  linkedin:  { icon: '💼', label: 'LinkedIn' },
};
const platformIcon = (p) => (PLATFORM_META[p]?.icon || '🔗');

const STATUS_COLOR = { published: '#059669', partial: '#b45309', failed: '#dc2626', scheduled: '#2563eb', publishing: '#6b7280' };

export default function SocialScreen() {
  const [tab, setTab] = useState('compose');

  const [connections, setConnections] = useState([]);
  const [connectable, setConnectable] = useState([]);
  const [loadingConns, setLoadingConns] = useState(true);

  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState([]);          // [{type,url}]
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);   // Android: 'date' | 'time' | null
  const [tempDate, setTempDate] = useState(null);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadConnections = useCallback(async () => {
    try {
      const data = await social.getConnections();
      setConnections(data.connections || []);
      setConnectable(data.connectable || []);
    } catch (e) {
      setError(e.message || 'Could not load connections');
    } finally {
      setLoadingConns(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try { setPosts(await social.getPosts(30)); }
    catch (e) { /* keep prior */ }
    finally { setLoadingPosts(false); }
  }, []);

  useEffect(() => { loadConnections(); loadPosts(); }, [loadConnections, loadPosts]);

  // Deep-link return from the OAuth browser flow.
  useEffect(() => {
    const onUrl = ({ url }) => {
      if (!url || url.indexOf('social-connected') === -1) return;
      if (/[?&]status=success/.test(url)) loadConnections();
      else setError('Connection was cancelled or failed. Please try again.');
    };
    const sub = Linking.addEventListener('url', onUrl);
    Linking.getInitialURL().then((url) => { if (url) onUrl({ url }); });
    return () => sub.remove();
  }, [loadConnections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadConnections(), loadPosts()]);
    setRefreshing(false);
  }, [loadConnections, loadPosts]);

  // ── Connections ─────────────────────────────────────────────────────────────
  const connect = async (platform) => {
    setError(null);
    try {
      const url = await social.getConnectUrl(platform);
      if (!url) throw new Error('Could not start sign-in.');
      await Linking.openURL(url);
    } catch (e) {
      setError(e.message || 'Could not open sign-in.');
    }
  };

  const doDisconnect = (conn) => {
    Alert.alert('Disconnect', `Remove ${conn.account_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive',
        onPress: async () => {
          try {
            await social.disconnect(conn.id);
            setSelectedIds((prev) => prev.filter((id) => id !== conn.id));
            await loadConnections();
          } catch (e) { setError(e.message); }
        },
      },
    ]);
  };

  // ── Composer ─────────────────────────────────────────────────────────────────
  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo/video access to attach media.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setUploading(true);
    setError(null);
    try {
      const m = await social.uploadMedia({ uri: a.uri, type: a.type, fileName: a.fileName, mimeType: a.mimeType });
      setMedia((prev) => [...prev, m]);
    } catch (e) {
      setError(e.message || 'Media upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (i) => setMedia((prev) => prev.filter((_, idx) => idx !== i));
  const toggleAccount = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onDateTimeChange = (event, date) => {
    if (event.type === 'dismissed' || !date) { setPickerMode(null); return; }
    if (pickerMode === 'date') {
      setTempDate(date);
      setPickerMode('time');
    } else {
      const d = new Date(tempDate || date);
      d.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setScheduledDate(d);
      setPickerMode(null);
    }
  };

  const submit = async () => {
    if (!caption.trim() && media.length === 0) { setError('Add a caption or media first.'); return; }
    if (selectedIds.length === 0) { setError('Select at least one account to post to.'); return; }
    if (scheduleOn && (!scheduledDate || scheduledDate.getTime() < Date.now() + 60000)) {
      setError('Pick a schedule time at least a minute in the future.');
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const result = await social.publish({
        caption: caption.trim(),
        media,
        connectionIds: selectedIds,
        scheduledAt: scheduleOn && scheduledDate ? scheduledDate.toISOString() : null,
      });
      const scheduled = result.status === 'scheduled';
      Alert.alert(
        scheduled ? 'Scheduled' : (result.status === 'failed' ? 'Failed' : 'Posted'),
        scheduled ? 'Your post is scheduled.' :
          result.status === 'partial' ? 'Posted to some accounts; check History for details.' :
          result.status === 'failed' ? 'Posting failed. Check History for details.' :
          'Your post was published!'
      );
      // reset composer
      setCaption(''); setMedia([]); setSelectedIds([]); setScheduleOn(false); setScheduledDate(null);
      loadPosts();
      setTab('history');
    } catch (e) {
      setError(e.message || 'Could not publish. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['compose', 'history'].map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); if (t === 'history') loadPosts(); }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'compose' ? '✍️ Compose' : '🕘 History'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View>}

        {tab === 'compose' ? (
          <>
            {/* Connections */}
            <Text style={styles.sectionLabel}>Connected Accounts</Text>
            {loadingConns ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.connWrap}>
                {connections.map((c) => {
                  const on = selectedIds.includes(c.id);
                  return (
                    <TouchableOpacity key={c.id} style={[styles.connChip, on && styles.connChipOn]} onPress={() => toggleAccount(c.id)} onLongPress={() => doDisconnect(c)}>
                      <Text style={styles.connIcon}>{platformIcon(c.platform)}</Text>
                      <Text style={[styles.connName, on && styles.connNameOn]} numberOfLines={1}>{c.account_name}</Text>
                      {on && <Text style={styles.connCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
                {connections.length === 0 && <Text style={styles.muted}>No accounts connected yet.</Text>}
              </View>
            )}
            <Text style={styles.hint}>Tap to select where to post · long-press to disconnect</Text>

            {/* Connect buttons */}
            <View style={styles.connectRow}>
              {connectable.map((p) => (
                <TouchableOpacity key={p} style={styles.connectBtn} onPress={() => connect(p)}>
                  <Text style={styles.connectBtnText}>
                    {p === 'facebook'
                      ? '📘 📷  Connect Facebook & Instagram'
                      : `${platformIcon(p)} Connect ${PLATFORM_META[p]?.label || p}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {connectable.includes('facebook') && (
              <Text style={styles.hint}>
                Instagram connects through Facebook — connecting your Page also links its Instagram Business account.
              </Text>
            )}

            {/* Composer */}
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Your Post</Text>
            <TextInput
              style={styles.caption}
              value={caption}
              onChangeText={setCaption}
              placeholder="Write your caption…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
            />

            {media.length > 0 && (
              <View style={styles.mediaWrap}>
                {media.map((m, i) => (
                  <View key={i} style={styles.mediaItem}>
                    {m.type === 'video'
                      ? <View style={styles.videoThumb}><Text style={{ fontSize: 24 }}>🎬</Text></View>
                      : <Image source={{ uri: m.url }} style={styles.mediaThumb} />}
                    <TouchableOpacity style={styles.mediaRemove} onPress={() => removeMedia(i)}><Text style={styles.mediaRemoveText}>✕</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia} disabled={uploading}>
              {uploading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.addMediaText}>＋ Add photo / video</Text>}
            </TouchableOpacity>

            {/* Schedule */}
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Schedule for later</Text>
              <Switch
                value={scheduleOn}
                onValueChange={(v) => { setScheduleOn(v); if (!v) { setPickerMode(null); setIosPickerVisible(false); } }}
                trackColor={{ false: '#d1d5db', true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            {scheduleOn && (
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => {
                  setTempDate(scheduledDate || new Date(Date.now() + 3600000));
                  if (Platform.OS === 'ios') setIosPickerVisible(true);
                  else setPickerMode('date');
                }}
              >
                <Text style={styles.dateBtnText}>
                  {scheduledDate ? `📅 ${scheduledDate.toLocaleString()}` : '📅 Pick date & time'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Android: native date → time dialogs */}
            {Platform.OS !== 'ios' && pickerMode && (
              <DateTimePicker
                value={tempDate || new Date()}
                mode={pickerMode}
                is24Hour={false}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                onChange={onDateTimeChange}
              />
            )}

            {/* iOS: spinner inside a modal with explicit Done / Cancel (iOS onChange
                fires continuously and has no 'dismissed' event, so we commit only on Done). */}
            {Platform.OS === 'ios' && (
              <Modal visible={iosPickerVisible} transparent animationType="slide" onRequestClose={() => setIosPickerVisible(false)}>
                <View style={styles.iosOverlay}>
                  <View style={styles.iosSheet}>
                    <View style={styles.iosBar}>
                      <TouchableOpacity onPress={() => setIosPickerVisible(false)}>
                        <Text style={styles.iosCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { if (tempDate) setScheduledDate(tempDate); setIosPickerVisible(false); }}>
                        <Text style={styles.iosDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDate || new Date()}
                      mode="datetime"
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={(e, d) => { if (d) setTempDate(d); }}
                    />
                  </View>
                </View>
              </Modal>
            )}

            <TouchableOpacity style={[styles.submitBtn, posting && { opacity: 0.6 }]} onPress={submit} disabled={posting}>
              {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{scheduleOn ? '🕘 Schedule Post' : '🚀 Post Now'}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          /* ── History ── */
          <>
            {loadingPosts ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
            ) : posts.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyIcon}>🕘</Text><Text style={styles.muted}>No posts yet.</Text></View>
            ) : posts.map((p) => (
              <View key={p.id} style={styles.postCard}>
                <View style={styles.postHead}>
                  <Text style={[styles.postStatus, { color: STATUS_COLOR[p.status] || COLORS.textMuted }]}>{(p.status || '').toUpperCase()}</Text>
                  <Text style={styles.postDate}>
                    {p.status === 'scheduled' && p.scheduled_at ? `for ${fmtUTC(p.scheduled_at)}` : fmtUTC(p.published_at || p.created_at)}
                  </Text>
                </View>
                {!!p.caption && <Text style={styles.postCaption} numberOfLines={3}>{p.caption}</Text>}
                {Array.isArray(p.media) && p.media.length > 0 && (
                  <Text style={styles.postMedia}>{p.media.length} media attached</Text>
                )}
                <View style={styles.targets}>
                  {(p.targets || []).map((t, i) => (
                    <Text key={i} style={styles.target}>
                      {platformIcon(t.platform)} {t.account_name || t.platform}: <Text style={{ color: STATUS_COLOR[t.status] || COLORS.textMuted, fontWeight: '700' }}>{t.status}</Text>
                      {t.error ? ` — ${t.error}` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Server datetimes are UTC (no tz). Parse as UTC → show local. */
function fmtUTC(s) {
  if (!s) return '';
  try {
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch (_) { return s; }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(21,62,63,0.08)' },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 60 },

  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  connWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  connChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, maxWidth: '100%' },
  connChipOn: { borderColor: COLORS.primary, backgroundColor: 'rgba(21,62,63,0.06)' },
  connIcon: { fontSize: 16, marginRight: 6 },
  connName: { fontSize: 13, color: COLORS.text, fontWeight: '600', maxWidth: 160 },
  connNameOn: { color: COLORS.primary },
  connCheck: { marginLeft: 6, color: COLORS.primary, fontWeight: '900' },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  muted: { color: COLORS.textMuted, fontSize: 13 },

  connectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  connectBtn: { backgroundColor: 'rgba(21,62,63,0.06)', borderWidth: 1, borderColor: 'rgba(21,62,63,0.14)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  connectBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  caption: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(21,62,63,0.12)', borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text, minHeight: 120 },
  mediaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  mediaItem: { position: 'relative' },
  mediaThumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: COLORS.border },
  videoThumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  mediaRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#111827', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  addMediaBtn: { marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(21,62,63,0.2)', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addMediaText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  scheduleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  dateBtn: { marginTop: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(21,62,63,0.12)', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14 },
  dateBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  iosOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  iosSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  iosBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iosCancel: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
  iosDone: { fontSize: 15, color: COLORS.primary, fontWeight: '800' },

  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 22 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  postCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  postHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  postStatus: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  postDate: { fontSize: 11, color: COLORS.textMuted },
  postCaption: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 6 },
  postMedia: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  targets: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, gap: 4 },
  target: { fontSize: 12, color: COLORS.text },

  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
});
