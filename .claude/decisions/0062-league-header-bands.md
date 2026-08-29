# 0062 — League header bands in FINISHED TODAY come from a front-end `LeagueBand` map, not the backend tint

- **Date:** 2026-08-28
- **Status:** Accepted — not yet verified on the simulator
- **Decided by:** Ed Medina

## Context
The FINISHED TODAY card groups full-time results by competition under a header
row (league mark + the provider's uppercase name). All five headers sat on the
same `card` grey, so the groups only read by their text. The ask was a
league-specific background per header: LaLiga `#FF4B44` (later darkened to
`#A8231F` — the LaLiga mark is that same red and disappeared on the band), Premier League
`#37003C`, Bundesliga `#FF404A`, Serie A a left→right gradient
`#225696 → #0D8EFE`.

The backend already ships a per-league tint, `LeagueRef.accentColor`, but it is
**null on Serie A and segunda** by design, cannot express a gradient, and its
values were picked for the week grid's colour bars, not for a band the label sits
on. Changing them is a `senpai-backend` change (`types.ts` docblock), and the
brand colours here are a design call for this surface alone.

## Decision
1. **A `LeagueBand` token map in `@/constants/theme`**, keyed by **API slug**
   (`laliga`, `segunda`, `premier-league`, `bundesliga`, `serie-a` — ⚠ `segunda`,
   not the `segunda-division` CRONOGOL-API's prose uses; the first cut keyed on
   the wrong one and the band silently never applied),
   each entry `{ solid }` or `{ gradient: [from, to] }`. Hexes stay out of the
   component, per CONVENTIONS. `accentColor` stays fetched and unconsumed; its
   docblock now says so.
2. **Segunda (LaLiga Hypermotion) shares LaLiga's red** — same brand family.
   Both use the dark `#A8231F`, not the brand `#FF4B44`: a band must sit well
   below the tone of the mark drawn on it, or the mark vanishes (it did).
   **Segunda also borrows LaLiga's mark**: `/cronogol/leagues` ships
   `logoUrl: null` for it, so `FinishedToday` has a `SISTER_MARK` alias
   (`segunda → laliga`) resolved from the same fixture-window payload. If LaLiga
   did not play that day the mark is absent — a blank, not a broken image.
3. **A slug with no entry renders the neutral header** — card grey,
   `textSecondary` label. On a band the label is full `text` ink; the mark is
   unchanged (`logoUrls.icon ?? logoUrl`).
4. **The gradient is drawn with `react-native-svg`** (already a dependency,
   already used by two atoms): an `absoluteFill` `<Svg>` behind the row's
   children. `expo-linear-gradient` was not added.

5. **The band is always thinner than a match row.** `Spacing.two` padding
   around an 18pt `Size.leagueBandMark` = 34pt, against the rows'
   `Spacing.three` + 26pt `crestRow` = 50pt. It is a divider; it must never
   compete with the data rows for height.

## Consequences
- A fifth league needs a line in `LeagueBand` — a front-end deploy — which is
  precisely what `accentColor` was introduced to avoid. Accepted: the bands are
  brand colours chosen per surface, and an unlisted league degrades to the
  neutral header rather than breaking.
- `leagueHeader` gained `overflow: 'hidden'` for the Svg; the card's own
  `overflow: 'hidden'` + `Radius.group` clips the first band's top corners.
- Only FINISHED TODAY paints bands today. If a second organism wants them, the
  band becomes a molecule — not before (CONVENTIONS' promote-on-second-use rule).

## Alternatives considered
- **Read `LeagueRef.accentColor`** — null on Serie A/segunda, no gradient, and
  re-picking is backend work; the surface's colours would be decided in a
  database this design does not own.
- **`expo-linear-gradient`** — a native module for one row; forces a dev-client
  / EAS rebuild. `react-native-svg` does the same job with zero new natives.
- **Bands on every league header app-wide** — out of scope; only this card has
  multi-league headers.
