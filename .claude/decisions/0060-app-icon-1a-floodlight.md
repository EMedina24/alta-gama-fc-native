# 0060 — App icon 1a "Floodlight": graphite field, lime glow, same geometry as 1b

- **Date:** 2026-08-28
- **Status:** Accepted — not yet on a device
- **Decided by:** Ed Medina
- **Supersedes:** [0041](./0041-app-icon-1b-and-a-splash-of-its-own.md) — for the **icon bytes only**. 0041's splash arrangement (`splash-lockup.png`, `imageWidth: 300`, `preventAutoHideAsync` through hydration) stands unchanged.

## Context
[0041](./0041-app-icon-1b-and-a-splash-of-its-own.md) shipped icon set **1b**: a
lime `#c8f25a` field with a dark mark on the light variant, mow stripes on all
three. The design pipeline delivered the sibling direction, **1a "Floodlight"**,
at `icon-handoff/AppIcon-1a-floodlight/`: a graphite field with a lime glow
falling from above the top edge and the mark in lime on every appearance.

| Variant | Field | Mark | Glow |
| --- | --- | --- | --- |
| light | `#0f1216` | `#c8f25a` | lime, 20% |
| dark | `#0a0b0c` | `#c8f25a` | lime, 24% |
| tinted | `#0b0b0b` | `#f2f2f2` | white, 14% |

The mark is the **same geometry as 1b** — 42×30 unit box, 2.2u stroke, goal
boxes flush to the touchline, as `logos/mark-accent.svg` — so the two directions
are interchangeable without redrawing anything downstream.

## Decision
**The icon is 1a's three masters, copied over the paths `app.json` already
names.** `app.json`'s `ios.icon` block does not change; only the bytes behind
`assets/images/icon-{light,dark,tinted}.png` do. The source is
`icon-handoff/AppIcon-1a-floodlight/expo/`.

Verified before copying (HANDOFF trap 22): all three masters are 1024×1024 and
**fully opaque — minimum alpha 255 across every pixel** — so `withIosIcons`'s
white flatten remains a no-op and the tinted tile keeps its mark. The tinted
variant is greyscale only, as iOS 18's luminance-to-tint mapping requires.

The handoff folder was moved from the repo root (`handoff_new-app-icons/`) to
`icon-handoff/AppIcon-1a-floodlight/`, alongside `AppIcon-1b/`, as design source.
Nothing in a build reads it (trap 23).

## Consequences
- **The light variant is now dark.** 1b's Home Screen signal was a lime tile;
  1a's is a lime mark on graphite, with the glow doing the separating. Light and
  dark differ only in field depth (`#0f1216` → `#0a0b0c`) and glow strength.
- **Nothing else re-cuts.** Same mark geometry means the splash lockup and the
  widget's `targets/widget/Mark.swift` are untouched — 0041's "changing the mark
  means re-cutting both" did not trigger.
- **The 1a README's wire-up note is stale on one point** — it says
  `icon-dark.png` is also the splash image at `imageWidth` 184. That was 0036's
  arrangement; 0041 replaced it. Do not act on it.
- Android keeps the old adaptive icon and monochrome mark
  ([0016](./0016-ios-only-v1.md)); the 1a README offers to regenerate it from
  this geometry when it matters.
- The icon is native (trap 31): it reaches a device only through
  `expo prebuild --clean` and a **new native build**.

## Alternatives considered
- **Keep 1b** — the lime tile is louder on a Home Screen, but it is the only
  lime-field surface in an app whose ground is `#0a0b0c`; 1a puts the icon on
  the app's own ground.
- **Ship 1a as the dark variant only, 1b as light** — mixes two directions into
  one icon; the appearance variants are meant to be one identity at three
  depths, not a switch between designs.
