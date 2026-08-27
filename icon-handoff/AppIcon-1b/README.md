# Alta Gama FC — app icon 1b (Kick-off)

Full-bleed lime field (#c8f25a) with faint mow stripes, mark in #0b1015.
Square masters, **no baked corner radius** — iOS applies the mask.

- `AppIcon.appiconset/` — drop into Xcode (single-size 1024 × three appearances).
- `expo/icon-{light,dark,tinted}.png` — the three 1024 masters for `app.json`.
- `light/`, `dark/`, `tinted/` — full raster set per variant:
  1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20.
  (60 is the notification / Live Activity header glyph; 87 and 58 are Settings;
  120 and 80 are Spotlight; 152 and 167 are iPad, unused while
  `supportsTablet: false`.)

Mark geometry: 42×30 unit box at 66% of tile width, 2.2u stroke, goal boxes
flush to the touchline.

## The three iOS 18 variants (all from the new mark geometry)

| Variant | Field | Mark | Stripes |
| --- | --- | --- | --- |
| light | `#c8f25a` | `#0b1015` | dark, 5.5% |
| dark | `#0f1216` | `#c8f25a` | lime, 5.5% |
| tinted | `#0b0b0b` | `#f2f2f2` | white, 4.5% |

**dark** inverts the field rather than dimming it — the lime stays the brand
signal on the Home Screen, and it matches the `#0a0b0c` splash it sits next to.
**tinted** is greyscale only: iOS maps luminance onto the user's tint, so any
lime in it would be thrown away. Same stripe rhythm at lower contrast so the
tinted version doesn't read as a flat plate.

Wire-up (`app.json`, already expects these paths):

```json
"ios": { "icon": {
  "light": "./assets/images/icon-light.png",
  "dark": "./assets/images/icon-dark.png",
  "tinted": "./assets/images/icon-tinted.png"
} }
```

Copy `expo/icon-{light,dark,tinted}.png` into `assets/images/`. Note
`icon-dark.png` is also the splash image (`expo-splash-screen`, imageWidth 184)
— replacing it fixes the old goal-tick geometry on the launch screen too.
Android `monochromeImage` still carries the old mark; say the word and I'll
regenerate the adaptive-icon set from the same geometry.

---

⚠ **Nothing in this folder is read by a build.** This is a CNG project: `expo
prebuild` regenerates `Images.xcassets/AppIcon.appiconset` from `app.json` and
overwrites anything else. The only files that reach a build are the ones in
`assets/images/` that `app.json` names. Kept as design source — see
`.claude/HANDOFF.md` traps 22–23 and
`.claude/decisions/0041-app-icon-1b-and-a-splash-of-its-own.md`.
