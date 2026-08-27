/**
 * The WidgetKit extension — the home-screen and Lock Screen widgets (SPEC §4).
 *
 * ⚠ **`deploymentTarget` is set on purpose.** `@bacons/apple-targets` defaults a
 * widget target to **18.0**, which would silently exclude every iOS 17 reader.
 * 17.0 is the real floor, and it is the floor because these widgets are
 * CONFIGURABLE: `AppIntentConfiguration` did not exist before it. The app itself
 * still runs on 16.4 (`ios/Podfile`), so a reader on 16.x gets the app and no
 * widget — an accepted cost of the configurable choice (ADR 0047).
 *
 * ⚠ **No `images`.** The mark is drawn as a SwiftUI `Shape` in `Mark.swift`
 * rather than shipped as a PNG asset. A bitmap survives the home screen fine but
 * is flattened to a mask on the Lock Screen and under iOS 18's tinted rendering,
 * where a stroked path keeps its geometry.
 *
 * ⚠ **`displayName` keeps the closed-up `AltaGama FC`**, matching the other two
 * targets and `app.json`'s `name`. ADR 0042 reinstated the spaced `Alta Gama FC`
 * for reader-facing COPY and deliberately left the Apple-facing labels alone —
 * renaming those is a product/App Store Connect call, not a doc sync. The widget
 * gallery entries themselves carry no brand string, only `Next match` /
 * `Your week`, so nothing here has to pick a side.
 *
 * ⚠ **Swift lives here, outside `ios/`** (ADR 0025). Never `expo prebuild` and
 * commit `ios/` — that forfeits CNG permanently. Code shared with the
 * notification content extension lives one level up in `targets/_shared/`.
 */
module.exports = {
  type: 'widget',
  name: 'AltaGamaWidgets',
  displayName: 'AltaGama FC Widgets',
  deploymentTarget: '17.0',
  entitlements: {
    // The only channel this extension has. It reads `widget/snapshot.json` and
    // `crests/{fixtureId}/{slot}.png`, both written by the app.
    'com.apple.security.application-groups': ['group.com.altagamafc.app'],
  },
};
