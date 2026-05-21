import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

export default function MyDesignsScreen() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'categories', 'saved'
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Live data from API
  const [categories, setCategories] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Load categories on mount ────────────────────────────────────────────────
  useEffect(() => {
    loadCategories();
  }, []);

  // ─── Load designs whenever tab / selectedCategory changes ────────────────────
  useEffect(() => {
    if (activeTab === 'home') {
      // Home tab shows designs of first (festival/default) category
      if (categories.length > 0) {
        loadDesigns(categories[0].id);
      }
    } else if (activeTab === 'categories' && selectedCategory) {
      loadDesigns(selectedCategory);
    } else if (activeTab === 'saved') {
      loadSavedDesigns();
    }
  }, [activeTab, selectedCategory, categories]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetchApi('/api/designs/categories.php');
      if (res.success && res.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (e) {
      // Silently fallback — app still works
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadDesigns = async (categoryId) => {
    try {
      setLoadingDesigns(true);
      const res = await fetchApi(`/api/designs/list.php?category_id=${categoryId}`);
      if (res.success && res.data) {
        setDesigns(res.data.designs || []);
        // Merge saved IDs from response (so save state is accurate)
        if (res.data.saved_ids) {
          setSavedIds(res.data.saved_ids.map(Number));
        }
      }
    } catch (e) {
      setDesigns([]);
    } finally {
      setLoadingDesigns(false);
    }
  };

  const loadSavedDesigns = async () => {
    try {
      setLoadingDesigns(true);
      const res = await fetchApi('/api/designs/list.php?saved=1');
      if (res.success && res.data) {
        setDesigns(res.data.designs || []);
        if (res.data.saved_ids) setSavedIds(res.data.saved_ids.map(Number));
      }
    } catch (e) {
      setDesigns([]);
    } finally {
      setLoadingDesigns(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setDesigns([]);
  };

  const toggleSave = async (designId) => {
    // Optimistic toggle
    setSavedIds((prev) =>
      prev.includes(designId) ? prev.filter((id) => id !== designId) : [...prev, designId]
    );
    try {
      await fetchApi('/api/designs/save.php', {
        method: 'POST',
        body: JSON.stringify({ design_id: designId }),
      });
    } catch (e) {
      // Revert on failure
      setSavedIds((prev) =>
        prev.includes(designId) ? prev.filter((id) => id !== designId) : [...prev, designId]
      );
    }
  };

  const handleShare = async (design) => {
    try {
      await Share.share({
        message: `Check out this design on Tapify: ${design.title}\n${design.description}\nPreview: ${design.image_url}`,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderDesignCard = (design) => {
    const isSaved = savedIds.includes(Number(design.id));
    return (
      <View key={design.id} style={styles.cardContainer}>
        <GlassCard style={styles.card}>
          <Image source={{ uri: design.image_url }} style={styles.cardImage} />
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{design.title}</Text>
              <Text style={styles.categoryBadge}>{design.category_name}</Text>
            </View>
            {!!design.description && (
              <Text style={styles.cardDesc}>{design.description}</Text>
            )}
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton, isSaved && styles.savedActiveButton]}
                onPress={() => toggleSave(Number(design.id))}
                activeOpacity={0.8}
              >
                <Text style={styles.actionText}>{isSaved ? '❤️ Saved' : '🤍 Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => handleShare(design)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionText, styles.shareText]}>📤 Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>
      </View>
    );
  };

  // ─── Render loading skeleton ──────────────────────────────────────────────────
  if (loadingCategories) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textMuted, fontSize: 14 }}>Loading designs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          onPress={() => handleTabChange('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'categories' && styles.tabButtonActive]}
          onPress={() => handleTabChange('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>Categories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
          onPress={() => handleTabChange('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Saved {savedIds.length > 0 ? `(${savedIds.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Category Picker */}
      {activeTab === 'categories' && selectedCategory !== null && (
        <View style={styles.categoryPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map((cat) => {
              const isCatActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catFilterBtn, isCatActive && styles.catFilterBtnActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catFilterText, isCatActive && styles.catFilterTextActive]}>
                    {cat.icon} {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Categories Grid */}
        {activeTab === 'categories' && selectedCategory === null && (
          <View style={styles.gridContainer}>
            <Text style={styles.gridHeaderTitle}>Choose a Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.gridCard, { backgroundColor: cat.bg_color || '#f3f4f6' }]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.gridCardIcon}>{cat.icon || '🎨'}</Text>
                  <Text style={[styles.gridCardText, { color: cat.text_color || '#374151' }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Design List */}
        {(activeTab === 'home' || activeTab === 'saved' || (activeTab === 'categories' && selectedCategory !== null)) && (
          <>
            {activeTab === 'categories' && selectedCategory !== null && (
              <TouchableOpacity style={styles.backButtonRow} onPress={() => setSelectedCategory(null)}>
                <Text style={styles.backButtonText}>← Back to Categories</Text>
              </TouchableOpacity>
            )}

            {loadingDesigns ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : designs.length > 0 ? (
              designs.map((design) => renderDesignCard(design))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎨</Text>
                {activeTab === 'saved' ? (
                  <>
                    <Text style={styles.emptyTitle}>No Saved Designs</Text>
                    <Text style={styles.emptySubtitle}>
                      Tap the Save button on any design to bookmark it here!
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>No Designs Yet</Text>
                    <Text style={styles.emptySubtitle}>
                      The designer hasn't added any designs in this category yet. Pull down to refresh!
                    </Text>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: 'rgba(21, 62, 63, 0.08)' },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  categoryPicker: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  categoryScroll: { paddingHorizontal: 16 },
  catFilterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f3f4f6', marginRight: 8, borderWidth: 1, borderColor: 'transparent',
  },
  catFilterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catFilterText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  catFilterTextActive: { color: '#ffffff' },

  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 4 },
  backButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  gridContainer: { paddingVertical: 10 },
  gridHeaderTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '47%', aspectRatio: 1.1, borderRadius: 16, padding: 16,
    marginBottom: 20, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
  },
  gridCardIcon: { fontSize: 36, marginBottom: 10 },
  gridCardText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  scrollContent: { padding: 16, paddingBottom: 40 },
  cardContainer: { marginBottom: 16 },
  card: { overflow: 'hidden', padding: 0 },
  cardImage: { width: '100%', height: 180, backgroundColor: COLORS.border },
  cardBody: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, flex: 1 },
  categoryBadge: {
    fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(21, 62, 63, 0.06)',
    color: COLORS.primary, paddingVertical: 3, paddingHorizontal: 8,
    borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 16 },
  cardFooter: { flexDirection: 'row' },
  actionButton: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: 'rgba(21, 62, 63, 0.05)', marginRight: 8,
    borderWidth: 1, borderColor: 'rgba(21, 62, 63, 0.1)',
  },
  savedActiveButton: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
  shareButton: { backgroundColor: COLORS.primary, marginLeft: 8 },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  shareText: { color: '#ffffff' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
