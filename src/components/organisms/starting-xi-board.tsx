/**
 * The pitch with eleven slots (ADR 0065).
 *
 * Tap an empty slot to select it (the rail filters to its line); tap a filled
 * one to select it for a swap. Long-press a filled token for the context menu.
 * Drag a PLACED token onto a teammate to swap, onto an empty slot to move —
 * the one gesture where the target is already visible, so dragging beats a
 * tap there and nowhere else.
 *
 * ⚠ Gestures are `react-native-gesture-handler` — this is the app's first use
 * of it, and `GestureHandlerRootView` in `_layout.tsx` exists for it. Only
 * FILLED tokens get a `GestureDetector`; empty ones stay `Pressable`s.
 *
 * ⚠ The drop hit-test runs on the UI thread against the slot centres captured
 * at render; a slot within `ring / 2 + Spacing.two` of the drop point wins,
 * otherwise the token snaps back. Under the Angled look the pitch is drawn
 * through a `rotateX`, which compresses the vertical by a few percent — inside
 * that tolerance, so the centres are not un-projected.
 *
 * ⚠ No data fetching: `players` is a map the screen built from the squad.
 * Every colour and size comes from `@/constants/theme`.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { SlotToken } from '@/components/atoms';
import { PitchSlots, PitchSurface } from '@/components/molecules';
import { Radius, Size, Spacing } from '@/constants/theme';
import { initials, tokenName } from '@/features/starting-xi/card-geometry';
import { FORMATIONS, slotCentre, type FormationId, type Look } from '@/features/starting-xi/formations';
import type { Placed } from '@/features/starting-xi/lineup';
import type { SquadPlayerView } from '@/lib/cronogol/types';

export interface StartingXiBoardProps {
  formation: FormationId;
  look: Look;
  placed: Placed;
  players: ReadonlyMap<string, SquadPlayerView>;
  selected: number | null;
  width: number;
  height: number;
  onTapSlot: (slot: number) => void;
  onDrop: (from: number, to: number) => void;
  onLongPress: (slot: number) => void;
  /** `${label}` → accessibility label for an empty slot; the screen owns copy. */
  slotLabel: (label: string) => string;
}

export function StartingXiBoard({
  formation,
  look,
  placed,
  players,
  selected,
  width,
  height,
  onTapSlot,
  onDrop,
  onLongPress,
  slotLabel,
}: StartingXiBoardProps) {
  const slots = FORMATIONS[formation];
  const centres = slots.map((s) => slotCentre(s, width, height));
  const ring = Size.xiToken;
  const column = Size.xiCaption + Spacing.two;
  const tolerance = ring / 2 + Spacing.two;

  // Drag state. The shared values drive the ghost on the UI thread; `dragging`
  // mirrors the source slot on the JS thread so the ghost knows what to draw.
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const active = useSharedValue(-1);
  const [dragging, setDragging] = useState<number | null>(null);

  const ghostStyle = useAnimatedStyle(() => {
    const i = active.value;
    const c = i >= 0 ? centres[i] : null;
    return {
      opacity: c ? 1 : 0,
      transform: [
        { translateX: (c ? c.x - column / 2 : 0) + dx.value },
        { translateY: (c ? c.y - ring / 2 : 0) + dy.value },
      ],
    };
  });

  const hitTest = (from: number, tx: number, ty: number): number => {
    'worklet';
    const px = centres[from].x + tx;
    const py = centres[from].y + ty;
    let best = -1;
    let bestD = tolerance;
    for (let i = 0; i < centres.length; i++) {
      if (i === from) continue;
      const d = Math.hypot(centres[i].x - px, centres[i].y - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const gestureFor = (slot: number) => {
    const pan = Gesture.Pan()
      .minDistance(6)
      .onStart(() => {
        active.value = slot;
        dx.value = 0;
        dy.value = 0;
        runOnJS(setDragging)(slot);
      })
      .onUpdate((e) => {
        dx.value = e.translationX;
        dy.value = e.translationY;
      })
      .onEnd((e) => {
        const to = hitTest(slot, e.translationX, e.translationY);
        if (to >= 0) runOnJS(onDrop)(slot, to);
      })
      .onFinalize(() => {
        active.value = -1;
        dx.value = 0;
        dy.value = 0;
        runOnJS(setDragging)(null);
      });
    const longPress = Gesture.LongPress()
      .minDuration(350)
      .onStart(() => {
        runOnJS(onLongPress)(slot);
      });
    const tap = Gesture.Tap().onEnd((_e, success) => {
      if (success) runOnJS(onTapSlot)(slot);
    });
    return Gesture.Race(pan, longPress, tap);
  };

  const tokenFor = (slot: number, mode: 'filled' | 'selected', ghosted = false) => {
    const player = players.get(placed[slot]);
    if (!player) return null;
    return (
      <SlotToken
        mode={mode}
        label={player.shirt === null ? initials(player.name) : String(player.shirt)}
        caption={tokenName(player)}
        ghosted={ghosted}
      />
    );
  };

  const pitch = (
    <PitchSurface look={look} width={width} height={height} borderRadius={Radius.card}>
      <PitchSlots
        slots={slots}
        width={width}
        height={height}
        ring={ring}
        columnWidth={column}
        renderSlot={(slot, i) => {
          const id = placed[i];
          const player = id === undefined ? undefined : players.get(id);
          const isSelected = selected === i;
          if (!player) {
            return (
              <Pressable
                onPress={() => onTapSlot(i)}
                accessibilityRole="button"
                accessibilityLabel={slotLabel(slot.label)}
                accessibilityState={{ selected: isSelected }}
                hitSlop={Spacing.two}>
                <SlotToken mode={isSelected ? 'selected' : 'empty'} label={slot.label} />
              </Pressable>
            );
          }
          return (
            <GestureDetector gesture={gestureFor(i)}>
              <View
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${tokenName(player)}, ${slot.label}`}
                accessibilityState={{ selected: isSelected }}>
                {tokenFor(i, isSelected ? 'selected' : 'filled', dragging === i)}
              </View>
            </GestureDetector>
          );
        }}
      />
      {/* The drag ghost: rendered last so it paints above every slot. */}
      <Animated.View pointerEvents="none" style={[styles.ghost, { width: column }, ghostStyle]}>
        {dragging === null ? null : tokenFor(dragging, 'selected')}
      </Animated.View>
    </PitchSurface>
  );

  if (look !== 'angled') return pitch;
  return (
    <View style={[styles.tilt, { width, height }]}>
      <View style={[styles.tilted, { width, height }]}>{pitch}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },
  tilt: { alignItems: 'center' },
  tilted: {
    transformOrigin: '50% 100%',
    transform: [{ perspective: 760 }, { rotateX: '13deg' }],
  },
});
