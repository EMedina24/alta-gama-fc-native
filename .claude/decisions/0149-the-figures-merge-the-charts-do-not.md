# 0149 — The figures merge; the charts do not

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Ed (reported the original screen from TestFlight), Claude
- **Amends:** [0141](./0141-season-stats-reads-one-block.md) — the one-block
  choice survives where it is load-bearing (the charts) and is reversed where it
  was only ever a limitation (the figures).
- **Supersedes in part:** [0148](./0148-the-numbers-name-what-they-leave-out.md)
  — item 1's mechanism only. Items 2, 3 and 4 stand, and item 3 becomes *more*
  important.

## Context

[0148](./0148-the-numbers-name-what-they-leave-out.md) was written a day earlier
because Ed opened Season stats on TestFlight and read **`0 GOALS`** against
Federico Valverde after watching him score in the Champions League. It fixed the
legibility — a line under the figures reading *"+1 goal in the Champions
League"* — and **explicitly declined to fix the number**, because there was
nothing to fix it with. Its alternatives list rejected `PlayerStatsView.overall`
on the grounds that it *"sums across seasons AND competitions, so it answers a
career question, not 'what else happened this season'"*.

**That gap is now closed.** `senpai-backend` §120.15 shipped an all-competitions
**per-season** merge on 2026-09-10, and both stats routes carry a `seasonTotals`
array alongside `seasons`. Verified against production:

| 2026 | `seasons[]` → league | `seasons[]` → UCL | **`seasonTotals[]`** |
| --- | --- | --- | --- |
| Valverde goals | **0** | 1 | **1** |
| Raphinha goals | 6 | 2 | **8** |
| Barcelona `goalsFor` | 17 | 5 | **22** |

## Decision

**The headline figures count every competition. The charts stay
per-competition and say which.**

### 1 · The figures read the merged block

`pickPlayerTotals` / `pickTeamTotals` select by season alone — a merged block is
not per-competition, so asking for "the merged laliga block" is a category
error. `pickPlayerSeason` / `pickTeamSeason` stay exactly as they were and are
picked beside them. Valverde now reads `1 GOAL`.

### 2 · A naive swap would have made the screen worse, in three ways

This is the substance of the decision, not a caveat on it.

- **The merged block is below the coverage floor for months.**
  `coverage.sufficient` is an **AND** across the contributing competitions,
  deliberately: a competition refused on its own must not ride another's weight
  over the floor. The Champions League has played one matchday, so every merged
  block for a club in Europe reads `sufficient: false` — at `ratio: 1`, five of
  five fixtures counted — until roughly late October. Pointing the charts at it
  trades *the right number with a chart* for *the right number with no chart*.
  ⚠ Never recompute `sufficient` from `fixturesCounted / fixturesTotal`: that is
  the laundering the backend exists to refuse.
- **`goalsByMatchweek` has no merged form, permanently.** Matchweek numbers are
  per-competition namespaces. Barcelona's merged 2026 timeline reads
  `mw [2, 1, 3, 4, 1]` — LaLiga matchday 1 and Champions League matchday 1, two
  different nights carrying the same number — so a merged grouping would invent a
  matchday holding both. `PlayerSeasonTotalsView` therefore has no such field and
  never will.
- **The `scored` gate must key off the block that FEEDS the charts.**
  `player-view.tsx` gates six panels on `goals > 0`. Feed it the merged goals
  while the charts still read the league block and Valverde flips `0 → 1`, opening
  all six over LaLiga data in which he did not score — restoring the exact empty
  penalty ring and seven flat timing stubs that 0148 item 2 removed.

### 3 · Scope is a property of a CARD, not of a number

Where a card could take some merged values and some per-competition ones, it
takes **neither mixture**: the whole card is one scope, so one line under it can
label it truthfully.

| | Player view | Club view |
| --- | --- | --- |
| **Merged** | the three headline figures | goals + cumulative line + biggest win · the two rings · the run + strip |
| **Per-competition** | penalty ring · goal timing · goals by matchweek · moment tiles · discipline | goals per matchweek + venue splits · conceded bands · comebacks + discipline |

The club merges much further than the player because
**`TeamSeasonTotalsView.timeline` is a real merged, kickoff-ordered,
competition-tagged chronology and the player has no equivalent.** So the club's
runs are RECOMPUTED over it — not summed, not maxed — while the player's
`longestScoringStreak` is a MAX across competitions and therefore only a *lower
bound*: a league goal followed by a European one is a true run of 2 that reads as
1. That asymmetry is why the player keeps far more on the per-competition block.

Two placements deviate from the handoff plan, both under the card rule:

- **Discipline stays per-competition** on both views. Honouring the merged
  `coverage.sufficient` for an event-derived card means hiding it outright for
  every club in Europe until the Champions League clears the floor. The league
  block has a real, swept answer; labelling it is a smaller compromise than
  withholding it.
- **The club's venue splits stay per-competition**, though the merged block
  serves them, because they share a card with the matchweek bars — which can
  never merge. A card mixing a LaLiga chart with all-competitions splits cannot
  be labelled. ⚠ Reversible the moment the splits get a card of their own.

### 4 · 0148's line inverts rather than dying

`ElsewhereLine` becomes `scope-line.tsx`, and the job flips: 0148 had the
**numbers** name what they left out; now the numbers leave nothing out and the
**charts** do.

- `AllCompetitions` sits under the figures. Without it the eyebrow four rows up
  (`LALIGA · 2026/27 · 38 MATCHES`) actively misdescribes the numbers below it —
  0148's failure pointing the other way. ⚠ Renders **nothing** when the merged
  block holds one competition: Bayern's merged block *is* its Bundesliga block,
  and "all competitions" over one competition is noise.
- `ScopeOnly` sits inside each per-competition card — *"LaLiga matches only"*.
  ⚠ Also nothing when there is no gap to disclaim.

⚠ Retiring the line entirely was the tempting move and it is wrong: an
unlabelled league-only chart under an all-competitions headline is precisely the
class of error 0148 was written about.

0148's surviving rules: under the thing it qualifies and never in a footnote; a
competition with no display name renders **no name** rather than a raw slug.
⚠ On the list that rule is **all-or-nothing** — dropping one unnameable slug
would print a shorter list that reads as complete.

`copy.stats.competitionNames` values become **bare** ("Champions League", not
"la Champions"): 0148's articles were built for one sentence, and every context
here is a list or a label where an article reads wrong. `phrases.goals/assists/and`
are removed with the counts they served.

### 5 · The club run label loses its competition; the player's keeps it

`copy.runValueAll` names no competition, because the merged club run genuinely
spans them — calling it *"straight LaLiga matches"* would understate what the
number counts. Where the merged block holds one competition it **is** that
competition's run and `runValue` names it as before. ⚠ The player's streak is the
opposite case (a MAX, a lower bound), so 0148 item 3 stands there unchanged.

### 6 · Fixtures were re-captured FIRST, and the generator now exists

`scripts/fixtures/stats-*.json` predated the merge — none contained
`seasonTotals` — and `src/app/_debug/stats-fixtures.ts` is generated from them,
so building against them would have made every merged block read `undefined`
while the doc comments on both sides agreed it was fine. Trap 48 in its worst
form.

⚠⚠ **The file said "GENERATED" and nothing generated it**, so the only way to
refresh it was the hand-editing its own header forbids.
`scripts/gen-stats-fixtures.mjs` now does, selecting every block by season and
competition rather than by index, and asserting nine structural guards.

Two real data changes surfaced in the re-capture, neither a bug: Raphinha's 2025
Champions League coverage went 3/3 → 12/12 (a backfill — the retroactive revision
[0146](./0146-season-stats-supersedes-no-player-endpoint.md) warns about), and
Bayern gained a 2025 Champions League block, so the harness guard now asserts
*one 2026 block, and it is the Bundesliga* instead of a payload length.

## Consequences

- Valverde reads `1 GOAL`. The screen from Ed's screenshot is fixed at the
  number, not only at the caption.
- ⚠ **Cards and timing read "not available", never `0`,** on both views for a
  club in Europe until the Champions League reaches three matchdays. A `0` there
  means the coverage gate is wrong.
- The merged/per-competition boundary is a single horizontal line through each
  view — cards 1–3 merged, 4–6 per-competition on the club side — which is why
  the scope lines are legible rather than alternating.
- `axisLabels` falls back to POSITIONS on a merged timeline, because "MD1" would
  name two different nights. Detected from the entries' own `competition`, since a
  merged array is structurally assignable to the per-competition one.
- ⚠ That structural assignability is a standing hazard: **TypeScript cannot stop
  a merged timeline being passed to `goalsByMatchweek`.** The harness therefore
  asserts the *wrong answer* it returns for Barcelona's real merged array, so the
  trap stays proven rather than described.
- ⚠ `seasonTotals[].yellows` shipped as `number | null` but could never be null
  for a player — `PlayerSeasonStatsView.yellows` is non-nullable, so the
  all-or-null merge always found two numbers. Reported upstream and **narrowed to
  `number` on 2026-09-10** (`senpai-backend` decision `0058`, "Amended"); mirrored
  here. **The club side is genuinely nullable** and stays so. ⚠ Narrowing removed
  a dead branch, not a hazard: below the floor these still answer `0`, which is
  why this screen reads discipline from the league block regardless.
- ⚠ **The merged `scoringRun` matchweek pair was a backend contract gap too, and
  this app found it.** `senpai-backend` §120.15 argued the matchweek-namespace
  rule to drop `goalsByMatchweek`, then served a `scoringRun` whose
  `fromMatchweek`/`toMatchweek` come from different competitions. Both are
  non-null and look usable, so nothing in the payload signals it — the "MD2 → MD1"
  caption below is that gap surfacing here. Documented upstream on 2026-09-10; the
  kickoffs were always served and are always safe.
- ⚠ `RunStrip`'s `seasonLength` is the LEAGUE's round count and the merged season
  is longer. It is a floor, not a total — the strip sizes on
  `max(cells.length, seasonLength)`, so it expands rather than overflowing.
- ⚠ **The web app renders none of this** — `cronogol` consumes no stats endpoints
  at all — so this screen is the only surface where the merged numbers appear and
  `AGENTS.md`'s "match `cronogol` rather than inventing" has nothing to match.
- ⚠ Pre-existing and surfaced by Bayern's run of 1: `runValue`/`runValueAll`/
  `streak` are unconditionally plural, so a run of one reads *"1 straight
  Bundesliga matches scored in"*. Predates this change; a plural rule belongs in
  `phrases` and is left for a copy decision.

## Alternatives considered

- **Point everything at the merged block and delete the line** — the handoff's
  first instinct, and it regresses the screen invisibly: Valverde's chart
  vanishes, the matchweek card breaks permanently, and the `scored` gate reopens
  six empty panels.
- **Recompute `sufficient` from the ratio** so merged event fields render now —
  publishes event numbers for a competition that declined to publish them.
- **Show a competition picker** — declined in 0148 and still declined; the merge
  removes the question a picker was answering.
- **Keep the counted line ("+2 goals in the Champions League") under the charts**
  — informative, but it invites the reading that the headline *excludes* them,
  which is the confusion this change exists to end. Naming the scope is
  unambiguous; naming counts is not.
- **Merge the venue splits anyway** — correct data, unlabellable card. See item 3.
