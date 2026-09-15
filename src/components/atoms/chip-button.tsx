/**
 * The follow chip, and filter chips.
 *
 * ⚠ 44pt minimum hit target even though the chip draws smaller — nothing
 * interactive goes below it (SPEC §2). `hitSlop` is what buys that without
 * changing the drawn size.
 *
 * ⚠ `shape="pill"` plus `trailing` is the Clubs screen's follow control
 * (ADR 0082): a fixed-height pill with the label, then the `+` in its own disc
 * flush with the pill's right inner padding. It is this chip rather than a
 * second component because the two differ in geometry alone — same accent
 * rules, same hit target, same pressed state — and a near-duplicate would drift.
 *
 * ⚠ `pulse` is the ATTENTION state (ADR 0174): a lime ring, and a second ring
 * breathing outside it. The Board's DONE pill wears it — edit mode has no other
 * way out, and a reader who does not find it is stuck in a mode. It is the app's
 * third looping animation (see `Pulse`) and must stay scoped to states like that
 * one: transient, and with something real at stake if the control is missed.
 *
 * ⚠ **A `pill` with NO `trailing` takes SYMMETRIC padding** (ADR 0157). The
 * asymmetry above exists because the disc carries its own weight on the right;
 * without one, the label sits visibly off-centre. Both pre-existing call sites
 * pass a disc, so this branch changes nothing that shipped.
 */
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from './text';
import { Colors, Pulse, Radius, Size, Spacing } from '@/constants/theme';

export interface ChipButtonProps {
  /**
   * ⚠ Omitting it makes an ICON-ONLY pill (ADR 0182, the Board's EDIT pencil):
   * the chip draws only `leading`, and `accessibilityLabel` becomes REQUIRED —
   * VoiceOver has nothing else to read.
   */
  label?: string;
  onPress: () => void;
  /** Selected/subscribed state — accent wash and ring. */
  active?: boolean;
  disabled?: boolean;
  /** `pill` is the fixed-height follow control; `control` is the default chip. */
  shape?: 'control' | 'pill';
  /**
   * How the INACTIVE state reads (ADR 0092). `accent` — the default and the
   * follow pill's — keeps the lime ring, because that chip is an invitation to
   * act. `neutral` is the News filter rail, where a row of lime rings made
   * every league look selected.
   *
   * ⚠ `crown` is a chip drawn ON the crown's bright band (ADR 0174, the Board's
   * EDIT / DONE): an OPAQUE dark capsule with a lime label, because a
   * transparent chip there shows lime through itself and its lime label
   * disappears. It is the flat half of the league trigger's own capsule
   * (`triggerShellFlat`) — deliberately not liquid glass, which over a gradient
   * is the trap-59 bind for one small control.
   */
  tone?: 'accent' | 'neutral' | 'crown';
  /**
   * Drawn BEFORE the label, inside the chip — the Calendar pill's glyph (ADR
   * 0165). ⚠ Decorative only, exactly as `trailing` is: it shares the chip's
   * single press target and must never be a control of its own.
   *
   * ⚠ It takes no disc. `trailing`'s `accentWash` circle exists because the
   * follow pill's tick needs its own weight on the right; a leading glyph reads
   * as part of the label and a second disc beside the ring is one shape too many.
   */
  leading?: ReactNode;
  /**
   * Drawn after the label, inside the chip. ⚠ Decorative only — it shares the
   * chip's single press target and must never be a control of its own.
   */
  trailing?: ReactNode;
  /**
   * Ring this chip and breathe a halo around it — see the header.
   *
   * ⚠ Decoration only: it says "look here", never "this is selected". `active`
   * is the state prop and the two are independent.
   */
  pulse?: boolean;
  /** Overrides the label for VoiceOver, which cannot read the trailing glyph. */
  accessibilityLabel?: string;
}

export function ChipButton({
  leading,
  label,
  onPress,
  active = false,
  disabled = false,
  shape = 'control',
  tone = 'accent',
  trailing,
  pulse = false,
  accessibilityLabel,
}: ChipButtonProps) {
  const quiet = tone === 'neutral' && !active;
  const onCrown = tone === 'crown' && !active;

  const reduceMotion = useReducedMotion();
  /** 0 → 1 per breath. Opacity and transform only — never a layout property. */
  const breath = useSharedValue(1);
  useEffect(() => {
    // ⚠ Reduce Motion holds the halo at FULL strength rather than hiding it:
    // the ring is the affordance and the breathing is only how it asks twice
    // (`avatar.tsx`'s own rule for the signed-out orbit).
    if (!pulse || reduceMotion) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(0, { duration: Pulse.period, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [breath, pulse, reduceMotion]);

  const halo = useAnimatedStyle(() => ({
    opacity: Pulse.dim + (1 - Pulse.dim) * breath.value,
    transform: [{ scale: 1 + (Pulse.scale - 1) * (1 - breath.value) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.chip,
        shape === 'pill' ? styles.pill : styles.control,
        shape === 'pill' && !trailing && styles.pillBare,
        // ⚠ `pillBare` zeroes the gap for a pill with nothing beside its
        // label; a LEADING glyph needs it back, or the two touch.
        shape === 'pill' && !trailing && !!leading && styles.pillLed,
        quiet && styles.quiet,
        onCrown && styles.crown,
        shape === 'pill' && !label && !!leading && styles.pillIconOnly,
        pulse && styles.ringed,
        active && styles.active,
        pressed && !disabled && (shape === 'pill' ? styles.pressedPill : styles.pressed),
        disabled && styles.disabled,
      ]}>
      {/* ⚠ OUTSIDE the chip's own box and non-interactive, so the halo can open
          past the edge without growing the press target or clipping. */}
      {pulse ? <Animated.View pointerEvents="none" style={[styles.halo, halo]} /> : null}
      {leading}
      {label ? (
        <Text variant="eyebrowSm" color={active ? 'onAccent' : quiet ? 'textSecondary' : 'accent'}>
          {label}
        </Text>
      ) : null}
      {trailing ? <View style={styles.disc}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // 1pt, not hairline — the 0087 mock draws the ring at a full point and a
    // 0.33pt lime ring vanished against the mesh.
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
  },
  control: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
  },
  pill: {
    height: Size.followPillH,
    // Asymmetric: the disc carries its own visual weight on the right, so the
    // label needs the padding and the disc does not.
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one + 1,
    gap: Spacing.two,
    borderRadius: Radius.pill,
  },
  /** A labelled pill with no disc — see the header. */
  pillBare: { paddingLeft: Spacing.three, paddingRight: Spacing.three, gap: 0 },
  /**
   * An ICON-ONLY pill (ADR 0182, the Board's EDIT pencil): a circle the pill's
   * own height — beside the round avatar a ~38pt capsule read as a misprint —
   * ringed SOLID lime. ⚠ After `crown` in the style array: the full-strength
   * ring is what keeps a glyph with no word legible as a control, so it
   * outranks the crown tone's hairline.
   */
  pillIconOnly: {
    width: Size.followPillH,
    paddingLeft: 0,
    paddingRight: 0,
    borderColor: Colors.dark.accent,
  },
  /** ...unless it carries a leading glyph, which needs the gap back (ADR 0165). */
  pillLed: { gap: Spacing.two },
  disc: {
    width: Size.followPillDisc,
    height: Size.followPillDisc,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  /** The unselected News filter (ADR 0092): a quiet chip, no lime at all. */
  quiet: { backgroundColor: Colors.dark.card, borderColor: Colors.dark.glassLine },
  /** On the crown's bright band — see `tone`. */
  crown: { backgroundColor: Colors.dark.tabBar, borderColor: Colors.dark.hairlineMid },
  /** The static half of `pulse`: the ring that survives the dimmest frame. */
  ringed: { borderColor: Colors.dark.accent },
  /**
   * The breathing half. ⚠ `Radius.pill` regardless of `shape` — a halo around a
   * `control` chip's 14pt corners at this clearance reads as a misprint, and
   * every `pulse` call site to date is a pill.
   */
  halo: {
    position: 'absolute',
    top: -Pulse.gap,
    left: -Pulse.gap,
    right: -Pulse.gap,
    bottom: -Pulse.gap,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  pressed: { opacity: 0.7 },
  /**
   * ⚠ The pill presses by SCALE, not opacity — it is the only control on a
   * 20-row list and a fade at that density reads as the row disabling itself.
   */
  pressedPill: { transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.4 },
});
