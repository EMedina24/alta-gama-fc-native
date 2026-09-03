# 0106 — The NEXT UP card refuses a stale pick

- **Date:** 2026-09-02
- **Status:** Accepted — verified against production fixtures for both a Puerto Rican and a LaLiga club
- **Decided by:** Ed Medina

## Context
`nextUpIndex` picks the first `scheduled`/`live` fixture in a club's list and is
**deliberately not a clock comparison.** Its own comment says why: the API tier
has served a finished season before, and a `kickoffUtc > now` test renders an
empty app when that happens. That reasoning is sound and is not reversed here.

Puerto Rico broke the other side of it. The federation publishes a **completed**
standings table — 11 clubs, 110 of 110 matches played, a form guide on every row
— while leaving **every fixture at `scheduled` with no score.** Confirmed
against production: all 20 of Ponce's fixtures, kickoffs running February to
June 2026, every one `status: 'scheduled'`, `goalsFor`/`goalsAgainst` null. It is
not a sync lag; the source enters no results, and the backend's mapper records
that null scores there are normal and must never be written as `0`.

So the order-based pick lands on a match played in February, and the club page
announces it as NEXT UP — under a card that carries a **countdown**.

## Decision
The pick stays exactly as the spine makes it. **Only the card refuses it.**

`nextUp(fixtures, now)` wraps `nextUpIndex` — which is unchanged and still
order-driven — and returns `null` when the chosen fixture's kickoff is more than
**48 hours** past. The club page's NEXT UP card reads it.

**The season spine reads it too, but only for the ACCENT.** Which row is "next"
is still `nextUpIndex`'s answer and the row is still drawn in its place; what the
spine stops doing is *lighting* it — the lime date, the filled node and the lime
card border. That accent is the same claim the card declines to make, in a
different visual language, and leaving it on put an accented February fixture
one scroll below an absent NEXT UP card. Found on the simulator, not in review.

⚠ `now` is read **once at mount** (`useState(() => Date.now())`, the pattern
`countdown.tsx` already uses), never in the render body: `Date.now()` during
render is impure and the repo's lint rejects it. A 48-hour threshold has no use
for a ticking clock, and both screens remount when they are opened.

Two days, not two hours, because a past kickoff sitting at `scheduled` is a
**normal state for every league**: the fixture sweep runs three-hourly, so
between a final whistle and the row being marked `finished` there is a real
window where the honest answer is "the result has not arrived yet". Suppressing
inside that window would blank a correct card on a LaLiga Sunday. Two days clears
it many times over and still catches a result that is never coming.

A fixture with **no kickoff at all** is never stale — it has made no claim about
when it is, and the card's own TBD state is the right one. An unparseable
kickoff is treated the same way: the card renders rather than vanishing on a
string we failed to read.

## Consequences
- A Puerto Rican club page shows the hero, the standing strip, the season spine
  and the squad, and **no NEXT UP card** — which is the honest state for a
  finished season, and the same absence the page already handles for a club with
  no upcoming fixture. The spine lists all 20 fixtures with no node lit.
- Verified on live data: Ponce's order-pick (`2026-02-09`) is suppressed, while
  Real Madrid's (`2026-09-04`) still renders.
- ⚠ The suppression is **per card, not per league.** Any club in any league whose
  next fixture is two days stale loses the card — deliberately, since that
  fixture is not "next" in any sense the reader means. If a whole league goes
  stale it is a data problem, and a missing card is the correct symptom.
- ⚠ `nextUpIndex` is still exported and still used by the spine. Anything new
  reaching for "the next match" should ask which of the two it means: the
  **list's** next row, or a **claim** about the future.
- The Today screen's crown is unaffected — it is fed by the fixture *window*,
  which is bounded by date already, so no past match can reach it.

## Alternatives considered
- **Make `nextUpIndex` itself clock-aware.** Rejected — that is the reversal its
  comment warns against, and it would empty the spine, which should draw whatever
  season it is handed.
- **Suppress on the league instead** (`League.calendarYearSeason`, or a new
  "results never land" flag). Rejected: it would encode a source's current
  shortcoming as a permanent property of Puerto Rican football, and past FPF
  seasons *do* carry `STATUS_COMPLETE`. If results start arriving, this guard
  stops firing on its own, with nothing to un-set.
- **Show the card with the stale match and a "final not published" note.**
  Rejected — the card's whole shape is anticipation, and a countdown to February
  cannot be captioned out of being wrong.
