/**
 * The eleven tokens, upright over the transformed plane (ADR 0213).
 *
 * Each token is laid out ONCE at a reference size and moved by a UI-thread
 * transform: `projectPoint` of its slot for the position, the plane's scale ×
 * the perspective depth there for the size. That is what keeps names upright
 * at any angle, and what makes a tap land exactly where a token is drawn —
 * UIKit hit-tests through the transform.
 *
 * ⚠ The reference is `TOKEN_OVERSAMPLE` × the plane's layout unit, so the
 * usual case is a DOWN-scale: a layer scaled up past its rasterised size goes
 * soft, and a pinch to 260% would otherwise blur every name on the pitch.
 *
 * ⚠ Paint order is the depth order, re-sorted in JS when the stored view
 * changes (not per frame): the token nearer the camera is drawn on top.
 *
 * ⚠ TWO passes — every disc, then every name — so no orb ever covers a name.
 * Only the disc pass takes touches and speaks to VoiceOver.
 */
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { XiToken, type XiTokenPlayer } from '@/components/molecules/xi-token';
import { Colors, Ease, Pulse, Radius, Xi, XiMotion } from '@/constants/theme';
import { projectPoint } from '@/features/starting-xi/projection';

import { readView, type PitchCamera } from './use-pitch-camera';

/** Tokens are laid out this much larger than the plane's unit, then scaled down. */
export const TOKEN_OVERSAMPLE = 1.6;

export interface TokenSpec {
  slot: string;
  ux: number;
  uy: number;
  /** Widest the name pill may be, in plane units. */
  pillMax: number;
  player: (XiTokenPlayer & { id: string }) | null;
}

type Fx = { slots: readonly string[]; n: number; at: number } | null;

const EASE = Easing.bezier(Ease.kit[0], Ease.kit[1], Ease.kit[2], Ease.kit[3]);

interface TokenNodeProps {
  spec: TokenSpec;
  camera: PitchCamera;
  /** Points per unit of the reference layout. */
  refUnit: number;
  active: boolean;
  nameAbove: boolean;
  part: 'disc' | 'label';
  fx: Fx;
  pulse: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

function TokenNode({
  spec,
  camera,
  refUnit,
  active,
  nameAbove,
  part,
  fx,
  pulse,
  accessibilityLabel,
  onPress,
}: TokenNodeProps) {
  const ref = Xi.token * refUnit;
  const reduceMotion = useReducedMotion();

  // The one-shot pop (ADR 0217): a placement's disc lands 0.7 → 1.04 → 1.
  // ⚠ Each placement plays ONCE per node, and a stale one never — the screen
  // coming back into view long after is not a placement.
  const pop = useSharedValue(1);
  const played = useRef<number | null>(null);
  useEffect(() => {
    if (part !== 'disc' || !fx || played.current === fx.n || !fx.slots.includes(spec.slot)) return;
    played.current = fx.n;
    if (Date.now() - fx.at > XiMotion.fxStale) return;
    const timing = { easing: EASE, reduceMotion: ReduceMotion.System };
    pop.value = withSequence(
      withTiming(0.7, { duration: 0, reduceMotion: ReduceMotion.System }),
      withTiming(1.04, { ...timing, duration: XiMotion.pop * 0.6 }),
      withTiming(1, { ...timing, duration: XiMotion.pop * 0.4 }),
    );
  }, [fx, part, pop, spec.slot]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  // The keeper's slot before a first placement ever: `Pulse`'s breath, its
  // second consumer. ⚠ Reduce Motion holds the ring still at full strength.
  const breath = useSharedValue(1);
  useEffect(() => {
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
  const haloStyle = useAnimatedStyle(() => ({
    opacity: Pulse.dim + (1 - Pulse.dim) * breath.value,
    transform: [{ scale: 1 + (Pulse.scale - 1) * (1 - breath.value) }],
  }));

  const style = useAnimatedStyle(() => {
    const v = readView(camera);
    if (v.unit <= 0 || ref <= 0) return { opacity: 0 };
    const p = projectPoint(v, spec.ux, spec.uy);
    const diameter = Math.max(Xi.minToken, Xi.token * v.scale * p.depth);
    const lifted = p.y - Xi.lift * diameter * camera.lift.value;
    return {
      opacity: 1,
      transform: [
        { translateX: p.x - ref / 2 },
        { translateY: lifted - ref / 2 },
        { scale: diameter / ref },
      ],
    };
  });

  const token = (
    <XiToken
      unit={refUnit}
      slot={spec.slot}
      player={spec.player}
      active={active}
      nameAbove={nameAbove}
      pillMax={spec.pillMax}
      part={part}
    />
  );
  if (part === 'label') {
    return (
      <Animated.View pointerEvents="none" accessible={false} style={[styles.node, { width: ref, height: ref }, style]}>
        {token}
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[styles.node, { width: ref, height: ref }, style]}>
      {pulse ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { margin: -Pulse.gap * 2, borderWidth: Xi.slotDash * refUnit }, haloStyle]}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, popStyle]}>{token}</Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export interface TokenLayerProps {
  tokens: readonly TokenSpec[];
  camera: PitchCamera;
  refUnit: number;
  activeSlot: string | null;
  nameAbove: boolean;
  fx: Fx;
  /** The one slot whose ring breathes, if any. */
  pulseSlot: string | null;
  label: (spec: TokenSpec) => string;
  onPress: (spec: TokenSpec) => void;
}

export function TokenLayer({
  tokens,
  camera,
  refUnit,
  activeSlot,
  nameAbove,
  fx,
  pulseSlot,
  label,
  onPress,
}: TokenLayerProps) {
  return (
    <>
      {(['disc', 'label'] as const).flatMap((part) =>
        tokens.map((spec) => (
          <TokenNode
            key={`${part}-${spec.slot}`}
            spec={spec}
            camera={camera}
            refUnit={refUnit}
            active={spec.slot === activeSlot}
            nameAbove={nameAbove}
            part={part}
            fx={fx}
            pulse={part === 'disc' && spec.slot === pulseSlot && spec.player === null}
            accessibilityLabel={label(spec)}
            onPress={() => onPress(spec)}
          />
        )),
      )}
    </>
  );
}

/** For the debug probe: a ring wherever `projectPoint` says a plane point lands. */
export function ProbeRing({ camera, ux, uy }: { camera: PitchCamera; ux: number; uy: number }) {
  const style = useAnimatedStyle(() => {
    const p = projectPoint(readView(camera), ux, uy);
    return { transform: [{ translateX: p.x - PROBE / 2 }, { translateY: p.y - PROBE / 2 }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.probe, style]} />;
}

const PROBE = 14;

const styles = StyleSheet.create({
  node: { position: 'absolute', left: 0, top: 0 },
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    borderColor: Colors.dark.accent,
  },
  probe: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PROBE,
    height: PROBE,
    borderRadius: PROBE / 2,
    borderWidth: 2,
    borderColor: Colors.dark.xiProbeRing,
  },
});

