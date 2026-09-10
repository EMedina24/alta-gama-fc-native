/**
 * Real Season stats payloads, for `/_debug/stats` (ADR 0141).
 *
 * ⚠⚠ **GENERATED from `scripts/fixtures/stats-*.json`, which are themselves
 * production responses captured 2026-09-10 from `crono-gol.com`. Not one value
 * here was typed by hand.** Trap 48 is exactly this file's failure mode: a
 * `_debug` sample that invents a field turns a red test green, and the doc
 * comments on both sides then agree with the bug. If these need refreshing,
 * re-capture the JSON and re-generate — do not edit the literals.
 *
 * The five blocks, and what each one is for:
 *
 * - `CLUB_FULL` — Barcelona, LaLiga 2026. Every card draws. ⚠ Its `timeline`
 *   runs `mw 2, 1, 3, 4`: a real postponement, and the reason the cumulative
 *   line is plotted on the array index.
 * - `CLUB_THIN` — Barcelona, Champions League 2026. `coverage.sufficient` is
 *   false at `ratio: 1` — a minimum-fixtures floor — so every event field is
 *   null while the scoreline block is complete.
 * - `CLUB_SCORELINES_ONLY` — Bayern, Bundesliga 2026. The permanent case: that
 *   source writes no events at all, so the goals chart is the only chart, and
 *   two matches played is what a real September looks like.
 * - `PLAYER_FULL` / `PLAYER_THIN` — Raphinha's two 2026 blocks. ⚠ The thin one
 *   still answers `yellows: 0, braces: 0` rather than nulls, which is why the
 *   player view gates its counts on coverage rather than on the type.
 */
import type { PlayerSeasonStatsView, TeamSeasonStatsView } from '@/lib/cronogol/types';

export const CLUB_FULL: TeamSeasonStatsView = {
  season: 2026,
  competition: "laliga",
  goalsFor: 17,
  goalsAgainst: 2,
  goalDifference: 15,
  cleanSheets: 3,
  failedToScore: 0,
  longestScoringRun: 4,
  longestUnbeatenRun: 4,
  longestWinningRun: 4,
  biggestWin: {
    fixtureId: "198d60ef-276e-4fb1-8526-fbda1243bb31",
    opponent: {
      slug: "elche",
      name: "Elche CF",
    },
    matchweek: 2,
    goalsFor: 5,
    goalsAgainst: 0,
    kickoffUtc: "2026-08-23T19:30:00+00:00",
  },
  biggestDefeat: null,
  home: {
    played: 2,
    won: 2,
    drawn: 0,
    lost: 0,
    goalsFor: 7,
    goalsAgainst: 2,
    cleanSheets: 1,
  },
  away: {
    played: 2,
    won: 2,
    drawn: 0,
    lost: 0,
    goalsFor: 10,
    goalsAgainst: 0,
    cleanSheets: 2,
  },
  timeline: [
    {
      id: "198d60ef-276e-4fb1-8526-fbda1243bb31",
      mw: 2,
      ko: "2026-08-23T19:30:00+00:00",
      home: false,
      gf: 5,
      ga: 0,
    },
    {
      id: "b28488c1-8f4c-40fe-afd8-3a5f0df2363a",
      mw: 1,
      ko: "2026-08-27T19:00:00+00:00",
      home: true,
      gf: 2,
      ga: 0,
    },
    {
      id: "114f7d8c-dcd3-4152-a5bb-32f3b025d6dd",
      mw: 3,
      ko: "2026-08-31T19:30:00+00:00",
      home: true,
      gf: 5,
      ga: 2,
    },
    {
      id: "d7b3c0e0-2fe9-4015-9e00-f57e9e57244c",
      mw: 4,
      ko: "2026-09-06T14:15:00+00:00",
      home: false,
      gf: 5,
      ga: 0,
    },
  ],
  scoringRun: {
    length: 4,
    startIndex: 0,
    endIndex: 3,
    fromMatchweek: 2,
    toMatchweek: 4,
    fromKickoffUtc: "2026-08-23T19:30:00+00:00",
    toKickoffUtc: "2026-09-06T14:15:00+00:00",
  },
  comebackWins: 1,
  comebackPoints: 3,
  yellows: 4,
  secondYellows: 0,
  reds: 0,
  goalsForByBand: {
    "90+": 0,
    "1-15": 2,
    "16-30": 3,
    "31-45": 2,
    "46-60": 2,
    "61-75": 3,
    "76-90": 5,
  },
  goalsAgainstByBand: {
    "90+": 0,
    "1-15": 1,
    "16-30": 0,
    "31-45": 0,
    "46-60": 1,
    "61-75": 0,
    "76-90": 0,
  },
  coverage: {
    fixturesCounted: 4,
    fixturesTotal: 4,
    ratio: 1,
    sufficient: true,
  },
};

export const CLUB_THIN: TeamSeasonStatsView = {
  season: 2026,
  competition: "champions-league",
  goalsFor: 5,
  goalsAgainst: 1,
  goalDifference: 4,
  cleanSheets: 0,
  failedToScore: 0,
  longestScoringRun: 1,
  longestUnbeatenRun: 1,
  longestWinningRun: 1,
  biggestWin: {
    fixtureId: "db8db6b5-47e9-4dd9-9c08-27b5e92101f5",
    opponent: {
      slug: "feyenoord-feyenoord",
      name: "Feyenoord",
    },
    matchweek: 1,
    goalsFor: 5,
    goalsAgainst: 1,
    kickoffUtc: "2026-09-09T16:45:00+00:00",
  },
  biggestDefeat: null,
  home: {
    played: 1,
    won: 1,
    drawn: 0,
    lost: 0,
    goalsFor: 5,
    goalsAgainst: 1,
    cleanSheets: 0,
  },
  away: {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
  },
  timeline: [
    {
      id: "db8db6b5-47e9-4dd9-9c08-27b5e92101f5",
      mw: 1,
      ko: "2026-09-09T16:45:00+00:00",
      home: true,
      gf: 5,
      ga: 1,
    },
  ],
  scoringRun: {
    length: 1,
    startIndex: 0,
    endIndex: 0,
    fromMatchweek: 1,
    toMatchweek: 1,
    fromKickoffUtc: "2026-09-09T16:45:00+00:00",
    toKickoffUtc: "2026-09-09T16:45:00+00:00",
  },
  comebackWins: null,
  comebackPoints: null,
  yellows: null,
  secondYellows: null,
  reds: null,
  goalsForByBand: null,
  goalsAgainstByBand: null,
  coverage: {
    fixturesCounted: 1,
    fixturesTotal: 1,
    ratio: 1,
    sufficient: false,
  },
};

export const CLUB_SCORELINES_ONLY: TeamSeasonStatsView = {
  season: 2026,
  competition: "bundesliga",
  goalsFor: 5,
  goalsAgainst: 1,
  goalDifference: 4,
  cleanSheets: 1,
  failedToScore: 1,
  longestScoringRun: 1,
  longestUnbeatenRun: 2,
  longestWinningRun: 1,
  biggestWin: {
    fixtureId: "8ec2ba78-9480-45e8-90b6-a1d5a825d0c0",
    opponent: {
      slug: "vfb-stuttgart",
      name: "VfB Stuttgart",
    },
    matchweek: 1,
    goalsFor: 5,
    goalsAgainst: 1,
    kickoffUtc: "2026-08-28T18:32:36+00:00",
  },
  biggestDefeat: null,
  home: {
    played: 1,
    won: 1,
    drawn: 0,
    lost: 0,
    goalsFor: 5,
    goalsAgainst: 1,
    cleanSheets: 0,
  },
  away: {
    played: 1,
    won: 0,
    drawn: 1,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 1,
  },
  timeline: [
    {
      id: "8ec2ba78-9480-45e8-90b6-a1d5a825d0c0",
      mw: 1,
      ko: "2026-08-28T18:32:36+00:00",
      home: true,
      gf: 5,
      ga: 1,
    },
    {
      id: "6da71a9b-b089-4fcb-9598-d392f8119819",
      mw: 2,
      ko: "2026-09-05T16:30:05+00:00",
      home: false,
      gf: 0,
      ga: 0,
    },
  ],
  scoringRun: {
    length: 1,
    startIndex: 0,
    endIndex: 0,
    fromMatchweek: 1,
    toMatchweek: 1,
    fromKickoffUtc: "2026-08-28T18:32:36+00:00",
    toKickoffUtc: "2026-08-28T18:32:36+00:00",
  },
  comebackWins: null,
  comebackPoints: null,
  yellows: null,
  secondYellows: null,
  reds: null,
  goalsForByBand: null,
  goalsAgainstByBand: null,
  coverage: {
    fixturesCounted: 0,
    fixturesTotal: 2,
    ratio: 0,
    sufficient: false,
  },
};

export const PLAYER_FULL: PlayerSeasonStatsView = {
  season: 2026,
  competition: "laliga",
  teams: [
    {
      slug: "barcelona",
      name: "FC Barcelona",
    },
  ],
  goals: 6,
  assists: 1,
  goalInvolvements: 7,
  penaltyGoals: 1,
  penaltiesMissed: 0,
  penaltyConversion: 1,
  ownGoals: 0,
  yellows: 0,
  secondYellows: 0,
  reds: 0,
  braces: 2,
  hatTricks: 0,
  hatTrickFixtures: [],
  quickestBooking: null,
  superSubGoals: 0,
  longestScoringStreak: 4,
  currentScoringStreak: 4,
  goalsByBand: {
    "90+": 0,
    "1-15": 1,
    "16-30": 1,
    "31-45": 1,
    "46-60": 1,
    "61-75": 2,
    "76-90": 0,
  },
  goalsByMatchweek: {
    "1": 1,
    "2": 2,
    "3": 2,
    "4": 1,
  },
  coverage: {
    fixturesCounted: 4,
    fixturesTotal: 4,
    ratio: 1,
    sufficient: true,
  },
};

export const PLAYER_THIN: PlayerSeasonStatsView = {
  season: 2026,
  competition: "champions-league",
  teams: [
    {
      slug: "barcelona",
      name: "FC Barcelona",
    },
  ],
  goals: 2,
  assists: 0,
  goalInvolvements: 2,
  penaltyGoals: 0,
  penaltiesMissed: null,
  penaltyConversion: null,
  ownGoals: 0,
  yellows: 0,
  secondYellows: 0,
  reds: 0,
  braces: 1,
  hatTricks: 0,
  hatTrickFixtures: null,
  quickestBooking: null,
  superSubGoals: 0,
  longestScoringStreak: 1,
  currentScoringStreak: 1,
  goalsByBand: null,
  goalsByMatchweek: null,
  coverage: {
    fixturesCounted: 1,
    fixturesTotal: 1,
    ratio: 1,
    sufficient: false,
  },
};
