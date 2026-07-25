import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { AI_TOOLS } from '../config/aiTools';
import { generate as generateAi, setSaved as apiSetSaved } from '../services/aiApi';
import AiToolForm from '../components/ai/AiToolForm';
import AiResultView from '../components/ai/AiResultView';
import AiHistorySheet from '../components/ai/AiHistorySheet';

/** Seed common fields from the logged-in user's profile (best-effort, all optional). */
function seedValues(tool, user) {
  const seed = {};
  const guessBusiness = user?.business_name || user?.vcard?.business_name || user?.name || '';
  const guessCity = user?.city || user?.vcard?.city || '';
  const guessCategory = user?.category || user?.vcard?.category || '';
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

  const openTool = (tool) => {
    setActiveTool(tool);
    setValues(seedValues(tool, user));
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

        <TouchableOpacity style={styles.gbpBanner} activeOpacity={0.85} onPress={() => navigate('google-business')}>
          <Text style={styles.gbpIcon}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gbpTitle}>Connect Google Business Profile</Text>
            <Text style={styles.gbpSub}>Edit your Google listing here — changes sync to Google.</Text>
          </View>
          <Text style={styles.gbpChevron}>›</Text>
        </TouchableOpacity>

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
