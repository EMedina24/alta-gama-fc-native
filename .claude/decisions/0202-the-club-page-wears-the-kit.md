# 0202 — The club page wears the kit

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there); `league-theme-harness` passes, including the new club scene pass
    (§8).
  - **Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production:**
    - Barcelona (followed, LaLiga), Arsenal (not followed, Premier League),
      Internazionale (Serie A: KEY PLAYERS hidden), Real Madrid
    - the Fixtures tab (Valencia) and the Squad tab (Sevilla)
  - ⚠ **Not hand-checked:** the share sheet, the follow and See all taps, and
    Spanish.
- **Decided by:** Ed: *"Lets redo the club page to match the design using
  /medina-digital-design"*, with the kit's club screen. Four calls, asked
  before building:
  1. **Calendar, Starting XI and Season stats move into the tabs.**
  2. **Clean sheets and G+A** replace the kit's xG and ratings.
  3. **Solid "Follow", outline "Following".**
  4. **The club scene takes two colours.**
- **Supersedes on this page:**
  - [0091](./0091-club-page-hero-and-trays.md)'s layout: the bled hero wash,
    the competition back pill, the POS/PTS/GD/FORM strip, the NEXT UP card and
    the alerts/calendar tray
  - [0097](./0097-club-hero-following-pill.md)'s FOLLOWING chip. Its rule
    survives: following is never solid lime, and the tap confirms in the sheet.
  - [0141](./0141-season-stats-reads-one-block.md)'s entry `ActionRow`
  - [0196](./0196-lime-glow-replaces-the-mesh-on-stack-screens.md)'s
    `LimeGlow` on the club page
  - the club-wash "one colour, never purple" rule, **for this scene only**

## Context

The kit's club screen, top to bottom:

1. glass back and share circles
2. the crest leading a Saira name, with a rank line under it
3. a full-width follow button
4. a segmented control: Overview, Fixtures, Squad
5. Overview: FORM, NEXT MATCH (both sides around a dash), SEASON SO FAR (three
   tiles), KEY PLAYERS
6. the club's two-colour scene behind it all, with its crest watermarked at
   the top left

Ours had the same data in a different order, on a lime glow.

## Decision

1. **The scene.**
   - `SceneGround kind="club"`, the geometry from 0201 turned for a club: the
     glow and the crest watermark at the top **left** (`ClubScene`), with the
     same wash and base lightness.
   - `clubSceneTheme(team)`: the base is `clubTint`'s hue at the scene's base
     lightness. The glow is the club's **secondary** where both colours are
     usable, otherwise the base hue. Its lightness goes through `clubDim`, so
     a yellow glow cannot blow out the head.
   - Barcelona is blue with a garnet glow, as in the mock.
   - Harness §8 rates white at the glow's hottest point and the subline at its
     reach. Over 45 fallback tints, graphite and 36 primary/secondary pairings
     (vivid opposite, white, yellow), the worst cases are white 4.76 and
     subline 3.44.
2. **The hero** (`ClubHero`, rebuilt):
   - `GlassIconButton` back and share (new atoms, drawn `ShareGlyph`, and
     `Chevron direction="left"`)
   - the crest leading the name (0189 kept)
   - `rankLine` ("LaLiga · 1st · 67 Pts" / "LaLiga · 1.º · 67 pts") when a
     standing is quotable (`bandsApply`), otherwise the ground
   - **Follow** is a `Button` with `tall`: `primary` "☆ Follow" when not
     following, `outline` "★ Following" when following (a drawn `StarGlyph`).
     Both open the alerts sheet, and `accessibilityHint` says so.
3. **Share** sends `altagamafc.com/{es|en}/clubs/{slug}` (`clubUrl`, the web
   app's `app/[lang]/clubs/[slug]` route).
4. **The tabs** use the `SegmentedControl` molecule and replace the
   hand-rolled toggle. **Fixtures is the default**: Ed's call right after the
   first build (*"this should default to Partidos"*). The segment order stays
   the kit's, Overview · Fixtures · Squad.
   - **Overview:**
     - **FORM:** the `FormStrip`, when a standing is quotable.
     - **NEXT MATCH:** `FixturePairCard` (new), home first. The eyebrow is our
       league name (0141: never the wire's) plus the matchday. The kickoff
       reads "SAT 10 OCT · 12:30 PM". The centre is `–`, or the score once
       live.
     - **SEASON SO FAR:** GF · GA · **CLEAN SHEETS**, from the merged totals
       (0149). The tiles and a "See all ›" beside the heading open Season
       stats, when there is a block.
     - **KEY PLAYERS:** up to three `PlayerStatRow`s from `keyPlayers()`. The
       third is the G+A **leader** if that is a new person, otherwise the next
       scorer. Real Madrid: Mbappé 7 goals, Vini Jr. 3 assists, Bellingham 3
       goals.
   - **Fixtures:** the calendar `ActionRow` (it moved here from the alerts
     tray), then the spine.
   - **Squad:** the Starting XI row, then the squad.
5. **Why the stats were swapped.** xG and ratings exist at no provider the
   backend holds (CRONOGOL-API.md: "No shots, shots on target, xG, possession,
   passes, saves, duels or ratings"). Clean sheets, goals, assists and
   goal-involvements are served for every league that has player rows.
6. **⚠⚠ Key players join the squad by exact NAME, not by id.** Measured live
   on Barcelona: the leaderboard's `playerId` is our UUID, while the squad's
   `id` is the provider's numeric person id. They never match.
   - The name join gives the shirt number, the position (a new singular
     `positionLabels`; `bandLabels` are the squad's plural group heads) and
     `shortName` ("Raphinha", not "Raphael Dias Belloli").
   - A miss gives a row with no number, never a wrong one.
7. **`StatTile` takes the kit's shape, shared with Today's counters:** the label
   on top (up to two lines, so "CLEAN SHEETS" never truncates), the `statLg`
   value below, a card fill, and an optional `onPress`.
8. **Removed:**
   - `ClubStatsStrip`: its rank and points moved to the rank line, form to FORM,
     and GD is dropped.
   - `ClubNextCard`, and with it the opponent-colour wash.
   - `ClubActions`: alerts go through the follow button, the calendar into
     Fixtures, and the note already lives in the alerts sheet.

## Consequences

- One lime element: Follow when not following. Once followed the page has
  none, except the form chips' W, which is semantic (0193's audit).
- The club page makes three more requests, the league's goals, assists and G+A
  boards. They are keyed per league at `STALE.stats`, so every club in a
  league shares them.
- The two-colour scene is this page's alone. The club crown (the Board's
  wallpaper) still follows the one-colour rule.
