# 0101 — The signed-out avatar gets a SPINNING attention ring, a person glyph, and 42pt

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (two frames ~1s apart show the arc at different rotations)
- **Decided by:** Ed Medina (asked for all three); ink and scoping decided in the build
- **Amends:** [0081](./0081-account-sheet-redesign.md)'s avatar (the mark-when-signed-out call and the "settles once, never pulses" stance, for the signed-out header only) · narrows [0015](./0015-handoff-design-system-adopted.md)'s no-glow rule by one more scoped exception

## Context

The crown's account button drew the Alta Gama mark when signed out — a circle
containing the brand says "app", not "you", and nothing about it invited a
tap. Ed asked for three things: a spinning glow border to call attention to
it, a bigger disc, and a person silhouette for the signed-out state.

## Decision

1. **`atoms/person-glyph.tsx`** — a drawn head-and-shoulders silhouette (the
   app has no icon set; `check.tsx`'s stroke style). The signed-out `Avatar`
   draws it in place of the mark, at BOTH sizes — the account sheet's
   identity block included, where "not signed in" is the same fact.
2. **`Size.avatar` 36 → 42.** One consumer (the header button); the sheet's
   64 (`avatarLg`) is untouched, and the button's hitSlop already cleared
   `minTouch` at either size.
3. **`Avatar` grows `attention?: boolean`** — a gradient COMET ARC (~70% of
   the circumference, gradient to nothing along its tail) orbiting the disc
   once per `Motion.orbit` (4600ms — the first cut's 2800 read as urgent;
   Ed tuned it calmer the same hour), with a soft shadow in the arc's own ink
   as the glow. `AvatarButton` sets it exactly when `initials === null`.
   - ⚠ **The arc's ink follows `tone`: DARK (`onCrown`) on the crown.** The
     obvious lime is invisible there — the crown band is nearly the accent's
     own colour, the same reason 0087 flips the disc to `onCrown*` inks. On
     `ground` the arc is the accent, for whatever non-crown surface ever
     sets `attention`.
   - Reduced motion stills the arc (ring and glow stay); the animation is
     transform-only on the UI thread, cancelled on unmount and whenever
     `attention` drops.

## Consequences

- Two recorded stances are deliberately narrowed, both scoped to this one
  prop: 0015's "no glow" gains a fourth sanctioned exception (after the
  bubble, the alert preview and the hero crest), and `skeleton.tsx` is no
  longer the app's only looping animation. The avatar docblock now points
  here; anything else wanting a loop or a glow still needs its own ADR.
- **`attention` must never be set on a signed-in avatar.** The spin is the
  sign-in invitation; a permanent attention-seeker becomes banner blindness
  on four tabs. If a signed-in attention state is ever wanted (say, a failed
  push registration), that is a new decision, not a prop flip.
- The mark leaves the avatar entirely; it still owns the welcome screen,
  the icon and the splash.
- Trap 40 honoured: the arc's gradient id comes from `useId()`.

## Alternatives considered

- **A lime arc on the crown** — the literal read of "glow", and invisible:
  lime on the crown's lime band fails exactly as grey ink does (0087).
- **Pulsing the existing settle ring instead of spinning** — cheaper, but a
  pulse reads as "live/recording"; an orbit reads as "look here", and it is
  what was asked for.
- **Spinning always, signed in or out** — permanent motion in the corner of
  every tab, forever, for a reader who has already signed in. Rejected as
  noise; see Consequences.
