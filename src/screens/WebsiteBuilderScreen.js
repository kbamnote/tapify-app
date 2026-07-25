import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Linking, Modal, ScrollView,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';
import { useNavigation } from '../context/NavigationContext';

/**
 * Website Builder — builder sites.
 * GET /api/sites/list.php -> { sites, can_create, can_delete }
 *
 * Clients see & edit only the site assigned to them (no create/delete). Admins
 * and staff can create a new website and assign it to a client; admins can also
 * delete. "Edit" opens the native editor; "View Live" opens the published site
 * in the phone's browser (no embedding).
 */

const liveUrl = (slug) => `https://${slug}.tapify.co.in`;
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63);

export default function WebsiteBuilderScreen() {
  const { navigate } = useNavigation();
  const [sites, setSites]        = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/sites/list.php');
      setSites(res.data?.sites || []);
      setCanCreate(!!res.data?.can_create);
      setCanDelete(!!res.data?.can_delete);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefresh(true); await load(); setRefresh(false); };

  const viewLive = (site) => {
    if (!site.published_at) {
      Alert.alert('Not published yet', 'Publish this website first, then you can view it live.');
      return;
    }
    Linking.openURL(liveUrl(site.slug));
  };

  const remove = (site) => {
    Alert.alert('Delete website?', `Delete "${site.name || site.slug}" permanently? This cannot be undone.`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setDeletingId(site.id);
          await fetchApi('/api/sites/delete.php', { method: 'POST', body: JSON.stringify({ site_id: site.id }) });
          setSites((prev) => prev.filter((s) => s.id !== site.id));
        } catch (e) {
          Alert.alert('Could not delete', e.message);
        } finally {
          setDeletingId(null);
        }
      } },
    ]);
  };

  const renderItem = ({ item }) => {
    const published = !!item.published_at;
    return (
      <GlassCard style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name || item.slug}</Text>
          <View style={[styles.badge, { backgroundColor: (published ? COLORS.success : COLORS.accent) + '20' }]}>
            <Text style={[styles.badgeText, { color: published ? COLORS.success : COLORS.accent }]}>
              {item.status === 'disabled' ? 'Disabled' : published ? 'Live' : 'Draft'}
            </Text>
          </View>
        </View>
        <Text style={styles.url}>{item.slug}.tapify.co.in</Text>
        {(item.owner_name || item.owner_email) ? (
          <Text style={styles.owner}>Client: {item.owner_name || item.owner_email}</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.editBtn]}
            onPress={() => navigate('site-editor', { siteId: item.id, slug: item.slug, name: item.name })}
          >
            <Text style={styles.editText}>✎  Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.liveBtn]} onPress={() => viewLive(item)}>
            <Text style={styles.liveText}>↗  View Live</Text>
          </TouchableOpacity>
          {canDelete ? (
            <TouchableOpacity style={[styles.btn, styles.delBtn]} disabled={deletingId === item.id} onPress={() => remove(item)}>
              {deletingId === item.id ? <ActivityIndicator color={COLORS.error} /> : <Text style={styles.delText}>🗑</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={sites}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.headerRow}>
              <Text style={styles.hint}>
                {canCreate ? 'Create a website and assign it to a client. Edit & publish anytime.' : 'Edit your website content and publish — changes go live instantly.'}
              </Text>
              {canCreate ? (
                <TouchableOpacity style={styles.newBtn} onPress={() => setCreateOpen(true)}>
                  <Text style={styles.newBtnText}>＋ New Website</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {canCreate ? 'No websites yet. Tap “New Website” to create one.' : 'No website assigned yet. It will appear here once our team sets it up for you.'}
              </Text>
            </View>
          }
        />
      )}

      <CreateSiteModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(site) => {
          setCreateOpen(false);
          if (site?.id) navigate('site-editor', { siteId: site.id, slug: site.slug, name: site.name });
          else load();
        }}
      />
    </View>
  );
}

/** Create + assign a new website (admin/staff only). */
function CreateSiteModal({ visible, onClose, onCreated }) {
  const [name, setName]           = useState('');
  const [slug, setSlug]           = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [industry, setIndustry]   = useState('');
  const [assignTo, setAssignTo]   = useState(null);
  const [users, setUsers]         = useState([]);
  const [industries, setIndustries] = useState([]);
  const [search, setSearch]       = useState('');
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(''); setSlug(''); setSlugTouched(false); setIndustry(''); setAssignTo(null); setSearch('');
    (async () => {
      try {
        const [schema, us] = await Promise.all([
          fetchApi('/api/sites/schema.php'),
          fetchApi('/api/admin/users/list.php'),
        ]);
        setIndustries(schema.data?.industries || []);
        setUsers((us.data?.users || []).filter((u) => u.role !== 'admin'));
      } catch { /* best-effort; form still works with just a name */ }
    })();
  }, [visible]);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Enter a business name.'); return; }
    try {
      setBusy(true);
      const res = await fetchApi('/api/sites/create.php', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          slug: effectiveSlug || undefined,
          industry: industry || undefined,
          user_id: assignTo || undefined,
        }),
      });
      onCreated(res.data?.site);
    } catch (e) {
      Alert.alert('Could not create', e.message);
    } finally {
      setBusy(false);
    }
  };

  const shownUsers = search.trim()
    ? users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    : users;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New website</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '78%' }}>
            <Text style={styles.label}>Business name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Impulsse Career Institutions" placeholderTextColor={COLORS.textMuted} autoFocus />

            <Text style={styles.label}>Web address</Text>
            <View style={styles.slugRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={effectiveSlug}
                onChangeText={(t) => { setSlugTouched(true); setSlug(t.toLowerCase()); }}
                placeholder="impulsse" placeholderTextColor={COLORS.textMuted} autoCapitalize="none"
              />
              <Text style={styles.slugSuffix}>.tapify.co.in</Text>
            </View>

            {industries.length > 0 && (
              <>
                <Text style={styles.label}>Industry</Text>
                <View style={styles.chipRow}>
                  {industries.map((i) => {
                    const on = industry === i.id;
                    return (
                      <TouchableOpacity key={i.id} onPress={() => setIndustry(on ? '' : i.id)}
                        style={[styles.chip, on && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                        <Text style={[styles.chipText, on && { color: '#fff' }]}>{i.label || i.id}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.label}>Assign to client</Text>
            <TextInput style={styles.input} value={search} onChangeText={setSearch}
              placeholder="Search clients…" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity onPress={() => setAssignTo(null)}
              style={[styles.userRow, assignTo === null && styles.userRowOn]}>
              <Text style={styles.userName}>— Keep for myself —</Text>
            </TouchableOpacity>
            {shownUsers.map((u) => {
              const on = assignTo === u.id;
              return (
                <TouchableOpacity key={u.id} onPress={() => setAssignTo(u.id)}
                  style={[styles.userRow, on && styles.userRowOn]}>
                  <Text style={styles.userName}>{u.name || u.email}{u.role !== 'user' ? `  ·  ${u.role}` : ''}</Text>
                  {u.email ? <Text style={styles.userEmail}>{u.email}</Text> : null}
                </TouchableOpacity>
              );
            })}
            <Text style={styles.assignNote}>The client can edit & view this website — but not create or delete any.</Text>
          </ScrollView>

          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.mBtn, styles.mCancel]} onPress={onClose} disabled={busy}>
              <Text style={styles.mCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mBtn, styles.mCreate]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.mCreateText}>Create website</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  listContent: { padding: 16, paddingBottom: 40 },

  headerRow: { marginBottom: 12 },
  hint: { fontSize: 12.5, color: COLORS.textMuted, marginHorizontal: 2, marginBottom: 10 },
  newBtn: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 16, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },

  card: { padding: 16, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  url: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 4 },
  owner: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 3, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flex: 1, backgroundColor: COLORS.primary },
  editText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  liveBtn: { flex: 1, backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  liveText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  delBtn: { width: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fca5a5' },
  delText: { fontSize: 16 },

  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 8 },

  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  slugRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slugSuffix: { fontSize: 12, color: COLORS.textMuted },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  chipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textMuted },

  userRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', marginTop: 8 },
  userRowOn: { borderColor: COLORS.primary, backgroundColor: 'rgba(21,62,63,0.06)' },
  userName: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 },
  assignNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 10 },

  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 14 },
  mBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  mCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  mCreate: { backgroundColor: COLORS.primary },
  mCreateText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
