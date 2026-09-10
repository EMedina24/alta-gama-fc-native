# 0146 — Season statistics exist; 0033's "none are coming" is retired

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Claude

## Context

Five places in this repo stated, as settled fact, that per-player and per-season
statistics did not exist and never would:

- [0033](./0033-player-detail-sheet.md): *"There is no single-player endpoint and
  none is coming."*
- `.claude/HANDOFF.md`, *Known gaps, deliberately*: *"⛔⛔ Player STATISTICS do not
  exist… this is a purchase, not a backlog item."*
- `lib/cronogol/client.ts` on `getTeamSquad`, and the docblocks of
  `player-sheet.tsx` and `squad-list.tsx`.

All five were true when written. `senpai-backend` §120 shipped three routes on
2026-09-09 and they are live and populated.

## Decision

[0033](./0033-player-detail-sheet.md) is marked **Superseded by 0146** for its
premise only — the player SHEET it designed is unchanged and still fetches
nothing, still keys on the person `id`, still reads the squad cache.

All five comments are corrected in the same change, because a stale ⛔⛔ in the
handoff is worse than no note: it is the note a future reader will trust.

What is corrected, precisely:

- Season TOTALS exist, on their own routes, addressed by `slug`.
- **Appearances, minutes and anything per-90 remain permanently absent** — no
  source publishes lineup events, so a player who played 90 quiet minutes wrote
  no row. Every denominator on the new screen is CLUB FIXTURES. A label saying
  "apps" is wrong, and so is whoever reads it.
- Shots, xG, possession, passes, saves, duels and ratings are still not stored
  and not buyable at this backend's price point. That boundary is what makes
  *"86% of his shots are on target"* impossible and *"86% of his penalties have
  gone in"* possible.

## Consequences

- The scoring streak is rendered **with the club named** — "scored in 6 straight
  Barcelona matches" — never as a bare number. It counts club matches, not
  appearances, so a benched match breaks ours and not a broadcaster's, and a bare
  number will sometimes read lower than every other source and look like a bug.
- ⚠ **These numbers change retroactively.** They are a cache of a pure function
  over stored events; a mapper fix plus a backfill revises old totals. Correct for
  a stats page — but nothing may snapshot one into a widget, a notification or a
  share image and assume it still matches.
- ⚠ **Nothing may present them as live.** Three crons chained by clock only, 25
  minutes apart, so the lag from a final whistle is ~25 minutes at best and ~4
  hours at worst. No "just now", no timestamp. The live match card is a different
  surface with a different contract (trap 8).

## Alternatives considered

- **Leave 0033 and the HANDOFF gap as they are** — the log's own rule is that
  reversing a decision means a new entry and marking the old one superseded, not
  editing history; and leaving the ⛔⛔ would have the next reader build around a
  boundary that moved.
