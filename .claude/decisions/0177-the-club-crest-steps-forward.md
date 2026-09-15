# 0177 — The club crest steps forward: its alpha decouples from the league marks'

- **Date:** 2026-09-14
- **Status:** Accepted — harness re-shaped and green (fails past the measured
  ceiling, probed); simulator screenshot pending Ed's eye on the level.
- **Decided by:** Ed — *"can we make the club crest in the background a bit
  more visible"*, on seeing Real Madrid's crest at 0.095 read as barely-there.
- **Amends:** [0175](./0175-the-board-wears-the-readers-background.md) — its
  "`CrownClubArt.alpha` pinned to `CrownArt.alpha`" clause; the rest stands.
- **Superseded by [0179](./0179-the-crest-takes-the-head.md)** — the
  watermark this entry tuned retired when the crest moved into the head.

## Context

0175 pinned the club crest's alpha to the league marks' 0.095 so the existing
white-composite ink proof covered it. Measured when Ed asked for more: the pin
was **conservative on the wrong ink**. Only the QUIET ink (`onDeepDim`) is
bound near AA on the club ladder (4.53:1 bare at the worst hue — zero
headroom for ANY composite), while the primary WHITE ink clears AA all the
way to alpha ≈ 0.30 (6.78:1 at 0.18). And no quiet ink ever sits on the
crest: the board — the only screen wearing a club crest — puts its
eyebrow/title top-LEFT, and the crest hangs off the RIGHT
(`ART_DROP`/`ART_OFF`).

## Decision

- **`CrownClubArt.alpha` 0.095 → 0.18** — roughly twice the presence,
  device-judged, one token to tune. Height and fades unchanged.
- **The harness's club proof splits into two tiers** (section 7 of
  `scripts/league-theme-harness.mjs`): WHITE ink rated bare AND crest-lit at
  `CrownClubArt.alpha` (a long title may run into the crest box — the
  conservative model stays for the ink that can actually meet the crest);
  QUIET ink rated on the BARE band only, resting on the **layout premise**
  above — ⚠ moving the crest under a quiet-ink line means re-rating the
  harness FIRST, not after the screenshots. The equality pin becomes
  `CrownClubArt.alpha >= CrownArt.alpha` (a club crest fainter than the
  league marks would re-open the report that prompted this).
- **The white-ink ceiling is enforced, not commented**: the sweep composites
  at the token itself, so a future bump past ≈ 0.30 fails the harness
  (probed at 0.34: fails at hue 15°, 4.45:1).
- The league marks are untouched — 0.095, both inks against the composite,
  exactly as 0165 proved them.

## Rejected

- **Raising the league marks with it** — nobody asked, and their proof has no
  headroom for the quiet ink that DOES sit near them (matchdays' meta line).
- **Deepening `CrownClubDim` to buy quiet-ink headroom under the crest** —
  darkens every approved club crown to serve a composite that never occurs
  on the real layout.
- **A bigger crest instead of a stronger one** — size was never the
  complaint; alpha is the lever the report names.
