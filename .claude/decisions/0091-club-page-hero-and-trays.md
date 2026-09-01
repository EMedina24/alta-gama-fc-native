# 0091 — The club page is rebuilt: a bled hero, a standing strip, a NEXT UP card, and trays

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (tinted club, no-tint club); ⚠ the spine and squad sit BELOW the fold and were not seen (taps cannot be scripted here)
- **Decided by:** Ed Medina, from `handoff_new-paint/` (mockup lines 436–583)
- **Supersedes:** [0068](./0068-club-colour-wash.md)'s club-page hero geometry (its TAMING rule is untouched) · [0082](./0082-clubs-screen-rail-redesign.md)'s "every CARD on the screen stays one flat surface", for this screen
- **Amends:** [0065](./0065-starting-xi-builder.md)'s row placement (unchanged in intent, re-grounded)

## Context

The club page was the identity block, a two-button subscribe card, the XI row,
a segmented control and the spine. The mock rebuilds it around four
double-bezel trays and gives the hero the whole top of the screen.

## Decision

1. **`organisms/club-hero.tsx` replaces `club-header.tsx`** (deleted). The
   club's tamed colour lights the top-left corner (a `WashRadial` at .5 over a
   vertical fall at .22), its crest is bled off the bottom-left as wallpaper,
   and the name runs at a new `Type.heroTitle` (36/700). `wash: null` — every
   Premier League and Serie A club today — takes a neutral white fade, which
   is a REAL state, never graphite.
2. **⚠ No native header at all.** `headerShown: false`; the hero draws its own
   back pill. The transparent nav still reserved a 44pt band the mock's hero
   needs, and the pill can be LABELLED where the native button could not —
   left to itself it printed the route group `(tabs)`, and no single label was
   true for a screen reached from Clubs, the Table and a push. The pill names
   where you ARE (the competition), which has no such problem. Swipe-back is
   the stack's and is unaffected.
3. **`molecules/club-stats-strip.tsx`** — POS / PTS / GD / LAST 5 in a `Tray`.
   ⚠ Drawn only when the club has a row in a table that passes `bandsApply`;
   absent renders NOTHING rather than dashes (trap 20 / 0082's rule). The
   position's ink is `zoneFor(rank, League.zones)` — never arithmetic — and GD
   goes lime only when positive.
4. **`molecules/club-next-card.tsx`** — the next fixture, over the OPPONENT's
   colour (tinting it in the page's colour would make every club's card look
   the same), their crest bled bottom-right. "Next" is `nextUpIndex`, never a
   clock comparison. ⚠ The opponent is joined to the catalogue **by name** —
   `FixtureView` carries `opponent` and no slug; a miss is simply no wash.
   ⚠ Tint alpha is **half the mock's** (.18 vs .34) and the crest 8 % (vs 14
   %): `clubTint` drops 0068's lightness clamp, so Valencia's orange arrived
   unmuted and washed the whole card, and the kickoff numeral sits over that
   crest.
5. **`organisms/club-actions.tsx`** — the alerts row and the calendar row in a
   tray, with the season note. The alert row INVERTS: solid lime when NOT
   subscribed (the invitation, this screen's one lime hero), lime wash when
   subscribed (a settled state). Both directions still route to the confirm
   sheet (0082).
6. **The `StartingXiRow` and the browse-style rows wear the `Tray`**; the
   segmented control keeps 0087's glass track with a `segThumb` thumb.
7. **The spine's rail becomes a gradient** — the club's colour at the top of
   the first row, falling to the ordinary hairline — and its node fill moves
   from the ground's HEX to translucent `recess`: the mesh varies down the
   screen and a fixed fill stopped matching it.
8. **The squad list gains one glass card PER BAND**, not one for the whole
   squad: our band headers would otherwise sit inside a single card and read
   as that card's header.

## Consequences

- New tokens: `onAccentFill`, `accentWashStrong` (the discs nested in the
  alerts row).
- `club-header.tsx` deleted; `ClubHero` + `ClubActions` carry its two halves.
- The page now reads `useStandings()` and `useTeams()` for the strip and the
  opponent tint — both already-cached queries, no new endpoint.
- ⚠ **Unverified:** the spine and the squad below the fold, and the alerts row
  in its NOT-subscribed (solid lime) state — the simulator cannot scroll or
  tap here. First device pass should look at all three.
