# 0072 — Starting XI tokens and rail tiles draw the player's portrait, with the shirt number as a corner badge

- **Date:** 2026-08-30
- **Status:** Accepted — verified on the simulator (`/_debug/xi?slug=barcelona` and the live builder, 2026-08-30)
- **Decided by:** Ed Medina

## Context
The builder's pitch tokens and rail cards showed only the shirt number, while
the exported card already drew portraits — `SlotToken` had a `portrait` prop
that only `LineupCard` used. The squad data (`SquadPlayerView.photoUrl`) was
in hand on both surfaces through the `byId` map; nothing passed it. The ask
was player images in the builder.

The data is uneven and shaped the rules: `photoUrl` is null for ~1 in 5
LaLiga players and ~1 in 2 Premier League players; dimensions differ by
league and an operator-uploaded stopgap has none guaranteed; a hot-linked
portrait can 404.

## Decision
1. **Portrait when the player has one, the number token when he has not.**
   No toggle and no silhouette: a mixed pitch on a Premier League squad is the
   honest state, and the lime number disc is the designed fallback (0065).
2. **The shirt number survives as a badge** on a portrait token's corner —
   `Size.xiBadge` (18) at board size, scaled with the ring on the card, lime
   with `onAccent` type (`Type.xiBadge`). A reader checks a placement by
   number; a face alone does not do that at 46pt. Initials badge for a null
   shirt, as before.
3. **A failed portrait falls back to the number token** (`onError` → local
   state). Before, a 404 left an empty lime disc. `onPortraitSettled` still
   fires on error, so the card's capture barrier is unchanged.
4. **The selected ring draws around a portrait too.** The old
   `selected && !showPortrait` gate would have hidden the accent ring on a
   selected photo token the moment the board drew photos.
5. **Rail tiles** get the same treatment at 30pt: portrait in the tile, number
   in a `Size.xiRailBadge` (14) badge; null or failed → the number tile.
6. `Size.xiToken` untouched: the badge sits INSIDE the 46pt footprint, so no
   formation table moves. The ring's ground under a portrait is `raisedAlt`,
   so a transparent PNG does not float on lime.

## Consequences
- One atom, one molecule, two one-line prop pass-throughs; the card inherits
  the badge and the failure rule for free.
- `/_debug/xi` breaks two portraits on purpose (one null, one 404) so the
  fallbacks are always on screen.
- `CARD.badge` / `CARD.badgeSize` in `card-geometry.ts` remain unused — the
  badge derives from the ring ratio instead. Left for a later tidy.

## Alternatives considered
- **A silhouette for a null photo** — a grey nobody beside real faces reads as
  a missing player, not a missing picture.
- **A "show photos" toggle in the Look sheet** — settings for a default that
  should simply be right; revisit only if a squad's coverage makes the mix
  ugly in practice.
- **Enlarging the token** — re-measures every formation table (0065).
