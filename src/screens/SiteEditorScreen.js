import React, { useState, useEffect, useRef, useReducer } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, Switch,
  ActivityIndicator, Alert, ScrollView, Linking, Image, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi, API_BASE } from '../config';
import { useNavigation } from '../context/NavigationContext';

/**
 * Native website editor — form-based, schema-driven.
 *
 * Loads the builder schema (section manifests) + the site's DRAFT document, and
 * lets the user edit the simple content fields (text / textarea / toggle /
 * number / select / link) of every section, plus Business Info and the site
 * name. Complex fields (images, lists, galleries) stay on the web editor and are
 * shown as read-only notes so nothing is silently lost.
 *
 * Save Draft -> /api/sites/save-draft.php   (optimistic-locked by `rev`)
 * Publish    -> /api/sites/publish.php      (makes it live instantly)
 * View Live  -> opens https://<slug>.tapify.co.in in the phone browser
 */

const SCALAR = ['text', 'textarea', 'toggle', 'number', 'select', 'link'];
const liveUrl = (slug) => `https://${slug}.tapify.co.in`;

// Any media field (image or video) is editable in-app; MediaField picks the
// right picker type from field.accept. Other complex types (repeater/crop/…) too.
const isMediaField = (f) => f.type === 'media';
const isEditable = (f) => SCALAR.includes(f.type) || isMediaField(f);

// Resolve a stored value ("media:<id>" or a full URL) to a previewable URL.
const mediaPreview = (v) => {
  if (!v || typeof v !== 'string') return null;
  if (v.startsWith('media:')) return `${API_BASE}/api/sites/media.php?id=${v.slice(6)}`;
  if (/^https?:\/\//.test(v)) return v;
  return null;
};

/**
 * Image field — preview + pick-from-phone + upload to media.php. Keeps its own
 * local value so it re-renders on upload without needing a parent re-render
 * (the parent uses an uncontrolled docRef for smooth typing).
 */
function MediaField({ field, value, onChange, siteId }) {
  const kinds = Array.isArray(field.accept) && field.accept.length ? field.accept : ['image'];
  const videoOnly = kinds.includes('video') && !kinds.includes('image');
  const allowsVideo = kinds.includes('video');

  const [local, setLocal] = useState(value);
  const [busy, setBusy]   = useState(false);
  const [isVid, setIsVid] = useState(videoOnly && !!value);
  // Reflect external value changes (e.g. a repeater item being reordered). At
  // section level `value` never changes (uncontrolled docRef), so this is inert.
  useEffect(() => { setLocal(value); setIsVid(videoOnly && !!value); }, [value]);
  const preview = mediaPreview(local);

  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access to upload a file.'); return; }
      const MT = ImagePicker.MediaTypeOptions;
      const mediaTypes = MT
        ? (videoOnly ? MT.Videos : allowsVideo ? MT.All : MT.Images)
        : (videoOnly ? ['videos'] : allowsVideo ? ['images', 'videos'] : ['images']);
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.85 });
      if (res.canceled) return;
      const asset = res.assets[0];
      const vid = asset.type === 'video' || /^video\//.test(asset.mimeType || '');
      setBusy(true);
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName || (vid ? 'video.mp4' : 'photo.jpg'),
        type: asset.mimeType || (vid ? 'video/mp4' : 'image/jpeg'),
      });
      if (siteId) form.append('site_id', String(siteId));
      const up = await fetchApi('/api/sites/media.php', { method: 'POST', body: form });
      const ref = up.data?.ref;
      if (ref) { setLocal(ref); setIsVid(vid); onChange(ref); }
      else Alert.alert('Upload failed', 'The server did not return a media reference.');
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => { setLocal(''); setIsVid(false); onChange(''); };
  const uploadLabel = local ? 'Replace' : videoOnly ? 'Upload video' : allowsVideo ? 'Upload file' : 'Upload image';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{field.label || field.key}</Text>
      {local && isVid ? (
        <View style={styles.mediaVideo}><Text style={styles.mediaVideoText}>🎬  Video uploaded</Text></View>
      ) : preview ? (
        <Image source={{ uri: preview }} style={styles.mediaPreview} resizeMode="cover" />
      ) : (
        <View style={styles.mediaEmpty}><Text style={styles.mediaEmptyText}>{videoOnly ? 'No video' : 'No image'}</Text></View>
      )}
      <View style={styles.mediaActions}>
        <TouchableOpacity style={[styles.mediaBtn, styles.mediaUpload]} onPress={pick} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.mediaUploadText}>{uploadLabel}</Text>}
        </TouchableOpacity>
        {local ? (
          <TouchableOpacity style={[styles.mediaBtn, styles.mediaRemove]} onPress={remove} disabled={busy}>
            <Text style={styles.mediaRemoveText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/** A single CONTROLLED scalar field — used inside repeater items (which are
 *  managed as React state, so their inputs must reflect prop changes on reorder). */
function SubField({ field, value, onChange }) {
  const norm = (v) => (v == null ? '' : String(v));
  switch (field.type) {
    case 'textarea':
      return (
        <View style={styles.field}>
          <Text style={styles.subLabel}>{field.label || field.key}</Text>
          <TextInput style={[styles.input, styles.textarea]} value={norm(value)} onChangeText={onChange}
            multiline placeholder={field.placeholder || ''} placeholderTextColor={COLORS.textMuted} />
        </View>
      );
    case 'toggle':
      return (
        <View style={[styles.field, styles.rowField]}>
          <Text style={[styles.subLabel, { flex: 1, marginBottom: 0 }]}>{field.label || field.key}</Text>
          <Switch value={value === undefined ? !!field.default : !!value} onValueChange={onChange}
            trackColor={{ true: COLORS.primary }} thumbColor="#fff" />
        </View>
      );
    case 'number':
      return (
        <View style={styles.field}>
          <Text style={styles.subLabel}>{field.label || field.key}</Text>
          <TextInput style={styles.input} value={norm(value)} onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
        </View>
      );
    case 'select': {
      const opts = (field.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
      return (
        <View style={styles.field}>
          <Text style={styles.subLabel}>{field.label || field.key}</Text>
          <View style={styles.chipRow}>
            {opts.map((o) => {
              const active = norm(value) === norm(o.value);
              return (
                <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)}
                  style={[styles.selChip, active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                  <Text style={[styles.selChipText, active && { color: '#fff' }]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    case 'link': {
      const lv = value && typeof value === 'object' ? value : {};
      return (
        <View style={styles.field}>
          <Text style={styles.subLabel}>{field.label || field.key} (button)</Text>
          <TextInput style={styles.input} value={norm(lv.text)} onChangeText={(t) => onChange({ ...lv, text: t })}
            placeholder="Button text" placeholderTextColor={COLORS.textMuted} />
          <TextInput style={[styles.input, { marginTop: 8 }]} value={norm(lv.href)} onChangeText={(t) => onChange({ ...lv, href: t })}
            placeholder="Link" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
        </View>
      );
    }
    default:
      return (
        <View style={styles.field}>
          <Text style={styles.subLabel}>{field.label || field.key}</Text>
          <TextInput style={styles.input} value={norm(value)} onChangeText={onChange}
            placeholder={field.placeholder || ''} placeholderTextColor={COLORS.textMuted} />
        </View>
      );
  }
}

/**
 * Repeater — an editable list of items (gallery photos, services, team, …).
 * Each item is a mini-form of the repeater's sub-fields. Supports add / remove /
 * reorder. Held in React state (source of truth) and mirrored to the doc via
 * onChange so reordering re-renders correctly.
 */
function RepeaterField({ field, value, onChange, siteId }) {
  const [items, setItems] = useState(Array.isArray(value) ? value : []);
  const subFields = field.fields || [];
  const max = field.max || 100;

  const commit = (next) => { setItems(next); onChange(next); };
  const setSub = (i, key, v) => commit(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const addItem = () => {
    if (items.length >= max) { Alert.alert('Limit reached', `Up to ${max} items allowed.`); return; }
    const blank = {};
    subFields.forEach((f) => { if (f.default !== undefined) blank[f.key] = f.default; });
    commit([...items, blank]);
  };
  const removeItem = (i) =>
    Alert.alert('Remove item?', 'This item will be removed from the section.', [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => commit(items.filter((_, idx) => idx !== i)) },
    ]);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const editableSubs = subFields.filter(isEditable);
  const complexSubs  = subFields.filter((f) => !isEditable(f));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{field.label || field.key} ({items.length})</Text>
      {items.length === 0 && <Text style={styles.cardSub}>{field.emptyHint || 'No items yet — add one below.'}</Text>}

      {items.map((item, i) => (
        <View key={i} style={styles.repItem}>
          <View style={styles.repItemHead}>
            <Text style={styles.repItemTitle}>#{i + 1}</Text>
            <View style={styles.repItemBtns}>
              <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0}>
                <Text style={[styles.repMove, i === 0 && styles.repMoveOff]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => move(i, 1)} disabled={i === items.length - 1}>
                <Text style={[styles.repMove, i === items.length - 1 && styles.repMoveOff]}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeItem(i)}>
                <Text style={styles.repDel}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {editableSubs.map((sf) =>
            sf.type === 'media'
              ? <MediaField key={sf.key} field={sf} value={item[sf.key]} onChange={(v) => setSub(i, sf.key, v)} siteId={siteId} />
              : <SubField  key={sf.key} field={sf} value={item[sf.key]} onChange={(v) => setSub(i, sf.key, v)} />
          )}
          {complexSubs.length > 0 && (
            <Text style={styles.webNote}>{complexSubs.map((f) => f.label || f.key).join(', ')} — edit on web.</Text>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.repAdd} onPress={addItem}>
        <Text style={styles.repAddText}>＋  {field.addLabel || 'Add item'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SiteEditorScreen() {
  const { params, goBack } = useNavigation();
  const siteId = params?.siteId;
  const slug   = params?.slug;

  const docRef  = useRef(null);      // working document (source of truth for saving)
  const revRef  = useRef(0);
  const [manifests, setManifests] = useState({});  // { type: manifest }
  const [ready, setReady]       = useState(false);
  const [error, setError]       = useState(null);
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished]   = useState(false);
  const [activePage, setActivePage] = useState(0);   // index into doc.pages
  const [activeTab, setActiveTab]   = useState('site'); // 'site' | 'business' | 'sec:<i>'
  const [addOpen, setAddOpen]       = useState(false);
  const [newName, setNewName]       = useState('');
  const [addSecOpen, setAddSecOpen] = useState(false);
  const [, force] = useReducer((x) => x + 1, 0);

  useEffect(() => { boot(); }, []);

  const boot = async () => {
    try {
      const [schemaRes, siteRes] = await Promise.all([
        fetchApi('/api/sites/schema.php'),
        fetchApi(`/api/sites/get.php?id=${siteId}&kind=draft`),
      ]);
      const map = {};
      (schemaRes.data?.sections || []).forEach((m) => { map[m.type] = m; });
      setManifests(map);
      docRef.current = siteRes.data?.doc || {};
      revRef.current = siteRes.data?.rev ?? 0;
      setPublished(!!siteRes.data?.site?.published);
      setReady(true);
    } catch (e) {
      setError(e.message);
    }
  };

  // --- mutation helpers (mutate docRef; caller decides whether to re-render) ---
  const markDirty = () => { if (!dirty) setDirty(true); };
  const setSiteName = (v) => { docRef.current.site = { ...(docRef.current.site || {}), name: v }; markDirty(); };
  const setBiz = (k, v) => { docRef.current.business = { ...(docRef.current.business || {}), [k]: v }; markDirty(); };
  const setProp = (pi, si, key, v) => { docRef.current.pages[pi].sections[si].props[key] = v; markDirty(); };
  const setVisible = (pi, si, v) => { docRef.current.pages[pi].sections[si].visible = v; markDirty(); force(); };

  // --- pages ---
  const uid = () => 's' + Math.random().toString(36).slice(2, 9);
  const slugify = (s) => {
    const body = String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return '/' + (body || 'page');
  };
  const selectPage = (pi) => {
    setActivePage(pi);
    if (activeTab.startsWith('sec:')) {
      const has = (docRef.current.pages?.[pi]?.sections || []).length > 0;
      setActiveTab(has ? 'sec:0' : 'site');
    }
  };
  const addPage = () => {
    const title = newName.trim() || 'New Page';
    const pages = docRef.current.pages || (docRef.current.pages = []);
    let slug = slugify(title);
    const taken = new Set(pages.map((p) => p.slug));
    let s = slug, n = 2;
    while (taken.has(s)) { s = slug + '-' + n; n++; }
    // Seed a hero so the page isn't blank (mirrors the web builder).
    const hm = manifests.hero;
    const hero = hm ? { id: uid(), type: 'hero', variant: hm.defaults?.variant, props: JSON.parse(JSON.stringify(hm.defaults?.props || {})), visible: true } : null;
    pages.push({ id: uid(), title, slug: s, visible: true, sections: hero ? [hero] : [] });
    markDirty();
    setAddOpen(false);
    setNewName('');
    setActivePage(pages.length - 1);
    setActiveTab(hero ? 'sec:0' : 'site');
    force();
  };

  // --- sections ---
  const makeSection = (man) => ({
    id: uid(),
    type: man.type,
    ...(man.defaults?.variant ? { variant: man.defaults.variant } : {}),
    props: JSON.parse(JSON.stringify(man.defaults?.props || {})),
    ...(man.style?.defaults ? { style: JSON.parse(JSON.stringify(man.style.defaults)) } : {}),
    visible: true,
  });
  // Section types that can still be added: respect singleton (once per site) + maxPerPage.
  const availableSections = () => {
    const pgs = docRef.current.pages || [];
    const onPage = (pgs[activePage]?.sections || []).map((s) => s.type);
    const anywhere = pgs.flatMap((p) => (p.sections || []).map((s) => s.type));
    return Object.values(manifests)
      .filter((m) => {
        if (m.singleton && anywhere.includes(m.type)) return false;
        if (m.maxPerPage && onPage.filter((t) => t === m.type).length >= m.maxPerPage) return false;
        return true;
      })
      .sort((a, b) => (a.label || a.type).localeCompare(b.label || b.type));
  };
  const addSection = (man) => {
    const pg = docRef.current.pages[activePage];
    const secs = pg.sections || (pg.sections = []);
    secs.push(makeSection(man));
    markDirty();
    setAddSecOpen(false);
    setActiveTab('sec:' + (secs.length - 1));
    force();
  };
  const moveSection = (pi, si, dir) => {
    const secs = docRef.current.pages[pi].sections;
    const j = si + dir;
    if (j < 0 || j >= secs.length) return;
    [secs[si], secs[j]] = [secs[j], secs[si]];
    markDirty();
    setActiveTab('sec:' + j);
    force();
  };
  const deleteSection = (pi, si) =>
    Alert.alert('Delete section?', 'This removes the section from this page.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const secs = docRef.current.pages[pi].sections;
        secs.splice(si, 1);
        markDirty();
        setActiveTab(secs.length === 0 ? 'site' : 'sec:' + Math.max(0, si - 1));
        force();
      } },
    ]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetchApi('/api/sites/save-draft.php', {
        method: 'POST',
        body: JSON.stringify({ site_id: siteId, rev: revRef.current, doc: docRef.current, source: 'app' }),
      });
      if (res.data?.rev != null) revRef.current = res.data.rev;
      setDirty(false);
      return true;
    } catch (e) {
      Alert.alert('Could not save', /rev|409|changed|conflict/i.test(e.message)
        ? 'This site was edited elsewhere (web or another device). Go back and reopen it to get the latest version.'
        : e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    // Always save first so we publish exactly what's on screen.
    if (dirty) { const ok = await save(); if (!ok) return; }
    Alert.alert('Publish website?', 'This makes your latest changes live for everyone.', [
      { text: 'Cancel' },
      { text: 'Publish', onPress: doPublish },
    ]);
  };

  const doPublish = async () => {
    try {
      setPublishing(true);
      await fetchApi('/api/sites/publish.php', {
        method: 'POST',
        body: JSON.stringify({ site_id: siteId, source: 'app' }),
      });
      setPublished(true);
      Alert.alert('Published 🎉', 'Your website is live.', [
        { text: 'Close' },
        { text: 'View Live', onPress: () => Linking.openURL(liveUrl(slug)) },
      ]);
    } catch (e) {
      Alert.alert('Could not publish', /invalid|422|fix/i.test(e.message)
        ? 'Some required content is missing. Open the web editor to complete it, then publish.'
        : e.message);
    } finally {
      setPublishing(false);
    }
  };

  const viewLive = () => {
    if (!published) { Alert.alert('Not published yet', 'Publish first to view it live.'); return; }
    Linking.openURL(liveUrl(slug));
  };

  // ---------- field renderers ----------
  const norm = (v) => (v == null ? '' : String(v));

  const renderField = (field, value, onChange, keyId) => {
    switch (field.type) {
      case 'media':
        return <MediaField key={keyId} field={field} value={value} onChange={onChange} siteId={siteId} />;
      case 'textarea':
        return (
          <View style={styles.field} key={keyId}>
            <Text style={styles.label}>{field.label || field.key}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              defaultValue={norm(value)}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </View>
        );
      case 'toggle':
        return (
          <View style={[styles.field, styles.rowField]} key={keyId}>
            <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>{field.label || field.key}</Text>
            <Switch
              value={value === undefined ? !!field.default : !!value}
              onValueChange={onChange}
              trackColor={{ true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        );
      case 'number':
        return (
          <View style={styles.field} key={keyId}>
            <Text style={styles.label}>{field.label || field.key}</Text>
            <TextInput
              style={styles.input}
              defaultValue={norm(value)}
              onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        );
      case 'select': {
        const opts = (field.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
        return (
          <View style={styles.field} key={keyId}>
            <Text style={styles.label}>{field.label || field.key}</Text>
            <View style={styles.chipRow}>
              {opts.map((o) => {
                const active = norm(value) === norm(o.value);
                return (
                  <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)}
                    style={[styles.selChip, active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                    <Text style={[styles.selChipText, active && { color: '#fff' }]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      }
      case 'link': {
        const lv = value && typeof value === 'object' ? value : {};
        return (
          <View style={styles.field} key={keyId}>
            <Text style={styles.label}>{field.label || field.key} (button)</Text>
            <TextInput
              style={styles.input}
              defaultValue={norm(lv.text)}
              onChangeText={(t) => onChange({ ...lv, text: t })}
              placeholder="Button text"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              defaultValue={norm(lv.href)}
              onChangeText={(t) => onChange({ ...lv, href: t })}
              placeholder="Link (https://… or #contact)"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </View>
        );
      }
      case 'text':
      default:
        return (
          <View style={styles.field} key={keyId}>
            <Text style={styles.label}>{field.label || field.key}</Text>
            <TextInput
              style={styles.input}
              defaultValue={norm(value)}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        );
    }
  };

  // A field is shown only if its showIf.variant (when present) matches the section variant.
  const fieldVisible = (field, section) => {
    const cond = field.showIf?.variant;
    if (!cond) return true;
    return cond.includes(section.variant);
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(null); boot(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!ready) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const doc = docRef.current;
  const biz = doc.business || {};
  const pages = doc.pages || [];
  const page = pages[activePage] || pages[0] || { sections: [] };
  const sections = page.sections || [];

  // Tabs for the current page: global Site + Business, then one per section.
  const tabs = [
    { key: 'site', label: 'Site' },
    { key: 'business', label: 'Business' },
    ...sections.map((s, si) => ({ key: 'sec:' + si, label: manifests[s.type]?.label || s.type })),
  ];

  const renderSectionCard = (pi, si, section) => {
    const man = manifests[section.type];
    const props = (man?.props || []).filter((f) => fieldVisible(f, section));
    const editable  = props.filter(isEditable);
    const repeaters = props.filter((f) => f.type === 'repeater' && Array.isArray(f.fields));
    const complex   = props.filter((f) => !isEditable(f) && !(f.type === 'repeater' && Array.isArray(f.fields)));
    const visible = section.visible !== false;
    const count = (docRef.current.pages[pi].sections || []).length;
    return (
      <GlassCard style={[styles.card, !visible && styles.cardHidden]}>
        <View style={styles.secHead}>
          <Text style={styles.cardTitle}>{man?.label || section.type}</Text>
          <View style={styles.secHeadRight}>
            <Text style={styles.visLabel}>{visible ? 'Shown' : 'Hidden'}</Text>
            <Switch value={visible} onValueChange={(v) => setVisible(pi, si, v)} trackColor={{ true: COLORS.primary }} thumbColor="#fff" />
          </View>
        </View>

        <View style={styles.secToolbar}>
          <TouchableOpacity style={styles.secToolBtn} disabled={si === 0} onPress={() => moveSection(pi, si, -1)}>
            <Text style={[styles.secToolText, si === 0 && styles.secToolOff]}>◀ Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secToolBtn} disabled={si === count - 1} onPress={() => moveSection(pi, si, 1)}>
            <Text style={[styles.secToolText, si === count - 1 && styles.secToolOff]}>Move ▶</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.secToolBtn} onPress={() => deleteSection(pi, si)}>
            <Text style={styles.secDelText}>🗑  Delete</Text>
          </TouchableOpacity>
        </View>
        {editable.length === 0 && repeaters.length === 0 && complex.length === 0 && (
          <Text style={styles.cardSub}>No editable text in this section.</Text>
        )}
        {editable.map((f) =>
          renderField(f, section.props?.[f.key], (v) => setProp(pi, si, f.key, v), (section.id || si) + '-' + f.key)
        )}
        {repeaters.map((f) => (
          <RepeaterField key={(section.id || si) + '-' + f.key} field={f} value={section.props?.[f.key]}
            onChange={(arr) => setProp(pi, si, f.key, arr)} siteId={siteId} />
        ))}
        {complex.length > 0 && (
          <Text style={styles.webNote}>🖼  {complex.map((f) => f.label || f.key).join(', ')} — edit on the web editor.</Text>
        )}
      </GlassCard>
    );
  };

  const secIdx = activeTab.startsWith('sec:') ? +activeTab.slice(4) : -1;

  return (
    <View style={styles.container}>
      {/* Top action bar: View Live + Save + Publish */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.liveBtn} onPress={viewLive}>
          <Text style={styles.liveBtnText}>👁  View Live</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.saveTop} onPress={save} disabled={saving || publishing}>
          {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.saveTopText}>{dirty ? 'Save' : 'Saved'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.pubTop} onPress={publish} disabled={saving || publishing}>
          {publishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.pubTopText}>Publish</Text>}
        </TouchableOpacity>
      </View>

      {/* Page bar (switch pages + add) */}
      <View style={styles.pageBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
          {pages.map((p, pi) => {
            const on = pi === activePage;
            return (
              <TouchableOpacity key={p.id || pi} onPress={() => selectPage(pi)} style={[styles.pageChip, on && styles.pageChipOn]}>
                <Text style={[styles.pageChipText, on && styles.pageChipTextOn]}>{p.title || p.slug || 'Page'}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => { setNewName(''); setAddOpen(true); }} style={styles.pageAdd}>
            <Text style={styles.pageAddText}>＋ Page</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Section tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
          {tabs.map((t) => {
            const on = activeTab === t.key;
            return (
              <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setAddSecOpen(true)} style={styles.tabAdd}>
            <Text style={styles.tabAddText}>＋ Section</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Active tab content */}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {activeTab === 'site' && (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Website name</Text>
            <TextInput style={styles.input} defaultValue={norm(doc.site?.name)} onChangeText={setSiteName}
              placeholder="My Business" placeholderTextColor={COLORS.textMuted} />
          </GlassCard>
        )}

        {activeTab === 'business' && (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Business info</Text>
            <Text style={styles.cardSub}>Used across Contact, Footer, WhatsApp & Call buttons.</Text>
            {[['phone', 'Phone'], ['whatsapp', 'WhatsApp number'], ['email', 'Email'], ['address', 'Address']].map(([k, lbl]) => (
              <View style={styles.field} key={k}>
                <Text style={styles.label}>{lbl}</Text>
                <TextInput
                  style={[styles.input, k === 'address' && styles.textarea]}
                  defaultValue={norm(biz[k])}
                  onChangeText={(t) => setBiz(k, t)}
                  placeholder={lbl}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize={k === 'email' ? 'none' : 'sentences'}
                  keyboardType={k === 'phone' || k === 'whatsapp' ? 'phone-pad' : 'default'}
                  multiline={k === 'address'}
                />
              </View>
            ))}
          </GlassCard>
        )}

        {secIdx >= 0 && sections[secIdx] && renderSectionCard(activePage, secIdx, sections[secIdx])}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add-page modal */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a new page</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName}
              placeholder="Page name (e.g. About, Services)" placeholderTextColor={COLORS.textMuted} autoFocus />
            <Text style={styles.modalHint}>New pages start with a hero section — edit it here, add more sections on the web.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setAddOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCreate]} onPress={addPage}>
                <Text style={styles.modalCreateText}>Add page</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add-section modal */}
      <Modal visible={addSecOpen} transparent animationType="fade" onRequestClose={() => setAddSecOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalCardTall]}>
            <Text style={styles.modalTitle}>Add a section</Text>
            <ScrollView style={styles.secTypeList} keyboardShouldPersistTaps="handled">
              {availableSections().map((m) => (
                <TouchableOpacity key={m.type} style={styles.secTypeRow} onPress={() => addSection(m)}>
                  <Text style={styles.secTypeLabel}>{m.label || m.type}</Text>
                  {m.description ? <Text style={styles.secTypeDesc} numberOfLines={2}>{m.description}</Text> : null}
                </TouchableOpacity>
              ))}
              {availableSections().length === 0 && (
                <Text style={styles.cardSub}>No more sections can be added to this page.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel, { marginTop: 12 }]} onPress={() => setAddSecOpen(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 20 },

  liveLink: { alignSelf: 'flex-start', marginBottom: 12 },
  liveLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  card: { padding: 16, marginBottom: 12 },
  cardHidden: { opacity: 0.6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardSub: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 3 },

  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visLabel: { fontSize: 11.5, color: COLORS.textMuted, fontWeight: '600' },

  pageHeader: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1, marginTop: 8, marginBottom: 8, marginLeft: 2 },

  field: { marginTop: 12 },
  rowField: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text,
  },
  textarea: { minHeight: 76, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selChip: { paddingHorizontal: 12, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  selChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textMuted },

  webNote: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 12 },

  mediaPreview: { width: '100%', height: 150, borderRadius: 10, backgroundColor: '#eee' },
  mediaEmpty: { width: '100%', height: 90, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  mediaEmptyText: { fontSize: 12.5, color: COLORS.textMuted },
  mediaVideo: { width: '100%', height: 90, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(21,62,63,0.06)', borderWidth: 1, borderColor: COLORS.border },
  mediaVideoText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  mediaActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  mediaBtn: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  mediaUpload: { backgroundColor: COLORS.primary },
  mediaUploadText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  mediaRemove: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, flex: 0.5 },
  mediaRemoveText: { fontSize: 13.5, fontWeight: '700', color: COLORS.error },

  subLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 },
  repItem: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(21,62,63,0.03)' },
  repItemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  repItemTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  repItemBtns: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  repMove: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  repMoveOff: { color: COLORS.border },
  repDel: { fontSize: 16, fontWeight: '800', color: COLORS.error },
  repAdd: { marginTop: 12, height: 44, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(21,62,63,0.04)' },
  repAddText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  liveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 38, borderRadius: 9, backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  liveBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  saveTop: { paddingHorizontal: 14, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', minWidth: 64, backgroundColor: 'rgba(21,62,63,0.08)', borderWidth: 1, borderColor: COLORS.border },
  saveTopText: { fontSize: 13.5, fontWeight: '700', color: COLORS.primary },
  pubTop: { paddingHorizontal: 16, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', minWidth: 74, backgroundColor: COLORS.primary },
  pubTopText: { fontSize: 13.5, fontWeight: '800', color: '#fff' },

  pageBar: { paddingVertical: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowContent: { paddingHorizontal: 12 },
  pageChip: { paddingHorizontal: 14, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  pageChipOn: { backgroundColor: 'rgba(21,62,63,0.10)', borderColor: COLORS.primary },
  pageChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textMuted },
  pageChipTextOn: { color: COLORS.primary, fontWeight: '800' },
  pageAdd: { paddingHorizontal: 14, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, marginRight: 8 },
  pageAddText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary },

  tabBar: { paddingVertical: 8, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  tabOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  tabTextOn: { color: '#fff' },
  tabAdd: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, marginRight: 8 },
  tabAddText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  secToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  secToolBtn: { paddingHorizontal: 10, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  secToolText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary },
  secToolOff: { color: COLORS.border },
  secDelText: { fontSize: 12.5, fontWeight: '700', color: COLORS.error },

  modalCardTall: { maxHeight: '80%' },
  secTypeList: { maxHeight: 380 },
  secTypeRow: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, marginBottom: 8 },
  secTypeLabel: { fontSize: 14.5, fontWeight: '800', color: COLORS.text },
  secTypeDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  modalHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  modalCreate: { backgroundColor: COLORS.primary },
  modalCreateText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  errText: { color: COLORS.error, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 20, height: 44, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontWeight: '700' },
});
