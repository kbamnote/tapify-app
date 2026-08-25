import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE } from '../config';

export const ANDROID_PACKAGE = 'com.kbamnote.tapifapp';

/**
 * Compare two semver-ish strings ("1.1.10").
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareVersions(a, b) {
  const pa = String(a ?? '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b ?? '0').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** Installed app version from app.json, with fallbacks across Expo runtimes. */
export function getCurrentVersion() {
  return (
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.manifest?.version ||
    '0.0.0'
  );
}

/**
 * Ask the backend for the latest published version and decide whether to prompt.
 * Never throws — a failed check simply returns null (never blocks the app).
 *
 * PLATFORM. This used to ask for `platform=android` and fall back to a Play
 * Store link on every platform, so an iPhone user tapping "Update Now" was sent
 * to Google Play — broken for them, and grounds for an App Store rejection.
 * Each platform now gets its own store URL, and if the running platform has no
 * store URL configured (iOS before the App Store listing exists) the check
 * returns null so no prompt is shown at all. Silence beats a dead button.
 *
 * @returns {Promise<null | {updateAvailable:true, mandatory:boolean, current:string, latest:string, message:string, url:string}>}
 */
export async function checkForUpdate() {
  try {
    const res = await fetch(
      `${API_BASE}/api/public/app-version.php?platform=${Platform.OS}`,
      { headers: { Accept: 'application/json' } },
    );
    const json = await res.json();
    if (!json?.success || !json.data) return null;

    const { latest_version, min_version, force, message, android_url, ios_url } = json.data;
    const current = getCurrentVersion();

    if (compareVersions(latest_version, current) <= 0) return null; // already up to date

    // Only ever hand back a store URL that belongs to THIS platform.
    let url = '';
    if (Platform.OS === 'android') {
      url = android_url || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    } else if (Platform.OS === 'ios') {
      url = ios_url || '';       // no listing yet -> no prompt (see below)
    }
    if (!url) return null;       // nowhere legitimate to send them

    const belowMin = min_version ? compareVersions(current, min_version) < 0 : false;
    return {
      updateAvailable: true,
      mandatory: !!force || belowMin,
      current,
      latest: latest_version,
      message: message || 'A new version is available.',
      url,
    };
  } catch (e) {
    return null;
  }
}
