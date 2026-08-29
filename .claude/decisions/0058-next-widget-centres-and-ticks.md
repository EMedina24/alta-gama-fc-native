# 0058 — The NEXT widget centres on its crests, and its countdown ticks per second

- **Date:** 2026-08-28
- **Status:** Accepted — not yet run on the simulator
- **Decided by:** Ed Medina

## Context

Two separate complaints about the same card, `NextFixtureWidget`'s `systemSmall`
body ([0047](./0047-widgets.md)).

**Its hierarchy was inverted.** The column was left-aligned: a 30pt eyebrow row,
then `CrestPair` at 30pt tucked under it, then `1d 14h` at **30pt heavy** — the
largest thing on the card — over a 12pt footer. The countdown was the subject and
the clubs were decoration, which is precisely the reading
[0034](./0034-next-up-card-live-seconds-countdown.md) rejected on the Today board
when it took `Type.kickoff` from 40pt to 32pt and the crests to `Size.crestNext: 64`.
The same argument, arrived at independently on a different surface: a reader
glancing at a home screen is asking *who*, and the answer was the smallest thing
on the tile.

**And the countdown did not move.** `Cadence.countdown(from:to:)` produces a
*string per timeline entry* — hourly beyond an hour out, per-minute inside the
final hour. That is honest and costs nothing, but the one element on the card whose
job is to convey *approach* was a frozen number for an hour at a time. 0034 named
this exactly: "the one element on the card that exists to convey approach never
visibly moves."

The obvious objection is the reload budget, and it is a misreading — the same one
[Timeline.swift](../../targets/widget/Timeline.swift)'s header was written to
prevent. See below.

## Decision

### The card centres, and the crests carry it

`VStack(alignment: .center)`. Crests, countdown and footer all centre; the eyebrow
and the pitch mark stay pinned to the card's two edges, which needs an explicit
`.frame(maxWidth: .infinity)` on their `HStack` or the centred parent pulls them
inward. The container frame goes `.topLeading` → `.top`, and the empty branch is
handed `alignment: .center` — `EmptyState` already takes the parameter, and a
centred card that falls back to a left-aligned empty state reads as a bug.

**Crests 30pt → 38pt, and 38 is derived rather than chosen by eye.** The usable
width of a `systemSmall` widget is roughly 109pt on an iPhone SE — the smallest
canvas the family has — and `38 + 10 + v + 10 + 38 ≈ 99pt` is the largest pair
that fits there without the system scaling it. A future resize should know it is
trading against the SE and not against taste. `CrestPair`'s `size:` parameter
already existed and has exactly one call site, so nothing else moves.

### The countdown is a live, system-ticked timer inside the final 12 hours

`Text(timerInterval:countsDown:)`, at **20pt heavy**, down from 30pt — inside
`Cadence.liveTickWithin` (12 hours) of kickoff. Beyond that the card keeps the
precomputed `1d 14h` string, repainting hourly off the timeline entries as before.

⚠⚠ **This does NOT contradict [0025](./0025-widgets-deferred.md) step 5 or
[0047](./0047-widgets.md), and the distinction is the whole point.** Those forbid a
per-minute **reload** — waking the extension to rebuild a timeline, which iOS
rations at roughly 40–70 a day. `Text(timerInterval:)` is rendered and advanced
**by the system**, once a second, without waking this extension at all. It costs
zero reloads and zero entries. **The reload policy in `Provider.swift` is unchanged,
byte for byte:** still one `.after(Cadence.reloadAfter(...))`. This repo already
depends on the mechanism — `MatchActivity`'s `Clock` counts the match minute with
it ([0055](./0055-live-activities-broadcast-channels.md)).

⚠⚠ **The 12h threshold exists because the system owns the format**: one text run,
one style, **and no days unit** — hours accumulate. Two consequences:

- Past a day out the timer renders `38:14:23`, and at the far edge of 0047's
  21-day window **`288:14:23`** — nine glyphs of accumulating hours where the
  design says `12d 14h`. **This was tried**: the first cut set `liveTickWithin`
  to `.infinity`, and the multi-day form on the simulator is what pulled it back
  the same day. Inside 12h the figure is `9:34:12`, which is the range where a
  ticking number actually says *approach*.
- `countdown.tsx`'s `1d 18h 04m 12s` — unit letters, groups, the seconds in accent
  because it is "the one figure on the board that moves" (0034) — **cannot be
  reproduced here at any price.** There is no per-segment styling of an
  auto-updating `Text`. The widget's countdown and the app's are two different
  objects that happen to count the same thing, and this entry is the record that
  the difference is a platform limit, not drift.

**`Cadence.liveTickWithin` is one number and the whole dial.** `12 * 3_600` today;
`.infinity` is tick-always (the rejected form above), and `0` would retire the
timer entirely with no other edit anywhere.

### `systemSmall` only

The three Lock Screen accessory families keep the string. `accessoryCircular` has
room for two glyphs and could never hold `38:14:23`; all three render in a single
system tint where a moving numeral buys nothing it can spend. So
`Cadence.countdown`, `Cadence.compact` and the per-minute entry burst in
`entryDates` all stay exactly as they are — the minute entries still earn their
keep for the Lock Screen, and trimming a provider both widgets share for no gain
is not a change worth making.

## Consequences

- ⚠ **`Cadence.countdown` still carries the small card beyond 12h** as well as
  all three accessory families — it is load-bearing on every family, and the
  hourly timeline entries are what repaint it.
- The 12h crossing is not exact: the swap happens at the first timeline entry
  after the threshold, so up to an hour late. Both forms are honest at that
  range; nothing observes the boundary.
- ⚠ **The `ClosedRange` handed to `Text(timerInterval:)` is clamped with `max`.**
  A range whose bounds invert *traps*, and an extension that crashes draws a blank
  grey tile with nothing in any log. `snapshot.rows(after:)` already guarantees
  `kickoffUtc > date`, which is exactly the sort of guarantee worth one call to not
  depend on.
- ⚠ **`minimumScaleFactor` is unreliable on auto-updating timer text** — the system
  reserves layout width for the widest digits it may need. At the 12h ceiling the
  timer is at most eight glyphs (`11:59:59`) at 20pt heavy monospaced, comfortable
  on the SE's ~109pt. If a longer form ever returns and clips, take the countdown
  to 18pt **before** taking the crests back down; the crests are the decision.
- Vertical budget is roughly unchanged: +8pt of crest, −10pt of countdown line box.
- No token moves. Point sizes in this target are literals at their call sites
  already, and `Tokens.swift`'s header is emphatic about keeping the mirrored list
  short — 38 and 20 are layout, not theme.
- Nothing in `src/` changes. No new snapshot field, so 0047's two-file lockstep
  (`snapshot.ts` ↔ `Snapshot.swift`) does not apply.
- `handoff_AG-ios/SPEC.md` §4 now describes the old card, as it already does for
  0034. The handoff is a design snapshot; this entry is the record of the divergence.

## Alternatives considered

**Tick always** (`liveTickWithin = .infinity`) — the countdown never sits still,
which is 0034's argument on the Today card ("the reader who opens it a day out
sees a frozen number and concludes the countdown is broken"). Tried first, and
rejected on sight: `288:14:23` is not a countdown a reader can parse, and the
0034 objection applies weakly here — a widget is glanced at, not watched, and at
multi-day range the hourly `1d 14h` repaint is not "frozen" in any way a glance
can detect.

**Port `countdown.tsx`'s unit groups.** Impossible, not merely expensive: an
auto-updating `Text` is one run with one style and no days unit. The only way to
draw `1d 18h 04m 12s` in a widget is to precompute it per entry — which is what the
card did, and is the thing being changed.

**`Text(date, style: .relative)`** — `1 day, 14 hr`, which keeps a days unit. It
updates, but not visibly at that range: the reader still sees a frozen figure, and
the string is longer and looser than the numerals the card is built around.

**Trim the per-minute entry burst** now that the small card no longer needs it.
Cheaper timelines, but the burst still serves the accessories, and `FixtureProvider`
is shared with `YourWeekWidget`. A change to a shared provider for no visible gain.
