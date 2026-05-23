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

  const handleCall = (id, phone) => {
    if (!phone) return Alert.alert('No phone', 'This inquiry has no phone number.');
    markAsRead(id);
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (id, phone) => {
    if (!phone) return Alert.alert('No phone', 'This inquiry has no phone number.');
    markAsRead(id);
    // Strip non-numeric characters for WhatsApp URL
    const cleaned = phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleaned}&text=Hi%2C%20regarding%20your%20Tapify%20inquiry`);
  };

  const formatTime = (dateString, timeAgoString) => {
    if (!dateString) return timeAgoString || 'Unknown time';
    // Ensure we treat the MySQL timestamp as UTC to convert correctly to local device time
    const isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const date = new Date(isoString);
    if (isNaN(date)) return timeAgoString || 'Unknown time';
    
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit'
    });
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
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{formatTime(inq.created_at, inq.time_ago)}</Text>
                </View>
                <View style={[styles.badge, status === 'New' ? styles.badgeNew : styles.badgeReplied]}>
                  <Text style={[styles.badgeText, status === 'New' ? styles.textNew : styles.textReplied]}>
                    {status}
                  </Text>
                </View>
              </View>

              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactChip}
                  onPress={() => Linking.openURL(`mailto:${inq.email}`)}
                >
                  <Text style={styles.contactChipText}>📧 {inq.email}</Text>
                </TouchableOpacity>
                {inq.phone ? (
                  <TouchableOpacity
                    style={styles.contactChip}
                    onPress={() => handleCall(inq.id, inq.phone)}
                  >
                    <Text style={styles.contactChipText}>📞 {inq.phone}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>"{inq.message}"</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(inq.id, inq.phone)}
                >
                  <Text style={styles.actionBtnText}>📞 Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => handleWhatsApp(inq.id, inq.phone)}
                >
                  <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emailBtn}
                  onPress={() => handleReply(inq.id, inq.email)}
                >
                  <Text style={styles.emailBtnText}>✉️ Email</Text>
                </TouchableOpacity>
              </View>
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
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  contactChip: {
    backgroundColor: 'rgba(21, 62, 63, 0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  contactChipText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emailBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
