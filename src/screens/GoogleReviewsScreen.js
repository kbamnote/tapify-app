import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Switch, Alert, StyleSheet, RefreshControl, Image,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import {
  getReviews, replyToReview, setAutoReply as apiSetAutoReply,
} from '../services/googleBusinessApi';
import { generate as generateAi } from '../services/aiApi';
import { getAiTool } from '../config/aiTools';

const stars = (n) => '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 5 - n));

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function GoogleReviewsScreen() {
  const { navigate } = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [openId, setOpenId] = useState(null);      // review being replied to
  const [draft, setDraft] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  // Which tone each review has already been suggested, so pressing Suggest
  // twice gives a different reply instead of repeating the first one.
  const suggestState = useRef({});

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getReviews(50));
    } catch (e) {
      setError(e?.message || 'Could not load your Google reviews.');
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

  const openReply = (review) => {
    setOpenId(review.id);
    setDraft(review.reply || '');
  };

  /**
   * Ask the AI for a reply to this specific review.
   *
   * Pressing Suggest again gives you a DIFFERENT reply rather than the same one
   * back. The generator already returns four tones, so the first three presses
   * walk through them at no extra cost; only once those are used up do we go
   * back to the model, and then with regenerate so the cache is bypassed.
   *
   * Order is chosen by rating: warm first for praise, measured first for a
   * complaint. A breezy "Thanks so much!" under a one-star review reads as not
   * having read it.
   */
  const suggest = async (review) => {
    setSuggesting(true);
    try {
      const tool = getAiTool('review-reply');
      if (!tool) throw new Error('Review reply tool is unavailable.');

      const order = review.stars >= 4
        ? ['friendly', 'professional', 'short', 'formal']
        : ['professional', 'formal', 'short', 'friendly'];

      const seen = suggestState.current[review.id] || { round: 0, tone: 0 };
      const exhausted = seen.tone >= order.length;

      const res = await generateAi(
        tool,
        {
          review: review.comment,
          business_name: data?.location_title || '',
          // Without these every short review produced the same reply, and two
          // reviews with identical text were served the identical cached one.
          reviewer: review.reviewer || '',
          stars: review.stars || 0,
        },
        exhausted,           // regenerate only once the four tones are used up
      );

      const r = res?.result || {};
      const idx = exhausted ? 0 : seen.tone;
      // Fall back through the remaining tones if the model skipped a key.
      const pick = order.slice(idx).map((k) => r[k]).find((v) => v && String(v).trim())
        || order.map((k) => r[k]).find((v) => v && String(v).trim());

      suggestState.current[review.id] = exhausted
        ? { round: seen.round + 1, tone: 1 }
        : { round: seen.round, tone: seen.tone + 1 };

      if (pick) setDraft(String(pick).trim());
      else Alert.alert('No suggestion', 'The AI did not return a reply. Try again.');
    } catch (e) {
      Alert.alert('Could not suggest a reply', e?.message || 'Please try again.');
    } finally {
      setSuggesting(false);
    }
  };

  const post = async (review) => {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      await replyToReview(review.id, text);
      setOpenId(null);
      setDraft('');
      await load();
      Alert.alert('Posted', 'Your reply is now public on Google.');
    } catch (e) {
      Alert.alert('Could not post reply', e?.message || 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const toggleAuto = async (next) => {
    setSavingAuto(true);
    try {
      const min = data?.auto_reply?.min_stars ?? 4;
      await apiSetAutoReply(next, min);
      setData((p) => ({ ...p, auto_reply: { enabled: next, min_stars: min } }));
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSavingAuto(false);
    }
  };

  const setMinStars = async (min) => {
    setSavingAuto(true);
    try {
      await apiSetAutoReply(data?.auto_reply?.enabled ?? false, min);
      setData((p) => ({ ...p, auto_reply: { ...(p.auto_reply || {}), min_stars: min } }));
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSavingAuto(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errIcon}>⭐</Text>
        <Text style={styles.errTitle}>Could not load reviews</Text>
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

  const reviews = data?.reviews || [];
  const auto = data?.auto_reply || { enabled: false, min_stars: 4 };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{data?.average ? data.average.toFixed(1) : '—'}</Text>
          <Text style={styles.summaryLabel}>Average</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{data?.total ?? reviews.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryValue, (data?.unanswered ?? 0) > 0 && { color: '#b45309' }]}>
            {data?.unanswered ?? 0}
          </Text>
          <Text style={styles.summaryLabel}>Unanswered</Text>
        </View>
      </View>

      {/* Getting more reviews is the other half of managing them, so it sits
          above the reply settings rather than buried at the bottom. */}
      <TouchableOpacity
        style={styles.askCard}
        activeOpacity={0.85}
        onPress={() => navigate('request-review')}
      >
        <Text style={styles.askIcon}>🙋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.askTitle}>Request a review</Text>
          <Text style={styles.askSub}>
            Send your Google review link to a customer on WhatsApp or SMS, and keep track of
            who you have already asked.
          </Text>
        </View>
        <Text style={styles.askChevron}>›</Text>
      </TouchableOpacity>

      {/* Auto-reply */}
      <View style={styles.autoCard}>
        <View style={styles.autoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoTitle}>Reply automatically</Text>
            <Text style={styles.autoSub}>
              We write and post a reply for you within about half an hour of a new review.
            </Text>
          </View>
          <Switch value={!!auto.enabled} onValueChange={toggleAuto} disabled={savingAuto} />
        </View>

        {auto.enabled && (
          <>
            <Text style={styles.autoMinLabel}>Only reply automatically to reviews of</Text>
            <View style={styles.starPicker}>
              {[5, 4, 3].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.starOpt, auto.min_stars === n && styles.starOptOn]}
                  onPress={() => setMinStars(n)}
                  disabled={savingAuto}
                >
                  <Text style={[styles.starOptText, auto.min_stars === n && styles.starOptTextOn]}>
                    {n}★ and above
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.autoWarn}>
              Anything below {auto.min_stars}★ is left for you to answer yourself. A complaint
              deserves a human reply, and an automatic one under your business name usually
              makes it worse.
            </Text>
          </>
        )}
      </View>

      {/* Reviews */}
      {reviews.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.errIcon}>⭐</Text>
          <Text style={styles.errTitle}>No reviews yet</Text>
          <Text style={styles.errText}>
            Once customers review you on Google they will appear here, and you can reply
            without leaving the app. The fastest way to get the first one is to ask.
          </Text>
          <TouchableOpacity style={styles.errBtn} onPress={() => navigate('request-review')}>
            <Text style={styles.errBtnText}>🙋 Request a review</Text>
          </TouchableOpacity>
        </View>
      ) : reviews.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHead}>
            {r.photo ? (
              <Image source={{ uri: r.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{(r.reviewer || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewer}>{r.reviewer}</Text>
              <Text style={styles.stars}>{stars(r.stars)} <Text style={styles.date}>{fmtDate(r.created_at)}</Text></Text>
            </View>
          </View>

          {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}

          {r.reply ? (
            <View style={styles.replyBox}>
              <Text style={styles.replyLabel}>Your reply</Text>
              <Text style={styles.replyText}>{r.reply}</Text>
            </View>
          ) : null}

          {openId === r.id ? (
            <View style={styles.editor}>
              <TextInput
                style={styles.input}
                multiline
                value={draft}
                onChangeText={setDraft}
                placeholder="Write your reply…"
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={styles.editorActions}>
                <TouchableOpacity
                  style={[styles.btnGhost, suggesting && { opacity: 0.6 }]}
                  onPress={() => suggest(r)}
                  disabled={suggesting || !r.comment}
                >
                  <Text style={styles.btnGhostText}>{suggesting ? 'Writing…' : '✨ Suggest'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, (!draft.trim() || posting) && { opacity: 0.5 }]}
                  onPress={() => post(r)}
                  disabled={!draft.trim() || posting}
                >
                  <Text style={styles.btnText}>{posting ? 'Posting…' : 'Post to Google'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setOpenId(null); setDraft(''); }}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.replyBtn} onPress={() => openReply(r)}>
              <Text style={styles.replyBtnText}>{r.reply ? 'Edit reply' : '💬 Reply'}</Text>
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
  errIcon: { fontSize: 34, marginBottom: 10 },
  errTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  errBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  errBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  errLink: { marginTop: 12, fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline' },

  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCell: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: 14, alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  askCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.primary, padding: 14, marginBottom: 12,
  },
  askIcon: { fontSize: 22 },
  askTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  askSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 17 },
  askChevron: { fontSize: 24, color: COLORS.primary },

  autoCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 16,
  },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  autoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  autoSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 17 },
  autoMinLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 14 },
  starPicker: { flexDirection: 'row', gap: 8, marginTop: 8 },
  starOpt: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  starOptOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  starOptText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  starOptTextOn: { color: '#fff' },
  autoWarn: { fontSize: 11, color: COLORS.textMuted, marginTop: 10, lineHeight: 16 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  reviewer: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  stars: { fontSize: 13, color: '#f59e0b', marginTop: 1 },
  date: { fontSize: 11, color: COLORS.textMuted },
  comment: { fontSize: 13, color: COLORS.text, lineHeight: 20, marginTop: 10 },

  replyBox: {
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  replyLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  replyText: { fontSize: 13, color: COLORS.text, marginTop: 3, lineHeight: 19 },

  replyBtn: { marginTop: 10, alignSelf: 'flex-start' },
  replyBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  editor: { marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10,
    fontSize: 13, color: COLORS.text, minHeight: 90, textAlignVertical: 'top',
    backgroundColor: COLORS.background,
  },
  editorActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  btnGhost: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnGhostText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  cancel: { fontSize: 12, color: COLORS.textMuted, marginLeft: 'auto' },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
});
