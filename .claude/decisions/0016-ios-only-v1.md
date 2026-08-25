# 0016 — Web target dropped; iOS-only v1

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
The Expo starter builds iOS, Android and web. [0012](./0012-native-ios-port-of-cronogol.md)
names iOS as the target and the App Store as the goal; `cronogol` already owns the
web surface at `altagamafc.com`. The handoff design is a phone design —
`MaxContentWidth` is 520 and every control is a platform control.

## Decision
**iOS is the only supported target for v1.** The `web` block is removed from
`app.json`, the `web` npm script is gone, and every `*.web.tsx` split is deleted.
`supportsTablet: false` — the design is phone-only.

Android is not actively supported but is not sabotaged: Expo builds it for free and
nothing here is deliberately iOS-exclusive beyond SF Symbols, which `NativeTabs`
already accepts alongside an Android `drawable`/`md` fallback.

`react-native-web` and `react-dom` stay in `package.json` — harmless, and removing
them fights the Expo dependency graph for no gain. `expo start --web` no longer
working is the intended outcome, not a regression.

## Consequences
- The `.web.tsx` platform-split convention in [CONVENTIONS.md](../CONVENTIONS.md)
  is dormant. It is not wrong, just unused.
- Tab icons are **SF Symbols** via `NativeTabs.Trigger.Icon sf=…`, not PNG assets.
  This deletes the ADR 0005 consequence that "every new tab needs an icon asset at
  @1x/@2x/@3x" — `assets/images/tabIcons/` is removed.
- `expo-font` remains installed **only** as the required native peer of
  `expo-symbols` (`expo-doctor` fails without it). No app code loads a font.
- If web is ever wanted it is `cronogol`'s job, not this repo's.

## Alternatives considered
- **Keep the web target alive** — it doubles the component surface (`.web.tsx`
  splits) to serve a platform another repo already serves better.
