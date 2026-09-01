# 0093 — Sheets sit on `#101316`, opaque, with glass groups

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (alerts sheet over the News screen; account sheet over Today)
- **Decided by:** Ed Medina, from `handoff_new-paint/` (APP-SHELL "Modal sheets stay opaque"; mockup lines 627+)
- **Amends:** [0030](./0030-sheets-are-presented-by-the-root-stack.md)'s `contentStyle` · [0081](./0081-account-sheet-redesign.md)'s group surfaces
- **Reaffirms:** [0081](./0081-account-sheet-redesign.md)'s platform `Switch`

## Context

Sheets took `Colors.dark.card` as their ground. The mock gives them their own
value and says why in one line: *"Modal sheets stay opaque (`#101316`): glass
over a scrim reads muddy."* A sheet sits over a dimmed screen, so a
translucent surface blends with the scrim rather than with the mesh.

## Decision

1. **`sheetGround #101316`** is the shared `contentStyle` for every route in
   `(sheets)/` — set once on the root stack's shared `sheet` options, where
   0030 put them. The XI export sheet's own scroll ground follows it.
2. **Groups INSIDE a sheet are `glassFill`** — a flat white blend over the
   opaque ground, which is what the mock draws. No blur: there is nothing
   behind them to blur.
3. **A pinned bar matches the sheet ground exactly** (account, sign-in), so it
   is invisible until content scrolls under it.
4. **The platform `Switch` stays.** The mock hand-builds a 51×31 track; 0081
   refused that once and this does not reopen it — a custom switch is a
   platform control reimplemented, with its own accessibility and its own
   Reduce Motion story.
5. **The tab bar takes `tabBar #0a0b0c`.** ⚠ The mock's `rgba(10,11,12,.92)`
   is not expressible: `NativeTabs` takes a colour and draws the system's own
   material behind it, so the alpha is the platform's to decide. The opaque
   equivalent is a step DARKER than the new ground, which keeps the bar
   reading as chrome under the mesh rather than as more page.
6. **The News in-app browser's toolbar follows the sheet ground** — it is a
   presented surface, not a screen.

## Consequences

- ⚠ No layout changed anywhere in a sheet: inside a `formSheet`, `flex: 1`
  collapses to zero and a pinned header is `stickyHeaderIndices`, not a
  sibling (trap 19 / 0030). This was a colour-only pass, deliberately.
- `Colors.dark.card` keeps its value and its other consumers (washed card
  bases, the matchday strip's future pill, news chips).
