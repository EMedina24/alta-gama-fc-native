/**
 * ONE editable card, while the Board is being arranged (ADR 0174).
 *
 * A plate carrying the card's NAME and a line saying what it is currently
 * holding — `3 stories`, `3 matches`, `4 clubs` — between the remove disc and
 * the drag handle. The summary is the answer to the question the reader is
 * actually asking in this mode: what do I lose if I take this off?
 *
 * ⚠⚠ **The design's veiled card is deliberately NOT built here. Do not restore
 * it from the handoff**, which still specifies it — `BoardEdit.rowFill` carries
 * the measurement that killed it. In short: a fixed window onto a card of some
 * other height lands mid-sentence, and every section opens with its own
 * `SectionHeader`, so the row printed its name twice. Neither is an opacity
 * problem, and two rounds of trying to solve it with opacity did not solve it.
 *
 * ⚠⚠ **The drag starts on the HANDLE, after a short hold** — Ed's call over the
 * design's pointer-down. A pan that activates the instant a 34pt target is
 * touched has to win a race against the scroll view underneath on every
 * touch-down; a hold both wins that race outright and makes a mis-grab
 * mid-scroll impossible. The row body is not a drag target at all.
 *
 * ⚠⚠ **VoiceOver cannot drag.** The row carries `moveUp` / `moveDown` actions —
 * the only way to reorder without the gesture, the same accommodation
 * `CardDeck` makes for its shuffle (ADR 0126).
 *
 * ⚠ No data fetching, and no knowledge of what a card IS (ADR 0013): the caller
 * hands over two strings.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { HandleGlyph, MinusGlyph, Text } from '@/components/atoms';
import { BoardEdit, Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';

/** One slot: a row plus the gap under it. The whole stack is this arithmetic. */
export const SLOT = BoardEdit.rowHeight + BoardEdit.gap;

/**
 * The drag, as shared values — one set for the whole stack, owned by
 * `BoardStack`, written by the gesture it builds and READ here.
 *
 * ⚠⚠ **This component never writes them.** The gesture is composed where the
 * values are local and handed down already built: a component that mutates
 * something reached through its own props is what `react-hooks/immutability`
 * rejects, and the rule is right — the writer and the values belong together.
 *
 * ⚠ `order` lives HERE rather than in React state while a finger is down. The
 * swap has to land on the UI thread with the frame that caused it; a `setState`
 * per crossing would reorder the stack one commit late, which reads as the rows
 * lagging behind the finger.
 */
export interface DragState {
  /** The lifted row's id, or null. */
  active: SharedValue<string | null>;
  /** That row's index when it was lifted — the origin its position is measured from. */
  from: SharedValue<number>;
  /** Finger travel plus whatever the page has auto-scrolled under it. */
  offset: SharedValue<number>;
  /** How far the page has auto-scrolled since the lift. See `BoardStack`. */
  shift: SharedValue<number>;
  /** The finger's position on the SCREEN — the edge test's input. */
  fingerY: SharedValue<number>;
  /** The live order, ids only. Reassigned whole; never mutated in place. */
  order: SharedValue<string[]>;
}

export interface EditRowProps {
  id: string;
  /** The card's name — one line, ellipsised. */
  label: string;
  /**
   * What this card is holding right now — `3 stories`, `3 matches`.
   *
   * ⚠ Nullable, and null is a real state: a card whose count would be a claim we
   * cannot make prints nothing rather than `0`. It is never a substitute for the
   * name, which always renders.
   */
  summary: string | null;
  /**
   * This row's slot when nothing is being dragged.
   *
   * ⚠ From the PROPS, not from `drag.order` — a row at rest takes its position
   * from React, and the shared order is only consulted while a finger is down.
   * That is what removes the effect that would otherwise have to copy one into
   * the other, and with it the two-sources-of-truth bug that effect invites.
   */
  index: number;
  /** Read-only here. See `DragState`. */
  drag: DragState;
  /** Built by `BoardStack`, where the shared values are local. */
  gesture: GestureType;
  /** How many rows are in the stack — the clamp on a VoiceOver move. */
  count: number;
  removeLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  onRemove: () => void;
  /** VoiceOver's reorder, by one place. */
  onMove: (to: number) => void;
}

export function EditRow({
  id,
  label,
  summary,
  index,
  drag,
  gesture,
  count,
  removeLabel,
  moveUpLabel,
  moveDownLabel,
  onRemove,
  onMove,
}: EditRowProps) {
  const reduceMotion = useReducedMotion();

  const style = useAnimatedStyle(() => {
    const lifted = drag.active.value === id;
    // ⚠ At rest, the PROPS' index; mid-drag, the live shared order — see
    // `index`. `indexOf` cannot miss while a drag is running, but a row that
    // has just left the stack would land at -1, so it falls back to its own.
    const at = drag.active.value === null ? index : drag.order.value.indexOf(id);
    const y = lifted
      ? drag.from.value * SLOT + drag.offset.value
      : (at < 0 ? index : at) * SLOT;

    return {
      // ⚠ The lifted row is ASSIGNED — it is under a finger, and a spring
      // between the finger and the row is lag, not motion. Only the rows
      // stepping aside are animated, and Reduce Motion drops even those
      // (0113's rule: direct manipulation stays, the settle becomes a jump).
      transform: [
        { translateY: lifted || reduceMotion ? y : withSpring(y, BoardEdit.spring) },
        { scale: withTiming(lifted ? BoardEdit.dragScale : 1, { duration: Motion.quick }) },
      ],
      zIndex: lifted ? 20 : 1,
      shadowOpacity: withTiming(lifted ? BoardEdit.dragShadow.shadowOpacity : 0, {
        duration: Motion.quick,
      }),
    };
  });

  const act = (e: AccessibilityActionEvent) => {
    const to = e.nativeEvent.actionName === 'moveUp' ? index - 1 : index + 1;
    if (to < 0 || to >= count) return;
    onMove(to);
  };

  return (
    <Animated.View
      style={[styles.row, style]}
      accessible
      // ⚠ The summary is spoken too — it is on screen, and a stop that names the
      // card without saying what it holds is a worse stop than the eye's.
      accessibilityLabel={summary ? `${label}, ${summary}` : label}
      accessibilityActions={[
        { name: 'moveUp', label: moveUpLabel },
        { name: 'moveDown', label: moveDownLabel },
      ]}
      onAccessibilityAction={act}>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        hitSlop={(Size.minTouch - BoardEdit.remove) / 2}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
        <MinusGlyph />
      </Pressable>

      <View style={styles.words}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
        {summary ? (
          <Text variant="caption" color="textDim" numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
      </View>

      <GestureDetector gesture={gesture}>
        {/* ⚠ Decorative to VoiceOver — the row above carries the label and the
            move actions, because a handle it cannot drag would promise
            something it cannot do. */}
        <View
          style={styles.handle}
          hitSlop={(Size.minTouch - BoardEdit.handle) / 2}
          importantForAccessibility="no-hide-descendants">
          <HandleGlyph />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BoardEdit.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.cardLg,
    backgroundColor: BoardEdit.rowFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    shadowColor: BoardEdit.dragShadow.shadowColor,
    shadowRadius: BoardEdit.dragShadow.shadowRadius,
    shadowOffset: BoardEdit.dragShadow.shadowOffset,
  },
  remove: {
    width: BoardEdit.remove,
    height: BoardEdit.remove,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  // ⚠ `flex: 1` with `minWidth: 0` — the name/summary column is the only elastic
  // thing in the row, and both controls beside it have an intrinsic width
  // (trap 56). ⚠ No `overflow: 'hidden'` on the row: the shadow under a lifted
  // one is drawn outside its box, and clipping would delete it.
  words: { flex: 1, minWidth: 0, gap: Spacing.half },
  handle: {
    width: BoardEdit.handle,
    height: BoardEdit.handle,
    borderRadius: Radius.crownControl,
    backgroundColor: Colors.dark.glassFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
