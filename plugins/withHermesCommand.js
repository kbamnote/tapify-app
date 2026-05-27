const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Fixes "Cannot invoke method getAbsolutePath() on null object" at app/build.gradle line 14.
 *
 * The Expo SDK 55 template references `hermes-compiler` npm package to locate hermesc,
 * but React Native 0.81.x bundles hermesc directly at `react-native/sdks/hermesc/`
 * instead of publishing it as a separate npm package. When the node resolution fails,
 * `new File("").getParentFile()` returns null, causing the crash.
 *
 * This plugin replaces the broken hermesCommand with one that resolves hermesc
 * from the bundled react-native sdks directory.
 */
module.exports = function withHermesCommand(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (!contents.includes('hermes-compiler')) {
      return config;
    }

    config.modResults.contents = contents.replace(
      /(\s+hermesCommand\s*=\s*)new File\(\["node",\s*"--print",\s*"require\.resolve\('hermes-compiler\/package\.json'[^"]*"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"\/hermesc\/%OS-BIN%\/hermesc"/,
      "$1new File([\"node\", \"--print\", \"require.resolve('react-native/package.json')\"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile().toString() + \"/sdks/hermesc/%OS-BIN%/hermesc\""
    );

    return config;
  });
};
