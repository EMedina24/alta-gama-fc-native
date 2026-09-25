/**
 * ONE card while the Board is being arranged (ADR 0199) — the Medina kit's
 * edit card: the REAL card, a step back (`BoardEdit.editScale`), inert, with a
 * grey remove disc on its top-left corner and a grip on its top-right.
 *
 * ⚠⚠ This supersedes 0174 §9's name rows. What killed 0174's veiled card was a
 * fixed WINDOW onto a card of some other height — it landed mid-sentence and
 * printed the section's name twice. A whole card, scaled, has no window.
 *
 * ⚠ The card is INERT: `pointerEvents="none"` and its descendants hidden from
 * VoiceOver. A tap on a headline mid-arrangement must not navigate away, and
 * a screen reader walking into the card would hear every row of it instead of
 * the one stop that matters here — the card's name and what it holds.
 *
 * ⚠⚠ **The drag starts on the GRIP, after a short hold** (0174 §8, kept): a
 * hold wins the race against the scroll view outright and makes a mis-grab
 * mid-scroll impossible. The card body is not a drag target.
 *
 * ⚠⚠ **VoiceOver cannot drag** — the wrapper carries `moveUp` / `moveDown`.
 *
 * ⚠ HEIGHTS ARE MEASURED. Unlike 0174's uniform rows, each card reports its own
 * height (`onMeasure`), and the stack's arithmetic runs on those — see
 * `BoardStack`. This component only READS the shared values (the
 * `react-hooks/immutability` rule the stack's header explains).
 */
import type { ReactNode } from 'react';
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

import { HandleGlyph, MinusGlyph } from '@/components/atoms';
import { BoardEdit, Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';

/**
 * The drag, as shared values — one set for the whole stack, owned and written
 * by `BoardStack`, READ here.
 */
export interface DragState {
  /** The lifted card's id, or null. */
  active: SharedValue<string | null>;
  /** The lifted card's top when it was lifted — the origin its travel is from. */
  startTop: SharedValue<number>;
  /** Finger travel plus whatever the page has auto-scrolled under it. */
  offset: SharedValue<number>;
  /** How far the page has auto-scrolled since the lift. */
  shift: SharedValue<number>;
  /** The finger's position on the SCREEN — the edge test's input. */
  fingerY: SharedValue<number>;
  /** The live order, ids only. Reassigned whole; never mutated in place. */
  order: SharedValue<string[]>;
  /** Each card's measured height. */
  heights: SharedValue<Record<string, number>>;
}

/**
 * A card's top in a given order: the heights of every card above it, each
 * plus the gap. A worklet — it runs in the style and in the gesture.
 */
export function topOf(order: readonly string[], heights: Record<string, number>, id: string): number {
  'worklet';
  let top = 0;
  for (const other of order) {
    if (other === id) return top;
    top += (heights[other] ?? 0) + BoardEdit.gap;
  }
  return top;
}

export interface EditCardProps {
  id: string;
  /** The card itself, as view mode draws it. Rendered inert. */
  children: ReactNode;
  /** Every card in the stack, in the PROPS order — where each rests. */
  ids: readonly string[];
  drag: DragState;
  gesture: GestureType;
  /** Spoken: the card's name, and what it holds. */
  accessibilityLabel: string;
  removeLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  onRemove: () => void;
  /** VoiceOver's reorder, by one place. */
  onMove: (to: number) => void;
  onMeasure: (id: string, height: number) => void;
}

export function EditCard({
  id,
  children,
  ids,
  drag,
  gesture,
  accessibilityLabel,
  removeLabel,
  moveUpLabel,
  moveDownLabel,
  onRemove,
  onMove,
  onMeasure,
}: EditCardProps) {
  const reduceMotion = useReducedMotion();
  const index = ids.indexOf(id);

  const style = useAnimatedStyle(() => {
    const lifted = drag.active.value === id;
    // ⚠ At rest, the PROPS' order; mid-drag, the live shared order. A card
    // that has just left the live order falls back to its props slot.
    const live = drag.active.value !== null && drag.order.value.includes(id);
    const y = lifted
      ? drag.startTop.value + drag.offset.value
      : topOf(live ? drag.order.value : ids, drag.heights.value, id);

    return {
      // ⚠ The lifted card is ASSIGNED — it is under a finger, and a spring
      // between the finger and the card is lag. Only the cards stepping aside
      // animate, and Reduce Motion drops even those (0113's rule).
      transform: [
        { translateY: lifted || reduceMotion ? y : withSpring(y, BoardEdit.spring) },
        {
          scale: withTiming(lifted ? BoardEdit.dragScale : BoardEdit.editScale, {
            duration: Motion.quick,
          }),
        },
      ],
      zIndex: lifted ? 20 : 1,
      shadowOpacity: withTiming(lifted ? BoardEdit.dragShadow.shadowOpacity : 0, {
        duration: Motion.quick,
      }),
    };
  });

  const act = (e: AccessibilityActionEvent) => {
    const to = e.nativeEvent.actionName === 'moveUp' ? index - 1 : index + 1;
    if (to < 0 || to >= ids.length) return;
    onMove(to);
  };

  return (
    <Animated.View
      style={[styles.card, style]}
      onLayout={(e) => onMeasure(id, e.nativeEvent.layout.height)}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={[
        { name: 'moveUp', label: moveUpLabel },
        { name: 'moveDown', label: moveDownLabel },
      ]}
      onAccessibilityAction={act}>
      <View
        style={styles.body}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        {children}
      </View>

      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        hitSlop={(Size.minTouch - BoardEdit.remove) / 2}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
        <MinusGlyph color="text" />
      </Pressable>

      <GestureDetector gesture={gesture}>
        {/* ⚠ Decorative to VoiceOver — the card above carries the move
            actions; a handle it cannot drag would promise something false. */}
        <View
          style={styles.grip}
          hitSlop={(Size.minTouch - BoardEdit.grip) / 2}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden>
          <HandleGlyph color="text" />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    shadowColor: BoardEdit.dragShadow.shadowColor,
    shadowRadius: BoardEdit.dragShadow.shadowRadius,
    shadowOffset: BoardEdit.dragShadow.shadowOffset,
  },
  // ⚠ The same gap the view-mode section wrapper uses — a card's own siblings
  // (a header, its list, a footnote) must space exactly as they do at rest.
  body: { paddingTop: BoardEdit.chromeTop, gap: Spacing.four },
  remove: {
    position: 'absolute',
    top: BoardEdit.removeInset,
    left: BoardEdit.removeInset,
    width: BoardEdit.remove,
    height: BoardEdit.remove,
    borderRadius: Radius.pill,
    backgroundColor: BoardEdit.removeFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  // ⚠ FLAT, not `GlassSurface`: it rides the card's scale transform, and a
  // scaled ancestor kills liquid glass (the 0120/0122 rule). The kit's glass
  // chip becomes the remove disc's grey, so the two badges read as a pair.
  grip: {
    position: 'absolute',
    top: BoardEdit.removeInset,
    right: BoardEdit.removeInset,
    width: BoardEdit.grip,
    height: BoardEdit.grip,
    borderRadius: BoardEdit.gripRadius,
    backgroundColor: BoardEdit.removeFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
