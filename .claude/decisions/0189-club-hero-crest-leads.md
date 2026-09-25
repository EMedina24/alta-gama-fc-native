# 0189 — The club hero's crest leads

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decided by:** Ed, from a screenshot of Arsenal's page: *"these should swap.
  Crest in the left and team name on the right"*.
- **Amends:** [0091](./0091-club-page-hero-and-trays.md). This changes the identity
  row's order only. It also moves the bled wallpaper crest's corner. The wash and the pills stand.

## Decision

1. **The identity row reads crest, then name.** The 80pt crest comes first.
   The name (`heroTitle`) and its ground stack to its right.
2. **The row centres vertically** (`alignItems: 'center'`, where it used
   `flex-end`), with a `Spacing.four` gap.
   - Bottom-aligned beside a leading 80pt crest, the name sat low and read as
     a caption.

3. **The 6% wallpaper crest moves to the bottom-RIGHT corner**
   (`right: -BLEED_OFF`). Ed: *"the background crest should also be on the
   right"*.
   - It now sits opposite the identity crest, so the two never stack into a
     doubled crest.
   - The fade geometry (`BLEED_CLIP`) is unchanged. It is vertical, and the
     side edge still hard-clips at the physical screen edge, now on the right.

## Consequences

- The name keeps the same width budget (`flex: 1`, `minWidth: 0`). Long names
  such as `Espanyol de Barcelona` wrap exactly as before.
