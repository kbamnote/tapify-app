import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert, Dimensions, Linking, Image, Platform, Modal, Keyboard } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi, API_BASE } from '../config';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const SWATCH_COLORS = ['#153e3f', '#25D366', '#d19a66', '#000000', '#3b5998', '#ef4444', '#ffffff', '#8e44ad', '#2980b9', '#f1c40f'];

const TEMPLATES = [
  { id: 'vcard1', name: 'Simple Contact' },
  { id: 'vcard2', name: 'Executive Profile' },
  { id: 'vcard3', name: 'Clean Canvas' },
  { id: 'vcard4', name: 'Professional' },
  { id: 'vcard5', name: 'Corporate Connect' },
  { id: 'vcard6', name: 'Modern Edge' },
  { id: 'vcard7', name: 'Business Beacon' },
  { id: 'vcard8', name: 'Corporate Classic' },
  { id: 'vcard9', name: 'Corporate Identity' },
  { id: 'vcard10', name: 'Pro Network' },
  { id: 'vcard11', name: 'Portfolio' },
  { id: 'vcard12', name: 'Gym (Dark)' },
  { id: 'vcard13', name: 'Hospital' },
  { id: 'vcard14', name: 'Event Management' },
  { id: 'vcard15', name: 'Salon' },
  { id: 'vcard16', name: 'Lawyer' },
  { id: 'vcard17', name: 'Programmer (Dark)' },
  { id: 'vcard18', name: 'CEO/CXO' },
  { id: 'vcard19', name: 'Fashion Beauty' },
  { id: 'vcard20', name: 'Culinary Food Services' },
  { id: 'vcard21', name: 'Social Media' },
  { id: 'vcard22', name: 'Dynamic vCard' },
  { id: 'vcard23', name: 'Consulting Services' },
  { id: 'vcard24', name: 'School Templates' },
  { id: 'vcard25', name: 'Social Services' },
  { id: 'vcard26', name: 'Retail E-commerce' },
  { id: 'vcard27', name: 'Pet Shop' },
  { id: 'vcard28', name: 'Pet Clinic' },
  { id: 'vcard29', name: 'Marriage' },
  { id: 'vcard30', name: 'Taxi Service (Dark)' },
  { id: 'vcard31', name: 'Handyman Services' },
  { id: 'vcard32', name: 'Interior Designer' },
  { id: 'vcard33', name: 'Musician (Dark)' },
  { id: 'vcard34', name: 'Photographer (Dark)' },
  { id: 'vcard35', name: 'Real Estate' },
  { id: 'vcard36', name: 'Travel Agency' },
  { id: 'vcard37', name: 'Flower Garden' },
  { id: 'vcard38', name: 'Architecture' },
  { id: 'vcard39', name: 'Bio Black (Dark)' },
  { id: 'vcard40', name: 'Bio White' },
  { id: 'vcard41', name: 'Social Vcard' },
  { id: 'vcard42', name: 'Social Vcard 2' }
];

const TABS = [
  { id: 'basic', label: 'Basic' },
  { id: 'personal', label: 'Personal' },
  { id: 'templates', label: 'Templates' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'features', label: 'Features' },
  { id: 'social', label: 'Social Links' },
  { id: 'business', label: 'Business Hours' }
];

const defaultFormData = {
  url_alias: '',
  vcard_name: '',
  occupation: '',
  description: '',
  cover_type: 'color',
  cover_color: '#f3f4f6',
  template_id: 'vcard1',
  profile_image: null,
  cover_image: null,
  favicon_image: null,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  phone_country_code: '',
  alternate_email: '',
  alternate_phone: '',
  location: '',
  location_url: '',
  location_type: 'address',
  dob: '',
  company: '',
  job_title: '',
  made_by: '',
  made_by_url: '',
  default_language: 'en',
  display_inquiry_form: false,
  display_qr_section: false,
  display_download_qr: false,
  display_add_contact: false,
  display_whatsapp_share: false,
  display_language_selector: false,
  hide_sticky_bar: false,
  qr_download_size: '500',
  primary_color: null,
  secondary_color: null,
  bg_color: null,
  cards_bg_color: null,
  button_text_color: null,
  label_text_color: null,
  description_text_color: null,
  social_icon_color: null,
  button_style: 'rounded',
  sticky_position: 'bottom',
  qr_color: '#000000',
  qr_bg_color: '#ffffff',
  qr_style: 'square',
  qr_eye_style: 'square',
  qr_use_config: false,
  banner_title: '',
  banner_url: '',
  banner_description: '',
  banner_button_text: '',
  banner_show: false,
  font_family: 'poppins',
  font_size: '14',
  seo_site_title: '',
  seo_home_title: '',
  seo_meta_keyword: '',
  seo_meta_description: '',
  privacy_policy: '',
  terms_conditions: '',
  show_contact: true,
  show_services: true,
  show_galleries: true,
  show_products: true,
  show_testimonials: true,
  show_blogs: true,
  show_business_hours: true,
  show_appointments: true,
  show_map: true,
  show_banner: false,
  show_instagram: false,
  show_iframes: false,
  show_newsletter: false,
  status: true,
  business_hours: {},
  social_links: {}
};

// Custom Form components to match beautiful styling
const TextInputField = ({ label, value, onChangeText, placeholder = '', multiline = false, height = 48 }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea, { height }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      placeholderTextColor={COLORS.textMuted}
    />
  </View>
);

const DOBPickerField = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);

  // Parse existing value or default to today
  const parseDate = (val) => {
    if (val) {
      const d = new Date(val);
      if (!isNaN(d)) return d;
    }
    return new Date();
  };

  const currentDate = parseDate(value);

  const formatDisplay = (val) => {
    if (!val) return 'Tap to select date';
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed') { setShowPicker(false); return; }
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
      if (Platform.OS === 'ios') setShowPicker(false);
    }
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity style={styles.dobPickerBtn} onPress={() => setShowPicker(true)}>
        <Text style={[styles.dobPickerText, !value && { color: COLORS.textMuted }]}>
          📅  {formatDisplay(value)}
        </Text>
        <Text style={styles.dobPickerArrow}>▼</Text>
      </TouchableOpacity>
      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showPicker}>
            <View style={styles.dobModalOverlay}>
              <View style={styles.dobModalContent}>
                <View style={styles.dobModalHeader}>
                  <Text style={styles.dobModalTitle}>Select Date of Birth</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text style={styles.dobModalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={currentDate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={handleChange}
                  style={{ width: '100%' }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={currentDate}
            mode="date"
            display="calendar"
            maximumDate={new Date()}
            onChange={handleChange}
          />
        )
      )}
    </View>
  );
};

const SwitchInputField = ({ label, value, onValueChange }) => (
  <View style={styles.switchGroup}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e2e8f0', true: COLORS.primary }}
      thumbColor={value ? COLORS.accent : '#f4f3f4'}
    />
  </View>
);

const SelectInput = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectHeader} onPress={() => setIsOpen(!isOpen)}>
        <Text style={styles.selectHeaderText}>
          {options.find(opt => opt.value === value)?.label || value}
        </Text>
        <Text style={styles.selectHeaderArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.selectOptionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.selectOption,
                opt.value === value && styles.selectOptionSelected
              ]}
              onPress={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <Text style={[
                styles.selectOptionText,
                opt.value === value && styles.selectOptionTextSelected
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const ColorInput = ({ label, value, onChange }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.colorRow}>
      <TextInput
        style={[styles.input, styles.colorInput]}
        value={value}
        onChangeText={onChange}
        placeholder="#ffffff"
        placeholderTextColor={COLORS.textMuted}
      />
      <View style={[styles.colorPreview, { backgroundColor: value || '#ffffff' }]} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteScroll}>
      <View style={styles.paletteRow}>
        {SWATCH_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: color },
              value === color && styles.selectedSwatch
            ]}
            onPress={() => onChange(color)}
          />
        ))}
      </View>
    </ScrollView>
  </View>
);

export default function VcardsEditScreen() {
  const [vcardId, setVcardId] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    loadVcard();

    const showSub = Platform.OS === 'android' ? 
      Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height)) :
      Keyboard.addListener('keyboardWillShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Platform.OS === 'android' ? 
      Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0)) :
      Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadVcard = async () => {
    try {
      setLoading(true);
      const meResponse = await fetchApi('/api/me.php');
      const vId = meResponse.data?.vcard?.id;
      
      if (vId) {
        setVcardId(vId);
        const vcardResponse = await fetchApi(`/api/vcards/get.php?id=${vId}`);
        const vcard = vcardResponse.data?.vcard;
        
        if (vcard) {
          const initialForm = {};
          
          Object.keys(defaultFormData).forEach(key => {
            if (key !== 'social_links' && key !== 'business_hours') {
              initialForm[key] = vcard[key] !== undefined && vcard[key] !== null ? vcard[key] : defaultFormData[key];
            }
          });
          
          // Map social links array to key-value structure
          const socialMap = {};
          if (vcard.social_links && Array.isArray(vcard.social_links)) {
            vcard.social_links.forEach(link => {
              socialMap[link.platform] = link.url || '';
            });
          }
          initialForm.social_links = socialMap;
          
          // Map business hours array to key-value structure
          const hoursMap = {};
          const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
          DAYS.forEach(day => {
            hoursMap[day] = {
              is_open: false,
              open_time: '10:00 AM',
              close_time: '06:00 PM'
            };
          });
          
          if (vcard.business_hours && Array.isArray(vcard.business_hours)) {
            vcard.business_hours.forEach(hour => {
              const day = hour.day_name.toUpperCase();
              hoursMap[day] = {
                is_open: hour.is_open === true || hour.is_open === 1 || hour.is_open === '1',
                open_time: hour.open_time || '10:00 AM',
                close_time: hour.close_time || '06:00 PM'
              };
            });
          }
          initialForm.business_hours = hoursMap;
          
          setFormData(initialForm);
          setPreviewUrl(vcard.preview_url || '');
        }
      } else {
        Alert.alert('Error', 'No vCard found for your account.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load vCard data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to allow library access to choose photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'cover' ? [16, 9] : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await handleUploadImage(selectedImage.uri, type);
      }
    } catch (error) {
      console.error("Image pick error:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const handleUploadImage = async (uri, type) => {
    if (!vcardId) {
      Alert.alert("Error", "Please save basic details first.");
      return;
    }
    
    try {
      setSaving(true);
      
      const formDataUpload = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const mimeType = match ? `image/${match[1]}` : 'image';
      
      formDataUpload.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: mimeType,
      });
      formDataUpload.append('vcard_id', String(vcardId));
      formDataUpload.append('type', type);
      
      const response = await fetchApi('/api/uploads/image.php', {
        method: 'POST',
        body: formDataUpload,
      });
      
      if (response.success) {
        Alert.alert("Success", `${type.charAt(0).toUpperCase() + type.slice(1)} image uploaded successfully!`);
        // Refresh vCard data
        await loadVcard();
      } else {
        Alert.alert("Error", response.message || "Failed to upload image.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!vcardId) return;
    try {
      setSaving(true);
      
      const socialLinksArray = Object.keys(formData.social_links)
        .filter(platform => formData.social_links[platform] && formData.social_links[platform].trim() !== '')
        .map(platform => ({
          platform,
          url: formData.social_links[platform].trim()
        }));
        
      const businessHoursArray = Object.keys(formData.business_hours).map(day => ({
        day_name: day,
        is_open: formData.business_hours[day].is_open ? 1 : 0,
        open_time: formData.business_hours[day].open_time,
        close_time: formData.business_hours[day].close_time
      }));
      
      const cleanColor = (color) => {
        return color && color.trim() !== '' ? color.trim() : null;
      };
      
      const payload = {
        id: vcardId,
        ...formData,
        primary_color: cleanColor(formData.primary_color),
        secondary_color: cleanColor(formData.secondary_color),
        bg_color: cleanColor(formData.bg_color),
        cards_bg_color: cleanColor(formData.cards_bg_color),
        button_text_color: cleanColor(formData.button_text_color),
        label_text_color: cleanColor(formData.label_text_color),
        description_text_color: cleanColor(formData.description_text_color),
        social_icon_color: cleanColor(formData.social_icon_color),
        dob: formData.dob && formData.dob.trim() !== '' ? formData.dob.trim() : null,
        location_url: formData.location_url && formData.location_url.trim() !== '' ? formData.location_url.trim() : null,
        made_by_url: formData.made_by_url && formData.made_by_url.trim() !== '' ? formData.made_by_url.trim() : null,
        alternate_email: formData.alternate_email && formData.alternate_email.trim() !== '' ? formData.alternate_email.trim() : null,
        alternate_phone: formData.alternate_phone && formData.alternate_phone.trim() !== '' ? formData.alternate_phone.trim() : null,
        social_links: socialLinksArray,
        business_hours: businessHoursArray
      };
      
      const response = await fetchApi('/api/vcards/update.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.success) {
        Alert.alert('Success', 'vCard updated successfully!');
        loadVcard();
      } else {
        Alert.alert('Error', response.message || 'Failed to update vCard.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update vCard.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, val) => {
    setFormData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const updateSocialLink = (platform, val) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: val
      }
    }));
  };

  const updateBusinessHour = (day, field, val) => {
    setFormData(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: val
        }
      }
    }));
  };


  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>vCard Builder</Text>
        {previewUrl ? (
          <TouchableOpacity 
            style={styles.previewBtn} 
            onPress={() => Linking.openURL(previewUrl)}
          >
            <Text style={styles.previewBtnText}>👁️ View Live</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Scrollable Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={[styles.contentContainer, { paddingBottom: keyboardHeight + 40 }]}>
        <GlassCard style={styles.card}>
          
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === 'basic' && (
            <View>
              <Text style={styles.tabHeading}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Link Alias</Text>
                <View style={styles.aliasRow}>
                  <Text style={styles.aliasPrefix}>tapify.me/</Text>
                  <TextInput 
                    style={[styles.input, styles.aliasInput]} 
                    value={formData.url_alias} 
                    onChangeText={(val) => updateField('url_alias', val)} 
                    placeholder="alias"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <TextInputField 
                label="vCard Name" 
                value={formData.vcard_name} 
                onChangeText={(val) => updateField('vcard_name', val)} 
                placeholder="My Business Card"
              />

              <TextInputField 
                label="Occupation / Designation" 
                value={formData.occupation} 
                onChangeText={(val) => updateField('occupation', val)} 
                placeholder="Software Engineer"
              />

              <TextInputField 
                label="Description / Bio" 
                value={formData.description} 
                onChangeText={(val) => updateField('description', val)} 
                placeholder="Tell others about yourself..."
                multiline={true}
                height={80}
              />

              <Text style={styles.tabSubheading}>Card Images & Branding</Text>

              {/* Profile Image Upload */}
              <View style={styles.uploadGroup}>
                <Text style={styles.label}>Profile Image</Text>
                <View style={styles.uploadRow}>
                  <View style={styles.uploadPreviewContainer}>
                    {formData.profile_image ? (
                      <Image 
                        source={{ uri: formData.profile_image.startsWith('http') ? formData.profile_image : `${API_BASE}/${formData.profile_image}` }} 
                        style={styles.profileUploadPreview} 
                      />
                    ) : (
                      <View style={[styles.profileUploadPreview, styles.emptyImagePreview]}>
                        <Text style={styles.emptyImageText}>No Image</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => handlePickImage('profile')}
                  >
                    <Text style={styles.uploadBtnText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.uploadHint}>Square image works best (PNG, JPG, WebP)</Text>
              </View>

              {/* Cover Image Upload */}
              <View style={styles.uploadGroup}>
                <Text style={styles.label}>Cover Image</Text>
                <View style={styles.uploadRow}>
                  <View style={styles.uploadPreviewContainer}>
                    {formData.cover_image ? (
                      <Image 
                        source={{ uri: formData.cover_image.startsWith('http') ? formData.cover_image : `${API_BASE}/${formData.cover_image}` }} 
                        style={styles.coverUploadPreview} 
                      />
                    ) : (
                      <View style={[styles.coverUploadPreview, styles.emptyImagePreview]}>
                        <Text style={styles.emptyImageText}>No Image</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => handlePickImage('cover')}
                  >
                    <Text style={styles.uploadBtnText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.uploadHint}>Banner landscape image (PNG, JPG, WebP)</Text>
              </View>

              {/* Favicon Image Upload */}
              <View style={styles.uploadGroup}>
                <Text style={styles.label}>Favicon Image (Browser Tab Icon)</Text>
                <View style={styles.uploadRow}>
                  <View style={styles.uploadPreviewContainer}>
                    {formData.favicon_image ? (
                      <Image 
                        source={{ uri: formData.favicon_image.startsWith('http') ? formData.favicon_image : `${API_BASE}/${formData.favicon_image}` }} 
                        style={styles.faviconUploadPreview} 
                      />
                    ) : (
                      <View style={[styles.faviconUploadPreview, styles.emptyImagePreview]}>
                        <Text style={styles.emptyImageText}>No Image</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => handlePickImage('favicon')}
                  >
                    <Text style={styles.uploadBtnText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.uploadHint}>Tiny icon (PNG, JPG)</Text>
              </View>
            </View>
          )}

          {/* TAB 2: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <View>
              <Text style={styles.tabHeading}>Personal & Professional Details</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TextInputField 
                    label="First Name" 
                    value={formData.first_name} 
                    onChangeText={(val) => updateField('first_name', val)} 
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <TextInputField 
                    label="Last Name" 
                    value={formData.last_name} 
                    onChangeText={(val) => updateField('last_name', val)} 
                  />
                </View>
              </View>

              <TextInputField 
                label="Email Address" 
                value={formData.email} 
                onChangeText={(val) => updateField('email', val)} 
                placeholder="name@domain.com"
              />

              <TextInputField 
                label="Alternate Email Address" 
                value={formData.alternate_email} 
                onChangeText={(val) => updateField('alternate_email', val)} 
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TextInputField 
                    label="Country Code" 
                    value={formData.phone_country_code} 
                    onChangeText={(val) => updateField('phone_country_code', val)} 
                    placeholder="+91"
                  />
                </View>
                <View style={{ flex: 2, marginLeft: 8 }}>
                  <TextInputField 
                    label="Phone Number" 
                    value={formData.phone} 
                    onChangeText={(val) => updateField('phone', val)} 
                    placeholder="9876543210"
                  />
                </View>
              </View>

              <TextInputField 
                label="Alternate Phone Number" 
                value={formData.alternate_phone} 
                onChangeText={(val) => updateField('alternate_phone', val)} 
              />

              <TextInputField 
                label="Location (Address)" 
                value={formData.location} 
                onChangeText={(val) => updateField('location', val)} 
              />

              <TextInputField 
                label="Location URL (Google Maps Link)" 
                value={formData.location_url} 
                onChangeText={(val) => updateField('location_url', val)} 
              />

              <SelectInput 
                label="Location Map Type" 
                value={formData.location_type} 
                options={[
                  { value: 'address', label: 'Address' },
                  { value: 'iframe', label: 'Google Maps Embed (Iframe)' }
                ]}
                onChange={(val) => updateField('location_type', val)}
              />

              <DOBPickerField
                value={formData.dob}
                onChange={(val) => updateField('dob', val)}
              />

              <TextInputField 
                label="Company Name" 
                value={formData.company} 
                onChangeText={(val) => updateField('company', val)} 
              />

              <TextInputField 
                label="Job Title" 
                value={formData.job_title} 
                onChangeText={(val) => updateField('job_title', val)} 
              />

              <TextInputField 
                label="Made By" 
                value={formData.made_by} 
                onChangeText={(val) => updateField('made_by', val)} 
              />

              <TextInputField 
                label="Made By URL" 
                value={formData.made_by_url} 
                onChangeText={(val) => updateField('made_by_url', val)} 
              />

              <SelectInput 
                label="Default Language" 
                value={formData.default_language} 
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'hi', label: 'Hindi (हिन्दी)' },
                  { value: 'bn', label: 'Bengali (বাংলা)' },
                  { value: 'te', label: 'Telugu (తెలుగు)' },
                  { value: 'mr', label: 'Marathi (मराठी)' },
                  { value: 'ta', label: 'Tamil (தமிழ்)' },
                  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
                  { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
                  { value: 'ml', label: 'Malayalam (മലയാളം)' },
                  { value: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
                  { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
                  { value: 'ur', label: 'Urdu (اردو)' },
                ]}
                onChange={(val) => updateField('default_language', val)}
              />
            </View>
          )}

          {/* TAB 3: TEMPLATES */}
          {activeTab === 'templates' && (
            <View>
              <Text style={styles.tabHeading}>Select vCard Template</Text>
              <View style={styles.templatesGrid}>
                {TEMPLATES.map(tpl => {
                  const isSelected = formData.template_id === tpl.id;
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.templateCard, isSelected && styles.templateCardSelected]}
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          template_id: tpl.id,
                          primary_color: null,
                          secondary_color: null,
                          bg_color: null,
                          cards_bg_color: null,
                          button_text_color: null,
                          label_text_color: null,
                          description_text_color: null,
                          social_icon_color: null
                        }));
                      }}
                    >
                      <View style={[styles.templateThumb, { backgroundColor: isSelected ? COLORS.primary : 'rgba(21,62,63,0.05)' }]}>
                        <Text style={[styles.templateThumbText, isSelected && { color: '#ffffff' }]}>
                          {tpl.id.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.templateName, isSelected && styles.templateNameSelected]} numberOfLines={1}>
                        {tpl.name}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 4: APPEARANCE */}
          {activeTab === 'appearance' && (
            <View>
              <Text style={styles.tabHeading}>Visual & Styling Customization</Text>
              
              <TouchableOpacity
                style={styles.resetColorsBtn}
                onPress={() => {
                  setFormData(prev => ({
                    ...prev,
                    primary_color: null,
                    secondary_color: null,
                    bg_color: null,
                    cards_bg_color: null,
                    button_text_color: null,
                    label_text_color: null,
                    description_text_color: null,
                    social_icon_color: null
                  }));
                  Alert.alert('Colors Reset', 'Custom colors have been cleared. Save changes to apply template default styling.');
                }}
              >
                <Text style={styles.resetColorsBtnText}>🎨 Revert to Template Defaults</Text>
              </TouchableOpacity>
              
              <ColorInput 
                label="Primary Brand Color" 
                value={formData.primary_color} 
                onChange={(val) => updateField('primary_color', val)} 
              />

              <ColorInput 
                label="Secondary Brand Color" 
                value={formData.secondary_color} 
                onChange={(val) => updateField('secondary_color', val)} 
              />

              <ColorInput 
                label="Background Color" 
                value={formData.bg_color} 
                onChange={(val) => updateField('bg_color', val)} 
              />

              <ColorInput 
                label="Cards Background Color" 
                value={formData.cards_bg_color} 
                onChange={(val) => updateField('cards_bg_color', val)} 
              />

              <ColorInput 
                label="Button Text Color" 
                value={formData.button_text_color} 
                onChange={(val) => updateField('button_text_color', val)} 
              />

              <ColorInput 
                label="Label Text Color" 
                value={formData.label_text_color} 
                onChange={(val) => updateField('label_text_color', val)} 
              />

              <ColorInput 
                label="Description Text Color" 
                value={formData.description_text_color} 
                onChange={(val) => updateField('description_text_color', val)} 
              />

              <ColorInput 
                label="Social Icon Color" 
                value={formData.social_icon_color} 
                onChange={(val) => updateField('social_icon_color', val)} 
              />

              <SelectInput 
                label="Button Style" 
                value={formData.button_style} 
                options={[
                  { value: 'rounded', label: 'Rounded' },
                  { value: 'square', label: 'Square' },
                  { value: 'glass', label: 'Glassmorphic' }
                ]}
                onChange={(val) => updateField('button_style', val)}
              />

              <SelectInput 
                label="Font Family" 
                value={formData.font_family} 
                options={[
                  { value: 'poppins', label: 'Poppins' },
                  { value: 'inter', label: 'Inter' },
                  { value: 'montserrat', label: 'Montserrat' },
                  { value: 'nunito', label: 'Nunito' },
                  { value: 'lora', label: 'Lora' },
                  { value: 'roboto', label: 'Roboto' }
                ]}
                onChange={(val) => updateField('font_family', val)}
              />

              <TextInputField 
                label="Font Size (px)" 
                value={formData.font_size} 
                onChangeText={(val) => updateField('font_size', val)} 
                placeholder="14"
              />

              <TextInputField 
                label="SEO Site Title" 
                value={formData.seo_site_title} 
                onChangeText={(val) => updateField('seo_site_title', val)} 
              />

              <TextInputField 
                label="SEO Meta Description" 
                value={formData.seo_meta_description} 
                onChangeText={(val) => updateField('seo_meta_description', val)} 
                multiline={true}
                height={80}
              />

              <TextInputField 
                label="Privacy Policy Link / Text" 
                value={formData.privacy_policy} 
                onChangeText={(val) => updateField('privacy_policy', val)} 
                multiline={true}
                height={80}
              />

              <TextInputField 
                label="Terms & Conditions Link / Text" 
                value={formData.terms_conditions} 
                onChangeText={(val) => updateField('terms_conditions', val)} 
                multiline={true}
                height={80}
              />
            </View>
          )}

          {/* TAB 5: FEATURES */}
          {activeTab === 'features' && (
            <View>
              <Text style={styles.tabHeading}>Manage Sections & Options</Text>
              
              <SwitchInputField 
                label="Card Active Status" 
                value={formData.status} 
                onValueChange={(val) => updateField('status', val)} 
              />

              <View style={styles.divider} />
              <Text style={styles.tabSubheading}>Interactions</Text>

              <SwitchInputField 
                label="Display Inquiry Form" 
                value={formData.display_inquiry_form} 
                onValueChange={(val) => updateField('display_inquiry_form', val)} 
              />

              <SwitchInputField 
                label="Display QR Code Section" 
                value={formData.display_qr_section} 
                onValueChange={(val) => updateField('display_qr_section', val)} 
              />

              <SwitchInputField 
                label="Display Add to Contact Icon" 
                value={formData.display_add_contact} 
                onValueChange={(val) => updateField('display_add_contact', val)} 
              />

              <SwitchInputField 
                label="Display WhatsApp Share Icon" 
                value={formData.display_whatsapp_share} 
                onValueChange={(val) => updateField('display_whatsapp_share', val)} 
              />

              <SwitchInputField 
                label="Display Language Selector" 
                value={formData.display_language_selector} 
                onValueChange={(val) => updateField('display_language_selector', val)} 
              />

              <SwitchInputField 
                label="Hide Sticky Action Bar" 
                value={formData.hide_sticky_bar} 
                onValueChange={(val) => updateField('hide_sticky_bar', val)} 
              />

              <View style={styles.divider} />
              <Text style={styles.tabSubheading}>Visible Content Sections</Text>

              <SwitchInputField 
                label="Contact Information" 
                value={formData.show_contact} 
                onValueChange={(val) => updateField('show_contact', val)} 
              />

              <SwitchInputField 
                label="Services" 
                value={formData.show_services} 
                onValueChange={(val) => updateField('show_services', val)} 
              />

              <SwitchInputField 
                label="Galleries" 
                value={formData.show_galleries} 
                onValueChange={(val) => updateField('show_galleries', val)} 
              />

              <SwitchInputField 
                label="Products" 
                value={formData.show_products} 
                onValueChange={(val) => updateField('show_products', val)} 
              />

              <SwitchInputField 
                label="Testimonials" 
                value={formData.show_testimonials} 
                onValueChange={(val) => updateField('show_testimonials', val)} 
              />

              <SwitchInputField 
                label="Blogs" 
                value={formData.show_blogs} 
                onValueChange={(val) => updateField('show_blogs', val)} 
              />

              <SwitchInputField 
                label="Business Hours" 
                value={formData.show_business_hours} 
                onValueChange={(val) => updateField('show_business_hours', val)} 
              />

              <SwitchInputField 
                label="Appointments" 
                value={formData.show_appointments} 
                onValueChange={(val) => updateField('show_appointments', val)} 
              />

              <SwitchInputField 
                label="Google Maps Block" 
                value={formData.show_map} 
                onValueChange={(val) => updateField('show_map', val)} 
              />

              <SwitchInputField 
                label="Banner / Ad Block" 
                value={formData.show_banner} 
                onValueChange={(val) => updateField('show_banner', val)} 
              />

              <SwitchInputField 
                label="Instagram Embed" 
                value={formData.show_instagram} 
                onValueChange={(val) => updateField('show_instagram', val)} 
              />

              <SwitchInputField 
                label="Iframe Embed Block" 
                value={formData.show_iframes} 
                onValueChange={(val) => updateField('show_iframes', val)} 
              />

              <SwitchInputField 
                label="Newsletter Subscription" 
                value={formData.show_newsletter} 
                onValueChange={(val) => updateField('show_newsletter', val)} 
              />
            </View>
          )}

          {/* TAB 6: SOCIAL LINKS */}
          {activeTab === 'social' && (
            <View>
              <Text style={styles.tabHeading}>Social Links URLs</Text>
              
              <TextInputField 
                label="WhatsApp (Full Link or Number)" 
                value={formData.social_links.whatsapp || ''} 
                onChangeText={(val) => updateSocialLink('whatsapp', val)} 
                placeholder="e.g. 919876543210"
              />

              <TextInputField 
                label="Instagram URL" 
                value={formData.social_links.instagram || ''} 
                onChangeText={(val) => updateSocialLink('instagram', val)} 
                placeholder="https://instagram.com/yourprofile"
              />

              <TextInputField 
                label="Facebook URL" 
                value={formData.social_links.facebook || ''} 
                onChangeText={(val) => updateSocialLink('facebook', val)} 
                placeholder="https://facebook.com/yourpage"
              />

              <TextInputField 
                label="LinkedIn URL" 
                value={formData.social_links.linkedin || ''} 
                onChangeText={(val) => updateSocialLink('linkedin', val)} 
                placeholder="https://linkedin.com/in/username"
              />

              <TextInputField 
                label="Twitter (X) URL" 
                value={formData.social_links.twitter || ''} 
                onChangeText={(val) => updateSocialLink('twitter', val)} 
                placeholder="https://x.com/username"
              />

              <TextInputField 
                label="YouTube Channel URL" 
                value={formData.social_links.youtube || ''} 
                onChangeText={(val) => updateSocialLink('youtube', val)} 
                placeholder="https://youtube.com/@channel"
              />

              <TextInputField 
                label="TikTok URL" 
                value={formData.social_links.tiktok || ''} 
                onChangeText={(val) => updateSocialLink('tiktok', val)} 
                placeholder="https://tiktok.com/@username"
              />

              <TextInputField 
                label="Telegram URL" 
                value={formData.social_links.telegram || ''} 
                onChangeText={(val) => updateSocialLink('telegram', val)} 
                placeholder="https://t.me/username"
              />
            </View>
          )}

          {/* TAB 7: BUSINESS HOURS */}
          {activeTab === 'business' && (
            <View>
              <Text style={styles.tabHeading}>Weekly Working Hours</Text>
              
              {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => {
                const dayData = formData.business_hours[day] || { is_open: false, open_time: '10:00 AM', close_time: '06:00 PM' };
                return (
                  <View key={day} style={styles.businessDayCard}>
                    <View style={styles.businessDayHeader}>
                      <Text style={styles.businessDayName}>{day}</Text>
                      <Switch
                        value={dayData.is_open}
                        onValueChange={(val) => updateBusinessHour(day, 'is_open', val)}
                        trackColor={{ false: '#e2e8f0', true: COLORS.primary }}
                        thumbColor={dayData.is_open ? COLORS.accent : '#f4f3f4'}
                      />
                    </View>
                    
                    {dayData.is_open && (
                      <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.timeLabel}>Open Time</Text>
                          <TextInput
                            style={[styles.input, styles.timeInput]}
                            value={dayData.open_time}
                            onChangeText={(val) => updateBusinessHour(day, 'open_time', val)}
                            placeholder="10:00 AM"
                            placeholderTextColor={COLORS.textMuted}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.timeLabel}>Close Time</Text>
                          <TextInput
                            style={[styles.input, styles.timeInput]}
                            value={dayData.close_time}
                            onChangeText={(val) => updateBusinessHour(day, 'close_time', val)}
                            placeholder="06:00 PM"
                            placeholderTextColor={COLORS.textMuted}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 62, 63, 0.08)',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.05)',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollBody: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
  },
  tabHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  tabSubheading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 14,
  },
  textArea: {
    paddingTop: 10,
    textAlignVertical: 'top',
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
    fontSize: 14,
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
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 62, 63, 0.04)',
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(21, 62, 63, 0.08)',
    marginVertical: 16,
  },
  selectHeader: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  selectHeaderText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectHeaderArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  selectOptionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 62, 63, 0.04)',
  },
  selectOptionSelected: {
    backgroundColor: 'rgba(21, 62, 63, 0.05)',
  },
  selectOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorInput: {
    flex: 1,
    marginRight: 10,
  },
  colorPreview: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
  },
  paletteScroll: {
    marginTop: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedSwatch: {
    borderColor: COLORS.primary,
    transform: [{ scale: 1.15 }],
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  templateCard: {
    width: (width - 72) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  templateCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#ffffff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  templateThumb: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateThumbText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  templateName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  templateNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  businessDayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  businessDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessDayName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: 8,
  },
  timeInput: {
    height: 40,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetColorsBtn: {
    backgroundColor: 'rgba(21, 62, 63, 0.05)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.1)',
  },
  resetColorsBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadGroup: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.08)',
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadPreviewContainer: {
    marginRight: 16,
  },
  profileUploadPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
  },
  coverUploadPreview: {
    width: 100,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
  },
  faviconUploadPreview: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(21, 62, 63, 0.15)',
  },
  emptyImagePreview: {
    backgroundColor: 'rgba(21, 62, 63, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyImageText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  uploadBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  uploadBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  // DOB Picker
  dobPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
  },
  dobPickerText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  dobPickerArrow: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  dobModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dobModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  dobModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dobModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  dobModalDone: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
