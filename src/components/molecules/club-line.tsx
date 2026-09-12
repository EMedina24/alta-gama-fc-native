/**
 * One club: its crest, then its name.
 *
 * ⚠ The point of this shape is CORRESPONDENCE. A match drawn as `⬤ v ⬤` beside
 * two stacked names asks the reader to pair a crest with a name by remembering
 * the order — which is the defect ADR 0158 was written to fix. A crest sitting
 * on its own name needs no pairing at all.
 *
 * ⚠ Promoted out of `finished-today`'s private styles under ADR 0013 once
 * `fixture-list` became the second organism to want it. It stays flat-scalar
 * (ADR 0043): the organism resolves `crestSrc`, `abbreviate` and `displayName`
 * before it renders one of these. Nothing below organisms fetches or derives.
 *
 * ⚠ `lines` defaults to 1 because FINISHED TODAY needs it to: its goal digits
 * are read DOWN the card like a table (ADR 0069), so a row grown by a wrapped
 * name would break that column. The matchday row has no such column and passes
 * `lines={2}`, because a club name that wraps beats one that silently loses its
 * second half — the failure ADR 0029 exists to name.
 *
 * ⚠ `minWidth: 0` on the name is load-bearing. Without it RN refuses to shrink
 * the text and the row overflows its parent instead of wrapping or ellipsing.
 */
import { StyleSheet, View } from 'react-native';

import { Crest, Text, type TypeVariant } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';

export interface ClubLineProps {
  /** Already through `crestSrc()`. Null draws the monogram tile. */
  src: string | null;
  /** Already through `abbreviate()` — the 3-letter code the tile shows. */
  fallback: string;
  /** Already through `displayName()`. */
  name: string;
  /** The losing side of a played match — `scoreEmphasis`, ADR 0044. */
  muted?: boolean;
  size?: number;
  variant?: TypeVariant;
  /** `numberOfLines` on the name. See the header before raising it. */
  lines?: number;
}

export function ClubLine({
  src,
  fallback,
  name,
  muted = false,
  size = Size.crestRow,
  variant = 'bodyStrong',
  lines = 1,
}: ClubLineProps) {
  return (
    <View style={styles.line}>
      <Crest src={src} fallback={fallback} size={size} />
      <Text
        variant={variant}
        color={muted ? 'textDim' : 'text'}
        numberOfLines={lines}
        style={styles.name}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { flex: 1, minWidth: 0 },
});
