/**
 * One player. Reached from a row in the club page's Players tab.
 *
 * ⚠ **This fetches nothing.** There is no single-player endpoint on the API and
 * none is coming — the squad list response IS the complete per-player dataset.
 * `useClubSquad(slug)` here hits the SAME query key the club screen already
 * populated, so mounting the sheet is a cache read, not a request. (If the cache
 * was collected in between, React Query refetches the squad; that is the pending
 * branch, not an error.)
 *
 * ⚠ Params are strings only. Never serialise the player object through the
 * router — `id` is the stable PERSON id, which survives a transfer and is the
 * only safe way to name a player. Two Premier League players can share a shirt
 * number (Arsenal has two #39s), so a shirt-keyed lookup opens the wrong one.
 *
 * ⚠ `TeamSquadView.team` spells the crest `crestUrl` and carries no `ImageUrls`,
 * so `crestSrc()` does NOT apply here. It is the one payload on this API that
 * does this — do not swap it for `logoUrl` by muscle memory.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, SkeletonRows, Text } from '@/components/atoms';
import { PlayerSheet } from '@/components/organisms/player-sheet';
import { Size, Spacing } from '@/constants/theme';
import { abbreviate, displayName } from '@/lib/cronogol/derive';
import { seasonLabel } from '@/lib/cronogol/leagues';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { StyleSheet, View } from 'react-native';

export default function PlayerSheetRoute() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>();
  const router = useRouter();
  const { copy } = useI18n();

  const squad = useClubSquad(slug);
  const player = squad.data?.players.find((p) => p.id === id);
  const close = () => router.back();

  if (squad.isPending) {
    return (
      <View style={styles.state}>
        <SkeletonRows count={4} height={Size.rowSkeleton} />
      </View>
    );
  }

  if (!player || !squad.data) {
    return (
      <View style={styles.state}>
        <Text variant="body" color="textSecondary">
          {copy.player.notFound}
        </Text>
        <Button label={copy.player.done} tone="secondary" onPress={close} />
      </View>
    );
  }

  const team = squad.data.team;

  return (
    <PlayerSheet
      player={player}
      club={{
        name: displayName(team.name),
        crestUrl: team.crestUrl,
        abbr: abbreviate(team.name, team.slug, team.shortName),
      }}
      // ⚠ A null season is a blank cell. Never a guessed year.
      seasonLabel={squad.data.season === null ? null : seasonLabel(squad.data.season)}
      positionLabel={copy.player.positionNames[player.position]}
      // ⚠ `"both"` is a real value, not a placeholder for unknown.
      footLabel={player.foot === null ? null : copy.player.footValues[player.foot]}
      heightValue={copy.player.heightValue}
      weightValue={copy.player.weightValue}
      labels={{
        age: copy.player.age,
        nationality: copy.player.nationality,
        height: copy.player.height,
        weight: copy.player.weight,
        foot: copy.player.foot,
        registered: copy.player.registered,
      }}
      note={copy.player.note}
      doneLabel={copy.player.done}
      closeLabel={copy.sheets.close}
      onClose={close}
    />
  );
}

const styles = StyleSheet.create({
  state: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
});
