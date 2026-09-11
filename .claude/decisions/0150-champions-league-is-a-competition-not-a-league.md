# 0150 — The Champions League is a COMPETITION, not a league

- **Date:** 2026-09-11
- **Status:** Accepted — built 2026-09-11; ⚠ simulator pass recorded in HANDOFF
- **Decided by:** Ed ("our backend now fully supports UCL standings — add a new tab to the standings screen")
- **Builds on:** [0018](./0018-ported-data-layer.md) (the ported data layer), [0105](./0105-lpr-clausura-and-league-capability-flags.md) (capability flags)

## Context

`senpai-backend` shipped `GET /cronogol/ucl/standings` on 2026-09-11 (its
decision 0061). Verified live the same day: `season 2026`, `matchday 1`,
`clubs 36`, 36 ranked rows.

The obvious move is a sixth entry in `LEAGUES`. It does not survive contact with
the type.

## Decision

A new `src/lib/cronogol/competitions.ts` holding a `Competition` type, the
single `UCL_LEAGUE_PHASE` entry, and every pure function the tab needs. It is
**not** a `League` and never enters `LEAGUES`.

`cronogol` made the same call first — `lib/og/competitions.ts` keeps
`champions-league` out of its own `LEAGUES` because that array drives six public
surfaces. Ours drives four, and none of them has anything to serve this:

| `League` field | What it would say for the UCL |
| --- | --- |
| `roundCount() = 2*(clubCount−1)` | **70**, against a real 8 |
| `zones` / `ZoneKind` | `'ucl'` there means *"this **domestic** rank qualifies for the Champions League"* — a different question, and `CRONOGOL-API.md` says so in as many words |
| `apiSlug` | `/cronogol/standings?league=champions-league` answers `200 { tables: [] }`, not a 404 — it reads as a coverage gap |
| `rounds` | no matchweek index route exists, so `ROUND_LEAGUES` would draw a pager whose every round is empty (trap 55) |
| `live` | `LIVE_LEAGUES` would put it on the Clubs rail — where half its clubs are not in `GET /cronogol/teams` at all |
| `hasHalves` / `calendarYearSeason` / `zone` | meaningless for a 36-club continental league phase |

⚠ **`order: 1.5`, deliberately fractional.** Ed placed the chip second, after
LaLiga. `order` is a sort key rather than an index, so 1.5 slots it between
LaLiga (1) and the Premier League (2) without renumbering five league entries to
insert one competition — a diff in the wrong file. It is commented at the
constant, because it reads as a mistake and is not one.

⚠ **The registry holds no `mark`.** `competitionMarkKind()` already resolves the
lockup by exact wire string and `Competition.name` *is* that string, so a second
copy of the answer here could drift from it — and importing the atom's type
would point `lib/` up into `components/`, costing the harness its plain-node
require.

## Consequences

- **This app is the first product surface built on `/cronogol/ucl/*`.** The API
  doc labels those three routes *"render-path, provisional in shape"* and
  reserves a Champions League page for v2; `cronogol` honours that and calls
  none of them from a page. Ed asked for the tab anyway, and the accepted
  mitigation is structural: the blast radius is this module, one client
  function, one query hook and one branch on one screen. ⚠ Worth telling the
  backend so the route's own doc can be widened — that is a `senpai-backend`
  change and is Ed's call, not a drive-by.
- `Competition` carries **no capability flags**, unlike `League`. 0105's flags
  exist because a league can serve some surfaces and not others; a competition
  with exactly one surface has nothing to claim. The day it grows a second, the
  flags come with it.
- The two catalogues can drift on the things they share (editorial order, the
  name). Accepted: they are small, and merging them costs the six rows above.

## Alternatives considered

- **A sixth `LEAGUES` entry with sentinel values** — `clubCount: 36` alone makes
  `roundCount` say 70, and `zones: []` would suppress the bands the competition
  actually has. Every consumer would then need a "unless it is the cup" branch,
  which is this module with worse ergonomics.
- **Widening `League` with optional cup fields** — five leagues carrying four
  fields that are null for all of them, to serve one entry.
- **No registry at all, constants on the screen** — the band rule and the
  caption denominator would then be unreachable from a plain-node harness, which
  is where the two guards that matter are proven.
