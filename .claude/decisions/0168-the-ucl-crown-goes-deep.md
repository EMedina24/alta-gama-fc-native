# 0168 — The UCL crown goes deep, keyed by the one non-API slug in the band table

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  Matchdays and Table on the cup tab (deep indigo, white ink, banner lockup intact),
  the `?only=league-tint` gallery, and the harness's printed contrast table.
  ⚠ Read-path verification only (stored league edited in the container — 0166's
  limit); the write path is untouched here.
- **Decided by:** Ed — *"lets make a plan to do the UCL and Bundasliga please. UCL
  main color is #041181"*, plus one asked call: the band row is SHARED, so Today's
  finished-section UCL header takes the same blue (he chose that over a crown-only
  table).
- **Amends:** [0164](./0164-the-crown-and-the-page-take-the-league-hue.md) /
  [0165](./0165-the-league-crown-goes-deep-and-the-head-restructures.md), whose
  "the UCL wears the brand" statements were **descriptive, not principled** — the UCL
  had no band row, *therefore* brand. Ed supplying a colour is what expired the
  premise. [0150](./0150-champions-league-is-a-competition-not-a-league.md) stands
  untouched: the UCL is still a competition, still not in `LEAGUES`, still off the
  domestic pagers.

## Context

Every deep crown flows from a `LeagueBand` row keyed by **API slug** (trap 34). The
UCL has no API slug at all — no `/cronogol/leagues` row, no `/cronogol/standings`
row; `Competition.slug` (`champions-league`) is documented as "the tab key and
nothing else, never sent to the API." So banding the UCL forced a keying decision,
not just a colour.

## Decision

1. **`LeagueBand` gains `'champions-league': { solid: '#041181' }`** — Ed's hex;
   there is no wire value to disagree with. The key is `UCL_LEAGUE_PHASE.slug`, the
   string every screen already passes around, and the table's docblock now names it
   as the ONE exception to the API-slug rule. `Competition.slug`'s "never sent to
   the API" contract is not violated — nothing in the theme path reaches the wire.
   No new mechanism: `leagueInk` → `CrownDeep` ladder → white ink all compose free,
   and `entried = Object.keys(LeagueBand)` auto-enrolls the slug in every harness
   ramp/ink section. #041181 lands at H 234° (distinct from Serie A's ~217), S 94
   clamped to 85; its deep top stop `#081268` rates white 16.19 / dim 6.72 — the
   strongest row in the table.
2. **Both cup tabs stop passing `null`**: Matchdays `isCup ? UCL_LEAGUE_PHASE.slug :
   league.apiSlug`, Table `active.kind === 'league' ? … : UCL_LEAGUE_PHASE.slug`.
   ⚠⚠ The guard is STILL the point on both — `league`/`active.league` are the
   LaLiga/`LEAGUES[0]` FALLBACKS on the cup tab, and their `apiSlug` would paint the
   cup crown a domestic red. Only the cup's own answer changed. Clubs is untouched:
   it clamps a stored `champions-league` to a league by design and can never show a
   cup crown.
3. **Harness §1 shrinks to the two unbanded Latin competitions**
   (`lpr-pro-clausura`, `liga-nacional-apertura`) — the tone-coupling pin (unbanded
   ⇒ brand ramp ⇒ DARK ink) keeps its teeth through them.
4. **Today's finished-section UCL header** takes the blue automatically
   (`FinishedToday` reads the same table) — approved, not incidental.

## Consequences

- The UCL is now findable in `LeagueBand` by a non-API slug: anything that iterates
  the table and assumes every key resolves through `findLeagueByApiSlug` would get
  `undefined` for this row. Nothing does today; the docblock warns.
- "Absence is the fallback" now has exactly two league-catalogue examples, and both
  are scraped Latin leagues with no brand hex on file — the brand-crown path is no
  longer exercised by any European tab.
- A future second competition (Europa League, say) has a template: a hex from Ed, a
  band row keyed by its tab slug, two tint call sites.

## Alternatives considered

- **A separate crown-only colour table** — rejected by Ed when asked; two tables
  keyed by the same slugs is two places to disagree (trap 72's shape), and the Today
  header band is a feature, not a leak.
- **Adding `apiSlug`/`themeKey` to `Competition`** — machinery for one string that
  would equal `slug` anyway; the docblock exception is smaller than the field.
