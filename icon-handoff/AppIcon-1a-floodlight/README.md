# Alta Gama FC — app icon 1a (Floodlight)

Graphite field with a lime glow falling from above the top edge, mark in
`#c8f25a`. Square masters, **no baked corner radius** — iOS applies the mask.

- `AppIcon.appiconset/` — drop into Xcode (single-size 1024 × three appearances).
- `expo/icon-{light,dark,tinted}.png` — the three 1024 masters for `app.json`.
- `light/`, `dark/`, `tinted/` — full raster set per variant:
  1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20.
  (60 is the notification / Live Activity header glyph; 87 and 58 are Settings;
  120 and 80 are Spotlight; 152 and 167 are iPad, unused while
  `supportsTablet: false`.)

Mark geometry: 42×30 unit box, 2.2u stroke, goal boxes flush to the touchline —
the same geometry as `brand/mark-accent.svg` and the 1b set, so the two
directions are interchangeable without redrawing anything.

## The three iOS 18 variants

| Variant | Field | Mark | Glow |
| --- | --- | --- | --- |
| light | `#0f1216` | `#c8f25a` | lime, 20% |
| dark | `#0a0b0c` | `#c8f25a` | lime, 24% |
| tinted | `#0b0b0b` | `#f2f2f2` | white, 14% |

**dark** deepens the field to the app's own `#0a0b0c` ground and lifts the glow
a little, so the icon still separates from a dark wallpaper. **tinted** is
greyscale only: iOS maps luminance onto the user's tint, so any lime in it would
be thrown away — the glow survives as the luminance ramp that keeps the tile
from reading as a flat plate.

## Small-size ladder

The mark thins out before the tile does, so stroke and crop step with size —
identical to what the design file shows under each tile:

| Size | Stroke | Goal boxes | Glow |
| --- | --- | --- | --- |
| 60–1024 | 2.2u | yes | yes |
| 40–58 | 2.4u | yes | yes |
| 29–39 | 2.8u | dropped | dropped |
| 20 | 3.2u | dropped | dropped |

Below 29px the goal boxes fill in and the glow is invisible, so both are removed
rather than rendered as mud — pitch outline, halfway line and centre circle only.

Wire-up (`app.json`, already expects these paths):

```json
"ios": { "icon": {
  "light": "./assets/images/icon-light.png",
  "dark": "./assets/images/icon-dark.png",
  "tinted": "./assets/images/icon-tinted.png"
} }
```

Copy `expo/icon-{light,dark,tinted}.png` into `assets/images/`. Note
`icon-dark.png` is also the splash image (`expo-splash-screen`, imageWidth 184).
Android `monochromeImage` still carries the old mark; say the word and I'll
regenerate the adaptive-icon set from this geometry.
