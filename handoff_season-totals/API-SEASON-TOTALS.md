# `seasonTotals` — the contract, and two real payloads

⚠⚠ **Captured from production `crono-gol.com` on 2026-09-10. Not one value below was typed by
hand.** If this needs refreshing, re-capture — do not edit the literals. (`_debug/stats-fixtures.ts`
carries the same rule for the same reason: trap 48.)

Backend spec `senpai-backend/CRONOGOL.md` §120.15. The full contract, including the endpoint samples
and the "what this does NOT do" list, is the `## Season stats` section of `CRONOGOL-API.md` — this
file is the extract the app needs, so `types.ts` can be mirrored without reading 700 lines.

---

## The types

These are **verbatim** from the shipped contract. `StatsTimelineEntryView`, `TeamResultRefView`,
`StatsMomentView`, `TeamVenueSplitView`, `ScoringRunView`, `GoalBandsView` and `StatsCoverageView`
already exist in `src/lib/cronogol/types.ts` — the three merged shapes extend them.

```ts
/**
 * ⚠⚠ `competition` is the ONLY thing that says which table `id` lives in —
 * `fixtures` or `ucl_fixtures`. It disambiguates `mw` too.
 */
export interface StatsMergedTimelineEntryView extends StatsTimelineEntryView {
  competition: string;
}

/**
 * ⚠⚠ `competition` is the ONLY thing that says which table `id` lives in —
 * `fixtures` or `ucl_fixtures`. It disambiguates `mw` too.
 */
export interface StatsMergedTimelineEntryView extends StatsTimelineEntryView {
  competition: string;
}

export interface TeamMergedResultRefView extends TeamResultRefView {
  competition: string;
}

/**
 * ⚠⚠ `competition` is the ONLY thing that says which table `id` lives in —
 * `fixtures` or `ucl_fixtures`. It disambiguates `mw` too.
 */
export interface StatsMergedTimelineEntryView extends StatsTimelineEntryView {
  competition: string;
}

export interface TeamMergedResultRefView extends TeamResultRefView {
  competition: string;
}

export interface StatsMergedMomentView extends StatsMomentView {
  competition: string;
}

/**
 * ⚠⚠ ONE SEASON, merged across every competition. Render this on a card;
 * `seasons` is the per-competition drill-down.
 * ⚠ An event-derived field is null unless EVERY competition published a number.
 */
export interface PlayerSeasonTotalsView {
  season: number;
  /** Slug-ascending. ⚠ There is no `competition` — this is not a season row. */
  competitions: string[];
  /** ⚠ Deduped by slug, competition order — NOT a chronology. */
  teams: { slug: string; name: string }[];
  goals: number;
  assists: number;
  goalInvolvements: number;
  penaltyGoals: number;
  penaltiesMissed: number | null;
  /** ⚠ Recomputed from merged counts, never an average of the ratios. */
  penaltyConversion: number | null;
  ownGoals: number;
  yellows: number | null;
  secondYellows: number | null;
  reds: number | null;
  braces: number;
  hatTricks: number;
  hatTrickFixtures: StatsMergedMomentView[] | null;
  quickestBooking: StatsMergedMomentView | null;
  superSubGoals: number;
  /** ⚠⚠ MAX across competitions — a LOWER BOUND, not a merged run. */
  longestScoringStreak: number;
  goalsByBand: GoalBandsView | null;
  coverage: StatsCoverageView;
  // ⚠ No `goalsByMatchweek` (matchweeks are per-competition namespaces) and no
  //   `currentScoringStreak` (a MAX would overstate it).
}

/**
 * ⚠⚠ ONE SEASON, merged across every competition the club played.
 * ⚠ The runs are RECOMPUTED over the merged timeline, not summed and not maxed.
 */
export interface TeamSeasonTotalsView {
  season: number;
  /** Slug-ascending. ⚠ There is no `competition` — this is not a season row. */
  competitions: string[];
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
  longestScoringRun: number;
  longestUnbeatenRun: number;
  longestWinningRun: number;
  biggestWin: TeamMergedResultRefView | null;
  biggestDefeat: TeamMergedResultRefView | null;
  home: TeamVenueSplitView;
  away: TeamVenueSplitView;
  /** ⚠ Kickoff-ordered and INTERLEAVED. `home.played + away.played === length`. */
  timeline: StatsMergedTimelineEntryView[];
  /** ⚠ Indices address the MERGED timeline. */
  scoringRun: ScoringRunView | null;
  // ⚠⚠ Null unless EVERY merged competition published a number. Never 0.
  comebackWins: number | null;
  comebackPoints: number | null;
  yellows: number | null;
  secondYellows: number | null;
  reds: number | null;
  goalsForByBand: GoalBandsView | null;
  goalsAgainstByBand: GoalBandsView | null;
  coverage: StatsCoverageView;
}
```

And the two response types each gain one field:

```ts
export interface PlayerStatsView {
  playerId: string;
  slug: string | null;
  name: string;
  /** ⚠ ONE ROW PER COMPETITION. Season desc, then competition slug asc. */
  seasons: PlayerSeasonStatsView[];
  /** ⚠ The merge, newest first. Always present; `[]` only if there are no stats. */
  seasonTotals: PlayerSeasonTotalsView[];
  overall: PlayerOverallStatsView | null;
}

export interface TeamStatsView {
  team: { slug: string; name: string };
  /** ⚠ ONE ROW PER COMPETITION. Season desc, then competition slug asc. */
  seasons: TeamSeasonStatsView[];
  /** ⚠ The merge, newest first. Always present; `[]` only if there are no stats. */
  seasonTotals: TeamSeasonTotalsView[];
}
```

⚠ `seasons` gained a documented order on 2026-09-10 — season descending, then competition slug
ascending. It previously had no tiebreaker, so two rows of one season could arrive either way round.
Nothing in this app depended on it, but do not reintroduce a dependency on arrival order.

---

## Valverde, `seasonTotals[0]` — the acceptance case

The screen from Ed's TestFlight report. `goals` is **1**; his `laliga` block in `seasons[]` is `0`.

```json
{
  "season": 2026,
  "competitions": [
    "champions-league",
    "laliga"
  ],
  "teams": [
    {
      "slug": "real-madrid",
      "name": "Real Madrid"
    }
  ],
  "goals": 1,
  "assists": 1,
  "goalInvolvements": 2,
  "penaltyGoals": 0,
  "penaltiesMissed": null,
  "penaltyConversion": null,
  "ownGoals": 0,
  "yellows": 0,
  "secondYellows": 0,
  "reds": 0,
  "braces": 0,
  "hatTricks": 0,
  "hatTrickFixtures": null,
  "quickestBooking": null,
  "superSubGoals": 0,
  "longestScoringStreak": 1,
  "goalsByBand": null,
  "coverage": {
    "fixturesCounted": 5,
    "fixturesTotal": 5,
    "ratio": 1,
    "sufficient": false
  }
}
```

⚠ `goalsByBand` is `null` and `coverage.sufficient` is `false` **at `ratio: 1`** — five of five
fixtures counted, a perfect ratio, still refused, because the Champions League half is one fixture
and under the absolute floor of 3. This is the state until roughly late October. The raw counters
(`goals`, `assists`, `yellows`) are served regardless; everything derived is null.

⚠ `yellows` is typed `number | null` but is `0` here and can never actually be null for a player —
`PlayerSeasonStatsView.yellows` is non-nullable on the wire, so the merge always finds two numbers.
Mirror it as nullable anyway; narrowing later is non-breaking.

---

## Real Madrid, `seasonTotals[0]` — the club case

`goalsFor` is **12** (10 LaLiga + 2 Champions League). Timeline truncated here to three entries; the
live payload carries every finished fixture.

```json
{
  "season": 2026,
  "competitions": [
    "champions-league",
    "laliga"
  ],
  "goalsFor": 12,
  "goalsAgainst": 4,
  "goalDifference": 8,
  "cleanSheets": 1,
  "failedToScore": 1,
  "longestScoringRun": 3,
  "longestUnbeatenRun": 3,
  "longestWinningRun": 3,
  "biggestWin": {
    "fixtureId": "e1d65504-0126-48a4-812c-7ff13c47feb5",
    "opponent": {
      "slug": "malaga",
      "name": "Málaga CF"
    },
    "matchweek": 3,
    "goalsFor": 4,
    "goalsAgainst": 0,
    "kickoffUtc": "2026-08-30T15:00:00+00:00",
    "competition": "laliga"
  },
  "biggestDefeat": {
    "fixtureId": "11053e87-8427-4976-b658-64125faa89ca",
    "opponent": {
      "slug": "real-betis",
      "name": "Real Betis"
    },
    "matchweek": 4,
    "goalsFor": 0,
    "goalsAgainst": 1,
    "kickoffUtc": "2026-09-04T19:00:00+00:00",
    "competition": "laliga"
  },
  "home": {
    "played": 3,
    "won": 3,
    "drawn": 0,
    "lost": 0,
    "goalsFor": 10,
    "goalsAgainst": 2,
    "cleanSheets": 1
  },
  "away": {
    "played": 2,
    "won": 1,
    "drawn": 0,
    "lost": 1,
    "goalsFor": 2,
    "goalsAgainst": 2,
    "cleanSheets": 0
  },
  "timeline": [
    {
      "id": "5355ba8f-6092-411b-a1fd-0bf7e0a7e1da",
      "mw": 2,
      "ko": "2026-08-22T19:30:00+00:00",
      "home": false,
      "gf": 2,
      "ga": 1,
      "competition": "laliga"
    },
    {
      "id": "64d9902a-7bbf-46f7-a51b-f34fffc24406",
      "mw": 1,
      "ko": "2026-08-26T19:00:00+00:00",
      "home": true,
      "gf": 4,
      "ga": 1,
      "competition": "laliga"
    },
    {
      "id": "e1d65504-0126-48a4-812c-7ff13c47feb5",
      "mw": 3,
      "ko": "2026-08-30T15:00:00+00:00",
      "home": true,
      "gf": 4,
      "ga": 0,
      "competition": "laliga"
    },
    {
      "…": "truncated for this doc"
    }
  ],
  "scoringRun": {
    "length": 3,
    "startIndex": 0,
    "endIndex": 2,
    "fromMatchweek": 2,
    "toMatchweek": 3,
    "fromKickoffUtc": "2026-08-22T19:30:00+00:00",
    "toKickoffUtc": "2026-08-30T15:00:00+00:00"
  },
  "comebackWins": null,
  "comebackPoints": null,
  "yellows": null,
  "secondYellows": null,
  "reds": null,
  "goalsForByBand": null,
  "goalsAgainstByBand": null,
  "coverage": {
    "fixturesCounted": 5,
    "fixturesTotal": 5,
    "ratio": 1,
    "sufficient": false
  }
}
```

⚠ Every timeline entry carries `competition`, and it is **not decoration**: `id` is a `fixtures` id
or a `ucl_fixtures` id and the value does not say which. In `seasons[]` the row's own `competition`
disambiguates it; a merged block has no such row.

⚠ `home.played + away.played === timeline.length`, always. Worth asserting in the harness — it is a
free structural check that catches a dropped or doubled fixture.

⚠ `scoringRun.startIndex`/`endIndex` index the **merged** timeline. Feeding them a per-competition
array highlights the wrong matches.
