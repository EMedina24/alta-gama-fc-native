# Crown + aurora — app-wide shell

The Alta Gama FC app on a lit OLED ground: one static colour mesh behind every
screen, and a lime→teal **crown** at the top of each tab carrying that screen's
title and its own controls. No charcoal cards anywhere.

## Files

| File | What it is |
| --- | --- |
| `AltaGama FC iOS.dc.html` | The full mockup — Today, Matchdays, Table, Clubs, club page, news, sheets. Opens in a browser. |
| `screenshots/` | 01 Today · 02 Matchdays · 03 Table · 04 Clubs · 05 Clubs (browse) |
| `leagues/`, `brand/` | League marks and the lime mark used in the crowns. |
| `support.js` | Runtime for the design file. Not shipping code. |

## The shell

**Ground** — `#0f1316` with one static mesh layer behind the scroll view (not
per-card blur):

```
radial-gradient(64% 40% at  92% 22%, rgba(200,242,90,.16), transparent 62%)
radial-gradient(78% 46% at -12% 48%, rgba(16,92,74,.60),  transparent 66%)
radial-gradient(72% 42% at 108% 86%, rgba(28,84,108,.50), transparent 66%)
```

**Cards** — `rgba(255,255,255,.06)` with a `0.5pt rgba(255,255,255,.11)`
hairline. Modal sheets stay opaque (`#101316`): glass over a scrim reads muddy.

## The crown

One component, three slots: **eyebrow**, **title**, and a **payload** that
belongs to the screen.

```
padding: 10 / 20 / 18–30   (bottom grows with the payload)
background: linear-gradient(180deg,
  #c8f25a 0%, #8ac768 26%, #2f8f78 50%,
  rgba(23,110,96,.72) 68%, rgba(16,72,66,.38) 82%,
  rgba(10,40,40,.14) 92%, rgba(15,19,22,0) 100%)
highlight: radial-gradient(76% 70% at 88% 4%, rgba(255,255,255,.26), transparent 62%)
```

It ends in **transparency**, never a hard edge — the gradient hands off to the
mesh. Title is 40pt/300 (`-0.04em`); Clubs runs 48pt because its subhead
carries the follow count.

| Screen | Payload |
| --- | --- |
| Today | the live match, as a dark glass plate |
| Matchdays | round paginator + league chips |
| Table | league picker |
| Clubs | follow count, then the search field and subscribed rail under the fade |

## Ink on the crown

The crown is the only inverted surface in the app and needs its own set:

| Token | Value | Use |
| --- | --- | --- |
| `onAccent` | `#0d1a08` | titles, eyebrows, primary labels |
| `onAccentDim` | `rgba(11,22,8,.62)` | subheads, counts, meta |
| `onAccentLine` | `rgba(11,22,8,.24)` | hairlines, outlines |
| `onAccentFill` | `rgba(11,22,8,.16)` | avatar and chip grounds |

⚠ Only in the crown's **bright band** — its top half, lime through mid-teal.
Past the midpoint the ground is dark green and content keeps the normal
dark-theme tokens: black ink dies there exactly as grey dies on the lime. The
Clubs rail is the live example — dark-ink header, light-ink `SUBSCRIBED` row and
club names.

League marks keep their colour and go `grayscale(1) opacity(.78)` when inactive,
the app's existing chip rule. A selected chip inverts again to near-black with
lime ink — the one double inversion in the system.

## Subscribed bubbles (Clubs)

88pt liquid-glass shells, no club-colour radial:

- outer `rgba(255,255,255,.16)`, 1pt `rgba(255,255,255,.42)` rim,
  `backdrop-filter: blur(16px) saturate(150%)`, `0 10 22 rgba(6,18,14,.28)`
- inner vertical glass `.34 → .10 → .20` with a `rgba(255,255,255,.6)` top
  highlight and a `-10px` inner bounce
- one specular arc, blurred 2px, across the top third
- rank chip is a frosted pill (`rgba(255,255,255,.62)`) with `#0d1a08` ink; the
  follow check stays lime with a white rim

## Screens synced to the codebase

Matchday and Today rows follow `src/components/` rather than the older mockup:

- **Fixture rows** (`organisms/fixture-list.tsx`) — 64pt timing cell (score chip
  or kickoff, caption, **chevron beside the caption**, never a right-hand
  column), 40pt crest pair with a lowercase `v`, then both names over the venue.
  No club wash; only an in-play row tints (`#12161a`). Caption is `IN PLAY` /
  `EN JUEGO` — never the word "live" (ADR 0035). **Only a finished row expands**
  (ADR 0045): the ingest is finished-only, so an in-play chevron would open on
  an empty panel.
- **Score chip** (`atoms/score.tsx`, `rowLg`) — radius 12, `8/4` padding, 8pt
  gaps, a 1×17 `rgba(255,255,255,.12)` rule, 19pt/700 tabular numerals.
- **Live card** (`organisms/match-board.tsx`) — outlined `IN PROGRESS` pill (no
  dot, ADR 0034), 22pt tabular minute in live ink, board score line, the honesty
  note under the rule, then a `MATCH EVENTS` disclosure row flush to the card
  edges. Board-size names **shrink** to 17pt rather than ellipsise.
- **Finished today** (`organisms/finished-today.tsx`, ADR 0069) — stacked pairs,
  26pt crest and name per line, goals in their own right column behind a
  hairline, chevron in its own column, no `FT` word, league header on its brand
  band (`laliga #A8231F`, `premier-league #37003C`, `bundesliga #FF404A`,
  `serie-a` gradient).

## Notes for implementation

- Ship the mesh as one static gradient layer behind the scroll view. Below
  iPhone 13, drop `backdrop-filter` on cards and use the flat 6% fill.
- The crown's height changes with its payload; it is not a fixed header. With
  nothing live, Today's crown collapses to title + date.
- Nothing in the crown may sit at `z-index` below the screen ground — that was
  the one bug found while building it, and it made the title vanish.
