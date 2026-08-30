# 0077 — The welcome carries a language line, and the only skip is the primer's

- **Date:** 2026-08-30
- **Status:** Accepted — not yet run on the simulator
- **Decided by:** Ed Medina

## Context
Two questions came out of the onboarding redesign ([0076](./0076-onboarding-floodlight-redesign.md)).

**Spanish readers.** The app already follows the phone's language
(`store/preferences.ts`, `DEVICE_LOCALE`), and the account sheet holds the
override. The question was whether onboarding needed a language step. It does
not — a step would ask everyone something the OS has already answered — but the
rare mismatch (a Spanish reader on an English phone) had no way to fix it before
the first screen was read. Two treatments were mocked: an `EN | ES` pill top-right,
and one quiet line under the CTA written in the *other* language.

**Skips.** 0076 gave every screen a skip. But a followed club is the precondition
for everything the app does — the calendar, the Today board, every alert — and a
reader who skips the picker lands on an app with nothing in it.

## Decision
- **The welcome carries one line under its button, in the OTHER language**:
  `¿Prefieres español?` on an English phone, `Prefer English?` on a Spanish one
  (`copy.onboarding.switchLanguage`, three parts so the language word alone is
  styled as the link; `GlobeGlyph` beside it). Only the reader it is for can
  read it, so it is invisible to everyone else — which is why it beat the pill:
  a visible control on the quietest screen in the app was the first thing the
  eye hit after the mark. Tapping calls `setLanguage` and the copy swaps in
  place; nothing navigates. The account sheet keeps the full setting.
- **Skip exists only on the alert primer.** The welcome's `Skip for now` and the
  picker's `Not now` are gone, with their copy keys. The primer's `Not now`
  stays because it is what leaves the iOS prompt unspent ([alerts.tsx](../../src/app/onboarding/alerts.tsx)).

## Consequences
- **A reader must follow at least one club to reach the app.** `Continue` is
  disabled at zero picks and is now the picker's only exit. Deliberate: the app
  has nothing to show without one.
- `Replay onboarding` from the account sheet walks the same gate — a reader
  replaying it also has to pick (their existing follows are not pre-selected;
  that is unchanged from 0056).
- The language line is the second consumer of `setLanguage`; both write the
  same preference and the sheet reflects a welcome-screen tap.

## Alternatives considered
- **An `EN | ES` pill, top-right of the welcome.** Findable before reading a
  word, but it is a control on a screen that should carry one; and everyone
  sees it, when only a few need it.
- **A language step.** Asks everyone; the OS already answered.
- **Keeping the picker's skip and landing on an empty Today.** The board's
  follow card would carry the reader back, but a first launch that shows nothing
  is the worst first launch.
