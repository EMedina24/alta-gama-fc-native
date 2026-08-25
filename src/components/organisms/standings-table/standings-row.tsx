/**
 * One standings row, and its in-place expansion.
 *
 * ⚠ **Never re-sort and never compare two rows.** `rank` is the wire's, and the
 * tiebreakers behind it differ per league — LaLiga breaks ties head-to-head
 * BEFORE goal difference, so a worse GD legitimately sits above a better one.
 * Re-deriving the order client-side produces a table that disagrees with itself.
 *
 * ⚠ A followed club takes the `rowActive` ground and an accent dot. It is NOT
 * pinned or reordered — its position is the fact the table exists to state.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { BandRail, Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';
import type { ZoneKind } from '@/lib/cronogol/leagues';
import type { StandingsRowView } from '@/lib/cronogol/types';
import { Crest } from '@/components/atoms';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';

export interface StandingsRowProps {
  row: StandingsRowView;
  /** `null` when bands do not apply — the rail still renders, transparent. */
  zone: ZoneKind | null;
  followed: boolean;
  expanded: boolean;
  onPress: () => void;
}

export function StandingsRow({ row, zone, followed, expanded, onPress }: StandingsRowProps) {
  const { team } = row;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${row.rank}. ${team.name}, ${row.points} points, ${row.played} played`}
      style={({ pressed }) => [
        styles.row,
        followed && styles.followed,
        pressed && { opacity: 0.75 },
      ]}>
      <BandRail zone={zone} />

      <Text variant="bodyStrong" tabular color="textSecondary" style={styles.pos}>
        {row.rank}
      </Text>

      <Crest
        src={crestSrc(team.logoUrls, team.logoUrl, 'xsmall')}
        fallback={abbreviate(team.name, team.slug, team.shortName)}
        size={Size.crestRow}
      />

      <View style={styles.nameWrap}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {displayName(team.name)}
        </Text>
        {followed ? <View style={styles.dot} /> : null}
      </View>

      <Text variant="body" tabular color="textDim" style={styles.num}>
        {row.played}
      </Text>
      <Text variant="bodyStrong" tabular style={styles.num}>
        {row.points}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingRight: Spacing.five,
  },
  followed: { backgroundColor: Colors.dark.rowActive },
  pos: { width: 26, textAlign: 'center' },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.dark.accent },
  num: { width: 34, textAlign: 'right' },
});
