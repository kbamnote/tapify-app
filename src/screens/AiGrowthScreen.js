import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { AI_TOOLS } from '../config/aiTools';
import { generate as generateAi, setSaved as apiSetSaved } from '../services/aiApi';
import {
  getStatus as getGbpStatus,
  getFields as getGbpFields,
  getScore as getGbpScore,
  updateFields as updateGbpFields,
} from '../services/googleBusinessApi';
import AiToolForm from '../components/ai/AiToolForm';
import AiResultView from '../components/ai/AiResultView';
import AiHistorySheet from '../components/ai/AiHistorySheet';

const bandColor = (band) => ({
  excellent: '#059669',
  good: '#0d9488',
  'needs work': '#b45309',
  poor: '#dc2626',
}[band] || COLORS.primary);

/**
 * Seed common fields, preferring the connected Google listing over the local
 * profile. Google is the better source: it is what customers actually see, and
 * it is kept current because the business edits it for its own sake.
 */
function seedValues(tool, user, gbp) {
  const seed = {};
  const guessBusiness = gbp?.business_name || user?.business_name || user?.vcard?.business_name || user?.name || '';
  const guessCity = gbp?.city || user?.city || user?.vcard?.city || '';
  const guessCategory = gbp?.primary_category || user?.category || user?.vcard?.category || '';
  tool.inputs.forEach((f) => {
    if (f.type === 'toggle') seed[f.name] = false;
    else if (f.name === 'business_name') seed[f.name] = guessBusiness;
    else if (f.name === 'city') seed[f.name] = guessCity;
    else if (f.name === 'category') seed[f.name] = guessCategory;
    else seed[f.name] = '';
  });
  return seed;
}

export default function AiGrowthScreen() {
  const { user, navigate } = useNavigation();

  const [activeTool, setActiveTool] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  // Google Business Profile. Held on this screen so the banner reflects the real
  // connection state instead of always inviting a connect that already happened,
  // and so every tool can prefill from the live listing.
  const [gbp, setGbp] = useState({ connected: false, location: null, fields: null, score: null, loading: true });
  const [applying, setApplying] = useState(null);   // field currently being written
  const [applied, setApplied] = useState(null);     // field written in this session

  const loadGbp = useCallback(async () => {
    try {
      const status = await getGbpStatus();
      if (!status?.connected) {
        setGbp({ connected: false, location: null, fields: null, score: null, loading: false });
        return;
      }
      // Fields and score are further calls to Google. A failure in either must
      // not make a connected account look disconnected — that was the original
      // bug. Keep the connected state and lose only the extra.
      let fields = null, score = null;
      try { fields = (await getGbpFields())?.fields ?? null; } catch (e) { /* prefill only */ }
      try { score = await getGbpScore(); } catch (e) { /* score is additive */ }
      setGbp({ connected: true, location: status.location ?? null, fields, score, loading: false });
    } catch (e) {
      setGbp({ connected: false, location: null, fields: null, score: null, loading: false });
    }
  }, []);

  useEffect(() => { loadGbp(); }, [loadGbp]);

  /**
   * Write a generated block into the real field it was written for.
   * Confirms first: this changes the customer's live public listing.
   */
  const applyToTarget = useCallback((apply, text) => {
    if (!apply?.field || !text) return;
    const run = async () => {
      setApplying(apply.field);
      try {
        if (apply.to === 'gbp') {
          const res = await updateGbpFields({ [apply.field]: text });
          // Re-read from what Google returned, not from what we sent, and
          // refresh the score so the customer sees it move immediately —
          // that visible jump is the point of the whole loop.
          setGbp((p) => ({ ...p, fields: res?.fields ?? p.fields }));
          setApplied(apply.field);
          try { setGbp((p) => ({ ...p, score: null })); const s = await getGbpScore(); setGbp((p) => ({ ...p, score: s })); }
          catch (e) { /* the write succeeded; a stale score is not worth an error */ }
          Alert.alert('Applied', 'Your Google Business Profile has been updated.');
        }
      } catch (e) {
        Alert.alert('Could not apply', e?.message || 'Please try again.');
      } finally {
        setApplying(null);
      }
    };
    if (apply.confirm) {
      Alert.alert('Apply to Google?', apply.confirm, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: run },
      ]);
    } else {
      run();
    }
  }, []);

  const openTool = (tool) => {
    setActiveTool(tool);
    setValues(seedValues(tool, user, gbp.fields));
    setResult(null);
    setMeta(null);
    setError(null);
    setIsSaved(false);
  };

  const backToGrid = () => {
    setActiveTool(null);
    setResult(null);
    setMeta(null);
    setError(null);
  };

  const onChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const runGenerate = async (regenerate = false) => {
    if (!activeTool) return;

    // Client-side required-field check for fast feedback (server validates too).
    const missing = activeTool.inputs
      .filter((f) => f.required && !String(values[f.name] ?? '').trim())
      .map((f) => f.label);
    if (missing.length) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generateAi(activeTool, values, regenerate);
      setResult(data.result);
      setMeta(data);
      setIsSaved(false);
    } catch (e) {
      setError(e.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async () => {
    if (!meta?.history_id || saving) return;
    const next = !isSaved;
    setIsSaved(next); // optimistic
    setSaving(true);
    try {
      await apiSetSaved(meta.history_id, next);
    } catch (e) {
      setIsSaved(!next); // revert
    } finally {
      setSaving(false);
    }
  };

  const loadFromHistory = (item) => {
    setResult(item.result);
    setMeta({ ...item, history_id: item.id, cached: true });
    setIsSaved(!!item.is_saved);
    if (item.input && typeof item.input === 'object') {
      setValues((prev) => ({ ...prev, ...item.input }));
    }
  };

  // ── Landing grid ───────────────────────────────────────────────────────────
  if (!activeTool) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>AI Growth Center</Text>
        <Text style={styles.heroSubtitle}>
          Improve your online presence & Google Business Profile with AI-generated content.
        </Text>

        {/* Reflects the real connection state. While the status call is in flight
            we say nothing rather than flashing "Connect" at someone who already
            has — that flash is what made this look broken. */}
        <TouchableOpacity
          style={[styles.gbpBanner, gbp.connected && styles.gbpBannerConnected]}
          activeOpacity={0.85}
          onPress={() => navigate('google-business')}
        >
          <Text style={styles.gbpIcon}>{gbp.loading ? '🔗' : gbp.connected ? '✅' : '🔗'}</Text>
          <View style={{ flex: 1 }}>
            {gbp.loading ? (
              <>
                <Text style={styles.gbpTitle}>Google Business Profile</Text>
                <Text style={styles.gbpSub}>Checking your connection…</Text>
              </>
            ) : gbp.connected ? (
              <>
                <Text style={styles.gbpTitle}>
                  Google Business Profile · Connected
                </Text>
                <Text style={styles.gbpSub} numberOfLines={1}>
                  {gbp.location?.title
                    ? `${gbp.location.title} — tap to edit your listing`
                    : 'Tap to edit your listing'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.gbpTitle}>Connect Google Business Profile</Text>
                <Text style={styles.gbpSub}>Edit your Google listing here — changes sync to Google.</Text>
              </>
            )}
          </View>
          <Text style={styles.gbpChevron}>›</Text>
        </TouchableOpacity>

        {gbp.connected && (
          <TouchableOpacity
            style={styles.reviewsLink}
            activeOpacity={0.85}
            onPress={() => navigate('google-reviews')}
          >
            <Text style={styles.reviewsIcon}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewsTitle}>Google Reviews</Text>
              <Text style={styles.reviewsSub}>Read, reply with AI, or turn on automatic replies.</Text>
            </View>
            <Text style={styles.gbpChevron}>›</Text>
          </TouchableOpacity>
        )}

        {gbp.connected && gbp.fields && (
          <Text style={styles.gbpPrefillNote}>
            Tools below are pre-filled from your Google listing.
          </Text>
        )}

        {/* Profile health score. Shown only when connected — a score with no
            listing behind it would be a number we made up. */}
        {gbp.connected && gbp.score && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreHead}>
              <View>
                <Text style={styles.scoreLabel}>Profile health</Text>
                <View style={styles.scoreRow}>
                  <Text style={[styles.scoreValue, { color: bandColor(gbp.score.band) }]}>
                    {gbp.score.score}
                  </Text>
                  <Text style={styles.scoreOutOf}>/ 100</Text>
                  {typeof gbp.score.delta === 'number' && gbp.score.delta !== 0 && (
                    <Text style={[styles.scoreDelta, { color: gbp.score.delta > 0 ? '#059669' : '#b45309' }]}>
                      {gbp.score.delta > 0 ? `▲ ${gbp.score.delta}` : `▼ ${Math.abs(gbp.score.delta)}`}
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: bandColor(gbp.score.band) }]}>
                <Text style={styles.scoreBadgeText}>{gbp.score.band}</Text>
              </View>
            </View>

            <View style={styles.scoreBarTrack}>
              <View style={[styles.scoreBarFill, {
                width: `${Math.max(2, Math.min(100, gbp.score.score))}%`,
                backgroundColor: bandColor(gbp.score.band),
              }]} />
            </View>

            {!!gbp.score.summary && <Text style={styles.scoreSummary}>{gbp.score.summary}</Text>}

            {(gbp.score.items || []).filter((i) => i.status !== 'good').map((item) => (
              <View key={item.key} style={styles.scoreItem}>
                <Text style={styles.scoreItemIcon}>{item.status === 'missing' ? '❌' : '⚠️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreItemLabel}>
                    {item.label}
                    <Text style={styles.scoreItemPts}>  +{item.points - item.earned}</Text>
                  </Text>
                  <Text style={styles.scoreItemHint}>{item.hint}</Text>
                </View>
                <TouchableOpacity
                  style={styles.scoreFixBtn}
                  onPress={() => {
                    // Send them to the thing that actually fixes it, rather than
                    // describing the problem and leaving them to find it.
                    const tool = item.tool ? AI_TOOLS.find((t) => t.key === item.tool) : null;
                    if (tool) openTool(tool);
                    else navigate('google-business');
                  }}
                >
                  <Text style={styles.scoreFixText}>Fix</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.grid}>
          {AI_TOOLS.map((tool) => (
            <TouchableOpacity key={tool.key} style={styles.card} activeOpacity={0.85} onPress={() => openTool(tool)}>
              <Text style={styles.cardIcon}>{tool.icon}</Text>
              <Text style={styles.cardTitle}>{tool.title}</Text>
              <Text style={styles.cardBlurb}>{tool.blurb}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ── Tool workspace ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.toolContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backRow} onPress={backToGrid}>
          <Text style={styles.backText}>← All AI Tools</Text>
        </TouchableOpacity>

        <View style={styles.toolHeader}>
          <Text style={styles.toolIcon}>{activeTool.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.toolTitle}>{activeTool.title}</Text>
            <Text style={styles.toolBlurb}>{activeTool.blurb}</Text>
          </View>
        </View>

        <AiToolForm
          tool={activeTool}
          values={values}
          onChange={onChange}
          onSubmit={() => runGenerate(false)}
          loading={loading}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {result && (
          <AiResultView
            tool={activeTool}
            result={result}
            meta={meta}
            loading={loading}
            onRegenerate={() => runGenerate(true)}
            onSaveToggle={toggleSave}
            isSaved={isSaved}
            saving={saving}
            onOpenHistory={() => setHistoryVisible(true)}
            onApply={gbp.connected ? applyToTarget : null}
            applying={applying}
            applied={applied}
          />
        )}

        {/* History access even before first generation */}
        {!result && (
          <TouchableOpacity style={styles.historyLink} onPress={() => setHistoryVisible(true)}>
            <Text style={styles.historyLinkText}>🕘 View history</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AiHistorySheet
        visible={historyVisible}
        tool={activeTool}
        onClose={() => setHistoryVisible(false)}
        onSelect={loadFromHistory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Landing
  gridContent: { padding: 16, paddingBottom: 40 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginBottom: 6 },
  heroSubtitle: { fontSize: 13.5, color: COLORS.textMuted, lineHeight: 20, marginBottom: 18 },
  gbpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
  },
  gbpBannerConnected: { backgroundColor: '#0f4c3a' },
  gbpPrefillNote: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center',
    marginTop: -4, marginBottom: 12,
  },
  reviewsLink: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 12,
  },
  reviewsIcon: { fontSize: 22, marginRight: 12 },
  reviewsTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  reviewsSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  scoreCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 16,
  },
  scoreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  scoreValue: { fontSize: 34, fontWeight: '900' },
  scoreOutOf: { fontSize: 14, color: COLORS.textMuted, marginLeft: 4 },
  scoreDelta: { fontSize: 13, fontWeight: '800', marginLeft: 10 },
  scoreBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  scoreBadgeText: { fontSize: 11, fontWeight: '800', color: '#ffffff', textTransform: 'capitalize' },
  scoreBarTrack: {
    height: 8, borderRadius: 4, backgroundColor: COLORS.border,
    overflow: 'hidden', marginTop: 12,
  },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreSummary: { fontSize: 13, color: COLORS.text, marginTop: 12, lineHeight: 19 },
  scoreItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12,
  },
  scoreItemIcon: { fontSize: 15, marginTop: 1 },
  scoreItemLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  scoreItemPts: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  scoreItemHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 17 },
  scoreFixBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7, marginTop: 2,
  },
  scoreFixText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  gbpIcon: { fontSize: 26, marginRight: 12 },
  gbpTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  gbpSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 16 },
  gbpChevron: { fontSize: 26, color: 'rgba(255,255,255,0.8)', marginLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '47.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#153e3f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardIcon: { fontSize: 30, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  cardBlurb: { fontSize: 11.5, color: COLORS.textMuted, lineHeight: 16 },

  // Tool workspace
  toolContent: { padding: 16, paddingBottom: 60 },
  backRow: { marginBottom: 14 },
  backText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  toolHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  toolIcon: { fontSize: 34, marginRight: 12 },
  toolTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  toolBlurb: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  historyLink: { marginTop: 18, alignSelf: 'center' },
  historyLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
});
