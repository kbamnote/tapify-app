import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { getPhotos, addPhoto } from '../services/googleBusinessApi';
import { uploadMedia } from '../services/socialApi';

/**
 * Photos on the Google listing, and adding new ones.
 *
 * Two-step upload by necessity: Google fetches the image from a URL rather than
 * accepting bytes, so the file goes to Cloudinary through the existing media
 * pipeline first and we hand Google the resulting public URL.
 */

// The categories worth offering. Google accepts more, but a long list makes the
// customer stop and think about something that barely matters.
const CATEGORIES = [
  { key: 'EXTERIOR', label: 'Outside' },
  { key: 'INTERIOR', label: 'Inside' },
  { key: 'PRODUCT', label: 'Work / Products' },
  { key: 'TEAM', label: 'Team' },
  { key: 'ADDITIONAL', label: 'Other' },
];

export default function GbpPhotoUploader() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState('INTERIOR');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getPhotos());
    } catch (e) {
      setError(e?.message || 'Could not load photos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pickAndUpload = async () => {
    // System picker only — no media-library permission is requested, which is
    // what keeps this compliant with the Play policy we were rejected under.
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets?.length) return;

    setBusy(true);
    try {
      const uploaded = await uploadMedia(picked.assets[0]);   // → Cloudinary
      if (!uploaded?.url) throw new Error('Upload failed. Please try again.');
      await addPhoto(uploaded.url, category);                 // → Google
      await load();
      Alert.alert('Photo added', 'It can take a few minutes to appear on your Google listing.');
    } catch (e) {
      Alert.alert('Could not add photo', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.err}>{error}</Text>
        <TouchableOpacity onPress={load}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
      </View>
    );
  }

  const photos = data?.photos || [];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.count}>{photos.length} on your listing</Text>
      </View>
      <Text style={styles.sub}>
        Listings with photos get noticeably more calls and direction requests. Ten or more,
        across your frontage, inside, your team and your work, is where it stops making a
        difference.
      </Text>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
          {photos.slice(0, 12).map((p) => (
            <Image key={p.id || p.url} source={{ uri: p.url }} style={styles.thumb} />
          ))}
        </ScrollView>
      )}

      <Text style={styles.pickLabel}>Add a photo of</Text>
      <View style={styles.cats}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.cat, category === c.key && styles.catOn]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.catText, category === c.key && styles.catTextOn]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, busy && { opacity: 0.6 }]}
        onPress={pickAndUpload}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>{busy ? 'Uploading…' : '📷  Choose a photo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 24, alignItems: 'center' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginTop: 16,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  count: { fontSize: 12, color: COLORS.textMuted },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  err: { fontSize: 12, color: '#b91c1c', marginTop: 8 },
  retry: { fontSize: 12, color: COLORS.primary, fontWeight: '800', marginTop: 8 },
  strip: { marginTop: 12 },
  thumb: { width: 76, height: 76, borderRadius: 8, marginRight: 8, backgroundColor: COLORS.border },
  pickLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 14 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  cat: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  catOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  catTextOn: { color: '#ffffff' },
  btn: {
    marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
});
