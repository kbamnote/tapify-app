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
  TextInput,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';
import { useNavigation } from '../context/NavigationContext';
import { API_BASE } from '../config';

export default function MyDesignsScreen() {
  const { navigate, params } = useNavigation();
  const [activeTab, setActiveTab] = useState(params?.returnToTab || 'home'); 
  const [selectedCategory, setSelectedCategory] = useState(params?.returnToCategory || null);
  const [selectedGlobalCategory, setSelectedGlobalCategory] = useState(params?.returnToGlobalCategory || null);
  const [selectedGlobalSubCategory, setSelectedGlobalSubCategory] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Live data from API
  const [categories, setCategories] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  // Live data for new Categories feature
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalSubCategories, setGlobalSubCategories] = useState([]);
  const [globalCategoryContent, setGlobalCategoryContent] = useState([]);

  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [catError, setCatError] = useState(null);

  // ─── Load categories on mount ────────────────────────────────────────────────
  useEffect(() => {
    loadCategories();
    loadGlobalCategories();
  }, []);

  // ─── Load designs whenever tab / selectedCategory changes ────────────────────
  useEffect(() => {
    if (activeTab === 'home' && selectedCategory !== null) {
      loadDesigns(selectedCategory);
    } else if (activeTab === 'saved') {
      loadSavedDesigns();
    } else if (activeTab === 'categories' && selectedGlobalSubCategory !== null) {
      loadGlobalCategoryContent(selectedGlobalSubCategory);
    } else if (activeTab === 'categories' && selectedGlobalCategory !== null) {
      loadGlobalSubCategories(selectedGlobalCategory);
    }
  }, [activeTab, selectedCategory, selectedGlobalCategory, selectedGlobalSubCategory]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setCatError(null);
      const res = await fetchApi('/api/designs/categories.php');
      if (res.data?.categories) {
        setCategories(res.data.categories);
      } else {
        setCategories([]);
      }
    } catch (e) {
      setCatError(e.message || 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadGlobalCategories = async () => {
    try {
      const res = await fetchApi('/api/categories/list.php');
      if (res.success && res.data) {
        setGlobalCategories(res.data.categories || []);
      }
    } catch (e) {
      console.log('Failed to load global categories', e);
    }
  };

  const loadGlobalSubCategories = async (parentId) => {
    try {
      setLoadingGlobal(true);
      setGlobalSubCategories([]);
      setGlobalCategoryContent([]);
      const res = await fetchApi(`/api/categories/list.php?parent_id=${parentId}`);
      if (res.success && res.data) {
        const subs = res.data.categories || [];
        setGlobalSubCategories(subs);
        if (subs.length === 0) {
          // No sub-categories — load content directly
          await loadGlobalCategoryContent(parentId);
          return;
        }
      }
    } catch (e) {
      setGlobalSubCategories([]);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const loadGlobalCategoryContent = async (categoryId) => {
    try {
      setLoadingGlobal(true);
      const res = await fetchApi(`/api/categories/content/list.php?category_id=${categoryId}`);
      if (res.success && res.data) {
        setGlobalCategoryContent(res.data.content || []);
      }
    } catch (e) {
      setGlobalCategoryContent([]);
    } finally {
      setLoadingGlobal(false);
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
    setSelectedGlobalCategory(null);
    setDesigns([]);
    setGlobalCategoryContent([]);
    setSearchQuery('');
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
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => navigate('design-customize', { 
            design,
            returnToTab: activeTab,
            returnToCategory: selectedCategory,
            returnToGlobalCategory: selectedGlobalCategory
          })}
        >
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
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Render: loading ─────────────────────────────────────────────────────────
  if (loadingCategories) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textMuted, fontSize: 14 }}>Loading categories...</Text>
      </View>
    );
  }

  // ─── Render: error ───────────────────────────────────────────────────────────
  if (catError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>Failed to Load</Text>
        <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>{catError}</Text>
        <TouchableOpacity style={[styles.actionButton, styles.shareButton, { paddingHorizontal: 24, flex: 0 }]} onPress={loadCategories}>
          <Text style={[styles.actionText, styles.shareText]}>🔄 Retry</Text>
        </TouchableOpacity>
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

      {/* Fixed Search Bar */}
      {((activeTab === 'home' && selectedCategory === null) || 
        (activeTab === 'categories' && selectedGlobalCategory === null)) && (
        <View style={[styles.searchBar, { marginHorizontal: 16, marginTop: 16, marginBottom: 0 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Categories Grid */}
        {activeTab === 'home' && selectedCategory === null && (
          <View style={styles.gridContainer}>
            <Text style={styles.gridHeaderTitle}>Choose a Category</Text>

            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = q
                ? categories.filter(cat => cat.name.toLowerCase().includes(q))
                : categories;
              return filtered.length > 0 ? (
                <View style={styles.categoryGrid}>
                  {filtered.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.newGridCard}
                      onPress={() => setSelectedCategory(cat.id)}
                      activeOpacity={0.85}
                    >
                      {cat.image_url ? (
                        <Image source={{ uri: cat.image_url }} style={styles.newGridCardImage} />
                      ) : (
                        <View style={[styles.newGridCardImage, { backgroundColor: cat.bg_color || '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: 36 }}>{cat.icon || '🎨'}</Text>
                        </View>
                      )}
                      <View style={styles.newGridCardLabelContainer}>
                        <Text style={styles.newGridCardText}>{cat.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No Results</Text>
                  <Text style={styles.emptySubtitle}>No categories match "{searchQuery}"</Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Categories Tab Grid */}
        {activeTab === 'categories' && selectedGlobalCategory === null && (
          <View style={styles.gridContainer}>
            <Text style={styles.gridHeaderTitle}>Browse Categories</Text>

            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = q
                ? globalCategories.filter(cat => cat.name.toLowerCase().includes(q))
                : globalCategories;
              return filtered.length > 0 ? (
                <View style={styles.categoryGrid}>
                  {filtered.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.newGridCard}
                      onPress={() => { setSelectedGlobalSubCategory(null); setSelectedGlobalCategory(cat.id); }}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: cat.image_url ? (cat.image_url.startsWith('http') ? cat.image_url : `${API_BASE}${cat.image_url}`) : null }} style={styles.newGridCardImage} />
                      <View style={styles.newGridCardLabelContainer}>
                        <Text style={styles.newGridCardText}>{cat.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No Results</Text>
                  <Text style={styles.emptySubtitle}>
                    {globalCategories.length === 0
                      ? 'No categories available.'
                      : `No categories match "${searchQuery}"`}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Global Category Content Viewer */}
        {activeTab === 'categories' && selectedGlobalCategory !== null && (
          <>
            <TouchableOpacity
              style={styles.backButtonRow}
              onPress={() => {
                if (selectedGlobalSubCategory !== null) {
                  setSelectedGlobalSubCategory(null);
                } else {
                  setSelectedGlobalCategory(null);
                  setGlobalSubCategories([]);
                  setGlobalCategoryContent([]);
                }
              }}
            >
              <Text style={styles.backButtonText}>
                {selectedGlobalSubCategory !== null ? '← Back to Sub-categories' : '← Back to Categories'}
              </Text>
            </TouchableOpacity>

            {loadingGlobal ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : selectedGlobalSubCategory === null && globalSubCategories.length > 0 ? (
              // Show sub-categories grid
              <View style={styles.gridContainer}>
                <View style={styles.categoryGrid}>
                  {globalSubCategories.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={styles.newGridCard}
                      onPress={() => setSelectedGlobalSubCategory(sub.id)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: sub.image_url ? (sub.image_url.startsWith('http') ? sub.image_url : `${API_BASE}${sub.image_url}`) : null }}
                        style={styles.newGridCardImage}
                      />
                      <View style={styles.newGridCardLabelContainer}>
                        <Text style={styles.newGridCardText}>{sub.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : globalCategoryContent.length > 0 ? (
              globalCategoryContent.map(item => (
                <GlassCard key={item.id} style={{ marginBottom: 15, padding: 15 }}>
                  {item.type !== 'text' && item.image_url && (
                    <Image
                      source={{ uri: item.image_url.startsWith('http') ? item.image_url : `${API_BASE}${item.image_url}` }}
                      style={{ width: '100%', height: 250, borderRadius: 10, marginBottom: 10 }}
                      resizeMode="cover"
                    />
                  )}
                  {item.type !== 'image' && item.text_content && (
                    <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22, fontWeight: '500' }}>{item.text_content}</Text>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    <TouchableOpacity style={styles.catContentActionBtn} onPress={() => {
                        Share.share({ message: item.text_content || 'Check out this post from Tapify!', url: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_BASE}${item.image_url}`) : undefined });
                    }}>
                      <Text style={styles.catContentActionText}>📤 Share</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No Content Found</Text>
                <Text style={styles.emptySubtitle}>There is no content in this category yet.</Text>
              </View>
            )}
          </>
        )}

        {/* Design List (Home / Saved) */}
        {(activeTab === 'saved' || (activeTab === 'home' && selectedCategory !== null)) && (
          <>
            {activeTab === 'home' && selectedCategory !== null && (
              <TouchableOpacity style={styles.backButtonRow} onPress={() => setSelectedCategory(null)}>
                <Text style={styles.backButtonText}>← Back to Home Categories</Text>
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
  
  newGridCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  newGridCardImage: {
    width: '100%',
    height: '100%',
  },
  newGridCardLabelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  newGridCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  scrollContent: { padding: 16, paddingBottom: 40 },
  cardContainer: { marginBottom: 16 },
  card: { overflow: 'hidden', padding: 0 },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.border },
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
  
  catContentActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  catContentActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(21,62,63,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: '#153e3f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    padding: 0,
  },
  searchClear: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
    paddingLeft: 8,
  },
});
