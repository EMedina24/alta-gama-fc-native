# 0139 — A live card's crests fall back to the fixture row, because the live route's slugs are the syncing provider's

- **Date:** 2026-09-09
- **Status:** Accepted — harness assertions, tsc + lint at baseline, export clean;
  ⚠ the live visual pass waits for the next match night
- **Reported by:** Ed, off two in-progress cards the same evening
- **Amends:** [0066](./0066-live-route-leads-the-board.md)'s *"the only thing a
  fixture row ever added was crests, and `teamRefFromLive` takes those from the
  club catalogue"* — true for LaLiga, false the moment a second provider's live
  coverage landed.

## Context

Ed's Today crown showed **Liverpool 2–1 Atlético** in play with **Liverpool**
drawn as a lettered tile and Atlético's crest fine; a second card had Napoli
tiled beside a correct Arsenal. Liverpool is a tracked club whose crest the app
renders everywhere else, so "we have no artwork" was not the explanation.

Read live from production at 20:45Z while both matches were still being played:

```
GET /cronogol/live
f3e96945  liverpool-fc v atletico-madrid     83'  2-1
bd1a4cc8  liverpool    v atletico-de-madrid  85'  2-1     ← the SAME match
67cc1959  napoli-459   v arsenal             83'  0-1

GET /cronogol/teams              (tracked only, 111 clubs)
  arsenal ✓   liverpool ✓   napoli ✓   atletico-madrid ✓
  liverpool-fc ✗   napoli-459 ✗   atletico-de-madrid ✗
```

**The backend holds a separate `teams` row per provider**, and only one of each
pair is `tracked`. `GET /cronogol/teams` — the app's club catalogue — serves
tracked rows only, while the live route names each side with **the row belonging
to the provider that synced that fixture**. So on a cross-provider tie exactly
one side's slug is in the catalogue, and `teamRefFromLive`, which joins by slug,
misses the other. That is the whole bug, and it predicts both screenshots
exactly.

The artwork was never missing: `GET /cronogol/teams?includeUntracked=true`
returns a mirrored PNG for `napoli-459`, and Arsenal's team-fixtures route
serves it as `opponentLogoUrl` — which `opponentRef` already copies onto the
window row's `TeamRef`. The app was throwing that row away: `boardLives` dedupes
by fixture id with the route winning outright, so the moment `/cronogol/live`
serves a tie, the fixture row holding the crest is dropped.

## Decision

**`teamRefFromLive` takes an optional `fallback: TeamRef`, and `boardFromRoute`
hands it the same fixture's side from the windows the screen already holds.**

1. **The catalogue still wins when it answers.** The fallback is consulted only
   for a slug the catalogue does not hold, so for pure-league data nothing falls
   back and the output is byte-identical to pre-0139 — a harness assertion.
2. **The sides align by POSITION on one fixture id**, never by slug and never by
   name. It is the same fixture, so home is home; matching by slug is precisely
   what cannot work here, and ADR 0022/0027's prohibition on name joins stands
   untouched.
3. **`boardLives` builds the lookup from `held` + `swept`** — the windows it is
   already given — first occurrence winning. ⚠ It never gates whether a card
   appears: tier 0 reads the route ALONE (0066's whole point), so a match the
   windows have not got still leads the board, just with whatever crests the
   catalogue can give it.
4. **Nothing is fetched for this.** No new query, no widened window, no request
   per club.

## Consequences

- Both crests draw on a cross-provider tie, from artwork already on the device's
  side of the wire.
- The fix is inert for LaLiga — the case that has always worked keeps working by
  the same code path.
- ⚠ It cannot help a match with **no** window row at all (0066's tier-0-only
  case). That is the pre-existing behaviour and stays honest: a monogram.
- ⚠ **Seen only in the harness.** Both matches had ended by the time the fix
  compiled; the visual pass needs the next match night.

## The scope claim that came with it

`/cronogol/live` is **no longer LaLiga-only** and has not been since the backend
added its second live adapter: coverage follows the **syncing provider**, with
no competition filter, so a Premier League club's cup and European ties are
served live too. Six places in this repo asserted otherwise —
[LIVE-SCORES.md](../LIVE-SCORES.md), `types.ts` (twice), `client.ts`, `live.ts`
and `live-plate.tsx` — and all six are corrected.

⚠ **Corrected without weakening trap 8.** The honesty rules are untouched: a
minute is still printed only off this route, still dimmed when stalled, still
beside a note that states the cadence. What changed is *which matches* the route
covers, never *what may be claimed* about one.

⚠ The account sheet's "LaLiga only" alert copy is deliberately **not** touched —
the backend's own handoff reserves that line for Ed once coverage is confirmed
on a device.

## Filed, not fixed

- **One match, two fixtures.** `f3e96945` and `bd1a4cc8` above are the same
  Liverpool v Atlético. A reader following clubs on **both** sides would see it
  **twice** in the live deck, since everything here dedupes by fixture id and
  these have two. The fix is backend row-merging, which that repo files as a
  merge hazard; nothing app-side should paper over it by matching on names.
- **A one-sided `events` array** on a Premier-League-synced cup tie (fixed in
  `senpai-backend` decision 0056 the same evening).
- **The widget's live gate stays `leagueSlug == "laliga"`** — cup ties are still
  kept out of the rationed poll on purpose (0132/0084, trap 34).
