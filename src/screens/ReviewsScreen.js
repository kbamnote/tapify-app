import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { fetchApi } from '../config';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';

export default function ReviewsScreen() {
  const { user } = useNavigation();
  const [loading, setLoading] = useState(true);

  // Staff/Admin state
  const [isElevated, setIsElevated] = useState(false);
  const [allFunnels, setAllFunnels] = useState([]);
  const [selectedFunnel, setSelectedFunnel] = useState(null);

  // Single-funnel state (regular users OR when a staff user selects a funnel)
  const [googleUrl, setGoogleUrl] = useState('');
  const [funnelUrl, setFunnelUrl] = useState('');
  const [analytics, setAnalytics] = useState({ scans: 0, redirects: 0 });
  const [reviews, setReviews] = useState([]);
  const [saving, setSaving] = useState(false);

  const REACT_APP_URL = 'https://review-google.vercel.app';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const funnelRes = await fetchApi('/api/reviews/manage_funnel.php');

      // Staff/Admin get { is_admin: true, funnels: [...] }
      if (funnelRes.is_admin && funnelRes.funnels) {
        setIsElevated(true);
        setAllFunnels(funnelRes.funnels || []);
      } else {
        // Regular user gets { data: { slug, google_review_url } }
        setIsElevated(false);
        if (funnelRes.data) {
          setGoogleUrl(funnelRes.data.google_review_url || '');
          setFunnelUrl(funnelRes.data.slug ? `${REACT_APP_URL}/${funnelRes.data.slug}` : '');
        }
        // Load own analytics & reviews
        await loadOwnAnalyticsAndReviews();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadOwnAnalyticsAndReviews = async () => {
    try {
      const analyticsRes = await fetchApi('/api/reviews/get_analytics.php');
      if (analyticsRes.data) setAnalytics(analyticsRes.data);

      const reviewsRes = await fetchApi('/api/reviews/get_reviews.php');
      if (reviewsRes.data) setReviews(reviewsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Staff/Admin: select a funnel to view details ──
  const selectFunnel = async (funnel) => {
    setSelectedFunnel(funnel);
    setGoogleUrl(funnel.google_review_url || '');
    setFunnelUrl(funnel.slug ? `${REACT_APP_URL}/${funnel.slug}` : '');

    try {
      const analyticsRes = await fetchApi(`/api/reviews/get_analytics.php?user_id=${funnel.user_id}`);
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
      else setAnalytics({ scans: 0, redirects: 0 });

      const reviewsRes = await fetchApi(`/api/reviews/get_reviews.php?funnel_id=${funnel.id}`);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      else setReviews([]);
    } catch (e) {
      console.error(e);
      setAnalytics({ scans: 0, redirects: 0 });
      setReviews([]);
    }
  };

  const handleBack = () => {
    setSelectedFunnel(null);
    setGoogleUrl('');
    setFunnelUrl('');
    setAnalytics({ scans: 0, redirects: 0 });
    setReviews([]);
  };

  // ── Save funnel (works for both regular user & staff editing a selected user) ──
  const handleSave = async () => {
    if (!googleUrl) return Alert.alert('Error', 'Please enter a Google Review Link');
    setSaving(true);
    try {
      const body = { google_review_url: googleUrl };
      if (isElevated && selectedFunnel) {
        body.user_id = selectedFunnel.user_id;
      }
      const res = await fetchApi('/api/reviews/manage_funnel.php', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.success) {
        Alert.alert('Success', 'Funnel saved successfully!');
        setFunnelUrl(`${REACT_APP_URL}/${res.slug}`);
        // Refresh the all-funnels list if staff/admin
        if (isElevated) {
          const refreshRes = await fetchApi('/api/reviews/manage_funnel.php');
          if (refreshRes.funnels) setAllFunnels(refreshRes.funnels);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save funnel link');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Staff/Admin: All Funnels List View ──
  if (isElevated && !selectedFunnel) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.elevatedHeader}>
            <Text style={styles.cardTitle}>All Review Funnels</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{allFunnels.length}</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            Manage review funnels for all users. Tap on any funnel to view details, analytics, and private reviews.
          </Text>
        </View>

        {allFunnels.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.noReviews}>No review funnels created yet.</Text>
          </View>
        ) : (
          allFunnels.map((funnel, i) => (
            <TouchableOpacity
              key={funnel.id || i}
              style={styles.funnelCard}
              onPress={() => selectFunnel(funnel)}
              activeOpacity={0.7}
            >
              <View style={styles.funnelCardHeader}>
                <View style={styles.funnelOwnerInfo}>
                  <View style={styles.funnelAvatar}>
                    <Text style={styles.funnelAvatarText}>
                      {(funnel.owner_name || funnel.owner_email || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.funnelOwnerName} numberOfLines={1}>
                      {funnel.owner_name || 'Unknown User'}
                    </Text>
                    <Text style={styles.funnelOwnerEmail} numberOfLines={1}>
                      {funnel.owner_email || '—'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.funnelArrow}>›</Text>
              </View>

              <View style={styles.funnelStatsRow}>
                <View style={styles.funnelStat}>
                  <Text style={styles.funnelStatValue}>{funnel.scans || 0}</Text>
                  <Text style={styles.funnelStatLabel}>Scans</Text>
                </View>
                <View style={styles.funnelStatDivider} />
                <View style={styles.funnelStat}>
                  <Text style={styles.funnelStatValue}>{funnel.redirects || 0}</Text>
                  <Text style={styles.funnelStatLabel}>Redirects</Text>
                </View>
                <View style={styles.funnelStatDivider} />
                <View style={styles.funnelStat}>
                  <Text style={styles.funnelStatValue}>{funnel.private_reviews || 0}</Text>
                  <Text style={styles.funnelStatLabel}>Private</Text>
                </View>
              </View>

              <View style={styles.funnelSlugRow}>
                <Text style={styles.funnelSlugLabel}>Slug:</Text>
                <Text style={styles.funnelSlugValue} numberOfLines={1}>{funnel.slug}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  // ── Detail View (regular user OR staff viewing a selected funnel) ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button for staff/admin */}
      {isElevated && selectedFunnel && (
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>← Back to All Funnels</Text>
        </TouchableOpacity>
      )}

      {/* Owner info banner for staff/admin */}
      {isElevated && selectedFunnel && (
        <View style={styles.ownerBanner}>
          <View style={styles.ownerBannerAvatar}>
            <Text style={styles.ownerBannerAvatarText}>
              {(selectedFunnel.owner_name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.ownerBannerName}>{selectedFunnel.owner_name || 'Unknown'}</Text>
            <Text style={styles.ownerBannerEmail}>{selectedFunnel.owner_email || '—'}</Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Setup Google Review Link</Text>
        <Text style={styles.cardDesc}>
          Paste your real Google review link below. We will generate a smart funnel link and QR code. 
          4-5 star reviews will redirect to Google, 1-3 star reviews will be saved privately here.
        </Text>
        
        <Text style={styles.label}>Google Review Link</Text>
        <TextInput
          style={styles.input}
          placeholder="https://g.page/r/..."
          value={googleUrl}
          onChangeText={setGoogleUrl}
          autoCapitalize="none"
        />
        
        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save & Generate Funnel'}</Text>
        </TouchableOpacity>

        {!!funnelUrl && (
          <View style={styles.qrSection}>
            <Image 
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(funnelUrl)}` }} 
              style={styles.qrImage} 
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.qrTitle}>Your Smart Funnel Link</Text>
              <Text style={styles.qrDesc}>Share this link or QR code with your customers:</Text>
              <Text style={styles.linkText} selectable>{funnelUrl}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Analytics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.scans}</Text>
            <Text style={styles.statLabel}>Total Link Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.redirects}</Text>
            <Text style={styles.statLabel}>4-5 Star Redirects</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{reviews.length}</Text>
            <Text style={styles.statLabel}>1-3 Star Private</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Private Reviews (1-3 Stars)</Text>
        {reviews.length === 0 ? (
          <Text style={styles.noReviews}>No private reviews yet.</Text>
        ) : (
          reviews.map((r, i) => (
            <View key={i} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
                <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
              </View>

              <View style={styles.reviewInfoRow}>
                <View style={styles.reviewInfoItem}>
                  <Text style={styles.reviewInfoLabel}>👤 Name</Text>
                  <Text style={styles.reviewInfoValue}>{r.customer_name || '—'}</Text>
                </View>
                <View style={styles.reviewInfoItem}>
                  <Text style={styles.reviewInfoLabel}>📞 Phone</Text>
                  {r.customer_phone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${r.customer_phone}`)}>
                      <Text style={styles.phoneLink}>{r.customer_phone}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.reviewInfoValue}>—</Text>
                  )}
                </View>
              </View>

              <Text style={styles.reviewText}>{r.feedback_text || 'No text provided'}</Text>
              {r.media_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(r.media_url)}>
                  <Text style={styles.mediaLink}>View Attached Media</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Staff/Admin list view ──
  elevatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  funnelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  funnelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  funnelOwnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  funnelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funnelAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  funnelOwnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  funnelOwnerEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  funnelArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: '300',
    paddingLeft: 8,
  },
  funnelStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  funnelStat: {
    flex: 1,
    alignItems: 'center',
  },
  funnelStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  funnelStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  funnelStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
    fontWeight: '600',
  },
  funnelSlugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  funnelSlugLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  funnelSlugValue: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },

  // ── Back button & owner banner (staff detail view) ──
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ownerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 62, 63, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.12)',
  },
  ownerBannerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBannerAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  ownerBannerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ownerBannerEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ── Shared styles (single-funnel view) ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    marginBottom: 16,
    color: COLORS.text,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qrImage: {
    width: 100,
    height: 100,
    marginRight: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  qrDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
  noReviews: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  reviewStars: {
    fontSize: 14,
    color: '#f59e0b',
  },
  reviewText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  mediaLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  reviewInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  reviewInfoItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reviewInfoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 3,
  },
  reviewInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  phoneLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
