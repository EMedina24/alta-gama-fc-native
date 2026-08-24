# 0005 — Tab navigation via `expo-router/unstable-native-tabs`

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina (implicit in initial scaffold)

## Context
The shell is a bottom-tab layout. Expo 57 offers a JS tab bar and a native one.

## Decision
Use `NativeTabs` from `expo-router/unstable-native-tabs` in
[src/components/app-tabs.tsx](../../src/components/app-tabs.tsx), rendered by the
root `_layout.tsx`. Tab icons are PNG assets under `assets/images/tabIcons/` with
`renderingMode="template"` so they take the tint color. A separate
`app-tabs.web.tsx` provides the web implementation.

## Consequences
- Tabs look and feel native (platform blur, haptics, accessibility) for free.
- The API is marked **unstable** — expect breaking changes on SDK upgrade, and
  keep tab customization concentrated in `app-tabs.tsx` so the blast radius is one file.
- Tab bar height is not measurable from JS; `BottomTabInset` in
  `constants/theme.ts` hard-codes 50 (iOS) / 80 (Android) and must be kept in sync.
- Every new tab needs an icon asset at @1x/@2x/@3x.

## Alternatives considered
- **JS `Tabs` from expo-router** — stable API, fully styleable, but doesn't match
  platform tab behavior.
