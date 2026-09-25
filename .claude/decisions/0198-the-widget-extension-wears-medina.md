# 0198 — The widget extensions wear Medina

- **Date:** 2026-09-25
- **Status:** Accepted
- **Decided by:** Ed, via the Medina adoption plan
  ([0193](./0193-medina-digital-becomes-the-design-system.md), phase 6).
- **Follows:** [0194](./0194-numbers-speak-in-saira.md) (the app's numbers in
  Saira). The accent swap already reached `Tokens.swift` in 0193.

## Context

The extensions cannot read `theme.ts`. `targets/_shared/Tokens.swift` is the
hand-kept copy (trap 15). The extensions cannot see the app's `expo-font`
embedding either, because each extension is its own bundle.

The kit ships its own pieces for the Live Activity:

- a Swift theme (`MedinaWidgetTheme.swift`)
- a new module (`modules/live-match`)
- a push-payload document

## Decision

1. **Two role helpers in `Tok`:** `score(size)` (Saira ExtraBold) and
   `clock(size)` (Saira Bold).
   - They mirror `Type.scoreLarge` and `Type.kickoff` / `countdownNum`.
   - `size` is the SF size the call site was tuned at. The helpers step it up
     by `displayStep` (1.15), the low end of 0194's step, because widgets are
     tighter than screens.
   - Both are tabular.
   - Missing font → SF condensed at the tuned size, heavy or bold.
2. **The faces reach the extensions as files, registered at first use.**
   - Both TTFs are copied into `targets/widget/` and
     `targets/notification-content/`. Both are fully file-system-synced
     groups, so the fonts land in each bundle with no prebuild and no project
     edit.
   - `DisplayFace.available` registers them with
     `CTFontManagerRegisterFontsForURL`.
   - There is no `UIAppFonts` entry to keep in step. A missing file degrades
     instead of failing.
   - `_shared/` was not used, because its target membership is an explicit
     list that only a prebuild regenerates.
3. **Call sites.** Only the display numbers switch. Metadata numerals stay on
   `Tok.numerals`, because a 7.5–13pt condensed digit is unreadable.

   | Surface | Switches to Saira | Stays on `Tok.numerals` |
   |---|---|---|
   | Live Activity | score digits (`ScoreDigit`), `ScoreLine`, scorer counts, the live clock, the pre-match kickoff time | the moment minute |
   | Next-fixture widget | countdown | minute badge |
   | Live ledger | score | |
   | Notification long-look card | kickoff, scoreline | |
   | Standings widget | | all columns |
   | Your-week widget | | its ultra-light times, a deliberate thin voice |
   | News widget | | age |

4. **Not adopted from the kit:**
   - **Its `modules/live-match`, its `LiveMatchAttributes`, and its push
     payload** (`homeScore`, `clock` string, `progress`, `connecting`).
     - The app and `senpai-backend` already run a different, shipped
       protocol: iOS 18 broadcast channels plus push-to-start (backend ADRs
       0034–0040).
     - Our `MatchAttributes.ContentState` (`homeGoals`, `awayGoals`, `phase`,
       `minuteLabel`, `clockFrom`…) is that wire format.
     - Switching would be a breaking protocol change for no reader-visible
       gain.
     - **No backend change was made or is needed.**
   - **The static "connecting" orb.** Our model has no connecting state: the
     pre-match card leads with the mark, and a stale activity is the system's
     to grey. It could return if the protocol gains a stale-date flag.

## Consequences

- **Verified with `scripts/activity-harness.swift`** (0135, real
  `MatchActivity.swift`, TTFs beside the binary so the real face was
  measured):
  - Every width from 290 to 420 fits.
  - Live height at 369pt is 159.0pt, unchanged; the cap is 160.
  - **Readability improved.** The worst club-code scale at 296pt went from
    0.61 to 0.80, and at 369pt from 0.74 to 0.92. The condensed digits give
    the abbreviation columns room back.
- **`swiftc -typecheck` is clean** at each target's real floor: widget 17.0,
  notification content and service 16.4.
- **Not seen on a device or home screen yet.** The widget extension needs an
  `xcodebuild` plus `simctl install`, or the next dev-client build. Placed
  widgets and a live Lock Screen card are the eyeball check still owed.
- **Four TTF copies now live in `targets/`** (about 96 KB each). If `theme.ts`
  ever changes face, they change with it.
