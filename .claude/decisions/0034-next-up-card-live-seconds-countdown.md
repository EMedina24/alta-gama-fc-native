# 0034 — The next-up card leads with its crests, and its countdown ticks per second

- **Date:** 2026-08-25
- **Status:** Accepted
- **Decided by:** Ed

## Context

The `SIGUIENTE PARTIDO` card is the lead element of the Today board, and its
hierarchy was inverted. The kickoff time was set at 40pt — the largest thing on
the screen — while the club crests were `Size.crestCard: 40`, the same size they
are in a list row, and the versus separator was a lowercase `v` at callout size
(14.5pt) pushed into place with `marginTop: Size.crestCard / 2 - 8`. The card
was mostly a big clock with two small badges above it.

The countdown underneath it had a second problem. It ticked once a minute, so
the one element on the card that exists to convey *approach* never visibly
moved. `countdown.tsx` argued that position in its own header — "a seconds
counter is a liveness claim, it wakes the JS thread 60× more often for a number
nobody reads that precisely" — and `handoff_AG-ios/SPEC.md:251` recorded it as
"ticks per minute".

That argument is right about the cost and wrong about the value here. Two
distinct things on this board can make a false liveness claim, and they are not
the same thing:

- **A score** that is hours stale, presented as if it were current. That is the
  hazard [0027](./0027-board-lead-cards-from-fixtures.md) and the `FeedAge` line
  exist to prevent, and nothing here changes it.
- **A countdown to a known future timestamp.** It is computed from the device
  clock against a kickoff time the API already gave us. It cannot be stale, and
  it does not depend on the fixture sweep at all.

The per-minute tick was protecting the second case with a rule written for the
first.

## Decision

Four changes to the card, and one to how the countdown ticks.

**The countdown ticks once a second** and renders `1d 18h 04m 12s` as unit
groups — digits at `Type.countdownNum` (26pt, tabular), unit letters at
`Type.countdownUnit` (12pt), and **the seconds group in `accent`**: it is the
only figure on the board that moves, and the lime marks it as the live one.
Days drop out once there are none and hours once there are neither, so the row
shortens as kickoff approaches.

The wake cost is paid down three ways, and all three are load-bearing:

1. **The timer is torn down whenever `AppState` leaves `active`.** iOS suspends
   JS timers in the background regardless; without the listener the card returns
   from a resume showing the number it was suspended on. On `active` it re-reads
   `Date.now()` rather than resuming the old cadence — the elapsed background
   time is precisely what the suspended timer failed to count.
2. **Each tick is a `setTimeout` scheduled to the next wall second**
   (`SECOND - now % SECOND`), not a fixed-period `setInterval`. The digit flips
   with the system clock instead of drifting from whenever the card mounted.
3. **The loop stops at kickoff.** Nothing schedules past `target`, and nothing
   starts for a fixture that has already begun.

**Crests go to `Size.crestNext: 64`**, a new token. `crestCard: 40` stays where
it is — it is the row and list size, and seven other call sites use it. The
Today screen resolves these two crests through a `nextSide()` helper that asks
`crestSrc(…, 'small')`; `side()`'s `xsmall` is the row weight and visibly softens
at that size.

**The versus mark becomes `VersusBadge`**, an atom: a `Size.versusBadge: 34`
ring in `accentRing` over `accentWash`, with `Vs` at eyebrow weight in **white**.
It is a ring rather than a bigger glyph because the accent border of the card is
the only other accent on it, and the ring echoes it — but the lettering inside
stays `text`, because two accent elements that close together fought each other
and the ring is the shape that carries the colour. Its offset is derived —
`(Size.crestNext - Size.versusBadge) / 2` — so a future crest resize carries the
badge with it instead of leaving the old magic number.

⚠ The badge overrides two things `Type.eyebrow` carries for column heads: the
uppercase transform (it reads `Vs`, not `VS`) and the 1.8 tracking, which at two
glyphs inside a ring set them far enough apart to read as `V S`.

**`Type.kickoff` drops 40 → 32pt** (letterSpacing -1.4 → -1.1). It had two call
sites and the countdown was one of them; after this change it has one.

**The date and zone lines go up to a new `Type.eyebrowLg` (12.5pt).** At
`eyebrowSm` they were 9.5pt sitting beside a 40pt time, which made them
decoration next to it rather than the answer to "when". The zone line especially
earns the size: it is the sentence that stops `3:00 pm` being read as the
stadium's local time, and an eyebrow nobody reads cannot do that job.

**The pairing gets an accessibility label.** It had none — VoiceOver read it as
four stops (crest, name, "V", name). It is now one, as `UpcomingRow` already
does it.

## Consequences

- The lead card reads as live, which is the point. The seconds digit is the only
  moving element on the Today board.
- **The `AppState` listener in `countdown.tsx` is not optional.** Deleting it
  leaves a per-second timer that iOS suspends and a card that lies on resume.
  This is the trap this entry exists to record.
- `SPEC.md:251` and §2's "ticks per minute" now describe the old build. The
  handoff is a design snapshot and is left as it was; this entry is the record
  of the divergence.
- The unit letters `d`/`h`/`m`/`s` live in the component, not `copy.ts`. They
  are the same letters in both languages the app ships, and a copy key would
  only invite a translation that breaks the fixed-width row.
- The countdown row is now the widest fixed content on the card. It is set to
  shrink while the `EMPIEZA EN` label is not, so large Dynamic Type sizes cost
  the countdown its width rather than pushing the label off the card.
- Two new `Type` entries and two new `Size` entries. The theme grows, but the
  alternative was literals in a component, which
  [0006](./0006-theme-constants-module.md) forbids.

## Alternatives considered

**Keep the minute tick and animate something else** (a progress ring, a pulsing
dot) — an animation that conveys nothing beyond "this app is running", and the
board has already rejected a pulsing dot once, for the live card, on stronger
grounds.

**Tick per second only inside the last hour.** Cheaper, and it makes the card
behave differently depending on when you open it — the reader who opens it a day
out sees a frozen number and concludes the countdown is broken.

**One tabular string** (`1d 18h 04m 12s` at a single size) rather than unit
groups. Simpler to write; the seconds then carry the same visual weight as the
days, and the row twitches at full strength.

**Reuse `Size.crestHero: 58`** instead of adding `crestNext`. Same order of
magnitude, wrong name — `crestHero` is the club header's crest, and coupling the
two means a change to the header silently resizes the Today board.
