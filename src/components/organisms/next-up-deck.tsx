/**
 * The NEXT UP DECK (ADR 0113): every same-day fixture of a followed club,
 * stacked in the crown where the single card stands today. A horizontal swipe
 * shuffles the top card to the back (wrap-around, either direction); waiting
 * layers peek `Deck.peek` below the lead, `Deck.inset` narrower per side.
 *
 * ⚠⚠ **Deck cards are OPAQUE (`surface="opaque"`), and that is load-bearing.**
 * Anything behind a GLASS card shows through it — text ghosts, featureless
 * fills glow (trap 59) — which had forced the waiting layers down to
 * near-black slivers that read as a pasted slab. On an opaque lead the
 * waiting cards are simply VISIBLE, real cards dimmed by a scrim that fades
 * off the next one as the drag reveals it — the approved mock's exact look.
 * The single NEXT UP card keeps its liquid glass (ADR 0096); opacity is the
 * deck's own deviation, recorded in ADR 0113.
 *
 * ⚠ **Every card stays MOUNTED, always — hidden layers go to opacity 0, never
 * unmount.** A card's own `Countdown` is the only thing on the screen that can
 * observe its kickoff (ADR 0052/0078, traps 21/35), and a hidden card whose
 * match kicks off must still announce it so the crown hands over to the live
 * tiers. The cost is one wall-second tick per card, each re-rendering only its
 * own countdown row.
 *
 * ⚠ **The shuffle is a peek, not a preference.** The screen keys this organism
 * by the deck's membership, so any data change remounts it with the soonest
 * kickoff back on top. Nothing here persists.
 *
 * ⚠ Visual depth is driven by `topSV` (a shared value) so the commit — new
 * depths and the drag reset — lands on the UI thread in one batch; the React
 * `top` state feeds only the dots, the lead shadow and the VoiceOver label.
 * Writing both from `commitTop` keeps them in step without an effect (the
 * screen's six-lint-errors rule).
 *
 * ⚠ The pan activates at `Deck.activateX` horizontal and FAILS at `Deck.failY`
 * vertical — a mostly-vertical drag falls through to the scaffold's scroll,
 * which is what lets the crown still scroll away with the page. This is the
 * app's first gesture inside a scroll view.
 *
 * ⚠ No data fetching (ADR 0013): the screen resolves every card's props; this
 * organism only stacks, animates and counts.
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
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
import { NextUpCard, type NextUpCardProps } from './next-up-card';

/** One fully-resolved card — exactly what the screen hands `NextUpCard`. */
export interface DeckCard extends Omit<NextUpCardProps, 'copy'> {
  /** The fixture's own id — layer identity, and half the caller's reset key. */
  id: string;
}

export interface NextUpDeckProps {
  /** Same-day cards, soonest first. The screen never sends fewer than two. */
  cards: readonly DeckCard[];
  copy: NextUpCardProps['copy'] & {
    deckOf: (position: number, total: number) => string;
    deckNext: string;
    deckPrevious: string;
  };
}

export function NextUpDeck({ cards, copy }: NextUpDeckProps) {
  const n = cards.length;
  const drawn = Math.min(n, Deck.layers);
  const reduceMotion = useReducedMotion();

  /**
   * `top` is the index of the card currently leading the deck. React state for
   * the dots/shadow/label; `topSV` mirrors it for the worklets — see the
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
  /** Every card's natural height, by id; the tallest sizes the stack. */
  const [heights, setHeights] = useState<Record<string, number>>({});
  const measured = cardWidth > 0 && cards.every((card) => heights[card.id] !== undefined);
  const maxHeight = measured ? Math.max(...cards.map((card) => heights[card.id])) : 0;

  const commitTop = (dir: 1 | -1) => {
    const next = (top + dir + n) % n;
    void hapticShuffle();
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
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-Deck.activateX, Deck.activateX])
    .failOffsetY([-Deck.failY, Deck.failY])
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
        runOnJS(commitTop)(dir);
        return;
      }
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
    if (name === 'increment') commitTop(1);
    else if (name === 'decrement') commitTop(-1);
  };

  const lead = cards[top];

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View
          accessible
          // ⚠ The deck is ONE VoiceOver stop, like the single card's pairing —
          // and the label carries what collapsing hides: the pairing, the
          // kickoff, and the position the decorative dots only draw.
          accessibilityLabel={[
            `${lead.home.name} v ${lead.away.name}`,
            lead.kickoffTbd ? copy.tbd : `${lead.dateLabel} ${lead.kickoffLabel}`,
            copy.deckOf(top + 1, n),
          ].join(', ')}
          accessibilityActions={[
            { name: 'increment', label: copy.deckNext },
            { name: 'decrement', label: copy.deckPrevious },
          ]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
          // ⚠ FIXED height once measured — the body below never reflows, mid-
          // swipe or after. Until then the first card sits in flow with the
          // peeks as padding, so the first paint is already deck-shaped.
          style={measured ? { height: maxHeight + Deck.peek * (drawn - 1) } : null}>
          {cards.map((card, i) => (
            <DeckLayer
              key={card.id}
              index={i}
              count={n}
              topSV={topSV}
              dragX={dragX}
              jumped={jumped}
              backFade={backFade}
              cardWidth={cardWidth}
              cardHeight={heights[card.id] ?? 0}
              flowPadding={!measured && i === 0 ? Deck.peek * (drawn - 1) : null}
              onHeight={(h) =>
                setHeights((prev) => (prev[card.id] === h ? prev : { ...prev, [card.id]: h }))
              }>
              <NextUpCard {...card} surface="opaque" copy={copy} />
            </DeckLayer>
          ))}
        </View>
      </GestureDetector>
      <View style={styles.dots}>
        <StepDots variant="dot" count={n} active={top} />
      </View>
    </View>
  );
}

/**
 * One layer of the stack. Its own component so each card's animated styles are
 * hooks at the top level — depth is computed INSIDE the worklets from `topSV`,
 * which is what lets a commit change every layer in one UI-thread batch.
 */
function DeckLayer({
  index,
  count,
  topSV,
  dragX,
  jumped,
  backFade,
  cardWidth,
  cardHeight,
  flowPadding,
  onHeight,
  children,
}: {
  index: number;
  count: number;
  topSV: SharedValue<number>;
  dragX: SharedValue<number>;
  jumped: SharedValue<number>;
  backFade: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  /** Pre-measurement only: the first card sizes the stack from the flow. */
  flowPadding: number | null;
  onHeight: (height: number) => void;
  children: ReactNode;
}) {
  const wrapperStyle = useAnimatedStyle(() => {
    const depth = (index - topSV.value + count) % count;
    const w = cardWidth;
    const scaleFor = (d: number): number => (w > 0 ? 1 - (d * 2 * Deck.inset) / w : 1);
    // Centre-origin scaling lifts the bottom edge by h·(1−s)/2; the translate
    // puts it back, then adds the peek — each layer's bottom sits Deck.peek
    // below the one above it.
    const yFor = (d: number): number =>
      d * Deck.peek + (cardHeight * (1 - scaleFor(d))) / 2;
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
      // its scrim (below) fades off in step.
      const t = w > 0 ? Math.min(1, Math.abs(dragX.value) / (w * Deck.commitFraction)) : 0;
      const s1 = scaleFor(1);
      return {
        zIndex: count - 1,
        opacity: fade,
        transform: [{ translateY: yFor(1) * (1 - t) }, { scale: s1 + (1 - s1) * t }],
      };
    }
    return {
      zIndex: count - depth,
      // ⚠ Depth `Deck.layers`+ is invisible but MOUNTED — the countdowns;
      // see the header.
      opacity: depth >= Deck.layers ? 0 : fade,
      transform: [{ translateY: yFor(depth) }, { scale: scaleFor(depth) }],
    };
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
      style={[
        flowPadding === null ? styles.layer : { paddingBottom: flowPadding },
        wrapperStyle,
      ]}
      // ⚠ Minus the flow padding — pre-measure, the first card's wrapper
      // carries the peeks as padding, and recording it would tell the stack
      // the card is taller than it is.
      onLayout={(e) => onHeight(e.nativeEvent.layout.height - (flowPadding ?? 0))}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
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
