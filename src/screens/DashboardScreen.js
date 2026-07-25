import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { fetchApi } from '../config';

/**
 * Home screen — website-focused. Metrics + a real "Website Views" analytics chart
 * (last 7 days) from /api/sites/*. No vCard data.
 */
export default function DashboardScreen() {
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    sites: [], orders: {}, inquiries: {}, appts: {}, apptStats: {}, viewsTotal: 0, viewsDaily: null,
  });

  const load = async () => {
    try {
      const [sitesR, ordersR, inqR, apptR, viewsR] = await Promise.allSettled([
        fetchApi('/api/sites/list.php'),
        fetchApi('/api/sites/orders.php'),
        fetchApi('/api/sites/inquiries.php'),
        fetchApi('/api/sites/appointments.php'),
        fetchApi('/api/sites/views.php'),
      ]);
      const val = (r) => (r.status === 'fulfilled' ? r.value?.data || {} : {});
      const v = val(viewsR);
      setData({
        sites: val(sitesR).sites || [],
        orders: val(ordersR).counts || {},
        inquiries: val(inqR).counts || {},
        appts: val(apptR).counts || {},
        apptStats: val(apptR).stats || {},
        viewsTotal: v.total || 0,
        viewsDaily: Array.isArray(v.daily) ? v.daily : null,
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);
  useEffect(() => { load(); }, []);

  const { sites, orders, inquiries, appts, apptStats, viewsTotal } = data;

  const metrics = [
    { title: 'Website Orders', value: `${orders.all || 0}`, diff: `${orders.new || 0} New`, icon: '🛒', screen: 'website-orders' },
    { title: 'Website Inquiries', value: `${inquiries.all || 0}`, diff: `${inquiries.unread || 0} Unread`, icon: '📨', screen: 'website-inquiries' },
    { title: 'Appointments', value: `${apptStats.total ?? appts.all ?? 0}`, diff: `${apptStats.pending ?? appts.pending ?? 0} Pending`, icon: '📅', screen: 'website-appointments' },
    { title: 'My Websites', value: `${sites.length}`, diff: `${sites.filter((x) => x.published_at).length} Live`, icon: '🌐', screen: 'website-builder' },
  ];

  // Real website views, last 7 days (endpoint returns 7 entries; fall back to zeros).
  const dailyViews = data.viewsDaily && data.viewsDaily.length
    ? data.viewsDaily
    : (() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const out = [];
        for (let i = 6; i >= 0; i--) {
          const dt = new Date(now); dt.setDate(now.getDate() - i);
          out.push({ day: days[dt.getDay()], views: 0 });
        }
        return out;
      })();

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.sectionTitle}>Website Overview</Text>

      <View style={styles.grid}>
        {metrics.map((m, index) => (
          <TouchableOpacity key={index} style={styles.gridItem} onPress={() => navigate(m.screen)}>
            <GlassCard style={styles.metricCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{m.icon}</Text>
                <Text style={styles.diffText}>{m.diff}</Text>
              </View>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricTitle}>{m.title}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Website Views</Text>

      <GlassCard style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartSubTitle}>Daily views for last 7 days</Text>
          <Text style={styles.chartTotalText}>{viewsTotal} Total Views</Text>
        </View>

        <View style={styles.chartContainer}>
          {/* Grid lines in background */}
          <View style={styles.gridLinesContainer}>
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>

          {/* Columns */}
          <View style={styles.barsContainer}>
            {dailyViews.map((item, idx) => {
              const maxViews = Math.max(...dailyViews.map((d) => d.views), 1);
              const barHeightPct = `${(item.views / maxViews) * 100}%`;

              return (
                <View key={idx} style={styles.barColumn}>
                  <View style={styles.barWrapper}>
                    <Text style={styles.barValueText}>{item.views}</Text>
                    <View style={[styles.bar, { height: barHeightPct }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 16, marginTop: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  gridItem: { width: '48%', marginBottom: 16 },
  metricCard: { padding: 16, height: 140, justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { fontSize: 24 },
  diffText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  metricValue: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  metricTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  // Chart Styles (unchanged)
  chartCard: { padding: 20, marginBottom: 20, marginTop: 8 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartSubTitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chartTotalText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  chartContainer: { height: 180, position: 'relative', justifyContent: 'flex-end' },
  gridLinesContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingBottom: 24 },
  gridLine: { height: 1, backgroundColor: 'rgba(21, 62, 63, 0.06)', width: '100%' },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%', zIndex: 2 },
  barColumn: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 },
  barValueText: { fontSize: 10, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  bar: { width: 24, backgroundColor: COLORS.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6, opacity: 0.85 },
  barLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 4, height: 16 },
});
