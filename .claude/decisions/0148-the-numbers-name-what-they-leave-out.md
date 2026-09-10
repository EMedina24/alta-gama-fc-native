# 0148 — The numbers NAME what they leave out

- **Date:** 2026-09-10
- **Status:** **Superseded in part by [0149](./0149-the-figures-merge-the-charts-do-not.md)**
  — item 1's MECHANISM only. `senpai-backend` §120.15 shipped an all-competitions
  per-season merge hours after this was written, so the numbers no longer leave
  anything out and the cross-reference line has nothing to name. Its rule survives
  inverted: the CHARTS are still per-competition and now say so. **Items 2 (charts
  of nothing are not drawn), 3 (the runs name the competition) and 4 (the footnote
  follows what is drawn) stand unchanged**, and item 3 matters more, since the runs
  stay per-competition while the figures beside them no longer are.
- **Decided by:** Ed (reported it from TestFlight; chose the cross-reference line
  over a competition picker), Claude
- **Amends:** [0141](./0141-season-stats-reads-one-block.md) — the block choice
  stands; this makes it legible.

## Context

Ed opened Season stats on TestFlight, Real Madrid → Players, and read
**`0 GOALS`** against Federico Valverde two days after watching him score in the
Champions League.

The app was right. Verified against production:

| Valverde, 2026 | goals | assists |
| --- | --- | --- |
| `laliga` | **0** | 1 |
| `champions-league` | **1** | 0 |

[0141](./0141-season-stats-reads-one-block.md) renders ONE block — the club's own
league — so the goal he actually scored is in a block the screen deliberately
does not show. The eyebrow said `LALIGA · 2026/27 · 38 MATCHES` four rows above,
and it was **visible in the screenshot he sent**, which is the strongest evidence
available that it was not doing the job.

**A correct number that the reader can disprove from memory is worse than a
missing one.** Nothing beside a big lime `0` said "in LaLiga", so the only
available reading was that the app was broken.

## Decision

**1 · The numbers name what they leave out.** `playerElsewhere` /
`teamElsewhere` in `stats.ts` return the SAME season's other competition blocks,
and `ElsewhereLine` renders one quiet line directly under the figures it
qualifies: *"+1 goal in the Champions League"*, *"+2 goals in the Champions
League"* on the club's goals card.

- ⚠ Under the NUMBERS, not in the footnote. A reader who has scrolled past them
  has already drawn their conclusion.
- ⚠ **Same season only.** Folding in a 2025 European record would restate a
  career total as a season one.
- ⚠ Blocks contributing nothing are dropped — "+0 goals" is noise.
- ⚠ A competition with no display name renders NOTHING. A raw
  `champions-league` slug must never reach a reader; silence is the smaller
  failure, the same call `competition-mark` makes for artwork it does not hold.
- Counts come from `phrases.goals/assists/and` so plural rules stay in one
  place; `copy.stats.elsewhere` decides only word ORDER, which is the half that
  actually differs by language.

**2 · Charts of nothing are not drawn.** The same screenshot showed an empty
penalty ring reading `0 NON-PEN` over `Open play 0 / From the spot 0`, and seven
flat hairline stubs under `GOAL TIMING`. A `scored = goals > 0` gate now
suppresses the penalty split, the goal timing chart and the four moment tiles
(braces, hat-tricks, longest run, super-sub) — every one of which is *derived*
from goals and therefore necessarily zero when goals is zero.

The line is: **counts of zero stay, charts of nothing go.** A zero is
information (`event-tabs`' rule) — but the card at the top already said `0
GOALS`, and six further panels restating it in chart form are the same fact
seven times, drawn as empty rings that read as a rendering fault.

⚠ **Discipline is NOT gated.** A player can be booked without scoring, so its
zero is a fact of its own rather than a restatement.

**3 · The runs name the COMPETITION, correcting
[0146](./0146-season-stats-supersedes-no-player-endpoint.md).** Ed's follow-up
— *"do the overall club goals also count the UCL ones?"* — sent me to the
backend source rather than to the data, because week 4 of a season cannot answer
it: the Champions League has played one matchday and it falls after every league
match, so no interleaving case exists yet to observe.

`season-stats-aggregate.ts` settles it. `computeTeamSeason` receives fixtures
already filtered to one competition-season; `played`, `scored` and the timeline
all derive from that list, and the player's `window` is built from the same one.
**Every figure in a block, runs included, is within one competition** — and the
denominators are too (`10 / 4 = 2.5`, not `10 / 5`, verified on Real Madrid).

0146 asked for the streak to be rendered with the CLUB named, so a bare number
would not read lower than a broadcaster's. That reasoning stands, but the label
it produced — *"straight Real Madrid matches scoring"* — makes exactly the
over-claim the goals figure made: it counts his club's matches **in this
competition**, so a European night sits outside it entirely. Both run labels now
take the competition (`copy.runValue`, `copy.streak`), fed `League.name` rather
than `copy.competitionNames` — those carry Spanish articles tuned for *"en la
Champions"*, which read wrong in *"partidos seguidos de …"*. The
not-appearances point 0146 wanted the club name for is carried by
`playerFootnote`, which item 3 below makes permanent.

⚠ One further subtlety the source records and no label can carry: a fixture
that failed the coverage gate is **excluded from the sequence, not treated as a
blank** — "we do not know whether he scored in it, and treating unknown as *did
not score* would break a real streak on our ingest gap".

**4 · The footnote follows what is drawn.** `playerFootnote` splits in two: the
timing-bands sentence now renders only when the timing chart does. A footnote
explaining an absent card is a small lie about what is on screen.

## Consequences

- The block choice is unchanged. This is not a competition picker and does not
  reopen 0141 — it names what 0141 leaves out, in one line, for free: both
  payloads are already in hand and no request is added.
- A goalless player's screen is now identity + the cross-reference line +
  discipline + footnote. Short, and every line on it says something.
- ⚠ The club line reports `goalsFor` and never assists: the club payload has no
  assist total, and synthesising one from the player blocks would count a goal
  twice.
- The harness carries Valverde as a fourth real fixture, asserting both that his
  LaLiga block really is `0` and that the 2025 block is NOT folded in.

## Alternatives considered

- **Competition chips** — switch the whole screen per competition. Offered and
  declined: real UI the mock does not have, and it reverses 0141's no-picker
  call to solve a legibility problem a sentence solves.
- **Label the stat columns `GOALS · LALIGA`** — fixes the misreading but tells
  the reader nothing about the goal they remember, which is the thing they came
  to check.
- **Show `PlayerStatsView.overall`** — sums across seasons AND competitions, so
  it answers a career question, not "what else happened this season".
- **Hide the zero entirely** — a player who has not scored in the league is a
  fact worth stating; the problem was never the zero, it was the missing scope.
