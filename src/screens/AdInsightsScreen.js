import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import * as ads from '../services/adsApi';

const STATUS_COLOR = { active: '#059669', paused: '#b45309', failed: '#dc2626' };

/** Integer metric (reach/impressions/clicks) with Indian grouping. */
function fmtInt(n) {
  const v = parseInt(n, 10);
  return (Number.isNaN(v) ? 0 : v).toLocaleString('en-IN');
}

/** Money metric (spend/cpc) with Indian grouping. */
function fmtMoney(n) {
  const v = parseFloat(n);
  return (Number.isNaN(v) ? 0 : v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function Metric({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/**
 * Full-screen ad performance for one boost campaign. Replaces the tiny one-line
 * summary that used to sit on the Boost Ads card — big, legible KPI tiles that
 * read well both for the merchant and for the App Review screencast.
 */
export default function AdInsightsScreen() {
  const { params, goBack } = useNavigation();
  const campaign = params?.campaign || {};

  const [data, setData] = useState(null);      // null = Meta has no delivered data yet
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setData(await ads.getInsights(campaign.campaign_id));
    } catch (e) {
      setError(e?.message || 'Could not load insights.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaign.campaign_id]);

  useEffect(() => { load(); }, [load]);

  const statusColor = STATUS_COLOR[campaign.status] || COLORS.textMuted;

  const metrics = data
    ? [
        { label: 'Spend', value: `₹${fmtMoney(data.spend)}` },
        { label: 'Reach', value: fmtInt(data.reach) },
        { label: 'Impressions', value: fmtInt(data.impressions) },
        { label: 'Clicks', value: fmtInt(data.clicks) },
        { label: 'CTR', value: data.ctr ? `${fmtMoney(data.ctr)}%` : '—' },
        { label: 'CPC', value: data.cpc ? `₹${fmtMoney(data.cpc)}` : '—' },
      ]
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
    >
      <TouchableOpacity style={styles.backRow} onPress={goBack}>
        <Text style={styles.backText}>‹ Back to Boosts</Text>
      </TouchableOpacity>

      {/* Campaign summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.campName} numberOfLines={2}>{campaign.name || 'Boost'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '1a' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{(campaign.status || '').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.campMeta}>
          Budget ₹{campaign.budget_inr || 0} · {campaign.duration_days || 0} day(s)
          {campaign.created_at ? ` · ${campaign.created_at}` : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>⚠️ Couldn't load insights</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : !data ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>📊 No data yet</Text>
          <Text style={styles.stateBody}>Your ad is still starting. Insights appear once it begins delivering — usually within a few hours.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}><Text style={styles.retryText}>Refresh</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}
          </View>
          <Text style={styles.footnote}>Performance from Meta Ads · lifetime of this campaign</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 60 },

  backRow: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 10 },
  backText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },

  summaryCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  campName: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.primary, marginRight: 10 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  campMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%', minHeight: 96, justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  metricLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  metricValue: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginTop: 8 },

  footnote: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 14 },

  center: { paddingVertical: 60, alignItems: 'center' },
  stateBox: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 20, alignItems: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  stateBody: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 14 },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
