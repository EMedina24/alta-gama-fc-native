/**
 * The Matchdays crown's second row: prev/next squares on the left, the round's
 * date range over "10 MATCHES · CEST" on the right (SPEC §3.2 for behaviour;
 * ADR 0087 for the ground — the row sits in the crown's BRIGHT band and draws
 * only `onCrown*` inks).
 *
 * ⚠ The squares drive the SAME matchweek state as `MatchdayStrip` — the screen
 * hands both one clamped setter. A second state here is how a pager and a strip
 * end up disagreeing about which round is open.
 *
 * ⚠ Not accent. On this screen the accent belongs to the active pill and the
 * "Add all" button; a lime arrow would be a third thing claiming it (SPEC §2) —
 * and lime on lime would say nothing anyway.
 *
 * The chevrons are text glyphs — no icon set is used anywhere in the app yet
 * (ADR 0028). Language never reaches this file: labels and both lines arrive
 * already worded — `primaryTone` arrives in the caller's OLD vocabulary
 * (`textSecondary` = confirmed, `textFaint` = provisional) and is mapped onto
 * crown inks here, so the screens did not have to learn the new set.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface MatchdayPagerProps {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  /** The date range — or the "dates to be confirmed" phrase when provisional. */
  primary: string;
  /** "10 MATCHES · CEST" */
  secondary: string;
  /** `textFaint` for the provisional phrase; the real range reads a shade stronger. */
  primaryTone?: 'textSecondary' | 'textFaint';
}

export function MatchdayPager({
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  primary,
  secondary,
  primaryTone = 'textSecondary',
}: MatchdayPagerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.squares}>
        <Square glyph="‹" label={prevLabel} enabled={canPrev} onPress={onPrev} />
        <Square glyph="›" label={nextLabel} enabled={canNext} onPress={onNext} />
      </View>
      <View style={styles.meta}>
        <Text
          variant="eyebrowSm"
          color={primaryTone === 'textSecondary' ? 'onCrown' : 'onCrownDim'}
          tabular
          numberOfLines={1}
          style={styles.right}>
          {primary}
        </Text>
        <Text variant="eyebrowSm" color="onCrownDim" tabular numberOfLines={1} style={styles.right}>
          {secondary}
        </Text>
      </View>
    </View>
  );
}

function Square({
  glyph,
  label,
  enabled,
  onPress,
}: {
  glyph: string;
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      // ⚠ 44pt target on a 34pt square — the same trick as `ChipButton`.
      hitSlop={(Size.minTouch - Size.pill) / 2}
      style={({ pressed }) => [
        styles.square,
        !enabled && styles.disabled,
        pressed && enabled && styles.pressed,
      ]}>
      <Text variant="title3" color="onCrown" style={styles.glyph}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  squares: { flexDirection: 'row', gap: Spacing.two },
  square: {
    width: Size.pill,
    height: Size.pill,
    borderRadius: Radius.crownControl,
    backgroundColor: Colors.dark.onCrownFill,
    borderWidth: 1,
    borderColor: Colors.dark.onCrownLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Optical: the glyph sits high in its box at title3; nudge it to centre.
  glyph: { marginTop: -2 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  meta: { flexShrink: 1, alignItems: 'flex-end', gap: Spacing.half },
  right: { textAlign: 'right' },
});
