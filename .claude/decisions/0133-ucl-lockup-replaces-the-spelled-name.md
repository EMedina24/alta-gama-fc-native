# 0133 — The UCL lockup replaces the spelled-out competition name on the cards

- **Date:** 2026-09-07
- **Status:** Accepted — tsc + lint at baseline, simulator-verified on live data and in the gallery
- **Decided by:** Ed Medina ("can we implement this svg on the cards instead of spelling out 'UEFA Champions league'"), supplying the artwork
- **Amends:** [0132](./0132-team-windows-feed-the-today-board.md) §9 — the
  verbatim `competitionName` stays only as the FALLBACK for competitions
  without a mark. 0132's own verification had already sighted the cost: the
  spelled name truncated the NEXT UP venue to `SPOTIFY CAM…` and wrapped the
  cup LAST RESULT meta into the W pill.

## Context

0132 put cup fixtures on the Today cards and named their competition in the
meta row, verbatim — "NEXT UP · UEFA CHAMPIONS LEAGUE". The name is simply too
long for the rows it sits in, and Ed supplied the UCL lockup SVG (starball +
wordmark, cdnlogo.com master) to stand in its place, asking whether it needed
to go up to backend storage.

## Decision

1. **The mark is BUNDLED, not hosted** — `logos/ucl-lockup.svg` is the design
   source (no build step reads it, trap 23's rule) and
   `atoms/competition-mark.tsx` is the artwork as code, `mark.tsx`'s exact
   precedent ("drawn, not loaded: no SVG transformer is configured").
   Backend storage was considered and declined, on three grounds: no wire
   field carries a competition asset (`FixtureView` has only
   `competition`/`competitionName`, so hosting would need a `senpai-backend`
   contract change for what is one client's paint); the master's navy
   `#0e2050` fill is invisible on this app's dark grounds, and a hosted file
   cannot be recolored per row while a drawn one takes a theme token; and a
   bundled mark works offline on day one. If `cronogol` (web) wants it later,
   that is its own bundling call.
2. **Two departures from the master, both in the atom's header:** the wrapping
   `matrix(.60489 … 145 70.04)` transform is baked into the viewBox — the
   path renders untransformed against its own MEASURED bounds (446.4 × 429.4,
   computed from the path data with a bounds parser; the master's 560 × 400
   box is mostly padding) — and the fill is a `ThemeColor` token. ⚠ The
   measuring parser hit a real SVG-grammar trap worth keeping: in path data,
   `.378.756` is TWO numbers — a naive number regex reads it as one and
   silently shifts every following coordinate.
3. **Keying is exact-match on the wire string** — `competitionMarkKind` maps
   `'UEFA Champions League'` → `'ucl'` and everything else → null. A display
   asset lookup by strict equality, not an entity join: ADR 0022/0027's
   name-matching prohibition is about joining data and stands untouched.
4. **Text is the fallback, never silence:** a competition without a mark
   (Copa del Rey, Supercopa, Europa League today) keeps 0132 §9's spelled
   name in the meta. The gallery draws both states side by side.
5. **Placement — Ed's, iterated across three builds by screenshot:** the
   first build put the lockup beside the NEXT UP label in accent; Ed moved
   it under the Vs and made it WHITE (`text`, the club names' own ink); off
   that build's screenshot he moved it again — **onto the kickoff row's
   empty right end, bigger** (`Size.competitionMarkLg`, 44 — scaled against
   the kickoff time so the row grows nothing; the meta block's `flex: 1` is
   what pushes it to the edge). The head row is `NEXT UP` + venue alone
   again, which now fits. LAST RESULT keeps the meta-row placement —
   `LAST RESULT · [lockup] · WED 9 SEP` at `Size.competitionMark` (24), the
   separators the text form would have worn — in the same white: one voice
   on both cards. The small size stays deliberately taller than an eyebrow:
   the lockup's own wordmark is ~1/5 of its height and any smaller reads as
   a smudge. **VoiceOver keeps the words** — the Svg carries
   `accessibilityLabel: 'UEFA Champions League'`, so the mark removes
   nothing from a reader who cannot see it.

## Deliberately not done

- **The UPCOMING rows keep the spelled name.** Their meta is one joined
  string inside `UpcomingCard`; restructuring a list molecule for a mark the
  lead cards already carry is a separate call — flagged to Ed with the
  screenshots.
- **The widget stays markless** (0132: `roundLabel` null for cups). A widget
  cannot draw an SVG — trap 12's constraint class — and a rasterized asset
  in the target's catalogue is native-build work with no design yet.
- **No other competition marks invented.** The mapper grows one exact string
  at a time, artwork in hand.

## Verification

- `npx tsc --noEmit` clean; `npx expo lint` at the 6-error baseline.
- Simulator, live data (2026-09-07): the white 44pt lockup on the kickoff
  row's right end, balancing `12:45 · WED 9 SEP` — its own wordmark legible
  at this size — with the head row back to `NEXT UP` + `SPOTIFY CAMP NOU`
  untruncated; the 0132 sighting closed.
- Gallery `?only=next`: the marked cup card and the Copa del Rey text
  fallback; `?only=last`: the cup result's white lockup row on one line,
  clear of the W pill, no events chevron; the league regression untouched.
