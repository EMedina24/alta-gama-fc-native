# 0138 — The wash fills a box that GROWS: measured, and floored under the deck plate

- **Date:** 2026-09-09
- **Status:** Accepted — reproduced, fixed and re-shot on the simulator
  (`?only=live-deck`); Today, Clubs, club page and News re-checked for the
  shared-atom change
- **Decided by:** Ed Medina, off a screenshot of two in-progress matches — the
  expanded MATCH EVENTS panel showing the waiting card straight through its
  timeline
- **Amends:** [0126](./0126-concurrent-live-matches-stack-as-a-deck.md) — its `surface="opaque"` promise
  ("nothing behind it able to ghost through") was true only for a plate that
  never changes height. This is what makes it true for one that does.
  [0068](./0068-club-colour-wash.md)'s atom gains a measured box.

## Context

Ed reported the events accordion unreadable on the live deck: with two matches
in play, the panel was transparent and the card below showed through the goal
rows.

`LivePlate`'s deck variant paints its ground as two absolutely-positioned
layers over the plate — `WashGradient` with `DeckGround` (the crown, baked),
then `plateDark` at 80% on top of it. Both are `position: absolute` on all four
edges, so both boxes grow with the plate. Only one of them **repaints**.

`WashGradient` draws a `<Rect width="100%" height="100%">` inside an
`<Svg style={StyleSheet.absoluteFill}>`. `react-native-svg` (15.15.4) resolves
that percentage against the viewport the `Svg` FIRST laid out at and does not
re-resolve it when the box grows. Expanding the events panel therefore left the
baked ground stopping dead at the collapsed card's bottom edge — and below that
line the only paint was the 80% tint, which is a dimmer, not a wall. The
waiting layer, which `CardDeck` bottom-aligns in a lead-height window, sits
exactly there.

A diagnostic ramp (red → blue, tint removed) made it unambiguous: the blue
ended at the collapsed height and the rest of the card was bare. That
screenshot is the whole diagnosis.

⚠ The trap needed BOTH conditions, which is why 0126 shipped without seeing it:
the plate is the only card in the app that grows after its first layout, and it
is the only growing card with something drawn behind it. The gallery's own
"the opaque ground must not ghost" case renders the panel already open, where
the first layout is the final one and nothing is ever stale.

`Svg`'s own `onLayout` does **not** fire on that resize — tried first, and the
ramp stayed short. A wrapping `View`'s does.

## Decision

1. **`WashGradient` and `WashRadial` paint a MEASURED box, not a percentage.**
   Each wraps its `Svg` in an absolutely-filling `View` whose `onLayout` feeds
   `useBox`, and the `Rect` takes those numbers as explicit dimensions.
   ⚠ The box is `null` until the first layout and the `Rect` falls back to
   `100%` there, so the first paint is exactly what it always was — no
   measure-then-flash, no new frame on any surface that never resizes.
2. **The deck plate's ground gets an opaque FLOOR under the ramp** —
   `DeckGround`'s own last stop, which is `NextUpCard`'s `bodyOpaque` idiom
   from [0113](./0113-same-day-next-up-deck.md) applied to the plate that needed it
   more. Belt and braces on purpose: (1) with the atom fixed there is still a
   frame between the growth and the repaint, and a stacked layer must be opaque
   in every frame (trap 59); (2) the floor is the ramp's terminal colour, so
   the two can never seam whatever the gradient does.
3. **`LivePlate` states the rule at the ground.** The comment names the two
   facts a future reader needs — this card grows, and the gradient is the layer
   that cannot be trusted to grow with it.

## Consequences

- The atom's header claim — "a linear gradient filling its parent" — is finally
  true of a parent that changes size, and any future growing container inherits
  the fix rather than re-finding this bug.
- The expanded panel's ground now runs the FULL card, so the ramp stretches
  rather than ending early: the panel region sits a shade lighter than it did
  before this change. That is the gradient doing what it always claimed.
- Every other caller is a fixed-size or content-sized box that lays out once —
  the crown's ramp is a deliberately FIXED-height layer (0094/0095), the splash
  animates transforms only (0134 chose that explicitly so the SVG sheet is
  never re-laid-out per frame) — so none of them re-measures in practice.
  Today, Clubs, the club page and News were re-shot to confirm no change.
- `useBox` is the place to look if a wash is ever seen lagging its box: it is
  one `setState` per real size change, deduped on width and height.
