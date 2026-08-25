/**
 * The horizontal league selector.
 *
 * ⚠ **A mark that carries its own wordmark gets NO text label; an emblem-only or
 * mark-less league gets the text.** That is the handoff's rule, and it is why
 * LaLiga and the Premier League show artwork alone while the Bundesliga (emblem
 * only) and Serie A (no mark at all) show a label. **Do not invent artwork for
 * Serie A.**
 *
 * ⚠ Artwork comes from the API (`league.logoUrls.primary`), not a bundled asset,
 * so a new league appears without an asset drop. `LeagueRef.logoUrls` is keyed
 * SEMANTICALLY (`primary`/`icon`/`wordmark`), the opposite of `TeamView`'s
 * size keys — picking wrong is a layout mistake, not a resolution one.
 */
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface LeagueOption {
  slug: string;
  name: string;
  logoUrl: string | null;
  /** True when the artwork already contains the league's name. */
  hasWordmark: boolean;
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
            ) : null}
            {(!league.hasWordmark || !league.logoUrl) && (
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 56,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.tile,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
  },
  selected: { backgroundColor: Colors.dark.raised, borderColor: Colors.dark.accentRing },
  // Inactive leagues drop to ~50%, per the handoff.
  idle: { borderColor: 'transparent', opacity: 0.5 },
  mark: { width: 64, height: 26 },
});
