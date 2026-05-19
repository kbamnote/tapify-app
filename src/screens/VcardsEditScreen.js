import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';

const SWATCH_COLORS = ['#153e3f', '#25D366', '#d19a66', '#000000', '#3b5998', '#ef4444'];

export default function VcardsEditScreen() {
  const [selectedColor, setSelectedColor] = useState(SWATCH_COLORS[0]);
  const [alias, setAlias] = useState('kunal-tapify');
  const [displayName, setDisplayName] = useState('Kunal Bamnote');
  const [jobTitle, setJobTitle] = useState('Lead Designer');
  const [instagram, setInstagram] = useState('@kunal_tapify');
  const [linkedin, setLinkedin] = useState('linkedin.com/in/kunal');

  const handleSave = () => {
    alert('vCard details updated (Mock)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>vCard Builder</Text>

      <GlassCard style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Link Alias</Text>
          <View style={styles.aliasRow}>
            <Text style={styles.aliasPrefix}>tapify.me/</Text>
            <TextInput 
              style={[styles.input, styles.aliasInput]} 
              value={alias} 
              onChangeText={setAlias} 
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput 
            style={styles.input} 
            value={displayName} 
            onChangeText={setDisplayName} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Job Title / Designation</Text>
          <TextInput 
            style={styles.input} 
            value={jobTitle} 
            onChangeText={setJobTitle} 
          />
        </View>

        <Text style={styles.label}>Select Card Palette</Text>
        <View style={styles.paletteRow}>
          {SWATCH_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatch,
                { backgroundColor: color },
                selectedColor === color && styles.selectedSwatch
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        <View style={styles.divider} />
        
        <Text style={styles.subHeader}>Social Links</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instagram Username</Text>
          <TextInput 
            style={styles.input} 
            value={instagram} 
            onChangeText={setInstagram} 
            placeholder="@username"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>LinkedIn Link</Text>
          <TextInput 
            style={styles.input} 
            value={linkedin} 
            onChangeText={setLinkedin} 
            placeholder="profile url"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save vCard Design</Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  card: {
    padding: 20,
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
  aliasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  aliasPrefix: {
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: 'rgba(21, 62, 63, 0.05)',
    height: '100%',
    textAlignVertical: 'center',
    lineHeight: 46,
  },
  aliasInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  paletteRow: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 4,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSwatch: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(21, 62, 63, 0.08)',
    marginVertical: 18,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 14,
  },
  saveBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
