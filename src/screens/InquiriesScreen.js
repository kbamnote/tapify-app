import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

export default function InquiriesScreen() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/inquiries/list.php');
      if (response.success && response.data?.inquiries) {
        setInquiries(response.data.inquiries);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetchApi('/api/inquiries/mark-read.php', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, is_read: true } : inq));
    } catch (error) {
      console.log('Failed to mark read', error);
    }
  };

  const handleReply = (id, email) => {
    markAsRead(id);
    Linking.openURL(`mailto:${email}?subject=Regarding your Tapify Inquiry`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Inbox / Inquiries</Text>

      {inquiries.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No inquiries found.</Text>
      ) : (
        inquiries.map((inq) => {
          const status = !inq.is_read ? 'New' : 'Read';
          return (
            <GlassCard key={inq.id} style={styles.card}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.senderName}>{inq.name}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{inq.time_ago}</Text>
                </View>
                <View style={[styles.badge, status === 'New' ? styles.badgeNew : styles.badgeReplied]}>
                  <Text style={[styles.badgeText, status === 'New' ? styles.textNew : styles.textReplied]}>
                    {status}
                  </Text>
                </View>
              </View>

              <Text style={styles.contactInfo}>📧 {inq.email}  |  📞 {inq.phone}</Text>
              
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>"{inq.message}"</Text>
              </View>

              <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(inq.id, inq.email)}>
                <Text style={styles.replyBtnText}>Reply via Email</Text>
              </TouchableOpacity>
            </GlassCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeNew: {
    backgroundColor: COLORS.accent + '20',
  },
  badgeReplied: {
    backgroundColor: COLORS.success + '20',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textNew: {
    color: COLORS.accent,
  },
  textReplied: {
    color: COLORS.success,
  },
  contactInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  messageBox: {
    backgroundColor: 'rgba(21, 62, 63, 0.04)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 14,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  replyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  replyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
