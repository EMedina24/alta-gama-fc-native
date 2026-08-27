# 0041 — App icon 1b: three opaque appearance masters, and a splash asset of its own

- **Date:** 2026-08-26
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
[0036](./0036-app-icon-appearance-variants.md) wired the icon as three 1024s
through `ios.icon`'s `{ light, dark, tinted }` object, and made the splash **reuse
`icon-dark.png`** — that variant was the glyph alone on transparency, which is
exactly what a splash on the `#0a0b0c` ground wants. One asset, two jobs, and the
stated consequence was that "the icon and the splash are now one asset, so they
cannot drift".

The design pipeline then delivered icon set **1b** (`icon-handoff/AppIcon-1b/`),
which changes two things that 0036's arrangement depended on:

- The mark geometry is re-cut — **goal boxes flush to the touchline** rather than
  bleeding past it, on a 42×30 unit box at 66% of tile width with a 2.2u stroke.
- **All three variants are now full-bleed opaque tiles**, each with its own field
  colour and mow-stripe rhythm:

  | Variant | Field | Mark | Stripes |
  | --- | --- | --- | --- |
  | light | `#c8f25a` | `#0b1015` | dark, 5.5% |
  | dark | `#0f1216` | `#c8f25a` | lime, 5.5% |
  | tinted | `#0b0b0b` | `#f2f2f2` | white, 4.5% |

`dark` inverting the field rather than dimming it is the point — the lime stays
the Home Screen signal. But it means `icon-dark.png` is **no longer a glyph on
transparency**, and 184pt of it centred on `#0a0b0c` is a visible dark square.
The splash could not keep sharing it.

Separately, the reader asked for the **logo lockup** on the launch screen rather
than the mark alone, which wants a dedicated asset regardless.

## Decision
**The icon is 1b's three masters, copied to the paths `app.json` already names.**
`app.json`'s `ios.icon` block does not change — only the bytes behind it. The
sources are `icon-handoff/AppIcon-1b/expo/icon-{light,dark,tinted}.png`.

**The splash is its own asset**, `assets/images/splash-lockup.png` — the Alta Gama
FC lockup (mark + wordmark + `FIXTURE CLUB` sub-line), trimmed to its artwork
bounds on transparency, at `imageWidth: 300`. This reverses 0036's one-asset
arrangement. The source is `logos/transparent-png/lockup-accent-transparent.png`,
2348×368 with an opaque bbox of 2345×360 — i.e. no padding to compensate for.

⚠ **The asset's trim and `imageWidth` are ONE setting split across two files.**
0036's `imageWidth: 184` was not a size, it was 184 × 0.646 — the mark occupied
64.6% of a 1024 square (measured), so 184pt of canvas rendered ~119pt of mark. A
tight asset has no such multiplier, so re-trimming artwork without re-deriving
`imageWidth` silently resizes the launch screen. Both current assets are tight;
`imageWidth` is the artwork's true width.

⚠ **`expo-splash-screen` fits the image into a SQUARE of side `imageWidth`.** For
anything wider than tall, width is the limiting dimension, so `imageWidth` is the
rendered width — but the generated imageset is square (300×300 holding a 300×47
lockup), which looks wrong in a file listing and is not.

**The lockup could not be rendered in this repo**, which is why it was
commissioned rather than generated: the SVG masters keep the wordmark as live
Archivo text and Archivo is not installed here, so rasterising would silently
substitute a fallback face. The mark, by contrast, is five primitives and no text
— which is why `splash-mark.png` could be and briefly was rendered straight from
`logos/mark-accent.svg` while the lockup was outstanding.

**`SplashScreen.preventAutoHideAsync()` now holds the splash through hydration.**
`RootLayout` returns `null` while `hydratePreferences()` and `hydrateSession()`
settle; the native splash used to auto-hide at first mount, so those reads played
out against an empty screen. It is released in an effect keyed to `ready`, with
`setOptions({ fade: true, duration: 250 })` softening the hand-off.

## Consequences
- **The icon and the splash can drift now, and that is the trade.** 0036 bought
  "they cannot drift" with "the splash must be whatever the dark icon is", and a
  full-bleed dark icon made that price unpayable. Re-cutting the mark now means
  re-cutting two assets, from the same `logos/` geometry.
- **The launch screen now carries the WORDMARK**, which the Home Screen icon does
  not and cannot. They are no longer the same artwork at two sizes; they are two
  pieces of one identity. Changing the mark means re-cutting both.
- **The lockup spells the brand `ALTA GAMA FC`**, which is the whole reason
  [0042](./0042-brand-spelling-spaced-form-reinstated.md) exists. The launch screen
  is the most reader-facing surface in the app, so the spelling question could not
  be deferred past this point.
- **The tinted flatten moved upstream and got quieter.** 0036 had us compositing
  the tinted variant onto opaque black by hand, because
  `withIosIcons` generates with `removeTransparency: appearance !== 'dark'` over
  `#ffffff` and would otherwise leave a blank tile. 1b arrives on opaque `#0b0b0b`
  already, so Expo's flatten is a no-op — but the *requirement* did not go away, it
  just became someone else's default. An export that returns to transparency
  reverts the bug silently, exactly as before (HANDOFF trap 22).
- **`removeTransparency` is now a no-op for every variant**, since none of the
  three has meaningful alpha. The light one still lands in the build with
  `hasAlpha: no`, which is what App Store Connect requires of the marketing icon.
- **`imageWidth` is now the lockup's, not the icon's.** 0036's 184 was reverse-
  engineered from the mark occupying ~65% of a square; a trimmed lockup has no
  padding to compensate for, so it is sized directly (~300, tuned on device).
- The launch screen no longer blinks to black before first paint. The cost is that
  a hang in either hydration read now shows as a **stuck splash** rather than a
  black screen — both are broken, but the splash hides it better. `hydrate*` both
  resolve through `.finally`, so a rejection still releases it.
- Android keeps the old adaptive icon; v1 is iOS-only ([0016](./0016-ios-only-v1.md)).
  1b's README offers to regenerate that set from the new geometry when it matters.

## Alternatives considered
- **Keep the splash on `icon-dark.png` and set `backgroundColor` to `#0f1216`** —
  hides the tile edge by matching the splash ground to the icon's field, and keeps
  0036's one-asset property. But it paints the whole launch screen a colour the app
  never uses, and the 184pt patch of mow stripes still reads as a square. It also
  locks the splash background to whatever the *icon's* field happens to be.
- **Ask for a transparent dark variant so the splash can go on sharing it** — the
  full-bleed dark tile is a deliberate Home Screen decision, and undoing it to save
  one asset is the tail wagging the dog.
- **Render the lockup from `logos/lockup-accent.svg` at build time** — its wordmark
  is live Archivo text, Archivo is not installed here, and a rasteriser is not
  either. It would need a font fetch plus a WebKit snapshot script to produce one
  static PNG.
- **Use `logos/png/lockup-accent.png` as delivered** — it sits on an opaque
  `#0b1015` rounded panel with ~35% padding, so it renders as a card and lands the
  artwork at ~65% of the size the `imageWidth` implies.
