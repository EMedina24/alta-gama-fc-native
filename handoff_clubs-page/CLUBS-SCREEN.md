# Alta Gama FC — Clubs screen, iOS

Scope of this pack: **the Clubs tab only** — subscribed rail, league chips,
browse list. The club page it pushes to, and the rest of the iOS design, live in
`design_handoff_altagama_ios/`.

| File | What it is |
| --- | --- |
| `Clubs Screen.dc.html` | The screen, interactive. Follow a club and it joins the rail; switch leagues |
| `ClubBubbleRail.tsx` | The subscribed rail, ready to drop into `src/app/(tabs)/clubs.tsx` |
| `leagues/` | The three league marks the chips use. Serie A has none — chip falls back to text |
| `support.js` | Runtime the design file needs to open locally. Not part of the design |

Tweaks on the design file: **Locale** (en / es) and **Club colour**
(off / soft / vivid) — the same switch the rest of the app carries, so the rail
can be checked with the wash off.

## Screen anatomy (393 × 852)

Status bar · title block · search · `SUBSCRIBED` rule · **bubble rail** ·
league chips · `BROWSE …` rule · browse list · leagues footnote · tab bar.

Everything sits on a 20pt gutter. Cards are **double-bezel**: a 5pt shell
(`rgba(255,255,255,.045)`, hairline `rgba(255,255,255,.07)`, radius 24–26) around
a `#13161a` core (radius 19–21) with an `inset 0 1px 0 rgba(255,255,255,.06)`
top highlight. Concentric radii, never a flat card on the background.

### Subscribed rail

88pt bubbles, 16pt gap, horizontal scroll, clipped by the screen gutter so the
next bubble peeks.

| Part | Spec |
| --- | --- |
| Ring | 44pt radius, 4pt padding, `rgba(255,255,255,.06)` fill, club-colour hairline at 38% |
| Glow | `0 10px 26px -8px` club colour at 50% — the only coloured shadow in the app |
| Core | 40pt radius, club-colour radial from the top (46% → 10% → `#15181c`), inset top highlight |
| Crest | 54pt, `contain`, own drop shadow so it reads as floating in the bubble |
| Check | 26pt lime disc, 2.5pt background-coloured border, **indicator only** |
| Rank | 20pt pill, bottom-left, `#` + position in its European-band colour |
| Name | `short` name, 12pt/600, centred, single line, ellipsised |

**One action per bubble: open the club.** Unfollow is deliberately not here — see
the ⚠⚠ note in `ClubBubbleRail.tsx`. It lives on the club page.

**Rank badge is LaLiga-only.** `GET /cronogol/leagues/{id}/table` exists for
LaLiga Primera and nothing else, so Premier / Bundesliga / Serie A bubbles carry
no badge. Absent, not zero, not a dash.

**Club colour** comes from `lib/club-colour` — one primary per club, and for
black- or white-kitted sides it is the SECONDARY: a near-black tint is invisible
on a graphite bubble, which is the whole point. Navies are lifted a step for the
same reason. These are wash sources, not crest colours.

### League chips

36pt, 74pt min-width (keeps the row rhythmic when marks differ in width), 13pt
radius. Active: `#22262c`, lime hairline at 50%, inset top highlight. Inactive:
transparent, `grayscale(1) opacity(.78)` on the mark.

**Artwork OR text, never both.** Gated on the league's own `showLabel` flag —
false exactly where the mark already carries the name (LaLiga, Premier League).
Bundesliga's mark is a crest glyph and Serie A has no mark, so both show text.
Rendered at the league's own `markH`, capped at 15pt.

### Browse list

One bezel tray, rows 11pt vertical. Each row: 3pt club-colour tick · 32pt crest ·
name over city · Follow button. The tick is the cheapest way to carry club
identity at list density without tinting 20 rows.

**Follow button** is a 32pt pill: label plus the `+` in its own 22pt circle at
`rgba(200,242,90,.16)`, flush with the pill's right inner padding. Tapping it
moves the club into the rail immediately — no confirmation, since following is
non-destructive and the rail is the receipt.

Subscribed clubs are filtered OUT of browse; the rail is the only place they
appear.

## Motion

Press states only, all `transform`/`opacity`, all on
`cubic-bezier(.32,.72,0,1)`: bubble `scale(.945)`, follow pill `scale(.95)`,
account chip `scale(.94)`, chips cross-fade their background over 400ms. No
entry animations on this screen — it is a list the user returns to constantly,
and staged reveals get tiring by the third visit.

## Copy

Lifted from `src/lib/i18n`; the Spanish is the app's own register, not a machine
translation.

```
en: { tabClubs: 'Clubs', search: 'Search 100 clubs', subscribedLabel: 'SUBSCRIBED' }
es: { tabClubs: 'Clubes', search: 'Buscar entre 100 clubes', subscribedLabel: 'SUSCRITO' }
```

The subtitle under the title is composed, not a key:
`{n} clubs followed` / `{n} clubes seguidos`.
