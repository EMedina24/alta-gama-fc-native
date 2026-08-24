# alta-gama-fc — Project Overview

**Status:** greenfield *scaffold*, mature *product*. The repo is still an
unmodified `create-expo-app` starter (Expo SDK 57) — no domain screens or data
layer yet — but the product, API, and brand it plugs into already exist and are
settled.

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
  app/                 expo-router routes (file = route)
    _layout.tsx        root layout: ThemeProvider + splash overlay + AppTabs
    index.tsx          Home tab
    explore.tsx        Explore tab
  components/          shared components; *.web.tsx for web-specific variants
    ui/                lower-level UI primitives
  constants/theme.ts   Colors (light/dark), Fonts, Spacing, layout constants
  hooks/               use-color-scheme, use-theme (+ .web variants)
  global.css           web-only CSS custom properties (font vars)
assets/
  images/              app icons, splash, tab icons (@2x/@3x)
  expo.icon/           iOS icon composition source
scripts/reset-project.js   starter-template reset helper (unused going forward)
```

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
