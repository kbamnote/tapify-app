import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Copy text to the clipboard. Uses expo-clipboard; if the native module isn't
 * present yet (e.g. the dev client hasn't been rebuilt since expo-clipboard was
 * added), it gracefully falls back to the OS Share sheet so the button still
 * does something useful instead of crashing.
 *
 * @returns {Promise<{ok: boolean, method?: 'clipboard'|'share'}>}
 */
export async function copyText(text) {
  const value = (text ?? '').toString();
  if (!value) return { ok: false };

  try {
    await Clipboard.setStringAsync(value);
    return { ok: true, method: 'clipboard' };
  } catch (e) {
    try {
      await Share.share({ message: value });
      return { ok: true, method: 'share' };
    } catch (_) {
      return { ok: false };
    }
  }
}

/** Share text via the OS share sheet. */
export async function shareText(text) {
  const value = (text ?? '').toString();
  if (!value) return;
  try {
    await Share.share({ message: value });
  } catch (_) {
    /* user dismissed */
  }
}
