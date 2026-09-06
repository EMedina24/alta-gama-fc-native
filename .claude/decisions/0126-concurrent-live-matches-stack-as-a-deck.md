# 0126 — Concurrent live matches stack as a deck

- **Date:** 2026-09-06
- **Status:** Accepted
- **Decided by:** Ed (asked for the stack — "just like the up-coming cards"; picked tier merge, global earliest-kickoff order, and top-card-only events when asked)
- **Amends:** [0066](./0066-live-card-reads-the-live-route-directly.md) / [0078](./0078-kicked-off-lead-card.md) — the tiers MERGE now, they no longer cascade to a single winner · [0088](./0088-live-match-is-the-crown-payload.md) — the payload may be a deck of plates · [0113](./0113-same-day-next-up-deck.md) — the deck mechanics are extracted and shared

## Context

Every live selector returned ONE winner — `routeLive` `playing[0]`, `kickedOff`
`held[0]`, `boardLive` a single `BoardLive | null` — and the screen cascaded
them: route wins outright, else kicked-off, else sweep. With two followed
matches in play at once the second was **invisible until full time**: the
cascade recreated 0078's vanishing-match bug one level up (match A live on the
route hides match B thirty seconds past its whistle), and a followed
Premier-League club's sweep-flagged match was hidden for as long as ANY LaLiga
match was live. Ed asked for the in-progress cards to stack like the NEXT UP
deck (0113).

## Decision

**The tiers merge.** New `boardLives()` in `lib/cronogol/live.ts` returns
`BoardLive[]`: `routeLive` ∪ `kickedOff` ∪ `boardLive` (all pluralized —
`liveFixture` in `board.ts` became `liveFixtures`), deduped by fixture id with
the higher tier winning. ⚠⚠ The route-vs-kickoff dedupe is load-bearing:
`seenLive` is written in an effect AFTER render, so on the render where a
fixture's first live row appears it satisfies both tiers at once. The sweep
tier keeps the old `finished ?? recent` window preference as
first-occurrence-wins over the concatenated windows. Each card keeps its own
`source` → note, so a mixed deck stays honest per-card — that is what makes
the union safe to show.

**Order is GLOBAL earliest kickoff** (Ed's pick over freshest-tier-first): one
rule, the same one three docblocks already gave — the match that started first
is furthest along. A stale sweep card that kicked off first outranks a fresher
route card; the other is one swipe away. Ties keep tier order (route >
kickoff > sweep) by concat + stable sort. Harness-proven (19 assertions,
including `boardLives(...)[0]` ≡ the old cascade's winner in every
single-match scenario).

**The stack is 0113's, extracted.** New `organisms/card-deck.tsx` holds the
mechanics VERBATIM — gesture thresholds, springs, depth worklets, fixed
measured height, haptic sentinel, dots, one-VoiceOver-stop + actions, hidden
layers mounted — behind a generic `CardDeck<T extends {id}>` with `renderCard`
/ `label` / `actions` props; `NextUpDeck` is now a thin wrapper (public API
unchanged) and new `organisms/live-deck.tsx` is the live one. Tuning the deck
tunes both. Two additions, no-ops for NEXT UP: waiting layers take NO touches
(`pointerEvents` — a peeking disclosure strip must not toggle a hidden card's
panel) and are hidden from VoiceOver; `onShuffle` fires after a commit.

**Waiting cards show through a lead-sized, bottom-aligned WINDOW.** Found on
the simulator's first pass: 0113's geometry assumes equal-height cards, and
live plates are NOT — a sweep card carries `FeedAge` plus a longer note, a
kicked-off card has no disclosure — so a taller waiting card's own content
hung out below the lead (its disclosure strip and note fully readable under
the deck) while a shorter one vanished behind it entirely, dots aside. Each
waiting layer now renders inside `height: leadHeight, overflow: hidden` with
its content translated so its BOTTOM sits on the window's; the depth-1
riser's window morphs to the card's true height in step with the drag; the
container is sized by the LEAD (`leadHeight + peek·(drawn−1)`), not the
tallest card, so the body below moves only at a commit — the same moment it
moves when the events panel opens. ⚠ For equal heights every term collapses
to 0113's exact math (`1−s(t) = (1−s₁)(1−t)`), which is why NEXT UP renders
pixel-identically — verified against `?only=next-deck` before and after.

**The screen renders `boards`:** two-plus → `LiveDeck` (keyed by membership —
NO zone term, and a kickoff→route upgrade keeps its id so the card upgrades
in place without resetting the shuffle); one → the solo `LivePlate` exactly as
before; none → the NEXT UP branch. LAST RESULT suppresses on `boards.length
=== 0` now.

**Opaque plates by construction, not calibration.** `LivePlate` gains
`surface: 'glass' | 'opaque'` (0113's prop on `NextUpCard`, for 0113's
reason — `plateDark` is 80% paint, not a wall, and a translucent card under
the deck scrim re-opens trap 59). The opaque ground is NOT a new sampled hex:
it is `DeckGround` (the crown baked, already screenshot-calibrated for this
exact payload slot) under a fill of the plate's own `plateDark` — the same
composite the glass plate produces live, produced once. Zero new theme tokens.

**One events panel, on the lead only** (Ed's pick over suppressing it while
stacked). `LivePlate` takes an optional controlled pair
`eventsOpen`/`onToggleEvents` (falls back to its own state — the solo path is
untouched); `LiveDeck` holds `openId`, collapses it on every shuffle COMMIT
(never mid-drag), and expansion re-measures through the deck's height path so
the crown grows exactly as the solo plate grows. VoiceOver reaches the toggle
through a new `activate` action; while a panel is open the deck un-merges its
stop so the timeline's rows are explorable.

## Consequences

- Two live matches are both on the board within a swipe; the cost is the deck
  chrome (dots, peeks) appearing on matchdays with concurrent kickoffs.
- `routeLive`/`kickedOff`/`boardLive` return arrays now — their only consumer
  was the screen, but any future caller must not assume a single winner.
- A sweep card can LEAD over a live route card when it kicked off first —
  accepted deliberately; the revisit lever is the sort's tie-break, two lines.
- The deck mechanics live in one place; a tuning change cannot drift the two
  decks apart, and a third deck (finished? news?) is a wrapper away — 0070's
  carousel objection still applies to anything whose top card hides what a
  reader needs.
- Multiple mounted plates cost no extra requests: route cards carry
  `suppliedEvents`, and `MatchEvents` mounts only after a disclosure opens.

## Alternatives considered

- **Stack only the winning tier** — smaller change, but keeps both vanishing
  cases (whistle-gap and cross-league) that are the feature's point.
- **Freshest tier first, then kickoff** — preserves today's lead exactly;
  rejected for two ordering rules where one does.
- **Suppress the events disclosure while stacked** — much simpler (no
  controlled state, no a11y un-merge); rejected: it removes the timeline
  exactly when the most football is happening.
- **A new calibrated `plateOpaque` hex** — the planned route; superseded
  mid-build by the `DeckGround` + `plateDark` composite, which is equivalent
  by construction and needs no screenshot round to stay honest.
- **Duplicate the deck as `LivePlateDeck`** — two drifting copies of the
  app's most delicate tuned code; extraction kept the call sites byte-stable.

## Verification

Selector harness (19 assertions, plain node, `run-repo-ts-in-plain-node`
pattern); `tsc` clean; lint at the 6-error baseline; `expo export` clean;
`?only=live-deck` gallery (four cases: two-route, route+kicked-off,
route+sweep, three cards) plus `?only=live` and `?only=next-deck` as
regressions of the untouched paths, screenshot-verified on the simulator;
shuffle/spring-back/peek-tap by scripted drag. ⚠ Haptic feel, VoiceOver
actions, Reduce Motion and a real multi-live matchday are BY HAND on device.
