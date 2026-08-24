# 0003 — Application code under `src/`, `@/` path alias

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina (implicit in initial scaffold)

## Context
Repo root would otherwise mix app code with config, assets, and scripts.

## Decision
All application code lives in `src/` (`app/`, `components/`, `constants/`,
`hooks/`). `tsconfig.json` maps `@/*` → `./src/*` and `@/assets/*` → `./assets/*`.
Relative parent imports (`../../`) are not used.

## Consequences
- Files move without rewriting import paths.
- New top-level code folders go inside `src/`, and are reachable as `@/<folder>`
  with no config change.
- Assets stay outside `src/` but keep a stable alias.

## Alternatives considered
- **App code at repo root** — the create-expo-app default; noisier root and
  relative-path churn.
