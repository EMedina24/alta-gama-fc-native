# Season totals — the numbers stop leaving things out

**Status:** ready to build · **Backend:** shipped and live 2026-09-10 · **App:** not started
**Supersedes in part:** [0148](../.claude/decisions/0148-the-numbers-name-what-they-leave-out.md) ·
**Amends:** [0141](../.claude/decisions/0141-season-stats-reads-one-block.md)

---

## Why this exists

[0148](../.claude/decisions/0148-the-numbers-name-what-they-leave-out.md) was written two days ago
because Ed opened Season stats on TestFlight and read **`0 GOALS`** against Federico Valverde after
watching him score in the Champions League. The app was right and the screen was misleading.

0148 fixed the legibility — a line under the figures saying *"+1 goal in the Champions League"* —
and explicitly declined to fix the number, because there was nothing to fix it with. Its
alternatives list rejected `PlayerStatsView.overall` on the grounds that it *"sums across seasons
AND competitions, so it answers a career question, not 'what else happened this season'"*.

**That gap is now closed.** `senpai-backend` §120.15 shipped an all-competitions **per-season**
merge on 2026-09-10. Both stats routes now carry a `seasonTotals` array alongside `seasons`, and it
is exactly the thing 0148 needed and did not have.

⚠ **The backend half is done and deployed.** Verified against `crono-gol.com` on 2026-09-10:

| Valverde, 2026 | goals | assists | `coverage.sufficient` |
| --- | --- | --- | --- |
| `seasons[]` → `laliga` | **0** | 1 | `true` |
| `seasons[]` → `champions-league` | **1** | 0 | `false` |
| **`seasonTotals[]` → 2026** | **1** | **1** | `false` |

| Real Madrid, 2026 | goalsFor | goalsAgainst | yellows |
| --- | --- | --- | --- |
| `seasons[]` → `laliga` | 10 | 3 | 8 |
| `seasons[]` → `champions-league` | 2 | 1 | `null` |
| **`seasonTotals[]` → 2026** | **12** | **4** | **`null`** |

Nothing in the app reads it yet. `pickPlayerSeason` / `pickTeamSeason` still select the club's own
league block, so the screen still shows Valverde's `0`.

---

## ⚠⚠ Read this before you plan the change: a naive swap makes the screen WORSE

The obvious move — point `season` at the merged block and delete `ElsewhereLine` — regresses the
screen today, and the regression is invisible until you open a real club.

**1 · The merged block is below the coverage floor for months.** `sufficient` is an **AND** across
the contributing competitions, deliberately: a competition refused on its own must not ride another's
weight over the floor. The Champions League has played one matchday, so it sits under the absolute
floor of 3 fixtures — which drags **every merged block** for a club in Europe to `sufficient: false`
until roughly late October.

Concretely, for Valverde today:

```
laliga block        goals 0   goalsByBand { … }   sufficient true    → the timing chart DRAWS
merged block        goals 1   goalsByBand null    sufficient false   → the timing chart VANISHES
```

So the naive swap trades *"the right number with a chart"* for *"the right number with no chart"*.
The raw counters (goals, assists, cards, braces) are served either way — they can only ever be too
low, never invented — but everything derived is `null`.

**2 · `goalsByMatchweek` does not exist on a merged block, by design and permanently.** Matchweeks
are per-competition namespaces: LaLiga matchday 5 and Champions League matchday 5 are different
matches, so merging `{"5": 2}` with `{"5": 1}` would invent a matchweek in which he scored three
goals. The backend has no merged form and will not grow one. [0145](../.claude/decisions/0145-assisted-by-becomes-goals-by-matchweek.md)'s
chart therefore **cannot** be fed from `seasonTotals`.

✅ This one fails safely: `player-view.tsx:106` reads `season.goalsByMatchweek`, which is not a
property of `PlayerSeasonTotalsView`, so a wholesale swap is a **compile error** rather than a blank
card. Do not "fix" it by widening the type.

**3 · `scored` gates six panels off the wrong number if you are not careful.**
`player-view.tsx:101` is `const scored = season.goals > 0;` and it gates the penalty ring, the goal
timing chart and the four moment tiles. Feed it the merged `goals` while the charts still read the
league block and Valverde flips from `0` to `1`, opening all six panels over LaLiga data in which he
did not score — restoring the exact empty-ring failure 0148 item 2 removed.

**The gate must key off the block that FEEDS the chart, never off the headline.**

---

## Recommended shape

**The headline counts all competitions. The charts stay per-competition and say which.**

This keeps 0141's block choice where it is load-bearing (the charts, which genuinely cannot merge)
and reverses it where it was only ever a limitation (the figures, which now can).

### Player view

| Element | Source | Note |
| --- | --- | --- |
| `goals`, `assists`, `goalInvolvements` | **`seasonTotals`** | ⚠ The fix. Valverde reads `1`, not `0`. |
| Discipline counts | **`seasonTotals`** | Already gated on coverage per 0148; unchanged posture. |
| Penalty ring | league block | Merged `penaltyConversion` is null unless every competition can observe a miss — only the LaLiga family maps `missed-penalty`. |
| Goal timing chart | league block | Merged `goalsByBand` is null below the floor. |
| Goals by matchweek | league block | ⚠ No merged form exists. Ever. |
| Moment tiles | league block | Gated on the **league block's** `goals`, not the headline. |
| Runs / streak | league block | ⚠ `seasonTotals.longestScoringStreak` is a **MAX across competitions and a LOWER BOUND**, not a merged run — a league goal followed by a European one is a true run of 2 that reads as 1. Do not print it as an all-competitions streak. |

### Club view

The club side can merge much further, and the asymmetry is worth knowing: **`seasonTotals.timeline`
is a real merged, kickoff-ordered, competition-tagged array** — clubs have one, players do not. So
the cumulative-goals line, the run strip and the venue splits all merge cleanly and correctly.

| Element | Source | Note |
| --- | --- | --- |
| `goalsFor`, `goalsAgainst`, `goalDifference`, clean sheets | **`seasonTotals`** | Real Madrid reads `12`. |
| `timeline` → cumulative line, run strip | **`seasonTotals`** | ⚠ Still plot on the ARRAY INDEX, never `mw` — the merged array makes this more important, not less: two competitions' matchweeks now share one axis. |
| `longestScoringRun` etc. | **`seasonTotals`** | ⚠ Recomputed by the backend over the merged timeline, not summed and not maxed. |
| `scoringRun` | **`seasonTotals`** | ⚠ Its `startIndex`/`endIndex` address the **merged** timeline. Feeding it a per-competition array would highlight the wrong matches. |
| Cards, bands, comebacks | league block | Merged goes null below the floor. |

### What happens to `ElsewhereLine`

**It inverts rather than dying.** Today it says what the *numbers* leave out. After this it says what
the *charts* leave out — "timing shown for LaLiga only" — because the numbers no longer leave
anything out.

Keep the component and 0148's rules that still apply: under the thing it qualifies, never in a
footnote; a competition with no display name renders nothing rather than a raw slug; counts through
`phrases.*` so plural rules stay in one place.

⚠ Retiring it entirely is the tempting move and it is wrong: the charts really are league-only, and
an unlabelled chart under an all-competitions headline is the same class of error 0148 was written
about, pointing the other way.

---

## Files

| File | Change |
| --- | --- |
| `src/lib/cronogol/types.ts` (~1327–1560) | Mirror the five new backend types: `PlayerSeasonTotalsView`, `TeamSeasonTotalsView`, `StatsMergedTimelineEntryView`, `TeamMergedResultRefView`, `StatsMergedMomentView`; add `seasonTotals` to `PlayerStatsView` and `TeamStatsView`. ⚠ Copy from `handoff_season-totals/API-SEASON-TOTALS.md` (below) — do not retype. |
| `src/lib/cronogol/stats.ts` | Add `pickPlayerTotals(stats, season)` / `pickTeamTotals(stats, season)` — season only, no league argument, since a merged block is not per-competition. Keep `pickPlayerSeason`/`pickTeamSeason` for the charts. Repoint `playerElsewhere`/`teamElsewhere` at the chart-scope job. |
| `src/components/organisms/season-stats/player-view.tsx` | Split the props: a `totals` block for the figures, `season` for the charts. ⚠ Move `scored` to key off `season`, not `totals`. |
| `src/components/organisms/season-stats/club-view.tsx` | Same split; the timeline-driven charts move to `totals`. |
| `src/components/organisms/season-stats/elsewhere-line.tsx` | Re-aim at chart scope; copy keys change. |
| `src/app/club/[slug]/season-stats.tsx` (124, 176) | Pass both blocks down. |
| `src/i18n` copy | New/changed strings for the chart-scope line and any "all competitions" eyebrow. ⚠ Both locales. |
| `scripts/fixtures/stats-*.json` | ⚠⚠ **Re-capture — see below.** |
| `scripts/season-stats-harness.mjs` | Assertions for the merged block. |
| `.claude/decisions/0149-*.md` + README index | The ADR. |

### ⚠⚠ The captured fixtures are stale and will silently hide this whole feature

`scripts/fixtures/stats-player-valverde.json` and the other three were captured **2026-09-10, before
the merge shipped**. I checked: none of them contains a `seasonTotals` key.

That is trap 48 waiting to happen in its worst form — `src/app/_debug/stats-fixtures.ts` is
**generated** from those files, so every `_debug` sample and every harness assertion would run
against payloads in which the field does not exist, and a merged block would read as `undefined`
while the doc comments on both sides agreed it was fine.

**Re-capture first, before writing any code.** Do not hand-edit the literals — the file's own header
forbids it and the reason is this exact failure.

```bash
cd /Users/ed/Desktop/repos/alta-gama-fc-native
for f in "players/valverde-1" "teams/barcelona" "teams/bayern-munich" "players/raphinha"; do
  echo "$f"
done
curl -s "https://crono-gol.com/cronogol/players/valverde-1/stats"  -o scripts/fixtures/stats-player-valverde.json
curl -s "https://crono-gol.com/cronogol/players/raphinha/stats"    -o scripts/fixtures/stats-player-raphinha.json
curl -s "https://crono-gol.com/cronogol/teams/barcelona/stats"     -o scripts/fixtures/stats-team-barcelona.json
curl -s "https://crono-gol.com/cronogol/teams/bayern-munich/stats" -o scripts/fixtures/stats-team-bayern.json
# then regenerate src/app/_debug/stats-fixtures.ts from them
```

⚠ Valverde is the fixture that matters — 0148 already carries him as a real case asserting his LaLiga
block is `0`. **Keep that assertion** and add one beside it that `seasonTotals` reads `1`. The pair is
the regression test for this whole change.

---

## The ADR

Next number is **0149** (0148 is the highest today).

It amends 0141 rather than superseding it — the block choice survives for the charts — and
**supersedes 0148 in part**: 0148 item 1 ("the numbers name what they leave out") is replaced,
because the numbers no longer leave anything out. Items 2 (charts of nothing are not drawn), 3 (the
runs name the competition) and 4 (the footnote follows what is drawn) all stand, and item 3 becomes
*more* important, since the runs stay per-competition while the figures beside them no longer are.

Per `AGENTS.md`, mark 0148 `Superseded in part by 0149` rather than editing its history, and add the
row to `.claude/decisions/README.md`.

---

## Verification

1. `node scripts/season-stats-harness.mjs` — the pure half, no build. Add: merged Valverde reads
   `goals: 1`; his LaLiga block still reads `0`; the 2025 European block is **not** folded in (a
   merged block is one season, and folding a previous season would restate a career total as a
   season one — 0148's rule, still true).
2. `/_debug/stats` — the four regenerated payloads, both views.
3. On device, Real Madrid → Season stats:
   - **Club:** goals reads **12**, not 10. The run strip includes the 2026-09-08 tie against Inter.
   - **Players → Valverde:** reads **1 GOAL**, not 0. ⚠ This is the acceptance test; it is the exact
     screen from Ed's TestFlight screenshot.
   - ⚠ Cards/timing on both views are `null` → "not available", **not `0`**. Expected until the
     Champions League reaches three matchdays. If you see a `0` there, the coverage gate is wrong.
4. Barcelona → Players → a goalkeeper: still `PlayerEmpty`, not a crash. Merged blocks do not change
   the empty case.
5. Bayern: unchanged. The Bundesliga writes no events, plays no European tie in the payload, and its
   merged block is its league block.

---

## Two things to know that are not app bugs

**1 · ~~`seasonTotals[].yellows` is typed `number | null`~~ — ⚠ SUPERSEDED, it was narrowed.**
`PlayerSeasonStatsView.yellows` is non-nullable on the wire, so the all-or-null merge always found two
numbers. Reported upstream and **narrowed to `number` on 2026-09-10** (`senpai-backend` decision
`0058`, "Amended"), after four players' production payloads were checked. **Mirror it as `number`** —
this note's original "mirror it as nullable for now" is the opposite of current. (The club side is
genuinely nullable — that one is real and unchanged.)

⚠ Narrowing removed a dead branch, not a hazard: below the coverage floor these still answer `0`, so
gate them on `coverage.sufficient` rather than on nullability.

**2 · A merged block's `coverage.sufficient` is an AND, not a ratio.** Valverde's merged 2026 block
reads `ratio: 1` with `sufficient: false` — 5 of 5 fixtures counted, a perfect ratio, still refused,
because one contributing competition was refused on its own. Do not "fix" this by recomputing
`sufficient` from `fixturesCounted / fixturesTotal` client-side: that is precisely the laundering the
backend rejects, and it would publish event numbers for a competition that declined to publish them.

---

## Reference

- Backend spec: `senpai-backend/CRONOGOL.md` **§120.15**
- Backend decision: `senpai-backend/.claude/decisions/0058-season-stats-tables.md`, "Extended
  2026-09-10"
- Contract, both copies: `senpai-backend/CRONOGOL-API.md` and `cronogol/cronogol-api.md`, the
  "The all-competitions season block (`seasonTotals`)" section under `## Season stats`
- Backend verification: `senpai-backend/.claude/cronogol/verification-log.md`, 2026-09-10

⚠ The **web app renders none of this** — `cronogol` consumes no stats endpoints at all. This screen is
the only surface in the product where the merged numbers appear, so there is no reference
implementation to match. That is unusual here and worth saying out loud: `AGENTS.md` says match
`cronogol` rather than inventing, and on this screen there is nothing to match.
