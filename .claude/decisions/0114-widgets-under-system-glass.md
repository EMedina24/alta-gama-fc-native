# 0114 — The widgets under the system's glass (Tinted/Clear home screens)

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed (direction: "polish system glass mode" chosen over a
  default-appearance restyle and over fake wallpaper transparency)
- **Amends:** [0104](./0104-widgets-adopt-the-app-shell.md) §8 — `GlassSurface`
  no longer bails to bare content in `.accented`; the vibrant bail stands

## Context

Ed asked for the home-screen widgets to be "transparent (liquid glass) like the
board cards". Two facts bound what that can mean:

1. **iOS never shows the wallpaper through a widget in the default
   appearance.** Real glass exists only when the READER sets the Home Screen
   style to Tinted (iOS 18) or Clear (iOS 26): the system removes the container
   background, draws its own glass slab, and renders the widget in `.accented`
   mode — unaccented content tinted white AT ITS OWN OPACITY, views marked
   `.widgetAccentable()` taking the system tint. There is no API to force it
   (`.widgetTexture(.glass)` is visionOS-only), and painting our own real
   glass is trap 52 — `glassEffect()` in a widget erases its own subtree.
2. The widgets already *survived* accented mode (0104's guards return
   `Color.clear` / bare content), but nothing was ever DESIGNED there, and the
   mode had never once been rendered.

So the work is: make accented mode a designed surface. The default full-color
appearance does not change; the Lock Screen accessories (`.vibrant`) keep the
treatment they already have.

## Decision

**The key mechanic everything follows from:** accented rendering preserves
OPACITY while flattening COLOR to white. The `Tok` white-alpha system — the
ink ramp, `glassFill`/`glassLine`, `hairline` — therefore survives untouched,
by construction. What breaks is everything that is not white-alpha: the lime,
and anything BLACK, which tints toward white and *inverts* (a scrim that
darkened now lightens — trap 60).

1. **`GlassSurface` paints in `.accented`: fill + 0.5pt hairline, nothing
   else** (`Shell.swift`). The panels must stay delineated — the YOUR WEEK
   rail's layout leans on "the glass edge is the seam" (0086), and the NEXT
   ledger and NEWS rows are panels by design — and white-alpha fills render
   faithfully under the tint. Each omission is load-bearing: the `recess`
   scrim is black .28 and would tint to white .28, LIGHTENING the panel it
   exists to sink; a lime ring would tint to plain white anyway; the lit
   `plateTop` edge is the system slab's own job, and a second painted light
   reads as a smudge on it. `.vibrant` still gets bare content (0104's rule,
   unchanged), and `MeshPlate` still hands every non-fullColor mode
   `Color.clear`.
2. **The lime voice is marked `.widgetAccentable()`, at CALL SITES only** —
   never inside `Mark` or `W.eyebrow`, because the Lock Screen accessories
   chose their own accentable set in 0047/0080 and must not move. The roster:
   the header eyebrow + `Mark` on all three tiles, `LiveEyebrow`, the TU
   SEMANA capsule (one group — text, wash and ring tint together), the spoken
   day and inline day tag, the NEWS topic eyebrow, the imageless lead's lime
   rule, `EmptyState`'s `Mark`, and every followed-club name via
   `.widgetAccentable(followed)` — conditional, mirroring the lime, so "which
   side is yours" survives the mode that erases color. `.widgetAccentable()`
   is iOS 16, so the 17.0 floor compiles it ungated.
3. **The NEWS lead draws its photo only in `.fullColor`.** The fade under the
   headline is `Tok.scrim` — near-BLACK by design (0104) — and under accented
   rendering it becomes a white .62→.94 wash that erases the picture and
   drowns the white headline ON it. The gradient cannot opt out the way the
   photo does (`widgetAccentedRenderingMode` is declared on `Image` alone),
   and moving the meta below the photo spends height on the one tile whose
   budget has never been rendered (0104: 326pt claimed against ~344). A
   tinted render takes the existing imageless branch — the lime-ruled
   headline block, designed to look deliberate at any width. The 44pt
   `HeadlineRow` thumbs keep their `.fullColor` opt-out: no text sits on
   them.
4. **`CrestView` is untouched.** Artwork already opts out to `.fullColor`
   (0104); the widgets' fallback tiles are `tone: .open` — white-alpha ring
   and letters that survive the tint on their own. `_shared/` behavior is
   unchanged, so the Live Activity and both notification extensions compile
   exactly what they did.
5. **Stale prose corrected** where it still claimed iOS 26 draws real
   `glassEffect(.clear)` (`Tokens.swift` glass tokens, `MatchActivity.swift`
   floodlights note) — false since 0104, and exactly the kind of comment that
   gets a future session to "restore" trap 52.

## Consequences

- On a Tinted/Clear home screen the tiles now read as the system's glass
  cards: panels delineated, hierarchy carried by the ink ramp's opacities,
  brand voice and followed side distinct through the accent group, crests and
  news thumbs in full color.
- ⚠ The accented fill is `glassFill`/`glassFillDim` (white .06/.05) — the
  same tokens as full color. If they read too faint on the real slab, the fix
  is a separate accented value chosen ON THE SIMULATOR, not a bump to the
  shared token (the full-color mesh calibration in 0104 depends on it).
- ⚠ **"A bit more transparent" in the default appearance was tried and
  measured dead** (2026-09-05, Ed's ask): `Tok.ground` at 0.5 alpha rendered
  on the simulator composited over BLACK, not the wallpaper — a clean tile
  pixel read (13,28,36) while the wallpaper directly beside the tile read
  (67,108,203); a real blend would have been ~(41,63,112). Container-
  background alpha can only DARKEN a full-color widget. The one dark-glass
  look that shows the wallpaper is the system's Clear mode in dark
  appearance. Recorded at the paint site in `MeshPlate`.
- ⚠ Setting `.environment(\.widgetRenderingMode, .accented)` in a preview
  flips OUR branches but does NOT reproduce the system's white-tinting — the
  simulator with the home screen actually set to Tinted/Clear is the only
  ground truth (trap 52's lesson wears a second hat).
- ⚠ Verification note: typechecked at every target's floor (17.0 widget /
  16.4 content / 18.0 service). The visual pass needs a by-hand step — the
  simulator cannot script the Customize → Clear toggle (no idb, osascript
  blocked); screenshots are scriptable after it.
- The publisher name (`tileInk`, opaque `#8fa0a6`) tints to full white in
  accented mode and reads one step brighter against the age text than in full
  color — recorded, accepted; an opacity twin of that token is not worth
  minting for an 8.5pt label.

## Alternatives considered

- **Restyle the default appearance toward a single glass card** — rejected:
  0104's "each tile is the card, the surfaces inside it are panels" already
  IS the board-card design at tile scale, and no painted change shows the
  wallpaper.
- **Fake transparency via a wallpaper screenshot the reader crops** — the
  widget-app hack; rejected as brittle (breaks on wallpaper change and
  per-slot position) and a large in-app setup flow for a look iOS 26 grants
  for real.
- **Restore `glassEffect()` on the current SDK** — not attempted; trap 52
  requires re-testing on a PLACED widget before any restore, and the
  mechanism (an archived render with no backdrop to sample) is
  architectural, not a bug that patches out.
- **The NEWS lead keeps its photo with the meta moved below** — rejected
  until the large tile's height budget is verified at all (0104); the
  imageless branch spends nothing.
