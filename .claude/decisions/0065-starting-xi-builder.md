# 0065 — The Starting XI builder, nested under the club page

- **Date:** 2026-08-29
- **Status:** Accepted — pure logic harness-proven (94 assertions); not yet verified on the simulator
- **Decided by:** Ed Medina, with Claude

## Context

The web app has a squad builder at `altagamafc.com/{lang}/starting-xi/{club}`:
drag eleven registered players onto a pitch, pick a shape and a look, export a
1080-px card. Its data is already ours — `GET /cronogol/teams/{slug}/squad` —
and there is **no lineup endpoint and none is coming** (`CRONOGOL-API.md`, "No
lineups"), so the whole feature is client state over a cached read.

The design pack `handoff_squad-builder/` re-thought it for one thumb: tap a
slot, tap a player; the squad on a rail under the pitch; panels as sheets; one
share path. Several of its assumptions did not survive contact with this repo
and are settled here.

## Decision

1. **Route: `/club/[slug]/starting-xi`**, a sibling of the club page, which
   became a folder route (`club/[slug]/index.tsx`). **No `club/_layout.tsx`** —
   that would nest a stack inside the root stack — and the route string
   `/club/[slug]` is unchanged, so every existing push and the deep-link table
   still typecheck.

2. **The entry row is enabled off the SQUAD, not the league.** The handoff
   gated on `league === 'laliga'`, but the club screen has no league param and
   the backend serves squads for LaLiga **and** the Premier League (the
   handoff's "LaLiga Primera only" was stale when written). `players.length > 0`
   is the condition the API actually expresses; elsewhere the row stays, inert,
   with the `squadEmpty` copy — an explained row reads as missing data, a
   removed one as a missing feature.

3. **Placements key on the person `id`, never the shirt.** Shirt is
   `number | null` on the wire and Premier League squads duplicate numbers
   (ADR 0033). The handoff's `formations.ts` keyed on shirt and was re-typed,
   not copied. A null shirt renders initials on the token, never `0` or `—`.

4. **Eleven formations, the web's list.** The handoff's nine hand-measured
   tables are ported verbatim; `4-3-2-1` and `3-4-2-1` (added to the web on
   2026-08-23) are derived from rows the other tables already prove, under the
   same rule — ≥16% of pitch height between slots sharing a column, ≥19% of
   width on a line, keeper at 89, no defender below 72. `spacingViolations()`
   turns the rule into code and the harness asserts it for all eleven, so a
   nudged number fails before it ships.

5. **`reseat` is by line, not by position** (the web's `reseatLineup`, not the
   handoff's positional re-seat): a defender stays a defender going
   4-3-3 → 3-5-2. **`autoFill`'s fallback skips keepers for an outfield slot** —
   the handoff's "next unused player" put the backup goalkeeper at right back.

6. **State: a pure reducer + a sibling store.** `features/starting-xi/lineup.ts`
   is the only thing that changes a lineup and returns an `effect` the screen
   maps to a haptic. Persisted state (formation · look · placements · title,
   per club) lives in **`store/starting-xi.ts`**, a sibling of `preferences.ts`
   with its own key and version — it is unbounded and per-club, and a shape
   bump there must never be able to touch `followed` (trap 24). The selection
   and the export size are deliberately NOT stored (web parity). Departed
   players are hidden at render and pruned inside the next user action, never
   in an effect.

7. **Three root-stack `formSheet` routes** (`xi-shape`, `xi-look`,
   `xi-export`), per ADR 0030. They share no React state with the builder: they
   write the store and the screen re-renders underneath them, which is what
   makes a shape change re-seat the eleven live under the sheet.

8. **Export renders a TRUE 1080-px card off-screen** with
   `react-native-view-shot`: `LineupCard` is authored in 1080 card units ×
   `scale`, the capture host lays it out at `1080 / PixelRatio` points, and the
   PNG comes out 1080 wide on any density — never a screenshot of the 361pt
   pitch scaled up. The host lives in the **screen**, not the sheet (a 9:16 card
   at @3x is 640pt, taller than any detent); the sheet reaches it through a
   registered capture function in `features/starting-xi/export.ts`, the one
   file that imports view-shot, `expo-sharing` and `expo-media-library`. Save
   asks for Photos **add-only** permission. The Angled look tilts the on-screen
   pitch only; the card never tilts. Default look is **Turf**, the web's default.

9. **Drag a PLACED token onto a teammate to swap** — `react-native-gesture-handler`,
   its first use here, with `GestureHandlerRootView` now outermost in
   `_layout.tsx`. Only filled tokens get a `GestureDetector`
   (`Race(Pan, LongPress, Tap)`); the ghost is a reanimated clone; the drop
   hit-tests slot centres on the UI thread. The screen is a fixed column with
   no vertical `ScrollView` so the pan never competes with a scroll.

10. **Long-press → `ActionSheetIOS`** (Swap · Remove · Player page); **Clear →
    `Alert`**. Both built-ins, zero deps, iOS-only app. `@expo/ui`'s context
    menu was declined: alpha, unused elsewhere, and its native recogniser would
    fight the pan on the same token. "Player page" is the existing
    `(sheets)/player` route — a cache read.

11. **Four dependencies added**: `expo-haptics`, `react-native-view-shot`,
    `expo-sharing`, `expo-media-library` (all SDK 57 pins). Each is imported
    from exactly one file (`haptics.ts`, `export.ts`). They are native: a dev
    client built before them throws at import.

12. **`tsconfig.json` now excludes `handoff_*/**`.** The handoff's
    `ClubStartingXIRow.tsx` cannot compile here (no `theme` export, no `t()`,
    no `PitchGlyph`) and design source should never gate `tsc`.

13. **Left out:** club switching (reached *from* a club; a switch would throw
    the XI away — the handoff's open question, answered "no"); the web's
    Instagram / X / Facebook buttons (iOS has one share sheet).

## Consequences

- New: `features/starting-xi/{formations,lineup,card-geometry,export,haptics}.ts`,
  `store/starting-xi.ts`, atoms `pitch-glyph` · `slot-token`, molecules
  `pitch-surface` · `pitch-slots` · `rail-card` · `hint-line` · `xi-toolbar` ·
  `starting-xi-row`, organisms `starting-xi-board` · `squad-rail` ·
  `lineup-card` · `xi-shape-sheet` · `xi-look-sheet` · `xi-export-sheet`,
  routes `club/[slug]/starting-xi.tsx` and `(sheets)/xi-{shape,look,export}.tsx`.
- `Chevron` gained `direction: 'right'`; theme gained the `xi*` sizes/type and
  the pitch colours; `copy.startingXi` in both languages.
- `app.json` carries the `expo-media-library` plugin (`NSPhotoLibraryAddUsageDescription`).
- ⚠ `Size.xiToken` (46) is the number every table was measured against.
  Change it and re-measure.
- ⚠ A new sheet route needs its `Stack.Screen` line in the root stack or it
  renders full-screen (trap 19) — three were added.

## Alternatives considered

- **Nine formations only** — would put the two surfaces out of step for two
  shapes; the derivation cost is one harness assertion.
- **In-screen bottom sheets** — no library installed; hand-rolling one and
  fighting the keyboard for the title field is more than three root-stack lines.
- **Capture inside the export sheet** — cannot hold a 9:16 card; and the sheet
  would then own an off-screen view for a screen it does not render.
- **Skia / manual PNG composition** — a second renderer for the same card; the
  preview would stop being honest.
- **`@expo/ui` context menu** — see decision 10.
