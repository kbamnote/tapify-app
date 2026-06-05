import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Share, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';
import { fetchApi } from '../config';

const CustomQrIcon = () => (
  <View style={qrStyles.container}>
    {/* Top Left */}
    <View style={qrStyles.finder}>
      <View style={qrStyles.dot} />
    </View>
    {/* Top Right */}
    <View style={qrStyles.finder}>
      <View style={qrStyles.dot} />
    </View>
    {/* Bottom Left */}
    <View style={qrStyles.finder}>
      <View style={qrStyles.dot} />
    </View>
    {/* Bottom Right */}
    <View style={qrStyles.bottomRight}>
      <View style={qrStyles.miniDot} />
    </View>
  </View>
);

const qrStyles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  finder: {
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 2,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 0.2,
  },
  bottomRight: {
    width: 8,
    height: 8,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 1,
    paddingBottom: 1,
  },
  miniDot: {
    width: 3,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 0.5,
  },
});

const CustomBellIcon = () => (
  <View style={bellStyles.container}>
    {/* Bell Body/Dome */}
    <View style={bellStyles.dome} />
    {/* Base Flange/Line */}
    <View style={bellStyles.baseLine} />
    {/* Clapper/Ball */}
    <View style={bellStyles.clapper} />
  </View>
);

const bellStyles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dome: {
    width: 11,
    height: 10,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.8,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  baseLine: {
    width: 15,
    height: 1.8,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    marginTop: -0.8,
  },
  clapper: {
    width: 4,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 0.5,
  },
});

export default function Header({ title }) {
  const { user, sidebarOpen, setSidebarOpen, navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  // Top inset for status bar — at least 0 (handles notch, punch-hole, status bar on all devices)
  const topInset = insets.top;
  const [vcard, setVcard] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetchApi('/api/notifications/list.php');
        if (res.success && res.unread_count !== undefined) {
          setUnreadCount(parseInt(res.unread_count, 10));
        }
      } catch (e) {}
    };

    const fetchVcard = async () => {
      try {
        const response = await fetchApi('/api/me.php');
        if (response.success && response.data?.vcard) {
          setVcard(response.data.vcard);
        }
      } catch (e) {
        // Fail silently
      }
    };

    if (user) {
      fetchVcard();
      fetchUnread();
    }
  }, [user]);

  const liveUrl = vcard ? `https://app.tapify.co.in/${vcard.url_alias}` : '';
  const qrCodeUrl = liveUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(liveUrl)}` : '';

  const handleShare = async () => {
    if (!liveUrl) return;
    try {
      await Share.share({
        message: `My Tapify vCard: ${liveUrl}`,
        url: liveUrl,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={[styles.header, { height: 60 }]}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setSidebarOpen(!sidebarOpen)}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {/* Notification Bell Button (left of QR) */}
      <TouchableOpacity 
        style={styles.qrButton} 
        onPress={() => {
          navigate('notifications');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.qrIconContainer}>
          <CustomBellIcon />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* QR Button inside Header (only if vcard exists) */}
      {vcard && (
        <TouchableOpacity 
          style={styles.qrButton} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.qrIconContainer}>
            <CustomQrIcon />
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.profile} 
        onPress={() => navigate('profile')}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
      </TouchableOpacity>

      {/* QR Code Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan QR Code</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>Share your vCard with others instantly</Text>
              
              <View style={styles.qrContainer}>
                {qrCodeUrl ? (
                  <Image
                    source={{ uri: qrCodeUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.loadingText}>Generating QR...</Text>
                )}
              </View>

              <Text style={styles.linkText} numberOfLines={1}>{liveUrl}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                  <Text style={styles.shareBtnText}>🔗 Share Link</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareBtn, styles.closeBtn]} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                  <Text style={[styles.shareBtnText, styles.closeBtnText]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#153e3f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  menuButton: {
    paddingVertical: 8,
    paddingRight: 14,
  },
  menuIcon: {
    fontSize: 22,
    color: COLORS.primary,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  qrButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  qrIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(21, 62, 63, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    position: 'relative',
  },
  profile: {
    marginLeft: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 62, 63, 0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  modalBody: {
    alignItems: 'center',
    width: '100%',
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  loadingText: {
    width: 200,
    height: 200,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: COLORS.textMuted,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: 'rgba(21, 62, 63, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  shareBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    backgroundColor: '#f3f4f6',
    marginRight: 0,
    marginLeft: 8,
  },
  closeBtnText: {
    color: COLORS.text,
  },

  // Notification items
  notiScroll: {
    maxHeight: 280,
    width: '100%',
  },
  notiItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    width: '100%',
  },
  notiEmoji: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  notiTextContainer: {
    flex: 1,
  },
  notiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  notiDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 4,
  },
  notiTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  notiDivider: {
    height: 1,
    backgroundColor: 'rgba(21, 62, 63, 0.06)',
    marginVertical: 10,
  },
});
