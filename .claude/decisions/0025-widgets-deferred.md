# 0025 — Widgets deferred; no native targets in the tree yet

- **Date:** 2026-08-25
- **Status:** **Superseded by [0047](./0047-widgets.md)** — the work below was done, 2026-08-27
- **Decided by:** Ed Medina

> **Update, 2026-08-27:** superseded by [0047](./0047-widgets.md), which built them.
> **Every one of the six pick-up steps below was followed**, and the two ⚠ rules —
> Swift outside `ios/`, and no network in a timeline provider — held. Nothing here
> is rewritten: this is the record of what was planned, and it is what happened.
> The one addition 0047 makes is that the widgets are also CONFIGURABLE and reach
> the Lock Screen, neither of which this ADR anticipated.
>
> **Update, 2026-08-25:** [0037](./0037-rich-notifications-server-composed-crests.md)
> installed `@bacons/apple-targets` and added two notification targets under
> `targets/`, so steps 1 and 2 below are done and the App Group has a real
> consumer. **The widgets themselves are still open** — nothing here is
> superseded.

## Context
[0024](./0024-push-enabled.md) chose "widgets: both sizes, full build" and put
push first. Push is now landed and verified on a simulator build. Widgets are the
next item and were explicitly paused rather than started.

## Decision
**No native target is added yet.** `targets/` does not exist, no
`@bacons/apple-targets`, and `WIDGETS_AVAILABLE` stays `false` in
[capability.ts](../../src/features/push/capability.ts).

The App Group `group.com.altagamafc.app` **is** already declared in `app.json`
under `ios.entitlements` and registered in the Apple portal, so the plumbing the
widget needs is in place and waiting.

## Consequences
- ⚠ The Guideline **4.2** argument is weaker until they land. This app ports a
  website, and widgets plus native tabs plus local reminders are the case that it
  is not a wrapper. Worth doing before submission, not after a rejection.
- `reloadWidgets()` is a no-op, so nothing calls into a target that isn't there.
- Nothing else in the app knows widgets are missing — the seam holds.

## When picked up

1. `npx create-target widget` (installs `@bacons/apple-targets`, scaffolds
   `targets/`). ⚠ Requires **Xcode 16 / macOS 15**.
2. ⚠ **Swift lives in `targets/`, outside `ios/`.** Never `expo prebuild` and
   commit `ios/` — that forfeits CNG permanently and makes every SDK bump a
   manual merge.
3. Write `features/widgets/snapshot.ts`: next fixture per followed club into the
   App Group container, then `reloadWidgets()`.
4. ⚠ **Pre-download crests into the App Group.** A widget extension has a hard
   memory budget and unreliable network — never `AsyncImage` a remote crest in a
   timeline provider.
5. ⚠ Timeline policy: `.after(nextKickoff)` plus midnight. **Never per-minute.**
6. Flip `WIDGETS_AVAILABLE` and implement `reloadWidgets()`.

Sizes and content are specified in `handoff_AG-ios/SPEC.md` §4 and rendered in
`screenshots/16-live-activity-widgets.png`.

⚠ **Live Activity is a separate decision and stays deferred** — see
[0024](./0024-push-enabled.md). Do not build it alongside the widgets on the
assumption they are the same job; SPEC §4's version needs backend work that does
not exist.
