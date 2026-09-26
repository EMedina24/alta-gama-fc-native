# 0212 — Starting XI becomes the fifth tab

- **Date:** 2026-09-26
- **Status:** Accepted
  - Verified on the iOS 26.5 simulator (iPhone 17 Pro, live data, Spanish):
    - five tabs with the glass rail intact;
    - `MI ONCE` fits beside `CLASIFICACIÓN` at 402pt;
    - a cold deep link to `/starting-xi` restores a migrated v1 XI (Barcelona);
    - `/club/real-betis/starting-xi` shows a back circle and no switcher caret;
    - the club sheet lists the offered clubs only.
  - NOT verified: taps (the simulator ran headless), and the 375pt class.
- **Decided by:** Ed. He asked for the builder "from the main navigation, not
  just the club page" and picked a fifth tab over a Board card or a crown
  button.
- **Supersedes, in part:**
  - [0064](./0064-news-card-and-screen.md)'s "without a fifth tab (ADR 0005
    holds)" clause;
  - [0065](./0065-starting-xi-builder.md) §13 ("a switch would throw the XI
    away").
- **Amends:** [0005](./0005-native-tabs.md) (five tabs) and 0065 §1 (the entry
  point).

## Context

The builder was reachable only from a club page's Squad segment. The web app
puts it in its header nav ("My XI" / "Mi once"), and the mobile handoff
(`handoff_lineup/`) opens it on a club switcher.

## Decision

- **`(tabs)/starting-xi.tsx`** is the tab, at the web's own path `/starting-xi`.
  - Its label is `copy.tabs.startingXi`: "My XI" / "Mi once", the web nav's
    words.
  - Its icon is SF `sportscourt` / `sportscourt.fill`.
  - Five is the most an iPhone tab bar shows before iOS adds "More", so a sixth
    destination needs another home.
- **Two routes, one screen.**
  - `club/[slug]/starting-xi.tsx` stays and fixes the club from the route: a
    back circle instead of the switcher, because that builder belongs to its
    page.
  - Both routes are ~20-line shells over `features/starting-xi/use-xi-screen.ts`
    (data and actions) and `templates/starting-xi-screen.tsx` (layout), per
    ADR 0013.
- **The tab resolves its club and never writes one.** `resolveXiClub` picks, in
  order:
  1. `?club=`, consumed and cleared as the Table tab consumes `?league=`
     (ADR 0185);
  2. the store's `lastClub`;
  3. the favourite (the first consumer of [0209](./0209-a-favourite-club.md));
  4. the first followed club that is OFFERED;
  5. otherwise, the "Pick a club" empty state.
  - `lastClub` is written only by the reader's own acts: a club-sheet pick, a
    push from a club page's Squad row (committed before the push), or any edit.
- **Offered means "in the published table of a league with `squads`".**
  - `League.squads` is new: true for LaLiga, the Premier League, Puerto Rico
    and Honduras; false for Serie A and the Bundesliga. It is ported from the
    web, which lacks the last two leagues.
  - The table is what drops LaLiga's five tracked segunda clubs.
  - The directory is built from two app-wide cache reads (standings, catalogue)
    and costs no request of its own.
- **The club switcher** (`(sheets)/xi-club`) keeps every club's XI. Nothing is
  cleared on a switch. The handoff's switcher wiped the pitch; the web's does
  not.
- **Predicted XI is not built.** There is no public route: the backend's
  §114 `ig-xi` predictions are admin-only (`DashboardGuard`, RLS closed), and
  the handoff's stand-in seated the lowest shirt numbers. That would be a
  made-up XI on a real club's crest.
  - The seam: a glass `My XI | Predicted XI` track would sit in front of the
    formation chip, as `flex: 1`.

## Consequences

- The first-followed-club fallback is an index-zero pick, which trap 66 warns
  about and which 0209 refused for the favourite. It stands here because it is
  resolved on every render and never stored, and the club button beside it can
  always change it. It names where the tab opens, not whose club this is.
- A fifth label narrows every tab's slot. `CLASIFICACIÓN` is the longest and
  fits at 402pt; 375pt is unmeasured.

## Alternatives considered

- **A Board card.** Reachable from Today only, and hideable. Ed wanted it in
  the navigation.
- **A crown button on every tab.** A second control in every crown, beside the
  avatar.
- **Opening the tab on a default league's first club** (the web's redirect).
  That is an editorial pick of a club the reader may not care about.
