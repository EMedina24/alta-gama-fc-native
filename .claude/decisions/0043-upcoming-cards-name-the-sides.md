# 0043 — `UPCOMING FROM YOUR CLUBS` is one card per match, with the sides named

- **Date:** 2026-08-26
- **Status:** Accepted
- **Decided by:** Ed Medina
- **Supersedes:** [0029](./0029-upcoming-rows-read-from-the-followed-club.md)

## Context
[0029](./0029-upcoming-rows-read-from-the-followed-club.md) built the section as
six hairline-divided bands inside one grouped card. Each band was a centred
crest pairing — `[crest] vs [crest]` — over a single meta line reading
`21:00 · TONIGHT · Camp de Mestalla`. The club names were **not on screen at
all**; they lived on the `accessibilityLabel`. 0029 recorded that as a knowing
cost: "two 40pt crests carry the pairing faster than two names do".

A design pass came back saying they do not. Crests alone ask the reader to
recognise artwork at 40pt for twenty clubs across four leagues, and the
`vs` layout spends the card's whole width on two glyphs while the kickoff — the
fact the section exists for — is a 16pt numeral squeezed into a meta line
between a middot and a ground name.

## Decision
Each fixture is **its own card**, stacked with a `Spacing.three` gap. The
`UpcomingRow` molecule is renamed `UpcomingCard`, because it now draws its own
surface rather than sitting inside a shared one.

```
┌────────────────────────────────────────────────┐
│ MD 4 · CAMP DE MESTALLA             TONIGHT    │
│                                                │
│ (crest) Valencia CF                   21:00    │
│ (crest) Real Madrid               SAT 5 SEP    │
└────────────────────────────────────────────────┘
```

- **The sides are named, stacked, home first** — the order the match is played
  and named in. The names are `title3` (22pt); the crest drops **40 → 30**
  (`Size.crestList`) because the name now carries the identification and the
  crest only confirms it. A club with no artwork still falls back to its
  monogram tile (ADR 0018).
- **Home is lit, away is dim** (`text` over `textSecondary`). This is
  **positional, not personal** — 0029's rule that *which side is yours is
  deliberately unmarked* survives untouched. Every card in this section
  involves a followed club, so marking the followed side would mark them all,
  and with one club followed it would light the same name six times.
- **`MD 4 · CAMP DE MESTALLA` is the header eyebrow**, faint, flexed and
  clipped to one line so a long ground truncates rather than shoving the day
  word off the card. The matchday is new to this section: `matchday(round)`
  falling back to `matchweek`, rendered through the existing `copy.today.md(n)`
  (`MD 4` / `J 4`). Where the feed has no ground the card still says `AT HOME` /
  `AWAY`, resolved from `upcomingRow()` — which end of it you are on is a fact
  even when the ground is not known.
- **Kickoff over date, right-aligned**: `kickoffSm` tabular over `eyebrowLg`
  `textSecondary` — the same pair the next-up card already sets. The date is
  now on **every** card, absolute, `SAT 5 SEP`.
- **Only today is lit, and only today is named.** `TONIGHT`/`HOY` in accent,
  top right. Everything else leaves that slot **empty** — including tomorrow,
  whose word 0029 rendered faint. The absolute date under the kickoff already
  says `SUN 6 SEP`, and a second faint uppercase word on the same card competes
  with the ground for no new information. One accent thing per section (SPEC §2)
  is unchanged; there is simply less around it.
- **The section header stays plain** — no accent tone, no match count. 0029's
  reasoning holds verbatim.

### `kickoffSm`, not `kickoff` and not `countdownNum`
A new 26pt token. `kickoff` (32) is the *hero* size — six list cards setting it
would out-shout the next-up card the screen leads with. `numeralLg` (19) loses
the comparison against a 22pt club name sitting beside it. It shares its metrics
with `countdownNum` today and must not borrow that name: the countdown is free
to move on its own (ADR 0034) without dragging every kickoff along with it.

### `formatRelativeDay` is unchanged, and its trap still stands
The screen keeps the `kickoffTbd` short-circuit and simply discards the tomorrow
case: `relative?.tone === 'accent' ? relative.label : null`. A TBD kickoff is
stored as midnight UTC (~88% of stored rows) and would claim "tonight" for a
match with no kickoff at all — those cards render `--:--` faint over their
calendar date and never get the word. `formatRelativeDay` still has exactly one
caller, and its documented precondition is still honoured at both ends.

## Consequences
- **Club names are visible in this section again.** The main cost 0029 accepted
  is repaid, at the price of a taller section: six cards instead of six bands.
  Six is the cap `mine` already applies, so the section cannot run away.
- `UpcomingRow` → `UpcomingCard`, and `divided` and the `Dot()` helper are gone —
  nothing draws a hairline or a middot here any more. The `UpcomingRow`
  *interface* in `lib/cronogol/board.ts` is a different thing and keeps its
  name; the collision it had with the component is now gone.
- One new type token (`Type.kickoffSm`). No new colours, radii, sizes or copy
  keys — `copy.today.md(n)`, `homeWord`, `awayWord` and `tonight` all existed.
- **`TOMORROW`/`MAÑANA` is no longer rendered anywhere in the app.** The copy
  key stays — `formatRelativeDay` still returns it and the next surface that
  wants a relative day gets it for free.
- The card is still one VoiceOver stop, now reading the pairing, the kickoff,
  the date, the day word and the ground.
- Still a flat-scalar molecule (ADR 0013): the screen resolves `crestSrc`,
  `abbreviate`, `displayName`, the matchday and every string before it renders.
