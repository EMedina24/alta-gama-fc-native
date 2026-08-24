# 0001 — Expo SDK 57, managed workflow

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina (implicit in initial scaffold)

## Context
The app targets iOS, Android, and web from one codebase, with no bare-native
requirement identified.

## Decision
Build on Expo SDK 57 (`expo ~57.0.16`, React Native 0.86.2, React 19.2.3) in the
managed workflow. No `ios/` or `android/` directories are checked in; native
configuration goes through `app.json` and config plugins.

## Consequences
- Native capabilities come from Expo modules or config plugins. A dependency
  needing custom native code requires a development build (`expo prebuild` /
  EAS), which is a new decision when it happens.
- Expo 57 diverges from older Expo/RN knowledge. **Always** consult
  https://docs.expo.dev/versions/v57.0.0/ rather than recalling older APIs —
  this is enforced in [AGENTS.md](../../AGENTS.md).
- SDK upgrades are coordinated across all `expo-*` packages at once.

## Alternatives considered
- **Bare React Native** — more native control, far more maintenance; nothing
  requires it yet.
