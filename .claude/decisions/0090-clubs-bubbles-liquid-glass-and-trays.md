# 0090 — The Clubs bubbles go liquid glass; search and browse become double-bezel trays

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (`/clubs` live, `/_debug/gallery?only=clubs`)
- **Decided by:** Ed Medina, from `handoff_new-paint/` (APP-SHELL "Subscribed bubbles" spec)
- **Supersedes:** [0082](./0082-clubs-screen-rail-redesign.md)'s bubble VISUAL spec (club-colour ring/radial/glow, ground-cutout check, `sunken` rank chip) — its behaviour survives whole: one action, rank eligibility by `bandsApply`/`League.zones`, `pickerName`, unfollow-not-here
- **Narrows further:** [0081](./0081-account-sheet-redesign.md)'s no-nested-shells — the TRAY is a sanctioned card shape now (ADR 0087's language)

## Context

APP-SHELL.md redraws the rail bubble as an 88pt LIQUID GLASS shell — white
glass, no club-colour radial — because the rail rides the crown's fade now,
where club-colour washes fought the gradient. The search field and browse list
gain the double-bezel tray the club page will use four more times (0091).

## Decision

1. **The bubble is a white glass shell.** Where `isLiquidGlassAvailable()`
   (iOS 26+) the body is an `expo-glass-effect` `GlassView`
   (`glassEffectStyle: 'clear'`) — the module was installed and never
   imported; this is its first use. Everywhere else: a flat `bubbleShell`
   fill, the spec's own floor. ⚠ The gate is decided at MODULE scope, before
   mount — both paths share every overlay (rim, `BubbleGlass` vertical wash,
   bottom bounce, specular pool, lit top edge), so one design renders at two
   fidelities.
2. **The specular is an elliptical `WashRadial` pool**, not the mock's
   2px-blurred arc — a hard-edged strip read as a decal on the simulator.
   Recorded divergence.
3. **The drop shadow** is the mock's `0 10 22 rgba(6,18,14,.28)` with the CSS
   blur halved into RN's radius (0082's measured conversion). 0082's
   club-colour glow is retired with the tint.
4. **The rank pill is FROSTED** (`bubbleRankFill`, `onCrown` ink) and the
   qualification band's colour becomes a leading 4pt dot — `BAND_COLOR` inks
   were built for the dark ground and fail contrast on a white pill.
   Eligibility logic untouched.
5. **The check keeps its lime, gains a white rim** (`bubbleCheckRim`) — the
   old rim was a cutout of a flat ground the bubble no longer sits on.
6. **`ClubBubble` loses `tint`** — `RailClub`, the Clubs screen and the
   gallery stop resolving `clubTint` for the rail (the club page still uses
   the wash family).
7. **`molecules/tray.tsx`** is the double bezel as one component: outer
   `trayOuter` glass band, `Size.trayPad` gap, opaque `trayInner` with a lit
   top edge; inner radius is ALWAYS `outer − trayPad`. The search field wraps
   itself in it (r24); `ClubBrowser` renders its rows inside one (r26).
8. **`ChipButton`'s ring goes 1pt** — 0.33pt lime vanished against the mesh.

## Consequences

- `bezelFill`/`bezelHighlight` lost their only consumer — P6 deletes them if
  still orphaned; theme.ts's bezel docblock is superseded by the Tray.
- GlassView cost across a scrolled rail was accepted after watching the live
  rail with 6 follows; if a longer rail ever stutters, flip the module gate to
  `false` — the fallback is the blessed floor.
- The club-colour EXPRESSION on this screen now lives in the crests alone;
  `clubTint` remains for the club page's hero and next-card washes (0091).
