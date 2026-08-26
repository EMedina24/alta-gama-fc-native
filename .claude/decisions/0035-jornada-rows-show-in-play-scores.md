# 0035 — Jornada rows: horizontal crest pairing, and an in-play score that never says "live"

- **Date:** 2026-08-25
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context

A design mock for the Matchdays row changed four things about the shipped row
(`[time/score 76pt] · [crests stacked] · [home / away / venue]`):

1. The crest pair sits **horizontally** — `home v away` on one line — instead of stacked.
2. The score/kickoff numeral is **bigger**, roughly 19pt against the 15pt club names.
3. Row separators **bleed to the screen edge**, as the day header already does.
4. An in-play row shows `1–0` under a red **`LIVE`**.

The fourth collides with the hardest rule in this repo. `/cronogol/fixtures` sweeps
roughly every three hours, so a row the source flagged `live` was in play up to three
hours ago. HANDOFF trap #8 ("no DATA is live"), `statusText` in `scores.ts`, and
`FixtureTiming`'s own header all existed to stop exactly the word on that mock. The
old rule was total: a live fixture fell through to its kickoff time and said nothing.

That rule was cheap when nothing was lost by it, but it also hid a fact the reader
wants and the API actually has. The question was never "score or no score" — it was
whether the app can show one without claiming a feed it does not have.

## Decision

**The row shows an in-play score. It never says "live".**

- `FixtureTiming` gains a `live` branch: `finished` **or** `live`, with both goals
  non-null, renders the score. A live row with null goals still falls through to its
  kickoff time — the fact that does not decay.
- The caption under it is the Today board's own vocabulary — `In play` / `En juego`,
  new `copy.matchdays.inProgress` — painted `live`. The mock's shape and colour, the
  board's honesty. It means *as of the last check* in both languages.
- `copy.matchdays.inPlayNote` renders as a footnote beside the list whenever any
  fixture is in play, carrying both facts in one sentence: as of the last check, and
  the check runs roughly every ~3h. It sits in the existing footnote slot next to
  `timesPending` and `missing`.
- **`scores.ts` is untouched.** `statusText` still returns `null` for `live`. That
  guard governs `/cronogol/scores`, the world scoreboard, which no UI has read since
  ADR 0027 — a different surface with a different failure mode.
- Trap #8's substance is unchanged and still binds: no minute, no pulsing dot, nothing
  that animates a score into looking current, and the age line is never removed.

**The row shape follows the mock.**

- `CrestPair` — `home` crest, a `caption`-weight faint lowercase `v`, `away` crest — is
  a private component inside `fixture-list.tsx`. Per ADR 0013 it moves to `molecules/`
  when a second organism wants it, not before.
- `Type.numeralLg` (19pt/700) is a new token for the row's score/kickoff. `Type.numeral`
  (16pt/800) stays exactly where it is — `ScoreLine size='row'`, `UpcomingRow` and
  `SeasonSpine` are all sized against it.
- `Size.timingColumn` goes 76 → **88**, measured on the simulator rather than reasoned
  about. The binding case is a 12-hour `11:00 am` at 19pt (~83pt wide): at 76 it pushed
  the crest pair and the entire name column right **on that one row**, which is the exact
  reflow the fixed column exists to prevent. `IN PLAY` beneath it is only ~47pt and never
  binds. A 24-hour `21:00` fits either width — so this token looks safe to tidy back down
  and breaks only for readers on a 12-hour clock.
- The row bleeds `-Spacing.five` and pads it back, the same technique the day header
  uses. The trailing `<Hairline />` after each group goes: every row now carries its
  own full-bleed rule and the next day header brings its own darker ground.

## Consequences

- The reader gets the score of a match in progress, which is the thing they opened the
  screen for, and the screen still states what that score is worth.
- The honesty rule now has a *shape* rather than a prohibition — score plus qualified
  caption plus cadence sentence — which is reusable the next time a surface wants one.
- Two places now have to stay in step: the caption and the footnote. Removing the
  footnote alone would leave a bare in-play score, which is the failure this reverses
  into. The gate is in `matchdays.tsx`, commented.
- `copy.matchdays.inProgress` is short (`In play`, not the board's `In progress`)
  because it renders uppercase at eyebrow tracking inside the timing column.
- The name column loses ~50pt to the horizontal pairing and the wider timing column, so
  the venue footnote truncates earlier than it did — `Ramón Sánchez-Pizjuán · Se…`. That
  line is the designated shrink (`numberOfLines={1}`); the club names above it still fit,
  including `Espanyol de Barcelona`. Verified on a 402pt screen.
- `emphasis()` is unchanged — still score-driven and status-agnostic — so an in-play row
  dims the side that is behind. That was already the behaviour; the score now makes it
  legible instead of arbitrary.
- Dynamic Type at large sizes is untested against the new 19pt numeral and the caption
  (open backlog item 7).

## Alternatives considered

- **The mock's red `LIVE`, literally.** The one word the codebase has three separate
  guards against. Adopting it would make every one of those comments a lie.
- **Keep the no-`live`-branch rule.** Defensible, and it is what shipped — but it
  withholds a score the API already returned on the theory that the reader cannot be
  told how old it is. They can; the board already tells them.
- **`FeedAge` per row.** `/cronogol/fixtures` carries no per-row stamp, so it would
  print the null-hours branch on every row. Ten identical cadence lines in one list.
- **Reuse `VersusBadge` for the pairing.** It is the 34pt accent ring built for the
  next-up card's 64pt crests (ADR 0034). At row weight, in a ten-row list, the ring
  would be the loudest thing on the screen.
- **A `Size` token for the crest column.** Unnecessary — two fixed-size crests and one
  glyph give the pair a constant intrinsic width, and a club with no artwork falls back
  to a monogram tile at the same size, so the name column aligns on its own.
