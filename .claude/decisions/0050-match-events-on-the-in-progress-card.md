# 0050 — The in-progress card expands into its match timeline

- **Date:** 2026-08-28
- **Status:** Accepted — built and gate-clean; the panel is empty on real data
  until the backend lands live events
- **Decided by:** Ed Medina
- **Revises:** divergence 1 of [0045](./0045-match-events-expanded-row.md). The
  rest of 0045, and all of [0046](./0046-match-events-grouping-tabs.md), stand.

## Context

`handoff_event-expansion/`'s design rule 3 put the expanded timeline on the
**in-progress card's** footer row. [0045](./0045-match-events-expanded-row.md)
struck that out and moved the disclosure to the last-result card instead, for a
reason that was correct at the time:

> the events ingest is finished-only and three-hourly, so an in-play match has no
> events at all. A chevron there would open on nothing, every time.

**That premise has expired, and the data has not yet arrived.** Both halves of
that sentence matter.

The backend probed the upstream during play on 2026-08-28 — Racing Santander v
Elche, `FirstHalf`, 31 minutes, 2-0 — and the events endpoint returned both goals
with the scorer named. ⭐ The payload is **shape-identical to a finished match's**,
so `laliga-events.mapper.ts` maps it unchanged: no new mapper, no new types.
`senpai-backend/.claude/cronogol/live-phase-2.md` strand A is the plan, speccing
`CRONOGOL.md` §98.

But nothing serves it yet. Checked against production on the same day, on a match
that was **3-0 at 51 minutes**:

```
GET /cronogol/live                             → no `events` array
GET /cronogol/fixtures/d70bfe7b…/events        → {"events":[],"count":0}
```

And the backend's own decision about **where live events land** is still open —
`live-phase-2.md` lists three candidates: write into `match_events`, a new
`live_match_events` table, or serve them inline on `/cronogol/live`.

So this change builds the app half against a known-temporary absence, in a shape
that does not care which of the three the backend picks.

## Decisions

### 1 · The chevron returns because 0045's premise expired — not because the data did

The card gets its disclosure back and renders the same `MatchEvents` panel the
last-result card and the matchday rows already use. Same tabs, same rows, same
`showTitle={false}`, same feed order.

⚠⚠ **On real data today it opens on `notPublished`, every time.** That is the
expected state, not a defect, and it is the state
[LIVE-SCORES.md §6](../LIVE-SCORES.md) has been asking us to handle explicitly
since the live scoreline shipped — *"a live scoreline beside an empty timeline is
the expected shape, and worth handling explicitly so it does not read as a bug."*
An expanded panel that says why it is empty **is** that handling. The alternative
on offer was to keep saying nothing at all.

⚠ The disclosure is gated on `id !== null`, not on data — the same
gate-on-status-not-data rule 0045 argued for, which has not changed: knowing the
count before the tap requires the pre-fetch that a matchday list forbids.

### 2 · `notPublished` is reused, and a live-specific line was rejected

The obvious move is a second copy key — *"Events appear after the whistle"* —
which is more explicit about today. It was rejected because it is **true only
until §98 lands**, at which point it becomes a lie the app tells about its own
feed, in two languages, on the card the whole live feature exists to serve.

*"This match's events aren't published yet."* is true in both worlds. It was
already written with exactly this care (0045: never "no goals", never "0 events"),
and it needed no new key in `en` or `es`.

### 3 · `supplied` — one prop for the backend's open decision

`MatchEvents` takes an optional `supplied?: readonly MatchEventView[]`, which
bypasses the query entirely.

- If live events land in **`match_events`** (options 1 and 2), the existing route
  fills in and this panel lights up with **no app change at all**.
- If they arrive **inline on `/cronogol/live`** (option 3), the screen passes them
  here and nothing else moves — not the panel, not `EventTabs`, not `EventRow`,
  not `lib/cronogol/events`.

⚠ **`[]` and `undefined` are different answers.** `[]` means "I hold it and it is
empty" → `notPublished`. `undefined` means "fetch it yourself" → every existing
caller, unchanged.

⚠ **The `isPending` / `isError` branches are gated on `!held`.** A disabled React
Query reports `isPending` forever, so without that gate a supplied set would paint
skeletons on top of data already in hand. This is the one way the seam could have
shipped broken.

⚠ It is also what lets `/_debug/gallery` draw an expanded live card at all: the
gallery's rows are fabricated, and a real fetch off a fake id settles on the
ERROR copy.

> ⚠ **REVISED by [0051](./0051-live-match-events-inline.md), 2026-08-28.**
> Decisions 4 and 5 are reversed and the code is removed. They were right under
> this entry's premise — that live events might land in `match_events` — and the
> backend chose to serve them inline on `/cronogol/live` instead, so the events
> now arrive with the score and the second poll would be a request a minute at a
> sweep that cannot have anything. Decisions 1, 2, 3, 6 and 7 stand.

### 4 · `STALE.liveEvents` is 60s, and neither existing bucket fits

A fourth bucket, chosen under `stale.ts`'s own rule that a new query picks one and
can say why.

- ⚠ **`feed` (15 min) is the bug in one direction:** an open panel on a live match
  would sit a goal half an hour behind the scoreline **on the same card**.
- ⚠ **`live` (15s) is the bug in the other:** the events route's own header is
  `max-age=60`, so three of every four polls are spent to be handed the identical
  body.

The `staleTime` moves with the interval, not just the interval — left at `feed`, a
remount inside fifteen minutes would serve a cached empty array to a match that
has since scored, and the poll would only correct it a minute later.

### 5 · Polling is gated on a live row AND a focused tab

`pollEvents: focused && match !== null`, the same discipline `useLive` documents,
plus `refetchIntervalInBackground: false`.

⚠ **The `match !== null` half is not redundant.** The sweep path renders the same
card for every non-LaLiga league, and those events move on a three-hourly cron —
a request a minute there buys nothing. And an interval that outlives the reader's
attention is a request a minute for the life of the process, for a match that
finished at half past seven.

### 6 · The honesty note stays above the panel

Card order is unchanged where it matters: pill + minute → score → rule → note →
disclosure → panel.

⚠⚠ The note is the line that says which of the three truths this card is telling
— live, live-but-stalled, or sweep (HANDOFF trap 8, and 0049 for why the stalled
branch is load-bearing). Putting the disclosure above it would bury it under an
expanded panel, which is how it stops being read.

### 7 · The disclosure row is shared, not written twice

`EventsDisclosure` is a local component in `match-board.tsx`, used by both cards.

⚠ Two copies of an accessibility contract is two chances for one of them to lose
its `accessibilityState={{ expanded }}` — which is the half VoiceOver actually
announces, and which nothing in the toolchain checks.

The single `showEvents` boolean still holds: the live card early-returns, so the
two expandable cards are never on screen together.

## What was NOT built

- ⛔ **Nothing against `CRONOGOL.md` §98.** No route serves it, its shape is not
  frozen, and `LIVE-SCORES.md` §6 is explicit that it must not be built against.
  `supplied` is a seam in *our* component; it encodes nothing about the wire.
- ⛔ **No new copy key**, in either language — see decision 2.
- ⛔ **The Matchdays rows and the club page are untouched.** They already expand
  finished matches, and their in-play rows are the next surface, not this one.
- ⛔ **The fixture-window gap is not addressed here.** `boardLive` tier 1 still
  iterates fixtures, so a match kicking off after the last window fetch is
  invisible for up to fifteen minutes — HANDOFF records it, it revises 0048's
  decision 2, and it needs its own entry.

## Consequences

- The in-progress card is now the app's third `MatchEvents` surface, and the
  first that can be expanded before a match has finished.
- ~~⚠ **The empty panel is the visible state until the backend ships strand A.**~~
  **Strand A landed the same day** — [0051](./0051-live-match-events-inline.md).
  The panel now fills from `/cronogol/live`. ⚠ It still opens on a sentence
  whenever the timeline is genuinely empty, and that remains correct.
- The two `/_debug/gallery` cases are the only place the filled-in shape can be
  seen today, and the only place the corner clipping was ever verified.
