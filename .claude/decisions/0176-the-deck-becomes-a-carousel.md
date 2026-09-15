# 0176 — The deck becomes a carousel: glass pages side by side, dots below

- **Date:** 2026-09-14
- **Status:** Accepted — `tsc`/lint clean; STATIC rendering simulator-verified
  via the gallery (`?only=next-deck`: glass pages over the ground, 2/3/5-dot
  rows, page 0 leading). ⚠ The SWIPE itself — paging, snap, settle haptic,
  events-panel collapse, the clamped ends — is **not hand-verified**: scripted
  touch verification was abandoned mid-session when the synthetic events were
  found landing in Ed's editor window in front of the Simulator. VoiceOver
  actions and Reduce Motion also unchecked. First hands-on pass should sweep
  all of these.
- **Decided by:** Ed — *"because the cards are now transparent, let's move
  away from the stacking when there are multiple 'next up' — instead let's
  just make it a carousel with a small indicator just below the cards."*
  Two calls asked and answered before building: **both** decks migrate (the
  live deck shares the mechanism and the same opaque-over-tinted-crown
  problem), and pages are **full-width** (each card identical to the
  single-card layout; the dots are the only "more exist" disclosure).
- **Amends:** [0113](./0113-same-day-next-up-deck.md) — its explicit
  *rejection* of a pager ("nothing peeks… wrap-around is dishonest at the
  edges. The deck IS the design") is reversed by the premise ADR 0175
  changed: cards are glass again, and glass cannot stack (trap 59). Its
  membership-key reset and every-card-mounted rules SURVIVE unchanged ·
  [0126](./0126-concurrent-live-matches-stack-as-a-deck.md) — the stack
  mechanics retire; the tier union, one-panel-on-the-lead, collapse-on-
  commit and the `activate` action survive · [0096](./0096-next-up-goes-liquid-glass.md)
  — liquid glass is the ONLY surface again; 0113's opaque deviation retires.
- **Follows:** [0175](./0175-the-board-wears-the-readers-background.md) (the
  premise), [0028](./0028-matchday-pager.md) (the no-wrap model),
  [0129](./0129-news-reel.md) (the snap recipe), [0013](./0013-atomic-design-components.md).

## Context

ADR 0175 let the board wear a league or club crown. The decks forced
`surface="opaque"` with `DeckGround` — the **brand** crown, baked — because
stacked glass ghosts (trap 59); over a tinted crown that bake paints the
wrong light. Ed saw the transparent single card over his club background and
asked for the stack to go. Side by side, nothing sits behind a card and the
whole opacity apparatus loses its reason.

## Decision

1. **`CardCarousel` replaces `CardDeck`, same contract.** Generic organism
   (`src/components/organisms/card-carousel.tsx`) with CardDeck's exact
   props except `onShuffle` → `onSettle(topId)` — fired on page settle,
   never mid-drag (0126's commit rule, kept). `renderCard(card, {isTop})`,
   `label`, `actions`, `onActivate`, `merged` all carry over, so the
   wrappers are near-diffs. `card-deck.tsx` is deleted.

2. **A plain `ScrollView`, snapped by interval — not `pagingEnabled`, not a
   `FlatList`.** Every page is a direct child: **virtualization would unmount
   an off-screen card and its countdown is the only observer of its kickoff**
   (ADR 0052/0078, traps 21/35). Pages are container-width (measured by
   `onLayout` — the crown's inner caps at `MaxContentWidth`, so never
   `Dimensions`; first render gated on the measurement, 0129's rule) with a
   `Spacing.four` seam, so `snapToInterval = width + gap` — `pagingEnabled`
   snaps to the frame and would drift one gap per page, the one deviation
   from 0129's recipe. `disableIntervalMomentum` + `decelerationRate="fast"`
   = one page per swipe. **No Reanimated anywhere**: the native scroll owns
   arbitration against the vertical page — the deck's `activeOffsetX`/
   `failOffsetY` dance, for free.

3. **No wrap.** The deck wrapped because a stack has no edges; a pager has
   honest ones (ADR 0028's ends-clamped model). The edge bounce is the "no
   further" the wrap could never say.

4. **Heights by flexbox, zero measurement.** The row is as tall as its
   tallest page; the deck's heights/lead-window/scrim/HapticSentinel
   machinery is deleted, not ported. The live events panel growing the
   current page grows the row exactly as the solo plate grows the crown.

5. **Page detection dedupes through one `commit`.** `onMomentumScrollEnd`
   (`clamp(round(x/interval))`), an `onScrollEndDrag` fallback for the
   zero-velocity release that starts no momentum, and the momentum-end that
   trails a programmatic animated scroll all funnel into `commit(next)`,
   guarded by `next === page`. `hapticShuffle()` fires there, once per
   change — the tick moves from "card clears the viewport" (a stack idiom)
   to "the page settles" (the pager's).

6. **A11y verbatim.** One merged VoiceOver stop (`label(lead, pos, total)`),
   increment/decrement (+ optional `activate`) actions; actions drive
   `scrollTo({animated: !reduceMotion})` + immediate commit; off-page cards
   take no touches and are no VoiceOver stops (`pointerEvents`,
   `accessibilityElementsHidden`, `importantForAccessibility` gated on the
   page). `copy.today.deckOf/deckNext/deckPrevious` unchanged in both
   languages. `StepDots variant="dot"` below, decorative, as the deck drew.
   Reduce Motion: the swipe is direct manipulation and stays; only
   programmatic scrolls drop their animation.

7. **The opaque apparatus retires with the stack.** `surface` prop + opaque
   branches deleted from `NextUpCard` and `LivePlate` (glass is the only
   surface); `Deck` and `DeckGround` deleted from theme.ts;
   `ClubWash2.edge/mid` (the full alphas) and `Colors.dark.washInk` retire
   with the full-alpha wash they existed for (`washRing`/`washBadge` stay —
   `VersusBadge` reads them). `Glide` becomes the canonical home of the
   10/8 gesture thresholds it had mirrored "for the deck's reason".

8. **Wrappers renamed** — `next-up-carousel.tsx` (`NextUpCarousel`,
   `CarouselCard`) and `live-carousel.tsx` (`LiveCarousel`,
   `LiveCarouselCard`, its Omit no longer lists `surface`). Mount-site keys
   in `(tabs)/index.tsx` are byte-identical: membership remount = page 0 =
   soonest kickoff (0113's peek-not-preference), live key deliberately
   zone-free. Gallery keeps the `?only=next-deck` / `?only=live-deck` param
   names — saved deep links, not descriptions.

## Rejected

- **A FlatList carousel** — virtualization vs the mounted-countdown contract.
- **`pagingEnabled`** — snaps to frame width; the seam needs interval = width + gap.
- **Neighbor-peek pages** — Ed chose full-width; the lead must match the
  single-card layout exactly, and the dots carry the disclosure.
- **Porting the wrap** — a pager's edges are honest; faking a wrap with
  content tricks buys nothing the dots don't already say.
- **A scroll-linked animated dot** — `StepDots` takes a discrete index; a
  fractional dot is polish with a worklet cost this row doesn't need.
