import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { checkForUpdate, ANDROID_PACKAGE } from '../services/appUpdate';

/**
 * Self-contained update prompt. Drop <UpdatePopup /> once near the app root.
 * On mount it asks the backend if a newer build is live; if so it shows a modal.
 * "Update Now" opens this platform's own store; "Maybe Later" dismisses (hidden
 * when the update is mandatory / force = true).
 *
 * checkForUpdate() only returns a URL belonging to the running platform, and
 * returns null when there is none — so on iOS, until an App Store listing is
 * configured on the backend, this component renders nothing at all.
 */
export default function UpdatePopup() {
  const [info, setInfo] = useState(null);
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;
    checkForUpdate().then(res => {
      if (alive && res?.updateAvailable) {
        setInfo(res);
        setVisible(true);
      }
    });
    return () => { alive = false; };
  }, []);

  const openStore = async () => {
    setOpening(true);
    // info.url is already the correct store for this platform — never fall back
    // to a Play Store link, which on iOS would push the user to a rival store.
    const web = info?.url;
    if (!web) { setOpening(false); return; }
    // The native scheme opens the store app directly instead of the browser.
    // market:// is Android-only; itms-apps:// is its iOS counterpart.
    const native = Platform.OS === 'android'
      ? `market://details?id=${ANDROID_PACKAGE}`
      : web.replace(/^https?:\/\//, 'itms-apps://');
    try {
      const canNative = await Linking.canOpenURL(native);
      await Linking.openURL(canNative ? native : web);
    } catch (e) {
      try { await Linking.openURL(web); } catch (_) {}
    } finally {
      setOpening(false);
    }
  };

  if (!info) return null;
  const mandatory = !!info.mandatory;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { if (!mandatory) setVisible(false); }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🚀</Text>
          </View>

          <Text style={styles.title}>Update Available</Text>
          {info.latest ? <Text style={styles.version}>Version {info.latest}</Text> : null}
          <Text style={styles.msg}>{info.message}</Text>

          <TouchableOpacity style={styles.updateBtn} onPress={openStore} activeOpacity={0.85} disabled={opening}>
            {opening
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.updateBtnText}>Update Now</Text>}
          </TouchableOpacity>

          {!mandatory && (
            <TouchableOpacity style={styles.laterBtn} onPress={() => setVisible(false)} activeOpacity={0.7}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 34 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  msg: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 22,
  },
  updateBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  laterBtn: {
    marginTop: 12,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  laterBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
