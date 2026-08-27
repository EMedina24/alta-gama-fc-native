# 0046 — The events panel groups behind four tabs, and the tabs replace the eyebrow

- **Date:** 2026-08-27
- **Status:** Accepted
- **Decided by:** Ed

## Context

[0045](./0045-match-events-expanded-row.md) shipped the expanded row as one flat
list: a `MATCH EVENTS` eyebrow, then every event the fixture has, in feed order.
That is the right panel for a 1-0. It is the wrong one for a 4-1 with six
bookings and ten substitutions — twenty rows, which pushes the matches under it
off screen. An expansion inside a list must not do that; the row the reader came
from should still be in view when it opens.

Two problems, not one. The panel is too tall, and it is undifferentiated —
finding *who scored* means scanning past cards and subs to do it.

`handoff_event-groups/` is the design answer: a segmented control, each segment
carrying its group's count, one group shown at a time. `GROUPING.md` records that
it won over filter chips on a whole timeline, type-labelled sections, and
grouping by half, and that it won **on panel height** specifically.

It also arrives, like 0045's design half, written against the design's own
four-kind model. Ours is eight.

## Decision

`EventGroup` and four pure functions in `lib/cronogol/events.ts`; a new
`EventTabs` molecule; `MatchEvents` renders one group.

**1. Four groups, not the three the design asked for.** `goals` ←
`goal` + `own-goal`, `cards` ← `yellow` + `red`, `subs` ← `sub`, and **`other`**
← `var`, `missed-penalty`, `unknown`.

The design's three cover its own four kinds exactly. They cover four of our
eight, and 0045 decision 1 is emphatic that a row is **never dropped** —
`unknown` exists precisely because the source described something the backend has
no name for, and a disallowed goal is what explains a scoreline that otherwise
looks wrong. A three-group control has nowhere to file those, and in a control
that shows one group at a time "nowhere" means the row stops rendering. `other`
is where they go.

`own-goal` files under `goals` even though it draws its own mark: it is on the
scoresheet, and `Goals 0` on a 1-0 won by an own goal is a lie the panel would
tell about every such match.

**2. `groupOf`'s `default` branch is load-bearing.** It is `other`, not an
exhaustive list of the three non-goal kinds. A ninth mark added to `EventKind`
tomorrow lands in `other` and is still read. This carries `eventKind`'s own
never-drop rule forward into the grouping layer — the one place a future kind
could silently vanish.

**3. `yellow` and `red` share one group.** `GROUPING.md`'s reasoning, taken as
given: a card is a card to someone scanning, and splitting them leaves two
one-row tabs. The **glyph colour** distinguishes them at row level and always
has. Nothing may start relying on the tab to carry that.

**4. All four segments always render, dimmed and inert at `0`.** Considered and
rejected: hiding `other` when empty, which is most matches, to buy the other
three a quarter more width. The count is information — `Cards 0` beside
`Goals 4` tells the reader there were no bookings without their opening
anything, and a tab that came and went by match would make the control's own
shape unreadable. Uniform rule, no exceptions, no reflow between matches.

Measured rather than assumed: four segments on the narrowest device we target is
~67pt each, and `Tarjetas 0` — the longest label we ship — is ~60pt at 11/700.
It fits at default Dynamic Type. `numberOfLines={1}` on the label is what stops
it wrapping the track to two lines above that.

**5. The tabs replace the eyebrow, but the eyebrow survives the empty states.**
`MATCH EVENTS` above `Goles · Tarjetas · Cambios · Otros` says the same thing
twice, one line apart — the exact duplication `showTitle` was added to prevent on
the board card. So the eyebrow now draws only when there are **no tabs**: the
pending, error and not-published branches, which have nothing to group.

`showTitle` stays. It is not redundant: `match-board.tsx` still passes `false`
because its footer row is both the tap target and the label, and without the prop
a pending panel there would print the words twice again.

**6. The shown group is DERIVED from a nullable pick, not stored.**

```ts
const [picked, setPicked] = useState<EventGroup | null>(null);
const active = picked !== null && counts[picked] > 0 ? picked : initialGroup(counts);
```

The counts arrive with the fetch. State seeded with a group would need an effect
to correct it once the data landed — one render of an empty `Goals` on a 0-0 with
two bookings, then a jump. Deriving lands it right on the first render that has
data, with nothing to sequence and no effect to get wrong.

It also resets per match for free: `MatchEvents` renders only while its row is
open, each surface keeps one row open at a time, so opening another match unmounts
the instance and `picked` starts null again. No key, no reset effect, no
`useEffect` in this feature at all.

**7. One track ground, because the panel has one ground.** `GROUPING.md` gives
the track two colours — `#15171A` on the panel, `#101317` inside the live card —
because the design puts the panel on two different grounds. This app does not:
`MatchEvents` paints `sunken` (`#101317`) on every surface it appears in, per
0045. So the track is always `card`, the one step above it. No prop, one rule.

**8. Spec literals map to tokens, and the drift is deliberate.** Track radius
`Radius.chip` (12 for the spec's 10), segment `Radius.seg` (9 for 8), track
padding and gap `Spacing.one` (4 for 3). `#242830`, `#59626A` and the lime are
exact matches for `raisedAlt`, `textFaint` and `accent`. One new colour was
needed — `textGhost` `#3d444a`, the inert segment's ink: no existing ink is that
dim, and `textFaint` is already the *idle* count, so borrowing it would make
"nothing under this" and "tap this" the same colour.

`Type.eventTab` is new rather than borrowing `eventMinute`, which shares 11/700
today. That token is documented *always tabular* and is measured against
`eventMinuteColumn`; the two must be able to move apart.

## Consequences

- The panel is one group tall. A twenty-event match now opens at the height of
  its longest group, and the matches beneath it stay on screen — the thing the
  change was for.
- `Size.eventTab` is **28, under the 44pt `minTouch`**, and the segments carry
  `hitSlop` to make up the difference. A 44pt track would spend most of the
  height grouping the rows won back. This is the only control in the app that
  paints under the minimum, and it is why.
- The reader now takes a tap to see cards on a match where they used to scroll to
  them. That is the trade the design made and it is the right one at this row
  count; it would be the wrong one on a panel of four events, and nothing here
  adapts to that.
- `eventsInGroup` is a `filter`, so relative order is preserved and 0045
  decision 7's no-sort rule is untouched. Narrowing the feed is not reordering
  it, and nothing in this file may start to.
- No animation, per 0045's own rejection of it for this feature. The selection
  moves by re-render.
- `handoff_event-groups/EventTabs.tsx` is a reference, not the shipped code: its
  `EventKind` is the design's four-value union, and its `groupOf` files
  `own-goal`, `var`, `missed-penalty` and `unknown` into `cards`. Read it for the
  behaviour and the values, never for the mapping.

## Alternatives considered

- **Filter chips over a whole timeline**, **type-labelled sections**, and
  **grouping by half** — all three from `GROUPING.md`, all three lost to tabs on
  panel height, which is the problem being solved. Sections and a full timeline
  keep every row on screen; chips add a control without removing anything.
- **Three groups, with `goals` as a catch-all** for everything that is not a card
  or a sub. Keeps the designed shape and is still drop-proof. Rejected: a VAR
  card-upgrade filed under `Goals` is worse than the same row under `Other`, and
  the count on `Goals` would stop matching the scoreline — the one number in the
  panel a reader can check against the row above it.
- **Hiding `other` when empty.** See decision 4.
- **Routing `var` by `subtype`** — `card-upgrade` to `cards`, the rest to
  `goals`. More accurate per row, and rejected: `subtype` is an **open string**
  on the wire, deliberately never narrowed to a union, and grouping is not the
  place to start treating it as one.
