# 0157 — The calendar CTA becomes a PILL on the strip's own row, and the cup gets two feeds behind it

- **Date:** 2026-09-11
- **Status:** Accepted — verified on the simulator in EN and ES, both scopes
- **Decided by:** Ed (placement, scope, and the lime pill)
- **Diverges from:** SPEC §3.2, which specifies `Add all N matches` as "outlined-accent"
- **Closes:** [0156](./0156-the-league-phase-is-a-matchday.md)'s one open item

## Context

0156 shipped the Champions League matchday tab with **no calendar affordance**,
because the jornada feed is league-scoped and a button building a 404ing
`webcal://` URL is worse than no button — a feed URL is copied onto a device and
cannot be told it moved. `senpai-backend` §125 now serves two, both verified
live: `feed/ucl/{season}.ics` (144 VEVENTs) and
`feed/ucl/jornada/{season}/{n}.ics` (18 a round).

Ed: *"we just need to figure out a way to include the CTAs without them being
intrusive."* Two problems underneath that.

**The screen already broke its own rule.** SPEC §2: *"Accent is for one thing per
screen… If two things on a screen are lime, one is wrong."* Matchdays carried the
lime strip pill **and** a full-width lime-ringed `Add all N matches` — and
`matchday-pager.tsx`'s own header names both claimants while explaining why the
arrows are *not* accent. The conflict was documented before it was noticed.

**And the two cup feeds are not interchangeable.** A knockout tie carries no
matchday, so the round feed structurally cannot reach one: the season feed is the
only path to them.

## Decision

**One affordance, on the strip's own label row, for every league.**

The `Button tone="outline"` is deleted — on all five leagues, not the cup alone;
two idioms in one place on one screen would be worse than either. In its place, a
`ChipButton shape="pill"` sits right-aligned on the `MATCHDAY` eyebrow row, which
was empty. It costs no vertical space (the round gains two visible fixtures), and
it sits exactly where the round is chosen, which is what it is scoped to.

⚠ `styles.addAll` goes with it — and it had **always painted nothing**: it set
`borderColor` with no `borderWidth`, so the ring readers saw was entirely the
Button's own tone.

### ⚠⚠ It is lime, and that is a considered reversal of my own first cut

The first build was a neutral `eyebrowSm` line, on the reasoning above about the
lime budget. Ed: *"make this into a thin lime pill please, so users know it's
clickable."* He is right, and the screenshot showed it: a row reading `MATCHDAY`
on the left does not teach anyone that the word on the right is a button. An
affordance nobody presses is not quiet, it is broken.

The distinction the app already draws is **weight, not presence**:

| | |
| --- | --- |
| **solid** lime | a marker — *"you are here"*. The strip's current round. |
| lime **ring** | an invitation to act. `ChipButton`'s own header: *"`accent`… keeps the lime ring, because that chip is an invitation to act."* |

Two different lime weights doing two different jobs, which is also how the club
page reads ([0091](./0091-club-page-hero-and-trays.md): solid when unsubscribed,
wash-and-ring when settled). SPEC §2 stands everywhere else; this is the
recorded exception, and it is Ed's call.

⚠ `ChipButton` gained a `pillBare` branch: a `pill` with no `trailing` takes
**symmetric** padding. The asymmetry exists because the follow control's disc
carries weight on the right; without a disc the label sat visibly off-centre.
Both pre-existing `pill` call sites pass a disc, so nothing that shipped moved.

### One entry, two scopes in the sheet

`CalendarSheet` gains an optional `scope`, drawn as a `SegmentedControl` above
the body. Absent → the sheet is byte-identical, so the club and jornada routes
are untouched. Only the cup passes one, because only the cup has two feeds that
answer different questions.

⚠ `tone="quiet"`, never `accent`: this sheet already spends its one lime hero on
the Google button ([0147](./0147-segmented-control-gains-an-accent-tone.md)).
⚠ The control sits **above** the body, because the body describes whatever is
selected. ⚠ The round scope is the default — the reader arrived from a round.
⚠ An unparseable matchday falls back to the season feed and hides the control
rather than minting `…/jornada/2026/NaN.ics`, which the backend 400s.

### Two things the copy must say, because neither is guessable

1. **The season feed is the only one with the knockout rounds.** This is the
   entire reason the second scope exists.
2. ⚠⚠ **A reader who also follows a club in the competition sees that club's ties
   TWICE, deliberately.** The feeds key `UID:ucl-fixture-{id}` and
   `UID:fixture-{id}` because the club-side twin exists for only 40 of 144
   fixtures and **can be attached late** — keying on it would mean a UID that
   changes under a live subscription, orphaning the event on every device for
   ever with no recall. **Never dedupe client-side:** the calendar app owns that
   state and nothing here can reach it. Saying so is the only honest move, in the
   tradition of `club.subscribeNote`.

## ⚠⚠ Two bugs found landing this, both from the same root

Ed, on the cup tab: *"going from champions league back to laliga fails"* — and
then, decisively: *"LaLiga is selected but the matches are UCL."*

**1. The rail was told the wrong selection, and it made the chip unpressable.**
`matchdays.tsx` passed `active={league.slug}`, and `league` is a FALLBACK —
`active.kind === 'league' ? active.league : ROUND_LEAGUES[0]` — because the
hooks below need a `League` unconditionally and a hook cannot be called
conditionally. So on the cup tab it read `la-liga`. Two failures at once: the
LaLiga chip drew as selected while the cup was showing, and
`LeagueSwitch.select` early-returns when the tapped slug equals `active`, so
tapping LaLiga did **nothing at all**. There was no way out of the competition.

⚠ It is `active={leagueSlug}` — the state. The rule is now written on
`LeagueSwitchProps.active` itself rather than at one call site, because the
Clubs rail has the identical `find(...) ?? DEFAULT` shape and is safe only
because every chip there resolves today. The Table screen had it right from the
start; Matchdays inherited a line that was correct until `league` gained a
fallback under it.

**2. The round number carried across competitions.** Fixed in the same pass:
crossing between the domestic ladder and the cup now RE-SEEDS to the new side's
opener, while switching within the domestic set still CLAMPS, per SPEC §3.2.
That rule was written for ladders of comparable length (38 / 34 / 42), where
keeping the number is a fair guess at intent. Across competitions it is
meaningless — the cup's round 2 is October and LaLiga's round 2 was August — so
coming back from an 8-round ladder dropped the reader on a month-old round
instead of the live one.

⚠ Not a lint regression: the `set-state-in-effect` error in this file
disappeared with the rewrite, so the screen now carries one pre-existing error
rather than two.

## Consequences

- The `.ics` snapshot and `webcal://` mechanics are unchanged; the sheet gets its
  own `sheetAllowedDetents: [0.72]` because it is taller by a control and a
  longer body, rather than moving every sheet's detent.
- ⚠ `googleAddUrl` here takes the **webcal** form already, unlike the web app's
  same-named function which converts internally. Copy-pasting that one would
  double-convert and reinstate the `cid` bug both files warn about. Harnessed.
- `matchdays.addAll(n)` keeps its count in the sheet's title; the pill says
  `Calendar` / `Calendario`, the club page's noun, so one word means one thing.
- A cold deep link to `calendar-ucl` opens the sheet over the Today board. Only
  reachable by URL — readers arrive via the pill — but noted.

## Alternatives considered

- **Keep the outline button, cup only** — leaves the SPEC §2 conflict and puts
  two idioms in one slot on one screen.
- **A neutral (non-lime) pill or text line** — built first, and it read as a
  label. Ed reversed it on sight.
- **Two affordances on the strip row** — crowds a furniture row, and the knockout
  caveat would have nowhere to live.
- **The competition feed on the Table tab** — that screen is competition-scoped,
  so it fits; but it splits one feature across two tabs.
