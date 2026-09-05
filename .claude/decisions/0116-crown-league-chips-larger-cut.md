# 0116 — The crown's league chips take a larger cut

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed ("can we make the league selectors a bit bigger please —
  on the match day and table screen", off a device screenshot)
- **Amends:** [0089](./0089-league-chips.md) — the chip geometry is no longer
  one size on both grounds

## Decision

`LeagueSwitch` in `tone="crown"` (Matchdays, Table) draws at **44pt chip
height with a 54×27 mark box** — new `Size.leagueChipHCrown` /
`leagueChipMarkWCrown` / `leagueChipMarkHCrown` — while `tone="ground"`
(Clubs) keeps 0089's 36pt / 44×22.

- Scoped by TONE, not a new prop: the two screens Ed named are exactly the
  two crown call sites, and the crown row is those screens' primary control
  where the Clubs row is a filter over a list that is the subject.
- 44 lands the crown chip on `minTouch`, which the 36 chip never reached
  (0089 noted it rode below with hitSlop).
- The mark box scales with the chip (×1.22, same landscape ratio); LaLiga's
  1:1 icon still letterboxes inside it.

## Consequences

- The crown header on both screens grows 8pt taller; the band flows, nothing
  is fixed against it.
- Ground-tone chips are untouched — the Clubs screen shows 0089's size,
  deliberately smaller than the same control one tab over.
