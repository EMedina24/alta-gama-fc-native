# 0051 — Live match events arrive inline on `/cronogol/live`

- **Date:** 2026-08-28
- **Status:** Accepted — built and gate-clean; verified against the shape the
  route now serves
- **Decided by:** Ed Medina
- **Revises:** decisions 4 and 5 of
  [0050](./0050-match-events-on-the-in-progress-card.md). Its decisions 1, 2, 3,
  6 and 7 stand.
- **Backend:** `senpai-backend` §98 / `decisions/0032-live-match-events`,
  deployed 2026-08-28.

## Context

[0050](./0050-match-events-on-the-in-progress-card.md) built the in-progress
card's timeline against an absence, and named the fork it could not resolve:
`live-phase-2.md` listed **three** places live events might land, and the app's
next move depended on which. It shipped a `supplied` prop so that whichever
landed, only the source would change.

**The backend chose the third: events inline on `GET /cronogol/live`.** The
migration says why in its own words — the alternative was a `live_match_events`
table, rejected because *"the only consumer is one route that already selects
this row, so a table buys a join, a second RLS block, a second mapper and a set
of indexes for data that is deleted at full time."*

Confirmed in production, 2026-08-28 19:07 UTC:

```jsonc
{ "fixtureId": "65817bc4-…", "minute": 6, "score": {"home": 0, "away": 0},
  "lastSeenAt": "2026-08-28T19:07:11.158+00:00",
  "events": [] }                                   // ⭐ the new key
```

⚠ It took two deploys. The first failed to build: `f6f82f7` shipped the
migration and the code that reads `events` but not the regenerated
`database.types.ts`, and the column had not been applied to the database — the
exact failure that migration's own header warns about.

## Decisions

### 1 · The seam absorbed it, and that is the whole app-side story

`suppliedEvents: match?.events` on the live path. That single expression is the
integration. `MatchEvents`, `EventTabs`, `EventRow` and every pure function in
`lib/cronogol/events.ts` are unchanged in behaviour.

⚠ **`undefined` vs `[]` is what selects the source, and the distinction is
load-bearing.** `match?.events` is `undefined` on the sweep path — a followed
Premier League club has no live row — and the panel then falls back to the
durable finished-match route exactly as before. An `[]` means the live route is
holding an empty timeline, and the panel says so rather than going to ask a
3-hourly sweep that has nothing either. **Never default this to `[]`.**

### 2 · `TimelineEventView`, and `LiveMatchEventView` as an alias rather than a copy

The wire shapes are identical but for the durable row's `id`, which the backend
did deliberately: *"same field names … so you render it with the same
component"*, so *"the app learns ONE vocabulary."*

So `TimelineEventView = Omit<MatchEventView, 'id'>` is what every pure function
now takes, and `LiveMatchEventView` is an **alias** of it.

⚠ Two hand-maintained copies of one wire shape is how they drift. If the two ever
genuinely diverge, that alias is the single line to split — and the live-specific
caveats (`player.slug` usually null in play, own-goal `teamSlug` being the
scorer's side, `[]` conflating two states) live on `LiveMatchView.events`, where
a reader meets them in context.

### 3 · ⚠⚠ One composed key for both sources — the handover is the reason

`eventKey(event, index)` replaces `key={event.id}` **everywhere**, including on
the surfaces that still have an `id`.

The obvious reading is that live events lack an `id` so they need something else.
That is true and it is not the reason. **The panel switches source mid-match**:
live events while the match is played, durable stored rows once it ends. Keying
one on `id` and the other on an index would remount every row at exactly that
handover — a visible flash at the moment a reader is most likely watching.

⚠ `index` is the tiebreaker, not the identity. Two substitutions can share a
minute, a team and a period, and a genuine duplicate must still render twice
rather than collapsing into one row.

### 4 · ⚠ The durable-route poll is RETIRED — 0050 decisions 4 and 5 reversed

0050 added `STALE.liveEvents` (60s) and a `polling` option on
`useFixtureEvents`, so an open panel over a live match would re-read the durable
route. **Both are removed.**

They were correct under 0050's premise — that live events might land in
`match_events`, making the durable route the live source. Under option 3 that
premise is gone: the events arrive with the score, on `/cronogol/live`'s own
~30s refresh, which the app already polls every 15s. Keeping the second poll
would mean **a request a minute at a 3-hourly, finished-only sweep that cannot
have anything for a match still in play** — spend for a guaranteed empty body.

⚠ `use-fixture-events.ts` now carries a note saying it deliberately does not
poll, and why, so the next reader does not re-add it.

⚠ The bucket went with it rather than being left unused: `stale.ts` says a query
must choose a bucket and be able to say why, and a bucket no query chooses is
the same rot from the other end.

## What was NOT built

- ⛔ **Player links.** `player.slug` is now on screen's doorstep and is still not
  rendered — 0045 defers it, and the live slug is *usually null* anyway.
- ⛔ **Matchdays rows and the club page.** Still the two other `fixtureId`
  surfaces, still unbuilt, and now with more to gain.
- ⛔ **Any reconciliation at full time.** The live row vanishes, the card becomes
  the last-result card, and that card fetches the durable route. The handover is
  the absence of code, which is why decision 3 matters.
- ⛔ **`polling` as a stall signal.** Unrelated to this entry and still governed
  by [0049](./0049-stall-is-lastseenat-not-polling.md).

## Consequences

- The in-progress card can now say **who** scored, roughly 30s after it happens,
  with no request of its own.
- ⚠ **An empty timeline is still normal and still not "no goals."** The backend
  is explicit that `[]` conflates "nothing happened" with "not fetched yet";
  `score` is the tell if the difference is ever needed. The copy is unchanged and
  must stay unchanged.
- ⚠ **Verified against the id-less shape, not against real live events.** No
  LaLiga match had scored while this was built — Tenerife v Sporting was 0-0 at
  6′ with `events: []`, which is honest. `/_debug/gallery` carries a case built
  by stripping the ids off the existing fixture, which proves the rendering and
  `eventKey`; **a real scorer has not yet been seen on this card.**
