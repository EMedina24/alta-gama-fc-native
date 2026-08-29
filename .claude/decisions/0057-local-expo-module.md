# 0057 — A local Expo module is how Swift gets into the APP target

- **Date:** 2026-08-28
- **Status:** Accepted
- **Builds on:** [0025](./0025-no-committed-ios-directory.md),
  [0047](./0047-widgets.md), [0055](./0055-live-activities-broadcast-channels.md)

## Context

Every line of Swift in this repo lives in `targets/` and is built by
`@bacons/apple-targets` into an **extension**: the notification service, the
notification content card, the widgets. That was enough for three features.

[0055](./0055-live-activities-broadcast-channels.md) is the first that is not.
`Activity<MatchAttributes>.pushToStartTokenUpdates` must run in the **app**
process — an extension cannot see it — and the plugin has no way to put code
there. Before this decision the repo had no `modules/` directory and no seam for
app-target native code at all.

## Decision

**A local Expo module at `modules/live-activity/`.** Autolinked from `./modules`,
which is `expo-modules-autolinking`'s default `nativeModulesDir`, so nothing in
`package.json` points at it and nothing needs to.

### ⚠ This does not violate 0025

0025 forbids committing a **prebuilt** `ios/`, because that forfeits CNG
permanently. A local module is an **input** to prebuild, exactly like `targets/`
— `npx expo prebuild` regenerates around it and `ios/` stays gitignored.

### ⚠ Not a community package

`expo-live-activity` and friends exist. The module needed here is ~40 lines and
does one thing: report a token. This repo hand-rolled its own APNs client rather
than take `node-apn`, for the same reason — a dependency whose surface is ten
times the problem is a liability, not a saving.

### ⚠⚠ The podspec reaches OUT of the pod, on purpose

`MatchAttributes` must be the **same type** in the process that reads the
push-to-start token and the process that draws the card. `targets/_shared/` is
linked into every TARGET (0047 verified this) but not into the app, so the
podspec's `source_files` names `../../../targets/_shared/MatchAttributes.swift`
alongside its own.

⚠ **If CocoaPods ever refuses that escape, the fallback is a copy in the module —
and that copy is a FOURTH source of truth and must come back here as a new
decision, not be added quietly.** Trap 15 already tracks `Tokens.swift` and the
`.lproj` files; this would be the third instance of the same failure.

### A `@/modules/*` path alias

`tsconfig.json` gains `"@/modules/*": ["./modules/*"]`, alongside the existing
`@/assets/*`. It follows that precedent exactly — a more specific pattern beside
`@/*` → `./src/*` — and beats a `../../../` relative import from
`features/push/capability.ts`.

### ⚠ The seam stays one file

`capability.ts` is the only importer, per [0023](./0023-apple-developer-account-is-the-seam.md).
`liveActivitiesAvailable()` is a **function**, not a constant like
`PUSH_AVAILABLE` and `WIDGETS_AVAILABLE`: both its gates are runtime — iOS 18,
and the reader's per-app Live Activities setting, which they can switch off at
any time — so a constant read once at import would go stale.

## Consequences

- ⚠ **A new build input.** `expo prebuild` now has three sources of native code:
  `app.json`'s plugins, `targets/`, and `modules/`. A prebuild that silently
  skips the third produces an app that compiles, runs, and never reports a token.
- ⚠ **The first real Swift typecheck is `expo prebuild`.** `swiftc -parse` proves
  syntax only; the module context needs the generated project, and the first full
  compile is an EAS build (the same limitation ADR 0025 already imposes).
- ⚠ The module is **iOS-only** (`"platforms": ["apple"]`). An Android build must
  not reach it — `capability.ts` catches the missing-module throw and answers
  `false`, which is also what Expo Go gets.
