# 0192 — The Today board looks 21 days ahead

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decided by:** Ed, after the UPCOMING card vanished during the
  September–October international break: *"I'd be nice to see the matches
  coming up after the international break."*
  - He chose **both** NEXT UP and the upcoming list, over the list alone.
- **Amends:** [0132](./0132-team-windows-feed-the-today-board.md), whose
  `upcomingMine` slice kept NEXT UP at seven days as "a separate decision nobody
  has made". This is that decision.

## Context

The board's upcoming band was `useUpcoming`, seven days from `now`. During the
Sep 21 – Oct 6 2026 FIFA window only Segunda plays; every other tracked league
resumes Oct 9–12. A reader following, say, a LaLiga club had nothing inside
seven days, so the UPCOMING card hid itself (`mine.length > 0`) and NEXT UP had
nothing to lead with. The board looked broken for two weeks.

## Decision

1. **The board reads `useWidgetWindow` (21 days) instead of `useUpcoming`.**
   - `PushSync` already mounts that query, so the board's read is a cache hit:
     no new request on launch.
   - The team windows already reach +21 days (`TEAM_WINDOW_AHEAD_DAYS =
     WIDGET_WINDOW_DAYS`); `upcomingMine` now slices them to
     `BOARD_AHEAD_DAYS` (= `WIDGET_WINDOW_DAYS`) instead of `UPCOMING_DAYS`.
     The slice's other job, 0132's past-TBD guard, is unchanged.
2. **NEXT UP moves with it.** Its countdown already renders days
   (`15d 04h`), and the same-day deck (0113) groups by the soonest day
   whatever the horizon.
3. **The list keeps its cap of six.** In a normal week the soonest six still
   lead; a reader following one club now sees up to three weeks of their
   fixtures instead of one.
4. **Reminders stay on seven days.** `use-push-sync` keeps `useUpcoming` and
   `UPCOMING_DAYS`. Widening them would spend the 60-notification budget further
   out, which is a different decision.

## Consequences

- The widget window also starts at `now`, so 0052/0078's rule holds unchanged:
  it is **never refetched at kickoff**. Pull-to-refresh refetches it, as it did
  `upcoming`.
- The 21-day number is shared by widget, team windows and board. Raising it
  must respect the route's hard 31-day cap (`fixtureWindowMaxDays`).
