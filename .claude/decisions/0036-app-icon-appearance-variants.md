# 0036 — The app icon is three 1024s wired through `ios.icon`'s variant object

- **Date:** 2026-08-25
- **Status:** Superseded by [0041](./0041-app-icon-1b-and-a-splash-of-its-own.md) — the splash no longer shares `icon-dark.png`; the three-variant wiring stands
- **Decided by:** Ed Medina

## Context
The app shipped **Expo's placeholder icon** — `ios.icon` pointed at
`assets/expo.icon`, the Icon Composer bundle from the scaffold (blue gradient,
Expo symbol), with the same placeholder again as the top-level `icon` and as the
splash image.

The real mark — the accent-green pitch, in all three iOS 18 appearances — had
been sitting in `icons/AppIcon.appiconset/` since `924828a`, hand-authored the way
Xcode wants it: seventeen PNGs and a `Contents.json`. **Nothing read a byte of
it.** This is a CNG project with no `ios/` directory in the tree, so
`expo prebuild` *generates* `Images.xcassets/AppIcon.appiconset` from `app.json`
on every build and overwrites whatever is there. An appiconset at the repo root
is invisible to the build no matter how correct it is.

`ios.icon` takes three shapes: a plain string, a path to a `.icon` (Icon Composer)
directory, or an object `{ light, dark, tinted }`.

## Decision
Three 1024×1024 PNGs in `assets/images/` — `icon-light.png`, `icon-dark.png`,
`icon-tinted.png` — wired through the **variant object**:

```jsonc
"ios": { "icon": { "light": "…", "dark": "…", "tinted": "…" } }
```

`@expo/prebuild-config`'s `withIosIcons` emits exactly one 1024 per variant and
writes `Contents.json` itself, so **only the 1024s ever mattered**; the thirteen
downscaled PNGs were dead weight and `marketing-1024.png` was byte-identical to
`icon-1024.png`. `icons/` is deleted, along with `assets/expo.icon` and the two
placeholder PNGs.

⚠ **The tinted variant had to be re-authored, and this is the part that does not
show up in a diff.** `withIosIcons` generates with
`removeTransparency: appearance !== 'dark'` and `backgroundColor: '#ffffff'` — it
flattens the **light and tinted** variants onto **solid white**, and preserves
alpha only for `dark`. The exported tinted asset was a near-white glyph
(`rgb(233,237,239)`) on 90% transparency; white-on-white would have left a blank
tile, and since iOS 18 maps *luminance* to the user's chosen tint, that tile would
render as flat colour with no mark in it. `assets/images/icon-tinted.png` is now
that same glyph composited over **opaque black** — the light-on-dark polarity
Apple designs tinted icons for, and a no-op for Expo's flatten.

The splash reuses `icon-dark.png` rather than exporting a fourth asset: it is
already the glyph alone on transparency, which is exactly what a splash on the
`#0a0b0c` ground needs. `imageWidth` went 76 → **184** because the mark occupies
only ~65% of the square's width, so 184pt of canvas renders a ~120pt mark.

## Consequences
- **`app.json` is the only place the icon is configured.** Editing an appiconset
  by hand does nothing here, ever. So does adding sizes.
- The light variant lands in the build with **no alpha channel** (verified
  `hasAlpha: no`), which is what App Store Connect requires of the marketing
  icon. The source keeps its unused alpha; Expo strips it.
- **Changing the tinted artwork means re-flattening it onto black.** Dropping in a
  transparent export silently reverts the bug — nothing errors, the tile just goes
  blank under a tint, and it is only visible in Settings → Display & Brightness →
  Tinted on a real build.
- The icon and the splash are now **one asset**, so they cannot drift. Adjusting
  the splash's size is `imageWidth`, never a crop of the shared PNG.
- `/ios` and `/android` are gitignored, since verifying this means running
  `prebuild` and deleting the result. ⚠ `prebuild` also rewrites `package.json`'s
  `ios`/`android` scripts to `expo run:*`; that is a side effect to revert, not an
  intended change — the run command is still
  `npx expo start --dev-client --ios`.
- Android keeps Expo's placeholder adaptive icon. v1 is iOS-only
  ([0016](./0016-ios-only-v1.md)) and an Android build is not a shipping surface.

## Alternatives considered
- **Point `ios.icon` at a `.icon` bundle** (Icon Composer, what the scaffold used)
  — the liquid-glass path, and Expo supports it: it copies the directory in and
  sets `ASSETCATALOG_COMPILER_APPICON_NAME`. But it means authoring the mark in
  Icon Composer, and what exists is a flat PNG export. Worth revisiting when the
  design settles; it is a one-line config change from here.
- **Commit the generated `ios/` tree so the hand-authored appiconset is used**
  — bare workflow, which reverses [0001](./0001-expo-sdk-57-managed.md) and hands
  us an Xcode project to maintain for the sake of an icon.
- **Leave the tinted variant transparent and let Expo flatten it** — produces a
  blank tile for every reader using a tinted home screen. Rejected on sight once
  the pixel values were read.
- **Keep `icons/` as a design-source folder** — a directory of PNGs no build step
  reads is precisely the trap this entry exists to document. The three that matter
  live in `assets/images/`.
