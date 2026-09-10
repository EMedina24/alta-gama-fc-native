# 0143 — A null renders as ABSENCE, never as zero

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Claude

## Context

The season-stats routes null a field to mean **"we do not know"**, for two
independent reasons: the competition holds no trustworthy events, or the season
is too thinly swept. `CRONOGOL-API.md` states it plainly — *"rendering a null as
`0` is the single most damaging thing a client can do with this API"* — and this
is not an edge case waiting to happen. Verified live 2026-09-10:

- **Bayern (Bundesliga)**: `yellows`, `reds`, `comebackWins`, `comebackPoints`,
  `goalsForByBand`, `goalsAgainstByBand` all `null`, while the scoreline block is
  complete. That source writes no events at all; it is a known open defect, not a
  blip, so this is permanent.
- **Barcelona (Champions League 2026)**: `coverage.sufficient: false` at
  `ratio: 1` — there is a minimum-fixtures floor, so a fully-swept block can
  still publish nothing.

## Decision

**A card whose data is null is not drawn, and one line says why.**

`hasEvents(coverage)` is read once per view and gates the event-derived half as a
GROUP — which is how the backend nulls them, on purpose, so that a real card
count never sits beside a null comeback count. When it is false the Club view
shows its four scoreline cards and a `CoverageNote` carrying
`coverage.fixturesCounted / fixturesTotal`; the Players view shows identity,
goals and the penalty split, and the same note.

Precedent for omission over dashes:
[`club-stats-strip`](../../src/components/molecules/club-stats-strip.tsx) is not
drawn when `bandsApply` fails, and `squad-list` drops empty position bands
because "Goalkeepers 0" is a claim about the club.

`lib/cronogol/stats.ts` returns `T | null` from every derivation and never
coerces. `lateShare` returns `null` for absent bands **and** for present-but-empty
ones: a share of nothing is unanswerable, not `0%`.

⚠ **The band denominator is the BANDED total, never the goal total.** A goal with
no recorded minute counts in `goals` and is dropped from `goalsByBand`, so
`late / goals` silently understates. `bandTotal` exists so no call site can reach
for `season.goals` by reflex.

⚠ **`timeline`, `scoringRun` and the scoreline block are NEVER null** — they need
no events. A client treating `timeline` as nullable renders a blank card on the
Bundesliga, where it is the only chart that works.

## Consequences

- The Bundesliga screen is four cards and a sentence. That is the honest shape,
  and the sentence is what stops it reading as broken.
- ⚠ **The player payload does NOT null its counts** — a block marked
  insufficient still answers `yellows: 0, braces: 0` (Raphinha's 2026 Champions
  League block). Those zeroes are "we did not look" wearing the costume of "it
  did not happen", so the Players view gates them behind `hasEvents` anyway,
  rather than printing them because the type permits it.
- ⚠ `quickestBooking: null` is ambiguous — never booked, or below the floor —
  and the wire cannot distinguish them. Its card is reachable only inside the
  `events` branch, so an absent one there means "not booked"; outside it nothing
  is claimed either way.
- Three states get three strings, per `match-events.tsx`'s doctrine: a failed
  request is not an empty one.
- `/_debug/stats` renders all of it from REAL captured payloads (trap 48), so
  the null handling is reviewable without waiting for a league to break.

## Alternatives considered

- **Render nulls as `0`** — states as fact that a club conceded no late goals
  and was shown no cards. The failure this decision exists to prevent.
- **Render nulls as `—`** — a dash in a card of numbers reads as a rendering
  fault, and a card of dashes says nothing the card's absence does not.
- **Hide the cards silently** — a screen that drops three of six cards and
  explains nothing looks broken, which is why `CoverageNote` is not optional.
