import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  PanResponder,
  Animated,
  Switch,
  Alert
} from 'react-native';
import { fetchApi } from '../config';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width - 32;

const DraggableElement = ({ x, y, onDragStart, onDragEnd, onPress, children, disabled }) => {
  const pan = useRef(new Animated.ValueXY({ x, y })).current;

  useEffect(() => {
    pan.setValue({ x, y });
  }, [x, y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        if (onDragStart) onDragStart();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        if (onDragEnd) onDragEnd(pan.x._value, pan.y._value);
        
        // Detect a tap if the drag distance is very small
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (onPress) onPress();
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        if (onDragEnd) onDragEnd(pan.x._value, pan.y._value);
      }
    })
  ).current;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: pan.x,
        top: pan.y,
        zIndex: 10,
      }}
      {...(disabled ? {} : panResponder.panHandlers)}
    >
      {children}
    </Animated.View>
  );
};


export default function DesignCustomizeScreen() {
  const { params, user, navigate } = useNavigation();
  const design = params?.design;

  // --- State ---
  const initialLogoUrl = user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `https://app.tapify.co.in${user.avatar}`) : null;
  const viewRef = useRef(null);
  const [logo, setLogo] = useState({
    url: initialLogoUrl,
    size: 60,
    shape: 'circle',
    visible: true,
    x: IMAGE_SIZE - 76,
    y: 16,
  });

  const [contactBar, setContactBar] = useState({
    phone: user?.phone || '+91 0000000000',
    website: user?.email || 'www.tapify.com',
    bgColor: 'rgba(0,0,0,0.7)',
    textColor: '#ffffff',
    fontSize: 13,
    visible: true,
  });

  const [customTexts, setCustomTexts] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const [activeTab, setActiveTab] = useState('logo');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [includeWebsiteLink, setIncludeWebsiteLink] = useState(false);
  const [websiteLink, setWebsiteLink] = useState(null);

  useEffect(() => {
    const fetchWebsiteLink = async () => {
      try {
        // Prefer the website-builder site link (a published site); fall back to
        // the vCard link when the user has no live website yet.
        const sitesRes = await fetchApi('/api/sites/list.php');
        const sites = sitesRes.data?.sites || [];
        const site = sites.find((s) => s.published_at);   // list is newest-first
        if (site?.slug) {
          setWebsiteLink(`https://${site.slug}.tapify.co.in`);
          return;
        }
        const meRes = await fetchApi('/api/me.php');
        if (meRes.success && meRes.data?.vcard?.url_alias) {
          setWebsiteLink(`https://app.tapify.co.in/${meRes.data.vcard.url_alias}`);
        }
      } catch (error) {
        console.log('Failed to fetch website link:', error);
      }
    };
    fetchWebsiteLink();
  }, []);

  useEffect(() => {
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

  if (!design) {
    return (
      <View style={styles.center}>
        <Text>No design selected.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigate('my-designs', {
          returnToTab: params?.returnToTab,
          returnToCategory: params?.returnToCategory,
          returnToGlobalCategory: params?.returnToGlobalCategory
        })}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Handlers ---
  const handlePickLogo = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogo(prev => ({ ...prev, url: result.assets[0].uri, visible: true }));
      }
    } catch (e) {
      alert("Please ensure expo-image-picker is installed.");
    }
  };



  const addCustomText = () => {
    const newText = {
      id: Date.now().toString(),
      text: 'New Text',
      color: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textStyle: 'none',
      borderColor: '#ffffff',
      x: IMAGE_SIZE / 2 - 40,
      y: IMAGE_SIZE / 2 - 15,
    };
    setCustomTexts([...customTexts, newText]);
    setActiveTextId(newText.id);
    setActiveTab('text');
  };

  const updateCustomText = (id, field, value) => {
    setCustomTexts(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };



  const deleteCustomText = (id) => {
    setCustomTexts(prev => prev.filter(t => t.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const handleShare = async () => {
    try {
      setActiveTextId(null);
      // Wait for selection UI to clear before capturing
      await new Promise(r => setTimeout(r, 150));

      // Capture the design image
      if (!viewRef.current) {
        Alert.alert('Error', 'Could not capture design. Please try again.');
        return;
      }
      const uri = await viewRef.current.capture();

      const hasLink = includeWebsiteLink && websiteLink;
      const message = hasLink
        ? `Check out my design from Tapify!\n\nView my website: ${websiteLink}`
        : 'Check out my design from Tapify!';

      // One share sheet: the image file AND the message (profile link) go out
      // together. react-native-share builds a single share intent (EXTRA_STREAM +
      // EXTRA_TEXT on Android; a file + text activity item on iOS), so WhatsApp
      // & co. receive the image with a tappable link caption in one step —
      // no more "image first, then a second sheet for the link".
      await Share.open({
        title: 'Share Design',
        message,
        url: uri,
        type: 'image/jpeg',
      });
    } catch (e) {
      // Don't show an error if the user simply dismissed the share sheet
      const msg = e?.message || '';
      if (
        !msg.toLowerCase().includes('cancel') &&
        msg !== 'User did not share' &&
        !msg.toLowerCase().includes('dismiss')
      ) {
        Alert.alert('Could Not Share', 'Something went wrong. Try downloading the design instead.');
      }
    }
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission required to save images to your gallery.');
        return;
      }
      setActiveTextId(null);
      await new Promise(r => setTimeout(r, 100)); // allow state to clear selection UI
      const uri = await viewRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      alert('Success! Design saved to your gallery.');
    } catch (e) {
      alert('Error saving: ' + e.message);
    }
  };

  const presetColors = ['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', 'rgba(0,0,0,0.7)', 'rgba(255,255,255,0.7)'];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* --- BACK BUTTON --- */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('my-designs', {
          returnToTab: params?.returnToTab,
          returnToCategory: params?.returnToCategory,
          returnToGlobalCategory: params?.returnToGlobalCategory
        })} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* --- LIVE PREVIEW CANVAS --- */}
        <View style={styles.previewContainer}>
          <ViewShot ref={viewRef} options={{ format: 'jpg', quality: 1.0 }} style={styles.viewShotContainer}>
            <View style={styles.imageContentWrapper}>
              <Image source={{ uri: design.image_url }} style={styles.baseImage} />
            
            {/* Logo */}
            {logo.visible && (
              <DraggableElement 
                x={logo.x} 
                y={logo.y} 
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={(nx, ny) => {
                  setScrollEnabled(true);
                  setLogo(p => ({ ...p, x: nx, y: ny }));
                }}
              >
                <View style={[
                  styles.logoContainer, 
                  { 
                    position: 'relative',
                    left: undefined,
                    top: undefined,
                    width: logo.shape === 'rectangle' ? logo.size * 2 : logo.size, 
                    height: logo.size, 
                    borderRadius: logo.shape === 'circle' ? logo.size / 2 : (logo.shape === 'rectangle' ? 0 : 8)
                  }
                ]}>
                {logo.url ? (
                  <Image source={{ uri: logo.url }} style={styles.logoImage} />
                ) : (
                  <View style={styles.placeholderLogo}>
                    <Text style={[styles.placeholderLogoText, { fontSize: logo.size * 0.4 }]}>
                      {user?.name?.charAt(0) || 'T'}
                    </Text>
                  </View>
                )}
                </View>
              </DraggableElement>
            )}

            {/* Custom Texts */}
            {customTexts.map((item) => (
              <DraggableElement
                key={item.id}
                x={item.x}
                y={item.y}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={(nx, ny) => {
                  setScrollEnabled(true);
                  setCustomTexts(prev => prev.map(t => t.id === item.id ? { ...t, x: nx, y: ny } : t));
                }}
                onPress={() => { setActiveTextId(item.id); setActiveTab('text'); }}
              >
                <View 
                  style={[
                    styles.customTextWrapper, 
                    { position: 'relative', left: undefined, top: undefined },
                    activeTextId === item.id && styles.customTextActive,
                    item.textStyle === 'border' && { borderWidth: 2, borderColor: item.borderColor || '#fff', borderRadius: 4 },
                    item.textStyle === 'underline' && { borderBottomWidth: 2, borderBottomColor: item.borderColor || '#fff', borderRadius: 0 }
                  ]}
                >
                  <Text style={{ color: item.color, fontSize: item.fontSize, fontWeight: item.fontWeight }}>
                    {item.text}
                  </Text>
                </View>
              </DraggableElement>
            ))}

            </View>

            {/* Bottom Info Bar */}
            {contactBar.visible && (
              <View style={[styles.bottomInfoBar, { backgroundColor: contactBar.bgColor }]}>
                <Text style={[styles.infoText, { color: contactBar.textColor, fontSize: contactBar.fontSize }]}>{contactBar.phone}</Text>
                {contactBar.phone && contactBar.website && (
                  <Text style={[styles.infoText, { color: contactBar.textColor, fontSize: contactBar.fontSize, marginHorizontal: 8 }]}>•</Text>
                )}
                <Text style={[styles.infoText, { color: contactBar.textColor, fontSize: contactBar.fontSize }]}>{contactBar.website}</Text>
              </View>
            )}
          </ViewShot>
        </View>

        {/* --- TOOLS PANEL --- */}
        <View style={styles.toolsContainer}>
          <View style={styles.tabRow}>
            {['logo', 'bar', 'text'].map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'logo' ? '🖼️ Logo' : tab === 'bar' ? '📱 Details' : '✍️ Text'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toolBody}>
            {/* LOGO TOOLS */}
            {activeTab === 'logo' && (
              <View style={styles.toolSection}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Show Logo</Text>
                  <TouchableOpacity onPress={() => setLogo(p => ({ ...p, visible: !p.visible }))} style={styles.toggleBtn}>
                    <Text>{logo.visible ? '✅ ON' : '❌ OFF'}</Text>
                  </TouchableOpacity>
                </View>

                {logo.visible && (
                  <>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickLogo}>
                      <Text style={styles.uploadBtnText}>📤 Upload Custom Logo</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Shape</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.shapeBtn, logo.shape === 'circle' && styles.shapeBtnActive]} onPress={() => setLogo(p => ({ ...p, shape: 'circle' }))}>
                        <Text style={logo.shape === 'circle' ? styles.activeText : {}}>⭕ Circle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.shapeBtn, logo.shape === 'square' && styles.shapeBtnActive]} onPress={() => setLogo(p => ({ ...p, shape: 'square' }))}>
                        <Text style={logo.shape === 'square' ? styles.activeText : {}}>⬜ Square</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.shapeBtn, logo.shape === 'rectangle' && styles.shapeBtnActive]} onPress={() => setLogo(p => ({ ...p, shape: 'rectangle' }))}>
                        <Text style={logo.shape === 'rectangle' ? styles.activeText : {}}>▭ Rectangle</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Size</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setLogo(p => ({ ...p, size: Math.max(30, p.size - 5) }))}>
                        <Text style={{ fontSize: 20 }}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${(logo.size / 150) * 100}%` }]} /></View>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setLogo(p => ({ ...p, size: Math.min(150, p.size + 5) }))}>
                        <Text style={{ fontSize: 20 }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* DETAILS / BAR TOOLS */}
            {activeTab === 'bar' && (
              <View style={styles.toolSection}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Show Details Bar</Text>
                  <TouchableOpacity onPress={() => setContactBar(p => ({ ...p, visible: !p.visible }))} style={styles.toggleBtn}>
                    <Text>{contactBar.visible ? '✅ ON' : '❌ OFF'}</Text>
                  </TouchableOpacity>
                </View>

                {contactBar.visible && (
                  <>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput style={styles.input} value={contactBar.phone} onChangeText={t => setContactBar(p => ({ ...p, phone: t }))} placeholder="Enter phone" />

                    <Text style={styles.label}>Website / Email</Text>
                    <TextInput style={styles.input} value={contactBar.website} onChangeText={t => setContactBar(p => ({ ...p, website: t }))} placeholder="Enter website" />

                    <Text style={styles.label}>Font Size</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setContactBar(p => ({ ...p, fontSize: Math.max(10, p.fontSize - 1) }))}>
                        <Text style={{ fontSize: 20 }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 16, fontWeight: 'bold' }}>{contactBar.fontSize}px</Text>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setContactBar(p => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))}>
                        <Text style={{ fontSize: 20 }}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Background Color</Text>
                    <View style={styles.colorRow}>
                      {presetColors.map(c => (
                        <TouchableOpacity key={c} onPress={() => setContactBar(p => ({ ...p, bgColor: c }))}>
                          <View style={[styles.colorSwatch, { backgroundColor: c }, contactBar.bgColor === c && styles.colorSwatchActive]} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Text Color</Text>
                    <View style={styles.colorRow}>
                      {presetColors.map(c => (
                        <TouchableOpacity key={c} onPress={() => setContactBar(p => ({ ...p, textColor: c }))}>
                          <View style={[styles.colorSwatch, { backgroundColor: c }, contactBar.textColor === c && styles.colorSwatchActive]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* CUSTOM TEXT TOOLS */}
            {activeTab === 'text' && (
              <View style={styles.toolSection}>
                <TouchableOpacity style={styles.addTextBtn} onPress={addCustomText}>
                  <Text style={styles.addTextBtnLabel}>➕ Add Custom Text</Text>
                </TouchableOpacity>

                {customTexts.length === 0 ? (
                  <Text style={styles.helpText}>No custom text added yet.</Text>
                ) : (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                      {customTexts.map(t => (
                        <TouchableOpacity key={t.id} style={[styles.textChip, activeTextId === t.id && styles.textChipActive]} onPress={() => setActiveTextId(t.id)}>
                          <Text style={activeTextId === t.id ? { color: '#fff', fontWeight: 'bold' } : {}}>{t.text.substring(0, 10) || 'Empty'}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {activeTextId && (
                      <View style={styles.activeTextEditor}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.label}>Edit Text</Text>
                          <TouchableOpacity onPress={() => deleteCustomText(activeTextId)}>
                            <Text style={{ color: COLORS.error, fontWeight: 'bold' }}>🗑️ Delete</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <TextInput 
                          style={styles.input} 
                          value={customTexts.find(t => t.id === activeTextId)?.text || ''} 
                          onChangeText={val => updateCustomText(activeTextId, 'text', val)} 
                        />

                        <Text style={styles.label}>Font Size</Text>
                        <View style={styles.row}>
                          <TouchableOpacity style={styles.iconBtn} onPress={() => {
                            const cur = customTexts.find(t => t.id === activeTextId)?.fontSize || 20;
                            updateCustomText(activeTextId, 'fontSize', Math.max(10, cur - 2));
                          }}>
                            <Text style={{ fontSize: 20 }}>-</Text>
                          </TouchableOpacity>
                          <Text style={{ marginHorizontal: 16, fontWeight: 'bold' }}>{customTexts.find(t => t.id === activeTextId)?.fontSize}px</Text>
                          <TouchableOpacity style={styles.iconBtn} onPress={() => {
                            const cur = customTexts.find(t => t.id === activeTextId)?.fontSize || 20;
                            updateCustomText(activeTextId, 'fontSize', Math.min(80, cur + 2));
                          }}>
                            <Text style={{ fontSize: 20 }}>+</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Style (Border / Underline)</Text>
                        <View style={styles.row}>
                          <TouchableOpacity 
                            style={[styles.shapeBtn, customTexts.find(t => t.id === activeTextId)?.textStyle === 'none' && styles.shapeBtnActive]} 
                            onPress={() => updateCustomText(activeTextId, 'textStyle', 'none')}
                          >
                            <Text style={customTexts.find(t => t.id === activeTextId)?.textStyle === 'none' ? styles.activeText : {}}>None</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.shapeBtn, customTexts.find(t => t.id === activeTextId)?.textStyle === 'border' && styles.shapeBtnActive]} 
                            onPress={() => updateCustomText(activeTextId, 'textStyle', 'border')}
                          >
                            <Text style={customTexts.find(t => t.id === activeTextId)?.textStyle === 'border' ? styles.activeText : {}}>Border</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.shapeBtn, customTexts.find(t => t.id === activeTextId)?.textStyle === 'underline' && styles.shapeBtnActive]} 
                            onPress={() => updateCustomText(activeTextId, 'textStyle', 'underline')}
                          >
                            <Text style={customTexts.find(t => t.id === activeTextId)?.textStyle === 'underline' ? styles.activeText : {}}>Underline</Text>
                          </TouchableOpacity>
                        </View>

                        {(customTexts.find(t => t.id === activeTextId)?.textStyle === 'border' || customTexts.find(t => t.id === activeTextId)?.textStyle === 'underline') && (
                          <>
                            <Text style={styles.label}>Border / Underline Color</Text>
                            <View style={styles.colorRow}>
                              {presetColors.map(c => (
                                <TouchableOpacity 
                                  key={c} 
                                  style={[styles.colorSwatch, { backgroundColor: c }, customTexts.find(t => t.id === activeTextId)?.borderColor === c && styles.colorSwatchActive]}
                                  onPress={() => updateCustomText(activeTextId, 'borderColor', c)}
                                />
                              ))}
                            </View>
                          </>
                        )}

                        <Text style={styles.label}>Text Color</Text>
                        <View style={styles.colorRow}>
                          {presetColors.map(c => (
                            <TouchableOpacity key={c} onPress={() => updateCustomText(activeTextId, 'color', c)}>
                              <View style={[styles.colorSwatch, { backgroundColor: c }, customTexts.find(t => t.id === activeTextId)?.color === c && styles.colorSwatchActive]} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

          </View>
        </View>

        {/* --- ACTIONS --- */}
        <View style={styles.actionsContainer}>
          <Text style={styles.helpText}>Download saves to your gallery. Share sends to WhatsApp/Socials.</Text>
          
          {websiteLink && (
            <View style={styles.websiteLinkToggleRow}>
              <Text style={styles.websiteLinkToggleText}>Include Website Link when sharing</Text>
              <Switch
                value={includeWebsiteLink}
                onValueChange={setIncludeWebsiteLink}
                trackColor={{ false: '#e2e8f0', true: COLORS.primary }}
                thumbColor={includeWebsiteLink ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={handleDownload}>
              <Text style={styles.downloadBtnText}>⬇️ Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
              <Text style={styles.shareBtnText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: keyboardHeight + 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  backBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btn: { marginTop: 20, padding: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  
  // Preview
  previewContainer: { alignItems: 'center', marginVertical: 10 },
  viewShotContainer: {
    width: IMAGE_SIZE, 
    backgroundColor: '#fff',
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  imageContentWrapper: {
    width: IMAGE_SIZE, height: IMAGE_SIZE, position: 'relative', overflow: 'hidden',
  },
  baseImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  
  logoContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3,
  },
  logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderLogo: { width: '100%', height: '100%', backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  placeholderLogoText: { color: '#fff', fontWeight: 'bold' },
  
  customTextWrapper: { position: 'absolute', padding: 4, borderWidth: 1, borderColor: 'transparent', borderRadius: 4 },
  customTextActive: { backgroundColor: 'rgba(0,0,0,0.2)' },

  bottomInfoBar: {
    paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  infoText: { fontWeight: '600' },
  helpText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 10 },

  // Tools
  toolsContainer: { backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  
  toolBody: { padding: 16 },
  toolSection: { gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 8 },
  
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 20 },
  uploadBtn: { backgroundColor: 'rgba(21, 62, 63, 0.08)', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  uploadBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  
  shapeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  shapeBtnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(21, 62, 63, 0.08)' },
  activeText: { fontWeight: 'bold', color: COLORS.primary },
  
  iconBtn: { width: 36, height: 36, backgroundColor: '#f3f4f6', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sliderTrack: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: COLORS.primary },

  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff', marginBottom: 8 },
  
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  colorSwatchActive: { borderWidth: 3, borderColor: COLORS.primary, transform: [{ scale: 1.1 }] },

  addTextBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  addTextBtnLabel: { color: '#fff', fontWeight: 'bold' },
  textChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 8 },
  textChipActive: { backgroundColor: COLORS.primary },
  activeTextEditor: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },



  // Actions
  actionsContainer: { padding: 16, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  websiteLinkToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  websiteLinkToggleText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  buttonsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  downloadBtn: { backgroundColor: '#fff', borderColor: COLORS.border },
  downloadBtnText: { color: COLORS.text, fontWeight: '700' },
  shareBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  shareBtnText: { color: '#fff', fontWeight: '700' },
});
