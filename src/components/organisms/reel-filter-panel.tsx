/**
 * The league filter pull-down (ADR 0129) — a panel under the crown, behind a
 * tap-to-dismiss veil. Replaces the old chip rail entirely.
 *
 * ⚠ The publisher ATTRIBUTION lives in this panel's footer and nowhere else on
 * the reel (the dc handoff's call): the reel card has no room for a standing
 * footnote, and the panel is the one surface every reader can reach from any
 * card. It is not decoration to trim — it is what makes aggregation defensible.
 *
 * ⚠ Chips are `ChipButton tone="neutral"` — the SAME atom as every filter in
 * the app (ADR 0092): the active/quiet colour semantics already match the dc's
 * values exactly (lime plate + `onAccent` ink / `card` + `textSecondary`), and
 * a one-off pill here would be the drift the atom exists to stop.
 *
 * ⚠ The chips stay reachable over an EMPTY feed: the screen keeps the crown
 * and this panel interactive whatever the list holds (handoff empty-state rule).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { ChipButton, Hairline, Text } from '@/components/atoms';
import { Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';

export interface ReelFilterChip {
  id: string;
  label: string;
}

export interface ReelFilterPanelProps {
  chips: readonly ReelFilterChip[];
  activeChip: string;
  onChip: (id: string) => void;
  onClose: () => void;
  /** `LEAGUE` — `copy.news.leagueFilter`, uppercased by the eyebrow token. */
  eyebrow: string;
  /** `copy.news.attribution` — its only home on the reel. */
  attribution: string;
  /** The screen's top safe-area inset. */
  topInset: number;
}

export function ReelFilterPanel({
  chips,
  activeChip,
  onChip,
  onClose,
  eyebrow,
  attribution,
  topInset,
}: ReelFilterPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.layer}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={eyebrow}
        style={styles.scrim}
      />
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(Motion.base)}
        style={[styles.panel, { top: Size.reelPanelTop + topInset }]}>
        <Text variant="eyebrowSm" color="textSecondary" style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <View style={styles.chips}>
          {chips.map((chip) => (
            <ChipButton
              key={chip.id}
              label={chip.label}
              active={chip.id === activeChip}
              tone="neutral"
              onPress={() => onChip(chip.id)}
            />
          ))}
        </View>
        <View style={styles.rule}>
          <Hairline strength="mid" />
        </View>
        <Text variant="micro" color="textFaint">
          {attribution}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 14 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.reelScrimFill,
  },
  panel: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    backgroundColor: Colors.dark.reelPanelFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineStrong,
    borderRadius: Radius.cardLg,
    padding: Spacing.four,
    // dc: 0 22px 50px rgba(0,0,0,.5) — the panel floats over a photo.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 22 },
  },
  eyebrow: { paddingBottom: Spacing.three, paddingHorizontal: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  rule: { marginTop: Spacing.four, marginBottom: Spacing.three },
});
