/**
 * The Board's body: the reader's cards, in the reader's order — and the mode
 * that lets them change it (ADR 0174; the Medina kit's look since 0199).
 *
 * ⚠⚠ **View mode must be PIXEL-IDENTICAL to the hardcoded stack it replaces.**
 * Each section is wrapped in a `gap: Spacing.four` box and the scaffold's own
 * body already has that gap, so a section that is three siblings (FINISHED
 * TODAY's header, list and footnote) spaces exactly as it did when those three
 * were the body's own children. A wrapper with any other gap — or one that
 * clips — is a silent redesign of the whole screen; every `-Spacing.five` bleed
 * in the fixture rows depends on this box not clipping.
 *
 * ⚠⚠ **The lead card is NOT here.** Live and NEXT UP are the crown's payload
 * (ADR 0088/0095) and are pinned — Ed kept that when adopting the kit (0199).
 *
 * ⚠ **Only what is on screen can be arranged.** The cards are exactly the
 * sections view mode draws — visible AND eligible.
 *
 * ⚠⚠ **Edit mode draws the REAL cards (0199, superseding 0174 §9's rows),** so
 * slots are no longer uniform. The stack is still ABSOLUTELY POSITIONED — at
 * rest a card's top is arithmetic over the PROPS order, which is what lets a
 * drop commit without a flicker — but the arithmetic runs on MEASURED heights
 * (`heights`, fed by each card's `onLayout`). Until every card has reported,
 * the stack holds invisible: for that one frame every card sits at y = 0.
 *
 * ⚠ The editor's other controls — background tiles, Reset, the hidden cards —
 * are the bottom PANEL, published over the page through the scaffold's
 * overlay slot (ADR 0163). The stack pads its end by the panel's height.
 *
 * ⚠ No data fetching, and no knowledge of what a card IS (ADR 0013): the screen
 * hands over rendered nodes.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms';
import { BoardEdit, Spacing } from '@/constants/theme';
import { useScreenOverlay } from '@/hooks/use-screen-overlay';
import { hapticLift, hapticReorder, hapticToggle } from '@/lib/haptics';
import type { BoardCardId } from '@/lib/board-layout';
import { EditCard, topOf, type DragState } from './board-stack/edit-card';
import { EditPanel, type EditPanelTile } from './board-stack/edit-panel';

export type { EditPanelTile } from './board-stack/edit-panel';

export interface BoardSection {
  id: BoardCardId;
  /** The card, already resolved by the screen. Drawn in BOTH modes. */
  node: ReactNode;
  /**
   * What the card is holding right now — `3 stories`, `3 matches`. Spoken in
   * EDIT mode with the card's name, the one stop VoiceOver makes per card.
   *
   * ⚠ Null is a real state: a card whose count would be a claim we cannot make
   * says nothing rather than `0`.
   */
  summary: string | null;
}

export interface BoardStackProps {
  /** Visible AND eligible, in the reader's order. */
  sections: readonly BoardSection[];
  editing: boolean;
  /** The put-away cards, in their remembered order. */
  tray: readonly BoardCardId[];
  copy: {
    /** Every card's name. */
    cards: Readonly<Record<BoardCardId, { label: string }>>;
    /** The one-line instruction under the crown — "Drag to reorder · 5 of 5". */
    caption: string;
    moveUp: string;
    moveDown: string;
    removeCard: (card: string) => string;
    addCard: (card: string) => string;
    background: string;
    hiddenTitle: string;
    resetAll: string;
    resetAllLabel: string;
  };
  /** The background tiles, built by the screen (it owns the league marks). */
  tiles: readonly EditPanelTile[];
  /** The visible order changed. Fired ONCE, on release — see `setBoardOrder`. */
  onOrder: (visible: readonly BoardCardId[]) => void;
  onRemove: (id: BoardCardId) => void;
  onAdd: (id: BoardCardId) => void;
  /** Order, hidden cards AND background — the panel's Reset (0199). */
  onReset: () => void;
  /**
   * The page, for the drag's edge auto-scroll. The scaffold owns the scroll
   * view; these are its ref, its last known offset, and the screen-space line
   * below which the top band starts (the crown's status area).
   */
  scroll: {
    ref: RefObject<ScrollView | null>;
    offset: RefObject<number>;
    top: number;
  };
  /** A card is up. The screen freezes the scroll view while this is true. */
  onDragging: (dragging: boolean) => void;
}

export function BoardStack({
  sections,
  editing,
  tray,
  copy,
  tiles,
  onOrder,
  onRemove,
  onAdd,
  onReset,
  scroll,
  onDragging,
}: BoardStackProps) {
  const ids = sections.map((section) => section.id);
  const publish = useScreenOverlay();
  const { height: screenH } = useWindowDimensions();
  const [panelH, setPanelH] = useState(0);
  /**
   * The panel's height, for the end spacer and the edge band. ⚠ Cannot loop
   * with the publish effect below: `onLayout` fires only when the panel's
   * layout CHANGES, and an unchanged height is a React bail-out.
   */
  const onPanelHeight = useCallback((height: number) => setPanelH(height), []);

  const drag: DragState = {
    active: useSharedValue<string | null>(null),
    startTop: useSharedValue(0),
    offset: useSharedValue(0),
    shift: useSharedValue(0),
    fingerY: useSharedValue(0),
    order: useSharedValue<string[]>(ids),
    heights: useSharedValue<Record<string, number>>({}),
  };

  /**
   * A card reported its height. ⚠ Written HERE, where the value is local.
   *
   * ⚠⚠ Accumulated in a JS REF and pushed whole. A shared value written from
   * the JS thread does not read back on the JS thread until the UI runtime has
   * taken the write, so `{ ...heights.value, [id]: h }` in five back-to-back
   * `onLayout`s spread `{}` five times and kept only the last card — the stack
   * then waited forever for the other four (caught on the simulator).
   */
  const measured = useRef<Record<string, number>>({});
  const measure = (id: string, height: number) => {
    if (measured.current[id] === height) return;
    measured.current = { ...measured.current, [id]: height };
    drag.heights.value = measured.current;
  };

  /**
   * The stack's box: every card plus the gaps, and invisible until every card
   * has a height (see the header).
   */
  const stackStyle = useAnimatedStyle(() => {
    let total = 0;
    let ready = true;
    for (const id of ids) {
      const h = drag.heights.value[id];
      if (h === undefined) ready = false;
      total += (h ?? 0) + BoardEdit.gap;
    }
    return { height: Math.max(0, total - BoardEdit.gap), opacity: ready ? 1 : 0 };
  });

  /**
   * Which end of the screen a held card is parked at: −1 up, 1 down, 0 neither.
   * The bottom band sits ABOVE the panel — below it there is nothing to aim at.
   */
  const [edge, setEdge] = useState(0);
  const top = scroll.top;
  const bottom = screenH - panelH - BoardEdit.edge;
  useAnimatedReaction(
    () => {
      if (drag.active.value === null) return 0;
      if (drag.fingerY.value < top) return -1;
      if (drag.fingerY.value > bottom) return 1;
      return 0;
    },
    (now, before) => {
      if (now !== before) runOnJS(setEdge)(now);
    },
  );

  const shiftSV = drag.shift;
  const { ref: scrollRef, offset: scrollOffset } = scroll;
  useEffect(() => {
    if (edge === 0) return;
    let frame = 0;
    const step = () => {
      const next = Math.max(0, (scrollOffset.current ?? 0) + edge * BoardEdit.edgeSpeed);
      const moved = next - (scrollOffset.current ?? 0);
      if (moved !== 0) {
        scrollRef.current?.scrollTo({ y: next, animated: false });
        // ⚠ Optimistic: `onScroll` is throttled, and waiting for it would make
        // the loop step on a stale offset and crawl.
        scrollOffset.current = next;
        // ⚠⚠ The lifted card must travel WITH the page, or the content slides
        // out from under a finger that has not moved.
        shiftSV.value += moved;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [edge, scrollRef, scrollOffset, shiftSV]);

  /**
   * One card's drag.
   *
   * ⚠⚠ **Built here, not in the card** — the shared values are local here, and
   * the writer belongs with them (`react-hooks/immutability`).
   *
   * ⚠⚠ **`activateAfterLongPress`, not pointer-down** (0174 §8).
   *
   * ⚠ The swap rule, for cards of different heights: every OTHER card is
   * "before" the lifted one when the lifted card's centre is past that card's
   * midpoint — with `swapBias` of hysteresis against whichever side it is on
   * now, so a centre resting on a midpoint does not flip back and forth.
   *
   * ⚠ The order is SEEDED at the lift, from the props: at rest the props are
   * the truth and the shared value is stale.
   */
  const cardGesture = (id: BoardCardId) =>
    Gesture.Pan()
      .activateAfterLongPress(150)
      .onStart(() => {
        drag.order.value = ids;
        drag.active.value = id;
        drag.startTop.value = topOf(ids, drag.heights.value, id);
        drag.offset.value = 0;
        drag.shift.value = 0;
        runOnJS(lift)();
      })
      .onUpdate((e) => {
        drag.offset.value = e.translationY + drag.shift.value;
        drag.fingerY.value = e.absoluteY;

        const order = drag.order.value;
        const heights = drag.heights.value;
        const here = order.indexOf(id);
        const centre = drag.startTop.value + drag.offset.value + (heights[id] ?? 0) / 2;

        const before: string[] = [];
        const after: string[] = [];
        for (let i = 0; i < order.length; i++) {
          const other = order[i];
          if (other === id) continue;
          const mid = topOf(order, heights, other) + (heights[other] ?? 0) / 2;
          const wasBefore = i < here;
          const isBefore = wasBefore
            ? centre >= mid - BoardEdit.swapBias
            : centre > mid + BoardEdit.swapBias;
          if (isBefore) before.push(other);
          else after.push(other);
        }
        if (before.length === here) return;

        drag.order.value = [...before, id, ...after];
        runOnJS(hapticReorder)();
      })
      .onFinalize(() => {
        if (drag.active.value !== id) return;
        drag.active.value = null;
        drag.offset.value = 0;
        drag.shift.value = 0;
        runOnJS(drop)();
      });

  const drop = () => {
    onDragging(false);
    setEdge(0);

    const dropped = drag.order.value as BoardCardId[];
    // ⚠⚠ **Commit only a sequence of exactly the cards that are on screen NOW**
    // (0174 §10) — the board can change under a finger that is still down.
    if (dropped.length !== ids.length || dropped.some((id) => !ids.includes(id))) return;
    onOrder(dropped);
  };

  const lift = () => {
    onDragging(true);
    void hapticLift();
  };

  /** VoiceOver's reorder: the same commit the gesture makes, by one place. */
  const move = (id: BoardCardId, to: number) => {
    const next = [...ids];
    next.splice(to, 0, next.splice(next.indexOf(id), 1)[0]);
    drag.order.value = next;
    onOrder(next);
    void hapticReorder();
  };

  /**
   * The panel, over the page. ⚠ `useLayoutEffect` and no deps, the league
   * menu's pattern (see `useScreenOverlay` for why it cannot loop): it
   * republishes with every render, so the tiles and chips stay current.
   */
  useLayoutEffect(() => {
    publish(
      editing ? (
        <EditPanel
          title={copy.background}
          resetLabel={copy.resetAll}
          resetAccessibilityLabel={copy.resetAllLabel}
          tiles={tiles}
          hiddenTitle={copy.hiddenTitle}
          hidden={tray.map((id) => ({
            id,
            label: copy.cards[id].label,
            accessibilityLabel: copy.addCard(copy.cards[id].label),
          }))}
          onAdd={(id) => {
            void hapticToggle();
            onAdd(id as BoardCardId);
          }}
          onReset={() => {
            void hapticToggle();
            onReset();
          }}
          onHeight={onPanelHeight}
        />
      ) : null,
    );
    return () => publish(null);
  });

  if (!editing) {
    return (
      <>
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            {section.node}
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      <Text variant="caption" color="textSecondary">
        {copy.caption}
      </Text>

      <Animated.View style={[styles.stack, stackStyle]}>
        {sections.map((section) => {
          const label = copy.cards[section.id].label;
          return (
            <EditCard
              key={section.id}
              id={section.id}
              ids={ids}
              drag={drag}
              gesture={cardGesture(section.id)}
              accessibilityLabel={section.summary ? `${label}, ${section.summary}` : label}
              removeLabel={copy.removeCard(label)}
              moveUpLabel={copy.moveUp}
              moveDownLabel={copy.moveDown}
              onRemove={() => {
                void hapticToggle();
                onRemove(section.id);
              }}
              onMove={(to) => move(section.id, to)}
              onMeasure={measure}>
              {section.node}
            </EditCard>
          );
        })}
      </Animated.View>

      {/* The last card must be able to scroll clear of the panel. */}
      <View style={{ height: panelH }} />
    </>
  );
}

const styles = StyleSheet.create({
  // ⚠ The gap MUST match the scaffold's body gap — see the header.
  section: { gap: Spacing.four },
  stack: { position: 'relative' },
});
