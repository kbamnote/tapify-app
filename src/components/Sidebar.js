import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';

const NAV_ITEMS = [
  { id: 'inquiries',        label: 'Inquiries',        icon: '💬' },
  { id: 'businesses',       label: 'Businesses',       icon: '🏢' },
  { id: 'whatsapp-stores',  label: 'Web Store',        icon: '🏪' },
  { id: 'whatsapp-orders',  label: 'Web Orders',       icon: '🛍️' },
  { id: 'reviews-funnel',   label: 'Reviews Funnel',   icon: '⭐' },
  { id: 'settings',         label: 'Settings',         icon: '⚙️' },
];

export default function Sidebar() {
  const { currentScreen, navigate, sidebarOpen, setSidebarOpen, logout, user } = useNavigation();
  const isTitanium = user?.titanium?.is_active == 1 || user?.titanium?.is_active === true;
  const isAdmin    = user?.role === 'admin';

  if (!sidebarOpen) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => setSidebarOpen(false)}
      />
      <View style={styles.sidebar}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Tapify</Text>
          <TouchableOpacity onPress={() => setSidebarOpen(false)}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Nav Links */}
        <ScrollView style={styles.navArea} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => navigate(item.id)}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Titanium Member — only shown if admin granted access */}
          {isTitanium && (
            <TouchableOpacity
              style={[styles.titaniumItem, currentScreen === 'titanium' && styles.titaniumItemActive]}
              onPress={() => navigate('titanium')}
            >
              <View style={styles.titaniumLeft}>
                <Text style={styles.navIcon}>♛</Text>
                <Text style={styles.titaniumLabel}>Titanium Member</Text>
              </View>
              <View style={styles.titaniumBadge}>
                <Text style={styles.titaniumBadgeText}>ELITE</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Admin: Manage Titanium — only for admin role */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.navItem, styles.adminItem, currentScreen === 'admin-titanium' && styles.navItemActive]}
              onPress={() => navigate('admin-titanium')}
            >
              <Text style={styles.navIcon}>🛡️</Text>
              <Text style={[styles.navLabel, { color: '#c1a046' }]}>Manage Titanium</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Footer / Logout */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>🚪  Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 200,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  closeBtn: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 8,
  },
  navArea: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: 'rgba(21, 62, 63, 0.08)',
  },
  navIcon: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  titaniumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    marginTop: 4,
    backgroundColor: 'rgba(193,160,70,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(193,160,70,0.25)',
  },
  titaniumItemActive: {
    backgroundColor: 'rgba(193,160,70,0.18)',
    borderColor: 'rgba(193,160,70,0.5)',
  },
  titaniumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titaniumLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#c1a046',
  },
  titaniumBadge: {
    backgroundColor: '#c1a046',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  titaniumBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  adminItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(193,160,70,0.15)',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logoutBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 10,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: 15,
  },
});
