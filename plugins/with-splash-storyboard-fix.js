/**
 * Repairs the splash storyboard that `expo-splash-screen`'s NO-IMAGE path
 * leaves half-generated (ADR 0134). With `image` gone from the plugin config
 * — the animated splash opens on an empty `Splash.base` ground, so there is
 * nothing to draw natively — `removeImageFromSplashScreen` prunes the image
 * view but:
 *
 *  1. never applies `backgroundColor` to the storyboard, so the container
 *     keeps the bare template's `systemBackgroundColor` — the generated
 *     `SplashScreenBackground.colorset` exists but NOTHING references it,
 *     and the launch frame renders #000000, not the configured ground;
 *  2. misses the image view's two centre constraints (it looks them up by
 *     sha1-derived ids; the template's are `0VC-Wk-OaO`/`zR4-NK-mVN`),
 *     leaving them dangling against a view that no longer exists;
 *  3. misses the `SplashScreenLogo` resource entry when it sits at index 0
 *     (`existingImageIndex && …` — a falsy-zero bug).
 *
 * ibtool happens to compile the dangling refs (verified), so only №1 is
 * user-visible — but all three are wrong, and this mod fixes them the way
 * the WITH-image path (`applyImageToSplashScreenXML`) would have. It rides
 * `expo-splash-screen`'s own storyboard mod, so it composes with prebuild
 * and stays idempotent; order in the plugins array does not matter because
 * the no-image path never touches what this writes.
 *
 * ⚠ `backgroundColor` here must match the `expo-splash-screen` entry in
 * `app.json` — the plugin-prop style keeps its config invisible to sibling
 * plugins, so the value is passed twice, adjacently, on purpose.
 */
// ⚠ The package's `exports` map only exposes `.`, `./plugin`, `./app.plugin.js`
// and `./package.json` — the storyboard mod must be required by ABSOLUTE path,
// which bypasses the map. `./plugin` (the public surface) does not re-export it.
const path = require('path');
const splashPluginRoot = path.dirname(require.resolve('expo-splash-screen/package.json'));
const { withIosSplashScreenStoryboard } = require(
  path.join(splashPluginRoot, 'plugin/build/withIosSplashScreenStoryboard'),
);
const { parseColor } = require(path.join(splashPluginRoot, 'plugin/build/InterfaceBuilder'));

const IMAGE_ID = 'EXPO-SplashScreen';

module.exports = function withSplashStoryboardFix(config, { backgroundColor } = {}) {
  if (!backgroundColor) {
    throw new Error(
      'with-splash-storyboard-fix: pass { backgroundColor } matching the expo-splash-screen entry',
    );
  }
  return withIosSplashScreenStoryboard(config, (config) => {
    const xml = config.modResults;
    const mainView =
      xml.document.scenes?.[0]?.scene?.[0]?.objects?.[0]?.viewController?.[0]?.view?.[0];

    if (mainView != null) {
      // №2 — constraints that still name the removed image view.
      if (mainView.constraints?.[0]?.constraint) {
        mainView.constraints[0].constraint = mainView.constraints[0].constraint.filter(
          (c) => c.$?.firstItem !== IMAGE_ID && c.$?.secondItem !== IMAGE_ID,
        );
      }
      // №1 — the ground: reference the named colour, as the with-image path does.
      mainView.color = [{ $: { key: 'backgroundColor', name: 'SplashScreenBackground' } }];
    }

    const resources = xml.document.resources?.[0];
    if (resources != null) {
      // №3 — the stale image resource (both names the upstream plugin uses).
      if (resources.image) {
        resources.image = resources.image.filter(
          (i) => i.$?.name !== 'SplashScreenLogo' && i.$?.name !== 'SplashScreenLegacy',
        );
      }
      // The system colour only existed to back the reference replaced above.
      if (resources.systemColor) {
        resources.systemColor = resources.systemColor.filter(
          (c) => c.$?.name !== 'systemBackgroundColor',
        );
      }
      // The named colour's design-time definition, shaped exactly as
      // `applyImageToSplashScreenXML` writes it (runtime resolves the
      // colorset; this is IB's fallback).
      const { rgb } = parseColor(backgroundColor);
      resources.namedColor = [
        {
          $: { name: 'SplashScreenBackground' },
          color: [
            {
              $: {
                alpha: '1.000',
                blue: rgb.blue,
                green: rgb.green,
                red: rgb.red,
                customColorSpace: 'sRGB',
                colorSpace: 'custom',
              },
            },
          ],
        },
      ];
    }

    return config;
  });
};
