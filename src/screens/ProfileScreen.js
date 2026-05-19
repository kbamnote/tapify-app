import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '../context/NavigationContext';

export default function ProfileScreen() {
  const { user } = useNavigation();
  const [name, setName] = useState(user?.name || 'Tapify World');
  const [email, setEmail] = useState(user?.email || 'admin@tapify.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [company, setCompany] = useState('Tapify World Inc.');

  const handleSave = () => {
    alert('Profile settings saved successfully (Mock)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassCard style={styles.card}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }} 
            style={styles.avatar} 
          />
          <TouchableOpacity style={styles.changePicBtn}>
            <Text style={styles.changePicText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput 
              style={styles.input} 
              value={email} 
              onChangeText={setEmail}
              keyboardType="email-address" 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput 
              style={styles.input} 
              value={phone} 
              onChangeText={setPhone} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company / Store Title</Text>
            <TextInput 
              style={styles.input} 
              value={company} 
              onChangeText={setCompany} 
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
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
  card: {
    padding: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  changePicBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '10',
  },
  changePicText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
  },
  saveBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
