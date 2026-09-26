/**
 * The Starting XI pitch card (ADR 0213, 0216): status and camera controls on
 * top, the plane and its eleven tokens under one camera, a hint at the foot.
 *
 * ⚠⚠ **Tap to pick, never drag to place** (the mobile handoff). A one-finger
 * drag is the CAMERA — it pans a zoomed flat pitch and orbits the 3D one — so
 * a placement gesture on the same surface would fight it. Tapping a slot
 * reports up; the screen opens the picker or the player card.
 *
 * ⚠ The card is PAINT, not glass: the plane under it moves by transform, and
 * a transformed child of a glass surface is trap 64's cousin. The small
 * controls on top of the scene are glass; this card is not.
 *
 * ⚠ Fetches nothing. The squad, the XI and the view arrive as props.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { FlipGlyph, TapGlyph, Text, WashGradient } from '@/components/atoms';
import { PitchPlane } from '@/components/molecules/pitch-plane';
import { XiStatusPill, type XiStatusTone } from '@/components/molecules/xi-status-pill';
import { Colors, Ease, Radius, Size, Spacing, Xi, XiMotion } from '@/constants/theme';
import { orbInitials, tokenName } from '@/features/starting-xi/card-geometry';
import { laneGap, pitchSlots, toPlane } from '@/features/starting-xi/pitch-geometry';
import { CAMERA, planeCentre, planeFit, planeOps, planeUnit, projectPoint } from '@/features/starting-xi/projection';
import type { FormationId, SlotId } from '@/features/starting-xi/slots';
import type { Placements } from '@/features/starting-xi/xi-state';
import type { SquadPlayerView } from '@/lib/cronogol/types';

import { ProbeRing, TOKEN_OVERSAMPLE, TokenLayer, type TokenSpec } from './xi-pitch/token-layer';
import { readView, usePitchCamera } from './xi-pitch/use-pitch-camera';

export interface XiPitchLabels {
  reset: string;
  view3d: string;
  viewFlat: string;
  flip: string;
  tapHint: string;
  gestureFlat: string;
  gesture3d: string;
  emptySlot: (slot: string) => string;
  filledSlot: (name: string, slot: string) => string;
}

export interface XiPitchProps {
  formation: FormationId;
  placements: Placements;
  players: ReadonlyMap<string, SquadPlayerView>;
  flat: boolean;
  flatRot: 0 | 180;
  rotZ: number;
  tiltX: number;
  gestured: boolean;
  /** The last placement, while the pitch is in view — its tokens pop and ripple once. */
  fx: { slots: readonly string[]; n: number; at: number } | null;
  /** Before the first placement ever: the keeper's slot breathes (the `Pulse` token). */
  gkHint: boolean;
  /** The ripple's ink — the club's glow; the accent when there is no scene. */
  rippleColor: string | null;
  status: { tone: XiStatusTone; label: string };
  /** A lime ring on the slot whose sheet is open. */
  activeSlot: SlotId | null;
  labels: XiPitchLabels;
  onTapSlot: (slot: SlotId, playerId: string | null) => void;
  onToggleFlat: () => void;
  onFlip: () => void;
  /** Reset the stored 3D angles; zoom and pan are this card's own. */
  onResetAngles: () => void;
  onCameraEnd: (patch: { rotZ: number; tiltX: number }) => void;
  onGestured: () => void;
  /** `_debug/xi?probe=1`: the camera's proof marks. */
  probe?: boolean;
}

export function XiPitch(props: XiPitchProps) {
  const { formation, placements, players, flat, flatRot, rotZ, tiltX, gestured, status, activeSlot, labels } = props;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const { camera, makeGesture, zoomPct, resetZoom, tapIsGestureTail } = usePitchCamera({
    w: box?.w ?? 0,
    h: box?.h ?? 0,
    flat,
    flatRot,
    rotZ,
    tiltX,
    onCameraEnd: props.onCameraEnd,
    onGestured: props.onGestured,
  });

  const unit = box ? planeUnit(box.w) : 0;
  const refUnit = unit * TOKEN_OVERSAMPLE;

  const tokens: TokenSpec[] = useMemo(() => {
    const specs = pitchSlots(formation).map((slot) => {
      const { ux, uy } = toPlane(slot);
      const id = placements[slot.id];
      const p = id === undefined ? undefined : players.get(id);
      return {
        slot: slot.id,
        ux,
        uy,
        pillMax: pillCap(slot.rowSize),
        player: p
          ? {
              id: p.id,
              initials: orbInitials(p),
              photoUrl: p.photoUrl,
              shirt: p.shirt,
              name: pillName(tokenName(p), pillCap(slot.rowSize)),
            }
          : null,
      };
    });
    if (!box) return specs;
    // Paint in depth order for the view at rest: nearer tokens on top.
    const fit = planeFit(box.w, box.h, flat);
    const rest = {
      w: box.w,
      h: box.h,
      unit: planeUnit(box.w),
      scale: fit,
      panX: 0,
      panY: 0,
      centre: planeCentre(box.h, fit, flat),
      tilt: flat ? 0 : tiltX,
      rot: flat ? flatRot : rotZ,
    };
    return specs
      .map((spec) => ({ spec, y: projectPoint(rest, spec.ux, spec.uy).y }))
      .sort((a, b) => a.y - b.y)
      .map(({ spec }) => spec);
  }, [formation, placements, players, box, flat, flatRot, rotZ, tiltX]);

  const planeStyle = useAnimatedStyle(() => ({ transform: planeOps(readView(camera)) }));

  const count = tokens.filter((t) => t.player).length;
  const hint = count === 0 ? 'tap' : !gestured ? 'gesture' : null;
  const rest3d = ((rotZ % 360) + 360) % 360 === 0 && tiltX === CAMERA.tilt;
  const offDefault = zoomPct !== 100 || (!flat && !rest3d);

  const onReset = () => {
    resetZoom();
    if (!flat) props.onResetAngles();
  };

  const tap = (spec: TokenSpec) => {
    if (tapIsGestureTail()) return;
    props.onTapSlot(spec.slot, spec.player?.id ?? null);
  };

  return (
    <View style={styles.card}>
      <WashGradient
        angle="vertical"
        stops={[
          { offset: 0, color: Colors.dark.xiWashInk, opacity: Xi.wash.cardTop },
          { offset: 1, color: Colors.dark.xiWashInk, opacity: Xi.wash.cardFoot },
        ]}
      />

      <GestureDetector gesture={makeGesture()}>
        <View
          // ⚠ While a hint shows, the plane fits ABOVE it — the pill sat on the
          // keeper's name in the first build. It grows back when the hint goes.
          style={[styles.scene, hint ? styles.sceneHinted : null]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setBox((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
          }}>
          {box && unit > 0 ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.plane,
                  { left: (box.w - 520 * unit) / 2, top: (box.h - 800 * unit) / 2 },
                  planeStyle,
                ]}>
                <PitchPlane unit={unit}>
                  {!flat ? <Shadows tokens={tokens} unit={unit} /> : null}
                  {props.fx
                    ? tokens
                        .filter((t) => props.fx?.slots.includes(t.slot))
                        .map((t) => (
                          <Ripple
                            key={`${props.fx?.n}-${t.slot}`}
                            fx={props.fx as NonNullable<XiPitchProps['fx']>}
                            x={t.ux * unit}
                            y={t.uy * unit}
                            size={Xi.token * unit}
                            color={props.rippleColor ?? Colors.dark.accent}
                          />
                        ))
                    : null}
                  {props.probe ? <ProbeMarks tokens={tokens} unit={unit} /> : null}
                </PitchPlane>
              </Animated.View>
              <TokenLayer
                tokens={tokens}
                camera={camera}
                refUnit={refUnit}
                activeSlot={activeSlot}
                nameAbove={!flat}
                fx={props.fx}
                pulseSlot={props.gkHint ? 'GK' : null}
                label={(spec) =>
                  spec.player ? labels.filledSlot(spec.player.name, spec.slot) : labels.emptySlot(spec.slot)
                }
                onPress={tap}
              />
              {props.probe
                ? PROBE_POINTS(tokens).map(([ux, uy], i) => <ProbeRing key={i} camera={camera} ux={ux} uy={uy} />)
                : null}
            </>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.bar} pointerEvents="box-none">
        <XiStatusPill tone={status.tone} label={status.label} />
        <View style={styles.spacer} pointerEvents="none" />
        {offDefault ? (
          <BarButton label={zoomPct !== 100 ? `${zoomPct}%` : labels.reset} onPress={onReset} />
        ) : null}
        <BarButton label={flat ? labels.view3d : labels.viewFlat} onPress={props.onToggleFlat} />
        <BarButton onPress={props.onFlip} accessibilityLabel={labels.flip} round>
          <FlipGlyph size={15} />
        </BarButton>
      </View>

      {hint ? (
        <View style={styles.hintRow} pointerEvents="none">
          <View style={styles.hint}>
            {hint === 'tap' ? <TapGlyph size={15} /> : null}
            <Text variant="caption" color={hint === 'tap' ? 'text' : 'textSecondary'} numberOfLines={1}>
              {hint === 'tap' ? labels.tapHint : flat ? labels.gestureFlat : labels.gesture3d}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The widest a name may be in a row of `rowSize`, in plane units. */
function pillCap(rowSize: number): number {
  return Math.min(Xi.pillMax, laneGap(rowSize) + Xi.pillSpill);
}

/**
 * The name to print under a token: the short name when it fits the pill, else
 * its surname with any lower-case particle kept ("de Jong", "van Dijk"), else
 * the short name to be ellipsised. Width is ESTIMATED from `Xi.nameEm` — the
 * pill truncates cleanly if the estimate is short.
 */
function pillName(name: string, cap: number): string {
  const width = (text: string) => text.length * Xi.nameFont * Xi.nameEm + Xi.namePadX * 2;
  if (width(name) <= cap) return name;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2) return name;
  let start = words.length - 1;
  while (start > 1 && /^\p{Ll}/u.test(words[start - 1])) start -= 1;
  return words.slice(start).join(' ');
}

/** One of the three 28pt controls on the card's top bar. */
function BarButton({
  label,
  onPress,
  accessibilityLabel,
  round = false,
  children,
}: {
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  round?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={(Size.minTouch - Xi.barH) / 2}
      style={({ pressed }) => [styles.barButton, round && styles.barRound, pressed && styles.barPressed]}>
      {children ?? (
        <Text variant="caption" style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Contact shadows on the grass under each placed token — 3D only. */
function Shadows({ tokens, unit }: { tokens: readonly TokenSpec[]; unit: number }) {
  return (
    <Svg width={520 * unit} height={800 * unit} style={StyleSheet.absoluteFill} accessible={false}>
      <Defs>
        <RadialGradient id="xi-shadow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset={0} stopColor={Colors.dark.xiShadowInk} stopOpacity={Xi.wash.shadow} />
          <Stop offset={0.7} stopColor={Colors.dark.xiShadowInk} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {tokens
        .filter((t) => t.player)
        .map((t) => (
          <Ellipse key={t.slot} cx={t.ux * unit} cy={t.uy * unit} rx={45 * unit} ry={25 * unit} fill="url(#xi-shadow)" />
        ))}
    </Svg>
  );
}

const EASE = Easing.bezier(Ease.kit[0], Ease.kit[1], Ease.kit[2], Ease.kit[3]);

/**
 * A ring spreading on the grass where a player just landed (ADR 0217) — a
 * plane child, so it lies flat under the camera. Plays once, on mount, and
 * only for a placement younger than `XiMotion.fxStale`.
 */
function Ripple({
  fx,
  x,
  y,
  size,
  color,
}: {
  fx: NonNullable<XiPitchProps['fx']>;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const t = useSharedValue(1);
  useEffect(() => {
    if (Date.now() - fx.at > XiMotion.fxStale) return;
    t.value = 0;
    t.value = withTiming(1, { duration: XiMotion.ripple, easing: EASE, reduceMotion: ReduceMotion.System });
  }, [fx, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - t.value),
    transform: [{ scale: 0.2 + 3 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        { left: x - size / 2, top: y - size / 2, width: size, height: size, borderColor: color },
        style,
      ]}
    />
  );
}

/** Four corners, the centre spot and every slot anchor. */
function PROBE_POINTS(tokens: readonly TokenSpec[]): [number, number][] {
  return [[0, 0], [520, 0], [0, 800], [520, 800], [260, 400], ...tokens.map((t): [number, number] => [t.ux, t.uy])];
}

/** The native transform's half of the probe: marks drawn ON the plane. */
function ProbeMarks({ tokens, unit }: { tokens: readonly TokenSpec[]; unit: number }) {
  const r = 5;
  return (
    <>
      {PROBE_POINTS(tokens).map(([ux, uy], i) => (
        <View
          key={i}
          style={[
            styles.probeMark,
            { left: ux * unit - r, top: uy * unit - r, width: r * 2, height: r * 2, borderRadius: r },
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Xi.cardRadius,
    overflow: 'hidden',
    backgroundColor: Colors.dark.xiCardFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.xiControlLine,
  },
  scene: { position: 'absolute', left: 0, right: 0, top: Xi.sceneTop, bottom: 0 },
  sceneHinted: { bottom: Xi.hintH + Spacing.three * 2 },
  plane: { position: 'absolute' },
  bar: {
    position: 'absolute',
    top: Xi.barInset,
    left: Xi.barInset,
    right: Xi.barInset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two - 2,
  },
  spacer: { flex: 1 },
  barButton: {
    height: Xi.barH,
    minWidth: Xi.barH,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: Xi.barH / 2,
    backgroundColor: Colors.dark.xiControl,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.xiControlLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barRound: { width: Xi.barH, paddingHorizontal: 0 },
  barPressed: { backgroundColor: Colors.dark.xiControlLine },
  barLabel: { fontWeight: '600' },
  hintRow: { position: 'absolute', left: 0, right: 0, bottom: Spacing.three + 2, alignItems: 'center' },
  hint: {
    height: Xi.hintH,
    borderRadius: Xi.hintH / 2,
    paddingLeft: Spacing.two + 2,
    paddingRight: Spacing.three + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.dark.xiNamePill,
  },
  probeMark: { position: 'absolute', backgroundColor: Colors.dark.xiProbeMark, borderRadius: Radius.pill },
  ripple: { position: 'absolute', borderRadius: Radius.pill, borderWidth: 2 },
});
