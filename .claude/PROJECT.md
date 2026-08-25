# alta-gama-fc — Project Overview

**Status:** Phase 1 (foundation) and Phase 2 (read-only screens) complete. The
starter is gone; the design system, the ported data layer and all five screens —
Today, Matchdays, Table, Clubs and the club page — run against production data on
an iOS simulator. Follows are device-local and inert; push, calendar and
onboarding are Phase 3–4.

**What it is:** the native (iOS/Android) surface of **AltaGama FC** — the football
fixtures/results/news product already shipping on the web as
[altagamafc.com](https://altagamafc.com) (repo `cronogol`) and served by the
`senpai-backend` API. **Read [ECOSYSTEM.md](./ECOSYSTEM.md) before writing any
data, naming, or URL code.**

**Goal:** publication on the **Apple App Store**. Functionality is ported from
`cronogol`; the **design is new and app-specific**. Full scope in
[SCOPE.md](./SCOPE.md).

## Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | Expo (managed) | `~57.0.16` |
| Runtime | React Native | `0.86.2` |
| UI runtime | React | `19.2.3` |
| Routing | `expo-router` (file-based) | `~57.0.16` |
| Language | TypeScript, `strict: true` | `~6.0.3` |
| Animation | `react-native-reanimated` + `react-native-worklets` | `4.5.1` / `0.10.1` |
| Web target | `react-native-web`, static output | `~0.21.0` |

Expo modules in use: `@expo/ui`, `expo-constants`, `expo-device`, `expo-font`,
`expo-glass-effect`, `expo-image`, `expo-linking`, `expo-splash-screen`,
`expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`.

> **Read the versioned docs.** Expo 57 changed significantly. Consult
> https://docs.expo.dev/versions/v57.0.0/ before writing code — see [AGENTS.md](../AGENTS.md).

## Layout

```
src/
  app/                          routes only — no logic
    _layout.tsx                 Stack + QueryClientProvider + preference hydration
    (tabs)/_layout.tsx          NativeTabs — Today · Matchdays · Table · Clubs
    (tabs)/{index,matchdays,table,clubs}.tsx
    club/[slug].tsx             pushes over the tab bar
    _debug/                     dev-only gate + molecule gallery (__DEV__ guarded)
  components/
    atoms/ (12)  molecules/ (11)  organisms/  templates/     ADR 0013
  constants/theme.ts            design tokens — the handoff file (ADR 0015)
  lib/cronogol/                 the ported data layer, path-mirrored (ADR 0018)
  lib/{format,timezones}.ts  lib/i18n/{phrases,copy,use-i18n}
  queries/                      React Query hooks + staleTime buckets (ADR 0017)
  store/preferences.ts          device follows, language, clock, timezone
assets/images/                  app icon, splash, adaptive icon
handoff_AG-ios/                 the design handoff (SPEC, prototype, screenshots)
```

Tab icons are **SF Symbols**, not assets (ADR 0016).

Path aliases (`tsconfig.json`): `@/*` → `./src/*`, `@/assets/*` → `./assets/*`.

## App config highlights (`app.json`)

- `scheme: altagamafc` — deep-link scheme.
- `userInterfaceStyle: automatic` — follows system light/dark.
- `experiments.typedRoutes: true` — route names are type-checked.
- `experiments.reactCompiler: true` — React Compiler enabled.
- Splash: `#208AEF` background, 76pt icon.
- Web: `output: "static"`.

## Commands

```bash
npm install
npm start          # expo start
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web
npm run lint       # expo lint
```

No test runner is configured yet. There is no `tsc` script; type-check with
`npx tsc --noEmit`.

The backend runs locally on **port 3001** (`crono-gol.com` in production). See
[ECOSYSTEM.md](./ECOSYSTEM.md).
