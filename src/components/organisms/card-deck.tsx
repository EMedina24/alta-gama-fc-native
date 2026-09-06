/**
 * The crown's CARD DECK — the stack-and-shuffle mechanics behind NEXT UP's
 * same-day deck (ADR 0113), extracted verbatim when the live plates needed the
 * identical stack (ADR 0126). A horizontal swipe shuffles the top card to the
 * back (wrap-around, either direction); waiting layers peek `Deck.peek` below
 * the lead, `Deck.inset` narrower per side.
 *
 * ⚠ This organism knows NOTHING about what a card is: the caller resolves
 * every card's props, renders each layer through `renderCard`, and words the
 * one VoiceOver label. What lives here is the delicate part — the gesture, the
 * springs, the depth worklets, the haptic arming — precisely so it exists
 * ONCE. Tuning it tunes every deck.
 *
 * ⚠ **Every card stays MOUNTED, always — hidden layers go to opacity 0, never
 * unmount.** A card's own timers are the only thing on the screen that can
 * observe their moment (NEXT UP's countdown is the canonical case, ADR
 * 0052/0078, traps 21/35), and a hidden card must still get to fire them.
 *
 * ⚠ **The shuffle is a peek, not a preference.** Callers key this organism by
 * the deck's membership, so any data change remounts it with their own
 * ordering back on top. Nothing here persists.
 *
 * ⚠ Only the TOP layer receives touches (`pointerEvents`). A waiting card's
 * bottom strip peeks out under the lead, and a card with its own touchables —
 * the live plate's events disclosure — must not take a tap meant for the page
 * (ADR 0126). The gesture itself lives on the container, so the shuffle never
 * needed the waiting layers to be live.
 *
 * ⚠ Visual depth is driven by `topSV` (a shared value) so the commit — new
 * depths and the drag reset — lands on the UI thread in one batch; the React
 * `top` state feeds only the dots, the touch gating and the VoiceOver label.
 * Writing both from `commitTop` keeps them in step without an effect (the
 * screen's six-lint-errors rule).
 *
 * ⚠ The pan activates at `Deck.activateX` horizontal and FAILS at `Deck.failY`
 * vertical — a mostly-vertical drag falls through to the scaffold's scroll,
 * which is what lets the crown still scroll away with the page. This is the
 * app's first gesture inside a scroll view.
 *
 * ⚠ No data fetching (ADR 0013): this organism only stacks, animates and
 * counts.
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { StepDots } from '@/components/molecules';
import { Deck, Motion, Radius, Spacing } from '@/constants/theme';
import { hapticShuffle } from '@/lib/haptics';

export interface CardDeckProps<T extends { id: string }> {
  /** Fully-resolved cards, the caller's order. Never fewer than two. */
  cards: readonly T[];
  /** One layer's content. `isTop` is for content that only the lead shows. */
  renderCard: (card: T, ctx: { isTop: boolean }) => ReactNode;
  /**
   * ⚠ The deck is ONE VoiceOver stop, like the single card's pairing — and
   * the label must carry what collapsing hides: the pairing, the fact the
   * card leads with, and the position the decorative dots only draw.
   */
  label: (lead: T, position: number, total: number) => string;
  /** The spoken names of the shuffle actions — `copy.today.deckNext` etc. */
  actions: { next: string; previous: string; activate?: string };
  /**
   * The `activate` accessibility action, offered only when `actions.activate`
   * names it — the live deck's route to the lead's events toggle, which the
   * merged stop would otherwise bury (ADR 0126). Handed the current lead.
   */
  onActivate?: (lead: T) => void;
  /**
   * Fired from `commitTop` with the NEW lead's id — after the swap, in the
   * same JS task. The live deck collapses its open events panel here; a
   * caller with nothing to reset omits it.
   */
  onShuffle?: (topId: string) => void;
  /**
   * Whether the container is one merged VoiceOver stop (the default). The
   * live deck un-merges while an events panel is open so its rows are
   * explorable; the waiting layers stay hidden either way (`DeckLayer`).
   */
  merged?: boolean;
}

export function CardDeck<T extends { id: string }>({
  cards,
  renderCard,
  label,
  actions,
  onActivate,
  onShuffle,
  merged = true,
}: CardDeckProps<T>) {
  const n = cards.length;
  const drawn = Math.min(n, Deck.layers);
  const reduceMotion = useReducedMotion();

  /**
   * `top` is the index of the card currently leading the deck. React state for
   * the dots/touch-gating/label; `topSV` mirrors it for the worklets — see the
   * header on why both.
   */
  const [top, setTop] = useState(0);
  const topSV = useSharedValue(0);
  const dragX = useSharedValue(0);
  /**
   * The one card that FADES in after a commit: the back card taking centre
   * stage on a backward shuffle (three-plus deck). Everything landing in a
   * peek appears instantly — see `commitTop`.
   */
  const jumped = useSharedValue(-1);
  const backFade = useSharedValue(1);

  /** The stack box's width — the cards' width, and the gesture's yardstick. */
  const [cardWidth, setCardWidth] = useState(0);
  /** Every card's natural height, by id; the LEAD's sizes the stack. */
  const [heights, setHeights] = useState<Record<string, number>>({});
  const measured = cardWidth > 0 && cards.every((card) => heights[card.id] !== undefined);
  /**
   * ⚠ The lead's height, not the tallest: cards of DIFFERENT heights are the
   * live deck's normal state (a sweep card carries `FeedAge` and a longer
   * note; a kicked-off card has no disclosure), and sizing by the tallest
   * left a taller WAITING card's content hanging below the lead — seen on
   * the simulator, ADR 0126. Each waiting layer instead shows through a
   * lead-sized, bottom-aligned window (`DeckLayer`), so the peeks stay
   * `Deck.peek` strips whatever the cards' own heights are. Equal-height
   * decks (NEXT UP) render pixel-identically to the pre-0126 math.
   */
  const leadHeight = measured ? heights[cards[top].id] : 0;

  /**
   * The haptic marks the card LEAVING THE VIEWPORT, not the deck swapping —
   * the swap lands a spring-tail later and ticking there read as "the haptic
   * happens when the card resets to the bottom of the queue" (Ed). Armed in
   * the commit path only — and disarmed on every fresh grab — so an aborted
   * swipe never ticks; the `HapticSentinel` below the layers fires it the
   * frame the card clears the far gutter.
   */
  const hapticArmed = useSharedValue(false);
  const fireHaptic = () => {
    void hapticShuffle();
  };

  const commitTop = (dir: 1 | -1) => {
    const next = (top + dir + n) % n;
    // ⚠ Only the BACKWARD shuffle's incoming top fades (a card popping onto
    // centre stage jars); everything landing in a PEEK appears instantly —
    // a fade there read as the below card arriving late (Ed). Two-card decks
    // fade nothing: "previous" is the depth-1 riser, already visible.
    const jumps = dir === -1 && n > 2 ? next : -1;
    jumped.value = jumps;
    if (reduceMotion || jumps === -1) {
      backFade.value = 1;
    } else {
      backFade.value = 0;
      backFade.value = withTiming(1, { duration: Motion.quick });
    }
    // ⚠ Both shared values in the same JS task as the setState, so the UI
    // thread swaps depths and clears the drag in one batch — no frame where
    // the old top snaps back to centre.
    topSV.value = next;
    dragX.value = 0;
    setTop(next);
    onShuffle?.(cards[next].id);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-Deck.activateX, Deck.activateX])
    .failOffsetY([-Deck.failY, Deck.failY])
    .onStart(() => {
      // A fresh grab — possibly seizing a card mid-exit — must not inherit
      // the previous commit's armed tick.
      hapticArmed.value = false;
    })
    .onUpdate((e) => {
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      const commits =
        cardWidth > 0 &&
        (Math.abs(e.translationX) > cardWidth * Deck.commitFraction ||
          Math.abs(e.velocityX) > Deck.flickVelocity);
      if (!commits) {
        // ⚠ Under reduced motion the settle is an assignment, not a spring —
        // the segmented control's rule (ADR 0081).
        if (reduceMotion) dragX.value = 0;
        else dragX.value = withSpring(0, Deck.spring);
        return;
      }
      // Either direction shuffles; left reads as "next", right as "previous".
      const dir: 1 | -1 = e.translationX < 0 ? 1 : -1;
      if (reduceMotion) {
        // No flight — the card is "out" this instant, so the tick is too.
        runOnJS(fireHaptic)();
        runOnJS(commitTop)(dir);
        return;
      }
      hapticArmed.value = true;
      // ⚠ Well past one width: the card is tilted, and at exactly one width
      // a rotated corner hung visibly at the screen edge (seen on device).
      // ⚠ `exitRest`'s loose thresholds land the completion — and with it
      // the deck swap — the moment the card is effectively off-screen,
      // instead of a settle-tail later (the next peek looked late).
      dragX.value = withSpring(
        Math.sign(e.translationX) * cardWidth * Deck.exitFactor,
        { ...Deck.spring, ...Deck.exitRest, velocity: e.velocityX },
        () => {
          runOnJS(commitTop)(dir);
        },
      );
    });

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'activate') {
      onActivate?.(cards[top]);
      return;
    }
    if (name !== 'increment' && name !== 'decrement') return;
    // A flightless commit — the tick lands with it, as on Reduce Motion.
    fireHaptic();
    commitTop(name === 'increment' ? 1 : -1);
  };

  const lead = cards[top];

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View
          accessible={merged}
          accessibilityLabel={merged ? label(lead, top + 1, n) : undefined}
          accessibilityActions={[
            { name: 'increment', label: actions.next },
            { name: 'decrement', label: actions.previous },
            ...(actions.activate !== undefined
              ? [{ name: 'activate', label: actions.activate }]
              : []),
          ]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
          // ⚠ FIXED height once measured — the body below never reflows mid-
          // swipe; it moves only at a COMMIT (a new lead of a different
          // height) or when the lead itself grows (the live plate's events
          // panel re-lands its height through `onHeight`), exactly as the
          // solo card would move it. Until then the first card sits in flow
          // with the peeks as padding, so the first paint is already
          // deck-shaped.
          style={measured ? { height: leadHeight + Deck.peek * (drawn - 1) } : null}>
          {cards.map((card, i) => (
            <DeckLayer
              key={card.id}
              index={i}
              count={n}
              isTop={i === top}
              topSV={topSV}
              dragX={dragX}
              jumped={jumped}
              backFade={backFade}
              cardWidth={cardWidth}
              cardHeight={heights[card.id] ?? 0}
              leadHeight={leadHeight}
              flowPadding={!measured && i === 0 ? Deck.peek * (drawn - 1) : null}
              onHeight={(h) =>
                setHeights((prev) => (prev[card.id] === h ? prev : { ...prev, [card.id]: h }))
              }>
              {renderCard(card, { isTop: i === top })}
            </DeckLayer>
          ))}
          <HapticSentinel
            dragX={dragX}
            armed={hapticArmed}
            threshold={cardWidth + Spacing.five}
            onCross={fireHaptic}
          />
        </View>
      </GestureDetector>
      <View style={styles.dots}>
        <StepDots variant="dot" count={n} active={top} />
      </View>
    </View>
  );
}

/**
 * Fires `onCross` the frame the drag clears `threshold` while `armed` — the
 * card leaving the viewport (one width + one gutter), where the shuffle's
 * haptic belongs. Renders nothing. Its own component for the same reason as
 * `DeckLayer`: a hook capturing the shared values must not live beside the
 * gesture worklets that WRITE them, or `react-hooks/immutability` reads every
 * write as mutating hook state. Rising-edge detection (`out && !was`) keeps
 * the reaction write-free; arming and disarming stay in the gesture.
 */
function HapticSentinel({
  dragX,
  armed,
  threshold,
  onCross,
}: {
  dragX: SharedValue<number>;
  armed: SharedValue<boolean>;
  threshold: number;
  onCross: () => void;
}) {
  useAnimatedReaction(
    () => armed.value && Math.abs(dragX.value) >= threshold,
    (out, was) => {
      if (out && !was) runOnJS(onCross)();
    },
  );
  return null;
}

/**
 * One layer of the stack. Its own component so each card's animated styles are
 * hooks at the top level — depth is computed INSIDE the worklets from `topSV`,
 * which is what lets a commit change every layer in one UI-thread batch.
 *
 * ⚠ `isTop` is the React `top`, not the shared value: touch gating and the
 * VoiceOver tree are JS-thread concerns and swap with the same commit that
 * moves the dots. Waiting layers take no touches and are hidden from
 * VoiceOver — a peeking strip must neither catch a tap nor be read as a
 * stop when the container un-merges.
 *
 * ⚠⚠ **A waiting card shows through a lead-sized, bottom-aligned WINDOW**
 * (ADR 0126). Cards of different heights are the live deck's normal state,
 * and without the window a taller waiting card's own content hung out below
 * the lead while a shorter one vanished behind it entirely. The window —
 * `height: leadHeight`, `overflow: hidden`, content translated so its BOTTOM
 * sits on the window's — makes every waiting layer present as the lead's
 * silhouette peeked `Deck.peek` down, whatever its own height; the depth-1
 * riser's window morphs to the card's true height in step with the drag, so
 * the card it becomes is whole by the commit. ⚠ For equal heights every term
 * collapses to the pre-0126 math — NEXT UP renders pixel-identically.
 */
function DeckLayer({
  index,
  count,
  isTop,
  topSV,
  dragX,
  jumped,
  backFade,
  cardWidth,
  cardHeight,
  leadHeight,
  flowPadding,
  onHeight,
  children,
}: {
  index: number;
  count: number;
  isTop: boolean;
  topSV: SharedValue<number>;
  dragX: SharedValue<number>;
  jumped: SharedValue<number>;
  backFade: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  /** The CURRENT lead's height — every waiting layer's window. */
  leadHeight: number;
  /** Pre-measurement only: the first card sizes the stack from the flow. */
  flowPadding: number | null;
  onHeight: (height: number) => void;
  children: ReactNode;
}) {
  const wrapperStyle = useAnimatedStyle(() => {
    const depth = (index - topSV.value + count) % count;
    const w = cardWidth;
    const scaleFor = (d: number): number => (w > 0 ? 1 - (d * 2 * Deck.inset) / w : 1);
    // The card that jumped on the last commit fades into its new place.
    const fade = index === jumped.value ? backFade.value : 1;

    if (depth === 0) {
      return {
        zIndex: count,
        opacity: fade,
        transform: [
          { translateX: dragX.value },
          {
            rotateZ:
              w > 0
                ? `${interpolate(dragX.value, [-w, w], [-Deck.tiltDeg, Deck.tiltDeg], Extrapolation.CLAMP)}deg`
                : '0deg',
          },
        ],
      };
    }
    if (depth === 1) {
      // The next card rises toward the crown as the drag approaches commit;
      // its scrim (below) fades off in step. The centring compensation reads
      // the layer's CURRENT box — the morphing window — so the bottom edge
      // tracks exactly (1−s(t) falls as (1−s₁)(1−t), the old closed form).
      const t = w > 0 ? Math.min(1, Math.abs(dragX.value) / (w * Deck.commitFraction)) : 0;
      const s1 = scaleFor(1);
      const s = s1 + (1 - s1) * t;
      const boxH = leadHeight + (cardHeight - leadHeight) * t;
      return {
        zIndex: count - 1,
        opacity: fade,
        transform: [{ translateY: (1 - t) * Deck.peek + (boxH * (1 - s)) / 2 }, { scale: s }],
      };
    }
    return {
      zIndex: count - depth,
      // ⚠ Depth `Deck.layers`+ is invisible but MOUNTED — the countdowns;
      // see the header.
      opacity: depth >= Deck.layers ? 0 : fade,
      // Centre-origin scaling lifts the bottom edge by h·(1−s)/2; the
      // translate puts it back, then adds the peek — each layer's bottom
      // sits Deck.peek below the one above it.
      transform: [
        { translateY: depth * Deck.peek + (leadHeight * (1 - scaleFor(depth))) / 2 },
        { scale: scaleFor(depth) },
      ],
    };
  });

  /** The clipping window — the lead's height on every waiting layer. */
  const windowStyle = useAnimatedStyle(() => {
    // Pre-measure there is nothing to clip to; auto height, no window.
    if (cardHeight === 0 || leadHeight === 0) return {};
    const depth = (index - topSV.value + count) % count;
    if (depth === 0) return { height: cardHeight };
    if (depth === 1) {
      const t =
        cardWidth > 0
          ? Math.min(1, Math.abs(dragX.value) / (cardWidth * Deck.commitFraction))
          : 0;
      return { height: leadHeight + (cardHeight - leadHeight) * t };
    }
    return { height: leadHeight };
  });

  /** Bottom-aligns the card in its window; the lead needs no shift. */
  const contentStyle = useAnimatedStyle(() => {
    if (cardHeight === 0 || leadHeight === 0) return {};
    const depth = (index - topSV.value + count) % count;
    if (depth === 0) return { transform: [{ translateY: 0 }] };
    if (depth === 1) {
      const t =
        cardWidth > 0
          ? Math.min(1, Math.abs(dragX.value) / (cardWidth * Deck.commitFraction))
          : 0;
      return { transform: [{ translateY: (leadHeight - cardHeight) * (1 - t) }] };
    }
    return { transform: [{ translateY: leadHeight - cardHeight }] };
  });

  const scrimStyle = useAnimatedStyle(() => {
    const depth = (index - topSV.value + count) % count;
    if (depth === 0) return { opacity: 0 };
    if (depth === 1) {
      const t =
        cardWidth > 0
          ? Math.min(1, Math.abs(dragX.value) / (cardWidth * Deck.commitFraction))
          : 0;
      return { opacity: Deck.scrimNext * (1 - t) };
    }
    return { opacity: Deck.scrimBack };
  });

  return (
    <Animated.View
      pointerEvents={isTop ? 'auto' : 'none'}
      accessibilityElementsHidden={!isTop}
      importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
      style={[
        flowPadding === null ? styles.layer : { paddingBottom: flowPadding },
        wrapperStyle,
      ]}>
      <Animated.View style={[styles.window, windowStyle]}>
        {/* ⚠ Measured HERE — the card's natural height, inside the window
            that clips it, so a forced window height can never feed back
            into the measurement it is derived from. */}
        <Animated.View
          style={contentStyle}
          onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
          {children}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  /**
   * The waiting layers' clipping window (ADR 0126). Rounded so a mid-morph
   * riser's emerging top edge reads as a card's, not a cut; the radius is
   * invisible whenever the window matches the card.
   */
  window: { overflow: 'hidden', borderRadius: Radius.card },
  /**
   * The waiting layers' dimmer — over the whole card, clipped to its
   * corners; opacity is `Deck.scrimNext`/`scrimBack`, fading off the next
   * card as the drag reveals it. Safe ONLY because deck cards are opaque:
   * over glass this exact scrim still ghosted (trap 59).
   */
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.card,
    backgroundColor: Deck.scrimColor,
  },
  dots: { marginTop: Spacing.three, alignItems: 'center' },
});
