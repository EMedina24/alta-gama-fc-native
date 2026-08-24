# 0006 — Centralized theme constants, no styling library

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina (implicit in initial scaffold)

## Context
Light/dark support is required (`userInterfaceStyle: automatic`), and styling
approaches range from plain `StyleSheet` to NativeWind/Tamagui/Unistyles.

## Decision
Stay with React Native `StyleSheet` plus a single source of truth in
[src/constants/theme.ts](../../src/constants/theme.ts): `Colors` (light/dark),
`Fonts` (per-platform families), `Spacing` (4pt scale), `BottomTabInset`,
`MaxContentWidth`. Components read the palette through `useTheme()` and use
`ThemedView` / `ThemedText`. Web font families resolve to CSS custom properties
declared in `src/global.css`.

## Consequences
- No styling dependency to track across SDK upgrades.
- Adding a color or spacing step is a one-file change that both themes must satisfy.
- Verbose relative to utility-class styling; accepted for now.
- `useColorScheme()` can return `'unspecified'` — always coerce to `'light'`.

## Alternatives considered
- **NativeWind / Tamagui / Unistyles** — faster authoring, but each adds build
  config and an upgrade dependency for a codebase with no styling pain yet.
