# 0007 — Product scope not yet defined

- **Date:** 2026-08-24
- **Status:** Superseded by [0012](./0012-native-ios-port-of-cronogol.md)
- **Decided by:** —

## Context
The repo is an untouched Expo starter; `index` and `explore` are template content.

**Updated 2026-08-24:** the *product* is now known — this is the native surface of
**AltaGama FC**, the football fixtures/results/news product on `altagamafc.com`
(repo `cronogol`), fed by `senpai-backend`. See
[0009](./0009-backend-is-only-data-gateway.md) and [../ECOSYSTEM.md](../ECOSYSTEM.md).

What remains open is this app's **scope**: which of the web app's surfaces it
carries, and what it does that the web cannot.

## Decision
None yet. Recorded so it is visibly open rather than silently assumed.

## Open questions
- Which features ship in v1? The web app covers fixtures, standings, squads, news
  and editorial, accounts, and `.ics` calendar feeds — a native app need not mirror
  all of them.
- What is the **native-only** justification? Push notifications for kickoffs and
  goals are the obvious one, and the backend currently has **no live-score push**
  (`/cronogol/scores` refreshes every ~4h) — so that would be a backend project too.
- Does the app need accounts on day one? (`/cronogol/me`, claimed feeds, passkeys.)
- Calendar: native subscribe to the existing `.ics` feeds, or a native
  EventKit/Calendar integration?
- Launch platforms — iOS, Android, or both? (The scaffold also builds web, which
  the `cronogol` app already owns; likely drop the web target.)
- Language(s) — Spanish, English, both? Primary market is Spain; the web app has
  an `i18n` layer with per-locale `meta.title` strings.

> **Resolved 2026-08-24** by [0012](./0012-native-ios-port-of-cronogol.md) (purpose),
> [0013](./0013-atomic-design-components.md) (component architecture) and
> [0014](./0014-app-specific-design-language.md) (design). Remaining feature-level
> questions moved to [../SCOPE.md](../SCOPE.md).

## Next step
Replace this entry with a decision (or a `.claude/PRODUCT.md`) once scope is
settled, and mark this one superseded. Reviewing `cronogol/docs/features/` and
`senpai-backend/CRONOGOL.md` is the fastest way to inventory what already exists.
