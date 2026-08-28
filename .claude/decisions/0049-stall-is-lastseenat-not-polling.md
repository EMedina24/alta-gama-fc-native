# 0049 — The live card's stall signal is `lastSeenAt`, not `polling`

- **Date:** 2026-08-28
- **Status:** Accepted — the observation is production, on a real match
- **Decided by:** Ed Medina
- **Revises:** decision 4 of [0048](./0048-live-scores-on-the-today-board.md).
  The other ten decisions in 0048 stand; it is not superseded.

## Context

[0048](./0048-live-scores-on-the-today-board.md) made `polling: false` beside a
non-empty `matches` an authoritative stall signal, because
[LIVE-SCORES.md §4](../LIVE-SCORES.md) presents it as **the one failure mode this
feature has** — "matches are live but nothing is refreshing them" — and says that
without the flag it is indistinguishable from a quiet afternoon. That reasoning was
sound and the implementation followed it.

**Production contradicted it within a day.**

Racing v Elche, LaLiga, 2026-08-28, kickoff 17:00 UTC. Sampled repeatedly:

| Time (UTC) | `polling` | `minute` | `score` | `lastSeenAt` |
| --- | --- | --- | --- | --- |
| 17:05 | `false` | 4 | 0–0 | advancing |
| 17:09 | `false` | 8 | 0–0 | advancing |
| 17:35 | `false` | 22 | 2–0 | advancing |

The flag never once read `true`, and the data moved the entire time — a minute
climbing, a score changing, and a stamp advancing every ~30 seconds. The card
therefore rendered its **stalled** dress for the whole match: a dimmed minute under
*"Live updates paused"*, on a feed that was updating perfectly.

Reported from the device as "the card says live updates are off", which is exactly
how a reader would read it — as a setting they could turn on, rather than a fault
report about the backend.

## Decision

**`isStalled` reads `lastSeenAt` alone. `polling` is not consulted at all.**

```ts
export function isStalled(match: LiveMatchView, now: number): boolean {
  const seen = Date.parse(match.lastSeenAt);
  if (Number.isNaN(seen)) return true;
  return now - seen > STALL_AFTER_MS;
}
```

The `polling` argument is gone from the signature rather than left unread, so a call
site cannot quietly reintroduce it.

**Why `lastSeenAt` is the better instrument, independently of the bug.** It is
documented as *"we looked", not "it changed"* — it advances every ~30s whether or not
the score moved. That makes it a direct measurement of the thing the card actually
claims: whether **our copy** is still moving. `polling` is a report about a server-side
session, one inference removed from what the reader sees, and the two disagreed.

**Why a false alarm is worse than no alarm.** The note under the score is the
load-bearing line on that card — trap 8 exists to keep it there. A signal that cries
wolf on every match teaches the reader to skip precisely the line they must not skip.
Firing wrongly does not degrade the honesty apparatus gracefully; it inverts it.

⚠ **This is not permission to stop caring about the two silences.** If `polling`
becomes trustworthy, the correct change is to reinstate it as a **second** tell beside
`lastSeenAt` — not to swap back to it. Whatever a fixed flag would add is additive to
a measurement that was right the whole time this one was wrong.

## Consequences

- The live card now shows *"Live · refreshed about every 30s."* on a healthy feed,
  which is what Racing v Elche was. The stalled copy and its dimmed minute survive
  untouched for a feed that genuinely stops — proven by a harness case and two
  gallery cases.
- ⚠ **`useLive` still requests and receives `polling`; nothing reads it.** Left on the
  DTO deliberately: it is in the wire contract, and deleting it from `LiveView` would
  hide the field from whoever fixes it.
- `/_debug/gallery`'s `polling: false` case is replaced by two `lastSeenAt` cases —
  one just past the two-minute threshold, one nine minutes behind.
- The harness carries a named regression case asserting a fresh row with a moving
  score is **not** stalled: the exact shape that lied.
- ~~⚠ **The backend bug is not fixed by this and should still be raised.**~~
  **RAISED, DIAGNOSED AND FIXED THE SAME DAY** — `senpai-backend@60b0ebf`.
  The cause was not the flag's meaning but its input: `acquireLease()` stamped
  `lease_started_at` **once**, and `LiveReadService.isPolling()` reads that same
  stamp against the same 120-second window, so any session outliving two minutes
  reported itself dead. The lease is now renewed at the end of every poll cycle,
  conditional on still holding it — a heartbeat and an ownership check in one.
  ⭐ **`polling: true` observed in production at 18:39 UTC on 2026-08-28**, on
  Racing v Elche — the first `true` this route has ever returned.

  ⚠⚠ **This decision still stands and `isStalled` is unchanged.** A flag that was
  wrong for a day and right for an hour has not yet earned the load-bearing role
  0048 gave it. What the fix licenses is what this entry already specified — a
  **second** tell beside `lastSeenAt`, once the flag has been watched across
  several matches — never a swap back to trusting it alone.

  ⚠ The fix rests on an invariant worth naming here, because it is now the third
  thing that depends on it: **`livePollIntervalMs` (30s) must stay comfortably
  under `liveLeaseSeconds` (120s)**, or a healthy session starts reporting itself
  dead again between cycles.

## Alternatives considered

- **Leave it and fix only the backend.** Correct in principle, and my first
  recommendation. Rejected on timing: the flag is wrong on every live match today, and
  the card is on a reader's phone now. The app should not render a fault report it has
  direct evidence against.
- **Treat `polling: false` as stalled only when `lastSeenAt` ALSO lags.** That is just
  `lastSeenAt` with extra steps — the flag would never change an outcome.
- **Drop the note on the live path entirely.** What was literally asked for, and
  refused: it removes the honesty apparatus trap 8, 0035 and 0044 all exist to
  protect, and it would take the genuine-stall warning with it. Making the wrong
  message stop firing is a different change from having no message.
- **Remove `polling` from `LiveView`.** It is in the contract and a future fix needs
  it visible.
