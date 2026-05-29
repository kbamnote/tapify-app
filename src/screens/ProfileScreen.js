import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Modal, FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { fetchApi, API_BASE } from '../config';

const BUSINESS_CATEGORIES = [
  'Retail & Shopping',
  'Food & Restaurant',
  'IT & Software',
  'Healthcare & Medical',
  'Education & Training',
  'Finance & Accounting',
  'Beauty & Wellness',
  'Construction & Real Estate',
  'Manufacturing',
  'Other',
];

export default function ProfileScreen() {
  const { user, logout, setUser } = useNavigation();

  // ── Personal info ──────────────────────────────────────────────────────────
  const [name,          setName]          = useState(user?.name  || '');
  const [email,         setEmail]         = useState(user?.email || '');
  const [phone,         setPhone]         = useState(user?.phone || '');
  const [avatar,        setAvatar]        = useState(user?.avatar || 'https://via.placeholder.com/100');
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [uploadingPhoto,setUploadingPhoto]= useState(false);

  // ── Business info ──────────────────────────────────────────────────────────
  const [businessName,   setBusinessName]   = useState('');
  const [gstin,          setGstin]          = useState('');
  const [category,       setCategory]       = useState('');
  const [description,    setDescription]    = useState('');
  const [city,           setCity]           = useState('');
  const [website,        setWebsite]        = useState('');
  const [bizPhone,       setBizPhone]       = useState('');
  const [listed,         setListed]         = useState(true);
  const [bizLogo,        setBizLogo]        = useState(null);
  const [panNo,          setPanNo]          = useState('');
  const [address,        setAddress]        = useState('');
  const [ownerDob,       setOwnerDob]       = useState('');
  const [dateOfIncorp,   setDateOfIncorp]   = useState('');
  const [showOwnerDobPicker,   setShowOwnerDobPicker]   = useState(false);
  const [showIncorpPicker,     setShowIncorpPicker]     = useState(false);
  const [loadingBusiness,setLoadingBusiness]= useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [uploadingLogo,  setUploadingLogo]  = useState(false);
  const [showCatModal,   setShowCatModal]   = useState(false);

  // ── Refs for keyboard "next" navigation ───────────────────────────────────
  const emailRef    = useRef(null);
  const phoneRef    = useRef(null);
  const gstinRef    = useRef(null);
  const panRef      = useRef(null);
  const addressRef  = useRef(null);
  const cityRef     = useRef(null);
  const websiteRef  = useRef(null);
  const bizPhoneRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadBusiness();
  }, []);

  // ── Load personal profile ──────────────────────────────────────────────────
  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/me.php');
      if (response.success && response.data?.user) {
        const u = response.data.user;
        setName(u.name   || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setAvatar(u.avatar || 'https://via.placeholder.com/100');
      }
    } catch (error) {
      console.log('Failed to load profile', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Load business profile ──────────────────────────────────────────────────
  const loadBusiness = async () => {
    try {
      setLoadingBusiness(true);
      const response = await fetchApi('/api/business/get.php');
      if (response.success && response.data?.business) {
        const b = response.data.business;
        setBusinessName(b.business_name   || '');
        setGstin(b.gstin                 || '');
        setCategory(b.category           || '');
        setDescription(b.description     || '');
        setCity(b.city                   || '');
        setWebsite(b.website             || '');
        setBizPhone(b.phone              || '');
        setPanNo(b.pan_no                || '');
        setAddress(b.address             || '');
        setOwnerDob(b.owner_dob          || '');
        setDateOfIncorp(b.date_of_incorp || '');
        setListed(b.listed !== false);
        setBizLogo(b.logo_url            || null);
      }
    } catch (error) {
      console.log('Failed to load business', error);
    } finally {
      setLoadingBusiness(false);
    }
  };

  // ── Save personal info ─────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetchApi('/api/profile/update.php', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone }),
      });
      if (response.success) {
        if (setUser) setUser(prev => ({ ...prev, name, email, phone }));
        Alert.alert('Success', 'Personal info saved successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Save business profile ──────────────────────────────────────────────────
  const handleSaveBusiness = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter your Business Name to save the business profile.');
      return;
    }
    try {
      setSavingBusiness(true);
      const response = await fetchApi('/api/business/save.php', {
        method: 'POST',
        body: JSON.stringify({
          business_name:  businessName,
          gstin,
          category,
          description,
          city,
          website,
          phone:          bizPhone,
          pan_no:         panNo,
          address,
          owner_dob:      ownerDob    || null,
          date_of_incorp: dateOfIncorp || null,
          listed,
        }),
      });
      if (response.success) {
        Alert.alert(
          'Business Saved! 🎉',
          listed
            ? 'Your business is now listed in the Businesses directory.'
            : 'Business saved. Toggle "List in Directory" to make it visible to others.',
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save business profile');
    } finally {
      setSavingBusiness(false);
    }
  };

  // ── Upload profile photo ───────────────────────────────────────────────────
  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const { uri, mimeType } = result.assets[0];
    const formData = new FormData();
    formData.append('file', { uri, name: uri.split('/').pop(), type: mimeType || 'image/jpeg' });

    try {
      setUploadingPhoto(true);
      const res  = await fetch(`${API_BASE}/api/profile/upload-avatar.php`, {
        method: 'POST', body: formData, credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.data?.avatar_url) {
        setAvatar(data.data.avatar_url);
        if (setUser) setUser(prev => ({ ...prev, avatar: data.data.avatar_url }));
        Alert.alert('Success', 'Profile photo updated!');
      } else {
        Alert.alert('Error', data.message || 'Failed to upload photo.');
      }
    } catch {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Upload business logo ───────────────────────────────────────────────────
  const handleUploadLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const { uri, mimeType } = result.assets[0];
    const formData = new FormData();
    formData.append('file', { uri, name: uri.split('/').pop(), type: mimeType || 'image/jpeg' });

    try {
      setUploadingLogo(true);
      const res  = await fetch(`${API_BASE}/api/business/upload-logo.php`, {
        method: 'POST', body: formData, credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.data?.logo_url) {
        setBizLogo(data.data.logo_url);
        Alert.alert('Success', 'Business logo uploaded!');
      } else {
        Alert.alert('Error', data.message || 'Failed to upload logo.');
      }
    } catch {
      Alert.alert('Error', 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Personal Info Card ──────────────────────────────────────────── */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <TouchableOpacity
              style={styles.changePicBtn}
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.changePicText}>Change Photo</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                ref={phoneRef}
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={styles.saveBtnText}>Save Personal Info</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Business Profile Card ────────────────────────────────────────── */}
        <GlassCard style={[styles.card, styles.bizCard]}>
          <Text style={styles.sectionTitle}>Business Profile</Text>
          <Text style={styles.sectionSubtitle}>
            List your business in the Tapify directory so other users can discover and contact you.
          </Text>

          {/* Logo row */}
          <View style={styles.logoRow}>
            {bizLogo ? (
              <Image source={{ uri: bizLogo }} style={styles.bizLogo} />
            ) : (
              <View style={styles.bizLogoPlaceholder}>
                <Text style={styles.bizLogoPlaceholderText}>
                  {businessName ? businessName.substring(0, 2).toUpperCase() : '🏢'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.changePicBtn, { marginTop: 0, marginLeft: 16 }]}
              onPress={handleUploadLogo}
              disabled={uploadingLogo}
            >
              {uploadingLogo
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.changePicText}>Upload Logo</Text>
              }
            </TouchableOpacity>
          </View>

          {/* List in Directory toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setListed(v => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.label}>List in Directory</Text>
              <Text style={styles.toggleHint}>Show your business to other Tapify users</Text>
            </View>
            <View style={[styles.track, listed && styles.trackOn]}>
              <View style={[styles.thumb, listed && styles.thumbOn]} />
            </View>
          </TouchableOpacity>

          {loadingBusiness ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Business Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Sharma Electronics"
                  placeholderTextColor={COLORS.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => gstinRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  GSTIN <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  ref={gstinRef}
                  style={styles.input}
                  value={gstin}
                  onChangeText={t => setGstin(t.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  maxLength={15}
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <Text style={styles.hint}>15-character GST Identification Number</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={[styles.input, styles.pickerRow]}
                  onPress={() => setShowCatModal(true)}
                >
                  <Text style={category ? styles.pickerValue : styles.pickerPlaceholder}>
                    {category || 'Select a category'}
                  </Text>
                  <Text style={styles.pickerArrow}>▾</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Description <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell others what your business does..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                  textAlignVertical="top"
                />
                <Text style={styles.hint}>{description.length} / 300</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  ref={cityRef}
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Mumbai"
                  placeholderTextColor={COLORS.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => websiteRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Website <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  ref={websiteRef}
                  style={styles.input}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="url"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => bizPhoneRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Business Phone <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  ref={bizPhoneRef}
                  style={styles.input}
                  value={bizPhone}
                  onChangeText={setBizPhone}
                  placeholder="WhatsApp or contact number"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => panRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  PAN No <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  ref={panRef}
                  style={styles.input}
                  value={panNo}
                  onChangeText={t => setPanNo(t.toUpperCase())}
                  placeholder="ABCDE1234F"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  maxLength={10}
                  returnKeyType="next"
                  onSubmitEditing={() => addressRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <Text style={styles.hint}>10-character Permanent Account Number</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Address <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  ref={addressRef}
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Full business address..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="done"
                />
              </View>

              {/* Date of Birth (Owner) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Date of Birth (Owner) <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.input, styles.pickerRow]}
                  onPress={() => setShowOwnerDobPicker(true)}
                >
                  <Text style={ownerDob ? styles.pickerValue : styles.pickerPlaceholder}>
                    📅  {ownerDob
                      ? new Date(ownerDob).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                      : 'Tap to select date'}
                  </Text>
                  <Text style={styles.pickerArrow}>▾</Text>
                </TouchableOpacity>
                {showOwnerDobPicker && (
                  Platform.OS === 'ios' ? (
                    <Modal transparent animationType="slide" visible={showOwnerDobPicker}>
                      <View style={styles.dobModalOverlay}>
                        <View style={styles.dobModalContent}>
                          <View style={styles.dobModalHeader}>
                            <Text style={styles.dobModalTitle}>Date of Birth (Owner)</Text>
                            <TouchableOpacity onPress={() => setShowOwnerDobPicker(false)}>
                              <Text style={styles.dobModalDone}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={ownerDob ? new Date(ownerDob) : new Date()}
                            mode="date"
                            display="spinner"
                            maximumDate={new Date()}
                            onChange={(e, d) => {
                              if (d) {
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth()+1).padStart(2,'0');
                                const dd = String(d.getDate()).padStart(2,'0');
                                setOwnerDob(`${yyyy}-${mm}-${dd}`);
                              }
                              setShowOwnerDobPicker(false);
                            }}
                            style={{ width: '100%' }}
                          />
                        </View>
                      </View>
                    </Modal>
                  ) : (
                    <DateTimePicker
                      value={ownerDob ? new Date(ownerDob) : new Date()}
                      mode="date"
                      display="calendar"
                      maximumDate={new Date()}
                      onChange={(e, d) => {
                        setShowOwnerDobPicker(false);
                        if (e.type === 'dismissed' || !d) return;
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth()+1).padStart(2,'0');
                        const dd = String(d.getDate()).padStart(2,'0');
                        setOwnerDob(`${yyyy}-${mm}-${dd}`);
                      }}
                    />
                  )
                )}
              </View>

              {/* Date of Incorporation */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Date of Incorporation <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.input, styles.pickerRow]}
                  onPress={() => setShowIncorpPicker(true)}
                >
                  <Text style={dateOfIncorp ? styles.pickerValue : styles.pickerPlaceholder}>
                    🏢  {dateOfIncorp
                      ? new Date(dateOfIncorp).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                      : 'Tap to select date'}
                  </Text>
                  <Text style={styles.pickerArrow}>▾</Text>
                </TouchableOpacity>
                {showIncorpPicker && (
                  Platform.OS === 'ios' ? (
                    <Modal transparent animationType="slide" visible={showIncorpPicker}>
                      <View style={styles.dobModalOverlay}>
                        <View style={styles.dobModalContent}>
                          <View style={styles.dobModalHeader}>
                            <Text style={styles.dobModalTitle}>Date of Incorporation</Text>
                            <TouchableOpacity onPress={() => setShowIncorpPicker(false)}>
                              <Text style={styles.dobModalDone}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={dateOfIncorp ? new Date(dateOfIncorp) : new Date()}
                            mode="date"
                            display="spinner"
                            maximumDate={new Date()}
                            onChange={(e, d) => {
                              if (d) {
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth()+1).padStart(2,'0');
                                const dd = String(d.getDate()).padStart(2,'0');
                                setDateOfIncorp(`${yyyy}-${mm}-${dd}`);
                              }
                              setShowIncorpPicker(false);
                            }}
                            style={{ width: '100%' }}
                          />
                        </View>
                      </View>
                    </Modal>
                  ) : (
                    <DateTimePicker
                      value={dateOfIncorp ? new Date(dateOfIncorp) : new Date()}
                      mode="date"
                      display="calendar"
                      maximumDate={new Date()}
                      onChange={(e, d) => {
                        setShowIncorpPicker(false);
                        if (e.type === 'dismissed' || !d) return;
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth()+1).padStart(2,'0');
                        const dd = String(d.getDate()).padStart(2,'0');
                        setDateOfIncorp(`${yyyy}-${mm}-${dd}`);
                      }}
                    />
                  )
                )}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveBusiness}
                disabled={savingBusiness}
              >
                {savingBusiness
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={styles.saveBtnText}>Save Business Profile</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>
      </ScrollView>

      {/* ── Category Picker Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showCatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCatModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCatModal(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCatModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={BUSINESS_CATEGORIES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.catOption, category === item && styles.catOptionActive]}
                onPress={() => { setCategory(item); setShowCatModal(false); }}
              >
                <Text style={[styles.catOptionText, category === item && styles.catOptionTextActive]}>
                  {item}
                </Text>
                {category === item && <Text style={styles.catCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    padding: 24,
  },
  bizCard: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 19,
  },
  // Avatar
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
  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bizLogo: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  bizLogoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
  },
  bizLogoPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.1)',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: COLORS.primary,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  // Form
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
  required: {
    color: COLORS.error,
  },
  optional: {
    color: COLORS.textMuted,
    fontWeight: '400',
    fontSize: 12,
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
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    color: COLORS.text,
    fontSize: 15,
  },
  pickerPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  pickerArrow: {
    color: COLORS.textMuted,
    fontSize: 16,
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
  logoutBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 4,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catOptionActive: {
    backgroundColor: COLORS.primary + '08',
  },
  catOptionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  catOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  catCheck: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  // Date picker modal (iOS)
  dobModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dobModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  dobModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dobModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dobModalDone: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
