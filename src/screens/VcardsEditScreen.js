import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert, Dimensions, Linking, Image, Platform, Modal, Keyboard, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi, API_BASE } from '../config';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');

const SWATCH_COLORS = ['#153e3f', '#25D366', '#d19a66', '#000000', '#3b5998', '#ef4444', '#ffffff', '#8e44ad', '#2980b9', '#f1c40f'];

const TEMPLATES = [
  { id: 'vcard01', name: 'Corporate Executive',      primary: '#c9a84c', secondary: '#f0c96a', bg: '#0a1628', dark: true  },
  { id: 'vcard02', name: 'Medical Doctor',           primary: '#0d9488', secondary: '#14b8a6', bg: '#f8fafc'              },
  { id: 'vcard03', name: 'Creative Designer',        primary: '#7c3aed', secondary: '#e879f9', bg: '#0c0512', dark: true  },
  { id: 'vcard04', name: 'Real Estate',              primary: '#c87941', secondary: '#8b5e3c', bg: '#fdf8f0'              },
  { id: 'vcard05', name: 'Restaurant Chef',          primary: '#c0392b', secondary: '#d4af37', bg: '#1a0a0a', dark: true  },
  { id: 'vcard06', name: 'Fitness Trainer',          primary: '#f97316', secondary: '#fbbf24', bg: '#0d0d0d', dark: true  },
  { id: 'vcard07', name: 'Tech Developer',           primary: '#00e5ff', secondary: '#00ff88', bg: '#050d12', dark: true  },
  { id: 'vcard08', name: 'Lawyer & Legal',           primary: '#0b1c3d', secondary: '#b8952a', bg: '#f4f6f9'              },
  { id: 'vcard09', name: 'Beauty Salon',             primary: '#c9796a', secondary: '#e8b898', bg: '#fff8f8'              },
  { id: 'vcard10', name: 'Musician & Artist',        primary: '#7b2fff', secondary: '#ff2d9e', bg: '#04050e', dark: true  },
  { id: 'vcard11', name: 'Photographer',             primary: '#d4a853', secondary: '#f0c878', bg: '#0a0a0a', dark: true  },
  { id: 'vcard12', name: 'Financial Advisor',        primary: '#0f2b52', secondary: '#2563eb', bg: '#f0f4f8'              },
  { id: 'vcard13', name: 'Architect',                primary: '#1c1c1c', secondary: '#c45c26', bg: '#f7f5f0'              },
  { id: 'vcard14', name: 'Yoga & Wellness',          primary: '#7a9e7e', secondary: '#a8c5a0', bg: '#f5f0eb'              },
  { id: 'vcard15', name: 'Digital Marketing',        primary: '#6c47ff', secondary: '#ff47b8', bg: '#060614', dark: true  },
  { id: 'vcard16', name: 'Interior Designer',        primary: '#c17f5c', secondary: '#e8a07a', bg: '#f9f6f1'              },
  { id: 'vcard17', name: 'Wedding Planner',          primary: '#c9607a', secondary: '#e8849a', bg: '#fdf8fc'              },
  { id: 'vcard18', name: 'Dentist',                  primary: '#0891b2', secondary: '#06b6d4', bg: '#f0fffe'              },
  { id: 'vcard19', name: 'CA & Accountant',          primary: '#d4a017', secondary: '#f0c040', bg: '#0e1a2b', dark: true  },
  { id: 'vcard20', name: 'School Teacher',           primary: '#f59e0b', secondary: '#fbbf24', bg: '#fffbf0'              },
  { id: 'vcard21', name: 'Fashion Designer',         primary: '#e8b4b8', secondary: '#c9a96e', bg: '#0c0c0c', dark: true  },
  { id: 'vcard22', name: 'Travel Agent',             primary: '#0ea5e9', secondary: '#38bdf8', bg: '#f0f9ff'              },
  { id: 'vcard23', name: 'Automobile Dealer',        primary: '#dc2626', secondary: '#c0c8d4', bg: '#0a0a0a', dark: true  },
  { id: 'vcard24', name: 'Event Planner',            primary: '#9333ea', secondary: '#ec4899', bg: '#0d0010', dark: true  },
  { id: 'vcard25', name: 'Pharma & Medical',         primary: '#16a34a', secondary: '#22c55e', bg: '#f0fdf4'              },
  { id: 'vcard26', name: 'NGO & Social',             primary: '#7c3aed', secondary: '#a78bfa', bg: '#f5f3ff'              },
  { id: 'vcard27', name: 'Coaching Institute',       primary: '#2563eb', secondary: '#3b82f6', bg: '#eff6ff'              },
  { id: 'vcard28', name: 'Electrician & Contractor', primary: '#d97706', secondary: '#f59e0b', bg: '#fffbeb'              },
];

const TABS = [
  { id: 'basic', label: 'Basic' },
  { id: 'personal', label: 'Personal' },
  { id: 'templates', label: 'Templates' },
  // { id: 'appearance', label: 'Appearance' },
  { id: 'features', label: 'Features' },
  { id: 'social', label: 'Social Links' },
  { id: 'business', label: 'Business Hours' },
  { id: 'services', label: 'Services' },
  { id: 'service_cat', label: 'Service Categories' },
  { id: 'products', label: 'Products' },
  { id: 'galleries', label: 'Galleries' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'iframes', label: 'Iframes' },
  { id: 'instaembed', label: 'InstaEmbed' },
  { id: 'dynamic_qr', label: 'Dynamic QR' }
];

const TEMPLATE_IMAGES = {
  'vcard01': require('../../assets/template_01.png'),
  'vcard02': require('../../assets/template_02.png'),
  'vcard03': require('../../assets/template_03.png'),
  'vcard04': require('../../assets/template_04.png'),
  'vcard05': require('../../assets/template_05.png'),
  'vcard06': require('../../assets/template_06.png'),
  'vcard07': require('../../assets/template_07.png'),
  'vcard08': require('../../assets/template_08.png'),
  'vcard09': require('../../assets/template_09.png'),
  'vcard10': require('../../assets/template_10.png'),
  'vcard11': require('../../assets/template_11.png'),
  'vcard12': require('../../assets/template_12.png'),
  'vcard13': require('../../assets/template_13.png'),
  'vcard14': require('../../assets/template_14.png'),
  'vcard15': require('../../assets/template_15.png'),
  'vcard16': require('../../assets/template_16.png'),
  'vcard17': require('../../assets/template_17.png'),
  'vcard18': require('../../assets/template_18.png'),
  'vcard19': require('../../assets/template_19.png'),
  'vcard20': require('../../assets/template_20.png'),
  'vcard21': require('../../assets/template_21.png'),
  'vcard22': require('../../assets/template_22.png'),
  'vcard23': require('../../assets/template_23.png'),
  'vcard24': require('../../assets/template_24.png'),
  'vcard25': require('../../assets/template_25.png'),
  'vcard26': require('../../assets/template_26.png'),
  'vcard27': require('../../assets/template_27.png'),
  'vcard28': require('../../assets/template_28.png'),
};

const defaultFormData = {
  url_alias: '',
  vcard_name: '',
  occupation: '',
  description: '',
  cover_type: 'color',
  cover_color: '#f3f4f6',
  template_id: 'vcard01',
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
  const [extras, setExtras] = useState({ services: [], serviceCategories: [], products: [], galleries: [], testimonials: [], iframes: [], instagram: [], dynamicQRs: [] });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [pendingProductImage, setPendingProductImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState({});
  const [uploadingGallery, setUploadingGallery] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const qrViewRef = useRef(null);

  const downloadQR = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow gallery access to save QR code.');
        return;
      }
      if (qrViewRef.current) {
        const uri = await qrViewRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Success', 'QR Code saved to gallery!');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save QR code.');
    }
  };

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
          loadExtras(vId);
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

  const loadExtras = async (id) => {
    try {
      const [svcRes, catRes, prodRes, galRes, testRes, iframeRes, instaRes, qrRes] = await Promise.all([
        fetchApi(`/api/services/list.php?vcard_id=${id}`),
        fetchApi(`/api/service-categories/list.php?vcard_id=${id}`),
        fetchApi(`/api/products/list.php?vcard_id=${id}`),
        fetchApi(`/api/galleries/list.php?vcard_id=${id}`),
        fetchApi(`/api/testimonials/list.php?vcard_id=${id}`),
        fetchApi(`/api/iframes/list.php?vcard_id=${id}`),
        fetchApi(`/api/instagram/list.php?vcard_id=${id}`),
        fetchApi(`/api/dynamic-qr/list.php`)
      ]);
      setExtras({
        services: svcRes.data?.services || [],
        serviceCategories: catRes.data?.categories || [],
        products: prodRes.data?.products || [],
        galleries: galRes.data?.galleries || [],
        testimonials: testRes.data?.testimonials || [],
        iframes: iframeRes.data?.iframes || [],
        instagram: instaRes.data?.feeds || [],
        dynamicQRs: qrRes.data || []
      });
    } catch (e) {
      console.warn("Failed to load extras", e);
    }
  };

  const pickAndUploadImageFor = async (type, targetId, onDone) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Allow gallery access to choose photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setSaving(true);
      const fd = new FormData();
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      fd.append('file', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: filename,
        type: match ? `image/${match[1]}` : 'image/jpeg',
      });
      fd.append('vcard_id', String(vcardId));
      fd.append('type', type);
      fd.append('target_id', String(targetId));

      const res = await fetchApi('/api/uploads/image.php', { method: 'POST', body: fd });
      if (res.success) {
        if (onDone) onDone(res.url || res.path);
      } else {
        Alert.alert('Upload failed', res.message || 'Could not upload image.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setSaving(false);
    }
  };

  const loadGalleryImages = async (galleryId) => {
    try {
      const res = await fetchApi(`/api/uploads/gallery-images.php?gallery_id=${galleryId}`);
      setGalleryImages(prev => ({ ...prev, [galleryId]: res.data?.images || [] }));
    } catch (e) {
      setGalleryImages(prev => ({ ...prev, [galleryId]: [] }));
    }
  };

  const deleteGalleryImage = async (imageId, galleryId) => {
    Alert.alert('Delete Photo', 'Remove this photo from the gallery?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await fetchApi('/api/uploads/delete-image.php', {
          method: 'POST',
          body: JSON.stringify({ vcard_id: vcardId, type: 'gallery', image_id: imageId }),
        });
        if (res.success) loadGalleryImages(galleryId);
      }},
    ]);
  };

  const openModal = (type, data = null) => {
    setModalType(type);
    setModalData(data || {});
    setPendingProductImage(null);
    setModalVisible(true);
  };

  const saveExtraItem = async () => {
    if (!vcardId) return;
    setSaving(true);
    let endpoint = '';
    let payload = { vcard_id: vcardId, ...modalData };
    
    if (modalType === 'iframe') endpoint = '/api/iframes/save.php';
    if (modalType === 'instaembed') endpoint = '/api/instagram/save.php';
    if (modalType === 'gallery') endpoint = '/api/galleries/save.php';
    if (modalType === 'testimonial') endpoint = '/api/testimonials/save.php';
    if (modalType === 'service') endpoint = '/api/services/save.php';
    if (modalType === 'service_cat') endpoint = '/api/service-categories/save.php';
    if (modalType === 'service_item') endpoint = '/api/service-items/save.php';
    if (modalType === 'product') endpoint = '/api/products/save.php';
    if (modalType === 'dynamic_qr') endpoint = '/api/dynamic-qr/save.php';

    try {
      const response = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (response.success) {
        // If product/service/service_item and user picked a new image, upload it now using the new ID
        if ((modalType === 'product' || modalType === 'service' || modalType === 'service_item') && pendingProductImage) {
          const targetId = response.data?.id || modalData.id;
          if (targetId) {
            const fd = new FormData();
            const uri = pendingProductImage;
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            fd.append('file', {
              uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
              name: filename,
              type: match ? `image/${match[1]}` : 'image/jpeg',
            });
            fd.append('vcard_id', String(vcardId));
            fd.append('type', modalType === 'service_item' ? 'service_item' : modalType);
            fd.append('target_id', String(targetId));
            await fetchApi('/api/uploads/image.php', { method: 'POST', body: fd });
          }
          setPendingProductImage(null);
        }
        setModalVisible(false);
        loadExtras(vcardId);
      } else {
        Alert.alert('Error', response.message || 'Save failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteExtraItem = async (type, id) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          let endpoint = '';
          if (type === 'iframe') endpoint = '/api/iframes/delete.php';
          if (type === 'instaembed') endpoint = '/api/instagram/delete.php';
          if (type === 'gallery') endpoint = '/api/galleries/delete.php';
          if (type === 'testimonial') endpoint = '/api/testimonials/delete.php';
          if (type === 'service') endpoint = '/api/services/delete.php';
          if (type === 'service_cat') endpoint = '/api/service-categories/delete.php';
          if (type === 'service_item') endpoint = '/api/service-items/delete.php';
          if (type === 'product') endpoint = '/api/products/delete.php';
          if (type === 'dynamic_qr') endpoint = '/api/dynamic-qr/delete.php';
          
          try {
            const response = await fetchApi(endpoint, {
              method: 'POST',
              body: JSON.stringify({ vcard_id: vcardId, id })
            });
            if (response.success) {
              loadExtras(vcardId);
            } else {
              Alert.alert('Error', response.message);
            }
          } catch(e) {}
      }}
    ]);
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
        cover_type: formData.cover_type || 'image',
        cover_image: formData.cover_image && formData.cover_image.trim() !== '' ? formData.cover_image.trim() : null,
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
        <Text style={styles.sectionTitle}>Card Builder</Text>
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
                <Text style={styles.label}>Cover Media</Text>
                
                <SelectInput 
                  label="Cover Type" 
                  value={formData.cover_type || 'image'} 
                  options={[
                    { value: 'image', label: 'Image Upload' },
                    { value: 'video', label: 'YouTube / Video URL' }
                  ]}
                  onChange={(val) => updateField('cover_type', val)}
                />

                {(!formData.cover_type || formData.cover_type === 'image') ? (
                  <View>
                    <View style={styles.uploadRow}>
                      <View style={styles.uploadPreviewContainer}>
                        {formData.cover_image && !formData.cover_image.includes('youtube') && !formData.cover_image.includes('youtu.be') ? (
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
                ) : (
                  <TextInputField 
                    label="YouTube or Video Link" 
                    value={formData.cover_image} 
                    onChangeText={(val) => updateField('cover_image', val)} 
                    placeholder="https://youtube.com/watch?v=..."
                  />
                )}
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
              <Text style={styles.tabSubheading}>Swipe and tap to select a template design</Text>
              
              {/* Mobile Phone Mockup Preview */}
              <View style={styles.mobileMockupContainer}>
                <View style={styles.mobileMockupFrame}>
                  {/* Notch / Speaker */}
                  <View style={styles.mobileNotch} />
                  
                  {/* Template Image */}
                  <ScrollView style={styles.mobileScreen} showsVerticalScrollIndicator={false}>
                    <Image 
                      source={TEMPLATE_IMAGES[formData.template_id] || TEMPLATE_IMAGES['vcard01']} 
                      style={styles.mobileScreenImage} 
                      resizeMode="cover" 
                    />
                  </ScrollView>
                </View>
              </View>

              {/* Carousel of templates */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.templatesCarousel}
              >
                {TEMPLATES.map(tpl => {
                  const isSelected = formData.template_id === tpl.id;
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.carouselItem, isSelected && styles.carouselItemSelected, { borderColor: isSelected ? COLORS.primary : 'transparent' }]}
                      activeOpacity={0.85}
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
                      <Image 
                        source={TEMPLATE_IMAGES[tpl.id]} 
                        style={styles.carouselImage} 
                        resizeMode="cover" 
                      />
                      {isSelected && (
                        <View style={styles.carouselActiveBadge}>
                          <Text style={styles.carouselActiveText}>✓</Text>
                        </View>
                      )}
                      <Text style={[styles.carouselName, isSelected && styles.carouselNameSelected]} numberOfLines={1}>
                        {tpl.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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

          {/* TAB 8: PRODUCTS */}
          {activeTab === 'services' && (
            <View>
              <Text style={styles.tabHeading}>Manage Services</Text>
              {extras.services.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No services yet.</Text>
              ) : (
                extras.services.map(item => (
                  <View key={item.id} style={[styles.listItemCard, { alignItems: 'flex-start', gap: 10 }]}>
                    {/* Service thumbnail */}
                    <TouchableOpacity
                      onPress={() => pickAndUploadImageFor('service', item.id, () => loadExtras(vcardId))}
                      style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: COLORS.surface, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 22 }}>📷</Text>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      {item.service_url ? <Text style={styles.listItemSubtitle} numberOfLines={1}>{item.service_url}</Text> : null}
                      <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Tap photo to change image</Text>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity onPress={() => openModal('service', item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('service', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('service', {})}>
                <Text style={styles.addBtnText}>+ Add Service</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'service_cat' && (
            <View>
              <Text style={styles.tabHeading}>Service Categories</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 12 }}>Create a category, then add services (image + name) inside it. Shown as a carousel on your card.</Text>
              {extras.serviceCategories.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No categories yet. Create one below.</Text>
              ) : (
                extras.serviceCategories.map(cat => (
                  <View key={cat.id} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: COLORS.text }}>{cat.name}</Text>
                      <TouchableOpacity onPress={() => openModal('service_cat', cat)} style={[styles.actionBtn, { marginRight: 4 }]}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('service_cat', cat.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>

                    {(!cat.items || cat.items.length === 0) ? (
                      <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>No services yet.</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                        {cat.items.map(si => (
                          <View key={si.id} style={{ width: 90, position: 'relative' }}>
                            <TouchableOpacity onPress={() => openModal('service_item', { ...si, category_id: cat.id })}>
                              {si.image ? (
                                <Image source={{ uri: si.public_url || si.image }} style={{ width: 90, height: 90, borderRadius: 10 }} resizeMode="cover" />
                              ) : (
                                <View style={{ width: 90, height: 90, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>📷</Text></View>
                              )}
                              <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.text, marginTop: 4, textAlign: 'center' }}>{si.name}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => deleteExtraItem('service_item', si.id)}
                              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => openModal('service_item', { category_id: cat.id })}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary + '18', borderWidth: 1, borderColor: COLORS.primary + '40', borderStyle: 'dashed' }}
                    >
                      <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>+ Add Service</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('service_cat', {})}>
                <Text style={styles.addBtnText}>+ Create New Category</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'products' && (
            <View>
              <Text style={styles.tabHeading}>Manage Products</Text>
              {extras.products.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No products yet.</Text>
              ) : (
                extras.products.map(item => (
                  <View key={item.id} style={[styles.listItemCard, { alignItems: 'flex-start', gap: 10 }]}>
                    {/* Product thumbnail */}
                    <TouchableOpacity
                      onPress={() => pickAndUploadImageFor('product', item.id, () => loadExtras(vcardId))}
                      style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: COLORS.surface, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 22 }}>📷</Text>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>{item.currency} {item.price}</Text>
                      <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Tap photo to change image</Text>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity onPress={() => openModal('product', item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('product', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('product', {})}>
                <Text style={styles.addBtnText}>+ Add Product</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 9: GALLERIES */}
          {activeTab === 'galleries' && (
            <View>
              <Text style={styles.tabHeading}>Manage Galleries</Text>
              {extras.galleries.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No galleries yet. Create one below.</Text>
              ) : (
                extras.galleries.map(item => {
                  const imgs = galleryImages[item.id] || [];
                  const isUploading = uploadingGallery[item.id];
                  return (
                    <View key={item.id} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
                      {/* Gallery header */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: COLORS.text }}>{item.name}</Text>
                        <TouchableOpacity onPress={() => openModal('gallery', item)} style={[styles.actionBtn, { marginRight: 4 }]}><Text>✏️</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteExtraItem('gallery', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                      </View>

                      {/* Load images if not yet loaded */}
                      {!galleryImages[item.id] && (
                        <TouchableOpacity onPress={() => loadGalleryImages(item.id)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                          <Text style={{ color: COLORS.primary, fontSize: 13 }}>👁  View / Manage Photos</Text>
                        </TouchableOpacity>
                      )}

                      {/* Image grid */}
                      {galleryImages[item.id] && (
                        <>
                          {imgs.length === 0 ? (
                            <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>No photos yet.</Text>
                          ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                              {imgs.map(img => (
                                <View key={img.id} style={{ position: 'relative' }}>
                                  <Image
                                    source={{ uri: img.public_url || img.image_url }}
                                    style={{ width: 80, height: 80, borderRadius: 10 }}
                                    resizeMode="cover"
                                  />
                                  <TouchableOpacity
                                    onPress={() => deleteGalleryImage(img.id, item.id)}
                                    style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>×</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}
                          {/* Add Photo button */}
                          <TouchableOpacity
                            disabled={isUploading}
                            onPress={async () => {
                              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                              if (!perm.granted) { Alert.alert('Permission Required', 'Allow gallery access to choose photos.'); return; }
                              const res = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: false,
                                quality: 0.85,
                                allowsMultipleSelection: true,
                              });
                              if (res.canceled || !res.assets?.length) return;

                              setUploadingGallery(prev => ({ ...prev, [item.id]: true }));
                              for (const asset of res.assets) {
                                const fd = new FormData();
                                const filename = asset.uri.split('/').pop();
                                const match = /\.(\w+)$/.exec(filename || '');
                                fd.append('file', {
                                  uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
                                  name: filename,
                                  type: match ? `image/${match[1]}` : 'image/jpeg',
                                });
                                fd.append('vcard_id', String(vcardId));
                                fd.append('type', 'gallery');
                                fd.append('target_id', String(item.id));
                                await fetchApi('/api/uploads/image.php', { method: 'POST', body: fd });
                              }
                              setUploadingGallery(prev => ({ ...prev, [item.id]: false }));
                              loadGalleryImages(item.id);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary + '18', borderWidth: 1, borderColor: COLORS.primary + '40', borderStyle: 'dashed' }}
                          >
                            <Text style={{ fontSize: 16 }}>{isUploading ? '⏳' : '📷'}</Text>
                            <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>
                              {isUploading ? 'Uploading...' : '+ Add Photos from Gallery'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('gallery', {})}>
                <Text style={styles.addBtnText}>+ Create New Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 10: TESTIMONIALS */}
          {activeTab === 'testimonials' && (
            <View>
              <Text style={styles.tabHeading}>Manage Testimonials</Text>
              {extras.testimonials.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No testimonials yet.</Text>
              ) : (
                extras.testimonials.map(item => (
                  <View key={item.id} style={styles.listItemCard}>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>{item.rating} Stars</Text>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity onPress={() => openModal('testimonial', item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('testimonial', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('testimonial', {})}>
                <Text style={styles.addBtnText}>+ Add Testimonial</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 11: IFRAMES */}
          {activeTab === 'iframes' && (
            <View>
              <Text style={styles.tabHeading}>Manage Iframes</Text>
              {extras.iframes.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No iframes yet.</Text>
              ) : (
                extras.iframes.map(item => (
                  <View key={item.id} style={styles.listItemCard}>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>{item.url}</Text>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity onPress={() => openModal('iframe', item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('iframe', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('iframe', {})}>
                <Text style={styles.addBtnText}>+ Add Iframe</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 12: INSTAEMBED */}
          {activeTab === 'instaembed' && (
            <View>
              <Text style={styles.tabHeading}>Manage Instagram Embeds</Text>
              {extras.instagram.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No Instagram embeds yet.</Text>
              ) : (
                extras.instagram.map(item => (
                  <View key={item.id} style={styles.listItemCard}>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemTitle}>{item.type}</Text>
                      <Text style={styles.listItemSubtitle} numberOfLines={1}>{item.tag || item.embed_url}</Text>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity onPress={() => openModal('instaembed', item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('instaembed', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('instaembed', {})}>
                <Text style={styles.addBtnText}>+ Add Embed</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 13: DYNAMIC QR */}
          {activeTab === 'dynamic_qr' && (
            <View>
              <Text style={styles.tabHeading}>Manage Dynamic QRs</Text>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 15, textAlign: 'center' }}>
                Create smart QR codes whose destination links can be changed anytime.
              </Text>
              {!extras.dynamicQRs || extras.dynamicQRs.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginVertical: 20 }}>No dynamic QRs yet.</Text>
              ) : (
                extras.dynamicQRs.map(item => (
                  <View key={item.id} style={styles.listItemCard}>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>tapify.com/qr/{item.short_url}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                         <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>Scans: {item.total_scans || 0}</Text>
                         <Text style={{ fontSize: 12, color: item.status == 1 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                           {item.status == 1 ? 'Active' : 'Inactive'}
                         </Text>
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity onPress={() => openModal('dynamic_qr', item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteExtraItem('dynamic_qr', item.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openModal('dynamic_qr', { qr_type: 'website', status: 1 })}>
                <Text style={styles.addBtnText}>+ Create Dynamic QR</Text>
              </TouchableOpacity>
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

      {/* EXTRAS MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <View style={styles.extrasModalOverlay}>
            <View style={styles.modalCard}>
            <View style={styles.dobModalHeader}>
              <Text style={styles.dobModalTitle}>
                {modalData.id ? 'Edit' : 'Add'} {({ service_cat: 'Category', service_item: 'Service', dynamic_qr: 'Dynamic QR', instaembed: 'Insta Embed' }[modalType] || modalType)}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.dobModalDone}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {modalType === 'iframe' && (
                <>
                  <TextInputField
                    label="Google Maps / Embed URL"
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    value={modalData.url || ''}
                    onChangeText={v => setModalData({...modalData, url: v})}
                  />
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: -8, marginBottom: 12, lineHeight: 17 }}>
                    Tip: In Google Maps open Share → "Embed a map" and paste the link from the {'<iframe src="…">'} snippet. A normal map/share link is auto-converted, but the Embed link is most reliable.
                  </Text>
                </>
              )}
              
              {modalType === 'gallery' && (
                <TextInputField 
                  label="Gallery Name" 
                  value={modalData.name || ''} 
                  onChangeText={v => setModalData({...modalData, name: v})} 
                />
              )}

              {modalType === 'instaembed' && (
                <>
                  <SelectInput 
                    label="Type" 
                    value={modalData.type || 'post'} 
                    options={[{value:'post', label:'Post'}, {value:'reel', label:'Reel'}]}
                    onChange={v => setModalData({...modalData, type: v})}
                  />
                  <TextInputField 
                    label="Embed Tag (HTML or URL)" 
                    value={modalData.tag || ''} 
                    onChangeText={v => setModalData({...modalData, tag: v})} 
                    multiline={true} height={100}
                  />
                </>
              )}

              {modalType === 'testimonial' && (
                <>
                  <TextInputField label="Name" value={modalData.name || ''} onChangeText={v => setModalData({...modalData, name: v})} />
                  <TextInputField label="Designation" value={modalData.designation || ''} onChangeText={v => setModalData({...modalData, designation: v})} />
                  <TextInputField label="Company" value={modalData.company || ''} onChangeText={v => setModalData({...modalData, company: v})} />
                  <TextInputField label="Rating (1-5)" value={String(modalData.rating || '5')} onChangeText={v => setModalData({...modalData, rating: v})} />
                  <TextInputField label="Message" value={modalData.message || ''} onChangeText={v => setModalData({...modalData, message: v})} multiline={true} height={80} />
                </>
              )}

              {modalType === 'dynamic_qr' && (
                <>
                  <TextInputField 
                    label="QR Name" 
                    value={modalData.name || ''} 
                    onChangeText={v => setModalData({...modalData, name: v})} 
                    placeholder="e.g. My Campaign QR"
                  />
                  <TextInputField 
                    label="Destination URL" 
                    value={modalData.destination_url || ''} 
                    onChangeText={v => setModalData({...modalData, destination_url: v})} 
                    placeholder="https://google.com"
                  />
                  <SelectInput 
                    label="QR Type" 
                    value={modalData.qr_type || 'website'} 
                    onChange={v => setModalData({...modalData, qr_type: v})} 
                    options={[
                      { label: 'Website', value: 'website' },
                      { label: 'WhatsApp', value: 'whatsapp' },
                      { label: 'PDF', value: 'pdf' },
                      { label: 'Social Media', value: 'social' },
                    ]}
                  />
                  <SwitchInputField 
                    label="Active Status" 
                    value={modalData.status == 1} 
                    onValueChange={v => setModalData({...modalData, status: v ? 1 : 0})} 
                  />
                  <ColorInput 
                    label="Custom QR Color" 
                    value={modalData.custom_color || '#000000'} 
                    onChange={v => setModalData({...modalData, custom_color: v})} 
                  />
                  {modalData.short_url && (
                    <View style={{ alignItems: 'center', marginTop: 20, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 15, color: COLORS.primary }}>Live QR Preview</Text>
                      
                      <ViewShot ref={qrViewRef} options={{ format: 'jpg', quality: 1.0 }} style={{ backgroundColor: '#ffffff', padding: 20, alignItems: 'center', borderRadius: 12 }}>
                        <QRCode
                          value={`https://app.tapify.co.in/qr/${modalData.short_url}`}
                          size={150}
                          color={modalData.custom_color || '#000000'}
                        />
                        <Text style={{ marginTop: 15, fontSize: 16, color: '#000000', fontWeight: 'bold' }}>
                          {modalData.name || 'Scan Me'}
                        </Text>
                      </ViewShot>
                      
                      <TouchableOpacity 
                        style={{ marginTop: 15, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                        onPress={downloadQR}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>⬇️ Download QR</Text>
                      </TouchableOpacity>
                      <Text style={{ marginTop: 15, fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>tapify.com/qr/{modalData.short_url}</Text>
                    </View>
                  )}
                </>
              )}

              {modalType === 'gallery' && (
                <TextInputField 
                  label="Gallery Name" 
                  value={modalData.name || ''} 
                  onChangeText={v => setModalData({...modalData, name: v})} 
                />
              )}

              {modalType === 'service_cat' && (
                <TextInputField label="Category Name *" value={modalData.name || ''} onChangeText={v => setModalData({ ...modalData, name: v })} />
              )}

              {modalType === 'service_item' && (
                <>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Service Image</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!perm.granted) { Alert.alert('Permission Required', 'Allow gallery access to choose a photo.'); return; }
                      const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true, aspect: [1, 1], quality: 0.8,
                      });
                      if (!res.canceled && res.assets?.length) setPendingProductImage(res.assets[0].uri);
                    }}
                    style={{ width: '100%', height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}
                  >
                    {pendingProductImage || modalData.image ? (
                      <Image source={{ uri: pendingProductImage || modalData.public_url || modalData.image }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 28 }}>📷</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Tap to choose from gallery</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TextInputField label="Service Name *" value={modalData.name || ''} onChangeText={v => setModalData({ ...modalData, name: v })} />
                </>
              )}

              {modalType === 'service' && (
                <>
                  {/* Service Image Picker */}
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Service Image</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!perm.granted) { Alert.alert('Permission Required', 'Allow gallery access to choose a photo.'); return; }
                      const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true, aspect: [1, 1], quality: 0.8,
                      });
                      if (!res.canceled && res.assets?.length) setPendingProductImage(res.assets[0].uri);
                    }}
                    style={{ width: '100%', height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}
                  >
                    {pendingProductImage || modalData.image ? (
                      <Image
                        source={{ uri: pendingProductImage || modalData.image }}
                        style={{ width: '100%', height: '100%', borderRadius: 12 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 28 }}>📷</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Tap to choose from gallery</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TextInputField label="Service Name *" value={modalData.name || ''} onChangeText={v => setModalData({...modalData, name: v})} />
                  <TextInputField label="Service URL (optional)" value={modalData.service_url || ''} onChangeText={v => setModalData({...modalData, service_url: v})} />
                </>
              )}

              {modalType === 'product' && (
                <>
                  {/* Product Image Picker */}
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Product Image</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!perm.granted) { Alert.alert('Permission Required', 'Allow gallery access to choose a photo.'); return; }
                      const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true, aspect: [1, 1], quality: 0.8,
                      });
                      if (!res.canceled && res.assets?.length) setPendingProductImage(res.assets[0].uri);
                    }}
                    style={{ width: '100%', height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}
                  >
                    {pendingProductImage || modalData.image ? (
                      <Image
                        source={{ uri: pendingProductImage || modalData.image }}
                        style={{ width: '100%', height: '100%', borderRadius: 12 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 28 }}>📷</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Tap to choose from gallery</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TextInputField label="Product Name *" value={modalData.name || ''} onChangeText={v => setModalData({...modalData, name: v})} />
                  <TextInputField label="Price" value={String(modalData.price || '')} onChangeText={v => setModalData({...modalData, price: v})} keyboardType="numeric" />
                  <TextInputField label="Currency (e.g. $, ₹, INR)" value={modalData.currency || ''} onChangeText={v => setModalData({...modalData, currency: v})} />
                  <TextInputField label="Product URL" value={modalData.product_url || ''} onChangeText={v => setModalData({...modalData, product_url: v})} />
                  <TextInputField label="Description" value={modalData.description || ''} onChangeText={v => setModalData({...modalData, description: v})} multiline={true} height={80} />
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={saveExtraItem} disabled={saving}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
              <View style={{height:40}} />
            </ScrollView>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  tabSubheading: {
    fontSize: 12,
    color: '#888',
    marginBottom: 14,
    marginTop: -4,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    width: (width - 72 - 10) / 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(21,62,63,0.1)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  templateCardSelected: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  tplCover: {
    height: 36,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  tplCoverAccent: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.5,
  },
  tplActiveBadge: {
    position: 'absolute',
    top: 6,
    left: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tplActiveBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tplBody: {
    padding: 8,
    paddingTop: 0,
    alignItems: 'center',
    marginTop: -12,
  },
  tplAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 5,
  },
  tplLine: {
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
  },
  tplActionBar: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },
  tplFooter: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  templateNameSelected: {
    color: COLORS.primary,
  },
  tplPreviewBtn: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  tplPreviewBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tplPreviewBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
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
  extrasModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  listItemCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(21,62,63,0.1)',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listItemInfo: {
    flex: 1
  },
  listItemTitle: {
    fontWeight: '600',
    color: COLORS.primary,
    fontSize: 14,
    marginBottom: 2
  },
  listItemSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  listItemActions: {
    flexDirection: 'row'
  },
  actionBtn: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 6
  },
  addBtn: {
    backgroundColor: 'rgba(131,56,236,0.1)',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(131,56,236,0.3)',
    marginTop: 10
  },
  addBtnText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 14
  },
  modalCard: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  mobileMockupContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  mobileMockupFrame: {
    width: 210,
    height: 420,
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 8,
    borderColor: '#111',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  mobileNotch: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 80,
    height: 20,
    backgroundColor: '#111',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  mobileScreen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mobileScreenImage: {
    width: '100%',
    height: 1200, 
  },
  templatesCarousel: {
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  carouselItem: {
    width: 100,
    marginRight: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  carouselItemSelected: {
    backgroundColor: 'rgba(131,56,236,0.08)',
  },
  carouselImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  carouselActiveBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  carouselActiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  carouselName: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
  carouselNameSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  }
});
