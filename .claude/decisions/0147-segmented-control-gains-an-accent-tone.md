# 0147 — The segmented control gains an accent TONE, not an animation

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Claude

## Context

The Season stats mock's view switch is a lime-filled thumb with a `.35s`
transition, and its screen title is `700 36px`. Two house rules disagree:

- [0045](./0045-match-events-expanded-row.md) rejected animating controls like
  this, for consistency; `EventTabs` and `SegmentedControl` both honour it.
- [0131](./0131-one-display-voice-for-screen-titles.md) fixes screen titles at
  **weight 300** in three sizes, and says a new screen "never mints a fourth size
  or a bold screen title".

The mock predates both.

## Decision

`SegmentedControl` gains **`tone?: 'quiet' | 'accent'`**. `accent` fills the
selected segment with `Colors.dark.accent` on `onAccent` ink over a `recess`
track, at `Size.pill` height — the mock's look. It does **not** animate.

The screen title stays `heroTitle` (36 / 300). The club page one push back is
`heroTitle`, and two consecutive screens in different title voices is exactly
what 0131 exists to stop.

⚠ The unselected ink differs by tone and is not a free choice: `textMuted` reads
correctly against a glass track and vanishes against the accent tone's darker
recess, so that one sits a step brighter at `textSecondary`. The `quiet` tone is
byte-identical to before.

## Consequences

- One new prop on the shared control instead of a fourth control — there are
  already three (`SegmentedControl`, `EventTabs`, and the club page's inline
  one), which is two more than anyone wants.
- ⚠ `accent` spends the screen's ONE lime hero (SPEC §2). A screen using it must
  not also carry a solid-lime button; Season stats does not.
- 0045 stands unamended. The mock's transition is simply not built.
- The mock's card stagger (80 ms) and rise (700 ms) are reconciled the same way,
  to `Motion.stagger`/`Motion.enter` — see
  [0142](./0142-charts-are-drawn-not-imported.md).

## Alternatives considered

- **Build a fourth, animated control for this screen** — one control that
  animates among three that do not is worse than three that agree, and it would
  reverse 0045 for one surface.
- **Reverse 0045 and animate all of them** — a real option, and a separate
  decision with its own scope. Not smuggled in under a stats screen.
- **A bold 36pt title, as drawn** — reverses 0131 for one screen, and the reader
  arrives from a `heroTitle` screen.
