import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, RefreshControl, Linking, Alert,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { fetchApi } from '../config';

// ── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'All',
  'Retail & Shopping',
  'Food & Restaurant',
  'IT & Software',
  'Healthcare & Medical',
  'Education & Training',
  'Finance & Accounting',
  'Beauty & Wellness',
  'Construction & Real Estate',
  'Manufacturing',
  'Other',
];

const CAT_ICONS = {
  'All':                       '🏢',
  'Retail & Shopping':         '🛒',
  'Food & Restaurant':         '🍽️',
  'IT & Software':             '💻',
  'Healthcare & Medical':      '🏥',
  'Education & Training':      '🎓',
  'Finance & Accounting':      '💰',
  'Beauty & Wellness':         '💆',
  'Construction & Real Estate':'🏗️',
  'Manufacturing':             '🏭',
  'Other':                     '🔷',
};

// Deterministic avatar colour from business name
function avatarColor(name = '') {
  const palette = ['#153e3f', '#2d6a6b', '#4a9e7f', '#d19a66', '#8b5e3c', '#5c7a9e'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BusinessesScreen() {
  const { navigate } = useNavigation();

  const [businesses,    setBusinesses]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [search,        setSearch]        = useState('');
  const [selectedCat,   setSelectedCat]   = useState('All');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);

  const searchTimerRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBusinesses = useCallback(async (
    searchVal, catVal, pageNum, append
  ) => {
    try {
      if (!append) setLoading(true);
      else         setLoadingMore(true);

      const qs = new URLSearchParams({
        search:   searchVal,
        category: catVal === 'All' ? '' : catVal,
        page:     String(pageNum),
        sort:     'newest',
      });

      const res = await fetchApi(`/api/businesses/list.php?${qs}`);
      const items = res.data?.businesses || [];

      setBusinesses(prev => append ? [...prev, ...items] : items);
      setHasMore(res.data?.has_more || false);
      setPage(pageNum);
    } catch (err) {
      if (!append) Alert.alert('Error', 'Could not load businesses. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses('', 'All', 1, false);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearch = (text) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchBusinesses(text, selectedCat, 1, false);
    }, 400);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCat(cat);
    fetchBusinesses(search, cat, 1, false);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBusinesses(search, selectedCat, 1, false);
    setRefreshing(false);
  }, [search, selectedCat, fetchBusinesses]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchBusinesses(search, selectedCat, page + 1, true);
    }
  };

  const handleWhatsApp = (phone) => {
    if (!phone) { Alert.alert('No Number', 'This business has not added a phone number.'); return; }
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)
      .catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const handleCall = (phone) => {
    if (!phone) { Alert.alert('No Number', 'This business has not added a phone number.'); return; }
    Linking.openURL(`tel:${phone}`)
      .catch(() => Alert.alert('Error', 'Could not initiate call'));
  };

  const handleWebsite = (url) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(fullUrl).catch(() => Alert.alert('Error', 'Could not open website'));
  };

  // ── Business Card ──────────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <GlassCard style={styles.bizCard}>
      {/* Top row: logo + name + badges */}
      <View style={styles.cardTop}>
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.bizLogo} />
        ) : (
          <View style={[styles.bizLogoFallback, { backgroundColor: avatarColor(item.business_name) }]}>
            <Text style={styles.bizLogoInitials}>
              {item.business_name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.bizInfoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.bizName} numberOfLines={1}>{item.business_name}</Text>
            {item.is_mine && (
              <View style={styles.mineBadge}>
                <Text style={styles.mineBadgeText}>Mine</Text>
              </View>
            )}
            {item.gstin_registered && (
              <View style={styles.gstBadge}>
                <Text style={styles.gstBadgeText}>GST ✓</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {item.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>
                  {CAT_ICONS[item.category] || '🔷'} {item.category}
                </Text>
              </View>
            ) : null}
            {item.city ? (
              <Text style={styles.cityText}>📍 {item.city}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Description */}
      {item.description_short ? (
        <Text style={styles.bizDesc} numberOfLines={2}>{item.description_short}</Text>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {item.phone ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.waBtn]}
              onPress={() => handleWhatsApp(item.phone)}
            >
              <Text style={styles.waBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.callBtn]}
              onPress={() => handleCall(item.phone)}
            >
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {item.website ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.webBtn]}
            onPress={() => handleWebsite(item.website)}
          >
            <Text style={styles.webBtnText}>🌐 Website</Text>
          </TouchableOpacity>
        ) : null}
        {!item.phone && !item.website ? (
          <Text style={styles.noContact}>No contact info</Text>
        ) : null}
      </View>
    </GlassCard>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses, city..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, selectedCat === cat && styles.pillActive]}
            onPress={() => handleCategorySelect(cat)}
          >
            <Text style={[styles.pillText, selectedCat === cat && styles.pillTextActive]}>
              {CAT_ICONS[cat]} {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List / empty / loading states */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading businesses...</Text>
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTitle}>No Businesses Found</Text>
          <Text style={styles.emptySubtitle}>
            {search || selectedCat !== 'All'
              ? 'Try a different search or category.'
              : 'Be the first! Add your business from your Profile.'}
          </Text>
          {!search && selectedCat === 'All' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => navigate('profile')}>
              <Text style={styles.addBtnText}>Add My Business →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={COLORS.primary} style={styles.loadMoreSpinner} />
              : null
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} found
            </Text>
          }
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Search
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  searchClear: {
    fontSize: 14,
    color: COLORS.textMuted,
    padding: 4,
  },
  // Category pills
  pillsScroll: {
    maxHeight: 48,
    marginBottom: 4,
  },
  pillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 6,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
    marginTop: 4,
  },
  loadMoreSpinner: {
    marginVertical: 20,
  },
  // Business card
  bizCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bizLogo: {
    width: 58,
    height: 58,
    borderRadius: 10,
    marginRight: 14,
  },
  bizLogoFallback: {
    width: 58,
    height: 58,
    borderRadius: 10,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizLogoInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  bizInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 6,
  },
  bizName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1,
  },
  mineBadge: {
    backgroundColor: COLORS.primary + '18',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '35',
  },
  mineBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  gstBadge: {
    backgroundColor: '#25d36618',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#25d36640',
  },
  gstBadgeText: {
    fontSize: 10,
    color: '#1da851',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  catBadge: {
    backgroundColor: COLORS.accent + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
  cityText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bizDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  waBtn: {
    backgroundColor: '#25d36612',
    borderColor: '#25d36660',
  },
  waBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1aab52',
  },
  callBtn: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '40',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  webBtn: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '40',
  },
  webBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noContact: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
