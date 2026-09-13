# Liga Nacional de Honduras — what the backend serves, and the one file you must edit

⚠⚠ **Captured from production `crono-gol.com` on 2026-09-13. Not one value below was typed by hand.**
If this needs refreshing, re-capture — do not edit the literals.

Backend spec `senpai-backend/CRONOGOL.md` §126 (built) and §126.12 (the bring-up run that made it
serve). Decision `senpai-backend/.claude/decisions/0064`.

---

## The headline: there is **no new endpoint and no new type**

Honduras is a new **league flowing through routes the app already calls**. Nothing on the wire changed
shape. `Fixture`, `StandingsRow`, `SquadPlayer` and `League` are all byte-identical to what
`la-liga`, `premier-league` and `lpr-pro-clausura` already return.

**So the entire front-end task is one entry in `src/lib/cronogol/leagues.ts`** — the catalogue is
hardcoded (ADR 0018) because the wire cannot carry `zones` or `clubCount`, and a league absent from it
is invisible to the app no matter what the backend serves.

---

## The entry to add

```ts
{
  /**
   * Liga Nacional de Honduras, Apertura. Scraped from lnphn.com — the same
   * shape as Puerto Rico (`senpai-backend/CRONOGOL.md` §126), with ONE
   * difference that matters: this league has real matchweeks.
   *
   * ⚠ `live: true` means "has clubs to browse", not live scores — the Puerto
   * Rico entry's note applies verbatim.
   */
  slug: 'liga-nacional-apertura',
  apiSlug: 'liga-nacional-apertura',
  // ⚠ NOT the wire's `Liga Nacional de Honduras — Apertura`, which is 36
  // characters and cannot fit the 36pt chip. This league serves NO artwork, so
  // it renders the chip's text branch (ADR 0031) exactly as LPR does.
  // ⚠⚠ FINAL COPY IS ED'S CALL — this is a placeholder that fits.
  name: 'Liga Nacional',
  order: 6,
  // ⚠ Twelve, and `bandsApply` compares the table's `clubs` against it — a
  // wrong number silently drops the rank badges and the club-page strip.
  clubCount: 12,
  live: true,
  // ⚠⚠ TRUE, AND THIS IS THE ONE PLACE HONDURAS DIVERGES FROM PUERTO RICO.
  // `/cronogol/jornada/liga-nacional-apertura/2026` answers with 16 REAL
  // matchweeks, so this league belongs in `ROUND_LEAGUES` and its pager works.
  // Puerto Rico is `rounds: false` because it answers `matchweeks: []`.
  rounds: true,
  // Not in the backend's `EVENT_LEAGUES` — no scorers, assists or cards.
  matchEvents: false,
  // No season statistics exist from this source at any price (§126.11).
  playerStats: false,
  // Apertura runs Jul–Dec 2026 and is named by one calendar year.
  calendarYearSeason: true,
  // Apertura and Clausura are separate championships, not halves of one season.
  hasHalves: false,
  zone: 'America/Tegucigalpa',
  // ⚠ The source publishes no continental-qualification or relegation bands,
  // and the standings payload carries none. Empty says "no bands"; omitting it
  // would not compile, which is the point.
  zones: [],
},
```

⚠ Bump `order` on nothing else — `LEAGUES[0]` is `DEFAULT_LEAGUE` and must stay La Liga.

---

## ⚠⚠ The trap: use `logoUrl`, never `logoUrls`

Every club object carries both, and **they point at different hosts**:

```json
"logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/c98537f3….png",
"logoUrls": { "S1": "https://images.statsengine.playbyplay.api.geniussports.com/d087fcfe….png" }
```

`logoUrl` is **our mirrored copy**, served from our own storage. `logoUrls.S1` is the **third-party
Genius CDN**, which **403s on bursts**, and in this backend a 403 writes a permanent
`asset_mirrors.rejected_at` that no later sweep retries. A grid of twelve crests hitting that host is
exactly the burst it refuses.

**Render `logoUrl`.** This is not Honduras-specific advice, but Honduras is the league where getting
it wrong is most likely to bite, because all twelve crests come from that one CDN.

⚠ Only the `S1` variant exists here (LaLiga clubs carry `large`/`small`/`hl`). Any code that reaches
for a named variant must fall back to `logoUrl`.

---

## What works, with real payloads

### `GET /cronogol/leagues` — the league appears, with no artwork

```json
{
  "slug": "liga-nacional-apertura",
  "name": "Liga Nacional de Honduras — Apertura",
  "logoUrl": null,
  "logoUrls": null,
  "accentColor": null
}
```

⚠ `logoUrl` and `accentColor` are **null**, like Puerto Rico. The chip's text branch and the app's own
tint are what render this league. If artwork is wanted it ships in the app, not from the wire.

### `GET /cronogol/jornada/liga-nacional-apertura/2026` — the matchweek index

```json
{
  "league": { "slug": "liga-nacional-apertura", "…": "…" },
  "season": 2026,
  "expectedCount": 6,
  "totalMatchweeks": 22,
  "matchweeks": [
    { "matchweek": 1, "count": 6, "complete": true, "kickoffsConfirmed": true,
      "firstKickoffUtc": "2026-08-01T01:00:00+00:00",
      "lastKickoffUtc": "2026-08-04T01:00:00+00:00" }
  ]
}
```

⚠⚠ **This route carries NO `fixtures` array.** It is an index — matchweek number, count, completeness
and the kickoff window. The fixtures are on the `/{n}` route below. (Reading `matchweeks[].fixtures`
returns `undefined`, which looks like an empty league.)

⚠ **16 matchweeks are present, `totalMatchweeks` says 22.** The season is in progress; six rounds have
not been played. Do not treat `totalMatchweeks` as the array length.

### `GET /cronogol/jornada/liga-nacional-apertura/2026/1` — one matchweek's fixtures

Top level adds `matchweek`, `count`, `complete`, `kickoffsConfirmed` and `fixtures`. One real fixture,
verbatim:

```json
{
  "id": "7d7828b8-6c64-4e27-b81e-be2c43710bdd",
  "homeTeam": {
    "slug": "platense", "name": "Platense", "shortName": "PLA",
    "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/be6bb82b….png",
    "logoUrls": { "S1": "https://img.wh.sportingpulseinternational.com/ed874bde….png" }
  },
  "awayTeam": { "slug": "real-espana", "name": "Real España", "shortName": "RES", "…": "…" },
  "competition": "league",
  "competitionName": null,
  "round": null,
  "kickoffUtc": "2026-08-01T01:00:00+00:00",
  "kickoffTbd": false,
  "venue": "Estadio Nacional Tiburcio Carias Andino",
  "venueCity": null,
  "status": "finished",
  "goalsHome": 0,
  "goalsAway": 3
}
```

⚠⚠ **`round` is `null` on every fixture and that is CORRECT.** The backend deliberately puts the
jornada in the route's own `matchweek`, not on the fixture (`lnphn.mapper.ts:361`). Code that reads
`fixture.round` to label a matchweek will render nothing for this league.

⚠ `venueCity` is always null. `venue` is populated and is the real stadium name.

⚠ `kickoffTbd` is always `false`, but **seven jornadas sit on a placeholder 19:00 kickoff** that is
shaped exactly like a real one (§126.11). Times for unplayed rounds are not trustworthy; dates are.

### `GET /cronogol/standings?league=liga-nacional-apertura&season=2026`

Meta, then twelve rows:

```json
{ "season": 2026, "matchweek": null, "tiebreakers": ["points","goal-difference","goals-for"],
  "clubs": 12, "matchesPlayed": 39, "matchesTotal": 132, "lastMatchUtc": null }
```

```json
{
  "rank": 1,
  "team": { "slug": "real-espana", "name": "Real España", "shortName": "RES", "logoUrl": "…", "logoUrls": { "S1": "…" } },
  "played": 7, "won": 4, "drawn": 3, "lost": 0,
  "goalsFor": 12, "goalsAgainst": 4, "goalDifference": 8, "points": 15,
  "form": ["D","W","W","D","D"]
}
```

⚠ `matchweek` and `lastMatchUtc` are null on this league. `form` is present and ordered.
⚠ Clubs have played **6 or 7** matches — the table is mid-round, so `played` differs across rows.

### `GET /cronogol/teams/{slug}/squad`

```json
{
  "id": "edrick-eduardo-menjivar-johnson",
  "slug": "edrick-eduardo-menjivar-johnson",
  "shirt": 1,
  "name": "Edrick Eduardo Menjivar Johnson",
  "shortName": null,
  "position": "GK",
  "nationality": null,
  "age": 33,
  "heightCm": null,
  "foot": null,
  "weightKg": null,
  "dateOfBirth": "1993-03-01",
  "placeOfBirth": null,
  "photoUrl": null,
  "international": null, "optaId": null, "loan": null, "loanedOut": null
}
```

⚠⚠ **Only five fields are populated: `shirt`, `name`, `position`, `age`, `dateOfBirth`.** Everything
else is null for every Honduran player. A squad card designed against LaLiga's payload will render a
column of blanks.

⚠⚠ **`photoUrl` is null for all 359 players, and this will never change.** The source's player image
is a generic silhouette, so nothing is mirrored (`lnphn-squad.mapper.ts:175`). Compare LaLiga 476/611
and the Premier League 1008/1008 — benchmarking Honduras against those reads as a failure and is not.
**Plan on initials or a placeholder.**

⚠ `name` is the **full legal name** ("Edrick Eduardo Menjivar Johnson", 31 chars) and `shortName` is
null, so there is nothing shorter to fall back to. Long names will wrap or truncate.

⚠ **A club stores more players than it serves.** Olimpia stores 33 and returns **32**: 62 of the 359
players league-wide have no position at source and are dropped from squad responses
(`senpai-backend/.claude/cronogol/outstanding.md` E16). A per-club roster count from the squad
endpoint is a floor, not the squad size.

### `GET /cronogol/fixtures?league=liga-nacional-apertura`

Works and returns the same fixture shape. ⚠ This route takes **`league`** — `team` and `club` are
undeclared params and 400 the whole request.

### Calendar feeds — `GET /cronogol/feed/{club}.ics`

Work for all twelve clubs (`olimpia.ics` → 16 VEVENTs).

---

## What this backend does **NOT** do for Honduras

Absent capabilities are invisible from the app's side, so they are listed rather than left out:

- **No match events.** No scorers, no assists, no cards, no lineups. Honduras is not in the backend's
  `EVENT_LEAGUES`. Any event-driven screen must be gated off this league.
- **No player statistics.** No appearances, goals, minutes or any season total — from any provider, at
  any price (§126.11). `playerStats: false`.
- **No player photos.** See above. Structural, not a backlog item.
- **No live scores — but fixtures DO go `status: "live"`, and the difference will bite.**
  `/cronogol/live` is fed by `live_match_states`, which only the live-session poller writes, and that
  poller does not cover Honduras: §126 states the Genius Sports stats API — the only source of a live
  clock for this league — is **deliberately never called**, because it is a licensed product we hold
  no agreement for. So `/cronogol/live` will not carry a Honduran row.
  ⚠⚠ **A Honduras fixture still reports `status: "live"`** — verified, one was live during the
  bring-up. So a fixture row can render a LIVE badge while no score ever updates behind it and
  `/cronogol/live` stays empty. Gate the live badge on the league, not on `status` alone.
- **No league artwork or accent colour** on the wire.
- **No `shortName`, nationality, height, weight, foot or place of birth** on any player.
- **No continental or relegation zones** published, so no rank bands.
- **Clausura does not exist yet.** Only `liga-nacional-apertura` is registered. `liga-nacional-clausura`
  is configured in the backend but has no league row and will 404 until its calendar appears.

---

## Current data, as of 2026-09-13

| | |
| --- | --- |
| clubs | 12, all with mirrored crests |
| fixtures | 96 across 16 matchweeks (22 total in the season) |
| standings | 12 rows, 0 unmatched — Real España top on 15 |
| squads | 359 registrations / 357 players · **297 reach squad responses** |
| player photos | 0, by design |

⚠ 357 players against 359 registrations is expected: the person id is `slugify(displayName)`, so two
identically-named players merge permanently — a documented trade (§126.8), not a bug.

---

## Refreshing this document

```bash
curl -s 'https://crono-gol.com/cronogol/leagues'
curl -s 'https://crono-gol.com/cronogol/jornada/liga-nacional-apertura/2026'
curl -s 'https://crono-gol.com/cronogol/jornada/liga-nacional-apertura/2026/1'
curl -s 'https://crono-gol.com/cronogol/standings?league=liga-nacional-apertura&season=2026'
curl -s 'https://crono-gol.com/cronogol/teams/olimpia/squad'
```

Squads refresh on the backend's weekly sweep (Tuesdays 03:52 UTC). Fixtures and the table refresh on
the ordinary sync and standings crons.
