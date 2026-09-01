# 0088 — Today's live match moves into the crown as a dark glass plate

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (`/_debug/gallery?only=live`, all fabricated paths; a real live match still pending)
- **Decided by:** Ed Medina, from `handoff_new-paint/` (crown payload table)
- **Amends:** [0048](./0048-live-scores-on-the-today-board.md)/[0078](./0078-kicked-off-lead-card.md) presentation only · [0050](./0050-match-events-on-the-in-progress-card.md) survives intact

## Context

APP-SHELL.md's payload table: *"Today | the live match, as a dark glass
plate."* The live branch lived at the top of `match-board.tsx`, early-returning
past the next/last stack. The crown (ADR 0087) needed it as a child of the
header, not of the body.

## Decision

1. **`organisms/live-plate.tsx`** is the live branch extracted whole. The DATA
   contract moved **verbatim** — id-nullable withholds the disclosure,
   `suppliedEvents` `undefined`-vs-`[]` selects the events source, the
   three-path `isLive`/`awaitingUpdate` split, the stalled-dims-never-hides
   minute, the honesty note above the disclosure (trap 8) — every docblock
   warning travels with it. Only the surface changed: `plateDark` glass,
   `plateLine` 0.5pt border, `plateTop` lit edge, events on `recess`.
2. **The screen wires it as `payload={board ? <LivePlate …/> : null}`** on the
   scaffold. With nothing live the crown collapses to eyebrow + title —
   APP-SHELL's idle state, for free.
3. **`MatchBoard` keeps next/last and renders only when `!board`** — the same
   never-both-on-screen invariant the early return used to enforce, now at the
   call site. `onKickoff`, the kicked-off tier, `useLive` polling
   (`useIsFocused() && hasClubs`) and the refetch set are **untouched** in the
   screen.
4. **`EventsDisclosure` promoted to `molecules/`** on its second consumer
   (0013's rule) — one accessibility contract, still one copy.
5. The **red border is gone** (the mock's plate is dark glass; liveness is the
   outlined `IN PROGRESS` pill and the live-ink minute). Vocabulary unchanged:
   never the word "live" (0035), no pulsing dot (0034).

## Consequences

- `MatchBoardProps.live` is deleted; the gallery's four live previews render
  `LivePlate` and gained a dedicated `/_debug/gallery?only=live` branch.
- The 100° `ClubWash2` pair wash replaced the diagonal seam on the washed
  next-up card (translucent stops over an opaque `card` base — trap 42 rails).
- First thing to watch on a real matchday: the plate appearing in the crown at
  the whistle (the 0078 kicked-off tier now renders inside the crown).
