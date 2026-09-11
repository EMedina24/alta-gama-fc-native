# 0154 — The "Open club" link is gated on the CATALOGUE

- **Date:** 2026-09-11
- **Status:** Accepted
- **Decided by:** Ed (chose "expand, no club link" over linking every row or making untracked rows inert)
- **Builds on:** trap 1 · [0141](./0141-season-stats-reads-one-block.md) (absence is a real answer)

## Context

⚠⚠ **Half the Champions League field has no club page here.** Measured
2026-09-11: **18 of the 36** league-phase clubs are absent from
`GET /cronogol/teams` — PSG, Oporto, Galatasaray, PSV, Feyenoord, Bodø/Glimt,
Slavia Praha, Sparta Bratislava, Lens, LASK, Shakhtar, Sporting, Viking, AEK,
Lille, Club Brugge, Fenerbahçe, Sabah.

They do not 404. `GET /cronogol/teams/psg/fixtures` answers **200** with
`lastSyncedAt: null` and two fixtures — which is **trap 1**: *"`lastSyncedAt ===
null` is not a schedule. Render the pending state, never the partial list."* The
club page honours that and does not lie, but the reader still followed a link to
a hero, a squad and a standing strip with nothing in them.

`StandingsTable` offered "Open {club}" on every expanded row.

## Decision

`canOpenClub?: (slug: string) => boolean`. The screen resolves it with
**`hasCompleteSchedule`** over `useTeams()`:

```ts
const team = bySlug.get(slug);
return team ? hasCompleteSchedule(team) : false;
```

⚠ `undefined` data — loading, or a failed catalogue fetch — resolves to
**false**. Absence is the safe default: never draw a link you cannot honour.

The row still **expands** for all 36, because W/D/L/GF/GA/GD is real for every
club. Only the promise of a page is withheld. Domestic tables pass no gate at
all and behave exactly as before.

## Consequences

- One extra request for a reader who opens Table before Clubs — and it is
  `STALE.catalogue` (24 h) and the same cache entry the Clubs tab and every club
  page already use, so at most one a day.
- ⚠ `hasCompleteSchedule` rather than mere catalogue membership, which is two
  clauses rather than one and matters: a club can be tracked and still be
  opponent-only. It is the field that already means this.
- **It self-corrects.** The day the backend widens coverage, those clubs start
  carrying a `lastSyncedAt` and the links appear with no change here.
- The expanded card now has a shape with no link in it. Accepted — the stats are
  the reason the row expands, and 0141's rule holds: an absent thing renders as
  absence, not as a disabled affordance explaining itself.

## Alternatives considered

- **Link every row anyway** — 18 of 36 rows land on a page with nothing on it.
  Ed rejected it.
- **Make untracked rows non-expandable** — cleanest promise, but withholds real
  numbers from half the table. Ed rejected it.
- **Probe `/cronogol/teams/{slug}/fixtures` per row** — 36 requests to decide
  whether to draw a link.
- **A hardcoded allowlist of the 18** — rots silently the day coverage widens,
  and it would be a second source of truth for something the wire already says.
