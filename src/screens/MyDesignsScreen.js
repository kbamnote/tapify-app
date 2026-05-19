import React, { useState } from 'react';
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
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';

const ALL_DESIGNS = [
  // Festival Category
  {
    id: 'f1',
    title: 'Happy Diwali',
    category: 'festival',
    categoryLabel: 'Festival',
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=500&auto=format&fit=crop&q=80',
    description: 'Spread light and joy this Diwali with our custom greeting card designs.',
  },
  {
    id: 'f2',
    title: 'Happy Holi',
    category: 'festival',
    categoryLabel: 'Festival',
    image: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=80',
    description: 'Celebrate the vibrant festival of colors with custom design templates.',
  },
  {
    id: 'f3',
    title: 'Eid Mubarak',
    category: 'festival',
    categoryLabel: 'Festival',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=500&auto=format&fit=crop&q=80',
    description: 'Send warm blessings and Eid wishes to family and friends.',
  },
  {
    id: 'f4',
    title: 'Merry Christmas',
    category: 'festival',
    categoryLabel: 'Festival',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80',
    description: 'Celebrate the magic, joy, and warmth of the holiday season.',
  },
  {
    id: 'f5',
    title: 'Happy Janmashtami',
    category: 'festival',
    categoryLabel: 'Festival',
    image: 'https://images.unsplash.com/photo-1629815049079-052445885e3a?w=500&auto=format&fit=crop&q=80',
    description: 'Celebrate Lord Krishna\'s birthday with traditional patterns.',
  },
  {
    id: 'f6',
    title: 'Ganesh Chaturthi',
    category: 'festival',
    categoryLabel: 'Festival',
    image: 'https://images.unsplash.com/photo-1567591414240-e22137651a56?w=500&auto=format&fit=crop&q=80',
    description: 'Welcome Lord Ganesha with elegant invitations and greetings.',
  },

  // Important Days
  {
    id: 'd1',
    title: 'World Earth Day',
    category: 'important days',
    categoryLabel: 'Important Days',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=80',
    description: 'Nurture nature and raise environmental awareness today.',
  },
  {
    id: 'd2',
    title: 'International Yoga Day',
    category: 'important days',
    categoryLabel: 'Important Days',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&auto=format&fit=crop&q=80',
    description: 'Nurture your mind, body, and soul with healthy yoga routines.',
  },
  {
    id: 'd3',
    title: 'World Environment Day',
    category: 'important days',
    categoryLabel: 'Important Days',
    image: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=500&auto=format&fit=crop&q=80',
    description: 'Revive and restore ecosystems for a sustainable future.',
  },

  // Quotes
  {
    id: 'q1',
    title: 'Daily Motivation',
    category: 'quotes',
    categoryLabel: 'Quotes',
    image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=500&auto=format&fit=crop&q=80',
    description: '"Believe you can and you are halfway there." - Theodore Roosevelt',
  },
  {
    id: 'q2',
    title: 'Success Mindset',
    category: 'quotes',
    categoryLabel: 'Quotes',
    image: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=500&auto=format&fit=crop&q=80',
    description: '"The secret of success is to do common things uncommonly well."',
  },

  // Business
  {
    id: 'b1',
    title: 'Grand Opening Sale',
    category: 'business',
    categoryLabel: 'Business',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=80',
    description: 'Celebrate our new store launch with flat 30% off on all items!',
  },
  {
    id: 'b2',
    title: 'New Product Arrival',
    category: 'business',
    categoryLabel: 'Business',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80',
    description: 'Upgrade your lifestyle today. Fresh arrivals in stock!',
  },
];

const CATEGORIES = [
  { id: 'festival', label: 'Festival', icon: '🎉', bgColor: '#fce7f3', textColor: '#be185d' },
  { id: 'important days', label: 'Important Days', icon: '📅', bgColor: '#e0f2fe', textColor: '#0369a1' },
  { id: 'quotes', label: 'Quotes', icon: '💬', bgColor: '#d1fae5', textColor: '#047857' },
  { id: 'business', label: 'Business', icon: '💼', bgColor: '#ffedd5', textColor: '#c2410c' },
];

export default function MyDesignsScreen() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'categories', 'saved'
  const [selectedCategory, setSelectedCategory] = useState(null); // Initialized to null!
  const [savedIds, setSavedIds] = useState([]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCategory(null);
  };

  const toggleSave = (id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleShare = async (design) => {
    try {
      await Share.share({
        message: `Check out this design on Tapify: ${design.title} - ${design.description}\nPreview: ${design.image}`,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getDesignsForTab = () => {
    if (activeTab === 'home') {
      return ALL_DESIGNS.filter((d) => d.category === 'festival');
    }
    if (activeTab === 'categories') {
      if (!selectedCategory) return [];
      return ALL_DESIGNS.filter((d) => d.category === selectedCategory);
    }
    if (activeTab === 'saved') {
      return ALL_DESIGNS.filter((d) => savedIds.includes(d.id));
    }
    return [];
  };

  const currentDesigns = getDesignsForTab();

  const renderDesignCard = (design) => {
    const isSaved = savedIds.includes(design.id);
    return (
      <View key={design.id} style={styles.cardContainer}>
        <GlassCard style={styles.card}>
          <Image source={{ uri: design.image }} style={styles.cardImage} />
          
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{design.title}</Text>
              <Text style={styles.categoryBadge}>{design.categoryLabel}</Text>
            </View>
            <Text style={styles.cardDesc}>{design.description}</Text>

            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton, isSaved && styles.savedActiveButton]}
                onPress={() => toggleSave(design.id)}
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

  return (
    <View style={styles.container}>
      {/* Top Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          onPress={() => handleTabChange('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'categories' && styles.tabButtonActive]}
          onPress={() => handleTabChange('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
            Categories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
          onPress={() => handleTabChange('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Saved ({savedIds.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Category Picker (only in Categories tab and when category is selected) */}
      {activeTab === 'categories' && selectedCategory !== null && (
        <View style={styles.categoryPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isCatActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catFilterBtn, isCatActive && styles.catFilterBtnActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catFilterText, isCatActive && styles.catFilterTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'categories' && selectedCategory === null ? (
          /* Large Category Grid View (when no category is selected) */
          <View style={styles.gridContainer}>
            <Text style={styles.gridHeaderTitle}>Choose a Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.gridCard, { backgroundColor: cat.bgColor }]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.gridCardIcon}>{cat.icon}</Text>
                  <Text style={[styles.gridCardText, { color: cat.textColor }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          /* Standard Design list view */
          <>
            {activeTab === 'categories' && selectedCategory !== null && (
              <TouchableOpacity
                style={styles.backButtonRow}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>← Back to Categories</Text>
              </TouchableOpacity>
            )}

            {currentDesigns.length > 0 ? (
              currentDesigns.map((design) => renderDesignCard(design))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎨</Text>
                {activeTab === 'saved' ? (
                  <>
                    <Text style={styles.emptyTitle}>No Saved Designs</Text>
                    <Text style={styles.emptySubtitle}>
                      Tap the Save button on any design in Home or Categories to access them here quickly!
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>No Designs Found</Text>
                    <Text style={styles.emptySubtitle}>There are no design templates available in this filter.</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(21, 62, 63, 0.08)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  // Category Selector Styles
  categoryPicker: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  catFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catFilterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  catFilterTextActive: {
    color: '#ffffff',
  },

  // Back navigation row
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Category Grid View Styles
  gridContainer: {
    paddingVertical: 10,
  },
  gridHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '47%',
    aspectRatio: 1.1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  gridCardIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  gridCardText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Scroll Content & Cards
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    overflow: 'hidden',
    padding: 0,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
  },
  cardBody: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(21, 62, 63, 0.06)',
    color: COLORS.primary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: 'rgba(21, 62, 63, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.1)',
  },
  savedActiveButton: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  shareText: {
    color: '#ffffff',
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
