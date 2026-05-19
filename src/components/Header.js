import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';

export default function Header({ title }) {
  const { user, sidebarOpen, setSidebarOpen } = useNavigation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setSidebarOpen(!sidebarOpen)}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.profile}>
        <Image
          source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
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
  profile: {
    marginLeft: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
});
