/**
 * The account avatar: a disc of initials, or a person silhouette when there
 * is nobody to name (ADR 0101 — the mark said "app"; an account door should
 * say "you"). Shared by the tab headers' `AvatarButton` and the account
 * sheet's identity block, which is why it is an atom rather than either one's
 * private part.
 *
 * ⚠ `initials` is nullable and `null` is the SIGNED-OUT state, not a missing
 * prop.
 *
 * ⚠ `attention` is the signed-out header's SPINNING ring (ADR 0101): a
 * gradient arc orbiting the disc to pull the eye toward sign-in. It is two
 * sanctioned exceptions in one — a glow where 0015 has none, and a second
 * looping animation beside `skeleton.tsx` — both scoped to THIS prop, and it
 * must never be set on a signed-in avatar: attention is the invitation, not
 * the settled state. Reduced motion stills the arc and keeps the ring.
 *
 * ⚠ The arc's ink follows `tone`: the accent on the ground, but DARK ink on
 * the crown — lime on the crown's lime band is invisible, the same reason the
 * disc itself flips to `onCrown*` there (ADR 0087).
 *
 * ⚠ The signed-in accent ring settles in ONCE on mount rather than pulsing.
 * The sheet's identity sets it when signed in; the header's button never does
 * — one lime thing per screen (SPEC §2), and on a tab screen that budget
 * belongs to the live marker.
 */
import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { PersonGlyph } from './person-glyph';
import { Text, type TypeVariant } from './text';
import { Colors, Motion, Size, Spacing } from '@/constants/theme';

export interface AvatarProps {
  /** `null` is signed out — see the warning above. */
  initials: string | null;
  size?: number;
  /**
   * The accent ring, drawn outside the disc. The sheet's identity sets it when
   * signed in; the header's button never does — one lime thing per screen
   * (SPEC §2), and on a tab screen that budget belongs to the live marker.
   */
  ring?: boolean;
  /** The signed-out header's spinning arc (ADR 0101) — see the warning above. */
  attention?: boolean;
  /**
   * ON the crown's bright band the disc flips to the `onCrown*` ink set
   * (ADR 0087): a dark-ink fill and hairline, dark initials, dark glyph. The
   * default is the ground treatment the account sheet still uses.
   */
  tone?: 'ground' | 'crown';
}

/**
 * The initials' step against the disc, the way `crest.tsx` ramps its monogram.
 * Two stops rather than a formula: the type scale is discrete, and 42 and 64
 * are the only two sizes this draws at today.
 */
function initialsVariant(size: number): TypeVariant {
  return size >= Size.avatarLg ? 'title3' : 'caption';
}

/** The ring's gap from the disc — tight enough that the two read as one object. */
const RING_GAP = Spacing.half;
/** The orbit arc's clearance and stroke — a hair wider than the settle ring. */
const ORBIT_GAP = 3;
const ORBIT_STROKE = 2;

export function Avatar({
  initials,
  size = Size.avatar,
  ring = false,
  attention = false,
  tone = 'ground',
}: AvatarProps) {
  const reduceMotion = useReducedMotion();
  const gradientId = `avatar-orbit-${useId().replace(/:/g, '')}`;
  /** 0 → 1. Drives the ring alone; the disc under it never moves. */
  const settle = useSharedValue(ring && !reduceMotion ? 0 : 1);
  /** 0 → 1 per lap. Transform only — never a layout property. */
  const orbit = useSharedValue(0);

  useEffect(() => {
    if (!ring) return;
    if (reduceMotion) {
      settle.value = 1;
      return;
    }
    settle.value = withTiming(1, { duration: Motion.enter });
  }, [reduceMotion, ring, settle]);

  useEffect(() => {
    if (!attention || reduceMotion) {
      cancelAnimation(orbit);
      orbit.value = 0;
      return;
    }
    orbit.value = withRepeat(
      withTiming(1, { duration: Motion.orbit, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(orbit);
  }, [attention, orbit, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: settle.value,
    // Opens a hair outside and closes onto the disc. Transform and opacity
    // only — never a layout property.
    transform: [{ scale: 1 + (1 - settle.value) * 0.14 }],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value * 360}deg` }],
  }));

  const disc = { width: size, height: size, borderRadius: size / 2 };
  const orbitSize = size + ORBIT_GAP * 2 + ORBIT_STROKE;
  const orbitHalf = orbitSize / 2;
  // ~70% of the circumference: a comet with a tail, not a closed border.
  const orbitArc = 2 * Math.PI * (orbitHalf - ORBIT_STROKE / 2) * 0.7;
  const orbitInk = tone === 'crown' ? Colors.dark.onCrown : Colors.dark.accent;

  return (
    <View style={[styles.wrap, disc]}>
      {ring ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { borderRadius: (size + RING_GAP * 2) / 2 },
            ringStyle,
          ]}
        />
      ) : null}
      {attention ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbit,
            { width: orbitSize, height: orbitSize, shadowColor: orbitInk },
            orbitStyle,
          ]}>
          <Svg width={orbitSize} height={orbitSize} viewBox={`0 0 ${orbitSize} ${orbitSize}`}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={orbitInk} stopOpacity={0.95} />
                {/* ⚠ `stopOpacity`, never an rgba stop colour (trap 42). */}
                <Stop offset="1" stopColor={orbitInk} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Circle
              cx={orbitHalf}
              cy={orbitHalf}
              r={orbitHalf - ORBIT_STROKE / 2}
              stroke={`url(#${gradientId})`}
              strokeWidth={ORBIT_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${orbitArc} ${orbitArc}`}
              fill="none"
            />
          </Svg>
        </Animated.View>
      ) : null}
      <View style={[styles.disc, tone === 'crown' && styles.discCrown, disc]}>
        {initials ? (
          <Text variant={initialsVariant(size)} color={tone === 'crown' ? 'onCrown' : 'text'}>
            {initials}
          </Text>
        ) : (
          <PersonGlyph
            color={tone === 'crown' ? 'onCrown' : 'textSecondary'}
            size={size * 0.52}
            strokeWidth={1.8}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  disc: {
    backgroundColor: Colors.dark.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // The crown flip (ADR 0087): dark-ink fill and line on the lime band.
  discCrown: {
    backgroundColor: Colors.dark.onCrownFill,
    borderWidth: 1,
    borderColor: Colors.dark.onCrownLine,
  },
  ring: {
    position: 'absolute',
    top: -RING_GAP,
    left: -RING_GAP,
    right: -RING_GAP,
    bottom: -RING_GAP,
    borderWidth: 1.5,
    borderColor: Colors.dark.accentRing,
  },
  /**
   * The glow half of "spinning glow" (ADR 0101): a soft shadow in the arc's
   * own ink, cast by the arc's alpha. Colour is set inline with the ink.
   */
  orbit: {
    position: 'absolute',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
