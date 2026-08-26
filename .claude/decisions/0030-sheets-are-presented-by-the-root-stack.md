# 0030 — The sheets are presented by the ROOT stack, not a `(sheets)` layout

- **Date:** 2026-08-25
- **Revises:** [0020](./0020-root-stack-wrapping-tabs.md)
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
[0020](./0020-root-stack-wrapping-tabs.md) put the four modal sheets in a
`(sheets)/` group with its own `_layout.tsx` carrying
`presentation: 'formSheet'`. That reads correctly and does nothing.

`presentation` is a property of how a screen is **pushed**, so it is honoured by
the navigator that pushes it. A group with a `_layout.tsx` is a nested stack: the
root stack pushes the *group*, and the group's first route is that nested stack's
**root**, which no navigator presents modally. So every sheet opened straight
from a tab rendered as a full-screen card — no grabber, no swipe-to-dismiss, and
with `headerShown: false` no header either. The account sheet's first line of
text sat under the status-bar clock and there was no way back out of the screen
at all. Shipped, and caught from a screenshot.

## Decision
`(sheets)/_layout.tsx` is **deleted**. With no layout in the group, its four
routes belong to the root stack, and the root stack declares each one with the
sheet options:

```tsx
const sheet: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.6],
  contentStyle: { backgroundColor: Colors.dark.card },
};

<Stack.Screen name="(sheets)/account" options={{ ...sheet, sheetAllowedDetents: [1] }} />
<Stack.Screen name="(sheets)/alerts" options={sheet} />
<Stack.Screen name="(sheets)/calendar" options={sheet} />
<Stack.Screen name="(sheets)/calendar-jornada" options={sheet} />
```

The account sheet also gets a header row — `Cuenta` and a `Cerrar` button —
outside its `ScrollView`.

## Consequences
- Detents are now **per sheet** instead of one setting for the group: account is
  a settings page and opens full (`[1]`); the three confirm/feed sheets open at
  `[0.6]`, which is the height their content wants.
- Route names in the root stack carry the group segment
  (`(sheets)/account`). The `href`s already used at the call sites are unchanged.
- The `(sheets)/` folder still exists and still means "modal" to a reader; it
  just no longer implies a navigator.
- Adding a fifth sheet means adding a `Stack.Screen` line. A sheet route with no
  line renders as a full-screen card again — the same bug. The comment in
  `_layout.tsx` says so.
- The account sheet's `Close` is a real control, not a fallback: the sheet is
  long, and the swipe-down gesture is invisible affordance. It also keeps the
  identity heading clear of the grabber.
- Layout inside a sheet is not layout inside a screen: a `formSheet` is laid out
  at its content's height, so `flex: 1` collapses. The account bar is pinned with
  `stickyHeaderIndices` instead, and is two views deep because React Native moves
  a sticky child's style onto the wrapper it generates. Both are commented at the
  component.

## Alternatives considered
- **Keep the nested layout and declare the group screen once** with sheet options
  in the root — works, but forces one detent set on four sheets of very different
  heights, and leaves the misleading `presentation` in the nested layout for the
  next reader to trip over.
- **Add `paddingTop: insets.top` to the sheets** — treats the symptom. The
  screens were not sheets at all; they were also unswipable and header-less.
