# 0175 — The Board wears the reader's background: club and league crowns as a preference

- **Date:** 2026-09-14
- **Status:** Partly superseded — the Background row and the layout-only reset superseded by [0199](./0199-the-board-edits-in-place-the-kits-way.md). Was: Accepted — harness-verified (league-theme's new club sweep,
  preferences' grammar cases, board-layout regression), `tsc`/lint clean, and
  **simulator-verified on an iPhone 17 Pro**: the tray row above the add tray;
  the picker at 0.72 with the crown recolouring LIVE behind it (Default → the
  bright brand crown with dark status glyphs; Serie A → the gradient crown +
  diamond mark; Real Madrid → served-colour navy + bled crest; RB Leipzig →
  `TINT_FALLBACK` red + bled crest); graphite steel-blue on the colourless
  Puerto Rico clubs; selection frame; Close; cold-relaunch persistence; view
  mode with the avatar on `ground` ink over a deep background; news/result
  cards over a re-hued mesh. ⚠ Not hand-checked: airplane-mode relaunch with a
  club pick (the never-rewrite rule is code + harness), Reset-leaves-`bdBg`
  (one-line writer, no `bdBg` touch), VoiceOver.
- **Decided by:** Ed — *"when the user enters edit mode … an option for
  backgrounds should be present … I select Barcelona or Real Madrid, the
  background color should change to the selected club's colors and their crest
  should appear as part of the background similar to the matchday screen."*
  Two calls asked and answered before building: the picker offers the **full
  catalogue** (~100 clubs grouped by league, not just followed clubs), and the
  entry point is a **row in the edit tray**, not a crown chip.
- **Amended by [0177](./0177-the-club-crest-steps-forward.md)** — the
  "crest alpha pinned to `CrownArt.alpha`" clause: the club crest's alpha
  decoupled (0.095 → 0.18) with its own two-tier harness proof.
- **Follows:** [0174](./0174-the-board-is-the-readers.md) (edit mode, `bd*`
  preferences), [0164](./0164-the-crown-and-the-page-take-the-league-hue.md) /
  [0165](./0165-the-league-crown-goes-deep-and-the-head-restructures.md) (the
  deep crown and its ladder), [0166](./0166-the-preferences-comparator-walks-its-own-keys.md),
  [0030](./0030-sheets-are-presented-by-the-root-stack.md),
  [0093](./0093-sheets-on-their-own-ground.md).

## Context

The Board wears the brand's bright crown; Matchdays/Table wear their league's
deep crown with a bled mark. 0174 made the board's *layout* the reader's; this
extends the same principle to its *paint*. Nothing could theme a crown from a
CLUB: `leagueCrownTheme` was the only producer, keyed by league slug, and club
colours (`TeamView.colorPrimary` + `TINT_FALLBACK`) fed only the rail bubbles
and card washes.

## Decision

1. **One scalar preference, `bdBg`** — `'default' | 'league:{routeSlug}' |
   'club:{clubSlug}'`, grammar in new pure `lib/board-background.ts`
   (plain-node, proven in the preferences harness). A scalar because `same()`
   covers scalars by walking keys; an object field would compare by reference
   and re-ship the 0166 bug. `SCHEMA_VERSION` 7→8, `FOLLOWED_RULE_VERSION`
   unmoved. ⚠⚠ A league pick is validated against the CATALOGUE
   (`parseLeagueSlug`'s rule); a club pick **syntactically only** — the club
   catalogue is remote and `parse()` stays pure and synchronous. A club slug
   the catalogue cannot answer (query loading, offline, club dropped) renders
   the brand default and **never rewrites the stored value**: a transient
   network failure must not destroy the pick.

2. **`clubCrownTheme(hex)`** beside `leagueCrownTheme`, sharing the extracted
   `deepTheme` ladder-painter. The caller passes `clubTint(team)` — primary →
   secondary → `TINT_FALLBACK` → graphite stays club-wash's one rule in one
   place. **Solid, never a primary+secondary gradient** (most secondaries are
   white/black/unusable; "Barcelona is blue, never purple"). Graphite takes
   the `CrownDeepSat` clamp — a colourless club wears a deliberate steel-blue.
   Unparseable hex → the literal brand tables by reference, the no-league
   path's own identity contract.

3. **⚠⚠ New `CrownClubDim` — the league ladder alone is NOT safe for an
   arbitrary hex.** `CrownDeep`'s lightness band was proven over the league
   catalogue, which happens to be all LOW-luma hues (reds, blues, one purple).
   The harness's new exhaustive club sweep failed AA across roughly hue
   20–205: at the same HSL lightness a yellow/green/cyan band is brighter to
   the contrast maths, and even neutral grey at L 22 clears AA by only 0.02.
   The club path therefore scales the whole ladder's lightness by hue —
   piecewise-linear control points `[(12,1),(60,0.52),(180,0.54),(212,1)]` —
   `ClubWash.lightMaxBright`'s "yellow and green read a step lighter" move at
   crown scale. Numbers from the sweep (every hue × the sat window, 8-bit
   round-tripped, worst case 4.53:1 vs AA 4.5); the harness now proves every
   possible club hex, all 45 `TINT_FALLBACK` entries and graphite, bare and
   under the crest composite. Move a point, re-run the harness.

4. **`ScreenScaffold.crownOverride`** — `{ theme: CrownTheme; art?: ReactNode }`,
   outranking `tintLeague`. Theme and art travel TOGETHER, extending "tone
   ships with the stops" to the art the ink was measured under. A league pick
   needs no new API: the board passes `tintLeague` and rides the exact
   Matchdays/Table path, bundled mark and all. A club pick's watermark is a
   remote crest through `FadeOutImage` (`crestSrc(…, 'card')` — club-hero's
   own ask; ⚠ there is no `'large'`), sized/faded by new `CrownClubArt`, whose
   **`alpha` is pinned to `CrownArt.alpha`** — the harness rates every ramp
   with white composited at that alpha, and the club crest is only covered by
   that proof while it renders at the same one (asserted, not commented).

5. **The picker is a root-stack formSheet at detent 0.72** (`calendar-ucl`'s):
   the board's crown stays visible above the sheet, and the pick recolouring
   it live IS the preview — picking writes the store and stays open; Close is
   the only way out, nothing pending. Route holds SIX unrolled
   `useTeams(apiSlug)` calls (`TeamView` carries no league field, so grouping
   needs league-scoped rosters; unrolled because rules-of-hooks cannot see
   through a map over a constant). A failed roster shows the league row alone
   — a league pick never depends on the club catalogue. Rows: new
   `CrownSwatch` molecule (the ramp's OPAQUE head, offsets renormalised — a
   half-transparent chip reads as a fault), club rows add a 24pt `Crest`,
   selection is `xi-look`'s accent frame + `accessibilityState.selected`.

6. **The edit tray's Background row sits ABOVE "Cards you can add"**, its own
   `SectionHeader` block — the tray and its reset button are one unit about
   the LAYOUT, and a row wedged between them would read the reset as covering
   the background. It does not: **`resetBoardLayout` deliberately leaves
   `bdBg` alone**; the picker's Default row is the way back. The row is
   SOLID-bordered (dashed means "not on the board") and names what is DRAWN —
   an unresolved club labels itself as the default it renders as.

7. **Tone fallout on the board's crown**: the avatar flips to `tone="ground"`
   on a deep background (clubs.tsx's precedent — crown-tone ink dies on a dark
   band), derived from the same resolved theme the scaffold paints (trap 72).
   Edit/Done `ChipButton tone="crown"` and the hint bar are opaque-grounded
   and legal on either tone. The Default row's label is the brand's own name
   (`Alta Gama`), not "Predeterminado" — which truncates and explains nothing
   the swatch beside it doesn't.

## Rejected

- **Followed-clubs-only picker** — Ed chose the full catalogue when asked.
- **A crown chip entry point** — the crown has room for DONE alone in edit
  mode (0174's own finding).
- **An object-shaped preference** — re-ships the 0166 reference-equality bug.
- **Primary+secondary gradient crowns** — unusable secondaries; the ladder's
  gradient path stays a league-band feature.
- **Rewriting `bdBg` when a club slug misses** — the miss is routinely
  transient (cold start offline); the pick must survive it.

## Found while verifying

- ⚠ The sheet's sticky title bar must be **two views deep** (`account-sheet`'s
  own documented finding, re-hit here): RN hoists a sticky child's style onto
  its wrapper, so a flat `flexDirection: 'row'` bar renders as a column. The
  outer view carries ground + bleed, the inner `barRow` carries the layout.
