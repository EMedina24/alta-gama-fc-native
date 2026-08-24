# 0002 — expo-router with file-based routing

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina (implicit in initial scaffold)

## Context
Navigation needs to work identically on native and web, with deep links and
shareable URLs.

## Decision
Use `expo-router` as the entry point (`"main": "expo-router/entry"`). Routes are
files under `src/app/`; `_layout.tsx` files define nesting. Typed routes are
enabled via `experiments.typedRoutes: true`, and the deep-link scheme is
`altagamafc`.

## Consequences
- Adding a screen means adding a file — no central route registry.
- Route names are type-checked; a typo in `href` is a compile error.
- Web builds emit real URLs (`web.output: "static"`).
- Layout/provider composition belongs in `_layout.tsx`, not in a root component.

## Alternatives considered
- **React Navigation directly** — more explicit, but loses typed routes, URL
  handling, and the web story that expo-router provides for free.
