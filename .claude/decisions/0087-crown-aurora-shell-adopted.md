# 0087 — The crown + aurora shell is adopted: mesh ground, glass cards, and the token system that carries them

- **Date:** 2026-09-01
- **Status:** Accepted — P1 (ground/mesh/glass) shipped; the crown itself lands with 0088/0089. ⚠ §10's `targets/` carve-out amended by [0104](./0104-widgets-adopt-the-app-shell.md)
- **Decided by:** Ed Medina, from a delivered design pack (`handoff_new-paint/`)
- **Amends:** [0015](./0015-handoff-design-system-adopted.md) (surface ladder, no-shadow rule) · [0030](./0030-sheets-are-presented-by-the-root-stack.md) (sheet ground only) · [0045](./0045-match-events-expanded-row.md) (recession value only)

## Context

`handoff_new-paint/` redraws the whole app: a lit OLED ground with one static
colour mesh behind every screen, a lime→teal **crown** at the top of each tab,
and translucent white **glass** cards — "no charcoal cards anywhere"
(`APP-SHELL.md`). The pack is an interactive prototype
(`AltaGama FC iOS.dc.html`) covering every screen and sheet, plus five tab
screenshots.

This is a deliberate design-language change, so where the mockup contradicts a
recorded visual rule, **the mockup wins and the superseding entry is written**
(this one and 0088–0093). Four carve-outs follow **code, not mock**, because
they are correctness rather than paint:

1. Rank/zone colours come from `League.zones` via `bandsApply` — the mock's
   `pos<=4` table is the placeholder [0082](./0082-clubs-screen-rail-redesign.md)
   already rejected.
2. The account sheet keeps the platform `UISwitch`
   ([0081](./0081-account-sheet-redesign.md)) — the mock's hand-built switch
   stays unbuilt.
3. Every honesty line survives: `FeedAge`, the in-play cadence sentence, "not
   published yet" (traps 8/32; [0035](./0035-jornada-rows-show-in-play-scores.md)/
   [0045](./0045-match-events-expanded-row.md)).
4. NEXT UP still leads the idle Today board
   ([0063](./0063-next-up-leads-the-board.md)) — the mock draws LAST RESULT
   first; that ordering is product, not paint, and is rejected.

## Decision

1. **Ground.** `background` moves `#0a0b0c → #0f1316`. One static mesh —
   three elliptical radial pools (lime top-right, deep teal left, blue-teal
   bottom-right), the `Mesh` const — is drawn by a new `atoms/mesh-ground.tsx`
   as the first child of a screen's root View, BEHIND the scroll view. Once per
   screen, never per card, never inside the scroll, never on a sheet.
2. **Glass.** Body cards become `glassFill rgba(255,255,255,.06)` with a
   `Size.glassBorder` (0.5pt) hairline of `glassLine rgba(255,255,255,.11)` —
   written once as the `Surfaces.glass` tuple. `glassFillDim` (.05) is the
   quiet slab (fixture day headers, segmented tracks).
3. **⚠ Add-don't-mutate.** `card`/`raised`/`raisedAlt` KEEP their values;
   call sites migrate token by token. Mutating `card` to a translucent white
   was rejected for cause: `card` feeds **SVG stops** (`match-board`'s wash
   seam, the News lead's fade), and `react-native-svg` paints an rgba stop
   OPAQUE (trap 42) — the seam would have gone near-white. `card` survives as
   the **opaque base**: under a club wash (glass under a wash double-blends
   with the mesh; the mock's own washed cards sit on `#15171a`), the strip's
   future pill, news chips, tab-bar chrome.
4. **Recession.** `sunken` (`#101317`) is invisible against `#0f1316`; the
   match-events panel moves to `recess rgba(0,0,0,.28)` — translucent black
   recesses on ANY ground. `sunken` stays declared until its last consumer is
   confirmed gone (P6).
5. **Sheets go `sheetGround #101316`, opaque** — glass over a scrim reads
   muddy (the pack's own words). Sheet-internal groups become flat `glassFill`
   blends; pinned bars follow the sheet ground so they stay invisible until
   content scrolls under them. Detailed by 0093 in P5.
6. **The crown ink set is its own family** — `onCrown #0d1a08`,
   `onCrownDim/Line/Fill` — mapping one-for-one onto APP-SHELL.md's
   "onAccent…" table. ⚠ NOT the existing `onAccent #101806`, which is the ink
   of an on-lime CONTROL and is hand-copied into `targets/_shared/Tokens.swift`
   (trap 15). Dark ink is legal only in the crown's bright band (top half);
   past the midpoint content keeps normal dark tokens.
7. **The score chip re-grounds to `scoreChip rgba(255,255,255,.07)`** — the
   VALUE changes, [0044](./0044-scores-render-as-split-digits.md)'s neutrality rule does not.
8. **Shadows are legal where the mock draws them** (crest drop-shadows, the
   segmented thumb, the bubble shell) — a narrowing of 0015's "no shadows",
   which [0082](./0082-clubs-screen-rail-redesign.md) had already narrowed
   once. Depth-by-surface-lightness remains the default; a shadow needs the
   mock to show one.
9. **The crown sits BELOW the status bar** — the mock's own layout: "9:41"
   white on the dark mesh, crown starting under the inset. `StatusBar
   style="light"` stands; the lime passing under white status text during a
   scroll is an accepted transient.
10. **Out of scope, deliberately:** `targets/` (widgets and Live Activities
    keep their floodlight look and their hand-copied tokens), and the XI
    export card (`cardGround` ships to Photos, not to the mesh).
    ⚠ **The `targets/` half of this point is amended by
    [0104](./0104-widgets-adopt-the-app-shell.md)** — the widgets and the Live
    Activity now draw the mesh and the glass. The XI export card's exclusion
    stands. Nothing else in this entry changes.

## Consequences

- Every screen re-grounded at once (opaque `background` everywhere it is
  painted); glass migrated on ~20 call sites; `WashRadial` gained `rx`/`ry`
  for the elliptical pools.
- The mesh and crown consts are shaped as `WashStop`s so translucency can only
  travel as `stopOpacity` — the trap-42 rail is built into the type.
- `NewsScrim.color` follows the ground until 0092 retires the front page.
- Later phases own their own entries: crown + live plate (0088), league chips
  (0089), bubbles/trays (0090), club page (0091), news (0092), sheets (0093).
