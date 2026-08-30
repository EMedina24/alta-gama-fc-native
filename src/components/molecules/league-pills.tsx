/**
 * Onboarding's league picker — a horizontal row of pills that NAME themselves
 * (ADR 0076, replacing the 2-up `LeagueChips` grid of ADR 0056).
 *
 * 0056's rules carry over unchanged; only the form shrank so the clubs get the
 * screen:
 *
 * ⚠ The pills carry the league's NAME, deliberately breaking the artwork-only
 * rule that governs `LeagueSwitch` (ADR 0031). On the first screen of the app
 * the reader has never seen any of the marks — here the row IS a legend.
 *
 * ⚠ NO light plate behind the marks — the Premier League's mark is PURE WHITE,
 * drawn for a dark UI, and a plate would render it invisible.
 *
 * ⚠ NO 50% idle opacity, unlike `LeagueSwitch`. Here it read as three disabled
 * options, and it is what made the white mark look faint. Idle pills are full
 * opacity and the accent ring alone carries selection, as the club tiles do.
 *
 * ⚠ Height-only mark sizing (`Size.leaguePillMarkH`): the four marks have wildly
 * different aspect ratios and capping width shrinks the portrait ones to slivers.
 */
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms';
import type { LeagueOption } from './league-switch';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface LeaguePillsProps {
  leagues: readonly LeagueOption[];
  active: string;
  onSelect: (slug: string) => void;
}

export function LeaguePills({ leagues, active, onSelect }: LeaguePillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleeds to the screen edge so a half-visible pill says "there is more".
      style={styles.bleed}
      contentContainerStyle={styles.track}>
      {leagues.map((league) => {
        const selected = league.slug === active;
        return (
          <Pressable
            key={league.slug}
            onPress={() => onSelect(league.slug)}
            // Single-select among visible siblings — which is what `radio` means.
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.pill,
              selected ? styles.selected : styles.idle,
              pressed && styles.pressed,
            ]}>
            {league.logoUrl ? (
              <Image
                source={{ uri: league.logoUrl }}
                style={styles.mark}
                contentFit="contain"
                // The name is right there beside it.
                accessible={false}
              />
            ) : null}
            <Text variant="callout" color={selected ? 'text' : 'textSecondary'} numberOfLines={1}>
              {league.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.five },
  track: { gap: Spacing.two, paddingHorizontal: Spacing.five },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: Size.leaguePillH,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
  },
  // ⚠ Height only — see the header.
  mark: { height: Size.leaguePillMarkH, width: Size.leaguePillMarkH + 6 },
  selected: { backgroundColor: Colors.dark.raised, borderColor: Colors.dark.accentRing },
  idle: { borderColor: 'transparent' },
  pressed: { opacity: 0.7 },
});
