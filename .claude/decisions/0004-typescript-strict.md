# 0004 — TypeScript with `strict: true`

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina (implicit in initial scaffold)

## Context
A greenfield codebase is the cheapest possible moment to turn strictness on.

## Decision
TypeScript `~6.0.3` extending `expo/tsconfig.base` with `strict: true`. Also
enabled: `experiments.reactCompiler` in `app.json`, so components must obey the
Rules of React (no mutation during render, no conditional hooks).

## Consequences
- Nullability and implicit `any` are compile errors; handle them rather than
  widening types.
- No `tsc` npm script exists yet — type-check with `npx tsc --noEmit`.
- React Compiler handles memoization; do not add `useMemo`/`useCallback`
  defensively.

## Alternatives considered
- **Non-strict TS** — cheaper today, expensive later.
