const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Two fixes in one plugin:
 *
 * Fix 1 (legacy): Replaces the broken `hermes-compiler` npm package resolution in
 * older Expo SDK templates where hermesc was published as a separate package.
 * React Native 0.81+ bundles hermesc directly inside react-native/sdks/hermesc/,
 * making the old hermes-compiler resolution fail at build time. Only applies when
 * the broken pattern is present in app/build.gradle.
 *
 * Fix 2 (current): EAS cloud builds run on Linux. npm does NOT preserve the +x
 * execute permission on binary files when installing packages. hermesc ships as a
 * pre-compiled binary inside react-native, so after `npm install` on the EAS Linux
 * runner the binary exists but is not executable — Gradle fails with
 * "A problem occurred starting process 'command '...hermesc''".
 *
 * We inject a Gradle task hook that calls File.setExecutable(true) on the hermesc
 * binary in a doFirst block on every createBundle* task. This runs a moment before
 * hermesc is spawned, so the permission is always present regardless of how npm
 * installed the packages.
 */
module.exports = function withHermesCommand(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // ── Fix 1: hermes-compiler legacy resolution ──────────────────────────────
    if (contents.includes('hermes-compiler')) {
      contents = contents.replace(
        /(\s+hermesCommand\s*=\s*)new File\(\["node",\s*"--print",\s*"require\.resolve\('hermes-compiler\/package\.json'[^"]*"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"\/hermesc\/%OS-BIN%\/hermesc"/,
        "$1new File([\"node\", \"--print\", \"require.resolve('react-native/package.json')\"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile().toString() + \"/sdks/hermesc/%OS-BIN%/hermesc\""
      );
    }

    // ── Fix 2: chmod hermesc on Linux (EAS cloud) ─────────────────────────────
    const MARKER = '// [withHermesCommand] chmod-hermesc-linux';

    if (!contents.includes(MARKER)) {
      const chmodBlock = `
${MARKER}
// Ensures the hermesc binary is executable on Linux build environments (e.g. EAS).
// npm does not preserve +x permissions, so we restore it right before Gradle needs it.
tasks.configureEach { task ->
    if (task.name.startsWith("createBundle")) {
        task.doFirst {
            def hermescBin = new File(rootProject.projectDir, "../node_modules/react-native/sdks/hermesc/linux64-bin/hermesc")
            if (hermescBin.exists() && !hermescBin.canExecute()) {
                hermescBin.setExecutable(true, false)
                println("[withHermesCommand] chmod +x: " + hermescBin.getAbsolutePath())
            }
        }
    }
}
`;
      contents = contents + chmodBlock;
    }

    config.modResults.contents = contents;
    return config;
  });
};
