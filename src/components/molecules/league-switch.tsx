/**
 * The horizontal league selector.
 *
 * ⚠ **Artwork alone — no text label** (ADR 0031). The tiles are a filter row,
 * not a legend: the reader is picking between four marks they already know, and
 * `BUNDESLIGA` spelled out ran a single tile off the edge of the screen. The
 * name still reaches VoiceOver through `accessibilityLabel`.
 *
 * ⚠ The text branch survives for a league that arrives with NO artwork at all —
 * an empty tile is unpickable. That tile sizes to its label instead of taking
 * the fixed width, so it can say the whole name.
 *
 * ⚠ Artwork comes from the API (`league.logoUrls`), not a bundled asset, so a
 * new league appears without an asset drop. `LeagueRef.logoUrls` is keyed
 * SEMANTICALLY (`primary`/`icon`/`wordmark`), the opposite of `TeamView`'s size
 * keys — picking wrong is a layout mistake, not a resolution one. Prefer `icon`
 * and fall back to `primary`: only LaLiga ships an icon-only cut today, and the
 * others' lockups carry their own wordmark, which is as close to "icon" as the
 * wire gets.
 */
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface LeagueOption {
  slug: string;
  name: string;
  /** `logoUrls.icon ?? logoUrls.primary ?? logoUrl`, resolved by the screen. */
  logoUrl: string | null;
}

export interface LeagueSwitchProps {
  leagues: readonly LeagueOption[];
  active: string;
  onSelect: (slug: string) => void;
}

export function LeagueSwitch({ leagues, active, onSelect }: LeagueSwitchProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}>
      {leagues.map((league) => {
        const selected = league.slug === active;
        return (
          <Pressable
            key={league.slug}
            onPress={() => onSelect(league.slug)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={league.name}
            style={({ pressed }) => [
              styles.tile,
              league.logoUrl ? styles.sized : styles.labelled,
              selected ? styles.selected : styles.idle,
              pressed && { opacity: 0.7 },
            ]}>
            {league.logoUrl ? (
              <Image
                source={{ uri: league.logoUrl }}
                style={styles.mark}
                contentFit="contain"
                accessible={false}
              />
            ) : (
              <Text variant="eyebrow" color={selected ? 'text' : 'textFaint'}>
                {league.name}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { gap: Spacing.two, paddingRight: Spacing.five },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Size.leagueTileH,
    borderRadius: Radius.tile,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
  },
  // Four marks at this width sit inside the screen gutter without scrolling.
  sized: { width: Size.leagueTileW },
  labelled: { paddingHorizontal: Spacing.four },
  selected: { backgroundColor: Colors.dark.raised, borderColor: Colors.dark.accentRing },
  // Inactive leagues drop to ~50%, per the handoff.
  idle: { borderColor: 'transparent', opacity: 0.5 },
  mark: { width: Size.leagueMarkW, height: Size.leagueMarkH },
});
