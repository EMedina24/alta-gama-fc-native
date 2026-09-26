# 0211 — The XI is keyed by slot, with a bench and saved lineups

- **Date:** 2026-09-26
- **Status:** Accepted
  - `scripts/starting-xi-harness.mjs` covers every reducer case, the
    migration and garbage input (1,194 assertions in total, with 0213's
    camera).
  - No screen reads it yet; the builder moves onto it in
    [0212](./0212-starting-xi-becomes-the-fifth-tab.md).
- **Decided by:** Ed approved the overhaul plan for `handoff_lineup/`. The
  reducer semantics below are this change's own calls, flagged in the plan.
- **Supersedes, in part:** [0065](./0065-starting-xi-builder.md):
  - §3: placements are keyed by slot id, not slot index. The person-id rule
    stands.
  - §5: `autoFill` is gone, and there is a new re-seat.
  - §6: the store shape.

## Context

The mobile handoff (`handoff_lineup/`) adds three things the first builder's
state could not hold:
- a seven-player **bench**;
- up to five **saved lineups** per club;
- a **club switcher** inside the builder.

The first builder also keyed placements by slot INDEX (0–10), while the web
app, the backend's poster route and the handoff all key by slot ID. The
app's 4-2-3-1 even spelled three ids differently (`LAM/CAM/RAM` against
everyone else's `LM/AM/RM`).

## Decision

- **Slot id → person id.** `features/starting-xi/slots.ts` holds the one id
  table:
  - It is the web's `SHAPES`, verbatim, keeper implied and deepest band first.
  - `FORMATION_SLOTS` is derived from the bands.
  - `bandOf` reads a slot's line off its suffix.
  - The harness diffs it against `cronogol`'s `geometry.ts` and
    `senpai-backend`'s `ig-xi-formations.ts` whenever they are checked out
    beside this repo.
- **One club's state is `ClubXi`:**
  - `formation`, `placements`, `bench` (at most 7, in the order benched);
  - `lineups` (at most 5, newest first);
  - `loadedId`, the lineup whose card wears the lime ring;
  - `title`, the export card's.
- **Pure reducer:** `reduceXi(state, action, squad) → { state, effect }` in
  `features/starting-xi/xi-state.ts`.
  - **`place`:**
    - from another slot → a true swap;
    - from the bench → the occupant takes that bench cell;
    - from the squad → the occupant goes to the bench if there is room,
      otherwise back to the pool.
  - **`toBench`** refuses an eighth. The UI disables the button.
  - **`unplace`, `clear`.**
  - **`mirror`** flips each geometric row. A row of one maps to itself.
  - **`setFormation`:**
    1. A player whose slot id exists in the new shape keeps it.
    2. The rest take the first empty slot of their own band.
    3. Anyone still standing goes to the bench, then to the pool.
    4. It never seats a player across bands.
  - **`saveLineup`** needs eleven RESOLVED players, a `GK`-position player in
    the `GK` slot, and fewer than five lineups.
  - **`loadLineup`** drops departed players from the working copy and never
    rewrites the saved lineup.
  - **`deleteLineup`** clears `loadedId` if it pointed there.
  - **Prune rides every action** and is skipped when the squad index is
    empty, so an unloaded squad never prunes anyone.
- **The store is v2 under the same key** (`altagama:starting-xi`):
  `{ v: 2, lastClub, clubs, view }`.
  - `view` holds `statsMode`, `flat`, `flatRot`, `rotZ`, `tiltX`, `benchOpen`,
    `onboarded` and `gestured`. It is one set for every club.
  - Parsing lives in `features/starting-xi/migrate.ts` so it runs without
    AsyncStorage, and it re-validates every field.
- **v1 is migrated, not dropped.**
  - v1's index order equals `FORMATION_SLOTS`' order for all eleven shapes, so
    index `i` maps through a FROZEN copy of v1's labels.
  - `LAM/CAM/RAM` → `LM/AM/RM`, **for 4-2-3-1 only**. 4-3-2-1 and 3-4-2-1
    really do seat a `LAM` and a `RAM`.
  - `look` is dropped and `title` is kept.
  - A reader who had placed anyone starts `onboarded`.

## Consequences

- Per-club working state is **kept** across a club switch, as the web app
  does. The prototype had one global XI that a club pick wiped.
- Nothing reaches a server. There is still no lineup endpoint.
- The export card keeps its own measured coordinates
  ([0213](./0213-the-pitch-is-a-plane-seen-through-one-camera.md)). It shares
  this file's slot ids, and the harness asserts it.
- A lineup saved before a transfer loads one player short. That is correct,
  and it is the web's rule too.

## Alternatives considered

- **The web's re-seat, which spills leftovers into any empty slot.** It
  puts a winger at right midfield and says nothing. The bench makes the
  leftover visible and one tap from wherever the reader wants him.
- **The prototype's full-bench behaviour.** Its `toBench` removed a player
  from the pitch and then failed to seat him, so he vanished. Here a full
  bench refuses instead.
- **A new storage key instead of a migration.** It would silently strand
  every XI already built. The web app kept its key for the same reason.
