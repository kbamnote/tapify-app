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
} from 'react-native';
import { fetchApi } from '../config';
import { COLORS } from '../theme/colors';

export default function ReviewsScreen() {
  const [loading, setLoading] = useState(true);
  const [googleUrl, setGoogleUrl] = useState('');
  const [funnelUrl, setFunnelUrl] = useState('');
  const [analytics, setAnalytics] = useState({ scans: 0, redirects: 0 });
  const [reviews, setReviews] = useState([]);
  const [saving, setSaving] = useState(false);

  // You will need to replace this with your actual React frontend URL deployed domain
  const REACT_APP_URL = 'https://review-google.vercel.app'; 

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const funnelRes = await fetchApi('/api/reviews/manage_funnel.php');
      if (funnelRes.data) {
        setGoogleUrl(funnelRes.data.google_review_url);
        setFunnelUrl(`${REACT_APP_URL}/${funnelRes.data.slug}`);
      }

      const analyticsRes = await fetchApi('/api/reviews/get_analytics.php');
      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }

      const reviewsRes = await fetchApi('/api/reviews/get_reviews.php');
      if (reviewsRes.data) {
        setReviews(reviewsRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!googleUrl) return alert('Please enter a Google Review Link');
    setSaving(true);
    try {
      const res = await fetchApi('/api/reviews/manage_funnel.php', {
        method: 'POST',
        body: JSON.stringify({ google_review_url: googleUrl }),
      });
      if (res.success) {
        alert('Funnel saved successfully!');
        setFunnelUrl(`${REACT_APP_URL}/${res.slug}`);
      }
    } catch (e) {
      alert('Failed to save funnel link');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
