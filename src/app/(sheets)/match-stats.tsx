/**
 * One finished match's stats. Reached from a played row on the club page
 * (ADR 0190).
 *
 * ⚠ **The fixture is a CACHE READ, not a param.** `useClubFixtures(slug)` hits
 * the query key the club page already populated, and the row is re-read by id
 * — so no score, name or crest travels through the router as a string, and a
 * sheet opened on a stale param cannot disagree with the page under it.
 *
 * ⚠ `teamWindowRows` re-reads the club-perspective row as the neutral
 * home/away shape. Its opponent side carries `slug: ''` (ADR 0137), which is
 * what `eventSide`'s elimination rule keys on to place the OPPONENT's events.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, SkeletonRows, Text } from '@/components/atoms';
import { MatchStatsSheet } from '@/components/organisms/match-stats-sheet';
import { Size, Spacing } from '@/constants/theme';
import { teamWindowRows } from '@/lib/cronogol/team-window';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures } from '@/queries/use-club';
import { useZone } from '@/store/preferences';

export default function MatchStatsRoute() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>();
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const zone = useZone();

  const fixtures = useClubFixtures(slug);
  const fixture = fixtures.data ? teamWindowRows(fixtures.data).find((f) => f.id === id) : undefined;

  if (fixtures.isPending) {
    return (
      <View style={styles.state}>
        <SkeletonRows count={4} height={Size.rowSkeleton} />
      </View>
    );
  }

  if (!fixture) {
    return (
      <View style={styles.state}>
        <Text variant="body" color="textSecondary">
          {copy.matchStats.notFound}
        </Text>
        <Button label={copy.matchStats.done} tone="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <MatchStatsSheet
      fixture={fixture}
      clubSlug={slug}
      zone={zone}
      phrases={phrases}
      copy={copy}
      roundPrefix={copy.club.roundPrefix}
    />
  );
}

const styles = StyleSheet.create({
  state: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
});
