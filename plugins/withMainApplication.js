const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Fixes "Class 'MainApplication' is not abstract and does not implement abstract member:
 * val reactNativeHost: ReactNativeHost" at app:compileReleaseKotlin.
 *
 * The Expo SDK 55 template generates MainApplication.kt that only implements
 * `override val reactHost: ReactHost` (New Architecture path), but the
 * ReactApplication interface in React Native 0.81.x still declares
 * `val reactNativeHost: ReactNativeHost` as an abstract member with no default body.
 * Kotlin therefore requires every concrete class to implement it.
 *
 * This plugin patches the generated MainApplication.kt to add the required stub
 * implementation of reactNativeHost that throws UnsupportedOperationException,
 * satisfying the interface contract without breaking New Architecture usage.
 */
module.exports = function withMainApplication(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName =
        config.android?.package ?? 'com.kbamnote.tapifapp';
      const packagePath = packageName.split('.').join('/');
      const mainApplicationPath = path.join(
        config.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        packagePath,
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainApplicationPath)) {
        console.warn(
          '[withMainApplication] MainApplication.kt not found at',
          mainApplicationPath
        );
        return config;
      }

      let contents = fs.readFileSync(mainApplicationPath, 'utf8');

      // Idempotency: skip if already patched
      if (contents.includes('reactNativeHost')) {
        return config;
      }

      // Add import for ReactNativeHost after the ReactHost import line
      if (!contents.includes('import com.facebook.react.ReactNativeHost')) {
        contents = contents.replace(
          /^(import com\.facebook\.react\.ReactHost)$/m,
          'import com.facebook.react.ReactHost\nimport com.facebook.react.ReactNativeHost'
        );
      }

      // Insert the stub before `override fun onCreate()` so it sits inside the class body
      const stub = [
        '',
        '  @Suppress("DEPRECATION")',
        '  override val reactNativeHost: ReactNativeHost',
        '    get() = throw UnsupportedOperationException(',
        '      "New Architecture does not use ReactNativeHost. Use reactHost instead."',
        '    )',
      ].join('\n');

      contents = contents.replace(
        /(\n  override fun onCreate\(\))/,
        stub + '\n$1'
      );

      fs.writeFileSync(mainApplicationPath, contents, 'utf8');
      console.log(
        '[withMainApplication] Patched MainApplication.kt with reactNativeHost stub.'
      );

      return config;
    },
  ]);
};
