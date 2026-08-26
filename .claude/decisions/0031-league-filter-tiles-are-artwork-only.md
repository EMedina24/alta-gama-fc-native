# 0031 — The league filter tiles are artwork only

- **Date:** 2026-08-25
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
`LeagueSwitch` followed the handoff's rule: a mark that carries its own wordmark
renders alone, a mark without one gets a text label beside it. So LaLiga and the
Premier League showed artwork, while the Bundesliga (emblem only) and Serie A
showed `BUNDESLIGA` and `SERIE A` in an eyebrow.

On the Jornadas screen that produced a row of four tiles of wildly different
widths, and the Bundesliga tile — emblem plus a nine-character eyebrow — ran off
the right edge of the screen with its label clipped mid-word. The reader is
choosing between four marks they already recognise; the row is a filter, not a
legend.

## Decision
Every tile is **artwork alone**, at one fixed size (`Size.leagueTileW` ×
`Size.leagueTileH`). All four leagues fit inside the screen gutter without
scrolling. The league's name still reaches VoiceOver through the tile's
`accessibilityLabel`, which it already carried.

The screens resolve the artwork as `logoUrls.icon ?? logoUrls.primary ??
logoUrl`. `icon` is the icon-only cut and is LaLiga's alone today; the other
three lockups carry their own wordmark, which is as close to "icon" as the wire
gets.

`LeagueOption.hasWordmark` is gone — nothing reads it now.

## Consequences
- One rule instead of a per-league one, so a fifth league needs no editorial
  judgement about whether its mark says its name.
- The text branch stays for a league that arrives with **no artwork at all** — an
  empty tile is unpickable — and that tile sizes to its label rather than to the
  fixed width. All four leagues today ship a mark, so it does not render. (The
  component's old note that Serie A had no mark was stale: it ships a blue `A`.)
- The Table screen uses the same molecule, so its filter row changed too. A league
  chip that names itself on one screen and not the other would be worse than
  either rule applied consistently.
- ⚠ **The marks are drawn for a light background** (`LeagueRef.logoUrl`'s own
  warning) and the Premier League's lion is genuinely faint on this ground at the
  50% idle opacity. With the label gone it is the only thing identifying that
  tile. If it proves unreadable, the fix is the light plate `cronogol` puts
  behind them, not the label coming back.

## Alternatives considered
- **Keep the label, shrink the type / abbreviate to `BUN`** — three-letter league
  codes are a fantasy-sports convention, not this product's, and they would sit
  next to real artwork that already identifies the league.
- **Bundle icon-only artwork for the three leagues that lack it** — an asset drop
  per league is exactly what reading `logoUrls` off the API avoids
  ([0009](./0009-backend-is-only-data-gateway.md)).
