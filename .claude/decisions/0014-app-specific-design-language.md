# 0014 — App-specific design language (in progress — do not port the web look)

- **Date:** 2026-08-24
- **Status:** Accepted — the design landed 2026-08-24; see [0015](./0015-handoff-design-system-adopted.md)
- **Decided by:** Ed Medina

## Context
The app ports `cronogol`'s functionality ([0012](./0012-native-ios-port-of-cronogol.md)).
It does **not** port its appearance. A new, app-specific design is being worked on
and is not finished.

## Decision
The native app gets its **own design language**, distinct from the web app's.
Functionality is inherited; appearance is not.

**Until the design lands:**

- **Do not copy the web app's visual styling** — colors, type scale, spacing,
  shadows, component chrome. Reading `cronogol` for *behavior* is encouraged
  ([0012](./0012-native-ios-port-of-cronogol.md)); reading it for *looks* is not.
- **Do not harden a placeholder into a system.** Build with the existing tokens in
  [src/constants/theme.ts](../../src/constants/theme.ts)
  ([0006](./0006-theme-constants-module.md)), which are the Expo starter's defaults
  and are **provisional**.
- **Keep style at the edges.** Every color, space and font value comes from the
  theme module — never a literal in a component. Concentrate visual decisions in
  `atoms/` ([0013](./0013-atomic-design-components.md)) so the real design can be
  absorbed by changing tokens and atoms rather than every screen.
- **Flag, don't invent.** Where a screen needs a visual decision the design has not
  made, make the plainest choice that works and note it — do not quietly establish a
  pattern the design will have to undo.

## Consequences
- Some rework when the design lands is expected and accepted. The rules above are
  what keep it bounded to the token layer and the atoms.
- Screens built now should be judged on behavior and data correctness, not looks.
- The brand rules are **not** part of this openness — **AltaGama FC** (no space),
  the retired spelling, and the separate `Alta Gama Fixture Club` mark are already
  settled and bind here ([../ECOSYSTEM.md](../ECOSYSTEM.md)).
- Open once the design exists: whether the token module survives as-is, whether a
  styling library is warranted (revisiting [0006](./0006-theme-constants-module.md)),
  light/dark handling, and typography — the starter uses system fonts, and a brand
  face would need `expo-font` and licensing.

## Alternatives considered
- **Port the web design** — fastest path, but web layout idiom reads as a wrapped
  website on iOS, which is both a product weakness and an App Store Review 4.2 risk
  ([0012](./0012-native-ios-port-of-cronogol.md)).
- **Wait for the design before building** — leaves the port blocked; the data and
  behavior work is well-defined and can proceed under the constraints above.
