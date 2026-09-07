/**
 * The launch splash (ADR 0134) — design's `handoff_splashscreen/SPLASH.md`
 * timeline as one Reanimated choreography over the app. The native splash is
 * now a bare `Splash.base` ground; this overlay mounts in the same commit as
 * the Stack (t = 0 of every token in `Splash.t`), plays the 2500ms cycle, and
 * unmounts from the FINAL timing's completion callback — the app beneath is
 * interactive the frame this view leaves, not on a parallel timer.
 *
 * Imperative shared values, not `entering=` presets: six layers share one
 * clock, and the presets cannot couple them.
 *
 * The spec's clip-path wipes are the overflow-hidden + COUNTER-TRANSLATE
 * pair: the outer view slides its clipping window while the inner slides the
 * sheet the opposite way, so the gradient stays screen-fixed. Pure
 * transforms — animating width/height would re-layout the SVG sheet every
 * frame. One pair serves both axes: X is the 560–1240 wipe-in, Y is the
 * 2050–2500 collapse whose surviving top edge IS the Board's crown
 * (`CrownGrad` stop 0 is the same lime, ADR 0087/0094).
 *
 * ⚠ The overlay eats every touch by covering the screen — nothing beneath is
 * tappable until it unmounts. A 3.2s safety timeout forces `onDone` if the
 * completion callback is somehow lost; a stuck opaque overlay would brick
 * the app.
 *
 * ⚠ Reduce Motion (mandatory branch, theme.ts): no strike, no sweep, no
 * scale — the full lime sheet and settled lockup from frame 1, `t.rmHold`,
 * then a straight cross-fade. The status bar is DARK from mount in that
 * path: the screen is lime from its first frame, and light glyphs on lime
 * are unreadable (deviation from the spec's letter, recorded in 0134).
 *
 * Status bar otherwise: light through the cinematic, flipping at `t.out` as
 * the sheet starts becoming the crown. This component's `<StatusBar>` is the
 * LAST mounted, so it wins while the overlay lives; unmounting hands the bar
 * to `ScreenScaffold`'s own flip (initial `overBright` is `true` — dark),
 * which is the same ink. RN's StatusBar stack does the sequencing.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Mark, MARK_RATIO, WashGradient, WashRadial } from '@/components/atoms';
import { Colors, Motion, Splash } from '@/constants/theme';

/**
 * The sweep's `mixBlendMode: 'overlay'` (New Architecture) over the sibling
 * SVG sheet — flip to `false` if the blend renders as a white slab instead
 * of brightening the lime it crosses, which drops the bar to a plain sheen
 * at `Splash.sweep.fallbackOpacity`. An implementation contingency, not a
 * design token; the verdict frame is ~0.9s (ADR 0134).
 */
const SWEEP_BLEND = true;

const { t, ease } = Splash;
const bez = (e: readonly [number, number, number, number]) => Easing.bezier(...e);

export interface SplashOverlayProps {
  reduceMotion: boolean;
  /** Fired once, when the Board is fully up — the parent unmounts us. */
  onDone: () => void;
}

/**
 * ⚠ The Board beneath is NOT animated (trap 64). The spec's board fade
 * (opacity 0→1, scale 1.035→1 under the collapse) originally rode an
 * `Animated.View` wrapper around the Stack — and the native tab bar's
 * liquid-glass RAIL never attaches when `NativeTabs` mounts under an
 * ancestor with animated opacity/transform: the dock came up chromeless,
 * items floating bare on the content. The reveal is carried by this
 * overlay's own base-black dissolve instead (the reference runs both fades
 * over the same window, so the difference is only the 3.5% scale settle —
 * deviation recorded in 0134).
 */
export function SplashOverlay({ reduceMotion, onDone }: SplashOverlayProps) {
  const { width: W, height: H } = useWindowDimensions();
  const [phase, setPhase] = useState<'splash' | 'collapse'>(reduceMotion ? 'collapse' : 'splash');

  const markH = Splash.mark.width * MARK_RATIO;
  const blockTop = H * Splash.mark.top;
  const barW = W * Splash.sweep.widthFrac;

  // Initial values are the RM path's SETTLED frame when reduced — the same
  // components render both variants, nothing forks below the timeline.
  const overlayOpacity = useSharedValue(1);
  const limeOpacity = useSharedValue(0);
  const limeScale = useSharedValue(1.14);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.5);
  const sweepX = useSharedValue(Splash.sweep.travelFrom * barW);
  const sweepOpacity = useSharedValue(0);
  const sheetProgress = useSharedValue(reduceMotion ? 1 : 0);
  // The reference ramps the sheet 0→1 across the wipe (SPLASH.md is silent) —
  // it keeps the clip's leading edge soft under the sweep.
  const sheetOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const collapseProgress = useSharedValue(0);
  const lockOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const lockY = useSharedValue(reduceMotion ? 0 : 10);
  const inkScale = useSharedValue(reduceMotion ? 1 : 0.94);
  const wordTrack = useSharedValue(reduceMotion ? Splash.type.word.trackTo : Splash.type.word.trackFrom);
  const subOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const subY = useSharedValue(reduceMotion ? 0 : 8);
  const baseOpacity = useSharedValue(reduceMotion ? 0 : 1);

  // `onDone` unmounts us, so it must fire exactly once — the completion
  // callback and the safety timeout share this guard.
  const doneRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(finish)();
    };

    if (reduceMotion) {
      // Hold the settled lockup on the full sheet, then cross-fade under the
      // Board — no sweep, no strike, no scale.
      //
      // ⚠ `ReduceMotion.Never` on the config AND the `withDelay`, or this
      // branch never plays: Reanimated's default is `System`, and with the
      // system switch on — precisely when this branch runs — a timing JUMPS
      // to its final value, unmounting the overlay on its first frame (seen
      // on simulator; trap 63). The fade IS the reduced accommodation.
      const rm = ReduceMotion.Never;
      overlayOpacity.value = withDelay(
        t.rmHold,
        withTiming(0, { duration: Motion.enter, easing: bez(ease.lockup), reduceMotion: rm }, done),
        rm,
      );
    } else {
      // ── The strike: rise 190–240, flicker dip 300/380, out 1140–1240 as
      // the sheet takes over carrying the mark in ink.
      limeOpacity.value = withDelay(
        t.strikeStart,
        withSequence(
          withTiming(1, { duration: t.strikeLand - t.strikeStart, easing: bez(ease.strike) }),
          withTiming(0.22, { duration: t.dip - t.strikeLand, easing: Easing.linear }),
          withTiming(1, { duration: t.recover - t.dip, easing: Easing.linear }),
          withDelay(
            t.limeOutStart - t.recover,
            withTiming(0, { duration: t.sweepEnd - t.limeOutStart, easing: Easing.linear }),
          ),
        ),
      );
      limeScale.value = withDelay(
        t.strikeStart,
        withTiming(1, { duration: t.strikeLand - t.strikeStart, easing: bez(ease.strike) }),
      );

      // ── The glow blooms with the strike and is gone by 610.
      glowOpacity.value = withDelay(
        t.strikeStart,
        withSequence(
          withTiming(0.9, { duration: t.strikeLand - t.strikeStart, easing: bez(ease.strike) }),
          withTiming(0, { duration: t.glowEnd - t.strikeLand, easing: bez(ease.strike) }),
        ),
      );
      glowScale.value = withDelay(
        t.strikeStart,
        withSequence(
          withTiming(1, { duration: t.strikeLand - t.strikeStart, easing: bez(ease.strike) }),
          withTiming(1.7, { duration: t.glowEnd - t.strikeLand, easing: bez(ease.strike) }),
        ),
      );

      // ── The sweep and the sheet share the 560–1240 window, easings apart.
      sweepX.value = withDelay(
        t.sweepStart,
        withTiming(Splash.sweep.travelTo * barW, {
          duration: t.sweepEnd - t.sweepStart,
          easing: bez(ease.sweep),
        }),
      );
      sweepOpacity.value = withDelay(
        t.sweepStart,
        withSequence(
          withTiming(1, { duration: 40, easing: Easing.linear }),
          withDelay(
            t.sweepEnd - t.sweepStart - 100,
            withTiming(0, { duration: 60, easing: Easing.linear }),
          ),
        ),
      );
      sheetProgress.value = withDelay(
        t.sweepStart,
        withTiming(1, { duration: t.sweepEnd - t.sweepStart, easing: bez(ease.sheet) }),
      );
      sheetOpacity.value = withDelay(
        t.sweepStart,
        withTiming(1, { duration: t.sweepEnd - t.sweepStart, easing: bez(ease.sheet) }),
      );

      // ── The lockup rises, holds, and leaves as the collapse begins.
      lockOpacity.value = withDelay(
        t.lockupIn,
        withSequence(
          withTiming(1, { duration: t.lockupLand - t.lockupIn, easing: bez(ease.lockup) }),
          withDelay(
            t.out - t.lockupLand,
            withTiming(0, { duration: t.outEnd - t.out, easing: bez(ease.lockup) }),
          ),
        ),
      );
      lockY.value = withDelay(
        t.lockupIn,
        withSequence(
          withTiming(0, { duration: t.lockupLand - t.lockupIn, easing: bez(ease.lockup) }),
          withDelay(
            t.out - t.lockupLand,
            withTiming(-8, { duration: t.outEnd - t.out, easing: bez(ease.lockup) }),
          ),
        ),
      );
      inkScale.value = withDelay(
        t.lockupIn,
        withSequence(
          withTiming(1, { duration: t.lockupLand - t.lockupIn, easing: bez(ease.lockup) }),
          withDelay(
            t.out - t.lockupLand,
            withTiming(1.06, { duration: t.outEnd - t.out, easing: bez(ease.lockup) }),
          ),
        ),
      );
      wordTrack.value = withDelay(
        t.lockupIn,
        withTiming(Splash.type.word.trackTo, {
          duration: t.lockupLand - t.lockupIn,
          easing: bez(ease.lockup),
        }),
      );
      subOpacity.value = withDelay(
        t.subIn,
        withSequence(
          withTiming(1, { duration: t.subLand - t.subIn, easing: bez(ease.lockup) }),
          withDelay(
            t.out - t.subLand,
            withTiming(0, { duration: t.outEnd - t.out, easing: bez(ease.lockup) }),
          ),
        ),
      );
      subY.value = withDelay(
        t.subIn,
        withSequence(
          withTiming(0, { duration: t.subLand - t.subIn, easing: bez(ease.lockup) }),
          withDelay(
            t.out - t.subLand,
            withTiming(-8, { duration: t.outEnd - t.out, easing: bez(ease.lockup) }),
          ),
        ),
      );

      // ── The hand-off: sheet into the crown, black dissolving, Board bare
      // beneath (trap 64 — see the component doc).
      collapseProgress.value = withDelay(
        t.out,
        withTiming(1, { duration: t.end - t.out, easing: bez(ease.sheet) }, done),
      );
      baseOpacity.value = withDelay(
        t.out,
        withTiming(0, { duration: t.end - t.out, easing: bez(ease.baseOut) }),
      );
    }

    const flip = reduceMotion ? null : setTimeout(() => setPhase('collapse'), t.out);
    const safety = setTimeout(finish, 3200);
    return () => {
      if (flip) clearTimeout(flip);
      clearTimeout(safety);
    };
    // Mount-only by design: the timeline is one shot, and W/H/reduceMotion
    // cannot change under a portrait-locked launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const baseStyle = useAnimatedStyle(() => ({ opacity: baseOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const limeStyle = useAnimatedStyle(() => ({
    opacity: limeOpacity.value,
    transform: [{ scale: limeScale.value }],
  }));
  const clipStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [
      { translateX: (sheetProgress.value - 1) * W },
      { translateY: -collapseProgress.value * H },
    ],
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - sheetProgress.value) * W },
      { translateY: collapseProgress.value * H },
    ],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: lockOpacity.value,
    transform: [{ translateY: lockY.value }],
  }));
  const inkMarkStyle = useAnimatedStyle(() => ({ transform: [{ scale: inkScale.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ letterSpacing: wordTrack.value }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subY.value }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweepOpacity.value,
    transform: [{ translateX: sweepX.value }, { skewX: `${Splash.sweep.skewDeg}deg` }],
  }));

  const glowBox = {
    left: (W - Splash.glowSize) / 2,
    top: blockTop + markH / 2 - Splash.glowSize / 2,
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, rootStyle]}>
      <StatusBar style={phase === 'collapse' ? 'dark' : 'light'} />

      {!reduceMotion && <Animated.View style={[StyleSheet.absoluteFill, styles.base, baseStyle]} />}

      {!reduceMotion && (
        <Animated.View style={[styles.glow, glowBox, glowStyle]}>
          <WashRadial stops={Splash.glowStops} />
        </Animated.View>
      )}

      {!reduceMotion && (
        <Animated.View style={[styles.mark, { top: blockTop }, limeStyle]}>
          <Mark width={Splash.mark.width} color="accent" strokeWidth={Splash.mark.stroke} />
        </Animated.View>
      )}

      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, clipStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, sheetStyle]}>
          <WashGradient stops={Splash.sheet} angle="splash" />
        </Animated.View>
      </Animated.View>

      {/* The lockup is a SIBLING of the sheet, per the reference — the collapse
          does not clip it; it is near-zero opacity before the edge reaches it. */}
      <Animated.View style={[StyleSheet.absoluteFill, lockStyle]}>
        <Animated.View style={[styles.mark, { top: blockTop }, inkMarkStyle]}>
          <Mark width={Splash.mark.width} color="onCrown" strokeWidth={Splash.mark.stroke} />
        </Animated.View>
        <Animated.Text style={[styles.word, { top: blockTop + Splash.wordOffset }, wordStyle]}>
          ALTA GAMA FC
        </Animated.Text>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, subStyle]}>
        <Text style={[styles.sub, { top: blockTop + Splash.subOffset }]}>FIXTURE CLUB</Text>
      </Animated.View>

      {!reduceMotion && (
        <Animated.View
          style={[styles.sweep, { width: barW, height: H }, SWEEP_BLEND && styles.sweepBlend, sweepStyle]}>
          <WashGradient stops={SWEEP_STOPS} angle="pair" />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const SWEEP_STOPS = [
  { offset: 0, color: Splash.sweep.color, opacity: 0 },
  {
    offset: Splash.sweep.coreAt,
    color: Splash.sweep.color,
    opacity: SWEEP_BLEND ? Splash.sweep.coreOpacity : Splash.sweep.fallbackOpacity,
  },
  { offset: 1, color: Splash.sweep.color, opacity: 0 },
] as const;

const styles = StyleSheet.create({
  base: { backgroundColor: Splash.base },
  glow: {
    position: 'absolute',
    width: Splash.glowSize,
    height: Splash.glowSize,
  },
  mark: { position: 'absolute', alignSelf: 'center' },
  clip: { overflow: 'hidden' },
  word: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontFamily: Splash.type.word.family,
    fontSize: Splash.type.word.size,
    color: Colors.dark.onCrown,
  },
  sub: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontFamily: Splash.type.sub.family,
    fontSize: Splash.type.sub.size,
    letterSpacing: Splash.type.sub.track,
    color: Colors.dark.onCrownDim,
  },
  sweep: { position: 'absolute', left: 0, top: 0 },
  sweepBlend: { mixBlendMode: 'overlay' },
});
