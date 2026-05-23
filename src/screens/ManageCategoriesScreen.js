import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { fetchApi, API_BASE } from '../config';

export default function ManageCategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Category State
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState(null);
  const [creating, setCreating] = useState(false);

  // Detail View State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryContent, setCategoryContent] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Add Content State
  const [showAddContent, setShowAddContent] = useState(false);
  const [contentType, setContentType] = useState('text'); // 'text', 'image', 'mixed'
  const [textContent, setTextContent] = useState('');
  const [contentImage, setContentImage] = useState(null);
  const [addingContent, setAddingContent] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/categories/list.php');
      if (res.success && res.data) {
        setCategories(res.data.categories || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (setImage) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName || !newCatImage) {
      return Alert.alert('Error', 'Please provide a name and image');
    }
    
    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('name', newCatName);
      formData.append('image', {
        uri: newCatImage.uri,
        name: 'cat.jpg',
        type: 'image/jpeg'
      });

      const res = await fetchApi('/api/categories/create.php', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.success) {
        Alert.alert('Success', 'Category created!');
        setShowAddCategory(false);
        setNewCatName('');
        setNewCatImage(null);
        loadCategories();
      } else {
        Alert.alert('Error', res.message || 'Failed to create category');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating category');
    } finally {
      setCreating(false);
    }
  };

  const openCategory = async (cat) => {
    setSelectedCategory(cat);
    try {
      setLoadingContent(true);
      const res = await fetchApi(`/api/categories/content/list.php?category_id=${cat.id}`);
      if (res.success && res.data) {
        setCategoryContent(res.data.content || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load content');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleAddContent = async () => {
    if (contentType === 'text' && !textContent) return Alert.alert('Error', 'Text is required');
    if (contentType === 'image' && !contentImage) return Alert.alert('Error', 'Image is required');
    if (contentType === 'mixed' && (!textContent || !contentImage)) return Alert.alert('Error', 'Text and Image are required');

    try {
      setAddingContent(true);
      const formData = new FormData();
      formData.append('category_id', selectedCategory.id);
      formData.append('type', contentType);
      
      if (textContent) formData.append('text_content', textContent);
      if (contentImage) {
        formData.append('image', {
          uri: contentImage.uri,
          name: 'content.jpg',
          type: 'image/jpeg'
        });
      }

      const res = await fetchApi('/api/categories/content/add.php', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.success) {
        Alert.alert('Success', 'Content added!');
        setShowAddContent(false);
        setTextContent('');
        setContentImage(null);
        openCategory(selectedCategory); // Reload content
      } else {
        Alert.alert('Error', res.message || 'Failed to add content');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while adding content');
    } finally {
      setAddingContent(false);
    }
  };

  const getFullUrl = (path) => path ? `${API_BASE}${path}` : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCategory(true)}>
          <Text style={styles.addBtnText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Grid */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {categories.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.catCard} onPress={() => openCategory(cat)}>
              <Image source={{ uri: getFullUrl(cat.image_url) }} style={styles.catImage} />
              <View style={styles.catLabelBox}>
                <Text style={styles.catLabel}>{cat.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {categories.length === 0 && (
            <Text style={{ textAlign: 'center', width: '100%', marginTop: 20, color: COLORS.textMuted }}>No categories yet.</Text>
          )}
        </ScrollView>
      )}

      {/* Add Category Modal */}
      <Modal visible={showAddCategory} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Category</Text>
            
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setNewCatImage)}>
              {newCatImage ? (
                <Image source={{ uri: newCatImage.uri }} style={styles.pickedImage} />
              ) : (
                <Text style={styles.imagePickerText}>📷 Select Square Image</Text>
              )}
            </TouchableOpacity>

            <TextInput 
              style={styles.input} 
              placeholder="Category Name (e.g. Motivation)" 
              value={newCatName}
              onChangeText={setNewCatName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddCategory(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateCategory} disabled={creating}>
                <Text style={styles.submitBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Detail Modal (Manage Content) */}
      <Modal visible={!!selectedCategory} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%', width: '95%' }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={{ padding: 5 }}>
                <Text style={{ fontSize: 20, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingContent ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {categoryContent.length === 0 ? (
                  <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No content inside this category.</Text>
                ) : (
                  categoryContent.map(item => (
                    <GlassCard key={item.id} style={{ marginBottom: 15 }}>
                      {item.type !== 'text' && item.image_url && (
                        <Image source={{ uri: getFullUrl(item.image_url) }} style={styles.contentImage} />
                      )}
                      {item.type !== 'image' && item.text_content && (
                        <Text style={styles.contentText}>{item.text_content}</Text>
                      )}
                      <Text style={styles.contentMeta}>Type: {item.type.toUpperCase()}</Text>
                    </GlassCard>
                  ))
                )}
              </ScrollView>
            )}

            {/* Floating Options to Add Content */}
            {!showAddContent ? (
              <View style={styles.addContentRow}>
                <TouchableOpacity style={styles.actionPill} onPress={() => { setContentType('text'); setShowAddContent(true); }}>
                  <Text style={styles.actionPillText}>+ Text</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPill} onPress={() => { setContentType('image'); setShowAddContent(true); }}>
                  <Text style={styles.actionPillText}>+ Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPill} onPress={() => { setContentType('mixed'); setShowAddContent(true); }}>
                  <Text style={styles.actionPillText}>+ Both</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addContentForm}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Adding {contentType.toUpperCase()}</Text>
                
                {(contentType === 'image' || contentType === 'mixed') && (
                  <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setContentImage)}>
                    {contentImage ? (
                      <Image source={{ uri: contentImage.uri }} style={styles.pickedImage} />
                    ) : (
                      <Text style={styles.imagePickerText}>📷 Select Image</Text>
                    )}
                  </TouchableOpacity>
                )}

                {(contentType === 'text' || contentType === 'mixed') && (
                  <TextInput 
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                    placeholder="Enter text content..." 
                    multiline
                    value={textContent}
                    onChangeText={setTextContent}
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddContent(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleAddContent} disabled={addingContent}>
                    <Text style={styles.submitBtnText}>{addingContent ? 'Uploading...' : 'Upload'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
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
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  grid: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  catImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
  },
  catLabelBox: {
    padding: 12,
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 15,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 10,
    marginBottom: 15,
  },
  imagePicker: {
    width: '100%',
    height: 150,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  imagePickerText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  contentText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  contentMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  addContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionPill: {
    flex: 1,
    backgroundColor: COLORS.accent + '20',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionPillText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  addContentForm: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  }
});
