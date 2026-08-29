/**
 * Onboarding's league picker — a 2-up grid of chips that NAME themselves.
 *
 * ⚠ This deliberately breaks the artwork-only rule that governs `LeagueSwitch`
 * (ADR 0031), and ADR 0056 is why. 0031's reasoning is "the reader is choosing
 * between four marks they already recognise; the row is a filter, not a legend"
 * — which is true on Matchdays, Table and Clubs, and false on the first screen
 * of the app, where the reader has never seen any of it. There it IS a legend.
 * 0031's failure mode was a fixed-height ROW running off the screen edge; a
 * wrapping 2-up grid has the width for `Premier League` and cannot overflow.
 *
 * ⚠ Kept as a separate component rather than a `size`/`labelled` prop on
 * `LeagueSwitch`. That component's contract is "artwork alone, one fixed size,
 * horizontal scroll" and every line of it encodes 0031; a variant flag would
 * make one component argue with its own doc comment.
 *
 * ⚠ NO light plate behind the marks, and do not add one — the Premier League's
 * mark is PURE WHITE, drawn for a dark UI, and a light plate would render it
 * invisible. (`lib/cronogol/types.ts` still claims the marks need a plate; that
 * comment predates the 2026-08-08 artwork change and is stale. `cronogol`'s own
 * `ui/atoms/league-mark` has no plate either.)
 *
 * ⚠ NO 50% idle opacity, unlike `LeagueSwitch`. That exists to push back an
 * unselected *filter*; here it reads as three disabled options — and it is what
 * made the white Premier League mark look faint in the first place. Idle chips
 * are full opacity and the accent ring alone carries selection, which is also
 * how the club tiles below them on the same screen already work.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import type { LeagueOption } from './league-switch';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface LeagueChipsProps {
  leagues: readonly LeagueOption[];
  active: string;
  onSelect: (slug: string) => void;
}

export function LeagueChips({ leagues, active, onSelect }: LeagueChipsProps) {
  return (
    <View style={styles.grid}>
      {leagues.map((league) => {
        const selected = league.slug === active;
        return (
          <Pressable
            key={league.slug}
            onPress={() => onSelect(league.slug)}
            // Single-select among visible siblings — which is what `radio`
            // means. `LeagueSwitch` says `tab` because it genuinely is a strip.
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected ? styles.selected : styles.idle,
              pressed && styles.pressed,
            ]}>
            {league.logoUrl ? (
              <Image
                source={{ uri: league.logoUrl }}
                style={styles.mark}
                contentFit="contain"
                // The name is right there in the label below it.
                accessible={false}
              />
            ) : null}
            <Text variant="callout" numberOfLines={2} style={styles.name}>
              {league.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    width: '48%',
    minHeight: Size.leagueChipH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
  },
  // ⚠ Height only — no width. See `Size.leagueChipMarkH`.
  mark: { height: Size.leagueChipMarkH, width: '100%' },
  name: { textAlign: 'center' },
  selected: { backgroundColor: Colors.dark.raised, borderColor: Colors.dark.accentRing },
  idle: { borderColor: 'transparent' },
  pressed: { opacity: 0.7 },
});
