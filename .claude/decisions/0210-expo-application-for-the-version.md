# 0210 — `expo-application` for the version line

- **Date:** 2026-09-25
- **Status:** Accepted. Installed as `~57.0.3`. The Version row was seen in the
  `/_debug/settings` stub, but the real binary's values haven't been read yet.
- **Decided by:** Follows from [0208](./0208-the-account-sheet-becomes-settings.md):
  Ed's mock has a Version row ("2.4.0 (318)").

## Context

Settings shows the app's version and build. `app.json` says `1.0.0`, but
`eas.json` sets `appVersionSource: remote` with `autoIncrement`. The number a
build ships with is decided by EAS and exists only in the native bundle.
`expo-constants`' native version fields are deprecated in favour of
`expo-application`.

## Decision

- Add **`expo-application`** as a direct dependency.
- Settings reads `nativeApplicationVersion` and `nativeBuildVersion` once, at
  module scope, and prints "version (build)". With no version, there is no row.

## Consequences

- **No dev-client rebuild was needed.** `expo-notifications` already depends
  on `expo-application`, so `EXApplication` was autolinked
  (`ios/Podfile.lock`). Making it direct only pinned it. The JS side moved
  from 57.0.2 to 57.0.3, a patch bump with the same constants API, and the
  next native build picks up 57.0.3.
- Nothing may compute a version from `app.json`.

## Alternatives considered

- **`Constants.expoConfig.version`** would print `1.0.0` forever under remote
  versioning.
- **`Constants.nativeAppVersion`** is deprecated for exactly this module.
