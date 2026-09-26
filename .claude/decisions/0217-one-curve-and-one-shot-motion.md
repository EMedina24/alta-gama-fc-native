# 0217 — One curve and one-shot motion

- **Date:** 2026-09-26
- **Status:** Accepted
  - The keeper pulse and the scene were seen on the simulator.
  - The pop and ripple are not verified: they need a tap to place.
  - Reduce Motion was not checked by hand.
- **Decided by:** the `handoff_lineup/` design, trimmed by the `Pulse` rule.
- **Amends:** the `Pulse` docblock. The builder's keeper hint is its second
  consumer.

## Decision

- **`Ease.kit`** is the kit's `cubic-bezier(.32,.72,0,1)`, as a theme token. It
  is kept apart from `Motion`, which holds durations only. `XiMotion` holds the
  builder's clock (plane 700, pop 700, ripple 900, pop-over 350, scene 500,
  tap guard 80, fx stale 1500).
- **One-shot motion only:**
  - a placement's disc pops 0.7 → 1.04 → 1, and a ring spreads on the grass in
    the club's glow;
  - the formation pop-over fades up;
  - the club scene crossfades on a switch, as a background SIBLING and never an
    ancestor of glass or of the tab bar (trap 64).
- **The pop waits for the pitch.** The placement happens under a sheet, so it
  plays when the screen is focused again, once per event, and never for one
  older than 1.5s (`useXiFx`, which is ephemeral and never persisted).
- **The keeper's slot breathes** on `Pulse` until the first placement ever. It
  is transient, and something is at stake: the pitch starts empty.
- **Not built:**
  - the handoff's 6s breathe on every token (eleven perpetual loops, which the
    `Pulse` rule refuses without its own argument);
  - its shimmer, which needs a blend mode.
- **Reduce Motion:** `ReduceMotion.System` on every timing; the pulse holds
  still at full strength.
