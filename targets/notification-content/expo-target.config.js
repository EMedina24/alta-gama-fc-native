/**
 * The Notification Content Extension — the long-look match card (design 1b).
 *
 * ⚠ Shown on long-press only. The short look underneath is still the standard
 * notification with the composed crest attachment (design 1a), so this target
 * never replaces that work — it sits on top of it.
 *
 * ⚠ **`Info.plist` in this folder is hand-authored and the plugin will not
 * overwrite it** (`with-widget.js` only writes a template when the file is
 * absent). That is deliberate: the generated default carries a single
 * placeholder category, and we need all three — see the header of
 * `src/features/push/categories.ts` for the three-way contract.
 *
 * ⚠ **Swift lives here, outside `ios/`** (ADR 0025).
 */
module.exports = {
  type: 'notification-content',
  name: 'AltaGamaNotificationContent',
  displayName: 'AltaGama FC Match Card',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.altagamafc.app'],
  },
};
