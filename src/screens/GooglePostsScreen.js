import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Image, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, RefreshControl, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { getPosts, createPost, getFields } from '../services/googleBusinessApi';
import { uploadMedia } from '../services/socialApi';
import { generate as generateAi } from '../services/aiApi';

/**
 * Google Posts — updates that appear on the listing itself.
 *
 * This is the single biggest decaying item in the marketing score, and it is
 * the one most businesses have never heard of. Posts expire from prominence
 * after about a week, which is exactly why the score rewards recency: a listing
 * posted to weekly looks alive, one posted to last spring does not.
 */

// Buttons Google accepts. CALL is deliberately last: it needs no link, which
// makes it the easy one, and offering it first would have everyone pick it.
const ACTIONS = [
  { key: '',          label: 'No button' },
  { key: 'LEARN_MORE', label: 'Learn more' },
  { key: 'BOOK',       label: 'Book' },
  { key: 'ORDER',      label: 'Order online' },
  { key: 'SHOP',       label: 'Shop' },
  { key: 'SIGN_UP',    label: 'Sign up' },
  { key: 'CALL',       label: 'Call now' },
];

const MAX = 1500;

// The post writer, addressed directly — it has no card in the tool catalog
// because its output can only be published from here.
const POST_TOOL = { key: 'google-post', endpoint: '/api/ai/google-post.php' };

const daysAgo = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(d)) return null;
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export default function GooglePostsScreen() {
  const { navigate } = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState('');
  const [action, setAction] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [image, setImage] = useState(null);      // { url } once on Cloudinary
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getPosts(20));
    } catch (e) {
      setError(e?.message || 'Could not load posts.');
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

  const pickImage = async () => {
    // System picker only — no media-library permission, which is what keeps
    // this compliant with the Play policy we were rejected under before.
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets?.length) return;

    setUploading(true);
    try {
      // Google fetches the image from a URL rather than accepting bytes, so it
      // goes to Cloudinary first and Google is handed that link.
      const uploaded = await uploadMedia(picked.assets[0]);
      if (!uploaded?.url) throw new Error('Upload failed. Please try again.');
      setImage({ url: uploaded.url });
    } catch (e) {
      Alert.alert('Could not upload', e?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const write = async () => {
    setGenerating(true);
    try {
      let seed = {};
      try {
        const f = (await getFields())?.fields || {};
        seed = {
          business_name: f.business_name || '',
          category: f.primary_category || '',
          city: f.city || '',
        };
      } catch (e) { /* the AI can work from less */ }

      if (!seed.business_name) {
        Alert.alert('Need a bit more', 'Set your business name on your listing first.');
        return;
      }
      const res = await generateAi(POST_TOOL, seed);
      const text = res?.result?.text || '';
      if (!text) {
        Alert.alert('Nothing generated', 'The AI did not return anything. Try again.');
        return;
      }
      setSummary(String(text).slice(0, MAX));
    } catch (e) {
      Alert.alert('Could not write it', e?.message || 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const publish = () => {
    const text = summary.trim();
    if (!text) return;
    // CALL uses the listing's own number; every other button needs a link.
    if (action && action !== 'CALL' && !/^https?:\/\//i.test(actionUrl.trim())) {
      Alert.alert('Add a link', 'That button needs a link starting with https://');
      return;
    }
    Alert.alert(
      'Post to Google?',
      'This appears publicly on your Google listing, under your business name.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: async () => {
            setPosting(true);
            try {
              await createPost({
                summary: text,
                action,
                action_url: actionUrl.trim(),
                image_url: image?.url || '',
              });
              setSummary(''); setAction(''); setActionUrl(''); setImage(null);
              await load();
              Alert.alert('Posted', 'Your update is live on your Google listing.');
            } catch (e) {
              Alert.alert('Could not post', e?.message || 'Please try again.');
            } finally {
              setPosting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>📣</Text>
        <Text style={styles.errTitle}>Could not load posts</Text>
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.errBtn} onPress={load}>
          <Text style={styles.errBtnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate('ai-growth')}>
          <Text style={styles.errLink}>Back to AI Growth Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const posts = data?.posts || [];
  const last = posts[0]?.created ? daysAgo(posts[0].created) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigate('ai-growth')}>
        <Text style={styles.backText}>← AI Growth Center</Text>
      </TouchableOpacity>

      <View style={styles.alert}>
        <Text style={styles.alertText}>
          {last
            ? `You last posted ${last}. Posting weekly is what keeps this part of your score up — Google pushes recent posts to the top of your listing.`
            : 'You have never posted. Posts show up right on your listing when someone searches for you, and weekly posting is worth 8 points of your marketing score.'}
        </Text>
      </View>

      {/* Composer */}
      <View style={styles.composer}>
        <Text style={styles.composerTitle}>New post</Text>

        <TextInput
          style={styles.input}
          multiline
          value={summary}
          onChangeText={(t) => setSummary(t.slice(0, MAX))}
          placeholder="What's new? An offer, an arrival, a reminder…"
          placeholderTextColor={COLORS.textMuted}
        />
        <View style={styles.counterRow}>
          <TouchableOpacity onPress={write} disabled={generating}>
            <Text style={[styles.aiLink, generating && { opacity: 0.5 }]}>
              {generating ? '✨ Writing…' : '✨ Write it for me'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.counter}>{summary.length}/{MAX}</Text>
        </View>

        {/* Photo */}
        {image ? (
          <View style={styles.imgRow}>
            <Image source={{ uri: image.url }} style={styles.thumb} />
            <TouchableOpacity onPress={() => setImage(null)}>
              <Text style={styles.cancel}>Remove photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.ghostBtn} onPress={pickImage} disabled={uploading}>
            <Text style={styles.ghostBtnText}>{uploading ? 'Uploading…' : '🖼  Add a photo'}</Text>
          </TouchableOpacity>
        )}

        {/* Button */}
        <Text style={styles.fieldLabel}>Button</Text>
        <View style={styles.chips}>
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.key || 'none'}
              style={[styles.chip, action === a.key && styles.chipOn]}
              onPress={() => setAction(a.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, action === a.key && styles.chipTextOn]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!!action && action !== 'CALL' && (
          <TextInput
            style={[styles.input, { minHeight: 0, paddingVertical: 10 }]}
            value={actionUrl}
            onChangeText={setActionUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://your-link.com"
            placeholderTextColor={COLORS.textMuted}
          />
        )}
        {action === 'CALL' && (
          <Text style={styles.hint}>Uses the phone number on your listing.</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!summary.trim() || posting) && { opacity: 0.5 }]}
          onPress={publish}
          disabled={!summary.trim() || posting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{posting ? 'Posting…' : 'Post to Google'}</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <Text style={styles.sectionHead}>Your posts</Text>
      {posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.bigIcon}>📣</Text>
          <Text style={styles.errText}>Nothing posted yet. The composer above takes about a minute.</Text>
        </View>
      ) : posts.map((p) => (
        <View key={p.id} style={styles.card}>
          {!!p.image && <Image source={{ uri: p.image }} style={styles.postImg} />}
          <Text style={styles.postText}>{p.summary}</Text>
          <Text style={styles.postMeta}>
            {daysAgo(p.created) || 'recently'}
            {p.state && p.state !== 'LIVE' ? ` · ${p.state.toLowerCase()}` : ''}
            {p.action ? ` · ${(ACTIONS.find((a) => a.key === p.action) || {}).label || p.action}` : ''}
          </Text>
          {!!p.url && (
            <TouchableOpacity onPress={() => Linking.openURL(p.url)}>
              <Text style={styles.postLink}>View on Google →</Text>
            </TouchableOpacity>
          )}
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

  alert: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  alertText: { fontSize: 12.5, color: '#92400e', lineHeight: 18 },

  composer: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.primary, padding: 14, marginBottom: 20,
  },
  composerTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.primary, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10,
    fontSize: 13, color: COLORS.text, minHeight: 96, textAlignVertical: 'top',
    backgroundColor: COLORS.background,
  },
  counterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  aiLink: { fontSize: 12.5, fontWeight: '800', color: COLORS.primary },
  counter: { fontSize: 11, color: COLORS.textMuted },

  imgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: COLORS.border },
  ghostBtn: {
    marginTop: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingVertical: 11, alignItems: 'center', backgroundColor: COLORS.background,
  },
  ghostBtnText: { fontSize: 12.5, fontWeight: '700', color: COLORS.text },

  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.background,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  chipTextOn: { color: '#ffffff' },
  hint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 8 },

  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cancel: { fontSize: 12, color: COLORS.textMuted },

  sectionHead: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 10,
  },
  postImg: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10, backgroundColor: COLORS.border },
  postText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  postMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 },
  postLink: { fontSize: 12, fontWeight: '800', color: COLORS.primary, marginTop: 8 },
});
