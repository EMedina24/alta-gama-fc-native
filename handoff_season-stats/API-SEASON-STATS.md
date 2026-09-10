# Season stats — the backend contract

**The data half of this folder.** The design half is the mocks (club tab, players tab). This is
what the API actually serves, where it and the mocks disagree, and what to write in
`src/lib/cronogol/`.

**Backend:** `CRONOGOL.md` §120 and §120.9–§120.11 · `.claude/decisions/0058-season-stats-tables.md` ·
`CRONOGOL-API.md` → *"Season stats"*. Written 2026-09-10, the day the surface shipped.

> ## ⚠⚠ READ THIS BEFORE YOU FILE A BUG
>
> **The routes are live. The tables are empty.** As of 2026-09-10 the sweep that fills them has
> never run, so every call returns a correct `200` with an empty payload:
>
> ```jsonc
> GET /cronogol/teams/barcelona/stats
> → { "team": { "slug": "barcelona", "name": "FC Barcelona" }, "seasons": [] }
>
> GET /cronogol/stats/leaders?league=laliga&metric=goals
> → { "competition": "laliga", "season": 2026, "metric": "goals", "leaders": [] }
> ```
>
> **This is not a failure and there is nothing to retry.** Build against the shapes; they are
> stable. An empty-state screen is required regardless — see §7, because a real player with a
> genuinely quiet season returns the same empty list forever.

---

## 1. Three endpoints

All three: `Cache-Control: public, max-age=300`. They read rows a sweep rebuilds every three hours;
nothing here is live, and nothing here triggers a fetch on the server.

```
GET /cronogol/players/{slug}/stats
GET /cronogol/teams/{slug}/stats
GET /cronogol/stats/leaders?league=&season=&metric=&limit=
```

`{slug}` for a player is `player.slug`, which now exists on `SquadPlayerView` (added 2026-09-10 for
exactly this — the squad view previously published the provider id and no slug, so there was no way
to get from a squad row to a stats URL). It is also on every `MatchEventView.player.slug`.

`{slug}` for a club is the same club slug used everywhere else.

---

## 2. The club payload

```jsonc
// GET /cronogol/teams/barcelona/stats
{
  "team": { "slug": "barcelona", "name": "FC Barcelona" },
  "seasons": [
    {
      "season": 2026,                 // STARTING year: 2026 = 2026/27
      "competition": "laliga",

      // ── Scoreline-derived. ALWAYS numbers, EVERY competition. See §5.
      "goalsFor": 102, "goalsAgainst": 44, "goalDifference": 58,
      "cleanSheets": 8, "failedToScore": 3,
      "longestScoringRun": 21, "longestUnbeatenRun": 9, "longestWinningRun": 4,
      "biggestWin": {
        "fixtureId": "…",
        "opponent": { "slug": "valladolid", "name": "Real Valladolid" },  // ⚠ can be null
        "matchweek": 22,                                                  // ⚠ null for cups
        "goalsFor": 7, "goalsAgainst": 0,
        "kickoffUtc": "2027-02-01T20:00:00.000Z"
      },
      "biggestDefeat": null,
      "home": { "played": 19, "won": 15, "drawn": 2, "lost": 2,
                "goalsFor": 58, "goalsAgainst": 18, "cleanSheets": 9 },
      "away": { "played": 19, "won": 13, "drawn": 3, "lost": 3,
                "goalsFor": 44, "goalsAgainst": 26, "cleanSheets": 6 },

      // ⚠⚠ ONE array, THREE charts. See §3.
      "timeline": [
        { "id": "…", "mw": 1, "ko": "2026-08-15T19:00:00.000Z", "home": true,  "gf": 2, "ga": 0 },
        { "id": "…", "mw": 2, "ko": "2026-08-22T19:00:00.000Z", "home": false, "gf": 1, "ga": 1 }
      ],
      "scoringRun": {
        "length": 21,
        "startIndex": 8, "endIndex": 28,          // indices INTO `timeline`
        "fromMatchweek": 9, "toMatchweek": 29,    // ⚠ null on a cup run
        "fromKickoffUtc": "2026-10-24T19:00:00.000Z",
        "toKickoffUtc": "2027-03-13T19:00:00.000Z"
      },

      // ── Event-derived. ⚠ null where coverage is absent. NEVER 0. See §5.
      "comebackWins": 2, "comebackPoints": 7,
      "yellows": 44, "secondYellows": 1, "reds": 2,
      "goalsForByBand":     { "1-15": 12, "16-30": 14, "31-45": 18,
                              "46-60": 15, "61-75": 17, "76-90": 20, "90+": 4 },
      "goalsAgainstByBand": { "…": 0 },

      "coverage": { "fixturesCounted": 38, "fixturesTotal": 38,
                    "ratio": 1, "sufficient": true }
    }
  ]
}
```

`404` on an unknown club slug, like `teams/{slug}/squad`.

⚠ **No `played`, `won`, `drawn`, `lost` or `points`.** They live in `GET /cronogol/standings` and a
copy here could only ever drift out of step with the league table. `coverage.fixturesTotal` *is*
played. The venue splits do carry W/D/L, because a home/away split is a fact the standings do not
serve.

---

## 3. ⚠⚠ `timeline` — one array, three charts, and the axis is NOT matchweek

`timeline` is one entry per finished fixture, **in kickoff order**. Three mock panels come out of it:

| Panel | Derive |
| --- | --- |
| Cumulative goals line (MD1→MD38) | running sum of `gf` over the array |
| Goals per matchweek, home/away bars | group by `mw`, split on `home` |
| Scored-in squares strip | `gf > 0` per entry |
| "MD9 → MD29" on the run | `scoringRun.fromMatchweek` / `toMatchweek` |

⚠⚠ **Plot on the array index, not on `mw`.** Matchweeks are ordered by *number*, which is not
chronological — a postponed match really does put matchweek 2 before matchweek 1 (verified on the
backend 2026-08-03, Real Madrid). A cumulative line drawn on a matchweek axis will disagree with
`scoringRun` sitting on the same card, which is chronological.

⚠ **`mw` is null for every Champions League knockout round.** They carry a round name and no
matchday. That is why `ko` is on every entry — it is the only label a cup chart can fall back on,
and the app cannot fetch 38 kickoffs one request at a time. A UCL "goals per matchweek" chart is a
league-phase chart; the array index includes the knockouts, `mw` does not.

⚠ `scoringRun.startIndex`/`endIndex` index into `timeline`, so highlighting the run inside the
squares strip needs no matching logic — slice on the indices.

⚠ `timeline` is built over **every finished fixture**, not only the ones whose events reconciled. A
match we swept badly is still a real scoreline. `sum(timeline[].gf) === goalsFor`, exactly, always.

---

## 4. The player payload

```jsonc
// GET /cronogol/players/lewandowski/stats
{
  "playerId": "0f0d…",     // ⚠ THE stable key. Use this to identify a person.
  "slug": "lewandowski",   // ⚠ Nullable AND not unique — a link target, never a key.
  "name": "Robert Lewandowski",
  "seasons": [
    {
      "season": 2026, "competition": "laliga",
      "teams": [{ "slug": "barcelona", "name": "FC Barcelona" }],

      "goals": 27,             // ⚠ own goals are NOT in here
      "assists": 3,
      "goalInvolvements": 30,  // served, not computed by you
      "penaltyGoals": 6,
      "penaltiesMissed": 1,    // ⚠ null on premier-league and serie-a — §5
      "penaltyConversion": 0.857,   // 0–1. ⚠ null wherever penaltiesMissed is
      "ownGoals": 0,
      "yellows": 4, "secondYellows": 0, "reds": 0,
      "braces": 5, "hatTricks": 1, "superSubGoals": 2,

      "longestScoringStreak": 6,   // ⚠⚠ CLUB MATCHES, not appearances — §7
      "currentScoringStreak": 2,   // ⚠ null once the season goes stale

      "goalsByBand": { "1-15": 3, "16-30": 4, "31-45": 5,
                       "46-60": 4, "61-75": 6, "76-90": 3, "90+": 2 },
      "goalsByMatchweek": { "1": 2, "3": 1 },   // sparse; ⚠ null, never {}

      "hatTrickFixtures": [        // ⚠ null below the floor, [] when none
        { "fixtureId": "…",
          "opponent": { "slug": "valladolid", "name": "Real Valladolid" },
          "matchweek": 22, "kickoffUtc": "2027-02-01T20:00:00.000Z", "goals": 3 }
      ],
      "quickestBooking": {         // ⚠ null below the floor AND null if never booked
        "fixtureId": "…",
        "opponent": { "slug": "atletico-madrid", "name": "Atlético de Madrid" },
        "matchweek": 17, "kickoffUtc": "2027-01-01T20:00:00.000Z",
        "minute": 11, "card": "yellow"
      },

      "coverage": { "fixturesCounted": 36, "fixturesTotal": 38,
                    "ratio": 0.9474, "sufficient": true }
      // ⚠ fixturesTotal is his CLUB's fixtures for the season, not his
      //   appearances — there are no lineup events, so appearances are unknowable.
    }
  ],
  "overall": {                  // ⚠ null when no season has enough coverage
    "goals": 44, "assists": 9, "goalInvolvements": 53,
    "penaltyGoals": 11, "ownGoals": 0,
    "yellows": 9, "secondYellows": 0, "reds": 1,
    "braces": 8, "hatTricks": 2, "superSubGoals": 4,
    "longestScoringStreak": 7,  // ⚠ MAX across seasons, never a sum
    "seasonsCounted": 2, "seasonsTotal": 3
  }
}
```

### Status codes, and one is unusual

| | |
| --- | --- |
| `200` | Served. **A known player with no stats is a 200 with `"seasons": []` and `"overall": null`.** A quiet season is not a missing person — render an empty state, not an error. |
| `404` | No player has that slug. |
| `409` | ⚠⚠ **The slug is ambiguous.** `players.slug` is display shorthand from the source with no uniqueness guarantee across ~39,000 people, so two players can share one. The body carries `candidates: [{ playerId, name }]` — show a picker. Rare, real, and the backend will not guess. |

The `#9 · FORWARD` line and the portrait in the mock are **not** on this payload — they come from
`GET /cronogol/teams/{slug}/squad`, joined on `player.slug`.

---

## 5. ⚠⚠ The nulls contract — a null is never a zero

Every nullable field means **"we do not know"**, not "it did not happen". Rendering a `null` as `0`
is the single most damaging thing this app can do with these endpoints.

Two independent reasons a field is null:

**(a) The competition has no trustworthy events.** Per-competition:

| Competition | Player stats | Club stats | Note |
| --- | --- | --- | --- |
| `laliga`, `segunda` | ✅ full | ✅ full | incl. penalty conversion |
| `champions-league` | ✅ full | ✅ full | own slug; not a league, `mw` null in knockouts |
| `premier-league` | ✅ | ✅ | ⚠ `penaltiesMissed`/`penaltyConversion` **always null**; the penalty and own-goal split is soft (the source's goal vocabulary is barely observed) |
| `serie-a` | ⛔ none | ✅ full | events carry a name string and no stable person id — two players sharing a name would merge |
| `bundesliga` | ⛔ none | ⚠ **scorelines only** | every event-derived field null; a known upstream defect, not a blip |

**(b) The season is too thinly swept.** `coverage.sufficient === false` ⇒ the **derived** fields in
that block are null, together — bands, the matchweek series, the named moments, penalty conversion.
They are nulled as a group on purpose: a real card count beside a null comeback count invites the
reader to assume the null is a zero.

⚠⚠ **The raw counters are served either way** — `goals`, `assists`, the cards. They can only ever be
too LOW (a missing event subtracts one, it never invents one), so they publish with `coverage` beside
them. Read `sufficient` before telling a user a number is complete; never read it as "there is no
number to show".

⚠ **`timeline`, `scoringRun`, and the whole scoreline block are NEVER null**, whatever `coverage`
says — they need no events. For the Bundesliga the goals chart is the *only* chart that works, so a
client that treats `timeline` as nullable renders a blank card where the real content is.

---

## 6. What the app computes

Served, do not recompute: `goalInvolvements`, `goalDifference`, `penaltyConversion`, the ranks, the
run length, the W/D/L splits.

| Mock panel | App does |
| --- | --- |
| Cumulative goals line | running sum of `timeline[].gf` |
| Goals per matchweek bars | group `timeline` by `mw` + `home` |
| Squares strip | `timeline[].gf > 0` |
| "2.7 per match" | `goalsFor / coverage.fixturesTotal` |
| "NON-PEN 21" / "Open play" | `goals - penaltyGoals` |
| "86%" | `penaltyConversion * 100` — served as 0–1 |
| "1ST HALF 12 / 15 2ND HALF" | sum `goalsByBand` buckets |
| "22% of goals after 75'" | see the trap ↓ |
| "2 in stoppage time" | `goalsByBand["90+"]` |

> ### ⚠⚠ The band-denominator trap
>
> **`goalsByBand` sums to ≤ `goals`.** A goal with no recorded minute is counted in `goals` and
> dropped from the bands. So:
>
> ```ts
> // ✗ WRONG — silently understates whenever a goal has no minute
> const lateShare = (band['76-90'] + band['90+']) / season.goals;
>
> // ✓ RIGHT — the denominator is the banded total
> const banded = Object.values(band).reduce((a, b) => a + b, 0);
> const lateShare = banded === 0 ? null : (band['76-90'] + band['90+']) / banded;
> ```
>
> `timeline[].gf` has no such gap — it sums to `goalsFor` exactly. Prefer it where either works.

⚠ `goalsByMatchweek` is sparse and only covers fixtures with a matchweek, so it does **not** sum to
`goals` either. Do not build a percentage on it.

---

## 7. ⚠⚠ What this does NOT do, and most of it never will

- **No appearances. No minutes. No per-90 anything.** There are no lineup events at any source, so
  a player who played 90 quiet minutes wrote no row and cannot be seen. **Every denominator here —
  `coverage.fixturesCounted`, `fixturesTotal`, the streak — is CLUB FIXTURES.** If a label in this
  app says "apps", it is wrong, and so is whoever reads it.
- **No shots, shots on target, xG, possession, passes, saves, duels or ratings.** Not stored, not
  buyable at any price this backend holds. This is the boundary that makes *"86% of his shots are on
  target"* impossible and *"86% of his penalties have gone in"* possible.
- **The scoring streak is club matches, not appearances.** A benched match breaks ours and not a
  broadcaster's. **Render it with the club named** — "scored in 6 straight Barcelona matches" —
  rather than as a bare number that will sometimes read lower than ESPN's and look like a bug.
- **No "Assisted by" panel.** Scorer–assister partnerships are not built. That mock panel has no
  endpoint behind it and is not one query away — it needs a new grain on the backend.
- **No cross-competition leaderboards.** `?league=` is required and a missing one is a `400`. There
  is no merged mode: assist rates differ per provider and Serie A has no player identity, so a
  merged ranking would rank the provider rather than the footballer.
- ⚠ **Numbers can change retroactively.** These tables are a cache of a pure function over stored
  events; a backend mapper fix plus a backfill revises old totals. Correct for a stats page — but do
  not snapshot a number into a widget, a notification or a share image and assume it still matches.

---

## 8. Where the code goes

Per `.claude/CONVENTIONS.md`:

- **`src/lib/cronogol/stats.ts`** — one module per domain, beside `events.ts` and `standings.ts`.
  Pure derivation only (the cumulative sum, the band denominator, the run slice). No React, no
  native import — the same rule `events.ts` states about itself, and the reason its rules were
  provable before a build existed.
- **Types into `src/lib/cronogol/types.ts`**, copied verbatim from the `CRONOGOL-API.md`
  TypeScript block. Do not re-derive them by hand.
- **Fetching in `client.ts`**, then a `staleTime` bucket in `src/queries/stale.ts`. The server sends
  `max-age=300` and the underlying sweep runs at most every three hours, so anything under ~5
  minutes buys nothing. These are not live data.
- **Screens fetch, organisms below them do not.** The charts are prop-driven molecules/organisms;
  the derivation belongs in `stats.ts`, not in a component.
- ⚠ The mock's palette is the web app's. `.claude/CONVENTIONS.md` is explicit: do not copy the web
  app's visual styling, and do not harden a placeholder into a system. Colours and spacing come from
  `@/constants/theme`. Read the mock for *behaviour and hierarchy*, not for hex.

---

## 9. Freshness — what to tell the user

There is **no post-match trigger.** Three crons, chained by clock only, 25 minutes apart:

```
0  */3   fixtures sweep    → marks a fixture finished
22 */3   match events      → reads finished fixtures, writes the timeline
47 */3   season stats      → rebuilds these tables
```

LaLiga fixtures flip to `finished` at the whistle (a separate `*/3` live session); the other four
leagues wait for the `0 */3` sweep.

**So the end-to-end lag from final whistle to updated stats is ~25 minutes at best and ~3½–4 hours
at worst.** Do not present these numbers as live, and do not put a "just now" timestamp on them.
The live match card is a different surface with a different contract.


---

## 10. ⚠⚠ Added 2026-09-10 — the bug this section exists to prevent

A card rendered **Federico Valverde · 0 GOALS** the week after he scored against Inter. The API was
right; the card was wrong, and the mistake is one any client will make once.

**A player has ONE ROW PER COMPETITION, per season.** Valverde's payload that day held three:

| competition | season | goals | assists |
| --- | --- | --- | --- |
| `champions-league` | 2026 | **1** | 0 |
| `laliga` | 2026 | 0 | 1 |
| `champions-league` | 2025 | 3 | 4 |

The card had picked `seasons[n]` and labelled it as though it were the player's totals. It was
showing the LaLiga row — genuinely 0 goals — while the goal everyone was looking for sat in the
Champions League row directly above it.

**So a player card must do one of two things, and say which:**

- **Name the competition** it is showing, and give the user a way to switch; or
- **Aggregate across competitions** for that season, and label the number as an all-competitions
  total.

⚠ There is no "all competitions" row on the wire and there will not be one — competitions have
different event coverage (see §5), so the backend will not silently add a Serie A season to a LaLiga
one. If the app aggregates, it owns that decision and should exclude competitions whose
`coverage.sufficient` is false rather than mixing.

⚠ `overall` **is** cross-competition and cross-season — it is a career total, not a season total. Do
not use it for a season card.

### The other half of the same report

The career line read **3 goals** while the season rows added to 4. That was a backend bug, fixed the
same day: `overall` had excluded thinly-covered seasons while the season rows still published their
counters. It now sums every season, so the rows and the total always reconcile, and
`seasonsCounted` / `seasonsTotal` carries the caveat instead.
