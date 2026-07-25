import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert, Dimensions, Image, Platform, Modal, Linking, Keyboard } from 'react-native';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi, API_BASE } from '../config';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const SWATCH_COLORS = ['#153e3f', '#25D366', '#d19a66', '#000000', '#3b5998', '#ef4444', '#ffffff', '#8e44ad', '#2980b9', '#f1c40f'];

// The only 8 themes offered for the web store (mirrors tapify-frontend/whatsapp-stores-edit.js).
// A store's data is shared across ALL templates — switching only changes the UI
// (the whatsapp_stores.template_id column), never the data.
const STORE_TEMPLATES = [
  { id: 'store_template_9', name: 'Ethereal Beauty' },
  { id: 'store_template_10', name: 'Prime Store' },
  { id: 'store_template_11', name: 'Mahejbani' },
  { id: 'store_template_12', name: 'Grocery Store' },
  { id: 'store_template_13', name: 'Cloth Store' },
  { id: 'store_template_14', name: 'Home Decor' },
  { id: 'store_template_15', name: 'The Royal Jewellers' },
  { id: 'store_template_16', name: 'Desi Miles Travel' },
];

// Legacy ids a store might still carry in the DB — mapped to their v2 equivalent
// so the picker highlights the right (only offered) card. The backend
// (webStore_templates/_store-theme-registry.php) aliases these the same way,
// so rendering is correct even before a resave normalizes the stored id.
const LEGACY_TEMPLATE_ALIASES = {
  store_template_1: 'store_template_9',
  store_template_2: 'store_template_10',
  store_template_3: 'store_template_11',
  store_template_4: 'store_template_12',
  store_template_5: 'store_template_13',
  store_template_6: 'store_template_14',
  store_template_7: 'store_template_15',
  store_template_8: 'store_template_16',
  whatsapp_store_default: 'store_template_10',
  webstore1: 'store_template_10',
  default: 'store_template_10',
};
const resolveTemplateId = (id) => {
  if (!id) return 'store_template_10';
  if (STORE_TEMPLATES.some(t => t.id === id)) return id;
  return LEGACY_TEMPLATE_ALIASES[id] || 'store_template_10';
};

const TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'branding', label: 'Branding' },
  { id: 'settings', label: 'Settings' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'templates', label: 'Templates' }
];

const THEME_MODES = ['light', 'dark', 'auto'];

const defaultFormData = {
  url_alias: '', store_name: '', owner_name: '', whatsapp_number: '',
  email: '', phone: '', address: '', location: '', location_url: '',
  tagline: '', description: '', currency: 'INR', currency_symbol: '₹',
  min_order_amount: '0', delivery_charge: '0', cod_available: false,
  show_search: true, show_categories: true, show_featured: true,
  order_message_template: '', primary_color: '#25D366', secondary_color: '#128C7E',
  // Template-independent branding / behaviour (matches whatsapp_stores columns)
  accent_color: '', text_color: '', font_family: '', theme_mode: 'light',
  enable_translate: true, enable_pwa: false, seo_title: '', seo_description: '',
  template_id: 'store_template_10'
};

// UI Components
const TextInputField = ({ label, value, onChangeText, placeholder = '', multiline = false, height = 48, keyboardType="default" }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea, { height }]}
      value={String(value || '')}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      keyboardType={keyboardType}
      placeholderTextColor={COLORS.textMuted}
    />
  </View>
);

const SwitchInputField = ({ label, value, onValueChange }) => (
  <View style={styles.switchGroup}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      value={!!value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e2e8f0', true: COLORS.primary }}
      thumbColor={value ? COLORS.accent : '#f4f3f4'}
    />
  </View>
);

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
            style={[styles.swatch, { backgroundColor: color }, value === color && styles.selectedSwatch]}
            onPress={() => onChange(color)}
          />
        ))}
      </View>
    </ScrollView>
  </View>
);

const SegmentField = ({ label, value, options, onChange }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.segmentRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.segment, value === opt && styles.segmentActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.segmentText, value === opt && styles.segmentTextActive]}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export default function WhatsappStoresScreen() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(defaultFormData);
  const [fetchingStore, setFetchingStore] = useState(false);
  const [saving, setSaving] = useState(false);

  // Entities State
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Modals State
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const [prodModalVisible, setProdModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState({ name: '', description: '', price: '', discount_price: '', category_id: '', sku: '', is_featured: false, in_stock: true });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    loadStores();
    
    // Add keyboard listeners to dynamically pad the bottom of the ScrollView
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

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/api/stores/list.php');
      if (response.success && response.data?.stores) {
        setStores(response.data.stores);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async (id, currentStatus) => {
    try {
      setStores(prev => prev.map(s => s.id === id ? { ...s, status: !currentStatus } : s));
      const response = await fetchApi('/api/stores/toggle-status.php', {
        method: 'POST',
        body: JSON.stringify({ id, status: !currentStatus })
      });
      if (!response.success) {
        setStores(prev => prev.map(s => s.id === id ? { ...s, status: currentStatus } : s));
      }
    } catch (error) {
      setStores(prev => prev.map(s => s.id === id ? { ...s, status: currentStatus } : s));
    }
  };

  const openEditor = async (store) => {
    setEditingStoreId(store.id);
    setActiveTab('basic');
    setFetchingStore(true);
    try {
      const response = await fetchApi(`/api/stores/get.php?id=${store.id}`);
      if (response.success && response.data?.store) {
        const loaded = response.data.store;
        setFormData({ ...defaultFormData, ...loaded, template_id: resolveTemplateId(loaded.template_id) });
      }
      // Load Categories, Products & Orders
      const catRes = await fetchApi(`/api/store-categories/list.php?store_id=${store.id}`);
      if (catRes.success) setCategories(catRes.data.categories || []);
      
      const prodRes = await fetchApi(`/api/store-products/list.php?store_id=${store.id}`);
      if (prodRes.success) setProducts(prodRes.data.products || []);

      const ordersRes = await fetchApi(`/api/store-orders/list.php?store_id=${store.id}`);
      if (ordersRes.success) setOrders(ordersRes.data.orders || []);

    } catch (error) {
      Alert.alert('Error', 'Failed to load store details');
      setEditingStoreId(null);
    } finally {
      setFetchingStore(false);
    }
  };

  const closeEditor = () => {
    setEditingStoreId(null);
    loadStores(); // refresh list to show updated counts/names
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...formData, id: editingStoreId };
      const response = await fetchApi('/api/stores/update.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (response.success) {
        Alert.alert('Success', 'Store configuration updated!');
      } else {
        Alert.alert('Error', response.message || 'Failed to update store');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update store');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'cover' ? [3, 1] : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(type, result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (type, uri) => {
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
      formDataUpload.append('store_id', String(editingStoreId));
      formDataUpload.append('type', type); // logo, cover, favicon
      
      const response = await fetchApi('/api/store-products/upload-image.php', {
        method: 'POST',
        body: formDataUpload,
      });
      
      if (response.success) {
        Alert.alert("Success", "Image uploaded successfully!");
        const fresh = await fetchApi(`/api/stores/get.php?id=${editingStoreId}`);
        if (fresh.success && fresh.data?.store) {
          setFormData({ ...formData, ...fresh.data.store, template_id: resolveTemplateId(fresh.data.store.template_id) });
        }
      } else {
        Alert.alert("Error", response.message || "Upload failed");
      }
    } catch (error) {
      Alert.alert("Error", "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadItemImage = async (type, targetId) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
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
        formDataUpload.append('store_id', String(editingStoreId));
        formDataUpload.append('type', type); // 'product' or 'category'
        formDataUpload.append('target_id', String(targetId));
        
        const response = await fetchApi('/api/store-products/upload-image.php', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (response.success) {
          Alert.alert("Success", "Image uploaded successfully!");
          if (type === 'product') {
            const prodRes = await fetchApi(`/api/store-products/list.php?store_id=${editingStoreId}`);
            if (prodRes.success) setProducts(prodRes.data.products || []);
          } else {
            const catRes = await fetchApi(`/api/store-categories/list.php?store_id=${editingStoreId}`);
            if (catRes.success) setCategories(catRes.data.categories || []);
          }
        } else {
          Alert.alert("Error", response.message || "Upload failed");
        }
        setSaving(false);
      }
    } catch (error) {
      setSaving(false);
      Alert.alert('Error', 'Failed to pick/upload image');
    }
  };

  // --- Category CRUD ---
  const saveCategory = async () => {
    try {
      setSaving(true);
      const res = await fetchApi('/api/store-categories/save.php', {
        method: 'POST',
        body: JSON.stringify({ ...catForm, store_id: editingStoreId, id: editingCategory?.id || 0 })
      });
      if (res.success) {
        setCatModalVisible(false);
        const catRes = await fetchApi(`/api/store-categories/list.php?store_id=${editingStoreId}`);
        if (catRes.success) setCategories(catRes.data.categories || []);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    Alert.alert('Confirm', 'Delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await fetchApi('/api/store-categories/delete.php', { method: 'POST', body: JSON.stringify({ id, store_id: editingStoreId }) });
        if (res.success) setCategories(categories.filter(c => c.id !== id));
      }}
    ]);
  };

  // --- Product CRUD ---
  const saveProduct = async () => {
    try {
      setSaving(true);
      const payload = { ...prodForm, store_id: editingStoreId, id: editingProduct?.id || 0 };
      const res = await fetchApi('/api/store-products/save.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        setProdModalVisible(false);
        const prodRes = await fetchApi(`/api/store-products/list.php?store_id=${editingStoreId}`);
        if (prodRes.success) setProducts(prodRes.data.products || []);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    Alert.alert('Confirm', 'Delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await fetchApi('/api/store-products/delete.php', { method: 'POST', body: JSON.stringify({ id, store_id: editingStoreId }) });
        if (res.success) setProducts(products.filter(p => p.id !== id));
      }}
    ]);
  };

  // --- Order Management ---
  const updateOrderStatus = async (id, status) => {
    try {
      const res = await fetchApi('/api/store-orders/update-status.php', {
        method: 'POST',
        body: JSON.stringify({ id, store_id: editingStoreId, status })
      });
      if (res.success) {
        setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const deleteOrder = async (id) => {
    Alert.alert('Confirm', 'Delete this order permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await fetchApi('/api/store-orders/delete.php', { method: 'POST', body: JSON.stringify({ id, store_id: editingStoreId }) });
        if (res.success) setOrders(orders.filter(o => o.id !== id));
      }}
    ]);
  };

  // --- Render Helpers ---
  const renderList = () => {
    if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Assigned WhatsApp Stores</Text>
        <Text style={styles.subtitle}>Select a store to launch the full configuration editor.</Text>
        {stores.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No stores found.</Text>
        ) : (
          stores.map((store) => (
            <GlassCard key={store.id} style={styles.card}>
              <View style={styles.header}>
                <View style={styles.storeMain}>
                  <Text style={styles.storeName}>{store.store_name}</Text>
                  <Text style={styles.storeAlias}>tapify.co/{store.url_alias}</Text>
                </View>
                <Switch 
                  value={store.status} 
                  onValueChange={() => toggleStoreStatus(store.id, store.status)}
                  trackColor={{ false: '#767577', true: COLORS.success }}
                  thumbColor={store.status ? COLORS.primary : '#f4f3f4'}
                />
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statCol}><Text style={styles.statLabel}>Views</Text><Text style={styles.statValue}>👁️ {store.view_count}</Text></View>
                <View style={styles.statCol}><Text style={styles.statLabel}>Orders</Text><Text style={styles.statValue}>📦 {store.order_count}</Text></View>
                <View style={styles.statCol}><Text style={styles.statLabel}>Phone</Text><Text style={styles.statValue}>📞 {store.whatsapp_number}</Text></View>
              </View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={[styles.editBtn, {flex: 1}]} onPress={() => openEditor(store)}>
                  <Text style={styles.editBtnText}>Open Full Editor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.liveBtn, {flex: 1}]} onPress={() => Linking.openURL(store.preview_url)}>
                  <Text style={styles.liveBtnText}>View Live Store</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    );
  };

  const renderEditor = () => {
    if (fetchingStore) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    return (
      <View style={styles.editorContainer}>
        {/* Editor Header */}
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={closeEditor} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.editorStoreName}>{formData.store_name}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(formData.preview_url)}>
              <Text style={styles.previewLink}>View Public Store</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.headerSaveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.headerSaveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.editorContent} contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight + 100 }}>
          
          {activeTab === 'basic' && (
            <GlassCard style={styles.tabCard}>
              <Text style={styles.tabTitle}>Basic Information</Text>
              <TextInputField label="Store Name *" value={formData.store_name} onChangeText={t => setFormData({...formData, store_name: t})} />
              <TextInputField label="URL Alias *" value={formData.url_alias} onChangeText={t => setFormData({...formData, url_alias: t})} />
              <TextInputField label="Owner Name" value={formData.owner_name} onChangeText={t => setFormData({...formData, owner_name: t})} />
              <TextInputField label="WhatsApp Number *" value={formData.whatsapp_number} onChangeText={t => setFormData({...formData, whatsapp_number: t})} keyboardType="phone-pad" />
              <TextInputField label="Tagline" value={formData.tagline} onChangeText={t => setFormData({...formData, tagline: t})} />
              <TextInputField label="Description" value={formData.description} onChangeText={t => setFormData({...formData, description: t})} multiline height={80} />
              <TextInputField label="Address" value={formData.address} onChangeText={t => setFormData({...formData, address: t})} multiline height={60} />
            </GlassCard>
          )}

          {activeTab === 'branding' && (
            <GlassCard style={styles.tabCard}>
              <Text style={styles.tabTitle}>Store Branding</Text>
              
              <Text style={styles.label}>Images</Text>
              <View style={styles.imageUploadGrid}>
                <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickAndUploadImage('logo')}>
                  {formData.logo_url ? <Image source={{uri: formData.logo_url}} style={styles.uploadPreview} /> : <Text style={styles.uploadIcon}>📷</Text>}
                  <Text style={styles.uploadLabel}>Logo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickAndUploadImage('cover')}>
                  {formData.cover_url ? <Image source={{uri: formData.cover_url}} style={styles.uploadPreview} /> : <Text style={styles.uploadIcon}>🖼️</Text>}
                  <Text style={styles.uploadLabel}>Cover</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Colors</Text>
              <ColorInput label="Primary Color" value={formData.primary_color} onChange={c => setFormData({...formData, primary_color: c})} />
              <ColorInput label="Secondary Color" value={formData.secondary_color} onChange={c => setFormData({...formData, secondary_color: c})} />
              <ColorInput label="Accent Color" value={formData.accent_color} onChange={c => setFormData({...formData, accent_color: c})} />
              <ColorInput label="Text Color" value={formData.text_color} onChange={c => setFormData({...formData, text_color: c})} />

              <SegmentField label="Theme Mode" value={formData.theme_mode || 'light'} options={THEME_MODES} onChange={v => setFormData({...formData, theme_mode: v})} />
              <TextInputField label="Font Family (optional)" value={formData.font_family} onChangeText={t => setFormData({...formData, font_family: t})} placeholder="e.g. Poppins" />
              <Text style={styles.helperText}>Leave colors/font blank to use each template's own design defaults.</Text>
            </GlassCard>
          )}

          {activeTab === 'settings' && (
            <GlassCard style={styles.tabCard}>
              <Text style={styles.tabTitle}>Store Settings</Text>
              <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex:1}}><TextInputField label="Currency" value={formData.currency} onChangeText={t => setFormData({...formData, currency: t})} /></View>
                <View style={{flex:1}}><TextInputField label="Symbol" value={formData.currency_symbol} onChangeText={t => setFormData({...formData, currency_symbol: t})} /></View>
              </View>
              <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex:1}}><TextInputField label="Min Order" value={String(formData.min_order_amount)} onChangeText={t => setFormData({...formData, min_order_amount: t})} keyboardType="numeric" /></View>
                <View style={{flex:1}}><TextInputField label="Delivery Charge" value={String(formData.delivery_charge)} onChangeText={t => setFormData({...formData, delivery_charge: t})} keyboardType="numeric" /></View>
              </View>
              
              <SwitchInputField label="Cash on Delivery (COD)" value={formData.cod_available} onValueChange={v => setFormData({...formData, cod_available: v})} />
              <SwitchInputField label="Show Search Bar" value={formData.show_search} onValueChange={v => setFormData({...formData, show_search: v})} />
              <SwitchInputField label="Show Category Filter" value={formData.show_categories} onValueChange={v => setFormData({...formData, show_categories: v})} />
              <SwitchInputField label="Highlight Featured Products" value={formData.show_featured} onValueChange={v => setFormData({...formData, show_featured: v})} />
              <SwitchInputField label="Language Translate Widget" value={formData.enable_translate} onValueChange={v => setFormData({...formData, enable_translate: v})} />
              <SwitchInputField label="Install as App (PWA)" value={formData.enable_pwa} onValueChange={v => setFormData({...formData, enable_pwa: v})} />

              <TextInputField label="WhatsApp Order Message Template" value={formData.order_message_template} onChangeText={t => setFormData({...formData, order_message_template: t})} multiline height={100} />

              <Text style={[styles.label, {marginTop: 6}]}>SEO</Text>
              <TextInputField label="SEO Title" value={formData.seo_title} onChangeText={t => setFormData({...formData, seo_title: t})} placeholder="Shown in the browser tab / search results" />
              <TextInputField label="SEO Description" value={formData.seo_description} onChangeText={t => setFormData({...formData, seo_description: t})} multiline height={80} />
            </GlassCard>
          )}

          {activeTab === 'categories' && (
            <View>
              <View style={styles.listHeader}>
                <Text style={styles.tabTitle}>Categories</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingCategory(null); setCatForm({name:'', description:''}); setCatModalVisible(true); }}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {categories.length === 0 ? <Text style={styles.emptyText}>No categories found.</Text> : categories.map(cat => (
                <GlassCard key={cat.id} style={styles.listItem}>
                  <View style={{flex:1}}>
                    <Text style={styles.listItemTitle}>{cat.name}</Text>
                    <Text style={styles.listItemSub}>{cat.description || 'No description'}</Text>
                  </View>
                  <View style={styles.listActions}>
                    <TouchableOpacity onPress={() => pickAndUploadItemImage('category', cat.id)}><Text style={styles.actionEdit}>📷</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingCategory(cat); setCatForm({name: cat.name, description: cat.description}); setCatModalVisible(true); }}><Text style={styles.actionEdit}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteCategory(cat.id)}><Text style={styles.actionDel}>🗑️</Text></TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {activeTab === 'products' && (
            <View>
              <View style={styles.listHeader}>
                <Text style={styles.tabTitle}>Products</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingProduct(null); setProdForm({name:'', description:'', price:'', category_id:'', sku:'', is_featured:false, in_stock:true}); setProdModalVisible(true); }}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {products.length === 0 ? <Text style={styles.emptyText}>No products found.</Text> : products.map(prod => (
                <GlassCard key={prod.id} style={styles.listItem}>
                  <View style={{flex:1}}>
                    <Text style={styles.listItemTitle}>{prod.name} {prod.is_featured ? '⭐' : ''}</Text>
                    <Text style={styles.listItemSub}>{formData.currency_symbol}{prod.price} • {categories.find(c=>c.id===prod.category_id)?.name || 'Uncategorized'}</Text>
                  </View>
                  <View style={styles.listActions}>
                    <TouchableOpacity onPress={() => pickAndUploadItemImage('product', prod.id)}><Text style={styles.actionEdit}>📷</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingProduct(prod); setProdForm({name:prod.name, description:prod.description, price:String(prod.price), discount_price:prod.discount_price?String(prod.discount_price):'', category_id:prod.category_id?String(prod.category_id):'', sku:prod.sku||'', is_featured:!!prod.is_featured, in_stock:!!prod.in_stock}); setProdModalVisible(true); }}><Text style={styles.actionEdit}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteProduct(prod.id)}><Text style={styles.actionDel}>🗑️</Text></TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {activeTab === 'orders' && (
            <View>
              <View style={styles.listHeader}>
                <Text style={styles.tabTitle}>Orders</Text>
              </View>
              {orders.length === 0 ? <Text style={styles.emptyText}>No orders received yet.</Text> : orders.map(order => (
                <GlassCard key={order.id} style={styles.listItem}>
                  <View style={{flex:1}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <Text style={styles.listItemTitle}>{order.customer_name}</Text>
                      <Text style={[styles.listItemSub, {fontWeight: '700', color: COLORS.primary}]}>{formData.currency_symbol}{order.total_amount}</Text>
                    </View>
                    <Text style={styles.listItemSub}>{order.customer_phone}</Text>
                    <Text style={[styles.listItemSub, {marginTop: 4}]}>{Array.isArray(order.items) ? order.items.map(i => `${i.qty}x ${i.name}`).join(', ') : 'Items info not available'}</Text>
                    <View style={{flexDirection: 'row', marginTop: 8, gap: 10}}>
                      <TouchableOpacity onPress={() => updateOrderStatus(order.id, 'pending')} style={[styles.statusBadge, order.status === 'pending' && styles.statusActive]}><Text style={styles.statusText}>Pending</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => updateOrderStatus(order.id, 'confirmed')} style={[styles.statusBadge, order.status === 'confirmed' && styles.statusActive]}><Text style={styles.statusText}>Confirmed</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => updateOrderStatus(order.id, 'delivered')} style={[styles.statusBadge, order.status === 'delivered' && styles.statusActive]}><Text style={styles.statusText}>Delivered</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.listActions}>
                    <TouchableOpacity onPress={() => deleteOrder(order.id)}><Text style={styles.actionDel}>🗑️</Text></TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {activeTab === 'templates' && (
            <GlassCard style={styles.tabCard}>
              <Text style={styles.tabTitle}>Store Templates</Text>
              <View style={styles.templateGrid}>
                {STORE_TEMPLATES.map(tmpl => (
                  <TouchableOpacity 
                    key={tmpl.id} 
                    style={styles.templateCard}
                    onPress={() => setFormData({...formData, template_id: tmpl.id})}
                  >
                    <View style={[styles.templatePreview, formData.template_id === tmpl.id && {borderColor: COLORS.primary, backgroundColor: '#f0fdf4'}]}>
                      <Text style={{fontSize:30}}>📱</Text>
                    </View>
                    <Text style={[styles.templateName, formData.template_id === tmpl.id && {color: COLORS.primary}]}>{tmpl.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          )}

        </ScrollView>

        {/* Modals */}
        <Modal visible={catModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'Add Category'}</Text>
              <TextInputField label="Name *" value={catForm.name} onChangeText={t => setCatForm({...catForm, name: t})} />
              <TextInputField label="Description" value={catForm.description} onChangeText={t => setCatForm({...catForm, description: t})} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setCatModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={saveCategory} disabled={saving}><Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={prodModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add Product'}</Text>
                <TextInputField label="Name *" value={prodForm.name} onChangeText={t => setProdForm({...prodForm, name: t})} />
                
                <Text style={styles.label}>Category</Text>
                <View style={styles.pickerWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.catChip, prodForm.category_id === '' && styles.catChipActive]} onPress={() => setProdForm({...prodForm, category_id: ''})}>
                      <Text style={[styles.catChipText, prodForm.category_id === '' && {color:'#fff'}]}>None</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                      <TouchableOpacity key={c.id} style={[styles.catChip, prodForm.category_id === String(c.id) && styles.catChipActive]} onPress={() => setProdForm({...prodForm, category_id: String(c.id)})}>
                        <Text style={[styles.catChipText, prodForm.category_id === String(c.id) && {color:'#fff'}]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{flexDirection:'row', gap:10, marginTop:10}}>
                  <View style={{flex:1}}><TextInputField label="Price *" value={prodForm.price} onChangeText={t => setProdForm({...prodForm, price: t})} keyboardType="numeric" /></View>
                  <View style={{flex:1}}><TextInputField label="Discount Price" value={prodForm.discount_price} onChangeText={t => setProdForm({...prodForm, discount_price: t})} keyboardType="numeric" /></View>
                </View>
                
                <TextInputField label="SKU" value={prodForm.sku} onChangeText={t => setProdForm({...prodForm, sku: t})} />
                <TextInputField label="Description" value={prodForm.description} onChangeText={t => setProdForm({...prodForm, description: t})} multiline height={60} />
                
                <SwitchInputField label="Featured Product (⭐)" value={prodForm.is_featured} onValueChange={v => setProdForm({...prodForm, is_featured: v})} />
                <SwitchInputField label="In Stock" value={prodForm.in_stock} onValueChange={v => setProdForm({...prodForm, in_stock: v})} />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setProdModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.modalSave} onPress={saveProduct} disabled={saving}><Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    );
  };

  return editingStoreId ? renderEditor() : renderList();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  card: { marginBottom: 16, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  storeMain: { flex: 1, paddingRight: 10 },
  storeName: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  storeAlias: { fontSize: 12, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(21, 62, 63, 0.04)', borderRadius: 8, padding: 12, marginBottom: 16 },
  statCol: { alignItems: 'flex-start' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  editBtn: { borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  editBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  liveBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  liveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  
  // Editor Styles
  editorContainer: { flex: 1, backgroundColor: COLORS.background },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { padding: 8, marginLeft: -8 },
  backBtnText: { color: COLORS.textMuted, fontWeight: '600' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  editorStoreName: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  previewLink: { fontSize: 11, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  headerSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  headerSaveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  
  tabBarWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tabBar: { paddingHorizontal: 15 },
  tabItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabItem: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeTabText: { color: COLORS.primary },
  
  editorContent: { flex: 1 },
  tabCard: { padding: 20, marginBottom: 20 },
  tabTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 20 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 14, color: COLORS.text, fontSize: 14 },
  textArea: { paddingTop: 12, textAlignVertical: 'top' },
  helperText: { fontSize: 12, color: COLORS.textMuted, marginTop: -4, marginBottom: 8 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: 'center' },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  segmentTextActive: { color: '#ffffff' },
  
  switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  
  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  colorInput: { flex: 1, marginRight: 10 },
  colorPreview: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  paletteScroll: { flexGrow: 0 },
  paletteRow: { flexDirection: 'row', paddingBottom: 5 },
  swatch: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  selectedSwatch: { borderColor: COLORS.primary },
  
  imageUploadGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  imageUploadBox: { flex: 1, aspectRatio: 1, backgroundColor: '#f9fafb', borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadIcon: { fontSize: 24, marginBottom: 8 },
  uploadLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  uploadPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  listItem: { padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listItemTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  listItemSub: { fontSize: 12, color: COLORS.textMuted },
  listActions: { flexDirection: 'row', gap: 15 },
  actionEdit: { fontSize: 18 },
  actionDel: { fontSize: 18 },
  
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  templateCard: { width: '48%', marginBottom: 15, alignItems: 'center' },
  templatePreview: { width: '100%', aspectRatio: 0.7, backgroundColor: '#f9fafb', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  templateCardSelected: { borderColor: COLORS.primary },
  templateName: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  modalCancel: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '600' },
  modalSave: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  
  pickerWrapper: { marginBottom: 15 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 20, marginRight: 10 },
  catChipActive: { backgroundColor: COLORS.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
});
