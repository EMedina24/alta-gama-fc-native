# 0110 — Deep links anchor on the tab shell

- **Date:** 2026-09-04
- **Status:** Accepted — verified on the simulator; device pass on the next build
- **Decided by:** Ed Medina — reported the stranding off a device widget tap
  ("when you click on a widget and the app opens, navigation does not work")

## Context

Every in-app URL the widget targets carry is `altagamafc://club/{slug}` —
YOUR WEEK's hero and rail `Link`s, NEXT's `widgetURL`, the Live Activity
(`targets/widget/Views.swift`'s `W.url`). Tapping one with the app **not
running** is not the notification path: `features/push/routing.ts` only ever
sees notification taps, lands on `(tabs)` and `router.push`es, which is why
that path always had a back stack. A raw URL on a cold launch is resolved by
**expo-router itself** — `getStateFromPath` builds the entire navigation state
from the path alone.

Built from the path alone, that state was `[club/[slug]]` — one route. The
club page sits outside `(tabs)/` so it pushes over the tab bar (0020), and
since 0091 it has no native header — its hero draws its own back pill wired to
`router.back()`. With nothing beneath it: no tab bar, a back pill that
no-ops, a swipe-back gesture with nowhere to go. The reader's only move was
force-quitting the app. Warm taps never showed it — a running app treats the
URL as an event and pushes onto the existing stack.

## Decision

The root layout exports the router's own knob for exactly this:

```tsx
export const unstable_settings = {
  anchor: '(tabs)',
};
```

`anchor` (SDK 57 reads `anchor` first, then the older `initialRouteName` —
`getRoutesCore.js` takes either) becomes the root stack's `initialRouteName`
in the linking config, and the `getStateFromPath` fork inserts that route
beneath any deep-linked target. A cold widget tap now builds
`[(tabs), club/[slug]]`: tab shell beneath, back pill pops to it, swipe-back
works. It is not club-specific — any future deep link into `news` or a sheet
gets the same floor.

- **Normal launches are unchanged** — `(tabs)` was already the initial route;
  the anchor only matters when a URL builds the state.
- **Warm links are unchanged** — they push, as before.
- **The notification path is unchanged** — `routing.ts` still pushes off
  `(tabs)`; two code paths, now one landing shape.

## Verification

Cold launches via `simctl openurl` after `simctl terminate`, with a temporary
`console.error` on the club page dumping `router.canGoBack()` and the root
stack (read back through `simctl log show` — taps cannot be scripted here):
three launches logged `canGoBack=true stackIndex=1
stack=(tabs),club/[slug]/index`, and a live tap in Ed's own dev session
(`club/real-madrid`) logged the same stack. ⚠ The **first** post-fix cold
launch through the dev launcher logged `canGoBack=false` and never reproduced
— a dev-client cold launch goes through the launcher's own cache, so which
bundle ran is unprovable; a release build has no launcher in the path. The
remaining check is a widget tap on a real build.

⚠ JS-only, but this app ships no EAS Update — the fix reaches a phone with
the **next build**, like everything else.
