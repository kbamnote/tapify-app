import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi } from '../config';
import { useNavigation } from '../context/NavigationContext';

export default function NotificationsScreen() {
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    try {
      const response = await fetchApi('/api/notifications/list.php', { method: 'GET' });
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.log('Error loading notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetchApi('/api/notifications/mark-read.php', { method: 'POST', body: JSON.stringify({}) });
      loadNotifications();
    } catch (e) {}
  };

  const handleNotificationTap = async (noti) => {
    // Mark specific as read
    if (noti.is_read == 0) {
      try {
        await fetchApi('/api/notifications/mark-read.php', { method: 'POST', body: JSON.stringify({ id: noti.id }) });
        const updated = notifications.map(n => n.id === noti.id ? { ...n, is_read: 1 } : n);
        setNotifications(updated);
      } catch (e) {}
    }

    if (noti.redirect_url) {
      if (noti.redirect_url.includes('appointment')) navigate('appointments');
      else if (noti.redirect_url.includes('lead')) navigate('inquiries');
      else if (noti.redirect_url.includes('review')) navigate('reviews-funnel');
      else if (noti.redirect_url.includes('dashboard')) navigate('dashboard');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  const getIconForType = (type) => {
    switch(type) {
      case 'appointment': return '📅';
      case 'lead': return '✉️';
      case 'review': return '⭐';
      case 'broadcast': return '📢';
      default: return '🔔';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Notification Center</Text>
        <TouchableOpacity onPress={markAsRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>You have no notifications right now.</Text>
          </View>
        ) : (
          notifications.map((noti) => (
            <TouchableOpacity key={noti.id} onPress={() => handleNotificationTap(noti)} activeOpacity={0.7}>
              <GlassCard style={[styles.notiCard, noti.is_read == 0 && styles.unreadCard]}>
                <Text style={styles.notiIcon}>{getIconForType(noti.type)}</Text>
                <View style={styles.notiContent}>
                  <Text style={styles.notiTitle}>{noti.title}</Text>
                  <Text style={styles.notiMessage}>{noti.message}</Text>
                  <Text style={styles.notiTime}>{new Date(noti.created_at).toLocaleString()}</Text>
                </View>
                {noti.is_read == 0 && <View style={styles.unreadDot} />}
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  markReadText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
    opacity: 0.5,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  notiCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    backgroundColor: 'rgba(131,56,236,0.05)',
    borderLeftColor: COLORS.primary,
  },
  notiIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  notiContent: {
    flex: 1,
  },
  notiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  notiMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
    lineHeight: 18,
  },
  notiTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  }
});
