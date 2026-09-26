/**
 * One squad player in the Starting XI picker (ADR 0214): orb and shirt, name,
 * where he already is, and his goals · assists.
 *
 * ⚠ A player already placed elsewhere is DIMMED, not hidden: picking him is a
 * swap, and the reader should see who they are about to move. The one already
 * in the target slot is tinted instead.
 *
 * ⚠ An empty stats cell is "nothing to say" (no stats in this league, or not
 * loaded yet) — never `0` and never `—`.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ShirtBadge, Text, XiOrb } from '@/components/atoms';
import { Colors, Radius, Size, Spacing, Xi } from '@/constants/theme';

export interface XiPlayerRowProps {
  initials: string;
  photoUrl: string | null;
  shirt: number | null;
  name: string;
  /** Where he already is: a slot id (lime), the bench (muted), or nowhere. */
  where: { kind: 'slot'; label: string } | { kind: 'bench'; label: string } | null;
  /** He is the one in the slot being picked for. */
  current: boolean;
  stats: string | null;
  onPress: () => void;
  accessibilityLabel: string;
}

export function XiPlayerRow({ initials, photoUrl, shirt, name, where, current, stats, onPress, accessibilityLabel }: XiPlayerRowProps) {
  const elsewhere = where !== null && !current;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: current }}
      style={({ pressed }) => [styles.row, current && styles.current, pressed && styles.pressed]}>
      <View style={[styles.body, elsewhere && styles.dim]}>
        <View>
          <XiOrb size={Xi.benchOrb} initials={initials} photoUrl={photoUrl} />
          {shirt !== null ? (
            <View style={styles.badge} pointerEvents="none">
              <ShirtBadge shirt={shirt} size={Xi.benchBadge} ring={1.5} />
            </View>
          ) : null}
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          {where ? (
            <Text variant="caption" color={where.kind === 'slot' ? 'accent' : 'textMuted'} numberOfLines={1}>
              {where.label}
            </Text>
          ) : null}
        </View>
        {stats ? (
          <Text variant="footnote" color="textSecondary" tabular>
            {stats}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minHeight: Size.minTouch,
  },
  current: { backgroundColor: Colors.dark.accentWash },
  pressed: { backgroundColor: Colors.dark.rowActive },
  body: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  // ⚠ Opacity on the ROW'S CONTENT, never on a glass surface — there is none here.
  dim: { opacity: 0.5 },
  badge: { position: 'absolute', top: -4, right: -4 },
  text: { flex: 1, minWidth: 0, gap: 1 },
});
