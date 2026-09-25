# 0195 — Sheets and bars go glass

- **Date:** 2026-09-25
- **Status:** Accepted — pending a simulator check on iOS 26
- **Decided by:** Ed, via the Medina adoption plan
  ([0193](./0193-medina-digital-becomes-the-design-system.md), phase 3): *"proceed on the other phases"*.
- **Supersedes, where liquid glass exists:** [0093](./0093-sheets-on-their-own-ground.md)
  §1 (opaque sheet ground), §3 (pinned bars match it) and §5 (opaque tab bar).
  Below iOS 26, 0093 still holds unchanged.

## Context

The Medina kit puts sheets and the tab bar in system liquid glass.

0093 made both opaque on a handoff mock's line: *"glass over a scrim reads
muddy."* That line was about a *drawn* translucent fill blending with the dimming
scrim. iOS 26's formSheet glass is the system's own material, and so is its
tab-bar glass. A `backgroundColor` on either paints over that material.

Three components already used `GlassView` directly, each with its own copy of
the `isLiquidGlassAvailable()` fork:

- `club-bubble`
- `league-menu`
- `next-up-card`

## Decision

1. **A `GlassSurface` atom** (`atoms/glass-surface.tsx`) is the only place
   that forks on `isLiquidGlassAvailable()`.
   - It is a *layer* drawn behind content: a `GlassView` on iOS 26, and a flat
     view with the caller's own `flatStyle` everywhere else. It is not the
     kit's wrapping version, because every glass use here is a shell behind
     content.
   - The three existing users now render through it, each keeping its own
     flat fill.
   - It exports `LIQUID_GLASS` and `SHEET_GROUND`.
2. **No `expo-blur`.** The kit falls back to `BlurView` below iOS 26. Here,
   every glass surface already degraded to an opaque fill, and the app floor
   is below 26. Adding a blur for older OS versions only is a dependency with
   no reader asking for it.
3. **Sheets.** `SHEET_GROUND` is transparent on iOS 26 and `sheetGround`
   otherwise. Everything that must match the sheet reads it:
   - the root stack's shared `contentStyle`
   - the pinned bars of the account, sign-in, email-auth and
     board-background sheets
   - the stats-player head
   - the XI-export scroll
4. **The tab bar.** `backgroundColor` is left unset where liquid glass exists,
   so the system draws glass. Below 26 it keeps `tabBar`.
5. **The league dropdown's panel stays opaque**
   ([0163](./0163-the-dropdown-leaves-the-crown-and-leaves-glass.md) is untouched). The `_debug`
   sheets preview keeps `sheetGround`, because it renders organisms outside a
   formSheet.
6. **Sheet corner radius stays the system's.** The kit sets 30; the iOS 26
   sheet draws its own concentric radius, and overriding it fights the glass.

## Consequences

- **The risk is the pinned bars.** 0093 §3 made them invisible *because* they
  matched an opaque ground. On glass they are transparent, so content that
  scrolls under a bar's buttons will show through (trap 59).
  - Check account and sign-in on an iOS 26 simulator.
  - If one reads badly, that sheet gets its own ground back, noted here. That
    beats reintroducing the opaque sheet everywhere.
- The glass rules still bind (0120/0122, traps 64/69/74): no animated opacity
  or transform above the tab bar, and nothing opaque directly under a glass
  shell.
- Adding glass anywhere else now means one import and no new fork.

## Alternatives considered

- **Keep 0093 everywhere.** Then the kit's sheet and tab-bar look never
  appears on the OS that has it.
- **Glass on the pinned bars as well.** That is glass over glass, which Apple's
  guidance and trap 74 both warn against.
