# 0080 — The widgets show live scores: a rationed poll, plus the pushes

- **Date:** 2026-08-30
- **Status:** Accepted — but it **shipped dead** and was fixed by [0084](./0084-widget-live-gate-takes-the-api-league-slug.md): the `leagueSlug` gate below compared against our internal `la-liga` while the wire carries the API's `laliga`, so `liveEligible` was false for every real fixture and none of this ran on the 2026-08-31 preview build (Barcelona v Rayo, `19:30Z`). ⚠ The simulator verification recorded here was real but could not catch it — the `_debug` sample hardcoded the matching slug. Everything below is unchanged in intent and still pending its first real match.
- **Superseded in part by:** [0084](./0084-widget-live-gate-takes-the-api-league-slug.md) — the comparand only
- **Decided by:** Ed Medina
- **Builds on:** [0047](./0047-widgets.md) (widgets), [0048](./0048-live-scores-on-the-today-board.md) (`/cronogol/live`), [0078](./0078-kicked-off-lead-card.md) (kickoff hold)
- **Partially supersedes:** [0025](./0025-widgets-deferred.md) step 4's "no network in a timeline provider" — for exactly one route, inside exactly one window (below). Everything else 0025 said about network stands.

## Context

The widgets only ever showed *upcoming* fixtures: `selectWidgetFixtures` dropped any
kickoff in the past and `rows(after:)` dropped it again in Swift, so a match vanished
from the widget the instant it kicked off — precisely when a reader glances at their
phone most. Ed picked the **Ledger** live layout on the design canvas (two team rows,
scores right, red `LIVE · 67′`) for the small and medium widgets, with upcoming
matches unchanged.

The problem is not drawing, it is data. The widget's one input was
`widget/snapshot.json`, written on app foreground; with the app closed nothing
refreshes, there is no background fetch or `content-available` path, and 0025 forbade
network in the provider. A live score needs a path of its own.

## Decision

**A sidecar file, three writers, one rationed poll.**

`<AppGroup>/widget/live.json` (`WidgetLiveState` in `targets/_shared/LiveState.swift`
↔ `src/features/widgets/live.ts`) carries per fixture: `status`
(`live | halfTime | finished`), the reported `minute` + `minuteAt` anchor, the score,
and an optional rendered `lastEvent` (`Iglesias 20′`). Never enlarging
`snapshot.json` — the same sidecar pattern as `widget/news.json` (0061).

1. **The widget polls — the 0025 carve-out.** Inside a *match window* — some
   snapshot row kicked off within the last 150 minutes (`KICKOFF_HOLD_MS`, 0078) —
   `FixtureProvider` fetches `GET /cronogol/live?league=laliga` (4 s timeout) on each
   reload, merges by `fixtureId`, saves, and asks for the next reload in **5
   minutes** (`Cadence.liveReload`). The budget math: ~30 reloads across a match
   with stoppage, against WidgetKit's ~40–70/day. The minute still moves every
   minute through per-minute timeline **entries** (free, per 0047's "entries are
   free, reloads are rationed"), each ticking `minute + elapsed since minuteAt` —
   the Live Activity's synthetic-anchor idea, done client-side. Outside the window
   the provider makes no request at all, and 0025's rule is intact for crests and
   everything else.
2. **The pushes write it too.** The notification service extension sees every goal,
   red card and full-time push before iOS displays it; it merges
   `{fixtureId, minute, score}` into `live.json` and reloads the two fixture widget
   kinds. A goal reaches the widget in seconds, not at the next 5-minute poll —
   when goal alerts are on and the push arrives; the poll is the floor either way.
3. **The app writes it while foreground.** The Today board's `useLive` poll feeds
   `applyWidgetLive`, keyed on score/state (never the minute — a reload per minute
   is the budget-burn `snapshotKey` exists to prevent), so the widget agrees with
   the screen the reader is looking at.

**States.** `live` ticks the minute; **half time** is a *heuristic*, recorded as
one — the route has no break state (LIVE-SCORES.md), so it is read from a minute
frozen at 45 across two polls, or a null minute >50 min after kickoff. **Full
time** is the row *vanishing* from the route after having been seen live (the
route's documented behaviour), or a `match_full_time` push; the last score holds —
the ledger keeps drawing it until the local day ends (`rows(inPlayAt:)` joins
same-day `finished` entries), with the small widget's footer handing off to
`NEXT · Sun 3:30 pm · GIR`. **Kicked off, no data yet** (0078's tier, on the
widget): ledger with dashes, never `0 – 0`. **Stalled** (`writtenAt` > 10 min,
`LIVE_MAX_AGE_MS`): the minute dims to `ink45`, the score stays — 0048/0049's rule.

**Snapshot v3.** `selectWidgetFixtures` keeps kickoffs inside the 150-minute hold,
and an in-play fixture does **not** consume its club's slot (its NEXT match rides
along, so the full-time card has something to point at). `WidgetEntry` gains
`leagueSlug` — the poll gate, because only LaLiga exists on `/cronogol/live`; a
non-LaLiga fixture keeps the old behaviour (drops at kickoff) rather than showing a
ledger of dashes that never resolves. `copy` gains `live`/`halfTime`/`fullTime`
(`LIVE`/`HT`/`FT` · `EN JUEGO`/`DESC`/`FIN`), travelling pre-formatted like every
widget string (0047). All optional in `Snapshot.swift`, the 0059 pattern.

**Selection.** Two live matches at once: the small widget shows the
earliest-kicked-off; the medium ledgers up to two and fills remaining of its three
row-slots (a ledger costs two) with upcoming rows.

## Consequences

- The widget target now holds one `URLSession` call. `Provider.swift` and
  `Live.swift` carry the fence; `Configuration.swift`'s offline rule is untouched.
- `_shared/LiveState.swift` compiles into every target (0037's cost, accepted
  again): the NSE writes it, the widget reads it, the app ignores it.
- Worst case with two followed clubs live in one evening: ~60 polled reloads plus a
  handful of push reloads — near the budget's floor. Accepted; a reader with two
  clubs mid-match is exactly who the widget is for. If the budget bites, the lever
  is `Cadence.liveReload`.
- HT can misread a long first-half stoppage as the break for one poll cycle; the
  next poll (minute moves) corrects it. Accepted as the cost of a route with no
  break state.
- The gallery preview still shows the upcoming sample only — a fabricated live
  score in the picker reads as real data for clubs the reader may not follow.

## Rejected

- **Push-only** — free of network, but blind for readers with goal alerts off and
  hostage to every delivery failure (trap 44 is fresh).
- **Poll every minute** — the honest minute without entries, and a burnt budget by
  half time. Entries do the ticking instead.
- **`Text(timerInterval:)` for the minute** — system-ticked and free (0058), but
  its format is `mm:ss` with no minute-only form; `67:30` on a football card reads
  as a broken clock.
