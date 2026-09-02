# 0104 — The widgets adopt the app shell: aurora mesh and painted glass — and `glassEffect` does not work in a widget

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the iOS 26.5 simulator across five sample states; the NEWS tile and the Live Activity are unverified (see the foot)
- **Decided by:** Ed Medina
- **Amends:** [0087](./0087-crown-aurora-shell-adopted.md) §10 (the `targets/` carve-out) · [0085](./0085-broadcast-card-redesign.md) and [0086](./0086-week-widget-hero-and-rail.md) for COLOUR only — every measured number in both stands

## Context

[0087](./0087-crown-aurora-shell-adopted.md) repainted the whole app — ground
`#0a0b0c → #0f1316` under a three-pool aurora mesh, charcoal cards replaced by
glass — and its §10 held the extensions out:

> **Out of scope, deliberately:** `targets/` (widgets and Live Activities keep
> their floodlight look and their hand-copied tokens)

That was the right call for one change and the wrong state to leave behind. The
home screen ended up showing a flat black tile with a lime corner that opens an
app made of lit mesh and frosted glass. The widget is the first surface of this
product most readers touch and the only one they see without launching anything;
it cannot be the one surface still painted in the previous design language.

The obvious reading of "liquid glass" — that the tiles should refract the
wallpaper — is not available. A widget is rendered out of process into an archive
and composited by the system; it cannot sample what is behind it. The intent was
therefore to refract the widget's OWN ground with `SwiftUI.glassEffect()` on iOS
26 and fall back to the painted blend below. **That turned out not to work at
all** — see decision 2.

## Decision

1. **The mesh is the widget's ground.** `Tok.ground` moves `#0a0b0c → #0f1316`
   and a new `MeshPlate` (`targets/widget/Shell.swift`) draws the three aurora
   pools into it, as the `containerBackground` of all three home-screen widgets.
   YOUR WEEK's floodlit `Plate` is deleted.

   ⚠⚠ **It draws theme.ts's new `MeshTile`, not `Mesh`, and copying `Mesh`
   verbatim was tried first and rendered DEAD.** `Mesh` centres two of its three
   pools off the surface (`cx` −0.12 and 1.08); a ~930pt screen still catches
   their cores, a 158pt tile catches only their tails. The first build was a
   grey-green murk with all its colour trapped in the corners and a dead centre
   exactly where the type sits. `MeshTile` pulls the centres onto the tile's own
   edges and widens each fade. **The three alphas are UNCHANGED — they were never
   what was wrong**, which is why this is a geometry entry and not a
   "we made it brighter" one.

   ⚠ Calibrated, not eyeballed: the real Today screen's body ground was sampled
   off a screenshot (`#0f3832` … `#101f1e`, green channel typically 31–45).
   `Mesh` on a tile lands at p90 green 38, `MeshTile` at 45 — the top of the
   app's own range rather than past it. Re-measure the same way before moving
   any number.

   ⚠⚠ **The pools are drawn as sized, `.position`-ed frames inside a
   `GeometryReader`, not with `EllipticalGradient`'s own `center:` /
   `endRadiusFraction:`.** The mesh's pools have INDEPENDENT `rx`/`ry`
   (`0.64 × 0.40`, `0.78 × 0.46`, `0.72 × 0.42`); SwiftUI's elliptical gradient
   fits its ellipse to the view's aspect and takes a single radius fraction, so
   it can express none of them. A frame of `2rx × 2ry` centred at `cx, cy`, with
   the default `endRadiusFraction` of 0.5, reproduces the SVG exactly. This is
   the same substitution 0085/0086 record for `RadialGradient` — resolved here
   rather than approximated.

2. **⚠⚠ `SwiftUI.glassEffect()` DOES NOT WORK IN A WIDGET. It erases its own
   content, silently.** This shipped first with two paths — real glass under
   `#available(iOS 26.0, *)`, painted below — and on the iOS 26.5 simulator the
   entire modified subtree rendered as NOTHING: the YOUR WEEK rail column and the
   NEXT live ledger vanished, text and all, while the eyebrow and footnote around
   them drew normally. Isolated by reducing the branch to a bare
   `content.glassEffect(.clear, in: shape)` with no scrim, ring or overlay: same
   blank tile. It compiles, it typechecks at every floor, the build is clean, and
   nothing appears in any log.

   The mechanism is almost certainly that `glassEffect` is a live backdrop filter
   needing a real rendering context and a real backdrop to sample, and a widget
   archive is neither.

   **So `GlassSurface` is ONE painted path at every iOS version** — `glassFill`
   (or `glassFillDim`), a 0.5pt `glassLine` hairline, an optional 1pt coloured
   ring, and a `plateTop` top edge masked to fade down the sides. That is what
   most of the app itself draws anyway: only `club-bubble.tsx` and
   `next-up-card.tsx` use a real `GlassView`, and both are in-process views inside
   the app. `GlassGroup`/`GlassEffectContainer` was written and then deleted —
   with no glass effect there is nothing to coordinate.

   ⚠ **`deploymentTarget` stays 17.0** regardless — 0055's reason is untouched,
   and with no `#available` branch left there is nothing pulling the other way.

   ⚠ Do not "restore" the glass branch on a newer SDK without re-running the
   check on a placed widget. This failure is invisible in code review, in the
   typechecker and in the build.

3. **Each tile is the card; the surfaces inside it are panels.** No inset glass
   card floating on a mesh — that is the card-inside-a-card 0086 §3 refused, and
   a second radius inside the system's container mask double-rounds every edge
   (0085 §1). So the glass goes on what is genuinely a panel:
   - **YOUR WEEK** — the rail becomes one full-height glass column beside the
     hero; the hero stays open on the ground (glass behind a 27pt ultraLight
     numeral flattens it). The fading hairline divider goes: the column's own
     edge is the seam.
   - **NEXT** — the live ledger becomes a `recess`-scrimmed glass panel, the
     app's own recession idiom (`match-events.tsx`, 0087 §4). The idle layout
     stays open on the ground.
   - **NEWS** — the three headline rows become uniform glass story cards with no
     rules between them, which is [0092](./0092-news-uniform-story-cards.md)'s
     call on the app's news screen arriving here.

4. **`.contentMarginsDisabled()` on all three, and NEXT hands the accessories
   their margins back by hand.** Without it the ground floats in a black frame
   (0086 §3). But the modifier is configuration-wide with no per-family form, and
   NEXT also serves three Lock Screen families. `NextFixtureView` reads
   `@Environment(\.widgetContentMargins)` — iOS 17.0, this target's floor exactly
   — and applies the system's own insets to everything except `systemSmall`, so
   the accessories render as they did.

5. **The crest fallback tile stops being filled.** `CrestView` gains
   `tone: .solid | .open`; the widgets take `.open`, which is what the app's own
   `Crest` atom has always drawn — a ring and a code, no fill (its `raised` fill
   is opt-in behind a `filled` prop). ⚠ `.solid` remains the DEFAULT because this
   file compiles into the notification extensions, whose cards draw on the
   system's material where an unfilled tile has nothing behind it.

6. **A `scrim` token, so the news lead does not follow the ground.** The lead
   photo's fade was drawn in `ground` back when `ground` was `#0a0b0c`. Moving
   `ground` would have quietly lightened it and cost the headline its contrast
   against a bright press photo; `Tok.scrim` pins it at `#0a0b0c` (theme.ts
   `captionScrim`'s base). A scrim's job has nothing to do with the widget's
   ground.

7. **The Live Activity changes by ADDITION only.** The mesh's coolest pool
   (`#1c546c`) is added in the corner theme.ts's `Mesh` puts it, at 0.28 rather
   than 0.50 — it lands on a 152pt card over a photograph, not a 930pt screen —
   and the lit top edge is added. The two lime radials, the green pool,
   `activityGround` and every `Geometry` value are untouched.

   ⚠⚠ **Zero height, because the card measures 152.5pt against Apple's ~160pt
   cap (0085).** Both additions are a `.background` and an `.overlay`, neither of
   which is a layout child.

   ⚠ **No `glassEffect` on this card at any iOS version.** The system already
   composites a Live Activity onto its own material and gives it glass chrome of
   its own on iOS 26; a second material inside reads muddy rather than deeper.
   The widgets may refract because they own their whole rectangle. This card does
   not.

8. **Tinted and vibrant renders get no paint of ours.** `MeshPlate` and
   `GlassSurface` hand back `Color.clear` / bare content whenever
   `widgetRenderingMode != .fullColor`, and crests and news photographs carry
   `widgetAccentedRenderingMode(.fullColor)` (iOS 18+) so club artwork is not
   recoloured. Without this a Tinted home screen renders the mesh as grey mush.

9. **No wire change.** No new strings, so no `copy.ts` entry, no
   `WidgetSnapshot.Copy` field and no snapshot version bump. No `Cadence` value,
   timeline policy or provider touched — the reload budget (trap 34) is
   untouched because this is paint.

## Consequences

- **One rendering path, at every iOS version** — an unplanned simplification,
  and the only good news in decision 2. There is no `#available` branch in
  `GlassSurface`, nothing to keep visually equivalent, and the screenshots below
  are what an iOS 17 reader sees too.
- **The app and the widgets now disagree about what "glass" is, on purpose.** In
  the app it is a real `GlassView` on iOS 26; in a widget it can only ever be
  paint. Anyone porting a surface between the two has to know that.
- **`Tok` grew, against its own "keep this list SHORT" rule** — by the glass
  quad, `plateTop`, `scrim`, the pools and a sibling `Rad`. Accepted: these are
  the design language now, not a speculative mirror. Every value is still a copy
  of a named `theme.ts` value — which is why the retune became `MeshTile` in
  `theme.ts` rather than a number invented in Swift.
- **`theme.ts` now carries a const no screen reads.** `MeshTile` exists only so
  the Swift side has something legal to copy. That is the cost of the
  hand-mirrored token rule, and it is cheaper than the alternative.
- **`Tok.ground` moved, and it was consumed in seven places** — all inside
  `targets/widget/`, verified before the change, so neither notification
  extension moved with it.
- **`Tok.onAccent` deliberately did NOT move.** It is `#0a0b0c`, not theme.ts's
  `onAccent` `#101806`; it is the hole punched through the lime goal disc and has
  to read as dark ground showing through, not as an olive shape. The token now
  says so, because it looks exactly like the drift trap 15 warns about.
- **YOUR WEEK's column arithmetic changed and was re-derived, not eyeballed.**
  Losing the divider and one of the two 13pt gaps took `heroWidth` from
  `(total - 26 - 0.5)` to `(total - 6)`. The model reproduces 0086's measured
  hero columns exactly (157.3 / 162.4 / 177.2 at SE / standard / Max), which is
  what makes it trustworthy; under the new constants the hero gains **11.7pt at
  every width** and the rail's content box lands within **0.2pt** of 0086's,
  because the 8.84pt it gains from the dropped gap is spent precisely on the
  slab's 4.5pt inset.
  ⚠ The first cut used `- 8` and a 5pt inset, costing the rail 2pt — invisible in
  the `?sample=` states, which print `16:15`, and immediately visible on real
  data in a 12-hour locale, where `10:15 am` is much wider and truncated the club
  name beside it. **A locale that widens a numeral is a layout case, and the
  samples do not cover it.**

## Alternatives considered

- **Painted only, no `glassEffect`.** Rejected at planning time on Ed's call —
  the app ships real liquid glass on iOS 26 and the tile beside it should too —
  and then arrived anyway as the only thing that renders. The planned go/no-go
  spike is what caught it before the design was built on top of it.
- **An inset glass card floating on the mesh.** The literal transfer of a Today
  screen. Rejected — 0086 §3 already refused it, and at 158pt there is no room
  for a ground margin AND a card.
- **Bringing the crown's lime→teal ramp into the tile header.** Rejected: the
  ramp would put lime across exactly where the crests sit, which is the cast
  `activityPool` exists to prevent on club artwork we do not own.
- **Re-valuing the Live Activity's floodlights to the mesh palette.** The change
  that would most obviously match the app. Rejected for now — those are 0085
  measured values on the one surface nothing in this repo can render, since the
  server push-to-starts every activity. If it still reads warm after a real push,
  the next move is the GREEN pool's colour, not the lime.

## Verification

- `swiftc -typecheck` clean at `arm64-apple-ios17.0` (widget + `_shared`) and at
  `ios18.0` (notification content + `_shared`) — the real floors. `tsc --noEmit`
  clean for `MeshTile`.
- **Simulator: iOS 26.5, iPhone 17 Pro, both widgets placed on the home screen**,
  driven by the `_debug/widgets` `?sample=` deep links (which fabricate the WIRE
  and run the real `buildSnapshot` — trap 48). Five states seen and correct:
  - `week1` — hero alone at full width, no glass column, left-aligned (0086's
    rule: a hairline with nothing beside it reads as a widget that failed to
    load).
  - `week3` / `week3es` — hero on the mesh, the rail as a full-height glass
    column. ⚠ Spanish worst case fits with no truncation: `R. Sociedad` in the
    hero, `Valladolid` / `Vallecano` / `L. Palmas` in the rail. The 2pt of rail
    content the new column arithmetic costs is not observable.
  - `live` — the ledger as a recessed glass panel, reading a plane below the
    eyebrow and footnote around it.
  - `ft` — the same panel with the full-time hand-off line.
- The unfilled crest chips (decision 5) are visible in every sample, because
  fabricated fixture ids always miss the crest cache. The REAL-crest case was
  seen separately on live data (Betis / Real Madrid) before the samples were
  written.
- The mesh was calibrated against a screenshot of the app's own Today screen,
  not judged by eye — method and numbers in decision 1.

⚠⚠ **Three things remain unseen, and none is small.**

1. **The NEWS tile has never been rendered.** It is not placed on the simulator's
   home screen and a widget cannot be placed without a tap, which cannot be
   scripted here. Its glass story rows, its `Tok.scrim` lead fade and its 13pt
   margins are typechecked and unobserved. ⚠ It is also the tile whose height
   budget is tightest, so it is the likeliest place for this change to overflow.
   The arithmetic says it fits — header 24 + lead 116 + three 58pt rows + two 6pt
   gaps = 326 against ~344pt of content height, where the old layout spent 317 —
   but +9pt on the tile with the least room is exactly the kind of claim that has
   to be SEEN. **First person with the simulator open: long-press the home
   screen, add the large News widget, and check the third row is not clipped.**
2. **The Live Activity.** Nothing in this repo starts one (the server
   push-to-starts it, 0055), so decision 7 is reasoned, typechecked and never
   rendered. Its change is deliberately ADDITION-only for that reason.
3. **Tinted and vibrant renders** (decision 8). No Lock Screen or Tinted-mode
   pass was made; the guards are written from the documented contract.
