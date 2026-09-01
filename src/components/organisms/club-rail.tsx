/**
 * The subscribed-clubs rail on the Clubs screen (ADR 0082).
 *
 * A horizontal rail of 88pt crest bubbles, NOT a list: subscriptions are a
 * small, glanceable set and the crest is the fastest thing a fan reads. The
 * vertical list this replaced spent 68pt of height per club to say the same
 * thing, and pushed Browse below the fold on an iPhone SE.
 *
 * ⚠ Ordered by the FOLLOW list, not alphabetically, so a club a reader has just
 * followed appears where they put it rather than jumping to a letter.
 *
 * ⚠ The rail bleeds past the screen gutter so the next bubble peeks — the
 * `LeaguePills` pattern. Its own left padding restores the gutter for the first.
 */
import { ScrollView, StyleSheet } from 'react-native';

import { ClubBubble } from '@/components/molecules';
import { Spacing } from '@/constants/theme';

export interface RailClub {
  slug: string;
  /** Already shortened — `pickerName`. */
  name: string;
  crest: string | null;
  abbr: string;
  rank: number | null;
  rankColor: string | null;
  accessibilityLabel: string;
}

export interface ClubRailProps {
  clubs: readonly RailClub[];
  onOpen: (slug: string) => void;
}

export function ClubRail({ clubs, onOpen }: ClubRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.track}>
      {clubs.map((club) => (
        <ClubBubble
          key={club.slug}
          name={club.name}
          crest={club.crest}
          abbr={club.abbr}
          rank={club.rank}
          rankColor={club.rankColor}
          accessibilityLabel={club.accessibilityLabel}
          onPress={() => onOpen(club.slug)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.five },
  track: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.one,
    // ⚠ Clears the rank badge, which hangs 2pt below the bubble.
    paddingBottom: Spacing.two,
  },
});
