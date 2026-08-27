# 0029 — `UPCOMING FROM YOUR CLUBS` rows are the pairing, over kickoff · day · venue

- **Date:** 2026-08-25
- **Status:** Superseded by [0043](./0043-upcoming-cards-name-the-sides.md)
- **Decided by:** Ed Medina

## Context
The section shipped as a placeholder: one line per fixture reading
`"Barcelona v Athletic"`, with the crest, venue, kickoff time and date all
thrown away. SPEC §3.1 asks for a grouped card whose "right column is time over
`TONIGHT`/day", and the design mock pairs that with a crest and a venue line.

The rows are, by definition, all *yours* — every one involves a subscribed club,
and with one club followed the same name leads all six rows. So the row's job is
not to say *whose* match it is; it is to say **who is playing whom, when, and
where**.

## Decision
The row is a centred pairing over one meta line:

```
            [home crest 40]  vs  [away crest 40]
        3:00 pm  ·  JUE 27 AGO  ·  Spotify Camp Nou
```

- **Both crests, home first** — the order the match is played and named in.
  Which side is *yours* is deliberately unmarked: every row in this section
  involves a followed club, so marking it would mark them all.
- **No names on the row.** Two 40pt crests carry the pairing faster than two
  names do, and the names would force either a truncated line or a second one.
  They go on the `accessibilityLabel`, which is where a screen reader reads the
  row as "FC Barcelona vs Athletic, 3:00 pm JUE 27 AGO, Spotify Camp Nou". A
  club with no artwork falls back to its monogram tile — part of the design,
  not a failure state (ADR 0018).
- **Kickoff · day · venue, centred under the crests.** The kickoff is the
  tabular numeral the reader came for; the venue is the only part allowed to
  shrink, because it is the one that can be long.
- **The day word is relative** — `formatRelativeDay` in `lib/format.ts`: today →
  `HOY`/`TONIGHT` in accent, tomorrow → the word, anything further → the full
  date (`SÁB 30 AGO`), faint. **Only today is lit** — one accent thing per
  section (SPEC §2), and the accent is what makes "there is a match today"
  findable without reading.
- The day is decided on `zonedDayKey` in the **viewer's** zone, so a 21:00
  Madrid kickoff is not "tonight" for a reader in Mexico City. Verified across
  a zone boundary: 05:00Z Wednesday reads `MAÑANA` in Madrid and `HOY` in
  Mexico City, off the same instant.
- **The section header loses its accent tone and its match count.** The accent
  now belongs to today's day word — two accents in one section is none — and a
  count over at most six visible rows restates them.

### The followed club still decides two things
`upcomingRow()` in `lib/cronogol/board.ts` (pure, no native import) resolves
which side is followed — home wins the tie when both are, the same rule as
`boardOutcome`, so a derby is read from one bench consistently across the
screen. It feeds the tap target (the row opens *your* club, not the opponent)
and the venue fallback: where the feed has no ground, the row says `en casa` /
`a domicilio` instead, which is still a fact about your club.

### `--:--` never says "tonight"
A `kickoffTbd` row is stored as `00:00:00Z` — a date wearing a midnight time
(~88% of stored rows). Passing it to `formatRelativeDay` would claim a match
"tonight" that has no kickoff at all, and westward zones would date it to
yesterday. Those rows short-circuit in the screen to `--:--` over the calendar
date via the existing `formatFixtureDate`, faint. `formatRelativeDay`'s doc
comment states the same precondition from its own side.

### A new molecule, not `ListRow` or `ScoreLine`
`ListRow` is a crest · title · subtitle line — this row has no title. `ScoreLine`
is the crest · score · crest headline, but it is score-driven (the losing side
recedes) and puts a name beside each crest; an unplayed match has neither. So
`UpcomingRow` is its own molecule, taking flat scalars (ADR 0013) — the screen
resolves `crestSrc` / `abbreviate` / `displayName` / the kickoff string before
it renders.

`Size.timingColumn` was added along the way, replacing the `minWidth: 76`
literal in `FixtureTiming`. This layout centres its own meta line and does not
use it, but the token is where that number belongs.

## Consequences
- The section now states, per row, who you play, where, when, and how soon.
- `formatRelativeDay` has a precondition a caller can violate silently. It is
  documented at both ends and there is exactly one caller.
- Four new copy keys per language (`tonight`, `tomorrow`, `homeWord`,
  `awayWord`); the day words are rendered through the `eyebrowSm` variant,
  which uppercases them, so the tables hold sentence case.
- **Club names are no longer visible in this section.** That is the cost of the
  crest pairing, and it is paid knowingly: the names are one tap away on the
  club screen and are read aloud by VoiceOver here.
- Not addressed here: the two stat tiles below the section (HANDOFF item 4,
  SPEC §3.1 item 4) are still unbuilt.
