# 0191 — Crests in match lists open the club

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decided by:** Ed, from a Matchdays screenshot: *"anyway we can make it so a
  user taping a club crest takes them to that clubs page"*.
  - He chose the scope **"All match lists"**: the Matchdays `FixtureList` and
    Home's `FinishedToday`, where every side carries a real `TeamRef.slug`.
- **Extends:** [0154](./0154-open-club-link-is-gated-on-the-catalogue.md). Its
  gate moves into a shared hook and gains two more callers.

## Decision

1. **Only the CREST links, not the name.**
   - A finished row is already a `Pressable` that expands its timeline (0045).
     A whole-line link would leave almost nothing to expand with.
   - `ClubLine` takes `onCrestPress` and `crestLabel`, and wraps the crest in a
     `Pressable` with:
     - `hitSlop = (minTouch − size) / 2`, which turns a 26pt crest into a 44pt
       target;
     - `accessibilityRole="link"`;
     - pressed state as scale 0.9, not an opacity fade: a faded crest on a
       dimmed losing line disappears.
   - The nested `Pressable` wins the touch. Everywhere else on the row still
     expands.
2. **Links are gated on `useCanOpenClub()`**, the 0154 rule lifted out of
   `table.tsx` into `queries/use-teams.ts`.
   - A club outside the catalogue, or without a complete schedule (trap 1, half
     the Champions League field), gets an **inert crest**, never a dead link.
   - Loading and error both answer false.
   - The `''` team-window sentinel is in no catalogue, so it is rejected too.
3. **Organisms take `onOpenClub`, `canOpenClub` and `openClubLabel`**, the same
   pair as `StandingsTable`. The screen owns navigation, using the typed object
   form `router.push({ pathname: '/club/[slug]', params: { slug } })`.
4. **VoiceOver gets custom rotor actions.**
   - An expandable row is ONE accessible stop, so its nested crests can't be
     focused.
   - `clubLinkA11y()` (`organisms/club-link-a11y.ts`) adds an "Open {club}"
     action for each side that passes the gate.
   - New copy: `clubLink.open`, "Abrir {club}" and "Open {club}".

## Out of scope

These surfaces can't link, because their opponent has no slug.
`FixtureView.opponent` is a name, and team-window opponents are `''` (0137).
Linking them needs the API to name the opponent's slug.

- The board's NEXT UP card, LAST RESULT card and live plate.
- The club page's season spine and next card.
- The match-stats sheet (0190).

## Verification

- `tsc` is clean, and lint is clean on the touched files. The one `react-hooks/purity`
  error in `matchdays.tsx` was already present at HEAD.
- In the simulator (Premier League), with calibrated CGEvent taps:
  - Matchday 6: Leeds' crest on an upcoming row opened Leeds United.
  - Matchday 5 (Ed's screen): Chelsea's crest on the FINISHED Brentford 3-0
    Chelsea row opened Chelsea.
  - The same row's name area still expanded the timeline.
- Not hand-checked: FINISHED TODAY (no finished match today), an untracked
  Champions League crest staying inert (the shared gate is the Table's,
  unchanged), and the VoiceOver rotor.
