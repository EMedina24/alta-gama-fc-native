/**
 * The account avatar: a disc of initials, or the mark when there is nobody to
 * name (ADR 0081). Shared by the tab headers' `AvatarButton` and the account
 * sheet's identity block, which is why it is an atom rather than either one's
 * private part.
 *
 * ⚠ `initials` is nullable and `null` is the SIGNED-OUT state, not a missing
 * prop. It draws the Alta Gama mark, not an empty circle — which is what the
 * header shipped as while there was no account to name (HANDOFF §5). The `·`
 * that replaced it works at 36pt and only at 36pt; at `Size.avatarLg` a bullet
 * reads as a rendering fault, and the mark is what the sheet should open with
 * anyway.
 *
 * ⚠ No shadow and no glow — depth is surface lightness (SPEC §2). The accent
 * ring is the one mark of a signed-in reader, and it settles in ONCE on mount
 * rather than pulsing: `skeleton.tsx` is the app's only looping animation and
 * stays that way.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Mark } from './mark';
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
  /**
   * ON the crown's bright band the disc flips to the `onCrown*` ink set
   * (ADR 0087): a dark-ink fill and hairline, dark initials, dark mark. The
   * default is the ground treatment the account sheet still uses.
   */
  tone?: 'ground' | 'crown';
}

/**
 * The initials' step against the disc, the way `crest.tsx` ramps its monogram.
 * Two stops rather than a formula: the type scale is discrete, and 36 and 64
 * are the only two sizes this draws at today.
 */
function initialsVariant(size: number): TypeVariant {
  return size >= Size.avatarLg ? 'title3' : 'caption';
}

export function Avatar({ initials, size = Size.avatar, ring = false, tone = 'ground' }: AvatarProps) {
  const reduceMotion = useReducedMotion();
  /** 0 → 1. Drives the ring alone; the disc under it never moves. */
  const settle = useSharedValue(ring && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!ring) return;
    if (reduceMotion) {
      settle.value = 1;
      return;
    }
    settle.value = withTiming(1, { duration: Motion.enter });
  }, [reduceMotion, ring, settle]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: settle.value,
    // Opens a hair outside and closes onto the disc. Transform and opacity
    // only — never a layout property.
    transform: [{ scale: 1 + (1 - settle.value) * 0.14 }],
  }));

  const disc = { width: size, height: size, borderRadius: size / 2 };

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
      <View style={[styles.disc, tone === 'crown' && styles.discCrown, disc]}>
        {initials ? (
          <Text variant={initialsVariant(size)} color={tone === 'crown' ? 'onCrown' : 'text'}>
            {initials}
          </Text>
        ) : (
          /* Sized off the disc rather than tokenised: the mark is 42×30, and a
             width of ~0.55 leaves it optically centred at both sizes. */
          <Mark
            width={size * 0.55}
            color={tone === 'crown' ? 'onCrown' : 'textSecondary'}
            strokeWidth={2.6}
          />
        )}
      </View>
    </View>
  );
}

/** The ring's gap from the disc — tight enough that the two read as one object. */
const RING_GAP = Spacing.half;

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
});
