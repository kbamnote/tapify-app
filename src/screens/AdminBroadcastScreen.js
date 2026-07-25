import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';

/**
 * Admin → Send Notification
 * Broadcasts a push + in-app notification to ALL users, or to one specific user.
 * POST /api/admin/notifications-send.php  { title, message, target_user, redirect_url, image_url }
 */
export default function AdminBroadcastScreen() {
  const [target,      setTarget]      = useState('all'); // 'all' | 'user'
  const [title,       setTitle]       = useState('');
  const [message,     setMessage]     = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageUrl,    setImageUrl]    = useState('');
  const [sending,     setSending]     = useState(false);

  // Specific-user picker
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [users,       setUsers]       = useState([]);
  const [loadingUsers,setLoadingUsers]= useState(false);
  const [userSearch,  setUserSearch]  = useState('');
  const [selectedUser,setSelectedUser]= useState(null);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetchApi('/api/admin/users/list.php');
      setUsers(res.data?.users || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openPicker = () => {
    setPickerOpen(true);
    if (users.length === 0) loadUsers();
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const doSend = async () => {
    try {
      setSending(true);
      const body = {
        title: title.trim(),
        message: message.trim(),
        target_user: target === 'user' && selectedUser ? selectedUser.id : 'all',
        redirect_url: redirectUrl.trim() || null,
        image_url: imageUrl.trim() || null,
      };
      const res = await fetchApi('/api/admin/notifications-send.php', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      Alert.alert('Notification Sent', res.message || 'Delivered.');
      // Reset the composed message (keep target choice)
      setTitle('');
      setMessage('');
      setRedirectUrl('');
      setImageUrl('');
    } catch (e) {
      Alert.alert('Send failed', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Title and message are required.');
      return;
    }
    if (target === 'user' && !selectedUser) {
      Alert.alert('No recipient', 'Pick a user to send to, or switch to All Users.');
      return;
    }
    if (target === 'all') {
      Alert.alert(
        'Broadcast to everyone?',
        'This sends a push notification to ALL users with the app installed. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send to All', style: 'destructive', onPress: doSend },
        ],
      );
    } else {
      doSend();
    }
  };

  // ---- Specific-user picker view ----
  if (pickerOpen) {
    return (
      <View style={styles.container}>
        <View style={styles.searchWrap}>
          <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.pickerBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={COLORS.textMuted}
              value={userSearch}
              onChangeText={setUserSearch}
            />
          </View>
        </View>

        {loadingUsers ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={u => String(u.id)}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setSelectedUser(item); setPickerOpen(false); }}
              >
                <GlassCard style={styles.userCard}>
                  <View style={styles.userRow}>
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {(item.name || item.email || '?').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName2}>{item.name || 'Unnamed'}</Text>
                      <Text style={styles.userEmail2}>{item.email}</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No users found</Text></View>}
          />
        )}
      </View>
    );
  }

  // ---- Compose view ----
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GlassCard style={styles.card}>
          <Text style={styles.heading}>📣 Send Notification</Text>
          <Text style={styles.sub}>Push + in-app alert delivered to your users.</Text>

          {/* Target selector */}
          <Text style={styles.label}>Send to</Text>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segBtn, target === 'all' && styles.segBtnActive]}
              onPress={() => setTarget('all')}
            >
              <Text style={[styles.segText, target === 'all' && styles.segTextActive]}>All Users</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, target === 'user' && styles.segBtnActive]}
              onPress={() => setTarget('user')}
            >
              <Text style={[styles.segText, target === 'user' && styles.segTextActive]}>Specific User</Text>
            </TouchableOpacity>
          </View>

          {target === 'user' && (
            <TouchableOpacity style={styles.pickerBtn} onPress={openPicker}>
              <Text style={styles.pickerBtnText}>
                {selectedUser
                  ? `👤 ${selectedUser.name || selectedUser.email}`
                  : 'Tap to choose a user'}
              </Text>
              <Text style={styles.pickerChevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. New feature available!"
              placeholderTextColor={COLORS.textMuted}
              maxLength={120}
            />
          </View>

          {/* Message */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your notification message..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Redirect URL (optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Redirect link <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={redirectUrl}
              onChangeText={setRedirectUrl}
              placeholder="https://tapify.co.in/... or a screen"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </View>

          {/* Image URL (optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Image URL <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://.../banner.jpg"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </View>

          {imageUrl.trim() ? (
            <Image source={{ uri: imageUrl.trim() }} style={styles.preview} resizeMode="cover" />
          ) : null}

          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
            {sending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sendBtnText}>
                  {target === 'all' ? '📢 Broadcast to All' : '📨 Send Notification'}
                </Text>}
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 16, paddingBottom: 48 },
  card:      { padding: 20 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  listContent: { padding: 16, paddingBottom: 40 },

  heading: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub:     { fontSize: 13, color: COLORS.textMuted, marginTop: 4, marginBottom: 18 },

  label:    { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  optional: { color: COLORS.textMuted, fontWeight: '400' },

  segment: {
    flexDirection: 'row', backgroundColor: 'rgba(21,62,63,0.06)',
    borderRadius: 10, padding: 4, marginBottom: 16,
  },
  segBtn:       { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  segBtnActive: { backgroundColor: COLORS.primary },
  segText:      { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  segTextActive:{ color: '#fff' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, height: 48, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  pickerBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  pickerChevron: { fontSize: 22, color: COLORS.textMuted },
  pickerBack:    { marginBottom: 10 },

  inputGroup: { marginBottom: 16 },
  input: {
    minHeight: 48, backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(21,62,63,0.15)',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    color: COLORS.text, fontSize: 15,
  },
  textarea: { minHeight: 110 },

  preview: { width: '100%', height: 150, borderRadius: 10, marginBottom: 16, backgroundColor: COLORS.glassDark },

  sendBtn: {
    height: 52, backgroundColor: COLORS.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // Search + user rows (picker)
  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },

  userCard: { padding: 14, marginBottom: 10 },
  userRow:  { flexDirection: 'row', alignItems: 'center' },
  avatarFallback: {
    width: 46, height: 46, borderRadius: 23, marginRight: 12,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontWeight: '700', color: COLORS.primary, fontSize: 15 },
  userInfo:   { flex: 1 },
  userName2:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  userEmail2: { fontSize: 12, color: COLORS.textMuted },
  emptyText:  { color: COLORS.textMuted, fontSize: 14 },
});
