# 0134 — The animated splash: a JS overlay over a bare native ground

- **Date:** 2026-09-07
- **Status:** Accepted — tsc/lint baseline; cinematic and Reduce Motion variants verified by frame-stepped `simctl recordVideo` on the iPhone 17 Pro simulator (2026-09-07): strike + glow + flicker, sweep brightening the lime (blend verdict: `SWEEP_BLEND` stays `true`), Archivo lockup with settled tracking, collapse into the crown with the status-bar flip, Board live; RM hold → cross-fade with a dark bar from frame 1
- **Decided by:** Ed Medina (design handoff; the three build choices confirmed in session)

## Context
Design handed off a launch animation (`handoff_splashscreen/` — `SPLASH.md` is
the spec, `altagama-splash.html` the reference build): a 2500ms cycle — lime
mark strike on black with a glow and flicker, a skewed white sweep revealing a
lime sheet, the ink lockup rising with a tracking animation, then the sheet
collapsing upward to *become* the Board's crown while the app rises beneath.

The splash until now was [0041](./0041-app-icon-1b-and-a-splash-of-its-own.md)'s
static native arrangement: the lockup PNG at `imageWidth` 300 on `#0a0b0c`,
held by `preventAutoHideAsync` until hydration. A native splash cannot animate;
the timeline has to be JS. Three questions were put to Ed before building:

1. **The lockup type.** The spec wants live Archivo 900/34 with `letterSpacing`
   animating .2em → −.02em, and Archivo 800/11 rising separately — a PNG cannot
   do either, and 0041 commissioned the PNG *because* "Archivo is not installed
   here". → **Install Archivo 800+900** (OFL), the app's only custom face.
2. **First runs.** `OnboardingGate` replaces to `welcome`, which has its own
   `Mark` brand moment — the splash would double it, and the sheet "becomes the
   crown" of a screen without one. → **Full splash always**: one code path; the
   collapse reveals whatever is beneath (welcome, a cold-deep-link club page —
   [0110](./0110-deep-links-anchor-on-the-tab-shell.md)'s anchor untouched).
   The double-mark beat is a known nit to raise with design.
3. **"Board ready".** The spec says hold the sheet if the Board is not ready at
   collapse time. This app has no query persistence, so on a cold launch the
   common case at 2500ms is crown + skeletons, and gating on data would stretch
   the splash on every bad network. → **Ready = shell rendered**, which is true
   by construction (the overlay mounts in the same commit as the Stack); the
   spec's hold branch is deliberately not built.

## Decision
**The native splash is a bare `#08090a` ground** (`Splash.base` — darker than
`tabBar`, per the spec) **and everything visible is
`templates/splash-overlay.tsx`**, mounted by the root layout OVER the Stack in
the commit `hideAsync` fires in — that mount is t = 0 of every number in the
timeline. The overlay plays the cycle on imperative shared values
(`withDelay`/`withSequence`/`withTiming`, `Easing.bezier` from the spec's
tuples — not `entering=` presets: six layers share one clock) and unmounts
from its collapse timing's completion callback — the app is interactive the
frame the overlay leaves. A 3.2s safety timeout forces the exit if that
callback is ever lost; a stuck opaque overlay would brick the app.

**The Stack beneath is NOT animated.** The spec's board rise (opacity 0→1,
scale 1.035→1 under the collapse) first shipped as an `Animated.View` wrapper
around the Stack driven by a shared `boardProgress` — and the native tab
bar's liquid-glass RAIL never attached: `NativeTabs` mounting under an
ancestor with animated opacity/transform brought the dock up chromeless,
items floating bare on the content (caught by Ed on 2026-09-07; the wrapper
was removed the same day — trap 64). The reveal is carried by the overlay's
own base-black dissolve, which the reference runs over the same window
anyway; the only loss is the 3.5% scale settle, accepted.

Every value is in the **`Splash` token group** (`constants/theme.ts`): ground,
sheet stops, glow stops, sweep geometry, mark box, type, the ms timeline `t`,
the easing tuples. The timeline lives there and not on `Motion` for
`Deck.spring`'s reason — `Motion` is a vocabulary of reusable durations; these
sixteen numbers are one feature's choreography. Keyframe *deltas* (the 1.14
strike scale, the 0.22 dip, the ±8/10pt rises) stay inline in the overlay: they
are the choreography itself, meaningless anywhere else.

The pieces, and the choices inside them:

- **The wipes are the overflow-hidden + counter-translate pair** — the outer
  view slides its clipping window, the inner slides the sheet the opposite way,
  so the gradient stays screen-fixed. Pure transforms; animating width/height
  would re-layout the SVG sheet per frame. One pair serves both axes: X is the
  560–1240 wipe-in, Y the 2050–2500 collapse, whose surviving top edge is the
  crown ([0087](./0087-crown-plus-aurora-app-shell.md)'s `CrownGrad` stop 0 is
  the same lime).
- **The sheet is `WashGradient angle="splash"`** — a new 168° vector in the
  atom's `VECTOR` table, `pair`'s treatment of a CSS angle. The glow is
  `WashRadial`; the spec's 14pt blur has no cheap RN equivalent, so an extra
  mid-stop (0.45/0.30) fakes the falloff. Alpha rides `WashStop.opacity`
  throughout (trap 42).
- **The marks are the existing `Mark` atom** at `strokeWidth 2.5` — lime
  (`accent`) for the strike, ink (`onCrown`) in the lockup. The handoff SVG's
  goal boxes stop at x=1.25/40.75 where the atom runs flush to 0/42
  ([0041](./0041-app-icon-1b-and-a-splash-of-its-own.md)'s 1b cut); the delta
  is sub-pixel at 132pt and the atom is not forked. The handoff's
  `mark-dark.svg` strokes `#0b1015`, but `SPLASH.md` names the ink `#0d1a08` —
  `onCrown` — and the spec wins.
- **Ink is the `onCrown*` set**, never `onAccent` (trap 15): the sheet is a
  surface. `FIXTURE CLUB` takes `onCrownDim` (0.62) for the spec's
  `rgba(11,22,8,.6)` — reuse over a one-off token.
- **The sweep** rides `mixBlendMode: 'overlay'` (New Architecture, RN 0.86)
  over the sibling SVG sheet, as a soft white `WashGradient angle="pair"` bar,
  46% wide, skewed −14°. `SWEEP_BLEND` at the top of the overlay is the escape
  hatch: if the blend renders as a slab instead of brightening the lime, it
  drops the bar to a plain sheen at `fallbackOpacity`. Verdict frame ~0.9s.
- **Geometry**: the lockup block anchors *proportionally* (`top: 318/852` of
  the window) so it sits optically right on an SE and a Pro Max, but its
  internals (`wordOffset` 122, `subOffset` 168) are fixed points — the lockup
  never stretches apart on a tall screen.
- **Archivo 800/900** ship as static TTFs in `assets/fonts/` (+ `OFL.txt`)
  via the `expo-font` config plugin — embedded natively, at first frame, no
  `useFonts` gate. A **splash-only face**: the explicit exception to
  [0131](./0131-one-display-voice-for-screen-titles.md)'s one-display-voice
  rule; nothing else may use it. iOS resolves by PostScript name
  (`Archivo-Black`/`Archivo-ExtraBold`, verified against the TTFs' name
  tables); a wrong name silently renders SF, which is why `_debug/splash`
  renders both faces beside system-900.
- **Reduce Motion** (`useReducedMotion`, the mandatory branch): the full sheet
  and settled lockup from frame 1, `t.rmHold` 600ms, cross-fade to the Board
  over `Motion.enter` — no strike, no sweep, no scale. The status bar is
  **dark from mount** in that path: the screen is lime from its first frame,
  and the spec's "light through the splash" would be unreadable glyphs.
  Otherwise light, flipping at `t.out` as the sheet starts becoming the crown;
  on unmount `ScreenScaffold`'s own bar (initial `overBright` true → dark)
  takes over, same ink. ⚠ The RM branch's two timings carry
  `ReduceMotion.Never` (on the `withDelay` wrappers too): Reanimated's default
  `System` behaviour SKIPS animations while the system switch is on — exactly
  when this branch runs — jumping straight to the end values, which unmounted
  the overlay on its first frame (trap 63; seen on simulator before the fix).
  The cross-fade IS the reduced accommodation, so it must always play.
- **`splashDone` is component state, not module state** (trap 61): Fast
  Refresh preserves it, so a mid-session edit neither replays the splash over a
  live screen nor strands a blank overlay; a full reload replays it, which is
  right. Iteration happens on `_debug/splash` (replay by remount key, an RM
  button through the overlay's prop), not through cold launches.
- **The native side.** `app.json`'s splash plugin entry is `backgroundColor`
  alone — no `image`, no `imageWidth`; `splash-lockup.png` is retired (the file
  stays for 0041's history). The `hideAsync` fade drops 250→120ms: it is
  black-over-black now, only masking the first JS commit, and at 250 it would
  still be dimming the 190ms strike-in. `preventAutoHideAsync`/`hideAsync` and
  their load-bearing `.catch`es do not move.
- **`plugins/with-splash-storyboard-fix.js`** — `expo-splash-screen`'s
  NO-image path generates a broken storyboard: it never applies
  `backgroundColor` (the container keeps the bare template's
  `systemBackgroundColor` — renders #000000, and the generated colorset is
  referenced by nothing), misses the removed image view's two centre
  constraints (sha1-id lookup vs the template's literal ids), and misses the
  `SplashScreenLogo` resource at index 0 (a falsy-zero bug). ibtool happens to
  compile the dangling refs, so only the colour is user-visible — the local
  plugin repairs all three the way the with-image path would have, riding the
  package's own storyboard mod. It must sit **before** `expo-splash-screen` in
  the plugins array (the base-mod provider must be added last), and its
  `backgroundColor` prop deliberately duplicates the splash entry's — plugin
  props are invisible to sibling plugins.

## Consequences
- Two `app.json`-level changes (splash entry, fonts) landed in ONE
  `prebuild --clean` — trap 31's discipline applies to any future edit of
  either, and the artifacts to check are the storyboard's
  `SplashScreenBackground` reference, the colorset bytes, and `UIAppFonts`.
- The overlay eats every touch while mounted; launch-to-interactive is a flat
  2500ms (860ms reduced). Nothing can extend it — there is no data gate.
- Nothing may reintroduce an animated wrapper over the Stack (trap 64): the
  native tab bar's glass rail dies when `NativeTabs` mounts under animated
  opacity/transform, and native form-sheet presentation sits in that subtree
  too. Any future "animate the whole app" idea must animate an overlay ABOVE
  the app instead, as the splash does.
- (Historical: while the wrapper existed, its shared value was written with
  Reanimated's `.set()` — the compiler lint rejects `.value =` through a hook
  argument and does not honour inline disables for it.)
- First runs show the mark twice (splash, then welcome's hero) — flagged to
  design, accepted for one code path.
- If the design project retunes the timeline, `Splash.t`/`ease` is the whole
  transcription surface; `SPLASH.md` remains the document of record.

## Alternatives considered
- **Keep a native image splash and cross-fade into the timeline** — the
  animation opens on an empty ground; any native artwork would flash and cut.
- **Animate width/height for the wipes** — re-layouts the SVG gradient every
  frame on the UI thread; the counter-translate pair is pure GPU compositing.
- **A transparent 1×1 `image` to route around the no-image plugin bugs** — the
  with-image path does generate a correct storyboard, but a phantom asset in
  `app.json` cannot carry its own "why"; the local plugin states it.
- **`Motion` tokens for the timeline** — rejected for the same reason
  `Deck.spring` lives on `Deck`.
- **Gating the collapse on the first Today query** (the spec's hold branch) —
  regularly stretches the splash 0.5–1.5s+, unbounded on bad networks, for a
  Board whose crown is identical either way.
