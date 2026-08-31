# 0082 — The Clubs screen is redesigned: a subscribed RAIL of crest bubbles, league chips, and one browse tray

- **Date:** 2026-08-31
- **Status:** Accepted — harness-proven (68 assertions), verified on the simulator (`/clubs` on live data, `/_debug/gallery?only=clubs` and `?only=club-rows`)
- **Decided by:** Ed Medina, from a delivered design pack (`handoff_clubs-page/`)
- **Amends:** [0032](./0032-clubs-browse-by-league.md) (presentation only) · [0040](./0040-kickoff-reminder-lead-times.md) is untouched
- **Narrows:** [0015](./0015-handoff-design-system-adopted.md) · [0081](./0081-account-sheet-redesign.md)

## Context

The Clubs tab was the last screen still drawing the follow list as a **second
vertical list** — the same `ClubBrowser` rows again, with an unfollow `Switch`
in each. That spent ~68pt of height per club to say what a crest says in 88, and
pushed Browse below the fold on an iPhone SE.

`handoff_clubs-page/` is the design that replaces it. It is a design and not a
spec, and three of its factual claims were **stale against production** when this
was built (probed 2026-08-31, `GET /cronogol/{leagues,teams,standings}`):

| The pack claims | Production |
| --- | --- |
| The table route exists for LaLiga alone | Complete tables for **all four leagues** plus segunda; every one passes `bandsApply` |
| Serie A has no mark | Serie A serves a `primary` **SVG**, portrait ~0.64:1. LaLiga also serves a **`wordmark`**, which nothing read |
| Rows carry a city | `venue.city` on the Premier League and Serie A; null on all 20 LaLiga; Bundesliga carries **no `venue` at all** |
| Club colour from a bundled map | `colorPrimary` on all 20 LaLiga and all 18 Bundesliga, **null on all 20 PL and all 20 Serie A** |

## Decision

1. **The follow list becomes a RAIL.** `organisms/club-rail.tsx` over a new
   `molecules/club-bubble.tsx`: an 88pt disc, the club's colour as a hairline
   ring and a radial core lit from the top, the crest floating on it, a lime
   check at the shoulder and the league position at the foot. Ordered by the
   follow list, not alphabetically.
2. **⚠⚠ The bubble has exactly ONE action: open the club.** The check is an
   indicator with `pointerEvents: 'none'`. **Unfollow leaves this screen
   entirely** — it lives on the club page behind `Match alerts`, which already
   confirms. An unfollow target inside an 88pt disc lands within a thumb's width
   of the open-club tap, and unfollowing drops a season of calendar entries.
3. **The rank badge draws for every league whose table passes `bandsApply`**,
   inked by `zoneFor(rank, league)` through the now-exported `BAND_COLOR`. The
   pack's LaLiga-only rule is rejected because its stated reason is false, and
   its `pos<=4 / <=6 / =7 / >=18` band table is rejected because `League.zones`
   exists precisely to replace that placeholder.
   ⚠ **A table with no `League` config is skipped**, which is what keeps
   `segunda` out: five of LaLiga's tracked clubs sit in that table, and the
   bubble carries no league label, so an unbadged `#7` would read as a LaLiga
   position.
4. **Club colour comes from `lib/cronogol/club-wash.ts`**, extended rather than
   duplicated: `clubTint` reuses the wash's primary → secondary selection but
   **drops the L 22–30 % clamp**, which exists to put a colour behind white text
   and is wrong behind a crest — clamped, every bubble came out the same
   graphite-with-a-hint. A `TINT_FALLBACK` map carries the clubs whose own hexes
   the rule cannot use, and `withAlpha` composes the ring, core and glow.
5. **The league row is the SAME `LeagueSwitch` Matchdays and Table already
   draw**, over the same `leagueOptions`. The pack specifies a 36pt chip of its
   own, artwork-or-text, and a first pass built one — it was a third league
   selector for a screen that needed no new answer. Sharing the existing row
   keeps one league filter in the app: change its artwork rule once and all
   three screens move together ([0031](./0031-league-filter-tiles-are-artwork-only.md)'s
   artwork-only rule now governs this screen too).
6. **One browse tray**, `card` + hairlines, over a new `molecules/club-row.tsx`:
   the crest, the name over a place, and the follow pill. Following is one tap
   with no confirm and now fires `hapticToggle()` — the one haptic HANDOFF §8
   still listed as unbuilt.
   ⚠ **No club-colour tick**, which the pack draws down every row. Built first,
   then removed: twenty of them read as a stack of unexplained status bars, and
   this app already has a 3pt vertical rail — `BandRail` on the standings row —
   where it means a qualification zone. Two rails of the same size and different
   meanings is the ambiguity that one cannot afford. Club colour appears on this
   screen in the bubbles alone, where it is the whole point of the bubble.
7. **Shared parts rather than new ones.** `ChipButton` grew `shape="pill"` and
   `trailing` instead of a second follow control; `WashRadial` joined
   `WashGradient` in one file; the onboarding picker's inline search field became
   `molecules/search-field.tsx` and both screens use it; `ScreenScaffold` grew a
   `subtitle` for `{n} clubs followed`.

## What was deliberately NOT built

- **No double bezel ON CARDS.** The pack draws every card as a 5pt shell around
  a `#13161a` core. [0081](./0081-account-sheet-redesign.md) refused nested card
  shells and the ladder stays `background → card → raised → raisedAlt`. The
  browse tray and the search field are one `card` surface with a `hairlineMid`
  border each.
  ⚠ **The BUBBLE is the exception, and it is built.** A shell (`bezelFill`, 4pt,
  closed by the club-colour hairline) around a core one concentric radius
  smaller, with a lit top edge (`bezelHighlight`) tracing its arc. 0081's rule is
  about cards; a bubble is a physical object with a rim, and without the lit edge
  the shell reads as a flat band rather than a bezel. `bezelFill` and
  `bezelHighlight` are named for exactly this one component and are **not** a
  fifth step on the surface ladder.
- **The glow IS built, and it is the ONE exception.** [0015](./0015-handoff-design-system-adopted.md)
  says the app has no shadows — depth is surface lightness — and 0081 held that
  line. This narrows it by exactly one component: the rail bubble carries a
  shadow in the *club's own colour*, because the rail is the screen's hero and
  the glow is what separates a club you follow from one you are browsing.
  Nothing else may take a shadow on the strength of it. The other shadow in
  `src/` is still `alert-preview.tsx`, which imitates an iOS notification.
- **`LeagueSwitch` itself is untouched** — this screen adopts it as-is rather
  than growing it a variant. The app keeps exactly two league selectors: this row
  (Clubs, Matchdays, Table) and onboarding's naming `LeaguePills`
  ([0076](./0076-onboarding-floodlight-redesign.md)), which exists because a
  first-run reader has never seen any of the marks.
- **`ceuta` is kept OUT of `TINT_FALLBACK`**, so the neutral bubble stays a
  drawn path rather than dead code.
- **Nothing in `store/`, `features/` or `senpai-backend` was touched.**

## Consequences

- **`ClubBrowser` lost its `subscribed` variant and its `Switch`.** The docblock
  at the top of `clubs.tsx` saying a toggle unsubscribes with no confirm was
  true and is now false; it is rewritten, not left.
- **The `wordmark` cut stays unread.** The discarded chip row was the only thing
  that would have used LaLiga's `wordmark`; `leagueOptions` still prefers
  `onDark → icon → primary`, so LaLiga draws its LL monogram here exactly as it
  does on Matchdays. The cut is recorded in HANDOFF as available, not wired.
- **`bezelHighlight` is drawn as a `borderTopColor` on an overlay**, not as an
  inset shadow — React Native has none, and a top border on a rounded view is
  what traces the lit arc. It must stay an OVERLAY rather than a border on the
  core: a real border insets the core's content and shifts the crest off centre.
  All four sides carry 1pt at `transparent` so the radius traces; dropping three
  to zero makes RN draw the top edge as a straight chord across the curve.
- **`TINT_FALLBACK` has 45 entries, not 40**, and the extra five are a different
  failure. Valencia, RB Leipzig, Stuttgart, Frankfurt and Gladbach *are* served
  colours — pure black or pure white on both hexes — which the wash cannot use
  either. Framing the map as "the leagues the API leaves null" would have left
  five of the app's biggest clubs on a graphite bubble. After the map, **99 of
  100 tracked clubs carry a real colour**; `ceuta` is the one that does not.
- **Every `TINT_FALLBACK` value is asserted usable in the harness.** The pack's
  own Fulham pick (`#d7dbdf`, L 86 %) fails that assertion — the guard is not
  theoretical.
- **The glow's `shadowRadius` is 10, not the 13 that halving the design's 26px
  blur gives.** The design's shadow also carries a `-8px` spread, which React
  Native cannot express, so the radius absorbs it. At 13 it read as a halo.
- **Barcelona and Real Madrid both serve `#0f39b8`** and draw as two identical
  blue bubbles. That is the wire, faithfully; the fix is upstream, not here.
- The screen now reads `useStandings()`. It shares its query key with the Table
  tab so it is usually a cache hit, and nothing on screen waits for it — a bubble
  with no rank yet is the same bubble a rankless club draws.
- `copy.clubs.follow` lost its `+`, which is `PlusGlyph` now. A translator must
  never be handed punctuation that is really artwork.

## Alternatives considered

- **Porting the pack verbatim**, bezels on every card — the most faithful
  result, and the one that quietly reverses a recorded rule across the whole app.
  Both exceptions this ADR does take are claimed explicitly and scoped to one
  component: the glow and the bezel are the bubble's, and nothing else may take
  either on the strength of them.
- **A bespoke 36pt chip row for this screen**, per the pack. Built first, then
  removed: it was a third league selector, and the pack's `showLabel` rule needed
  a per-league flag and a second artwork order to support it. Sharing
  `LeagueSwitch` costs the LaLiga wordmark and buys one filter to maintain.
- **Keeping the rank badge LaLiga-only** — fewer moving parts, but it withholds a
  number we hold for three leagues and the stated reason for withholding it is
  no longer true.
- **A bundled `lib/club-colour` map, as the pack ships it** — exactly the
  designed hues, at the cost of a second source of truth for club colour and a
  hand edit for every club added. `clubTint` reads the API first and the map
  shrinks as the backend fills in.
- **A city-only subtitle** — faithful to the design's meaning, but it empties the
  second line on all 20 LaLiga clubs, which is the lead market.
