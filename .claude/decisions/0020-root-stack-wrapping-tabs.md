# 0020 — Root layout is a `Stack` wrapping a `(tabs)` group

- **Date:** 2026-08-24
- **Status:** Accepted — sheet presentation revised by [0030](./0030-sheets-are-presented-by-the-root-stack.md)
- **Revises:** [0005](./0005-native-tabs.md)
- **Decided by:** Ed Medina

## Context
[0005](./0005-native-tabs.md) had the root `_layout.tsx` render `AppTabs` directly.
That works for an app that is only tabs. The design is not: the club page
(`/club/[slug]`), onboarding, and four modal sheets all sit **outside** the tab bar
and push or present over it.

## Decision
```
src/app/_layout.tsx          Stack — app-wide providers, dark content style
src/app/(tabs)/_layout.tsx   NativeTabs — Today · Matchdays · Table · Clubs
src/app/(tabs)/{index,matchdays,table,clubs}.tsx
src/app/club/[slug].tsx      pushes over the tabs
src/app/(sheets)/*           presentation: 'formSheet'
```

`components/app-tabs.tsx` is **deleted**; `(tabs)/_layout.tsx` is now the single
file tab customisation lives in, which is what 0005's blast-radius rule was
actually protecting. Its `.web.tsx` twin goes with it ([0016](./0016-ios-only-v1.md)).

## Consequences
- A route outside `(tabs)/` is automatically full-screen over the tab bar — the
  design's club page and sheets need no special casing.
- 0005's warning still stands: `expo-router/unstable-native-tabs` is **unstable**
  and the blast radius is one file, now `(tabs)/_layout.tsx`.
- Icons are SF Symbols with `{default, selected}` pairs
  (`smallcircle.filled.circle`, `calendar`, `chart.bar`, `shield`), tinted through
  `iconColor`/`labelStyle` from the theme.
- Providers (React Query, preferences) mount in the root `Stack` layout so both the
  tabs and the routes outside them share one instance.
