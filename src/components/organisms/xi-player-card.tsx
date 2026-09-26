/**
 * One player on the Starting XI builder (ADR 0214): his orb, name and line,
 * four numbers, and what to do with him.
 *
 * ⚠ A null number renders an EMPTY value that keeps its label — never `—`,
 * never `0` (the app's rule, `player-sheet.tsx`'s wording). The handoff's em
 * dash is deliberately not ported.
 *
 * ⚠ The stats toggle says "Recent seasons", never "Career": `overall` sums at
 * most three seasons, and its caption counts them.
 *
 * ⚠ A bench player gets Remove only; a pitch player gets Replace, Move to
 * bench (disabled, and saying why, when the bench is full) and Remove.
 */
import { StyleSheet, View } from 'react-native';

import { Button, ShirtBadge, Text, XiOrb } from '@/components/atoms';
import { SegmentedControl } from '@/components/molecules';
import { SheetClose } from '@/components/molecules/sheet-close';
import { Colors, Spacing, Xi } from '@/constants/theme';

export interface XiPlayerCardProps {
  orb: { initials: string; photoUrl: string | null; shirt: number | null };
  name: string;
  meta: string;
  tiles: readonly { key: string; label: string; value: number | null; lime?: boolean }[];
  /** Absent: the league publishes no player stats — no toggle, a note instead. */
  stats: {
    mode: 'season' | 'recent';
    options: readonly { value: 'season' | 'recent'; label: string }[];
    onMode: (mode: 'season' | 'recent') => void;
    caption: string | null;
  } | null;
  noStats: string;
  onReplace?: () => void;
  onBench?: () => void;
  benchFull: boolean;
  onRemove: () => void;
  labels: { replace: string; toBench: string; benchFull: string; remove: string };
  onClose: () => void;
  closeLabel: string;
}

export function XiPlayerCard(props: XiPlayerCardProps) {
  const { orb, stats } = props;
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View>
          <XiOrb size={Xi.cardOrb} initials={orb.initials} photoUrl={orb.photoUrl} ring="white" ringWidth={2} />
          {orb.shirt !== null ? (
            <View style={styles.badge} pointerEvents="none">
              <ShirtBadge shirt={orb.shirt} size={Xi.cardBadge} ring={2} />
            </View>
          ) : null}
        </View>
        <View style={styles.identity}>
          <Text variant="xiCardName" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {props.name}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {props.meta}
          </Text>
        </View>
        <SheetClose onPress={props.onClose} accessibilityLabel={props.closeLabel} />
      </View>

      <View style={styles.tiles}>
        {props.tiles.map((tile) => (
          <View key={tile.key} style={styles.tile} accessible accessibilityLabel={`${tile.label} ${tile.value ?? ''}`}>
            <Text variant="eyebrowSm" color="textMuted" numberOfLines={1}>
              {tile.label}
            </Text>
            <Text variant="xiStat" color={tile.lime ? 'accent' : 'text'} tabular numberOfLines={1}>
              {tile.value === null ? '' : tile.value}
            </Text>
          </View>
        ))}
      </View>

      {stats ? (
        <View style={styles.stats}>
          <SegmentedControl options={stats.options} value={stats.mode} onChange={stats.onMode} />
          {stats.caption ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {stats.caption}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text variant="caption" color="textMuted">
          {props.noStats}
        </Text>
      )}

      <View style={styles.actions}>
        {props.onReplace ? <Button label={props.labels.replace} onPress={props.onReplace} /> : null}
        {props.onBench ? (
          <Button
            label={props.benchFull ? props.labels.benchFull : props.labels.toBench}
            tone="secondary"
            disabled={props.benchFull}
            onPress={props.onBench}
          />
        ) : null}
        <Button label={props.labels.remove} tone="danger" onPress={props.onRemove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three + 2 },
  badge: { position: 'absolute', top: -4, right: -4 },
  identity: { flex: 1, minWidth: 0, gap: Spacing.half },
  // ⚠ A 2 × 2 grid, not the handoff's row of four: a quarter-width tile cut
  // "ASISTENCIAS" to "ASISTE…" on the first build, and two lines broke it
  // mid-word. The Spanish labels do not fit a quarter of 375pt at any size
  // the eyebrow can take.
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    borderRadius: Xi.statRadius,
    padding: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.glassFill,
  },
  stats: { gap: Spacing.two },
  actions: { gap: Spacing.two },
});
