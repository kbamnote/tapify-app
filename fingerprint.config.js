/**
 * What counts as a NATIVE change, for `runtimeVersion: { policy: 'fingerprint' }`.
 *
 * WHY THIS FILE EXISTS
 * An over-the-air update only installs on a build whose runtime version matches
 * it exactly. With the fingerprint policy that version is a hash of everything
 * that could affect the native binary — and, by default, that hash also covers
 * the app's version number and iOS buildNumber, which affect nothing native at
 * all. Bumping "version" in app.json therefore changed the runtime version, and
 * every update published afterwards was addressed to a runtime that no phone in
 * the world had. Two updates went out that way and reached nobody: the WhatsApp
 * broadcast release, and the feature-usage tracking the Customer Manager
 * dashboard depends on. Nothing errored — the updates simply had no audience.
 *
 * Skipping the version fields keeps the runtime version tied to what actually
 * matters: the native modules and config that are compiled into the build.
 *
 * STILL BREAKS THE MATCH (by design — these really can need a new build):
 *   - adding or upgrading a native module
 *   - changing plugins, permissions, icons or the app name in app.json
 *   - editing eas.json, which @expo/fingerprint hashes and offers no skip for
 *
 * So: after ANY of those, ship a store build before relying on OTA again, and
 * check with `eas fingerprint:compare --build-id <latest store build>` that the
 * project still matches what customers are running.
 */
const { SourceSkips } = require('@expo/fingerprint');

module.exports = {
  sourceSkips:
    // "version", android versionCode and iOS buildNumber.
    SourceSkips.ExpoConfigVersions |
    // A runtimeVersion pinned as a literal string — used when an update has to
    // be addressed to an older build's runtime.
    SourceSkips.ExpoConfigRuntimeVersionIfString,
};
