import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';

const INITIAL_INQUIRIES = [
  { id: 1, name: 'David Miller', email: 'david@millerco.com', phone: '+91 98765 43210', message: 'Hello, I would like to order 50 premium custom wood NFC cards for my sales team. Can you send a catalog?', status: 'New' },
  { id: 2, name: 'Sarah Connor', email: 'sarah@resistance.org', phone: '+1 555 0199', message: 'Hi there, is it possible to integrate my custom CRM webhook with your digital card system?', status: 'Replied' },
];

export default function InquiriesScreen() {
  const [inquiries, setInquiries] = useState(INITIAL_INQUIRIES);

  const handleReply = (email) => {
    Linking.openURL(`mailto:${email}?subject=Regarding your Tapify Inquiry`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Inbox / Inquiries</Text>

      {inquiries.map((inq) => (
        <GlassCard key={inq.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.senderName}>{inq.name}</Text>
            <View style={[styles.badge, inq.status === 'New' ? styles.badgeNew : styles.badgeReplied]}>
              <Text style={[styles.badgeText, inq.status === 'New' ? styles.textNew : styles.textReplied]}>
                {inq.status}
              </Text>
            </View>
          </View>

          <Text style={styles.contactInfo}>📧 {inq.email}  |  📞 {inq.phone}</Text>
          
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>"{inq.message}"</Text>
          </View>

          <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(inq.email)}>
            <Text style={styles.replyBtnText}>Reply via Email</Text>
          </TouchableOpacity>
        </GlassCard>
      ))}
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
