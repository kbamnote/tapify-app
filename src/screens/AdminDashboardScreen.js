import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { fetchApi } from '../config';

/**
 * Admin → Dashboard
 * Platform-wide KPIs + insights + recent activity.
 * GET /api/analytics/dashboard.php  (returns platform-wide numbers when the
 * logged-in user is an admin).
 */
export default function AdminDashboardScreen() {
  const { navigate } = useNavigation();
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [data,      setData]      = useState(null);

  const load = async () => {
    try {
      const res = await fetchApi('/api/analytics/dashboard.php');
      setData(res.data);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load admin analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const stats      = data?.stats || {};
  const insights   = data?.insights || [];
  const activities = data?.activities || [];
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const kpis = [
    { label: 'Total Users',   value: stats.total_users ?? '—', icon: '👥', screen: 'admin-users' },
    { label: 'vCards',        value: stats.total_vcards ?? 0,  icon: '📇', sub: `${stats.active_vcards ?? 0} active` },
    { label: 'Web Stores',    value: stats.total_stores ?? 0,  icon: '🏪', sub: `${stats.store_views ?? 0} views` },
    { label: 'vCard Views',   value: stats.total_views ?? 0,   icon: '👁️' },
    { label: 'Orders',        value: stats.total_orders ?? 0,  icon: '🛍️', sub: `${stats.pending_orders ?? 0} pending` },
    { label: 'Revenue',       value: inr(stats.total_revenue), icon: '💰' },
    { label: 'Inquiries',     value: stats.total_inquiries ?? 0, icon: '✉️', sub: `${stats.unread_inquiries ?? 0} unread` },
    { label: 'Appointments',  value: stats.total_appointments ?? 0, icon: '📅', sub: `${stats.today_appointments ?? 0} today` },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.sectionTitle}>Platform Overview</Text>
      <View style={styles.grid}>
        {kpis.map((k, i) => (
          <TouchableOpacity
            key={i}
            style={styles.gridItem}
            activeOpacity={k.screen ? 0.8 : 1}
            onPress={() => k.screen && navigate(k.screen)}
          >
            <GlassCard style={styles.kpiCard}>
              <View style={styles.kpiHead}>
                <Text style={styles.kpiIcon}>{k.icon}</Text>
                {k.sub ? <Text style={styles.kpiSub}>{k.sub}</Text> : null}
              </View>
              <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{String(k.value)}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick admin actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <QuickAction icon="📣" label="Send Notification" onPress={() => navigate('admin-broadcast')} />
        <QuickAction icon="👥" label="Manage Users"      onPress={() => navigate('admin-users')} />
        <QuickAction icon="📥" label="Leads"             onPress={() => navigate('admin-leads')} />
        <QuickAction icon="♛"  label="Titanium"          onPress={() => navigate('admin-titanium')} />
      </View>

      {insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Insights</Text>
          {insights.map((ins, i) => (
            <GlassCard key={i} style={styles.insightCard}>
              <View style={[styles.insightDot, { backgroundColor: ins.color || COLORS.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{ins.title}</Text>
                <Text style={styles.insightMsg}>{ins.message}</Text>
              </View>
            </GlassCard>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {activities.length === 0 ? (
        <GlassCard style={styles.emptyCard}><Text style={styles.emptyText}>No recent activity</Text></GlassCard>
      ) : (
        activities.map((a, i) => (
          <GlassCard key={i} style={styles.activityCard}>
            <Text style={styles.activityIcon}>{ACT_ICON[a.type] || '•'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle} numberOfLines={1}>{a.title || '—'}</Text>
              {a.detail ? <Text style={styles.activityDetail} numberOfLines={1}>{a.detail}</Text> : null}
              {a.source ? <Text style={styles.activitySource} numberOfLines={1}>{a.source}</Text> : null}
            </View>
            <Text style={styles.activityTime}>{a.time_ago}</Text>
          </GlassCard>
        ))
      )}
    </ScrollView>
  );
}

const ACT_ICON = { inquiry: '✉️', appointment: '📅', order: '🛍️' };

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.8}>
      <GlassCard style={styles.quickCard}>
        <Text style={styles.quickIcon}>{icon}</Text>
        <Text style={styles.quickLabel}>{label}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 16, paddingBottom: 48 },
  centered:  { justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 14, marginTop: 12 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 14 },
  kpiCard:  { padding: 14, height: 118, justifyContent: 'space-between' },
  kpiHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiIcon:  { fontSize: 22 },
  kpiSub:   { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  kpiValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickItem:  { width: '48%', marginBottom: 12 },
  quickCard:  { padding: 16, flexDirection: 'row', alignItems: 'center' },
  quickIcon:  { fontSize: 20, marginRight: 10 },
  quickLabel: { fontSize: 13.5, fontWeight: '700', color: COLORS.text, flexShrink: 1 },

  insightCard: { padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  insightDot:  { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  insightTitle:{ fontSize: 13, fontWeight: '800', color: COLORS.text },
  insightMsg:  { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },

  activityCard:  { padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  activityIcon:  { fontSize: 18, marginRight: 10 },
  activityTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  activityDetail:{ fontSize: 12, color: COLORS.textMuted },
  activitySource:{ fontSize: 11, color: COLORS.primary, marginTop: 1 },
  activityTime:  { fontSize: 11, color: COLORS.textMuted, marginLeft: 8 },

  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
