# 0184 — The next-up card goes neutral glass

- **Date:** 2026-09-14
- **Status:** Accepted
- **Decided by:** Ed — *"can we please remove the lime gradient or hue on
  this card please and just make it fully 'glasss'"*, on a screenshot of the
  Elche v Real Madrid card.
- **Supersedes:** [0068](./0068-club-colour-wash.md) (the club-colour wash on
  the next-up card — removed outright; the club-page header tint and the
  `clubTint` rail machinery 0082 built on the same module stand).
- **Amends:** [0096](./0096-next-up-goes-liquid-glass.md) — the liquid-glass
  BODY and its see-through treatment stand; the lime `accentRing` frame is
  what this reverses.

## Context

The card read green. Three sources, none of them the card's own surface:
the crown's lime→teal ramp bleeding through the deliberately clear glass
(`recess` at 0.28 black does not stop it — 0096 wanted exactly that), the
0068 club-colour pair wash (Elche's brand green at the home edge), and the
1pt lime `accentRing` frame.

## Decision

1. **The scrim STAYS `recess`; the card stays see-through.** LivePlate's
   `plateDark` was tried first (it blocks the crown hue the same way in the
   same slot) and Ed rejected it live — *"its too dark and needs to be way
   more transparent"*. So the card removes only the colour it ADDS itself;
   whatever ground the reader picked showing through the glass is the point,
   not a bug. The white top sheen and `plateTop` lit edge stay.
2. **The frame goes neutral**: `Size.glassBorder` + `plateLine`, LivePlate's
   ring, replacing the 1pt `accentRing`.
3. **The club-colour pair wash is REMOVED, not tamed further** — the `wash`
   prop, the pair `WashGradient`, `pairWash`/`PairWash`/`WashSource` in
   `club-wash.ts` and `ClubWash2` in the theme all go. The whisper (0096) was
   already the wash's last strength; on a neutral plate any tint reads as a
   stain. `clubTint`/`tameClubColor` stay — the Clubs rail and club header
   still use them.
4. **Lime survives as CONTENT only**: the NEXT UP eyebrow, the countdown's
   seconds, `VersusBadge tone="accent"`. Ed's call — surface hue out,
   accents in.
5. The gallery's four wash-state cases collapse to one base card; the
   pairings stay as deck data. The trap-40 "washes must not bleed ids"
   carousel case retires with its subject (the remaining per-card gradient
   is an identical white sheen — id bleed would be invisible and harmless).

## Consequences

- The card carries NO colour of its own any more — its hue is always the
  ground behind it. On the default brand crown that ground is still the lime
  ramp; if that ever reads as "the card is lime" again, the dial is the `dim`
  scrim (one token), with `plateDark` the known-too-dark ceiling.
- Live↔next still changes material (LivePlate is a dark plate, this is clear
  glass) — Ed chose transparency over that consistency.
- Club colours no longer appear on the Today screen at all — the rail
  bubbles and the club page header are the club-colour surfaces now. When
  the backend fills Premier League colours, this card gets nothing (0068's
  promise inverted, deliberately).
- `wash-gradient.tsx` keeps the `pair` angle: the splash sweep (0134) rides
  the same 100° line.

## Alternatives considered

- **LivePlate's `plateDark` scrim** — implemented, screenshotted, rejected by
  Ed in the same session: too dark, not glass enough.
- **Tame the wash further instead of removing it** — the whisper (0096) was
  already its floor; on a neutral card any tint reads as a stain.
- **Neutralise the crown ramp instead** — the ramp is the screen's brand
  head (0175/0181 machinery); the ask was about the card.
