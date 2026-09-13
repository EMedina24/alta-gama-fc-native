# 0159 — Liga Hondubet joins the catalogue, and it is the first scraped league with real matchweeks

- **Date:** 2026-09-12
- **Status:** Accepted — every value verified against production `crono-gol.com` the same day; ⚠ simulator pass pending
- **Decided by:** Ed ("lets make a plan to support the Honduras league… similar to how we did with the Puerto Rican league"; the display name is his call)
- **Builds on:** [0105](./0105-lpr-clausura-and-league-capability-flags.md) — the pattern this copies, and the decision that made the capability flags load-bearing · [0144](./0144-player-stats-are-a-league-capability.md) (`playerStats`) · [0018](./0018-ported-data-layer.md) (why the catalogue is hardcoded at all)
- **Backend:** `senpai-backend` decision 0064, spec §126 · handoff `handoff_honduras/API-HONDURAS.md`

## Context

`senpai-backend` brought Liga Nacional de Honduras up on production on 2026-09-12
(provider `lnphn`, scraped from the league's own WordPress site). It is the **second**
scraped league after Puerto Rico and the **sixth** in this app.

**There is no new endpoint and no new type.** Honduras flows through routes this app
already calls, in shapes byte-identical to LaLiga's. The catalogue is hardcoded because
`GET /cronogol/leagues` cannot carry `zones` or `clubCount`, so a league absent from
`LEAGUES` is invisible no matter what the backend serves — which makes the entry the
whole feature.

⚠ **This ADR's numbers were re-verified against the wire, not copied from the handoff.**
The handoff was written the day before the bring-up finished and describes a 10-club
league; production serves twelve.

| Verified 2026-09-12 | |
| --- | --- |
| `/cronogol/leagues` | `liga-nacional-apertura` · `logoUrl: null` · `accentColor: null` — ⚠ artwork uploaded later the same day, see below |
| `/cronogol/standings` | `clubs: 12` · `matchesPlayed: 39` · `matchesTotal: 132` · `form` populated · `matchweek`/`lastMatchUtc` null |
| `/cronogol/jornada/…/2026` | `totalMatchweeks: 22`, **16** published, all `complete` + `kickoffsConfirmed` |
| 96 fixtures | 38 finished · 57 scheduled · **1 live** · `round` null ×96 · `kickoffTbd` false ×96 · `venue` null 90/96 · `venueCity` null 96/96 |
| Squad | `shirt`/`name`/`position`/`age`/`dateOfBirth` complete · `shortName`, `nationality`, `photoUrl` null on every row · `slug` on 15 of 32 |
| Events / team stats / leaders | `count: 0` · `seasons: []` · `leaders: []` |

## Decision

**One entry in `LEAGUES`, and nothing else.** No new screen, no per-league component, no
branch on a league slug — 0105's rule, and it held a second time.

```
slug/apiSlug: 'liga-nacional-apertura'   name: 'Liga Hondubet'   order: 6
clubCount: 12   live: true   rounds: TRUE   matchEvents: false   playerStats: false
calendarYearSeason: true   hasHalves: false   zone: 'America/Tegucigalpa'   zones: []
```

### ⭐ `rounds: true` is the one place this diverges from Puerto Rico

`matchweek` is a clean integer on every Honduran fixture, so `/cronogol/jornada/…` answers
with real rounds and the league belongs in `ROUND_LEAGUES`. Puerto Rico answers
`matchweeks: []` and is kept off Matchdays for it. **Honduras is the first scraped league
where the jornada routes work**, and it needs none of the date-grouped fallback 0105
declined to build.

### `roundCount()` is honest here, and that is why this is a `League`

`2 × (12 − 1) = 22`, and the wire serves `totalMatchweeks: 22`. They agree. That is the
same check that kept the Champions League **out** of `LEAGUES`
([0150](./0150-champions-league-is-a-competition-not-a-league.md)), where it would have
said 70 against a real 8 — so it is worth recording that it was run and passed rather than
assumed. ⚠ Only 16 of the 22 rounds are published; `matchweeks.length` is not
`totalMatchweeks`, and the pager sizes from the payload.

### The name is ours: `Liga Hondubet`

Not the wire's `Liga Nacional de Honduras — Apertura`, which is 36 characters against a
~46pt chip. ⚠ It is the league's betting-sponsor mark. Raised with Ed as an App Store
review consideration and taken anyway; recorded here so the next reader knows it was a
choice.

### ⭐ The mark is on the wire, and putting it there was the right call twice over

The league shipped with `logoUrl: null`, so the chip took 0031's text branch — and **at
seven slots that branch cannot work**: `Liga Hondubet` broke mid-word onto three lines in
a 46pt box and spilled out of a 52pt chip. Two things came out of that:

1. **The text branch is now bounded** — it draws into the mark box with two lines and
   `adjustsFontSizeToFit`. ⚠ Damage control, not a fix: at that width a two-word name is
   a smudge whatever it is scaled to. The branch had never been exercised at more than
   five slots, which is exactly why it shipped unable to bound itself.
2. **The mark was uploaded backend-side, not bundled** (Ed's call). `assets/ligaHonduras.png`
   in `senpai-backend` — a hummingbird lockup — was trimmed to its alpha bounds (580×430
   → 465×397; it was 75% transparent with 80px of dead margin on one side, which would
   have drawn it small and off-centre beside its neighbours), uploaded to Supabase Storage
   at `team-assets/leagues/<sha256>.png` on the existing content-hash convention, and
   `leagues.logo_url` pointed at it.

   ⭐ **Zero client change.** `useLeagueArtwork` keys on `apiSlug` and both resolvers
   already fall through to `primary` — the same thing that happened for Puerto Rico hours
   after 0105, and the second proof that the catalogue and the artwork are properly
   decoupled. ⚠ Setting `logo_url` alone is sufficient: `logo_variants` is `null` on the
   LPR row too and the read layer synthesises `primary` from it.

   Bundling was rejected for the reason 0133 bundles the UCL and nothing else: the UCL has
   no wire row at all. Honduras has one, so a bundled mark would have left `cronogol`
   without it and made artwork an app-build away.

### `matchEvents: false` and `playerStats: false` are CAPABILITIES, not observations

The Genius Sports LiveStats feed behind this league carries lineups, play-by-play and a
live clock, and answers unauthenticated — but it is a licensed product with no agreement,
and the backend structurally never calls it (§126.6). So the absence is **permanent and
deliberate**, which is a stronger claim than Puerto Rico's "the federation enters none".
Both flags say the same thing to the app; only the reason differs.

### `zones: []` and no `LeagueBand` entry

No continental qualification and no published relegation, and the wire serves
`accentColor: null`. Empty says "no bands"; omitting would not compile. The neutral header
is [0062](./0062-league-header-bands.md)'s designed fallback, and inventing a brand band
for a league whose own site ships no mark is not this change's call — 0105 said the same
and was right.

## Consequences

- Honduras appears on the Table, on Clubs, on club pages, in onboarding, in the player
  sheet **and on Matchdays** — all from the one entry, because every one of those screens
  was written against the catalogue rather than against a league. The Table screen now
  makes five jornada-index requests, not four.
- **The Table rail reached SEVEN chips**, which needed a real change:
  [0160](./0160-a-seventh-chip-shrinks-the-mark-again.md).
- ⚠⚠ **A Honduran fixture reports `status: "live"` and `/cronogol/live` will never carry
  it.** Verified simultaneously on 2026-09-12: Motagua v Génesis FC was `live` in matchweek
  7 while `/cronogol/live` answered `{"matches":[],"count":0}`. **No gate was added, and
  that is the finding** — `boardLives`' tier 2 already exists for *"a sweep-flagged match
  of a league the route does not cover"* ([0126](./0126-concurrent-live-matches-stack-as-a-deck.md),
  [0132](./0132-team-windows-feed-the-today-board.md)), and it draws an age caption rather
  than a fabricated minute. `liveMinute` is null unless the route row says so. The
  Matchdays in-play row is likewise fine: [0035](./0035-jornada-rows-show-in-play-scores.md)
  already forbids the word "live" there because the sweep is ~3h, which is exactly this
  league's situation. ⚠ Unverified on the simulator against a real Honduran kickoff.
- ⚠⚠ **The crest fall-through is now load-bearing and was pinned.** Honduran clubs carry
  `logoUrls: { S1 }` and nothing else, and that S1 URL is the Genius image CDN, which 403s
  on a burst — and a 403 writes a **permanent** `asset_mirrors.rejected_at` on the backend
  that no sweep retries. A twelve-crest grid is that burst. The app already renders the
  mirrored `logoUrl`, because `S1` is in none of `CREST_KEYS`' four vocabularies and every
  size falls through. That safety was **incidental**, so `scripts/team-window-harness.mjs`
  now asserts it in both directions, including that an S1-only club with no mirror renders
  the **monogram** rather than the third-party URL.
- ⚠ **50 of 96 kickoffs sit at 01:00 UTC — 19:00 in Tegucigalpa, the source's placeholder
  for rounds whose times are not set — and `kickoffTbd` is `false` on all 96.** Nothing in
  the payload separates a real 19:00 from a guessed one, and no client rule can. Dates are
  trustworthy; times beyond the current round are not. Recorded, not papered over:
  suppressing the time beyond the current jornada is a design question for Ed, not a
  silent client heuristic.
- ⚠ Squads are systematically short — 62 of 359 league-wide players have no position at
  source and are dropped, so Olimpia serves 32 of 33 stored. A per-club squad count is a
  floor. Not workaroundable from here.
- The club page's Season stats row needed no gate: team stats answer `seasons: []`, and
  `enabled={seasonStats !== null}` already disables the row.
- News is unaffected — `/cronogol/news/leagues` carries no Honduran id, and the chips are
  the server list intersected with `LEAGUES`.
- ⚠ **It found a shipped bug of Puerto Rico's.** The Starting XI club strip printed
  `Inscripciones oficiales ·` with nothing after the dot, because `primaryCompetition`
  reads `fixture.competitionName` and **both** scraped leagues serve `null` for it on
  every fixture. The call site was passing `competition ?? ''` into a template that always
  wrote the separator. `sourceLine` now takes `string | null` and drops the separator with
  the name. Shipped with Puerto Rico on 2026-09-02 and unnoticed for ten days — the same
  shape as 0105's own `flex: 1.45` find.
- The XI token needed a real rule of its own:
  [0161](./0161-the-shirt-name-is-the-paternal-surname.md). Honduran players carry
  `shortName: null` and a full legal name, so 296 of 297 tokens clipped.
- Widgets and push are unaffected: the Swift live gate is a `laliga` literal
  ([0084](./0084-widget-live-gate-takes-the-api-league-slug.md)) and push is per-club.
- **`liga-nacional-clausura` is deliberately absent.** Configured on the backend, no
  league row, 404s today; a sibling entry around January 2027, exactly as
  `lpr-pro-apertura` is for Puerto Rico. Whoever adds it should check that both names
  still fit the chip and that the editorial sort keeps them together.

## Alternatives considered

- **Reading capability off the payload** rather than hand-copying it. Rejected for the
  third time, and Honduras is the sharpest case yet: its events endpoint answers `200`
  with `count: 0`, its leaders answer `200` with `[]`, and its team stats answer `200`
  with `seasons: []` — every one of them indistinguishable from a league whose sweep has
  not caught up (traps 32, 55).
- **A `liveScores: boolean` flag** to gate the `status: "live"` case. Rejected: the tier
  that handles it already exists and is not league-specific, and a flag would be a second
  copy of a decision `boardLives` already makes correctly — `BAND_COLOR`'s lesson.
- **Adding `S1` to `CREST_KEYS`** so the scraped leagues resolve "properly". Rejected
  outright and now asserted against: it would hot-link a CDN that can lock us out
  permanently, to get a smaller file than the mirror we already hold.
- **Naming it `Liga Nacional`** — neutral, no sponsor, and it was the placeholder the
  backend handoff suggested. Ed took `Liga Hondubet`, the league's own mark.
