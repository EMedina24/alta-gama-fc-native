/**
 * The Board's body: the reader's cards, in the reader's order — and the mode
 * that lets them change it (ADR 0174).
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
 * (ADR 0088/0095) and are pinned: the match being played is the reason the
 * screen exists on a matchday and is not the reader's to move. That is why the
 * catalogue has no `next` card, against the design handoff's eight.
 *
 * ⚠ **Only what is on screen can be arranged.** The rows are exactly the
 * sections view mode draws — visible AND eligible. A card whose data has not
 * arrived is not a row and is never a swap target, because a slot the reader
 * cannot see cannot be aimed at.
 *
 * ⚠ The stack is ABSOLUTELY POSITIONED while editing and every row is the same
 * `BoardEdit.rowHeight`, which is what makes the swap pure arithmetic — the
 * handoff's "measure every height at drag start" is not needed at all.
 *
 * ⚠ **The cards are not RENDERED while editing** — a row is a name and a summary
 * line, not a veiled slice of the card (see `BoardEdit.rowFill` for the
 * measurement that settled that). The screen still BUILDS every card, because a
 * null node is how eligibility is decided; nothing mounts.
 *
 * ⚠ No data fetching, and no knowledge of what a card IS (ADR 0013): the screen
 * hands over rendered nodes.
 */
import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';

import { BoardEdit, Spacing } from '@/constants/theme';
import { hapticLift, hapticReorder, hapticToggle } from '@/lib/haptics';
import type { BoardCardId } from '@/lib/board-layout';
import { AddTray } from './board-stack/add-tray';
import { BackgroundRow, type BackgroundRowProps } from './board-stack/background-row';
import { EditRow, SLOT, type DragState } from './board-stack/edit-row';

export { BoardEditHint } from './board-stack/hint-bar';

export interface BoardSection {
  id: BoardCardId;
  /** The card, already resolved by the screen. Drawn in VIEW mode only. */
  node: ReactNode;
  /**
   * What the card is holding right now — `3 stories`, `3 matches`. Drawn in EDIT
   * mode only, under the card's name.
   *
   * ⚠ The screen owns this because the screen owns the data (ADR 0013). Null is
   * a real state: a card whose count would be a claim we cannot make says
   * nothing rather than `0`.
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
    /** Every card's name, and the line the tray explains it with. */
    cards: Readonly<Record<BoardCardId, { label: string; body: string }>>;
    addTitle: string;
    allOn: string;
    reset: string;
    moveUp: string;
    moveDown: string;
    removeCard: (card: string) => string;
    addCard: (card: string) => string;
  };
  /** The visible order changed. Fired ONCE, on release — see `setBoardOrder`. */
  onOrder: (visible: readonly BoardCardId[]) => void;
  onRemove: (id: BoardCardId) => void;
  onAdd: (id: BoardCardId) => void;
  onReset: () => void;
  /**
   * The page, for the drag's edge auto-scroll.
   *
   * ⚠ Seven rows at 114pt do not fit a viewport under a crown carrying a live
   * plate, so a drag that cannot scroll cannot reach the top of the stack from
   * the bottom of it. The scaffold owns the scroll view; these are its ref and
   * its last known offset.
   */
  scroll: {
    ref: RefObject<ScrollView | null>;
    offset: RefObject<number>;
    /** Screen-space band at each end where a held row starts scrolling. */
    top: number;
    bottom: number;
  };
  /** A row is up. The screen freezes the scroll view while this is true. */
  onDragging: (dragging: boolean) => void;
  /**
   * The BACKGROUND row (ADR 0175), edit mode only — its own section between
   * the stack and the add tray. ⚠ ABOVE the tray, deliberately: the tray and
   * its reset button are one unit about the LAYOUT, and a row wedged between
   * them would read the reset as covering the background too (it does not).
   */
  background?: BackgroundRowProps;
}

export function BoardStack({
  sections,
  editing,
  tray,
  copy,
  onOrder,
  onRemove,
  onAdd,
  onReset,
  scroll,
  onDragging,
  background,
}: BoardStackProps) {
  const ids = sections.map((section) => section.id);

  const drag: DragState = {
    active: useSharedValue<string | null>(null),
    from: useSharedValue(0),
    offset: useSharedValue(0),
    shift: useSharedValue(0),
    fingerY: useSharedValue(0),
    order: useSharedValue<string[]>(ids),
  };

  /**
   * Which end of the screen a held row is parked at: −1 up, 1 down, 0 neither.
   * React state because the scroll itself is a JS-side imperative call.
   */
  const [edge, setEdge] = useState(0);
  const top = scroll.top;
  const bottom = scroll.bottom;
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
        // ⚠⚠ The lifted row must travel WITH the page, or the content slides
        // out from under a finger that has not moved.
        shiftSV.value += moved;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [edge, scrollRef, scrollOffset, shiftSV]);

  /**
   * One row's drag.
   *
   * ⚠⚠ **Built here, not in the row.** The shared values are local to this
   * component, and the thing that writes them has to be too — a child mutating
   * a value it reached through its own props is what `react-hooks/immutability`
   * rejects, and it is right: the writer and the values belong together.
   *
   * ⚠⚠ **`activateAfterLongPress`, not pointer-down** (Ed's call over the design
   * handoff's §4). A pan that activates the instant a 34pt target is touched has
   * to win a race against the scroll view on every touch-down; a hold wins it
   * outright, and makes a mis-grab mid-scroll impossible. `hapticLift` is the
   * accommodation for the delay — without it a reader learns the hold by
   * failing at it.
   *
   * ⚠ The order is SEEDED at the lift, from the props: at rest the props are the
   * truth and the shared value is stale, and copying one into the other from an
   * effect is exactly the two-sources-of-truth bug trap 72 names.
   */
  const rowGesture = (id: BoardCardId) =>
    Gesture.Pan()
      .activateAfterLongPress(150)
      .onStart(() => {
        drag.order.value = ids;
        drag.active.value = id;
        drag.from.value = ids.indexOf(id);
        drag.offset.value = 0;
        drag.shift.value = 0;
        runOnJS(lift)();
      })
      .onUpdate((e) => {
        drag.offset.value = e.translationY + drag.shift.value;
        drag.fingerY.value = e.absoluteY;

        const here = drag.order.value.indexOf(id);
        // The row's position in slot units, measured from where it was lifted.
        const at = (drag.from.value * SLOT + drag.offset.value) / SLOT;
        // ⚠ Half a slot PLUS the bias: at exactly half, a row resting on the
        // boundary swaps back and forth on sub-pixel jitter.
        if (Math.abs(at - here) < 0.5 + BoardEdit.swapBias / SLOT) return;

        const to = Math.max(0, Math.min(ids.length - 1, Math.round(at)));
        if (to === here) return;

        const next = [...drag.order.value];
        next.splice(to, 0, next.splice(here, 1)[0]);
        drag.order.value = next;
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
    // ⚠⚠ **Commit only a sequence of exactly the rows that are on screen NOW.**
    // The stack is seeded at the lift, and the board can change under a finger
    // that is still down — a kickoff takes LAST RESULT away mid-drag, a refetch
    // brings FINISHED TODAY back. Committing a sequence for a membership that no
    // longer exists would fold a card into the wrong slot, silently and
    // permanently, and the reader would have no idea what they had done.
    if (dropped.length !== ids.length || dropped.some((id) => !ids.includes(id))) return;
    onOrder(dropped);
  };

  const lift = () => {
    onDragging(true);
    void hapticLift();
  };

  /**
   * VoiceOver's reorder: the same commit the gesture makes, by one place.
   *
   * ⚠ Built from the PROPS, not from `drag.order` — that shared value is only
   * seeded at a lift, so for a reader who has never dragged it still holds the
   * membership this component first mounted with.
   */
  const move = (id: BoardCardId, to: number) => {
    const next = [...ids];
    next.splice(to, 0, next.splice(next.indexOf(id), 1)[0]);
    drag.order.value = next;
    onOrder(next);
    void hapticReorder();
  };

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
      <View style={[styles.stack, { height: Math.max(0, ids.length * SLOT - BoardEdit.gap) }]}>
        {sections.map((section, index) => (
          <EditRow
            key={section.id}
            id={section.id}
            label={copy.cards[section.id].label}
            summary={section.summary}
            index={index}
            drag={drag}
            gesture={rowGesture(section.id)}
            count={ids.length}
            removeLabel={copy.removeCard(copy.cards[section.id].label)}
            moveUpLabel={copy.moveUp}
            moveDownLabel={copy.moveDown}
            onRemove={() => {
              void hapticToggle();
              onRemove(section.id);
            }}
            onMove={(to) => move(section.id, to)}
          />
        ))}
      </View>

      {background ? <BackgroundRow {...background} /> : null}

      <AddTray
        cards={tray.map((id) => ({ id, ...copy.cards[id] }))}
        title={copy.addTitle}
        emptyLabel={copy.allOn}
        resetLabel={copy.reset}
        addLabel={copy.addCard}
        onAdd={(id) => {
          void hapticToggle();
          onAdd(id as BoardCardId);
        }}
        onReset={() => {
          void hapticToggle();
          onReset();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ⚠ The gap MUST match the scaffold's body gap — see the header.
  section: { gap: Spacing.four },
  stack: { position: 'relative' },
});
