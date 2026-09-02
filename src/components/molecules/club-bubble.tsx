/**
 * One club on the Clubs screen's subscribed rail — 0090's LIQUID GLASS shell,
 * replacing 0082's club-colour bubble. White glass, no club-colour radial and
 * no club-colour glow: the rail sits on the crown's fade now, and colour there
 * belongs to the crests alone.
 *
 * ⚠⚠ **On the RAIL the bubble has exactly ONE action: open the club.** The lime
 * check is an indicator with `pointerEvents: 'none'` — it is NOT an unfollow
 * button. An unfollow target inside an 88pt disc lands within a thumb's width
 * of the open-club tap, and unfollowing drops a whole season of calendar
 * entries. Unfollow lives on the club page, behind the hero pill and the
 * alerts row, which confirm.
 *
 * ⚠ The ONBOARDING PICKER is the sanctioned second use (ADR 0099): `checked`
 * makes the tap a SELECTION toggle and the check its state. That does not
 * weaken the rail's rule — the picker precedes any follow, so there is no
 * season of entries to lose and nothing to confirm.
 *
 * ⚠ **The shell is a real `GlassView` only where liquid glass exists**
 * (`isLiquidGlassAvailable()`, iOS 26+); everywhere else a flat `bubbleShell`
 * fill — the spec's own floor ("below iPhone 13, drop backdrop-filter…use the
 * flat fill"). The gate selects BEFORE mount; both paths share every overlay,
 * so the two render one design at two fidelities.
 *
 * ⚠ **The drop shadow is sanctioned by 0087** (shadows where the mock draws
 * them) — `0 10 22 rgba(6,18,14,.28)`, the mock's numbers with the CSS blur
 * halved into RN's radius, the same conversion 0082 measured.
 *
 * ⚠ **The rank is absent, not zero and not a dash** — see `ClubRail` for which
 * tables may produce one. Its pill is FROSTED (`bubbleRankFill`) with dark
 * `onCrown` ink; the qualification band's colour is a leading 4pt dot, because
 * band inks built for the dark ground fail contrast on a white pill.
 *
 * ⚠ Every lit edge here is a border on an absolutely-positioned overlay, never
 * an inset shadow (React Native has none) and never a border on the content
 * box (it would inset the crest by its width). All four sides are drawn at the
 * same width with three transparent — the straight-chord trap from 0082.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { Check, Crest, Text, WashGradient, WashRadial } from '@/components/atoms';
import { BubbleGlass, Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface ClubBubbleProps {
  /** Already shortened by the organism — `pickerName`, not the raw name. */
  name: string;
  crest: string | null;
  abbr: string;
  /** League position, or null where no table may be quoted. */
  rank: number | null;
  /** The qualification band's ink for the rank dot, or null when unbanded. */
  rankColor: string | null;
  onPress: () => void;
  /** Names the club AND its position — the badge is not readable on its own. */
  accessibilityLabel: string;
  /**
   * Onboarding-picker selection (ADR 0099). A boolean draws the check only
   * when true and announces a checkbox; OMITTED — the subscribed rail — keeps
   * the check as a permanent indicator and stays a button.
   */
  checked?: boolean;
}

const RING = Size.clubBubble / 2;
/** Decided once at module scope — the gate must pick a path BEFORE mount. */
const LIQUID = isLiquidGlassAvailable();

export function ClubBubble({
  name,
  crest,
  abbr,
  rank,
  rankColor,
  onPress,
  accessibilityLabel,
  checked,
}: ClubBubbleProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={checked === undefined ? 'button' : 'checkbox'}
      accessibilityState={checked === undefined ? undefined : { checked }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
      <View style={styles.disc}>
        {LIQUID ? (
          <GlassView style={styles.glass} glassEffectStyle="clear" />
        ) : (
          <View style={[styles.glass, styles.glassFlat]} />
        )}

        {/* The shared overlay stack — decorative, clipped to the disc. */}
        <View pointerEvents="none" style={styles.overlays}>
          <WashGradient angle="vertical" stops={BubbleGlass} />
          {/* The bottom "inner bounce": light returning off the shell's foot. */}
          <View style={styles.bounce}>
            <WashGradient
              angle="vertical"
              stops={[
                { offset: 0, color: '#ffffff', opacity: 0 },
                { offset: 1, color: '#ffffff', opacity: 0.14 },
              ]}
            />
          </View>
          {/* One specular pool across the top third; the CSS 2px blur is
              approximated by the elliptical fade itself (recorded divergence,
              0090) — a hard-edged strip read as a decal on the simulator. */}
          <WashRadial
            cx={0.42}
            cy={0.16}
            rx={0.4}
            ry={0.18}
            stops={[
              { offset: 0, color: '#ffffff', opacity: 0.5 },
              { offset: 1, color: '#ffffff', opacity: 0 },
            ]}
          />
        </View>

        {/* The rim and the lit top edge, over everything but the crest. */}
        <View pointerEvents="none" style={styles.rim} />
        <View pointerEvents="none" style={styles.topEdge} />

        <View pointerEvents="none" style={styles.crestSeat}>
          <Crest src={crest} fallback={abbr} size={Size.crestBubble} />
        </View>

        {/* Indicator only. See the ⚠⚠ in the header before adding an onPress. */}
        {checked !== false ? (
          <View pointerEvents="none" style={styles.check}>
            <Check color="onAccent" size={Size.bubbleCheck - 14} />
          </View>
        ) : null}

        {rank !== null ? (
          <View pointerEvents="none" style={styles.rank}>
            {rankColor ? <View style={[styles.rankDot, { backgroundColor: rankColor }]} /> : null}
            <Text variant="rankBadge" tabular color="onCrown">
              {`#${rank}`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="railName" center numberOfLines={1} style={styles.name}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { width: Size.clubBubble, alignItems: 'center' },
  /** ⚠ Scale, not opacity: a fading crest reads as the club going offline. */
  pressed: { transform: [{ scale: 0.945 }] },
  disc: { width: Size.clubBubble, height: Size.clubBubble },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING,
    // The mock's `0 10 22 rgba(6,18,14,.28)` — blur halved into the radius.
    shadowColor: '#06120e',
    shadowOpacity: 0.28,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 10 },
  },
  glassFlat: { backgroundColor: Colors.dark.bubbleShell },
  overlays: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING,
    // ⚠ Required: the washes fill their boxes absolutely and would square the
    // corners off without the clip — `match-board`'s `flush` fault.
    overflow: 'hidden',
  },
  bounce: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '26%',
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING,
    borderWidth: 1,
    borderColor: Colors.dark.bubbleRim,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING,
    // ⚠ All four sides at 1pt so the radius traces correctly; only the top is
    // inked — three transparent sides stop RN drawing a straight chord.
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: Colors.dark.bubbleTop,
  },
  crestSeat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: Size.bubbleCheck,
    height: Size.bubbleCheck,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accent,
    // ⚠ A WHITE rim now (0090), not a ground cutout — the bubble no longer
    // sits on a flat ground it could be cut out of.
    borderWidth: 2,
    borderColor: Colors.dark.bubbleCheckRim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    position: 'absolute',
    bottom: -2,
    left: 2,
    height: Size.bubbleRank,
    paddingHorizontal: Spacing.two - 1,
    borderRadius: Radius.chipSm + 1,
    backgroundColor: Colors.dark.bubbleRankFill,
    borderWidth: 1,
    borderColor: Colors.dark.bubbleRankLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  rankDot: { width: 4, height: 4, borderRadius: 2 },
  name: { marginTop: Spacing.three + 1, width: '100%' },
});
