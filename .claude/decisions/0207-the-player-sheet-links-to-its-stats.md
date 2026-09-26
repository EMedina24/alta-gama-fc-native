# 0207 — The player sheet links to its stats

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean. Lint is unchanged (the 5 errors and 1 warning were already
    there, none in these files).
  - Simulator-verified in `es` against production. Barcelona → Joan García →
    Season stats opens on Jugadores with him selected, not the top scorer.
    Barcelona → Lamine Yamal switches to his figures. Arsenal → David Raya
    shows no button. The tap was driven by a temporary timer in the route,
    since removed, not a finger. `en` is not hand-checked.
- **Decided by:** Ed: *"lets add a CTA that links to that players Stats page"*.
  He was offered a lime button, an `ActionRow`, or an outline button, and chose
  the **lime button**. He was offered showing it for every addressable player
  or only those with figures, and chose **every addressable player**.
- **Follows:** [0033](./0033-player-detail-sheet.md) (the sheet) and
  [0141](./0141-season-stats-reads-one-block.md) (the screen and its
  `stats-player` store). [0146](./0146-season-stats-supersedes-no-player-endpoint.md)
  kept totals out of the sheet with *"link, if anything"*. This is that link.

## Context

The only way from a player to their season figures was: club page → Season stats
→ Jugadores → Cambiar → pick them again. The sheet already holds what the
screen needs, with no new request: `player.slug` (the only key the stats route
takes) and the club's league (via the standings it already reads for the season
label).

## Decision

- **A `primary` button, "Ver estadísticas" / "See season stats", sits above
  "Listo".** It is the sheet's one accent control. The lime position chip is a
  label, not a control.
- **The gate is `statsSlug(player, league)`,** the same function that builds the
  Season stats screen's player list and decides whether it draws a Players
  segment. Where it passes, the player is on that list. Where it fails, no
  button is drawn, because it would open a screen with no Players view. The
  route decides; `PlayerSheet` only draws the button when handed `onOpenStats`.
- **Shown for players with nothing to count yet.** A block with zeros renders
  its zeros, and a player with no block lands on `PlayerEmpty`, which keeps the
  name and the Cambiar chip. Both are designed landings, and gating on
  figures would cost a request on every sheet open and a height jump in a
  `fitToContents` sheet.
- **The order is: commit, dismiss, push.** `chooseStatsPlayer(club, slug)`
  first, because the screen reads the store on mount and `setParams` after
  `back()` is the race the store exists to avoid. Then `router.back()`, so the
  card is not pushed inside the formSheet. Then `push` with `mode: 'players'`,
  the param 0141 added for opening on that view.
- **The footnote loses its last clause** ("en esta ruta no hay partidos jugados
  ni goles"). Under a button labelled *statistics* it read as a contradiction.
  The load-bearing sentence, the one explaining blank cells (0033), stays.

## Consequences

- The choice persists in memory for the session, as the store intends. A later
  visit to Season stats → Jugadores opens on the player last sent from a sheet,
  not on the top scorer.
- Only the league flag stands between the Premier League and this button.
  ⚠ **As of 2026-09-25, PL slugs are NOT null.** All 49 Arsenal squad rows
  carry one, and `/cronogol/players/david-raya/stats` answers `200` with three
  `premier-league` blocks. `leagues.ts` and `stats.ts` still describe PL slugs
  as null (verified 2026-09-10) and keep `playerStats: false`. Turning it on
  is its own decision: the whole Season stats Players view would change with
  it, so it was not flipped here.

## Alternatives considered

- **`ActionRow`** (bars glyph, title, body, chevron). It matches the club page's
  entry rows but is heavier than one action on a sheet needs. Declined by Ed.
- **Outline button.** Quieter but still lime. Declined by Ed.
- **Show only when the player has figures.** Declined for the reasons in
  Decision above.
- **Push straight from the sheet with a `player` route param.** It would stack
  a card inside the formSheet, and it would add a second way to name the
  selection beside the store 0141 settled on.
