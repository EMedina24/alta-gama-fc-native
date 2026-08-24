# 0012 — Native iOS app, porting `cronogol` functionality, for App Store release

- **Date:** 2026-08-24
- **Status:** Accepted
- **Supersedes:** [0007](./0007-product-scope-tbd.md)
- **Decided by:** Ed Medina

## Context
[0007](./0007-product-scope-tbd.md) left this app's purpose open. It is now settled.

## Decision
This repo is the **native iOS app for AltaGama FC**, built on Expo / React Native
([0001](./0001-expo-sdk-57-managed.md)), with **publication to the Apple App Store**
as the goal.

- **Functionality is ported from `cronogol`**, the Next.js web app on
  `altagamafc.com`. It remains the lead surface and the behavioral reference.
- **Data comes from `senpai-backend`**, unchanged from
  [0009](./0009-backend-is-only-data-gateway.md).
- **Design does not port.** The app gets its own visual language —
  [0014](./0014-app-specific-design-language.md).

## Consequences
- **"Port" means behavior, not markup.** Read `cronogol` for logic, data handling,
  edge cases and empty states; do not carry over CSS, Tailwind classes, DOM
  structure, or Next.js-specific patterns (RSC, `server-only`, route handlers).
- **iOS is the target platform.** Android comes along free with Expo but is not a
  goal; web is out of scope because `cronogol` owns it.
- **App Store work is now real work**: Apple Developer account, bundle ID, EAS
  Build, privacy nutrition labels, and — if accounts ship — an in-app account
  deletion path, which Apple requires.
- Feature-by-feature scope for v1 is still open; see [../SCOPE.md](../SCOPE.md).
- A ported feature must reproduce the API caveats the web app already handles
  (`lastSyncedAt === null`, non-chronological jornadas, exclusive-vs-inclusive `to`,
  the ~4h scores job, the ~3h standings lag). Re-deriving these from scratch is how
  the port ships convincing-looking bugs.

## Alternatives considered
- **A WebView wrapper around `altagamafc.com`** — near-zero effort, but Apple
  rejects thin web wrappers under App Store Review Guideline 4.2, and it forfeits
  the native capabilities (push, calendar, offline) that justify the app at all.
