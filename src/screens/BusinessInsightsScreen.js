import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { getInsights } from '../services/googleBusinessApi';

/**
 * How the listing actually performed.
 *
 * This is the screen that proves the rest of the product works: the score says
 * the profile got better, this says the phone rang more. Everything here is
 * Google's own count — nothing is modelled or estimated.
 */

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const ICONS = { views: '👀', calls: '📞', directions: '🧭', website: '🔗', messages: '💬' };

const fmtDate = (s) => {
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? s : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Bare bar chart. A dependency-free row of divs is enough for a daily count. */
function Sparkline({ points }) {
  const values = (points || []).map((p) => p.value);
  const max = Math.max(1, ...values);
  if (!values.length) return null;
  return (
    <View style={styles.chart}>
      {points.map((p) => (
        <View key={p.date} style={styles.barSlot}>
          <View style={[styles.bar, { height: Math.max(2, (p.value / max) * 60) }]} />
        </View>
      ))}
    </View>
  );
}

export default function BusinessInsightsScreen() {
  const { navigate } = useNavigation();

  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (d = days) => {
    try {
      setError(null);
      setData(await getInsights(d));
    } catch (e) {
      setError(e?.message || 'Could not load your Google insights.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(days); }, [days, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(days);
    setRefreshing(false);
  }, [days, load]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>📈</Text>
        <Text style={styles.errTitle}>Could not load insights</Text>
        <Text style={styles.errText}>{error}</Text>
        <Text style={[styles.errText, { marginTop: 10 }]}>
          If this says access was denied, the Business Profile Performance API may not be
          switched on for your account yet.
        </Text>
        <TouchableOpacity style={styles.errBtn} onPress={() => load(days)}>
          <Text style={styles.errBtnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate('ai-growth')}>
          <Text style={styles.errLink}>Back to AI Growth Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cards = data?.cards || [];
  const views = cards.find((c) => c.key === 'views');
  const rest = cards.filter((c) => c.key !== 'views');
  const split = data?.split || { search: 0, maps: 0 };
  const total = (split.search || 0) + (split.maps || 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigate('ai-growth')}>
        <Text style={styles.backText}>← AI Growth Center</Text>
      </TouchableOpacity>

      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.days}
            style={[styles.range, days === r.days && styles.rangeOn]}
            onPress={() => { setLoading(true); setDays(r.days); }}
          >
            <Text style={[styles.rangeText, days === r.days && styles.rangeTextOn]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Headline */}
      {!!views && (
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Views on Google</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroValue}>{views.value.toLocaleString()}</Text>
            <Delta card={views} big />
          </View>
          <Text style={styles.heroSub}>{views.blurb}</Text>
          <Sparkline points={data?.series?.views} />
          {total > 0 && (
            <View style={styles.splitRow}>
              <View style={[styles.splitFill, { flex: Math.max(1, split.search) }]} />
              <View style={[styles.splitFill, styles.splitMaps, { flex: Math.max(1, split.maps) }]} />
            </View>
          )}
          {total > 0 && (
            <Text style={styles.splitLegend}>
              {Math.round((split.search / total) * 100)}% found you on Search ·{' '}
              {Math.round((split.maps / total) * 100)}% on Maps
            </Text>
          )}
        </View>
      )}

      {/* What they did next */}
      <Text style={styles.sectionHead}>What people did</Text>
      {rest.map((c) => (
        <View key={c.key} style={styles.card}>
          <Text style={styles.cardIcon}>{ICONS[c.key] || '•'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{c.label}</Text>
            <Text style={styles.cardBlurb}>{c.blurb}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardValue}>{c.value.toLocaleString()}</Text>
            <Delta card={c} />
          </View>
        </View>
      ))}

      <Text style={styles.footnote}>
        {data?.range?.start ? `${fmtDate(data.range.start)} – ${fmtDate(data.range.end)}` : ''}
        {'  ·  compared with the '}{data?.days} days before that.
        {'\n'}Google publishes this data about {data?.lag_days} days behind, so the last few days
        are never included — that keeps the comparison fair rather than showing a fake drop.
      </Text>
    </ScrollView>
  );
}

/** Change vs the previous period. Falls back to a raw count from a zero base. */
function Delta({ card, big }) {
  const { delta, delta_pct: pct } = card;
  if (!delta) return <Text style={[styles.deltaFlat, big && styles.deltaBig]}>no change</Text>;
  const up = delta > 0;
  const text = pct === null || pct === undefined
    ? `${up ? '+' : ''}${delta}`
    : `${up ? '▲' : '▼'} ${Math.abs(pct)}%`;
  return (
    <Text style={[styles.delta, big && styles.deltaBig, { color: up ? '#059669' : '#b45309' }]}>
      {text}
    </Text>
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

  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  range: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surface,
  },
  rangeOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rangeText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted },
  rangeTextOn: { color: '#fff' },

  heroCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 18,
  },
  heroLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 2 },
  heroValue: { fontSize: 36, fontWeight: '900', color: COLORS.text },
  heroSub: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2, lineHeight: 18 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 62, gap: 1, marginTop: 14 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { backgroundColor: COLORS.primary, borderRadius: 1.5, opacity: 0.85 },

  splitRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  splitFill: { backgroundColor: COLORS.primary },
  splitMaps: { backgroundColor: COLORS.accent },
  splitLegend: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 },

  sectionHead: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 8,
  },
  cardIcon: { fontSize: 20 },
  cardLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  cardBlurb: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  cardValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },

  delta: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  deltaBig: { fontSize: 14 },
  deltaFlat: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },

  footnote: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, marginTop: 16 },
});
