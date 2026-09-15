/**
 * The crown's CARD CAROUSEL (ADR 0176) — full-width pages that swipe
 * horizontally, with the dots below as the only "there are more" disclosure.
 * It replaces `CardDeck`'s stack (ADR 0113/0126): the board can wear a
 * league or club background now (ADR 0175), so the cards went back to GLASS —
 * and glass cannot stack (trap 59: anything behind a translucent card ghosts
 * through it; the deck's scrim model was predicated on opacity). Side by
 * side, nothing sits behind a card and the whole problem dissolves.
 *
 * ⚠ This organism knows NOTHING about what a card is: the caller resolves
 * every card's props, renders each page through `renderCard`, and words the
 * one VoiceOver label (ADR 0013 — no data fetching, no card knowledge).
 *
 * ⚠ **Every page stays MOUNTED, always** — a plain `ScrollView` with every
 * card as a direct child, never a windowed `FlatList`. A card's own timers
 * are the only thing on the screen that can observe their moment (NEXT UP's
 * countdown is the canonical case, ADR 0052/0078, traps 21/35), and an
 * off-screen page must still get to fire them.
 *
 * ⚠ **The swipe is a peek, not a preference.** Callers key this organism by
 * the carousel's membership, so any data change remounts it with their own
 * ordering back on page 0. Nothing here persists.
 *
 * ⚠ Only the CURRENT page receives touches and exists for VoiceOver — a card
 * with its own touchables (the live plate's events disclosure) must not take
 * a tap or an a11y focus while off-page (ADR 0126's gating, carried over).
 *
 * ⚠ Snapping deviates from ADR 0129's reel recipe on ONE point: no
 * `pagingEnabled`. Pages are container-width with a `Spacing.four` seam
 * between them (visible only mid-swipe), so the snap interval is width + gap
 * — `pagingEnabled` snaps to the FRAME's width and would drift a gap per
 * page. `snapToInterval` off the MEASURED width (never `Dimensions` — the
 * crown's inner is capped at `MaxContentWidth`) + `disableIntervalMomentum`
 * is one page per swipe; the first render is gated on that measurement so
 * the interval and the drawn pages cannot disagree (0129's rule).
 *
 * ⚠ **No wrap.** A native pager clamps at its ends (ADR 0028's model — the
 * matchday pager disables at the edges rather than wrapping); the deck's
 * wrap-around retires with the stack, and the edge bounce is the honest "no
 * further" the wrap could never give.
 *
 * ⚠ Reduce Motion: the swipe itself is direct manipulation and stays (ADR
 * 0113/0118's rule); only PROGRAMMATIC scrolls — the VoiceOver actions —
 * drop their animation. There is not a single worklet in here: the native
 * scroll owns arbitration against the page's vertical scroll, which is the
 * whole `activeOffsetX`/`failOffsetY` dance of the deck, for free.
 */
import { useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { StepDots } from '@/components/molecules';
import { Spacing } from '@/constants/theme';
import { hapticShuffle } from '@/lib/haptics';

export interface CardCarouselProps<T extends { id: string }> {
  /** Fully-resolved cards, the caller's order. Never fewer than two. */
  cards: readonly T[];
  /** One page's content. `isTop` is for content only the current page shows. */
  renderCard: (card: T, ctx: { isTop: boolean }) => ReactNode;
  /**
   * ⚠ The carousel is ONE VoiceOver stop, like the single card's pairing —
   * and the label must carry what collapsing hides: the pairing, the fact
   * the card leads with, and the position the decorative dots only draw.
   */
  label: (lead: T, position: number, total: number) => string;
  /** The spoken names of the paging actions — `copy.today.deckNext` etc. */
  actions: { next: string; previous: string; activate?: string };
  /**
   * The `activate` accessibility action, offered only when `actions.activate`
   * names it — the live carousel's route to the current page's events toggle,
   * which the merged stop would otherwise bury (ADR 0126). Handed the
   * current card.
   */
  onActivate?: (lead: T) => void;
  /**
   * Fired once per page change, with the NEW page's id, when the scroll
   * SETTLES — never mid-drag (ADR 0126's commit rule: a reflow under a
   * moving finger is worse than a tall card in flight). The live carousel
   * collapses its open events panel here.
   */
  onSettle?: (topId: string) => void;
  /**
   * Whether the container is one merged VoiceOver stop (the default). The
   * live carousel un-merges while an events panel is open so its rows are
   * explorable; off-screen pages stay hidden either way.
   */
  merged?: boolean;
}

export function CardCarousel<T extends { id: string }>({
  cards,
  renderCard,
  label,
  actions,
  onActivate,
  onSettle,
  merged = true,
}: CardCarouselProps<T>) {
  const n = cards.length;
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);

  /** The current page — the dots, the touch gating and the VoiceOver label. */
  const [page, setPage] = useState(0);
  /** The container's measured width — the pages' width, and the interval's. */
  const [width, setWidth] = useState(0);
  const interval = width + Spacing.four;

  /**
   * The one place a page change lands: state, haptic, caller — deduped by
   * the equality guard, because three paths can report the same settle (the
   * momentum end, the zero-velocity drag end, and the one that trails a
   * programmatic animated scroll).
   */
  const commit = (next: number) => {
    if (next === page) return;
    setPage(next);
    // ⚠ The tick marks the PAGE SETTLING — the native pager's idiom. The
    // deck ticked when the card cleared the viewport; a snap has no card in
    // flight, so the settle is the moment the reader's swipe "took".
    void hapticShuffle();
    onSettle?.(cards[next].id);
  };

  const settled = (x: number) => {
    if (width <= 0) return;
    commit(Math.max(0, Math.min(n - 1, Math.round(x / interval))));
  };

  /** The VoiceOver actions' pager — clamped no-op at the ends (ADR 0028). */
  const goTo = (next: number) => {
    const to = Math.max(0, Math.min(n - 1, next));
    if (to === page) return;
    // ⚠ Flightless under Reduce Motion; the commit is immediate either way,
    // and the trailing momentum event (animated only) dedupes in `commit`.
    scrollRef.current?.scrollTo({ x: to * interval, animated: !reduceMotion });
    commit(to);
  };

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'activate') {
      onActivate?.(cards[page]);
      return;
    }
    if (name !== 'increment' && name !== 'decrement') return;
    goTo(page + (name === 'increment' ? 1 : -1));
  };

  const onDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // ⚠ The zero-velocity release ONLY: a release already resting on a snap
    // point starts no momentum, so `onMomentumScrollEnd` never fires and this
    // is the settle. Any real velocity hands off to the momentum end — the
    // offset HERE is wherever the finger left it, not where the snap lands.
    if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) {
      settled(e.nativeEvent.contentOffset.x);
    }
  };

  return (
    <View>
      <View
        accessible={merged}
        accessibilityLabel={merged ? label(cards[page], page + 1, n) : undefined}
        accessibilityActions={[
          { name: 'increment', label: actions.next },
          { name: 'decrement', label: actions.previous },
          ...(actions.activate !== undefined
            ? [{ name: 'activate', label: actions.activate }]
            : []),
        ]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            snapToAlignment="start"
            disableIntervalMomentum
            decelerationRate="fast"
            // ⚠ Belt and braces on the mounted-pages contract — the default,
            // stated because it is load-bearing (see the header).
            removeClippedSubviews={false}
            onMomentumScrollEnd={(e) => settled(e.nativeEvent.contentOffset.x)}
            onScrollEndDrag={onDragEnd}
            contentContainerStyle={styles.track}>
            {cards.map((card, i) => (
              <View
                key={card.id}
                style={{ width }}
                // ⚠ Off-page cards take no touches and are no VoiceOver
                // stops — the live plate's peeking disclosure must neither
                // catch a tap nor read as a stop when the container
                // un-merges (ADR 0126).
                pointerEvents={i === page ? 'auto' : 'none'}
                accessibilityElementsHidden={i !== page}
                importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
                {renderCard(card, { isTop: i === page })}
              </View>
            ))}
          </ScrollView>
        ) : (
          // Pre-measurement, card 0 sits in flow at the same width the page
          // will have — the first paint is already carousel-shaped, and the
          // interval cannot disagree with pages that are not yet drawn.
          renderCard(cards[0], { isTop: true })
        )}
      </View>
      <View style={styles.dots}>
        <StepDots variant="dot" count={n} active={page} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** The seam between pages — visible only mid-swipe; the interval's other term. */
  track: { gap: Spacing.four },
  dots: { marginTop: Spacing.three, alignItems: 'center' },
});
