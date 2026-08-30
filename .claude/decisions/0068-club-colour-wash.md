# 0068 — A club-colour wash behind the next-up card and the club header, tamed from `colorPrimary` on the front end

- **Date:** 2026-08-29
- **Status:** Accepted — harness-proven (16 assertions), verified on the simulator (gallery + Real Madrid / Valencia / Arsenal club pages)
- **Decided by:** Ed Medina

## Context
Every tracked club ships `colorPrimary` / `colorSecondary` on `/cronogol/teams`
(`TeamView`), and nothing in the app consumed them. The ask, from a reference
screenshot of another football app: give the lead card and the club page some of
the club's own colour — home colour meeting away colour on a diagonal behind the
next-up pairing, and the club page header tinted with that club's colour.

The data is uneven and that shaped every rule below (checked against
production 2026-08-29):
- Colours are populated for **LaLiga and Bundesliga only**. Every Premier League
  and Serie A club returns `null` on both fields. Opponent-only clubs are not in
  the catalogue at all.
- Several hexes are unusable behind white text: Valencia `#000000`, RB Leipzig
  and Stuttgart `#ffffff`, Villarreal `#ffd301`, Dortmund `#FFD900`. The type's
  own docblock says "verbatim and unvalidated".
- Bundesliga sets `colorSecondary` equal to `colorPrimary`.

A design preview (three treatments, the edge cases, the taming rule) was
approved before any code: option B, the two-club diagonal.

## Decision
1. **A pure taming rule in `lib/cronogol/club-wash.ts`**, constants in
   `ClubWash` in `@/constants/theme`: parse the hex to HSL; a near-white
   (L > 85 %) or near-black (L < 10 %) or unparseable primary falls to the
   secondary; if that is unusable too the side is "colourless". A usable hue is
   clamped to L 22–30 % (yellow-through-green hues 40–170° to 26 % — ⚠ measured on the simulator; the preview's 26–38 rendered a step louder on device — yellow reads a step
   lighter at the same L and out-shouted the crest) with S ≥ 45 %, and emitted
   as an `hsl()` string. ⚠ The secondary is a fallback, never a blend —
   Barcelona is blue, not purple. ⚠ NOT in `derive.ts`, which is a verbatim port
   of the web's and must stay mirrorable (0018).
2. **No colour → no wash → today's card, byte for byte.** `pairWash` returns
   null only when BOTH sides are colourless; the card keeps its lime ring and
   faint venue. This is every Premier League and Serie A pairing today, and it
   is the fallback, not a bug. One colourless side gets `washGraphite` and the
   wash still paints.
3. **On a wash the chrome goes white, not lime.** Border `hairlineStrong`
   instead of `accentRing`, the venue eyebrow `washInk`, the `VersusBadge` a new
   `tone="onWash"`. A card already carrying two club colours had no room for a
   third; lime stays the accent (matchday eyebrow, countdown) and never the
   frame. `Colors.dark.washGraphite/washInk/washRing/washBadge` are the tokens.
4. **Drawn with `react-native-svg`** through a new `WashGradient` atom — the
   pattern 0062 chose for the Serie A band, for the same reason: no
   `expo-linear-gradient`, no native rebuild. The atom takes its gradient `id`
   from `useId()`; `finished-today.tsx` hard-codes `"band"` and only survives
   because one league has a gradient — two washes on one screen would resolve
   `url(#…)` to whichever mounted first. The washed card sets
   `overflow: 'hidden'`, or the fill squares off the corners (the `flush` trap).
5. **The Today screen resolves, the organism paints (0013).** `TeamRef` carries
   no colour, so `index.tsx` joins each side to the `useTeams()` catalogue by
   slug — the same join `boardFromRoute` makes for live crests — and passes
   `next.wash: PairWash | null`. The club page already holds a `TeamView` and
   passes `tameClubColor(...)` straight to `ClubHeader.wash`.
6. **On the club page only the identity block is tinted**: a vertical gradient
   from the club colour at the screen top to `background` by the bottom of the
   block, bled through the screen gutter and up under the transparent header
   via `bleedX` / `bleedTop` props the screen derives from its own padding.
   The subscribe block, segmented control and rows are untouched.
7. **Scope is the next-up card and the club header, nothing else.** Upcoming
   cards, the last-result and live cards, the table and jornada rows stay
   neutral so the lead card keeps its rank (0063).

## Consequences
- Four new colour tokens and a `ClubWash` constant block in the theme; a new
  atom; a new pure module; `VersusBadge` gains a tone.
- `/_debug/gallery` carries the first next-up cases the gallery has ever had —
  the four wash states on real hexes with null crests (the grey monogram plate
  on a coloured wash is the collision to look at).
- The Premier League and Serie A get nothing from this until the backend fills
  their colours; when it does, the wash appears with no app change.
- Tuning is in one place (`ClubWash`); nothing in a component knows a hex.

## Alternatives considered
- **Raw hexes as-is** — Valencia's card would be black on black and Villarreal's
  a yellow slab under white type.
- **Mixing the two colours** into one blend — muddies both crests' colours into
  a third nobody chose; the dark seam keeps them apart.
- **Applying the wash to every upcoming card** — six coloured cards under one
  coloured lead flattens the hierarchy 0063 set.
- **Keeping the lime ring on the wash** — three colours in one frame; rejected
  in the preview.
- **`expo-linear-gradient`** — a native rebuild for something SVG already does.
