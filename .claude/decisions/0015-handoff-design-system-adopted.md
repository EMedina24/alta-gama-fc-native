# 0015 — Handoff design system adopted; theme module replaced

- **Date:** 2026-08-24
- **Status:** Accepted
- **Revises:** [0006](./0006-theme-constants-module.md) · resolves [0014](./0014-app-specific-design-language.md)
- **Decided by:** Ed Medina

## Context
[0014](./0014-app-specific-design-language.md) committed to an app-specific design
and recorded it as in progress, with the starter's tokens explicitly provisional.
`handoff_AG-ios/` is that design, delivered at high fidelity.

## Decision
`handoff_AG-ios/theme.ts` **replaces** [src/constants/theme.ts](../../src/constants/theme.ts)
verbatim. It exports `Colors`, `ThemeColor`, `Spacing`, `Radius`, `Type`, `Size`,
`BottomTabInset`, `MaxContentWidth`.

The design is **dark-only for v1** — `Colors.light` is an alias of `dark`, and
`app.json` sets `userInterfaceStyle: "dark"`, so the OS can never hand us a light
scheme. [use-theme.ts](../../src/hooks/use-theme.ts) therefore returns `Colors.dark`
unconditionally; `use-color-scheme.*` is deleted. A scheme read there would be a
lie the rest of the app then has to branch on.

Two things and only two carry over from the web app: the **mark** and the accent
**lime `#c8f25a`**. Surfaces are graphite, type is system SF Pro at iOS sizes,
every control is a platform control, and **the app has no shadows** — depth is
surface lightness.

## Consequences
- 0014's rule survives intact and now has real tokens behind it: **no colour,
  space or font literal in a component.**
- `Fonts` is gone from the token module — the design specifies the system face
  with no `fontFamily` anywhere. (`expo-font` stays installed: it is a required
  native peer of `expo-symbols`, not an app dependency. See [0016](./0016-ios-only-v1.md).)
- `Spacing` values **changed** under the same keys (`three` 16→12, `four` 24→16,
  `five` 32→20, `six` 64→24). This is why the starter had to be deleted before the
  swap — those collisions do not error, they silently misrender. The teardown order
  is recorded in the plan and was gated on a grep returning clean.
- **`BottomTabInset` is now a flat `80`**, revising 0006's `Platform.select({ios:50,
  android:80})`. It is the designed bar height and must be checked against the real
  `NativeTabs` bar on a simulator; the screen scaffold computes its bottom padding
  from it.
- `Type` entries are spread into styles; every numeric run additionally sets
  `fontVariant: ['tabular-nums']` via the `text` atom.

## Alternatives considered
- **Keep the starter tokens and re-skin later** — 0014 explicitly chose to avoid
  hardening a placeholder, and the design is now available. No reason to defer.
