/**
 * One standings row, and its in-place expansion.
 *
 * ⚠ **Never re-sort and never compare two rows.** `rank` is the wire's, and the
 * tiebreakers behind it differ per competition — LaLiga breaks ties
 * head-to-head BEFORE goal difference, so a worse GD legitimately sits above a
 * better one. Re-deriving the order client-side produces a table that disagrees
 * with itself. ⚠ The Champions League league phase makes this sharper: its rule
 * has no head-to-head at all (each club plays eight different opponents) and
 * stops before UEFA's last two criteria, so our order can legitimately differ
 * from uefa.com's — and a client-side sort would agree with neither.
 *
 * ⚠ A followed club takes the `rowActive` ground and an accent dot. It is NOT
 * pinned or reordered — its position is the fact the table exists to state.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { BandRail, Text, type BandKind } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';
import type { StandingsTableRowView } from '@/lib/cronogol/types';
import { Crest } from '@/components/atoms';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';

export interface StandingsRowProps {
  row: StandingsTableRowView;
  /** `null` when bands do not apply — the rail still renders, transparent. */
  zone: BandKind | null;
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
